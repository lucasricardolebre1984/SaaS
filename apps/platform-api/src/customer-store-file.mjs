import fs from 'node:fs';
import path from 'node:path';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clone(value) {
  return structuredClone(value);
}

function readJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

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

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find(
    (item) => item.tenant_id === tenantId && item.external_key === externalKey
  ) ?? null;
}

function findByCustomerId(items, tenantId, customerId) {
  return items.find(
    (item) => item.tenant_id === tenantId && item.customer_id === customerId
  ) ?? null;
}

export function createFileCustomerStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'customers')
  );
  ensureDirectory(storageDir);
  const customersFilePath = path.join(storageDir, 'customers.json');
  const state = readJsonFile(customersFilePath, { items: [] });
  if (!Array.isArray(state.items)) {
    state.items = [];
  }

  function persist() {
    writeJsonFile(customersFilePath, state);
  }

  return {
    backend: 'file',
    storageDir,
    customersFilePath,
    async upsertCustomer(input) {
      const normalized = normalizeCustomerInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        state.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', customer: clone(byExternalKey) };
      }

      const existing = findByCustomerId(
        state.items,
        normalized.tenant_id,
        normalized.customer_id
      );
      if (existing) {
        existing.display_name = normalized.display_name;
        existing.primary_phone = normalized.primary_phone;
        existing.primary_email = normalized.primary_email;
        existing.origin = normalized.origin;
        existing.status = normalized.status;
        existing.external_key = normalized.external_key;
        existing.metadata = normalized.metadata;
        existing.updated_at = nowIso;
        persist();
        return { action: 'updated', customer: clone(existing) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      state.items.push(created);
      persist();
      return { action: 'created', customer: clone(created) };
    },
    async getCustomerById(tenantId, customerId) {
      const found = findByCustomerId(state.items, tenantId, customerId);
      return found ? clone(found) : null;
    },
    async listCustomers(tenantId) {
      const items = state.items
        .filter((item) => item.tenant_id === tenantId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return items.map(clone);
    },
    async close() {}
  };
}
