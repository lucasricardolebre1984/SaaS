import fs from 'node:fs';
import path from 'node:path';

const CHARGE_STATUSES = new Set([
  'draft',
  'open',
  'collection_requested',
  'paid',
  'canceled',
  'failed'
]);

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

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find(
    (item) => item.tenant_id === tenantId && item.external_key === externalKey
  ) ?? null;
}

export function createFileBillingStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'billing')
  );
  ensureDirectory(storageDir);

  const chargesFilePath = path.join(storageDir, 'charges.json');
  const paymentsFilePath = path.join(storageDir, 'payments.json');
  const chargesState = readJsonFile(chargesFilePath, { items: [] });
  const paymentsState = readJsonFile(paymentsFilePath, { items: [] });

  if (!Array.isArray(chargesState.items)) {
    chargesState.items = [];
  }
  if (!Array.isArray(paymentsState.items)) {
    paymentsState.items = [];
  }

  function persistCharges() {
    writeJsonFile(chargesFilePath, chargesState);
  }

  function persistPayments() {
    writeJsonFile(paymentsFilePath, paymentsState);
  }

  return {
    backend: 'file',
    storageDir,
    chargesFilePath,
    paymentsFilePath,
    async createCharge(input) {
      const normalized = normalizeChargeInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        chargesState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', charge: clone(byExternalKey) };
      }

      const byChargeId = chargesState.items.find(
        (item) =>
          item.tenant_id === normalized.tenant_id &&
          item.charge_id === normalized.charge_id
      );
      if (byChargeId) {
        return { action: 'idempotent', charge: clone(byChargeId) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      chargesState.items.push(created);
      persistCharges();
      return { action: 'created', charge: clone(created) };
    },
    async updateCharge(tenantId, chargeId, changes) {
      const charge = chargesState.items.find(
        (item) => item.tenant_id === tenantId && item.charge_id === chargeId
      );
      if (!charge) return null;

      const allowed = ['customer_id', 'amount', 'currency', 'due_date', 'status', 'metadata'];
      for (const key of allowed) {
        if (Object.hasOwn(changes, key)) {
          charge[key] = key === 'currency'
            ? String(changes[key] ?? '').toUpperCase()
            : changes[key];
        }
      }
      if (Object.hasOwn(changes, 'status') && !CHARGE_STATUSES.has(charge.status)) {
        throw new Error(`invalid_charge_status:${charge.status}`);
      }

      charge.updated_at = new Date().toISOString();
      persistCharges();
      return clone(charge);
    },
    async getChargeById(tenantId, chargeId) {
      const charge = chargesState.items.find(
        (item) => item.tenant_id === tenantId && item.charge_id === chargeId
      );
      return charge ? clone(charge) : null;
    },
    async listCharges(tenantId) {
      return chargesState.items
        .filter((item) => item.tenant_id === tenantId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async createPayment(input) {
      const normalized = normalizePaymentInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        paymentsState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', payment: clone(byExternalKey) };
      }

      const byPaymentId = paymentsState.items.find(
        (item) =>
          item.tenant_id === normalized.tenant_id &&
          item.payment_id === normalized.payment_id
      );
      if (byPaymentId) {
        return { action: 'idempotent', payment: clone(byPaymentId) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      paymentsState.items.push(created);
      persistPayments();
      return { action: 'created', payment: clone(created) };
    },
    async close() {}
  };
}
