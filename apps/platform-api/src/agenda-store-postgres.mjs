import pg from 'pg';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asAppointment(row) {
  return {
    appointment_id: row.appointment_id,
    tenant_id: row.tenant_id,
    external_key: row.external_key,
    title: row.title,
    description: row.description,
    start_at: row.start_at?.toISOString?.() ?? row.start_at,
    end_at: row.end_at?.toISOString?.() ?? row.end_at,
    timezone: row.timezone,
    status: row.status,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asReminder(row) {
  return {
    reminder_id: row.reminder_id,
    appointment_id: row.appointment_id,
    tenant_id: row.tenant_id,
    external_key: row.external_key,
    schedule_at: row.schedule_at?.toISOString?.() ?? row.schedule_at,
    channel: row.channel,
    message: row.message,
    recipient: row.recipient_json ?? {},
    status: row.status,
    dispatch_command_id: row.dispatch_command_id,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function normalizeAppointmentInput(input) {
  return {
    appointment_id: input.appointment_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    title: String(input.title ?? '').trim(),
    description: input.description ?? '',
    start_at: input.start_at,
    end_at: input.end_at ?? null,
    timezone: input.timezone,
    status: input.status ?? 'scheduled',
    metadata: input.metadata ?? {}
  };
}

function normalizeReminderInput(input) {
  return {
    reminder_id: input.reminder_id,
    appointment_id: input.appointment_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    schedule_at: input.schedule_at,
    channel: input.channel,
    message: String(input.message ?? '').trim(),
    recipient: input.recipient ?? {},
    status: input.status ?? 'scheduled',
    dispatch_command_id: input.dispatch_command_id ?? null,
    metadata: input.metadata ?? {}
  };
}

export function createPostgresAgendaStore(options = {}) {
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
  const appointmentsTable = tableName(schema, 'agenda_appointments');
  const remindersTable = tableName(schema, 'agenda_reminders');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${appointmentsTable} (
        appointment_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        external_key TEXT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NULL,
        timezone TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS agenda_appointments_tenant_external_key_ux
      ON ${appointmentsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${remindersTable} (
        reminder_id UUID PRIMARY KEY,
        appointment_id UUID NOT NULL,
        tenant_id TEXT NOT NULL,
        external_key TEXT NULL,
        schedule_at TIMESTAMPTZ NOT NULL,
        channel TEXT NOT NULL,
        message TEXT NOT NULL,
        recipient_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL,
        dispatch_command_id UUID NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS agenda_reminders_tenant_external_key_ux
      ON ${remindersTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS agenda_reminders_tenant_schedule_idx
      ON ${remindersTable} (tenant_id, schedule_at)
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
    appointmentsFilePath: null,
    remindersFilePath: null,
    async createAppointment(input) {
      const normalized = normalizeAppointmentInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${appointmentsTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', appointment: asAppointment(byExternalKey.rows[0]) };
        }
      }

      const existing = await query(
        `SELECT *
         FROM ${appointmentsTable}
         WHERE tenant_id = $1 AND appointment_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.appointment_id]
      );
      if (existing.rowCount > 0) {
        return { action: 'idempotent', appointment: asAppointment(existing.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${appointmentsTable}
          (appointment_id, tenant_id, external_key, title, description, start_at, end_at, timezone, status, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $11)
         RETURNING *`,
        [
          normalized.appointment_id,
          normalized.tenant_id,
          normalized.external_key,
          normalized.title,
          normalized.description,
          normalized.start_at,
          normalized.end_at,
          normalized.timezone,
          normalized.status,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', appointment: asAppointment(inserted.rows[0]) };
    },
    async updateAppointment(tenantId, appointmentId, changes) {
      const current = await query(
        `SELECT *
         FROM ${appointmentsTable}
         WHERE tenant_id = $1 AND appointment_id = $2
         LIMIT 1`,
        [tenantId, appointmentId]
      );
      if (current.rowCount === 0) return null;

      const row = current.rows[0];
      const next = {
        title: Object.hasOwn(changes, 'title') ? changes.title : row.title,
        description: Object.hasOwn(changes, 'description') ? changes.description : row.description,
        start_at: Object.hasOwn(changes, 'start_at') ? changes.start_at : row.start_at,
        end_at: Object.hasOwn(changes, 'end_at') ? changes.end_at : row.end_at,
        timezone: Object.hasOwn(changes, 'timezone') ? changes.timezone : row.timezone,
        status: Object.hasOwn(changes, 'status') ? changes.status : row.status,
        metadata: Object.hasOwn(changes, 'metadata') ? changes.metadata : (row.metadata_json ?? {})
      };

      const updated = await query(
        `UPDATE ${appointmentsTable}
         SET title = $3,
             description = $4,
             start_at = $5,
             end_at = $6,
             timezone = $7,
             status = $8,
             metadata_json = $9::jsonb,
             updated_at = $10
         WHERE tenant_id = $1 AND appointment_id = $2
         RETURNING *`,
        [
          tenantId,
          appointmentId,
          next.title,
          next.description,
          next.start_at,
          next.end_at,
          next.timezone,
          next.status,
          JSON.stringify(next.metadata),
          new Date().toISOString()
        ]
      );
      return asAppointment(updated.rows[0]);
    },
    async getAppointmentById(tenantId, appointmentId) {
      const result = await query(
        `SELECT *
         FROM ${appointmentsTable}
         WHERE tenant_id = $1 AND appointment_id = $2
         LIMIT 1`,
        [tenantId, appointmentId]
      );
      if (result.rowCount === 0) return null;
      return asAppointment(result.rows[0]);
    },
    async createReminder(input) {
      const normalized = normalizeReminderInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${remindersTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', reminder: asReminder(byExternalKey.rows[0]) };
        }
      }

      const existing = await query(
        `SELECT *
         FROM ${remindersTable}
         WHERE tenant_id = $1 AND reminder_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.reminder_id]
      );
      if (existing.rowCount > 0) {
        return { action: 'idempotent', reminder: asReminder(existing.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${remindersTable}
          (reminder_id, appointment_id, tenant_id, external_key, schedule_at, channel, message, recipient_json, status, dispatch_command_id, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb, $12, $12)
         RETURNING *`,
        [
          normalized.reminder_id,
          normalized.appointment_id,
          normalized.tenant_id,
          normalized.external_key,
          normalized.schedule_at,
          normalized.channel,
          normalized.message,
          JSON.stringify(normalized.recipient),
          normalized.status,
          normalized.dispatch_command_id,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', reminder: asReminder(inserted.rows[0]) };
    },
    async updateReminder(tenantId, reminderId, changes) {
      const current = await query(
        `SELECT *
         FROM ${remindersTable}
         WHERE tenant_id = $1 AND reminder_id = $2
         LIMIT 1`,
        [tenantId, reminderId]
      );
      if (current.rowCount === 0) return null;

      const row = current.rows[0];
      const next = {
        status: Object.hasOwn(changes, 'status') ? changes.status : row.status,
        dispatch_command_id: Object.hasOwn(changes, 'dispatch_command_id')
          ? changes.dispatch_command_id
          : row.dispatch_command_id,
        recipient: Object.hasOwn(changes, 'recipient') ? changes.recipient : (row.recipient_json ?? {}),
        message: Object.hasOwn(changes, 'message') ? changes.message : row.message,
        metadata: Object.hasOwn(changes, 'metadata') ? changes.metadata : (row.metadata_json ?? {}),
        schedule_at: Object.hasOwn(changes, 'schedule_at') ? changes.schedule_at : row.schedule_at
      };

      const updated = await query(
        `UPDATE ${remindersTable}
         SET schedule_at = $3,
             message = $4,
             recipient_json = $5::jsonb,
             status = $6,
             dispatch_command_id = $7,
             metadata_json = $8::jsonb,
             updated_at = $9
         WHERE tenant_id = $1 AND reminder_id = $2
         RETURNING *`,
        [
          tenantId,
          reminderId,
          next.schedule_at,
          next.message,
          JSON.stringify(next.recipient),
          next.status,
          next.dispatch_command_id,
          JSON.stringify(next.metadata),
          new Date().toISOString()
        ]
      );
      return asReminder(updated.rows[0]);
    },
    async listReminders(tenantId) {
      const result = await query(
        `SELECT *
         FROM ${remindersTable}
         WHERE tenant_id = $1
         ORDER BY schedule_at ASC`,
        [tenantId]
      );
      return result.rows.map(asReminder);
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
