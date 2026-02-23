import pg from 'pg';
import { randomUUID } from 'node:crypto';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function normalizeMode(mode) {
  if (mode == null || mode === '') return null;
  const normalized = String(mode).toLowerCase();
  if (
    normalized === 'auto'
    || normalized === 'openai'
    || normalized === 'local'
    || normalized === 'off'
  ) {
    return normalized;
  }
  return null;
}

function normalizeLimit(limit, fallback = 50) {
  const value = Number(limit ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('invalid_limit');
  }
  return Math.min(Math.floor(value), 500);
}

function normalizeInterval(intervalMinutes, fallback = null) {
  const value = Number(intervalMinutes ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('invalid_interval_minutes');
  }
  return Math.min(Math.floor(value), 1440);
}

function normalizeRunsLimit(limit, fallback = 50) {
  const value = Number(limit ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(value), 200);
}

function normalizeLockTtlSeconds(lockTtlSeconds, fallback = 120) {
  const value = Number(lockTtlSeconds ?? fallback);
  if (!Number.isFinite(value) || value < 30 || value > 3600) {
    throw new Error('invalid_lock_ttl_seconds');
  }
  return Math.floor(value);
}

function computeNextRunAt(baseIso, intervalMinutes) {
  const date = new Date(baseIso);
  date.setMinutes(date.getMinutes() + intervalMinutes);
  return date.toISOString();
}

function computeLockExpiresAt(baseIso, lockTtlSeconds) {
  const date = new Date(baseIso);
  date.setSeconds(date.getSeconds() + lockTtlSeconds);
  return date.toISOString();
}

function asSchedulePublic(row) {
  return {
    tenant_id: row.tenant_id,
    enabled: row.enabled,
    interval_minutes: Number(row.interval_minutes),
    limit: Number(row.limit_items),
    mode: row.mode,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    last_run_at: row.last_run_at?.toISOString?.() ?? row.last_run_at ?? null,
    next_run_at: row.next_run_at?.toISOString?.() ?? row.next_run_at ?? null,
    last_result: row.last_result_json ?? null,
    ...(row.run_lock_json ? { run_lock: row.run_lock_json } : {})
  };
}

function asRunPublic(row) {
  return {
    run_id: row.run_id,
    tenant_id: row.tenant_id,
    trigger: row.trigger,
    status: row.status,
    dry_run: row.dry_run,
    started_at: row.started_at?.toISOString?.() ?? row.started_at,
    finished_at: row.finished_at?.toISOString?.() ?? row.finished_at ?? null,
    details: row.details_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at
  };
}

export function createPostgresOwnerMemoryMaintenanceStore(options = {}) {
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
  const schedulesTable = tableName(schema, 'owner_memory_reembed_schedules');
  const runsTable = tableName(schema, 'owner_memory_reembed_runs');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schedulesTable} (
        tenant_id TEXT PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT true,
        interval_minutes INTEGER NOT NULL,
        limit_items INTEGER NOT NULL,
        mode TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        last_run_at TIMESTAMPTZ NULL,
        next_run_at TIMESTAMPTZ NULL,
        last_result_json JSONB NULL,
        run_lock_json JSONB NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS owner_memory_reembed_schedules_enabled_next_idx
      ON ${schedulesTable} (enabled, next_run_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${runsTable} (
        id BIGSERIAL PRIMARY KEY,
        run_id UUID NOT NULL,
        tenant_id TEXT NOT NULL,
        trigger TEXT NOT NULL,
        status TEXT NOT NULL,
        dry_run BOOLEAN NOT NULL DEFAULT false,
        started_at TIMESTAMPTZ NOT NULL,
        finished_at TIMESTAMPTZ NULL,
        details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS owner_memory_reembed_runs_tenant_started_idx
      ON ${runsTable} (tenant_id, started_at DESC)
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

  async function getScheduleRow(tenantId) {
    const result = await query(
      `SELECT *
       FROM ${schedulesTable}
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId]
    );
    return result.rowCount > 0 ? result.rows[0] : null;
  }

  return {
    backend: 'postgres',
    storageDir: null,
    schedulesFilePath: null,
    runsFilePath: null,
    async upsertSchedule(input = {}) {
      const tenantId = String(input.tenant_id ?? '').trim();
      if (!tenantId) {
        throw new Error('missing_tenant_id');
      }

      const nowIso = new Date().toISOString();
      const existing = await getScheduleRow(tenantId);
      const intervalMinutes = normalizeInterval(input.interval_minutes, existing?.interval_minutes ?? null);
      const limit = normalizeLimit(input.limit, existing?.limit_items ?? 50);
      const enabled = input.enabled == null ? (existing?.enabled ?? true) : input.enabled === true;
      const mode = normalizeMode(input.mode);
      if (input.mode != null && mode == null) {
        throw new Error('invalid_mode');
      }

      const shouldRunNow = input.run_now === true;
      let nextRunAt = null;
      if (enabled) {
        if (shouldRunNow) {
          nextRunAt = nowIso;
        } else if (existing?.next_run_at) {
          nextRunAt = existing.next_run_at?.toISOString?.() ?? existing.next_run_at;
        } else {
          nextRunAt = nowIso;
        }
      }

      const runLock = enabled ? (existing?.run_lock_json ?? null) : null;
      const lastResult = existing?.last_result_json ?? null;
      const createdAt = existing?.created_at?.toISOString?.() ?? existing?.created_at ?? nowIso;
      const lastRunAt = existing?.last_run_at?.toISOString?.() ?? existing?.last_run_at ?? null;

      const result = await query(
        `INSERT INTO ${schedulesTable}
          (tenant_id, enabled, interval_minutes, limit_items, mode, created_at, updated_at, last_run_at, next_run_at, last_result_json, run_lock_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
         ON CONFLICT (tenant_id) DO UPDATE
         SET enabled = EXCLUDED.enabled,
             interval_minutes = EXCLUDED.interval_minutes,
             limit_items = EXCLUDED.limit_items,
             mode = EXCLUDED.mode,
             updated_at = EXCLUDED.updated_at,
             last_run_at = EXCLUDED.last_run_at,
             next_run_at = EXCLUDED.next_run_at,
             last_result_json = EXCLUDED.last_result_json,
             run_lock_json = EXCLUDED.run_lock_json
         RETURNING *`,
        [
          tenantId,
          enabled,
          intervalMinutes,
          limit,
          mode,
          createdAt,
          nowIso,
          lastRunAt,
          nextRunAt,
          JSON.stringify(lastResult),
          JSON.stringify(runLock)
        ]
      );
      return asSchedulePublic(result.rows[0]);
    },
    async setScheduleEnabled(tenantId, enabled, options = {}) {
      const id = String(tenantId ?? '').trim();
      if (!id) {
        throw new Error('missing_tenant_id');
      }

      const current = await getScheduleRow(id);
      if (!current) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = new Date().toISOString();
      const nextRunAt = enabled === true
        ? (
          options.run_now === true
            ? nowIso
            : (current.next_run_at?.toISOString?.() ?? current.next_run_at ?? nowIso)
        )
        : null;

      const updated = await query(
        `UPDATE ${schedulesTable}
         SET enabled = $2,
             next_run_at = $3,
             run_lock_json = $4::jsonb,
             updated_at = $5
         WHERE tenant_id = $1
         RETURNING *`,
        [id, enabled === true, nextRunAt, enabled === true ? JSON.stringify(current.run_lock_json ?? null) : null, nowIso]
      );

      return { ok: true, schedule: asSchedulePublic(updated.rows[0]) };
    },
    async listSchedules(tenantId = null) {
      const result = tenantId
        ? await query(
          `SELECT *
           FROM ${schedulesTable}
           WHERE tenant_id = $1
           ORDER BY tenant_id ASC`,
          [tenantId]
        )
        : await query(
          `SELECT *
           FROM ${schedulesTable}
           ORDER BY tenant_id ASC`
        );
      return result.rows.map(asSchedulePublic);
    },
    async listRunnableSchedules(options = {}) {
      const tenantId = options.tenant_id ? String(options.tenant_id).trim() : null;
      const force = options.force === true;
      const nowIso = options.now_iso ?? new Date().toISOString();

      if (force) {
        const result = tenantId
          ? await query(
            `SELECT *
             FROM ${schedulesTable}
             WHERE tenant_id = $1 AND enabled = true
             ORDER BY next_run_at ASC NULLS FIRST`,
            [tenantId]
          )
          : await query(
            `SELECT *
             FROM ${schedulesTable}
             WHERE enabled = true
             ORDER BY next_run_at ASC NULLS FIRST`
          );
        return result.rows.map(asSchedulePublic);
      }

      const result = tenantId
        ? await query(
          `SELECT *
           FROM ${schedulesTable}
           WHERE tenant_id = $1
             AND enabled = true
             AND next_run_at IS NOT NULL
             AND next_run_at <= $2
           ORDER BY next_run_at ASC`,
          [tenantId, nowIso]
        )
        : await query(
          `SELECT *
           FROM ${schedulesTable}
           WHERE enabled = true
             AND next_run_at IS NOT NULL
             AND next_run_at <= $1
           ORDER BY next_run_at ASC`,
          [nowIso]
        );
      return result.rows.map(asSchedulePublic);
    },
    async acquireRunLock(tenantId, options = {}) {
      const id = String(tenantId ?? '').trim();
      if (!id) {
        throw new Error('missing_tenant_id');
      }

      const nowIso = options.now_iso ?? new Date().toISOString();
      const nowTs = new Date(nowIso).getTime();
      const lockTtlSeconds = normalizeLockTtlSeconds(options.lock_ttl_seconds, 120);
      const runId = String(options.run_id ?? randomUUID());
      const owner = String(options.owner ?? 'scheduler');

      const current = await getScheduleRow(id);
      if (!current) {
        return { ok: false, code: 'not_found' };
      }

      let staleRecovered = false;
      if (current.run_lock_json?.lock_expires_at) {
        const expiresTs = new Date(current.run_lock_json.lock_expires_at).getTime();
        if (Number.isFinite(expiresTs) && expiresTs > nowTs) {
          return { ok: false, code: 'locked', lock: current.run_lock_json, stale_recovered: false };
        }
        staleRecovered = true;
      }

      const lockPayload = {
        run_id: runId,
        owner,
        locked_at: nowIso,
        lock_expires_at: computeLockExpiresAt(nowIso, lockTtlSeconds)
      };

      const updated = await query(
        `UPDATE ${schedulesTable}
         SET run_lock_json = $2::jsonb,
             updated_at = $3
         WHERE tenant_id = $1
           AND (
             run_lock_json IS NULL
             OR (run_lock_json->>'lock_expires_at') IS NULL
             OR ((run_lock_json->>'lock_expires_at')::timestamptz <= $3)
           )
         RETURNING *`,
        [id, JSON.stringify(lockPayload), nowIso]
      );
      if (updated.rowCount === 0) {
        const latest = await getScheduleRow(id);
        return {
          ok: false,
          code: 'locked',
          lock: latest?.run_lock_json ?? null,
          stale_recovered: false
        };
      }
      return {
        ok: true,
        lock: updated.rows[0].run_lock_json,
        stale_recovered: staleRecovered
      };
    },
    async releaseRunLock(tenantId, runId = null) {
      const id = String(tenantId ?? '').trim();
      if (!id) {
        throw new Error('missing_tenant_id');
      }

      const result = runId
        ? await query(
          `UPDATE ${schedulesTable}
           SET run_lock_json = NULL,
               updated_at = $3
           WHERE tenant_id = $1
             AND run_lock_json IS NOT NULL
             AND run_lock_json->>'run_id' = $2
           RETURNING *`,
          [id, runId, new Date().toISOString()]
        )
        : await query(
          `UPDATE ${schedulesTable}
           SET run_lock_json = NULL,
               updated_at = $2
           WHERE tenant_id = $1
             AND run_lock_json IS NOT NULL
           RETURNING *`,
          [id, new Date().toISOString()]
        );

      if (result.rowCount === 0 && runId) {
        const row = await getScheduleRow(id);
        if (!row) return { ok: false, code: 'not_found' };
        return { ok: false, code: 'lock_mismatch' };
      }
      if (result.rowCount === 0) {
        const row = await getScheduleRow(id);
        if (!row) return { ok: false, code: 'not_found' };
        return { ok: true, released: false };
      }

      return { ok: true, released: true };
    },
    async markScheduleRun(tenantId, result = {}) {
      const id = String(tenantId ?? '').trim();
      const current = await getScheduleRow(id);
      if (!current) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = new Date().toISOString();
      const nextRunAt = current.enabled
        ? computeNextRunAt(nowIso, Number(current.interval_minutes))
        : null;
      const lastResult = {
        status: 'completed',
        dry_run: result.dry_run === true,
        scanned_count: Number(result.scanned_count ?? 0),
        updated_count: Number(result.updated_count ?? 0),
        failed_count: Number(result.failed_count ?? 0),
        skipped_count: Number(result.skipped_count ?? 0),
        completed_at: nowIso
      };

      const updated = await query(
        `UPDATE ${schedulesTable}
         SET last_run_at = $2,
             next_run_at = $3,
             last_result_json = $4::jsonb,
             run_lock_json = NULL,
             updated_at = $2
         WHERE tenant_id = $1
         RETURNING *`,
        [id, nowIso, nextRunAt, JSON.stringify(lastResult)]
      );
      return { ok: true, schedule: asSchedulePublic(updated.rows[0]) };
    },
    async markScheduleFailure(tenantId, errorCode, details = {}) {
      const id = String(tenantId ?? '').trim();
      const current = await getScheduleRow(id);
      if (!current) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = new Date().toISOString();
      const nextRunAt = current.enabled
        ? computeNextRunAt(nowIso, Number(current.interval_minutes))
        : null;
      const lastResult = {
        status: 'failed',
        error_code: String(errorCode ?? 'run_failed'),
        details,
        completed_at: nowIso
      };
      const updated = await query(
        `UPDATE ${schedulesTable}
         SET next_run_at = $2,
             last_result_json = $3::jsonb,
             run_lock_json = NULL,
             updated_at = $4
         WHERE tenant_id = $1
         RETURNING *`,
        [id, nextRunAt, JSON.stringify(lastResult), nowIso]
      );
      return { ok: true, schedule: asSchedulePublic(updated.rows[0]) };
    },
    async recordRun(record = {}) {
      const normalized = {
        run_id: String(record.run_id ?? randomUUID()),
        tenant_id: String(record.tenant_id ?? ''),
        trigger: String(record.trigger ?? 'manual'),
        status: String(record.status ?? 'completed'),
        dry_run: record.dry_run === true,
        started_at: record.started_at ?? new Date().toISOString(),
        finished_at: record.finished_at ?? new Date().toISOString(),
        details: record.details ?? {}
      };

      const inserted = await query(
        `INSERT INTO ${runsTable}
          (run_id, tenant_id, trigger, status, dry_run, started_at, finished_at, details_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING *`,
        [
          normalized.run_id,
          normalized.tenant_id,
          normalized.trigger,
          normalized.status,
          normalized.dry_run,
          normalized.started_at,
          normalized.finished_at,
          JSON.stringify(normalized.details)
        ]
      );
      return asRunPublic(inserted.rows[0]);
    },
    async listRunRecords(options = {}) {
      const tenantId = options.tenant_id ? String(options.tenant_id).trim() : null;
      const limit = normalizeRunsLimit(options.limit, 50);

      const result = tenantId
        ? await query(
          `SELECT *
           FROM ${runsTable}
           WHERE tenant_id = $1
           ORDER BY started_at DESC
           LIMIT $2`,
          [tenantId, limit]
        )
        : await query(
          `SELECT *
           FROM ${runsTable}
           ORDER BY started_at DESC
           LIMIT $1`,
          [limit]
        );
      return result.rows.map(asRunPublic);
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
