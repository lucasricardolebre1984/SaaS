import pg from 'pg';
import { validateLeadStageTransition, isKnownLeadStage } from './lead-funnel.mjs';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asLead(row) {
  return {
    lead_id: row.lead_id,
    tenant_id: row.tenant_id,
    external_key: row.external_key,
    display_name: row.display_name,
    phone_e164: row.phone_e164,
    source_channel: row.source_channel,
    stage: row.stage,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function normalizeLeadInput(input) {
  const stage = input.stage ?? 'new';
  if (!isKnownLeadStage(stage)) {
    throw new Error(`invalid_lead_stage:${stage}`);
  }

  return {
    lead_id: input.lead_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    display_name: String(input.display_name ?? '').trim(),
    phone_e164: input.phone_e164,
    source_channel: input.source_channel,
    stage,
    metadata: input.metadata ?? {}
  };
}

export function createPostgresLeadStore(options = {}) {
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
  const leadsTable = tableName(schema, 'crm_leads');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${leadsTable} (
        lead_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        external_key TEXT NULL,
        display_name TEXT NOT NULL,
        phone_e164 TEXT NOT NULL,
        source_channel TEXT NOT NULL,
        stage TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_tenant_external_key_ux
      ON ${leadsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_leads_tenant_stage_idx
      ON ${leadsTable} (tenant_id, stage)
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
    leadsFilePath: null,
    async createLead(input) {
      const normalized = normalizeLeadInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${leadsTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', lead: asLead(byExternalKey.rows[0]) };
        }
      }

      const byLeadId = await query(
        `SELECT *
         FROM ${leadsTable}
         WHERE tenant_id = $1 AND lead_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.lead_id]
      );
      if (byLeadId.rowCount > 0) {
        return { action: 'idempotent', lead: asLead(byLeadId.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${leadsTable}
          (lead_id, tenant_id, external_key, display_name, phone_e164, source_channel, stage, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9)
         RETURNING *`,
        [
          normalized.lead_id,
          normalized.tenant_id,
          normalized.external_key,
          normalized.display_name,
          normalized.phone_e164,
          normalized.source_channel,
          normalized.stage,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', lead: asLead(inserted.rows[0]) };
    },
    async updateLeadStage(tenantId, leadId, changes) {
      const current = await query(
        `SELECT *
         FROM ${leadsTable}
         WHERE tenant_id = $1 AND lead_id = $2
         LIMIT 1`,
        [tenantId, leadId]
      );
      if (current.rowCount === 0) {
        return { ok: false, code: 'not_found' };
      }

      const row = current.rows[0];
      const transition = validateLeadStageTransition(
        row.stage,
        changes.to_stage,
        changes.trigger,
        changes.reason_code
      );
      if (!transition.ok) {
        return { ok: false, code: transition.code, expected_trigger: transition.expected_trigger };
      }

      const metadata = Object.hasOwn(changes, 'metadata') ? changes.metadata : (row.metadata_json ?? {});
      const updated = await query(
        `UPDATE ${leadsTable}
         SET stage = $3,
             metadata_json = $4::jsonb,
             updated_at = $5
         WHERE tenant_id = $1 AND lead_id = $2
         RETURNING *`,
        [
          tenantId,
          leadId,
          changes.to_stage,
          JSON.stringify(metadata),
          new Date().toISOString()
        ]
      );
      return { ok: true, lead: asLead(updated.rows[0]) };
    },
    async getLeadById(tenantId, leadId) {
      const result = await query(
        `SELECT *
         FROM ${leadsTable}
         WHERE tenant_id = $1 AND lead_id = $2
         LIMIT 1`,
        [tenantId, leadId]
      );
      if (result.rowCount === 0) return null;
      return asLead(result.rows[0]);
    },
    async listLeads(tenantId) {
      const result = await query(
        `SELECT *
         FROM ${leadsTable}
         WHERE tenant_id = $1
         ORDER BY created_at ASC`,
        [tenantId]
      );
      return result.rows.map(asLead);
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
