import pg from 'pg';

const CHARGE_STATUSES = new Set([
  'draft',
  'open',
  'collection_requested',
  'paid',
  'canceled',
  'failed'
]);

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asCharge(row) {
  const dueDateRaw = row.due_date;
  const dueDateIso = dueDateRaw
    ? (dueDateRaw.toISOString?.().slice(0, 10) ?? String(dueDateRaw))
    : null;

  return {
    charge_id: row.charge_id,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    external_key: row.external_key,
    amount: Number(row.amount),
    currency: row.currency,
    due_date: dueDateIso,
    status: row.status,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asPayment(row) {
  return {
    payment_id: row.payment_id,
    charge_id: row.charge_id,
    tenant_id: row.tenant_id,
    external_key: row.external_key,
    amount: Number(row.amount),
    currency: row.currency,
    paid_at: row.paid_at?.toISOString?.() ?? row.paid_at,
    status: row.status,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function normalizeChargeInput(input) {
  const status = input.status ?? 'open';
  if (!CHARGE_STATUSES.has(status)) {
    throw new Error(`invalid_charge_status:${status}`);
  }

  return {
    charge_id: input.charge_id,
    tenant_id: input.tenant_id,
    customer_id: input.customer_id,
    external_key: input.external_key ?? null,
    amount: Number(input.amount),
    currency: String(input.currency ?? '').toUpperCase(),
    due_date: input.due_date ?? null,
    status,
    metadata: input.metadata ?? {}
  };
}

function normalizePaymentInput(input) {
  return {
    payment_id: input.payment_id,
    charge_id: input.charge_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    amount: Number(input.amount),
    currency: String(input.currency ?? '').toUpperCase(),
    paid_at: input.paid_at ?? new Date().toISOString(),
    status: input.status,
    metadata: input.metadata ?? {}
  };
}

export function createPostgresBillingStore(options = {}) {
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
  const chargesTable = tableName(schema, 'billing_charges');
  const paymentsTable = tableName(schema, 'billing_payments');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${chargesTable} (
        charge_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer_id UUID NOT NULL,
        external_key TEXT NULL,
        amount NUMERIC(14, 2) NOT NULL,
        currency CHAR(3) NOT NULL,
        due_date DATE NULL,
        status TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS billing_charges_tenant_external_key_ux
      ON ${chargesTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS billing_charges_tenant_due_date_idx
      ON ${chargesTable} (tenant_id, due_date)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${paymentsTable} (
        payment_id UUID PRIMARY KEY,
        charge_id UUID NOT NULL REFERENCES ${chargesTable} (charge_id),
        tenant_id TEXT NOT NULL,
        external_key TEXT NULL,
        amount NUMERIC(14, 2) NOT NULL,
        currency CHAR(3) NOT NULL,
        paid_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS billing_payments_tenant_external_key_ux
      ON ${paymentsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS billing_payments_tenant_paid_at_idx
      ON ${paymentsTable} (tenant_id, paid_at)
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
    chargesFilePath: null,
    paymentsFilePath: null,
    async createCharge(input) {
      const normalized = normalizeChargeInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${chargesTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', charge: asCharge(byExternalKey.rows[0]) };
        }
      }

      const byChargeId = await query(
        `SELECT *
         FROM ${chargesTable}
         WHERE tenant_id = $1 AND charge_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.charge_id]
      );
      if (byChargeId.rowCount > 0) {
        return { action: 'idempotent', charge: asCharge(byChargeId.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${chargesTable}
          (charge_id, tenant_id, customer_id, external_key, amount, currency, due_date, status, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
         RETURNING *`,
        [
          normalized.charge_id,
          normalized.tenant_id,
          normalized.customer_id,
          normalized.external_key,
          normalized.amount,
          normalized.currency,
          normalized.due_date,
          normalized.status,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', charge: asCharge(inserted.rows[0]) };
    },
    async updateCharge(tenantId, chargeId, changes) {
      const current = await query(
        `SELECT *
         FROM ${chargesTable}
         WHERE tenant_id = $1 AND charge_id = $2
         LIMIT 1`,
        [tenantId, chargeId]
      );
      if (current.rowCount === 0) return null;

      const row = current.rows[0];
      const nextStatus = Object.hasOwn(changes, 'status') ? changes.status : row.status;
      if (!CHARGE_STATUSES.has(nextStatus)) {
        throw new Error(`invalid_charge_status:${nextStatus}`);
      }

      const next = {
        customer_id: Object.hasOwn(changes, 'customer_id') ? changes.customer_id : row.customer_id,
        amount: Object.hasOwn(changes, 'amount') ? Number(changes.amount) : Number(row.amount),
        currency: Object.hasOwn(changes, 'currency')
          ? String(changes.currency ?? '').toUpperCase()
          : row.currency,
        due_date: Object.hasOwn(changes, 'due_date') ? changes.due_date : row.due_date,
        status: nextStatus,
        metadata: Object.hasOwn(changes, 'metadata') ? changes.metadata : (row.metadata_json ?? {})
      };

      const updated = await query(
        `UPDATE ${chargesTable}
         SET customer_id = $3,
             amount = $4,
             currency = $5,
             due_date = $6,
             status = $7,
             metadata_json = $8::jsonb,
             updated_at = $9
         WHERE tenant_id = $1 AND charge_id = $2
         RETURNING *`,
        [
          tenantId,
          chargeId,
          next.customer_id,
          next.amount,
          next.currency,
          next.due_date,
          next.status,
          JSON.stringify(next.metadata),
          new Date().toISOString()
        ]
      );
      return asCharge(updated.rows[0]);
    },
    async getChargeById(tenantId, chargeId) {
      const result = await query(
        `SELECT *
         FROM ${chargesTable}
         WHERE tenant_id = $1 AND charge_id = $2
         LIMIT 1`,
        [tenantId, chargeId]
      );
      if (result.rowCount === 0) return null;
      return asCharge(result.rows[0]);
    },
    async listCharges(tenantId) {
      const result = await query(
        `SELECT *
         FROM ${chargesTable}
         WHERE tenant_id = $1
         ORDER BY created_at ASC`,
        [tenantId]
      );
      return result.rows.map(asCharge);
    },
    async createPayment(input) {
      const normalized = normalizePaymentInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${paymentsTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', payment: asPayment(byExternalKey.rows[0]) };
        }
      }

      const byPaymentId = await query(
        `SELECT *
         FROM ${paymentsTable}
         WHERE tenant_id = $1 AND payment_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.payment_id]
      );
      if (byPaymentId.rowCount > 0) {
        return { action: 'idempotent', payment: asPayment(byPaymentId.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${paymentsTable}
          (payment_id, charge_id, tenant_id, external_key, amount, currency, paid_at, status, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
         RETURNING *`,
        [
          normalized.payment_id,
          normalized.charge_id,
          normalized.tenant_id,
          normalized.external_key,
          normalized.amount,
          normalized.currency,
          normalized.paid_at,
          normalized.status,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', payment: asPayment(inserted.rows[0]) };
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
