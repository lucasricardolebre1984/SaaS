import pg from 'pg';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asCustomer(row) {
  return {
    customer_id: row.customer_id,
    tenant_id: row.tenant_id,
    display_name: row.display_name,
    primary_phone: row.primary_phone,
    primary_email: row.primary_email,
    origin: row.origin,
    status: row.status,
    external_key: row.external_key,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function normalizeCustomerInput(input) {
  return {
    customer_id: input.customer_id,
    tenant_id: input.tenant_id,
    display_name: String(input.display_name ?? '').trim(),
    primary_phone: input.primary_phone ?? null,
    primary_email: input.primary_email ?? null,
    origin: input.origin,
    status: input.status ?? 'active',
    external_key: input.external_key ?? null,
    metadata: input.metadata ?? {}
  };
}

export function createPostgresCustomerStore(options = {}) {
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
  const customersTable = tableName(schema, 'customers');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${customersTable} (
        customer_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        primary_phone TEXT NULL,
        primary_email TEXT NULL,
        origin TEXT NOT NULL,
        status TEXT NOT NULL,
        external_key TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_external_key_ux
      ON ${customersTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS customers_tenant_created_idx
      ON ${customersTable} (tenant_id, created_at)
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
    customersFilePath: null,
    async upsertCustomer(input) {
      const normalized = normalizeCustomerInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${customersTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', customer: asCustomer(byExternalKey.rows[0]) };
        }
      }

      const existing = await query(
        `SELECT *
         FROM ${customersTable}
         WHERE tenant_id = $1 AND customer_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.customer_id]
      );

      if (existing.rowCount > 0) {
        const updated = await query(
          `UPDATE ${customersTable}
           SET display_name = $3,
               primary_phone = $4,
               primary_email = $5,
               origin = $6,
               status = $7,
               external_key = $8,
               metadata_json = $9::jsonb,
               updated_at = $10
           WHERE tenant_id = $1 AND customer_id = $2
           RETURNING *`,
          [
            normalized.tenant_id,
            normalized.customer_id,
            normalized.display_name,
            normalized.primary_phone,
            normalized.primary_email,
            normalized.origin,
            normalized.status,
            normalized.external_key,
            JSON.stringify(normalized.metadata),
            nowIso
          ]
        );
        return { action: 'updated', customer: asCustomer(updated.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${customersTable}
          (customer_id, tenant_id, display_name, primary_phone, primary_email, origin, status, external_key, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
         RETURNING *`,
        [
          normalized.customer_id,
          normalized.tenant_id,
          normalized.display_name,
          normalized.primary_phone,
          normalized.primary_email,
          normalized.origin,
          normalized.status,
          normalized.external_key,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );
      return { action: 'created', customer: asCustomer(inserted.rows[0]) };
    },
    async getCustomerById(tenantId, customerId) {
      const result = await query(
        `SELECT *
         FROM ${customersTable}
         WHERE tenant_id = $1 AND customer_id = $2
         LIMIT 1`,
        [tenantId, customerId]
      );
      if (result.rowCount === 0) return null;
      return asCustomer(result.rows[0]);
    },
    async listCustomers(tenantId) {
      const result = await query(
        `SELECT *
         FROM ${customersTable}
         WHERE tenant_id = $1
         ORDER BY created_at ASC`,
        [tenantId]
      );
      return result.rows.map(asCustomer);
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
