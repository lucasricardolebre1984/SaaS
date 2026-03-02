import fs from 'node:fs';
import path from 'node:path';

const ACCOUNT_STATUS = new Set(['active', 'inactive']);
const CONTACT_STATUS = new Set(['active', 'inactive']);
const DEAL_STAGES = new Set(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'nurturing']);
const ACTIVITY_KINDS = new Set(['note', 'task', 'message', 'call', 'meeting', 'system']);
const TASK_STATUS = new Set(['pending', 'in_progress', 'done', 'canceled']);
const TASK_PRIORITY = new Set(['low', 'medium', 'high', 'urgent']);
const VIEW_SCOPE = new Set(['private', 'team', 'tenant']);
const VIEW_MODULE = new Set(['crm.inbox', 'crm.pipeline', 'crm.deals', 'crm.contacts']);

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clone(value) {
  return structuredClone(value);
}

function readJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) return fallbackValue;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function includesQuery(query, values = []) {
  if (!query) return true;
  const normalized = String(query).trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized));
}

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find((item) => item.tenant_id === tenantId && item.external_key === externalKey) ?? null;
}

function ensureStatus(value, setName, fieldName) {
  if (!setName.has(value)) {
    throw new Error(`invalid_${fieldName}:${value}`);
  }
}

function normalizeAccountInput(input) {
  const status = input.status ?? 'active';
  ensureStatus(status, ACCOUNT_STATUS, 'account_status');
  return {
    account_id: input.account_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    name: String(input.name ?? '').trim(),
    legal_name: input.legal_name ?? null,
    document_number: input.document_number ?? null,
    industry: input.industry ?? null,
    website: input.website ?? null,
    status,
    owner_user_id: input.owner_user_id ?? null,
    metadata: input.metadata ?? {}
  };
}

function normalizeContactInput(input) {
  const status = input.status ?? 'active';
  ensureStatus(status, CONTACT_STATUS, 'contact_status');
  return {
    contact_id: input.contact_id,
    tenant_id: input.tenant_id,
    account_id: input.account_id ?? null,
    external_key: input.external_key ?? null,
    display_name: String(input.display_name ?? '').trim(),
    job_title: input.job_title ?? null,
    phone_e164: input.phone_e164 ?? null,
    email: input.email ?? null,
    status,
    metadata: input.metadata ?? {}
  };
}

function normalizeDealInput(input) {
  const stage = input.stage ?? 'new';
  ensureStatus(stage, DEAL_STAGES, 'deal_stage');
  return {
    deal_id: input.deal_id,
    tenant_id: input.tenant_id,
    lead_id: input.lead_id ?? null,
    account_id: input.account_id ?? null,
    contact_id: input.contact_id ?? null,
    external_key: input.external_key ?? null,
    title: String(input.title ?? '').trim(),
    stage,
    amount: Number.isFinite(Number(input.amount)) ? Number(input.amount) : null,
    currency: input.currency ?? null,
    expected_close_date: input.expected_close_date ?? null,
    owner_user_id: input.owner_user_id ?? null,
    metadata: input.metadata ?? {}
  };
}

function normalizeActivityInput(input) {
  const kind = input.kind ?? 'note';
  ensureStatus(kind, ACTIVITY_KINDS, 'activity_kind');
  return {
    activity_id: input.activity_id,
    tenant_id: input.tenant_id,
    deal_id: input.deal_id ?? null,
    contact_id: input.contact_id ?? null,
    kind,
    title: input.title ?? null,
    body: String(input.body ?? ''),
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    author_user_id: input.author_user_id ?? null,
    metadata: input.metadata ?? {}
  };
}

function normalizeTaskInput(input) {
  const status = input.status ?? 'pending';
  const priority = input.priority ?? 'medium';
  ensureStatus(status, TASK_STATUS, 'task_status');
  ensureStatus(priority, TASK_PRIORITY, 'task_priority');
  return {
    task_id: input.task_id,
    tenant_id: input.tenant_id,
    deal_id: input.deal_id ?? null,
    contact_id: input.contact_id ?? null,
    title: String(input.title ?? '').trim(),
    description: input.description ?? null,
    due_at: input.due_at ?? null,
    status,
    priority,
    assignee_user_id: input.assignee_user_id ?? null,
    metadata: input.metadata ?? {}
  };
}

function normalizeViewInput(input) {
  const scope = input.scope ?? 'private';
  ensureStatus(scope, VIEW_SCOPE, 'view_scope');
  const module = input.module ?? 'crm.pipeline';
  ensureStatus(module, VIEW_MODULE, 'view_module');
  return {
    view_id: input.view_id,
    tenant_id: input.tenant_id,
    owner_user_id: input.owner_user_id ?? null,
    name: String(input.name ?? '').trim(),
    scope,
    module,
    is_default: input.is_default === true,
    filters: input.filters ?? {},
    columns: Array.isArray(input.columns) ? input.columns : [],
    sort: input.sort ?? {},
    metadata: input.metadata ?? {}
  };
}

function applyPatch(entity, patch, allowedKeys = []) {
  const next = { ...entity };
  for (const key of allowedKeys) {
    if (Object.hasOwn(patch, key)) {
      next[key] = patch[key];
    }
  }
  return next;
}

export function createFileCrmCoreStore(options = {}) {
  const storageDir = path.resolve(options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'crm-core'));
  ensureDirectory(storageDir);

  const coreFilePath = path.join(storageDir, 'crm-core.json');
  const state = readJsonFile(coreFilePath, {
    accounts: [],
    contacts: [],
    deals: [],
    activities: [],
    tasks: [],
    views: []
  });

  if (!Array.isArray(state.accounts)) state.accounts = [];
  if (!Array.isArray(state.contacts)) state.contacts = [];
  if (!Array.isArray(state.deals)) state.deals = [];
  if (!Array.isArray(state.activities)) state.activities = [];
  if (!Array.isArray(state.tasks)) state.tasks = [];
  if (!Array.isArray(state.views)) state.views = [];

  function persist() {
    writeJsonFile(coreFilePath, state);
  }

  return {
    backend: 'file',
    storageDir,
    coreFilePath,
    async createAccount(input) {
      const normalized = normalizeAccountInput(input);
      const nowIso = new Date().toISOString();
      const byExternalKey = findByExternalKey(state.accounts, normalized.tenant_id, normalized.external_key);
      if (byExternalKey) return { action: 'idempotent', account: clone(byExternalKey) };
      const byId = state.accounts.find((item) => item.tenant_id === normalized.tenant_id && item.account_id === normalized.account_id);
      if (byId) return { action: 'idempotent', account: clone(byId) };
      const created = { ...normalized, created_at: nowIso, updated_at: nowIso };
      state.accounts.push(created);
      persist();
      return { action: 'created', account: clone(created) };
    },
    async listAccounts(tenantId, filters = {}) {
      return state.accounts
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => !filters.status || item.status === filters.status)
        .filter((item) => !filters.owner_user_id || item.owner_user_id === filters.owner_user_id)
        .filter((item) => includesQuery(filters.query, [item.name, item.legal_name, item.document_number]))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async updateAccount(tenantId, accountId, patch) {
      const current = state.accounts.find((item) => item.tenant_id === tenantId && item.account_id === accountId);
      if (!current) return { ok: false, code: 'not_found' };
      const next = applyPatch(current, patch, ['name', 'legal_name', 'document_number', 'industry', 'website', 'status', 'owner_user_id', 'metadata']);
      if (next.status) ensureStatus(next.status, ACCOUNT_STATUS, 'account_status');
      next.updated_at = new Date().toISOString();
      Object.assign(current, next);
      persist();
      return { ok: true, account: clone(current) };
    },
    async createContact(input) {
      const normalized = normalizeContactInput(input);
      const nowIso = new Date().toISOString();
      const byExternalKey = findByExternalKey(state.contacts, normalized.tenant_id, normalized.external_key);
      if (byExternalKey) return { action: 'idempotent', contact: clone(byExternalKey) };
      const byId = state.contacts.find((item) => item.tenant_id === normalized.tenant_id && item.contact_id === normalized.contact_id);
      if (byId) return { action: 'idempotent', contact: clone(byId) };
      const created = { ...normalized, created_at: nowIso, updated_at: nowIso };
      state.contacts.push(created);
      persist();
      return { action: 'created', contact: clone(created) };
    },
    async listContacts(tenantId, filters = {}) {
      return state.contacts
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => !filters.account_id || item.account_id === filters.account_id)
        .filter((item) => !filters.status || item.status === filters.status)
        .filter((item) => includesQuery(filters.query, [item.display_name, item.phone_e164, item.email]))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async updateContact(tenantId, contactId, patch) {
      const current = state.contacts.find((item) => item.tenant_id === tenantId && item.contact_id === contactId);
      if (!current) return { ok: false, code: 'not_found' };
      const next = applyPatch(current, patch, ['account_id', 'display_name', 'job_title', 'phone_e164', 'email', 'status', 'metadata']);
      if (next.status) ensureStatus(next.status, CONTACT_STATUS, 'contact_status');
      next.updated_at = new Date().toISOString();
      Object.assign(current, next);
      persist();
      return { ok: true, contact: clone(current) };
    },
    async createDeal(input) {
      const normalized = normalizeDealInput(input);
      const nowIso = new Date().toISOString();
      const byExternalKey = findByExternalKey(state.deals, normalized.tenant_id, normalized.external_key);
      if (byExternalKey) return { action: 'idempotent', deal: clone(byExternalKey) };
      const byId = state.deals.find((item) => item.tenant_id === normalized.tenant_id && item.deal_id === normalized.deal_id);
      if (byId) return { action: 'idempotent', deal: clone(byId) };
      const created = { ...normalized, created_at: nowIso, updated_at: nowIso };
      state.deals.push(created);
      persist();
      return { action: 'created', deal: clone(created) };
    },
    async listDeals(tenantId, filters = {}) {
      return state.deals
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => !filters.stage || item.stage === filters.stage)
        .filter((item) => !filters.account_id || item.account_id === filters.account_id)
        .filter((item) => !filters.contact_id || item.contact_id === filters.contact_id)
        .filter((item) => !filters.owner_user_id || item.owner_user_id === filters.owner_user_id)
        .filter((item) => includesQuery(filters.query, [item.title, item.external_key]))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async getDealById(tenantId, dealId) {
      const found = state.deals.find((item) => item.tenant_id === tenantId && item.deal_id === dealId);
      return found ? clone(found) : null;
    },
    async updateDeal(tenantId, dealId, patch) {
      const current = state.deals.find((item) => item.tenant_id === tenantId && item.deal_id === dealId);
      if (!current) return { ok: false, code: 'not_found' };
      const next = applyPatch(
        current,
        patch,
        ['title', 'stage', 'amount', 'currency', 'expected_close_date', 'account_id', 'contact_id', 'owner_user_id', 'metadata']
      );
      if (next.stage) ensureStatus(next.stage, DEAL_STAGES, 'deal_stage');
      next.updated_at = new Date().toISOString();
      Object.assign(current, next);
      persist();
      return { ok: true, changed: true, deal: clone(current) };
    },
    async createActivity(input) {
      const normalized = normalizeActivityInput(input);
      const nowIso = new Date().toISOString();
      const byId = state.activities.find((item) => item.tenant_id === normalized.tenant_id && item.activity_id === normalized.activity_id);
      if (byId) return { action: 'idempotent', activity: clone(byId) };
      const created = { ...normalized, created_at: nowIso, updated_at: nowIso };
      state.activities.push(created);
      persist();
      return { action: 'created', activity: clone(created) };
    },
    async listActivities(tenantId, filters = {}) {
      const since = filters.since ? Date.parse(filters.since) : null;
      return state.activities
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => !filters.deal_id || item.deal_id === filters.deal_id)
        .filter((item) => !filters.contact_id || item.contact_id === filters.contact_id)
        .filter((item) => !filters.kind || item.kind === filters.kind)
        .filter((item) => !since || Date.parse(item.occurred_at) >= since)
        .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))
        .map(clone);
    },
    async createTask(input) {
      const normalized = normalizeTaskInput(input);
      const nowIso = new Date().toISOString();
      const byId = state.tasks.find((item) => item.tenant_id === normalized.tenant_id && item.task_id === normalized.task_id);
      if (byId) return { action: 'idempotent', task: clone(byId) };
      const created = { ...normalized, created_at: nowIso, updated_at: nowIso };
      state.tasks.push(created);
      persist();
      return { action: 'created', task: clone(created) };
    },
    async listTasks(tenantId, filters = {}) {
      return state.tasks
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => !filters.deal_id || item.deal_id === filters.deal_id)
        .filter((item) => !filters.contact_id || item.contact_id === filters.contact_id)
        .filter((item) => !filters.assignee_user_id || item.assignee_user_id === filters.assignee_user_id)
        .filter((item) => !filters.status || item.status === filters.status)
        .filter((item) => !filters.priority || item.priority === filters.priority)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async createView(input) {
      const normalized = normalizeViewInput(input);
      const nowIso = new Date().toISOString();
      const byId = state.views.find((item) => item.tenant_id === normalized.tenant_id && item.view_id === normalized.view_id);
      if (byId) return { action: 'idempotent', view: clone(byId) };
      const created = { ...normalized, created_at: nowIso, updated_at: nowIso };
      state.views.push(created);
      persist();
      return { action: 'created', view: clone(created) };
    },
    async listViews(tenantId, filters = {}) {
      return state.views
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => !filters.module || item.module === filters.module)
        .filter((item) => !filters.scope || item.scope === filters.scope)
        .filter((item) => !filters.owner_user_id || item.owner_user_id === filters.owner_user_id)
        .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)))
        .map(clone);
    },
    async close() {}
  };
}
