import fs from 'node:fs';
import path from 'node:path';
import { validateLeadStageTransition, isKnownLeadStage } from './lead-funnel.mjs';

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

function normalizeLeadInput(input) {
  const stage = input.stage ?? 'new';
  if (!isKnownLeadStage(stage)) {
    throw new Error(`invalid_lead_stage:${stage}`);
  }

  return {
    lead_id: input.lead_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    display_name: String(input.display_name ?? '').trim(),
    phone_e164: input.phone_e164,
    source_channel: input.source_channel,
    stage,
    metadata: input.metadata ?? {}
  };
}

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find(
    (item) => item.tenant_id === tenantId && item.external_key === externalKey
  ) ?? null;
}

export function createFileLeadStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'crm')
  );
  ensureDirectory(storageDir);
  const leadsFilePath = path.join(storageDir, 'leads.json');
  const state = readJsonFile(leadsFilePath, { items: [] });
  if (!Array.isArray(state.items)) {
    state.items = [];
  }

  function persist() {
    writeJsonFile(leadsFilePath, state);
  }

  return {
    backend: 'file',
    storageDir,
    leadsFilePath,
    async createLead(input) {
      const normalized = normalizeLeadInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        state.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', lead: clone(byExternalKey) };
      }

      const existing = state.items.find(
        (item) => item.tenant_id === normalized.tenant_id && item.lead_id === normalized.lead_id
      );
      if (existing) {
        return { action: 'idempotent', lead: clone(existing) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      state.items.push(created);
      persist();
      return { action: 'created', lead: clone(created) };
    },
    async updateLeadStage(tenantId, leadId, changes) {
      const lead = state.items.find((item) => item.tenant_id === tenantId && item.lead_id === leadId);
      if (!lead) return { ok: false, code: 'not_found' };

      const transition = validateLeadStageTransition(
        lead.stage,
        changes.to_stage,
        changes.trigger,
        changes.reason_code
      );
      if (!transition.ok) {
        return { ok: false, code: transition.code, expected_trigger: transition.expected_trigger };
      }

      lead.stage = changes.to_stage;
      if (Object.hasOwn(changes, 'metadata')) {
        lead.metadata = changes.metadata ?? {};
      }
      lead.updated_at = new Date().toISOString();
      persist();
      return { ok: true, lead: clone(lead) };
    },
    async getLeadById(tenantId, leadId) {
      const lead = state.items.find((item) => item.tenant_id === tenantId && item.lead_id === leadId);
      return lead ? clone(lead) : null;
    },
    async listLeads(tenantId) {
      return state.items
        .filter((item) => item.tenant_id === tenantId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map(clone);
    },
    async close() {}
  };
}
