import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ENTRY_STATUSES = new Set(['candidate', 'promoted', 'archived']);

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

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find(
    (item) => item.tenant_id === tenantId && item.external_key === externalKey
  ) ?? null;
}

function normalizeEntryInput(input) {
  return {
    memory_id: input.memory_id,
    tenant_id: input.tenant_id,
    session_id: input.session_id,
    external_key: input.external_key ?? null,
    source: input.source,
    content: String(input.content ?? '').trim(),
    tags: Array.isArray(input.tags) ? input.tags : [],
    salience_score: Number(input.salience_score ?? 0.5),
    embedding_ref: input.embedding_ref ?? null,
    status: 'candidate',
    metadata: input.metadata ?? {}
  };
}

export function createFileOwnerMemoryStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'owner-memory')
  );
  ensureDirectory(storageDir);

  const entriesFilePath = path.join(storageDir, 'entries.json');
  const promotionsFilePath = path.join(storageDir, 'promotions.json');
  const entriesState = readJsonFile(entriesFilePath, { items: [] });
  const promotionsState = readJsonFile(promotionsFilePath, { items: [] });
  if (!Array.isArray(entriesState.items)) {
    entriesState.items = [];
  }
  if (!Array.isArray(promotionsState.items)) {
    promotionsState.items = [];
  }

  function persistEntries() {
    writeJsonFile(entriesFilePath, entriesState);
  }

  function persistPromotions() {
    writeJsonFile(promotionsFilePath, promotionsState);
  }

  return {
    backend: 'file',
    storageDir,
    entriesFilePath,
    promotionsFilePath,
    async createEntry(input) {
      const normalized = normalizeEntryInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        entriesState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', entry: clone(byExternalKey) };
      }

      const byMemoryId = entriesState.items.find(
        (item) => item.tenant_id === normalized.tenant_id && item.memory_id === normalized.memory_id
      );
      if (byMemoryId) {
        return { action: 'idempotent', entry: clone(byMemoryId) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      entriesState.items.push(created);
      persistEntries();
      return { action: 'created', entry: clone(created) };
    },
    async getEntryById(tenantId, memoryId) {
      const found = entriesState.items.find(
        (item) => item.tenant_id === tenantId && item.memory_id === memoryId
      );
      return found ? clone(found) : null;
    },
    async listEntries(tenantId, options = {}) {
      const sessionId = options.sessionId ?? null;
      const status = options.status ?? null;
      return entriesState.items
        .filter((item) => item.tenant_id === tenantId)
        .filter((item) => (sessionId ? item.session_id === sessionId : true))
        .filter((item) => (status ? item.status === status : true))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async applyPromotion(tenantId, memoryId, action, reasonCode, metadata) {
      const entry = entriesState.items.find(
        (item) => item.tenant_id === tenantId && item.memory_id === memoryId
      );
      if (!entry) {
        return { ok: false, code: 'not_found' };
      }

      const nextStatus = action === 'promote' ? 'promoted' : 'archived';
      if (!ENTRY_STATUSES.has(nextStatus)) {
        return { ok: false, code: 'invalid_action' };
      }
      if (entry.status !== 'candidate') {
        return { ok: false, code: 'invalid_transition' };
      }

      const nowIso = new Date().toISOString();
      entry.status = nextStatus;
      entry.updated_at = nowIso;
      persistEntries();

      const promotionRecord = {
        promotion_id: randomUUID(),
        tenant_id: tenantId,
        memory_id: memoryId,
        action,
        reason_code: reasonCode ?? null,
        metadata: metadata ?? {},
        created_at: nowIso
      };
      promotionsState.items.push(promotionRecord);
      persistPromotions();
      return { ok: true, entry: clone(entry), promotion: clone(promotionRecord) };
    },
    async getSummary(tenantId) {
      const entries = entriesState.items.filter((item) => item.tenant_id === tenantId);
      const promoted = entries.filter((item) => item.status === 'promoted');
      const sessions = new Set(entries.map((item) => item.session_id));

      const lastPromotedAt = promoted.length > 0
        ? promoted
          .map((item) => item.updated_at)
          .sort((a, b) => String(b).localeCompare(String(a)))[0]
        : null;

      return {
        tenant_id: tenantId,
        entries_total: entries.length,
        candidate_count: entries.filter((item) => item.status === 'candidate').length,
        promoted_count: promoted.length,
        archived_count: entries.filter((item) => item.status === 'archived').length,
        sessions_count: sessions.size,
        last_promoted_at: lastPromotedAt
      };
    },
    async close() {}
  };
}
