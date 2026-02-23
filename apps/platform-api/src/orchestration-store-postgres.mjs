import { randomUUID } from 'node:crypto';
import pg from 'pg';

const DEFAULT_LOG_LIMIT = 200;
const DEFAULT_QUEUE_HISTORY_LIMIT = 500;

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asQueueItem(row) {
  return {
    queue_item_id: row.queue_item_id,
    status: row.status,
    enqueued_at: row.enqueued_at?.toISOString?.() ?? row.enqueued_at,
    started_at: row.started_at?.toISOString?.() ?? row.started_at,
    finished_at: row.finished_at?.toISOString?.() ?? row.finished_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    simulate_failure: row.simulate_failure,
    error_code: row.error_code ?? undefined,
    result_summary: row.result_summary ?? undefined,
    command: row.command_json
  };
}

export function createPostgresOrchestrationStore(options = {}) {
  const logLimit = Number(options.logLimit ?? DEFAULT_LOG_LIMIT);
  const queueHistoryLimit = Number(options.queueHistoryLimit ?? DEFAULT_QUEUE_HISTORY_LIMIT);
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
  const commandsTable = tableName(schema, 'orchestration_commands');
  const eventsTable = tableName(schema, 'orchestration_events');
  const queueTable = tableName(schema, 'orchestration_module_task_queue');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${commandsTable} (
        id BIGSERIAL PRIMARY KEY,
        command_id UUID NOT NULL UNIQUE,
        name TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        correlation_id UUID NOT NULL,
        trace_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        command_json JSONB NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS orchestration_commands_correlation_idx
      ON ${commandsTable} (correlation_id, created_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${eventsTable} (
        id BIGSERIAL PRIMARY KEY,
        event_id UUID NOT NULL UNIQUE,
        name TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        correlation_id UUID NOT NULL,
        trace_id TEXT NOT NULL,
        emitted_at TIMESTAMPTZ NOT NULL,
        event_json JSONB NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS orchestration_events_correlation_idx
      ON ${eventsTable} (correlation_id, emitted_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${queueTable} (
        queue_item_id UUID PRIMARY KEY,
        status TEXT NOT NULL,
        enqueued_at TIMESTAMPTZ NOT NULL,
        started_at TIMESTAMPTZ NULL,
        finished_at TIMESTAMPTZ NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        simulate_failure BOOLEAN NOT NULL,
        error_code TEXT NULL,
        result_summary TEXT NULL,
        command_json JSONB NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS orchestration_module_task_queue_status_idx
      ON ${queueTable} (status, enqueued_at)
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
    commandsFilePath: null,
    eventsFilePath: null,
    queueFilePath: null,
    async appendCommand(command) {
      await query(
        `INSERT INTO ${commandsTable}
          (command_id, name, tenant_id, correlation_id, trace_id, created_at, command_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          command.command_id,
          command.name,
          command.tenant_id,
          command.correlation_id,
          command.trace_id,
          command.created_at,
          JSON.stringify(command)
        ]
      );
    },
    async appendEvent(event) {
      await query(
        `INSERT INTO ${eventsTable}
          (event_id, name, tenant_id, correlation_id, trace_id, emitted_at, event_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          event.event_id,
          event.name,
          event.tenant_id,
          event.correlation_id,
          event.trace_id,
          event.emitted_at,
          JSON.stringify(event)
        ]
      );
    },
    async getCommands() {
      const result = await query(
        `SELECT command_json
         FROM ${commandsTable}
         ORDER BY created_at DESC, id DESC
         LIMIT $1`,
        [logLimit]
      );
      return result.rows.map((row) => row.command_json).reverse();
    },
    async getEvents() {
      const result = await query(
        `SELECT event_json
         FROM ${eventsTable}
         ORDER BY emitted_at DESC, id DESC
         LIMIT $1`,
        [logLimit]
      );
      return result.rows.map((row) => row.event_json).reverse();
    },
    async getTrace(correlationId) {
      const [commandsResult, eventsResult] = await Promise.all([
        query(
          `SELECT command_json
           FROM ${commandsTable}
           WHERE correlation_id = $1
           ORDER BY created_at ASC, id ASC`,
          [correlationId]
        ),
        query(
          `SELECT event_json
           FROM ${eventsTable}
           WHERE correlation_id = $1
           ORDER BY emitted_at ASC, id ASC`,
          [correlationId]
        )
      ]);

      return {
        commands: commandsResult.rows.map((row) => row.command_json),
        events: eventsResult.rows.map((row) => row.event_json)
      };
    },
    async enqueueModuleTask(command, options = {}) {
      const nowIso = new Date().toISOString();
      const queueItemId = randomUUID();
      await query(
        `INSERT INTO ${queueTable}
          (queue_item_id, status, enqueued_at, updated_at, simulate_failure, command_json)
         VALUES ($1, 'queued', $2, $2, $3, $4::jsonb)`,
        [
          queueItemId,
          nowIso,
          options.simulateFailure === true,
          JSON.stringify(command)
        ]
      );

      return {
        queue_item_id: queueItemId,
        status: 'queued',
        enqueued_at: nowIso,
        updated_at: nowIso,
        simulate_failure: options.simulateFailure === true,
        command
      };
    },
    async claimNextModuleTask() {
      const result = await query(
        `WITH next_item AS (
           SELECT queue_item_id
           FROM ${queueTable}
           WHERE status = 'queued'
           ORDER BY enqueued_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE ${queueTable} q
         SET status = 'processing',
             started_at = NOW(),
             updated_at = NOW()
         FROM next_item
         WHERE q.queue_item_id = next_item.queue_item_id
         RETURNING q.*`
      );
      if (result.rowCount === 0) return null;
      return asQueueItem(result.rows[0]);
    },
    async completeModuleTask(queueItemId, completion) {
      const result = await query(
        `UPDATE ${queueTable}
         SET status = $2,
             updated_at = NOW(),
             finished_at = NOW(),
             error_code = $3,
             result_summary = $4
         WHERE queue_item_id = $1
         RETURNING *`,
        [
          queueItemId,
          completion.status,
          completion.error_code ?? null,
          completion.result_summary ?? null
        ]
      );
      if (result.rowCount === 0) return null;
      return asQueueItem(result.rows[0]);
    },
    async getModuleTaskQueue() {
      const [pending, history] = await Promise.all([
        query(
          `SELECT *
           FROM ${queueTable}
           WHERE status IN ('queued', 'processing')
           ORDER BY enqueued_at ASC`
        ),
        query(
          `SELECT *
           FROM ${queueTable}
           WHERE status IN ('completed', 'failed')
           ORDER BY finished_at DESC NULLS LAST, updated_at DESC
           LIMIT $1`,
          [queueHistoryLimit]
        )
      ]);

      return {
        pending: pending.rows.map(asQueueItem),
        history: history.rows.map(asQueueItem)
      };
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
