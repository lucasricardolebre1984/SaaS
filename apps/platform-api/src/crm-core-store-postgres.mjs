import pg from 'pg';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asAccount(row) {
  return {
    account_id: row.account_id,
    tenant_id: row.tenant_id,
    external_key: row.external_key,
    name: row.name,
    legal_name: row.legal_name,
    document_number: row.document_number,
    industry: row.industry,
    website: row.website,
    status: row.status,
    owner_user_id: row.owner_user_id,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asContact(row) {
  return {
    contact_id: row.contact_id,
    tenant_id: row.tenant_id,
    account_id: row.account_id,
    external_key: row.external_key,
    display_name: row.display_name,
    job_title: row.job_title,
    phone_e164: row.phone_e164,
    email: row.email,
    status: row.status,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asDeal(row) {
  return {
    deal_id: row.deal_id,
    tenant_id: row.tenant_id,
    lead_id: row.lead_id,
    account_id: row.account_id,
    contact_id: row.contact_id,
    external_key: row.external_key,
    title: row.title,
    stage: row.stage,
    amount: row.amount == null ? null : Number(row.amount),
    currency: row.currency,
    expected_close_date: row.expected_close_date?.toISOString?.()?.slice(0, 10) ?? row.expected_close_date ?? null,
    owner_user_id: row.owner_user_id,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asActivity(row) {
  return {
    activity_id: row.activity_id,
    tenant_id: row.tenant_id,
    deal_id: row.deal_id,
    contact_id: row.contact_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    occurred_at: row.occurred_at?.toISOString?.() ?? row.occurred_at,
    author_user_id: row.author_user_id,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asTask(row) {
  return {
    task_id: row.task_id,
    tenant_id: row.tenant_id,
    deal_id: row.deal_id,
    contact_id: row.contact_id,
    title: row.title,
    description: row.description,
    due_at: row.due_at?.toISOString?.() ?? row.due_at,
    status: row.status,
    priority: row.priority,
    assignee_user_id: row.assignee_user_id,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asView(row) {
  return {
    view_id: row.view_id,
    tenant_id: row.tenant_id,
    owner_user_id: row.owner_user_id,
    name: row.name,
    scope: row.scope,
    module: row.module,
    is_default: row.is_default === true,
    filters: row.filters_json ?? {},
    columns: row.columns_json ?? [],
    sort: row.sort_json ?? {},
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

export function createPostgresCrmCoreStore(options = {}) {
  const schema = options.pgSchema ?? process.env.ORCHESTRATION_PG_SCHEMA ?? 'public';
  const connectionString =
    options.pgConnectionString ??
    process.env.ORCHESTRATION_PG_DSN ??
    process.env.DATABASE_URL;

  assertValidIdentifier(schema, 'pgSchema');

  if (!connectionString) {
    throw new Error('Missing Postgres DSN. Set ORCHESTRATION_PG_DSN or pass pgConnectionString.');
  }

  const client = new pg.Client({ connectionString });
  const accountsTable = tableName(schema, 'crm_accounts');
  const contactsTable = tableName(schema, 'crm_contacts');
  const dealsTable = tableName(schema, 'crm_deals');
  const activitiesTable = tableName(schema, 'crm_activities');
  const tasksTable = tableName(schema, 'crm_tasks');
  const viewsTable = tableName(schema, 'crm_views');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${accountsTable} (
        account_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        external_key TEXT NULL,
        name TEXT NOT NULL,
        legal_name TEXT NULL,
        document_number TEXT NULL,
        industry TEXT NULL,
        website TEXT NULL,
        status TEXT NOT NULL,
        owner_user_id TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_accounts_tenant_external_key_ux
      ON ${accountsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_accounts_tenant_status_idx
      ON ${accountsTable} (tenant_id, status, created_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${contactsTable} (
        contact_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        account_id UUID NULL REFERENCES ${accountsTable}(account_id),
        external_key TEXT NULL,
        display_name TEXT NOT NULL,
        job_title TEXT NULL,
        phone_e164 TEXT NULL,
        email TEXT NULL,
        status TEXT NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_tenant_external_key_ux
      ON ${contactsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_contacts_tenant_account_idx
      ON ${contactsTable} (tenant_id, account_id, created_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_contacts_tenant_phone_idx
      ON ${contactsTable} (tenant_id, phone_e164)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${dealsTable} (
        deal_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        lead_id UUID NULL,
        account_id UUID NULL REFERENCES ${accountsTable}(account_id),
        contact_id UUID NULL REFERENCES ${contactsTable}(contact_id),
        external_key TEXT NULL,
        title TEXT NOT NULL,
        stage TEXT NOT NULL,
        amount NUMERIC(14, 2) NULL,
        currency CHAR(3) NULL,
        expected_close_date DATE NULL,
        owner_user_id TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_deals_tenant_external_key_ux
      ON ${dealsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_deals_tenant_stage_idx
      ON ${dealsTable} (tenant_id, stage, updated_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${activitiesTable} (
        activity_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        deal_id UUID NULL REFERENCES ${dealsTable}(deal_id),
        contact_id UUID NULL REFERENCES ${contactsTable}(contact_id),
        kind TEXT NOT NULL,
        title TEXT NULL,
        body TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL,
        author_user_id TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_activities_tenant_occurred_idx
      ON ${activitiesTable} (tenant_id, occurred_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tasksTable} (
        task_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        deal_id UUID NULL REFERENCES ${dealsTable}(deal_id),
        contact_id UUID NULL REFERENCES ${contactsTable}(contact_id),
        title TEXT NOT NULL,
        description TEXT NULL,
        due_at TIMESTAMPTZ NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        assignee_user_id TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_tasks_tenant_status_due_idx
      ON ${tasksTable} (tenant_id, status, due_at)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${viewsTable} (
        view_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        owner_user_id TEXT NULL,
        name TEXT NOT NULL,
        scope TEXT NOT NULL,
        module TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_views_tenant_owner_module_name_ux
      ON ${viewsTable} (tenant_id, COALESCE(owner_user_id, ''), module, name)
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
    coreFilePath: null,
    async createAccount(input) {
      if (input.external_key) {
        const byExternalKey = await query(`SELECT * FROM ${accountsTable} WHERE tenant_id = $1 AND external_key = $2 LIMIT 1`, [input.tenant_id, input.external_key]);
        if (byExternalKey.rowCount > 0) return { action: 'idempotent', account: asAccount(byExternalKey.rows[0]) };
      }
      const byId = await query(`SELECT * FROM ${accountsTable} WHERE tenant_id = $1 AND account_id = $2 LIMIT 1`, [input.tenant_id, input.account_id]);
      if (byId.rowCount > 0) return { action: 'idempotent', account: asAccount(byId.rows[0]) };
      const nowIso = new Date().toISOString();
      const inserted = await query(
        `INSERT INTO ${accountsTable} (account_id, tenant_id, external_key, name, legal_name, document_number, industry, website, status, owner_user_id, metadata_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$12)
         RETURNING *`,
        [input.account_id, input.tenant_id, input.external_key ?? null, input.name, input.legal_name ?? null, input.document_number ?? null, input.industry ?? null, input.website ?? null, input.status, input.owner_user_id ?? null, JSON.stringify(input.metadata ?? {}), nowIso]
      );
      return { action: 'created', account: asAccount(inserted.rows[0]) };
    },
    async listAccounts(tenantId, filters = {}) {
      const result = await query(
        `SELECT * FROM ${accountsTable}
         WHERE tenant_id = $1
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR owner_user_id = $3)
           AND ($4::text IS NULL OR name ILIKE $4 OR COALESCE(legal_name, '') ILIKE $4 OR COALESCE(document_number, '') ILIKE $4)
         ORDER BY created_at ASC`,
        [tenantId, filters.status ?? null, filters.owner_user_id ?? null, filters.query ? `%${filters.query}%` : null]
      );
      return result.rows.map(asAccount);
    },
    async updateAccount(tenantId, accountId, patch) {
      const current = await query(`SELECT * FROM ${accountsTable} WHERE tenant_id = $1 AND account_id = $2 LIMIT 1`, [tenantId, accountId]);
      if (current.rowCount === 0) return { ok: false, code: 'not_found' };
      const row = current.rows[0];
      const next = {
        name: Object.hasOwn(patch, 'name') ? patch.name : row.name,
        legal_name: Object.hasOwn(patch, 'legal_name') ? patch.legal_name : row.legal_name,
        document_number: Object.hasOwn(patch, 'document_number') ? patch.document_number : row.document_number,
        industry: Object.hasOwn(patch, 'industry') ? patch.industry : row.industry,
        website: Object.hasOwn(patch, 'website') ? patch.website : row.website,
        status: Object.hasOwn(patch, 'status') ? patch.status : row.status,
        owner_user_id: Object.hasOwn(patch, 'owner_user_id') ? patch.owner_user_id : row.owner_user_id,
        metadata: Object.hasOwn(patch, 'metadata') ? patch.metadata ?? {} : (row.metadata_json ?? {})
      };
      const updated = await query(
        `UPDATE ${accountsTable}
         SET name = $3, legal_name = $4, document_number = $5, industry = $6, website = $7, status = $8, owner_user_id = $9, metadata_json = $10::jsonb, updated_at = $11
         WHERE tenant_id = $1 AND account_id = $2
         RETURNING *`,
        [tenantId, accountId, next.name, next.legal_name, next.document_number, next.industry, next.website, next.status, next.owner_user_id, JSON.stringify(next.metadata), new Date().toISOString()]
      );
      return { ok: true, account: asAccount(updated.rows[0]) };
    },
    async createContact(input) {
      if (input.external_key) {
        const byExternalKey = await query(`SELECT * FROM ${contactsTable} WHERE tenant_id = $1 AND external_key = $2 LIMIT 1`, [input.tenant_id, input.external_key]);
        if (byExternalKey.rowCount > 0) return { action: 'idempotent', contact: asContact(byExternalKey.rows[0]) };
      }
      const byId = await query(`SELECT * FROM ${contactsTable} WHERE tenant_id = $1 AND contact_id = $2 LIMIT 1`, [input.tenant_id, input.contact_id]);
      if (byId.rowCount > 0) return { action: 'idempotent', contact: asContact(byId.rows[0]) };
      const nowIso = new Date().toISOString();
      const inserted = await query(
        `INSERT INTO ${contactsTable} (contact_id, tenant_id, account_id, external_key, display_name, job_title, phone_e164, email, status, metadata_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$11)
         RETURNING *`,
        [input.contact_id, input.tenant_id, input.account_id ?? null, input.external_key ?? null, input.display_name, input.job_title ?? null, input.phone_e164 ?? null, input.email ?? null, input.status, JSON.stringify(input.metadata ?? {}), nowIso]
      );
      return { action: 'created', contact: asContact(inserted.rows[0]) };
    },
    async listContacts(tenantId, filters = {}) {
      const result = await query(
        `SELECT * FROM ${contactsTable}
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR account_id = $2)
           AND ($3::text IS NULL OR status = $3)
           AND ($4::text IS NULL OR display_name ILIKE $4 OR COALESCE(phone_e164, '') ILIKE $4 OR COALESCE(email, '') ILIKE $4)
         ORDER BY created_at ASC`,
        [tenantId, filters.account_id ?? null, filters.status ?? null, filters.query ? `%${filters.query}%` : null]
      );
      return result.rows.map(asContact);
    },
    async updateContact(tenantId, contactId, patch) {
      const current = await query(`SELECT * FROM ${contactsTable} WHERE tenant_id = $1 AND contact_id = $2 LIMIT 1`, [tenantId, contactId]);
      if (current.rowCount === 0) return { ok: false, code: 'not_found' };
      const row = current.rows[0];
      const next = {
        account_id: Object.hasOwn(patch, 'account_id') ? patch.account_id : row.account_id,
        display_name: Object.hasOwn(patch, 'display_name') ? patch.display_name : row.display_name,
        job_title: Object.hasOwn(patch, 'job_title') ? patch.job_title : row.job_title,
        phone_e164: Object.hasOwn(patch, 'phone_e164') ? patch.phone_e164 : row.phone_e164,
        email: Object.hasOwn(patch, 'email') ? patch.email : row.email,
        status: Object.hasOwn(patch, 'status') ? patch.status : row.status,
        metadata: Object.hasOwn(patch, 'metadata') ? patch.metadata ?? {} : (row.metadata_json ?? {})
      };
      const updated = await query(
        `UPDATE ${contactsTable}
         SET account_id = $3, display_name = $4, job_title = $5, phone_e164 = $6, email = $7, status = $8, metadata_json = $9::jsonb, updated_at = $10
         WHERE tenant_id = $1 AND contact_id = $2
         RETURNING *`,
        [tenantId, contactId, next.account_id, next.display_name, next.job_title, next.phone_e164, next.email, next.status, JSON.stringify(next.metadata), new Date().toISOString()]
      );
      return { ok: true, contact: asContact(updated.rows[0]) };
    },
    async createDeal(input) {
      if (input.external_key) {
        const byExternalKey = await query(`SELECT * FROM ${dealsTable} WHERE tenant_id = $1 AND external_key = $2 LIMIT 1`, [input.tenant_id, input.external_key]);
        if (byExternalKey.rowCount > 0) return { action: 'idempotent', deal: asDeal(byExternalKey.rows[0]) };
      }
      const byId = await query(`SELECT * FROM ${dealsTable} WHERE tenant_id = $1 AND deal_id = $2 LIMIT 1`, [input.tenant_id, input.deal_id]);
      if (byId.rowCount > 0) return { action: 'idempotent', deal: asDeal(byId.rows[0]) };
      const nowIso = new Date().toISOString();
      const inserted = await query(
        `INSERT INTO ${dealsTable} (deal_id, tenant_id, lead_id, account_id, contact_id, external_key, title, stage, amount, currency, expected_close_date, owner_user_id, metadata_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$14)
         RETURNING *`,
        [input.deal_id, input.tenant_id, input.lead_id ?? null, input.account_id ?? null, input.contact_id ?? null, input.external_key ?? null, input.title, input.stage, input.amount, input.currency, input.expected_close_date ?? null, input.owner_user_id ?? null, JSON.stringify(input.metadata ?? {}), nowIso]
      );
      return { action: 'created', deal: asDeal(inserted.rows[0]) };
    },
    async listDeals(tenantId, filters = {}) {
      const result = await query(
        `SELECT * FROM ${dealsTable}
         WHERE tenant_id = $1
           AND ($2::text IS NULL OR stage = $2)
           AND ($3::uuid IS NULL OR account_id = $3)
           AND ($4::uuid IS NULL OR contact_id = $4)
           AND ($5::text IS NULL OR owner_user_id = $5)
           AND ($6::text IS NULL OR title ILIKE $6 OR COALESCE(external_key, '') ILIKE $6)
         ORDER BY created_at ASC`,
        [tenantId, filters.stage ?? null, filters.account_id ?? null, filters.contact_id ?? null, filters.owner_user_id ?? null, filters.query ? `%${filters.query}%` : null]
      );
      return result.rows.map(asDeal);
    },
    async getDealById(tenantId, dealId) {
      const result = await query(`SELECT * FROM ${dealsTable} WHERE tenant_id = $1 AND deal_id = $2 LIMIT 1`, [tenantId, dealId]);
      if (result.rowCount === 0) return null;
      return asDeal(result.rows[0]);
    },
    async updateDeal(tenantId, dealId, patch) {
      const current = await query(`SELECT * FROM ${dealsTable} WHERE tenant_id = $1 AND deal_id = $2 LIMIT 1`, [tenantId, dealId]);
      if (current.rowCount === 0) return { ok: false, code: 'not_found' };
      const row = current.rows[0];
      const next = {
        title: Object.hasOwn(patch, 'title') ? patch.title : row.title,
        stage: Object.hasOwn(patch, 'stage') ? patch.stage : row.stage,
        amount: Object.hasOwn(patch, 'amount') ? patch.amount : row.amount,
        currency: Object.hasOwn(patch, 'currency') ? patch.currency : row.currency,
        expected_close_date: Object.hasOwn(patch, 'expected_close_date') ? patch.expected_close_date : row.expected_close_date,
        account_id: Object.hasOwn(patch, 'account_id') ? patch.account_id : row.account_id,
        contact_id: Object.hasOwn(patch, 'contact_id') ? patch.contact_id : row.contact_id,
        owner_user_id: Object.hasOwn(patch, 'owner_user_id') ? patch.owner_user_id : row.owner_user_id,
        metadata: Object.hasOwn(patch, 'metadata') ? patch.metadata ?? {} : (row.metadata_json ?? {})
      };
      const updated = await query(
        `UPDATE ${dealsTable}
         SET title = $3, stage = $4, amount = $5, currency = $6, expected_close_date = $7, account_id = $8, contact_id = $9, owner_user_id = $10, metadata_json = $11::jsonb, updated_at = $12
         WHERE tenant_id = $1 AND deal_id = $2
         RETURNING *`,
        [tenantId, dealId, next.title, next.stage, next.amount, next.currency, next.expected_close_date, next.account_id, next.contact_id, next.owner_user_id, JSON.stringify(next.metadata), new Date().toISOString()]
      );
      return { ok: true, changed: true, deal: asDeal(updated.rows[0]), previous_stage: row.stage };
    },
    async createActivity(input) {
      const byId = await query(`SELECT * FROM ${activitiesTable} WHERE tenant_id = $1 AND activity_id = $2 LIMIT 1`, [input.tenant_id, input.activity_id]);
      if (byId.rowCount > 0) return { action: 'idempotent', activity: asActivity(byId.rows[0]) };
      const nowIso = new Date().toISOString();
      const inserted = await query(
        `INSERT INTO ${activitiesTable} (activity_id, tenant_id, deal_id, contact_id, kind, title, body, occurred_at, author_user_id, metadata_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$11)
         RETURNING *`,
        [input.activity_id, input.tenant_id, input.deal_id ?? null, input.contact_id ?? null, input.kind, input.title ?? null, input.body, input.occurred_at, input.author_user_id ?? null, JSON.stringify(input.metadata ?? {}), nowIso]
      );
      return { action: 'created', activity: asActivity(inserted.rows[0]) };
    },
    async listActivities(tenantId, filters = {}) {
      const result = await query(
        `SELECT * FROM ${activitiesTable}
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR deal_id = $2)
           AND ($3::uuid IS NULL OR contact_id = $3)
           AND ($4::text IS NULL OR kind = $4)
           AND ($5::timestamptz IS NULL OR occurred_at >= $5)
         ORDER BY occurred_at ASC`,
        [tenantId, filters.deal_id ?? null, filters.contact_id ?? null, filters.kind ?? null, filters.since ?? null]
      );
      return result.rows.map(asActivity);
    },
    async createTask(input) {
      const byId = await query(`SELECT * FROM ${tasksTable} WHERE tenant_id = $1 AND task_id = $2 LIMIT 1`, [input.tenant_id, input.task_id]);
      if (byId.rowCount > 0) return { action: 'idempotent', task: asTask(byId.rows[0]) };
      const nowIso = new Date().toISOString();
      const inserted = await query(
        `INSERT INTO ${tasksTable} (task_id, tenant_id, deal_id, contact_id, title, description, due_at, status, priority, assignee_user_id, metadata_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$12)
         RETURNING *`,
        [input.task_id, input.tenant_id, input.deal_id ?? null, input.contact_id ?? null, input.title, input.description ?? null, input.due_at ?? null, input.status, input.priority, input.assignee_user_id ?? null, JSON.stringify(input.metadata ?? {}), nowIso]
      );
      return { action: 'created', task: asTask(inserted.rows[0]) };
    },
    async listTasks(tenantId, filters = {}) {
      const result = await query(
        `SELECT * FROM ${tasksTable}
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR deal_id = $2)
           AND ($3::uuid IS NULL OR contact_id = $3)
           AND ($4::text IS NULL OR assignee_user_id = $4)
           AND ($5::text IS NULL OR status = $5)
           AND ($6::text IS NULL OR priority = $6)
         ORDER BY created_at ASC`,
        [tenantId, filters.deal_id ?? null, filters.contact_id ?? null, filters.assignee_user_id ?? null, filters.status ?? null, filters.priority ?? null]
      );
      return result.rows.map(asTask);
    },
    async createView(input) {
      const byId = await query(`SELECT * FROM ${viewsTable} WHERE tenant_id = $1 AND view_id = $2 LIMIT 1`, [input.tenant_id, input.view_id]);
      if (byId.rowCount > 0) return { action: 'idempotent', view: asView(byId.rows[0]) };
      const nowIso = new Date().toISOString();
      const inserted = await query(
        `INSERT INTO ${viewsTable} (view_id, tenant_id, owner_user_id, name, scope, module, is_default, filters_json, columns_json, sort_json, metadata_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$12)
         RETURNING *`,
        [input.view_id, input.tenant_id, input.owner_user_id ?? null, input.name, input.scope, input.module, input.is_default === true, JSON.stringify(input.filters ?? {}), JSON.stringify(input.columns ?? []), JSON.stringify(input.sort ?? {}), JSON.stringify(input.metadata ?? {}), nowIso]
      );
      return { action: 'created', view: asView(inserted.rows[0]) };
    },
    async listViews(tenantId, filters = {}) {
      const result = await query(
        `SELECT * FROM ${viewsTable}
         WHERE tenant_id = $1
           AND ($2::text IS NULL OR module = $2)
           AND ($3::text IS NULL OR scope = $3)
           AND ($4::text IS NULL OR owner_user_id = $4)
         ORDER BY updated_at ASC`,
        [tenantId, filters.module ?? null, filters.scope ?? null, filters.owner_user_id ?? null]
      );
      return result.rows.map(asView);
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
