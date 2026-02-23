import fs from 'node:fs';
import path from 'node:path';
import { isKnownCampaignState, validateCampaignStateTransition } from './crm-workflows.mjs';

const FOLLOWUP_STATUS = new Set(['pending', 'sent', 'failed']);

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

function normalizeCampaignInput(input) {
  const state = input.state ?? 'draft';
  if (!isKnownCampaignState(state)) {
    throw new Error(`invalid_campaign_state:${state}`);
  }

  return {
    campaign_id: input.campaign_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    name: String(input.name ?? '').trim(),
    channel: input.channel ?? 'whatsapp',
    audience_segment: input.audience_segment ?? null,
    state,
    scheduled_at: input.scheduled_at ?? null,
    metadata: input.metadata ?? {}
  };
}

function normalizeFollowupInput(input) {
  const status = input.status ?? 'pending';
  if (!FOLLOWUP_STATUS.has(status)) {
    throw new Error(`invalid_followup_status:${status}`);
  }

  return {
    followup_id: input.followup_id,
    tenant_id: input.tenant_id,
    campaign_id: input.campaign_id ?? null,
    external_key: input.external_key ?? null,
    lead_id: input.lead_id ?? null,
    customer_id: input.customer_id ?? null,
    phone_e164: input.phone_e164,
    message: String(input.message ?? ''),
    schedule_at: input.schedule_at,
    channel: input.channel ?? 'whatsapp',
    status,
    provider_message_id: input.provider_message_id ?? null,
    last_error_code: input.last_error_code ?? null,
    last_error_message: input.last_error_message ?? null,
    metadata: input.metadata ?? {},
    correlation_id: input.correlation_id ?? null,
    trace_id: input.trace_id ?? null
  };
}

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find(
    (item) => item.tenant_id === tenantId && item.external_key === externalKey
  ) ?? null;
}

function asCampaignPublic(item) {
  return {
    campaign_id: item.campaign_id,
    tenant_id: item.tenant_id,
    external_key: item.external_key ?? null,
    name: item.name,
    channel: item.channel,
    audience_segment: item.audience_segment ?? null,
    state: item.state,
    scheduled_at: item.scheduled_at ?? null,
    metadata: item.metadata ?? {},
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function asFollowupPublic(item) {
  return {
    followup_id: item.followup_id,
    tenant_id: item.tenant_id,
    campaign_id: item.campaign_id ?? null,
    external_key: item.external_key ?? null,
    lead_id: item.lead_id ?? null,
    customer_id: item.customer_id ?? null,
    phone_e164: item.phone_e164,
    message: item.message,
    schedule_at: item.schedule_at,
    channel: item.channel,
    status: item.status,
    provider_message_id: item.provider_message_id ?? null,
    last_error_code: item.last_error_code ?? null,
    last_error_message: item.last_error_message ?? null,
    metadata: item.metadata ?? {},
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

export function createFileCrmAutomationStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'crm-automation')
  );
  ensureDirectory(storageDir);

  const campaignsFilePath = path.join(storageDir, 'campaigns.json');
  const followupsFilePath = path.join(storageDir, 'followups.json');

  const campaignsState = readJsonFile(campaignsFilePath, { items: [] });
  if (!Array.isArray(campaignsState.items)) campaignsState.items = [];

  const followupsState = readJsonFile(followupsFilePath, { items: [] });
  if (!Array.isArray(followupsState.items)) followupsState.items = [];

  function persistCampaigns() {
    writeJsonFile(campaignsFilePath, campaignsState);
  }

  function persistFollowups() {
    writeJsonFile(followupsFilePath, followupsState);
  }

  return {
    backend: 'file',
    storageDir,
    campaignsFilePath,
    followupsFilePath,
    async createCampaign(input) {
      const normalized = normalizeCampaignInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        campaignsState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', campaign: clone(asCampaignPublic(byExternalKey)) };
      }

      const existing = campaignsState.items.find(
        (item) => item.tenant_id === normalized.tenant_id && item.campaign_id === normalized.campaign_id
      );
      if (existing) {
        return { action: 'idempotent', campaign: clone(asCampaignPublic(existing)) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      campaignsState.items.push(created);
      persistCampaigns();
      return { action: 'created', campaign: clone(asCampaignPublic(created)) };
    },
    async updateCampaignState(tenantId, campaignId, changes) {
      const campaign = campaignsState.items.find(
        (item) => item.tenant_id === tenantId && item.campaign_id === campaignId
      );
      if (!campaign) return { ok: false, code: 'not_found' };

      const transition = validateCampaignStateTransition(
        campaign.state,
        changes.to_state,
        changes.trigger
      );
      if (!transition.ok) {
        return { ok: false, code: transition.code, expected_trigger: transition.expected_trigger };
      }

      const previousState = campaign.state;
      if (transition.changed) {
        campaign.state = changes.to_state;
      }
      if (Object.hasOwn(changes, 'metadata')) {
        campaign.metadata = changes.metadata ?? {};
      }
      campaign.updated_at = new Date().toISOString();
      persistCampaigns();

      return {
        ok: true,
        changed: Boolean(transition.changed),
        previous_state: previousState,
        campaign: clone(asCampaignPublic(campaign))
      };
    },
    async listCampaigns(tenantId) {
      return campaignsState.items
        .filter((item) => item.tenant_id === tenantId)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((item) => clone(asCampaignPublic(item)));
    },
    async createFollowup(input) {
      const normalized = normalizeFollowupInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        followupsState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', followup: clone(asFollowupPublic(byExternalKey)) };
      }

      const existing = followupsState.items.find(
        (item) => item.tenant_id === normalized.tenant_id && item.followup_id === normalized.followup_id
      );
      if (existing) {
        return { action: 'idempotent', followup: clone(asFollowupPublic(existing)) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      followupsState.items.push(created);
      persistFollowups();
      return { action: 'created', followup: clone(asFollowupPublic(created)) };
    },
    async listFollowups(tenantId, filters = {}) {
      const statusFilter = filters.status;
      return followupsState.items
        .filter((item) => (
          item.tenant_id === tenantId &&
          (!statusFilter || item.status === statusFilter)
        ))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
        .map((item) => clone(asFollowupPublic(item)));
    },
    async claimPendingFollowups(limit = 10, nowIso = new Date().toISOString()) {
      const maxItems = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
      return followupsState.items
        .filter((item) => item.status === 'pending' && String(item.schedule_at) <= String(nowIso))
        .sort((a, b) => String(a.schedule_at).localeCompare(String(b.schedule_at)))
        .slice(0, maxItems)
        .map(clone);
    },
    async markFollowupSent(tenantId, followupId, result = {}) {
      const followup = followupsState.items.find(
        (item) => item.tenant_id === tenantId && item.followup_id === followupId
      );
      if (!followup) return { ok: false, code: 'not_found' };
      if (followup.status !== 'pending') {
        return { ok: false, code: 'invalid_state', current_status: followup.status };
      }

      followup.status = 'sent';
      followup.provider_message_id = result.provider_message_id ?? null;
      followup.last_error_code = null;
      followup.last_error_message = null;
      followup.updated_at = new Date().toISOString();
      persistFollowups();
      return {
        ok: true,
        correlation_id: followup.correlation_id ?? null,
        trace_id: followup.trace_id ?? null,
        followup: clone(asFollowupPublic(followup))
      };
    },
    async markFollowupFailed(tenantId, followupId, result = {}) {
      const followup = followupsState.items.find(
        (item) => item.tenant_id === tenantId && item.followup_id === followupId
      );
      if (!followup) return { ok: false, code: 'not_found' };
      if (followup.status !== 'pending') {
        return { ok: false, code: 'invalid_state', current_status: followup.status };
      }

      followup.status = 'failed';
      followup.last_error_code = result.error_code ?? 'DISPATCH_FAILED';
      followup.last_error_message = result.error_message ?? null;
      followup.updated_at = new Date().toISOString();
      persistFollowups();
      return {
        ok: true,
        correlation_id: followup.correlation_id ?? null,
        trace_id: followup.trace_id ?? null,
        followup: clone(asFollowupPublic(followup))
      };
    },
    async close() {}
  };
}
