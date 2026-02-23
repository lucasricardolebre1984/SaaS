import pg from 'pg';
import { isKnownCampaignState, validateCampaignStateTransition } from './crm-workflows.mjs';

const FOLLOWUP_STATUS = new Set(['pending', 'sent', 'failed']);

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asCampaign(row) {
  return {
    campaign_id: row.campaign_id,
    tenant_id: row.tenant_id,
    external_key: row.external_key,
    name: row.name,
    channel: row.channel,
    audience_segment: row.audience_segment,
    state: row.state,
    scheduled_at: row.scheduled_at?.toISOString?.() ?? row.scheduled_at ?? null,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asFollowup(row) {
  return {
    followup_id: row.followup_id,
    tenant_id: row.tenant_id,
    campaign_id: row.campaign_id,
    external_key: row.external_key,
    lead_id: row.lead_id,
    customer_id: row.customer_id,
    phone_e164: row.phone_e164,
    message: row.message,
    schedule_at: row.schedule_at?.toISOString?.() ?? row.schedule_at,
    channel: row.channel,
    status: row.status,
    provider_message_id: row.provider_message_id,
    last_error_code: row.last_error_code,
    last_error_message: row.last_error_message,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
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

export function createPostgresCrmAutomationStore(options = {}) {
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
  const campaignsTable = tableName(schema, 'crm_campaigns');
  const followupsTable = tableName(schema, 'crm_followups');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${campaignsTable} (
        campaign_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        external_key TEXT NULL,
        name TEXT NOT NULL,
        channel TEXT NOT NULL,
        audience_segment TEXT NULL,
        state TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_campaigns_tenant_external_key_ux
      ON ${campaignsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_campaigns_tenant_state_idx
      ON ${campaignsTable} (tenant_id, state)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${followupsTable} (
        followup_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        campaign_id UUID NULL,
        external_key TEXT NULL,
        lead_id UUID NULL,
        customer_id UUID NULL,
        phone_e164 TEXT NOT NULL,
        message TEXT NOT NULL,
        schedule_at TIMESTAMPTZ NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        provider_message_id TEXT NULL,
        last_error_code TEXT NULL,
        last_error_message TEXT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        correlation_id UUID NULL,
        trace_id TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_followups_tenant_external_key_ux
      ON ${followupsTable} (tenant_id, external_key)
      WHERE external_key IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_followups_tenant_schedule_idx
      ON ${followupsTable} (tenant_id, status, schedule_at)
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
    campaignsFilePath: null,
    followupsFilePath: null,
    async createCampaign(input) {
      const normalized = normalizeCampaignInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${campaignsTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', campaign: asCampaign(byExternalKey.rows[0]) };
        }
      }

      const byCampaignId = await query(
        `SELECT *
         FROM ${campaignsTable}
         WHERE tenant_id = $1 AND campaign_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.campaign_id]
      );
      if (byCampaignId.rowCount > 0) {
        return { action: 'idempotent', campaign: asCampaign(byCampaignId.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${campaignsTable}
          (campaign_id, tenant_id, external_key, name, channel, audience_segment, state, scheduled_at, metadata_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
         RETURNING *`,
        [
          normalized.campaign_id,
          normalized.tenant_id,
          normalized.external_key,
          normalized.name,
          normalized.channel,
          normalized.audience_segment,
          normalized.state,
          normalized.scheduled_at,
          JSON.stringify(normalized.metadata),
          nowIso
        ]
      );

      return { action: 'created', campaign: asCampaign(inserted.rows[0]) };
    },
    async updateCampaignState(tenantId, campaignId, changes) {
      const current = await query(
        `SELECT *
         FROM ${campaignsTable}
         WHERE tenant_id = $1 AND campaign_id = $2
         LIMIT 1`,
        [tenantId, campaignId]
      );
      if (current.rowCount === 0) {
        return { ok: false, code: 'not_found' };
      }

      const row = current.rows[0];
      const transition = validateCampaignStateTransition(
        row.state,
        changes.to_state,
        changes.trigger
      );
      if (!transition.ok) {
        return { ok: false, code: transition.code, expected_trigger: transition.expected_trigger };
      }

      const metadata = Object.hasOwn(changes, 'metadata') ? (changes.metadata ?? {}) : (row.metadata_json ?? {});
      const nextState = transition.changed ? changes.to_state : row.state;
      const updated = await query(
        `UPDATE ${campaignsTable}
         SET state = $3,
             metadata_json = $4::jsonb,
             updated_at = $5
         WHERE tenant_id = $1 AND campaign_id = $2
         RETURNING *`,
        [
          tenantId,
          campaignId,
          nextState,
          JSON.stringify(metadata),
          new Date().toISOString()
        ]
      );

      return {
        ok: true,
        changed: Boolean(transition.changed),
        previous_state: row.state,
        campaign: asCampaign(updated.rows[0])
      };
    },
    async listCampaigns(tenantId) {
      const result = await query(
        `SELECT *
         FROM ${campaignsTable}
         WHERE tenant_id = $1
         ORDER BY created_at ASC`,
        [tenantId]
      );
      return result.rows.map(asCampaign);
    },
    async createFollowup(input) {
      const normalized = normalizeFollowupInput(input);
      const nowIso = new Date().toISOString();

      if (normalized.external_key) {
        const byExternalKey = await query(
          `SELECT *
           FROM ${followupsTable}
           WHERE tenant_id = $1 AND external_key = $2
           LIMIT 1`,
          [normalized.tenant_id, normalized.external_key]
        );
        if (byExternalKey.rowCount > 0) {
          return { action: 'idempotent', followup: asFollowup(byExternalKey.rows[0]) };
        }
      }

      const byFollowupId = await query(
        `SELECT *
         FROM ${followupsTable}
         WHERE tenant_id = $1 AND followup_id = $2
         LIMIT 1`,
        [normalized.tenant_id, normalized.followup_id]
      );
      if (byFollowupId.rowCount > 0) {
        return { action: 'idempotent', followup: asFollowup(byFollowupId.rows[0]) };
      }

      const inserted = await query(
        `INSERT INTO ${followupsTable}
          (followup_id, tenant_id, campaign_id, external_key, lead_id, customer_id, phone_e164, message, schedule_at, channel, status, provider_message_id, last_error_code, last_error_message, metadata_json, correlation_id, trace_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17, $18, $18)
         RETURNING *`,
        [
          normalized.followup_id,
          normalized.tenant_id,
          normalized.campaign_id,
          normalized.external_key,
          normalized.lead_id,
          normalized.customer_id,
          normalized.phone_e164,
          normalized.message,
          normalized.schedule_at,
          normalized.channel,
          normalized.status,
          normalized.provider_message_id,
          normalized.last_error_code,
          normalized.last_error_message,
          JSON.stringify(normalized.metadata),
          normalized.correlation_id,
          normalized.trace_id,
          nowIso
        ]
      );

      return { action: 'created', followup: asFollowup(inserted.rows[0]) };
    },
    async listFollowups(tenantId, filters = {}) {
      const hasStatus = typeof filters.status === 'string' && filters.status.length > 0;
      const result = await query(
        `SELECT *
         FROM ${followupsTable}
         WHERE tenant_id = $1
           AND ($2::text IS NULL OR status = $2)
         ORDER BY created_at ASC`,
        [tenantId, hasStatus ? filters.status : null]
      );
      return result.rows.map(asFollowup);
    },
    async claimPendingFollowups(limit = 10, nowIso = new Date().toISOString()) {
      const maxItems = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
      const result = await query(
        `SELECT *
         FROM ${followupsTable}
         WHERE status = 'pending'
           AND schedule_at <= $1
         ORDER BY schedule_at ASC, created_at ASC
         LIMIT $2`,
        [nowIso, maxItems]
      );
      return result.rows.map((row) => ({
        ...asFollowup(row),
        correlation_id: row.correlation_id,
        trace_id: row.trace_id
      }));
    },
    async markFollowupSent(tenantId, followupId, result = {}) {
      const current = await query(
        `SELECT *
         FROM ${followupsTable}
         WHERE tenant_id = $1 AND followup_id = $2
         LIMIT 1`,
        [tenantId, followupId]
      );
      if (current.rowCount === 0) {
        return { ok: false, code: 'not_found' };
      }

      const row = current.rows[0];
      if (row.status !== 'pending') {
        return { ok: false, code: 'invalid_state', current_status: row.status };
      }

      const updated = await query(
        `UPDATE ${followupsTable}
         SET status = 'sent',
             provider_message_id = $3,
             last_error_code = NULL,
             last_error_message = NULL,
             updated_at = $4
         WHERE tenant_id = $1 AND followup_id = $2
         RETURNING *`,
        [
          tenantId,
          followupId,
          result.provider_message_id ?? null,
          new Date().toISOString()
        ]
      );
      const out = updated.rows[0];
      return {
        ok: true,
        correlation_id: out.correlation_id,
        trace_id: out.trace_id,
        followup: asFollowup(out)
      };
    },
    async markFollowupFailed(tenantId, followupId, result = {}) {
      const current = await query(
        `SELECT *
         FROM ${followupsTable}
         WHERE tenant_id = $1 AND followup_id = $2
         LIMIT 1`,
        [tenantId, followupId]
      );
      if (current.rowCount === 0) {
        return { ok: false, code: 'not_found' };
      }

      const row = current.rows[0];
      if (row.status !== 'pending') {
        return { ok: false, code: 'invalid_state', current_status: row.status };
      }

      const updated = await query(
        `UPDATE ${followupsTable}
         SET status = 'failed',
             last_error_code = $3,
             last_error_message = $4,
             updated_at = $5
         WHERE tenant_id = $1 AND followup_id = $2
         RETURNING *`,
        [
          tenantId,
          followupId,
          result.error_code ?? 'DISPATCH_FAILED',
          result.error_message ?? null,
          new Date().toISOString()
        ]
      );
      const out = updated.rows[0];
      return {
        ok: true,
        correlation_id: out.correlation_id,
        trace_id: out.trace_id,
        followup: asFollowup(out)
      };
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
