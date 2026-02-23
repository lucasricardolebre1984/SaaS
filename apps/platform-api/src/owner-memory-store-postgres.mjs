import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { retrieveContextByScoring } from './context-retrieval.mjs';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asEntry(row) {
  return {
    memory_id: row.memory_id,
    tenant_id: row.tenant_id,
    session_id: row.session_id,
    external_key: row.external_key,
    source: row.source,
    content: row.content,
    tags: row.tags_json ?? [],
    salience_score: Number(row.salience_score),
    embedding_ref: row.embedding_ref,
    status: row.status,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function normalizeEntryInput(input) {
  return {
    memory_id: input.memory_id,
    tenant_id: input.tenant_id,
    session_id: input.session_id,
    external_key: input.external_key ?? null,
    source: input.source,
    content: String(input.content ?? '').trim(),
    tags: Array.isArray(input.tags) ? input.tags : [],
    salience_score: Number(input.salience_score ?? 0.5),
    embedding_ref: input.embedding_ref ?? null,
    status: 'candidate',
    metadata: input.metadata ?? {}
  };
}

export function createPostgresOwnerMemoryStore(options = {}) {
  const schema = options.pgSchema ?? process.env.ORCHESTRATION_PG_SCHEMA ?? 'public';
  const connectionString =
    options.pgConnectionString ??
    process.env.ORCHESTRATION_PG_DSN ??
    process.env.DATABASE_URL;

  assertValidIdentifier(schema, 'pgSchema');

  if (!connectionString) {
    throw new Error(
      'Missing Postgres DSN. Set ORCHESTRATION_PG_DSN or pass pgConnectionString.'
    );
  }

  const client = new pg.Client({ connectionString });
  const entriesTable = tableName(schema, 'owner_memory_entries');
  const promotionsTable = tableName(schema, 'owner_context_promotions');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${entriesTable} (
        memory_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        session_id UUID NOT NULL,
        external_key TEXT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        salience_score NUMERIC(4, 3) NOT NULL,
        embedding_ref TEXT NULL,
        status TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS owner_memory_entries_tenant_external_key_ux
      ON ${entriesTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS owner_memory_entries_tenant_session_idx
      ON ${entriesTable} (tenant_id, session_id, created_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${promotionsTable} (
        promotion_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        memory_id UUID NOT NULL REFERENCES ${entriesTable}(memory_id),
        action TEXT NOT NULL,
        reason_code TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS owner_context_promotions_tenant_created_idx
      ON ${promotionsTable} (tenant_id, created_at)
    `);
  }

  const ready = (async () => {
    await client.connect();
    await ensureSchema();
  })();

  async function query(sql, params = []) {
    await ready;
    return client.query(sql, params);
  }

  return {
    backend: 'postgres',
    storageDir: null,
    entriesFilePath: null,
    promotionsFilePath: null,
    async createEntry(input) {
      const normalized = normalizeEntryInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${entriesTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', entry: asEntry(byExternalKey.rows[0]) };
        }
      }

      const byMemoryId = await query(
        `SELECT *
         FROM ${entriesTable}
         WHERE tenant_id = $1 AND memory_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.memory_id]
      );
      if (byMemoryId.rowCount > 0) {
        return { action: 'idempotent', entry: asEntry(byMemoryId.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${entriesTable}
          (memory_id, tenant_id, session_id, external_key, source, content, tags_json, salience_score, embedding_ref, status, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb, $12, $12)
         RETURNING *`,
        [
          normalized.memory_id,
          normalized.tenant_id,
          normalized.session_id,
          normalized.external_key,
          normalized.source,
          normalized.content,
          JSON.stringify(normalized.tags),
          normalized.salience_score,
          normalized.embedding_ref,
          normalized.status,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', entry: asEntry(inserted.rows[0]) };
    },
    async getEntryById(tenantId, memoryId) {
      const result = await query(
        `SELECT *
         FROM ${entriesTable}
         WHERE tenant_id = $1 AND memory_id = $2
         LIMIT 1`,
        [tenantId, memoryId]
      );
      if (result.rowCount === 0) return null;
      return asEntry(result.rows[0]);
    },
    async listEntries(tenantId, options = {}) {
      const params = [tenantId];
      let where = 'tenant_id = $1';
      if (options.sessionId) {
        params.push(options.sessionId);
        where += ` AND session_id = $${params.length}`;
      }
      if (options.status) {
        params.push(options.status);
        where += ` AND status = $${params.length}`;
      }

      const result = await query(
        `SELECT *
         FROM ${entriesTable}
         WHERE ${where}
         ORDER BY created_at ASC`,
        params
      );
      return result.rows.map(asEntry);
    },
    async applyPromotion(tenantId, memoryId, action, reasonCode, metadata) {
      const current = await query(
        `SELECT *
         FROM ${entriesTable}
         WHERE tenant_id = $1 AND memory_id = $2
         LIMIT 1`,
        [tenantId, memoryId]
      );
      if (current.rowCount === 0) {
        return { ok: false, code: 'not_found' };
      }

      const row = current.rows[0];
      if (row.status !== 'candidate') {
        return { ok: false, code: 'invalid_transition' };
      }

      const nextStatus = action === 'promote' ? 'promoted' : action === 'archive' ? 'archived' : null;
      if (!nextStatus) {
        return { ok: false, code: 'invalid_action' };
      }

      const updated = await query(
        `UPDATE ${entriesTable}
         SET status = $3,
             updated_at = $4
         WHERE tenant_id = $1 AND memory_id = $2
         RETURNING *`,
        [tenantId, memoryId, nextStatus, new Date().toISOString()]
      );

      const promotionRecord = {
        promotion_id: randomUUID(),
        tenant_id: tenantId,
        memory_id: memoryId,
        action,
        reason_code: reasonCode ?? null,
        metadata: metadata ?? {},
        created_at: new Date().toISOString()
      };
      await query(
        `INSERT INTO ${promotionsTable}
          (promotion_id, tenant_id, memory_id, action, reason_code, metadata_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          promotionRecord.promotion_id,
          promotionRecord.tenant_id,
          promotionRecord.memory_id,
          promotionRecord.action,
          promotionRecord.reason_code,
          JSON.stringify(promotionRecord.metadata),
          promotionRecord.created_at
        ]
      );

      return { ok: true, entry: asEntry(updated.rows[0]), promotion: promotionRecord };
    },
    async getSummary(tenantId) {
      const countsResult = await query(
        `SELECT
           COUNT(*)::int AS entries_total,
           COUNT(*) FILTER (WHERE status = 'candidate')::int AS candidate_count,
           COUNT(*) FILTER (WHERE status = 'promoted')::int AS promoted_count,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived_count,
           COUNT(DISTINCT session_id)::int AS sessions_count,
           MAX(updated_at) FILTER (WHERE status = 'promoted') AS last_promoted_at
         FROM ${entriesTable}
         WHERE tenant_id = $1`,
        [tenantId]
      );
      const row = countsResult.rows[0] ?? {};
      return {
        tenant_id: tenantId,
        entries_total: Number(row.entries_total ?? 0),
        candidate_count: Number(row.candidate_count ?? 0),
        promoted_count: Number(row.promoted_count ?? 0),
        archived_count: Number(row.archived_count ?? 0),
        sessions_count: Number(row.sessions_count ?? 0),
        last_promoted_at: row.last_promoted_at?.toISOString?.() ?? row.last_promoted_at ?? null
      };
    },
    async retrieveContext(tenantId, queryOptions = {}) {
      const params = [tenantId];
      let where = 'tenant_id = $1';
      if (queryOptions.session_id) {
        params.push(queryOptions.session_id);
        where += ` AND session_id = $${params.length}`;
      }

      const result = await query(
        `SELECT *
         FROM ${entriesTable}
         WHERE ${where}
         ORDER BY updated_at DESC
         LIMIT 500`,
        params
      );
      const entries = result.rows.map(asEntry);
      return retrieveContextByScoring(entries, queryOptions);
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
