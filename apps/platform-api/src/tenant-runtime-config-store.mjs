import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function asBool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNumberInRange(value, fallback = 0.7, min = 0, max = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

const CRM_STAGE_KEYS = new Set([
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
  'nurturing'
]);

const DEFAULT_CRM_PIPELINE_STAGES = [
  { stage: 'new', label: 'New', active: true, order: 10 },
  { stage: 'contacted', label: 'Contacted', active: true, order: 20 },
  { stage: 'qualified', label: 'Qualified', active: true, order: 30 },
  { stage: 'proposal', label: 'Proposal', active: true, order: 40 },
  { stage: 'negotiation', label: 'Negotiation', active: true, order: 50 },
  { stage: 'won', label: 'Won', active: true, order: 60 },
  { stage: 'lost', label: 'Lost', active: true, order: 70 },
  { stage: 'nurturing', label: 'Nurturing', active: true, order: 80 }
];

function asIntegerInRange(value, fallback = 0, min = 0, max = 10080) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function normalizeCrmStageKey(value, fallback = 'new') {
  const raw = asString(value, fallback).toLowerCase();
  if (CRM_STAGE_KEYS.has(raw)) return raw;
  return fallback;
}

function normalizeCrmStageLabel(stage, value) {
  const trimmed = asString(value, '');
  if (trimmed.length > 0) return trimmed;
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function normalizeCrmPipelineStages(inputStages, fallbackStages = DEFAULT_CRM_PIPELINE_STAGES) {
  const source = Array.isArray(inputStages) ? inputStages : fallbackStages;
  const dedup = new Map();
  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    if (!item || typeof item !== 'object') continue;
    const stage = normalizeCrmStageKey(item.stage, '');
    if (!stage) continue;
    dedup.set(stage, {
      stage,
      label: normalizeCrmStageLabel(stage, item.label),
      active: asBool(item.active, true),
      order: asIntegerInRange(item.order, (index + 1) * 10, 1, 10000)
    });
  }

  if (dedup.size === 0) {
    return DEFAULT_CRM_PIPELINE_STAGES.map((item) => ({ ...item }));
  }

  return [...dedup.values()].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.stage.localeCompare(right.stage);
  });
}

function normalizeCrmStageList(value, fallback = ['qualified', 'proposal']) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((item) => item.trim())
      : fallback;
  const unique = [];
  for (const item of source) {
    const stage = normalizeCrmStageKey(item, '');
    if (!stage) continue;
    if (!unique.includes(stage)) unique.push(stage);
  }
  return unique.length > 0 ? unique : [...fallback];
}

function normalizeCrmConfig(input = {}, fallback = {}) {
  const rawPipeline = input.pipeline && typeof input.pipeline === 'object' ? input.pipeline : {};
  const fbPipeline = fallback.pipeline && typeof fallback.pipeline === 'object' ? fallback.pipeline : {};
  const rawAutomation = input.automation && typeof input.automation === 'object' ? input.automation : {};
  const fbAutomation = fallback.automation && typeof fallback.automation === 'object' ? fallback.automation : {};

  const stages = normalizeCrmPipelineStages(rawPipeline.stages, fbPipeline.stages);
  const activeStages = stages.filter((item) => item.active !== false).map((item) => item.stage);
  const defaultStage = normalizeCrmStageKey(
    rawPipeline.default_stage,
    normalizeCrmStageKey(
      fbPipeline.default_stage,
      activeStages[0] ?? stages[0]?.stage ?? 'new'
    )
  );

  return {
    pipeline: {
      stages,
      default_stage: activeStages.includes(defaultStage)
        ? defaultStage
        : (activeStages[0] ?? stages[0]?.stage ?? 'new')
    },
    automation: {
      stage_followup_enabled: asBool(
        rawAutomation.stage_followup_enabled,
        asBool(fbAutomation.stage_followup_enabled, false)
      ),
      stage_followup_stages: normalizeCrmStageList(
        rawAutomation.stage_followup_stages,
        normalizeCrmStageList(fbAutomation.stage_followup_stages, ['qualified', 'proposal'])
      ),
      stage_followup_delay_minutes: asIntegerInRange(
        rawAutomation.stage_followup_delay_minutes,
        asIntegerInRange(fbAutomation.stage_followup_delay_minutes, 45, 0, 10080),
        0,
        10080
      ),
      stage_followup_message_template: asString(
        rawAutomation.stage_followup_message_template,
        asString(
          fbAutomation.stage_followup_message_template,
          'Ola {lead_name}, seguimos com seu atendimento na etapa {to_stage}.'
        )
      )
    }
  };
}

function normalizeCrmAiMode(value, fallback = 'assist_execute') {
  const raw = asString(value, fallback).toLowerCase();
  if (raw === 'suggest_only' || raw === 'assist_execute') return raw;
  return fallback;
}

function normalizeApiKey(value, fallback = '') {
  const raw = asString(value, fallback);
  if (!raw) return '';
  // Keep only first token to avoid accidental concatenated secrets in UI paste.
  return raw.split(/\s+/)[0];
}

function normalizeIntegrationsCrmEvolution(input = {}, fallback = {}) {
  const raw = input.crm_evolution ?? {};
  const fb = fallback.crm_evolution ?? {};
  return {
    base_url: asString(raw.base_url, asString(fb.base_url, '')),
    api_key: asString(raw.api_key, asString(fb.api_key, '')),
    instance_id: asString(raw.instance_id, asString(fb.instance_id, 'fabio')) || 'fabio',
    auto_reply_enabled: asBool(raw.auto_reply_enabled, asBool(fb.auto_reply_enabled, false)),
    auto_reply_use_ai: asBool(raw.auto_reply_use_ai, asBool(fb.auto_reply_use_ai, false)),
    auto_reply_text: asString(
      raw.auto_reply_text,
      asString(fb.auto_reply_text, 'Recebemos sua mensagem no WhatsApp. Em instantes retornaremos por aqui.')
    )
  };
}

function normalizeTenantRuntimeConfig(input = {}, fallback = {}) {
  const openaiInput = input.openai ?? {};
  const openaiFallback = fallback.openai ?? {};
  const personasInput = input.personas ?? {};
  const personasFallback = fallback.personas ?? {};
  const executionInput = input.execution ?? {};
  const executionFallback = fallback.execution ?? {};
  const integrationsInput = input.integrations ?? {};
  const integrationsFallback = fallback.integrations ?? {};
  const crmInput = input.crm ?? {};
  const crmFallback = fallback.crm ?? {};

  return {
    openai: {
      api_key: normalizeApiKey(openaiInput.api_key, normalizeApiKey(openaiFallback.api_key, '')),
      model: asString(openaiInput.model, asString(openaiFallback.model, 'gpt-5-mini')) || 'gpt-5-mini',
      vision_enabled: asBool(openaiInput.vision_enabled, asBool(openaiFallback.vision_enabled, true)),
      voice_enabled: asBool(openaiInput.voice_enabled, asBool(openaiFallback.voice_enabled, true)),
      image_generation_enabled: asBool(
        openaiInput.image_generation_enabled,
        asBool(openaiFallback.image_generation_enabled, true)
      ),
      image_read_enabled: asBool(
        openaiInput.image_read_enabled,
        asBool(openaiFallback.image_read_enabled, true)
      )
    },
    personas: {
      owner_concierge_prompt: asString(
        personasInput.owner_concierge_prompt,
        asString(personasFallback.owner_concierge_prompt, '')
      ),
      whatsapp_agent_prompt: asString(
        personasInput.whatsapp_agent_prompt,
        asString(personasFallback.whatsapp_agent_prompt, '')
      )
    },
    execution: {
      confirmations_enabled: asBool(
        executionInput.confirmations_enabled,
        asBool(executionFallback.confirmations_enabled, false)
      ),
      whatsapp_ai_enabled: asBool(
        executionInput.whatsapp_ai_enabled,
        asBool(executionFallback.whatsapp_ai_enabled, true)
      ),
      whatsapp_ai_mode: normalizeCrmAiMode(
        executionInput.whatsapp_ai_mode,
        normalizeCrmAiMode(executionFallback.whatsapp_ai_mode, 'assist_execute')
      ),
      whatsapp_ai_min_confidence: asNumberInRange(
        executionInput.whatsapp_ai_min_confidence,
        asNumberInRange(executionFallback.whatsapp_ai_min_confidence, 0.7),
        0,
        1
      )
    },
    integrations: {
      crm_evolution: normalizeIntegrationsCrmEvolution(
        integrationsInput,
        integrationsFallback
      )
    },
    crm: normalizeCrmConfig(crmInput, crmFallback)
  };
}

function createFileTenantRuntimeConfigStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'tenant-runtime-config')
  );
  ensureDirectory(storageDir);

  const configFilePath = path.join(storageDir, 'tenant-runtime-config.json');
  const state = readJsonFile(configFilePath, { items: [] });
  if (!Array.isArray(state.items)) {
    state.items = [];
  }

  function persist() {
    writeJsonFile(configFilePath, state);
  }

  function findConfig(tenantId) {
    return state.items.find((item) => item.tenant_id === tenantId) ?? null;
  }

  return {
    backend: 'file',
    storageDir,
    configFilePath,
    async getTenantRuntimeConfig(tenantId) {
      const normalizedTenantId = asString(tenantId);
      if (!normalizedTenantId) return null;
      const existing = findConfig(normalizedTenantId);
      if (!existing) return null;
      return structuredClone(existing);
    },
    async upsertTenantRuntimeConfig(tenantId, configInput = {}) {
      const normalizedTenantId = asString(tenantId);
      if (!normalizedTenantId) {
        throw new Error('tenant_id_required');
      }

      const existing = findConfig(normalizedTenantId);
      const normalized = normalizeTenantRuntimeConfig(configInput, existing ?? {});
      const nowIso = new Date().toISOString();

      if (existing) {
        existing.openai = normalized.openai;
        existing.personas = normalized.personas;
        existing.execution = normalized.execution;
        existing.integrations = normalized.integrations;
        existing.crm = normalized.crm;
        existing.updated_at = nowIso;
        persist();
        return structuredClone(existing);
      }

      const created = {
        tenant_id: normalizedTenantId,
        openai: normalized.openai,
        personas: normalized.personas,
        execution: normalized.execution,
        integrations: normalized.integrations,
        crm: normalized.crm,
        created_at: nowIso,
        updated_at: nowIso
      };
      state.items.push(created);
      persist();
      return structuredClone(created);
    },
    async close() {}
  };
}

function asIsoTimestamp(value, fallbackIso) {
  const parsed = new Date(String(value ?? '').trim());
  if (Number.isNaN(parsed.getTime())) return fallbackIso;
  return parsed.toISOString();
}

function asTenantRuntimeConfigRecord(row) {
  const config = row.config_json ?? {};
  return {
    tenant_id: row.tenant_id,
    openai: config.openai ?? {},
    personas: config.personas ?? {},
    execution: config.execution ?? {},
    integrations: config.integrations ?? {},
    crm: config.crm ?? normalizeCrmConfig(),
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function createPostgresTenantRuntimeConfigStore(options = {}) {
  const schema = options.pgSchema ?? process.env.ORCHESTRATION_PG_SCHEMA ?? 'public';
  const connectionString =
    options.pgConnectionString ??
    process.env.ORCHESTRATION_PG_DSN ??
    process.env.DATABASE_URL;
  const autoMigrate = options.pgAutoMigrate !== false;
  const legacyStorageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'tenant-runtime-config')
  );
  const legacyConfigFilePath = path.join(legacyStorageDir, 'tenant-runtime-config.json');

  assertValidIdentifier(schema, 'pgSchema');

  if (!connectionString) {
    throw new Error('Missing Postgres DSN. Set ORCHESTRATION_PG_DSN or pass pgConnectionString.');
  }

  const client = new pg.Client({ connectionString });
  const runtimeConfigTable = tableName(schema, 'tenant_runtime_configs');

  async function ensureSchema() {
    if (!autoMigrate) return;
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${runtimeConfigTable} (
        tenant_id TEXT PRIMARY KEY,
        config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS tenant_runtime_configs_updated_idx
      ON ${runtimeConfigTable} (updated_at DESC)
    `);
  }

  async function backfillFromLegacyFile() {
    const state = readJsonFile(legacyConfigFilePath, { items: [] });
    if (!Array.isArray(state.items) || state.items.length === 0) return;

    for (const item of state.items) {
      const tenantId = asString(item?.tenant_id);
      if (!tenantId) continue;
      const normalized = normalizeTenantRuntimeConfig(item, item);
      const fallbackCreatedAt = new Date().toISOString();
      const createdAt = asIsoTimestamp(item?.created_at, fallbackCreatedAt);
      const updatedAt = asIsoTimestamp(item?.updated_at, createdAt);
      await client.query(
        `
          INSERT INTO ${runtimeConfigTable} (tenant_id, config_json, created_at, updated_at)
          VALUES ($1, $2::jsonb, $3, $4)
          ON CONFLICT (tenant_id) DO NOTHING
        `,
        [tenantId, JSON.stringify(normalized), createdAt, updatedAt]
      );
    }
  }

  const ready = (async () => {
    await client.connect();
    await ensureSchema();
    await backfillFromLegacyFile();
  })();

  async function query(sql, params = []) {
    await ready;
    return client.query(sql, params);
  }

  return {
    backend: 'postgres',
    storageDir: null,
    configFilePath: null,
    async getTenantRuntimeConfig(tenantId) {
      const normalizedTenantId = asString(tenantId);
      if (!normalizedTenantId) return null;
      const result = await query(
        `SELECT tenant_id, config_json, created_at, updated_at FROM ${runtimeConfigTable} WHERE tenant_id = $1 LIMIT 1`,
        [normalizedTenantId]
      );
      if (result.rowCount === 0) return null;
      return asTenantRuntimeConfigRecord(result.rows[0]);
    },
    async upsertTenantRuntimeConfig(tenantId, configInput = {}) {
      const normalizedTenantId = asString(tenantId);
      if (!normalizedTenantId) {
        throw new Error('tenant_id_required');
      }

      const existing = await this.getTenantRuntimeConfig(normalizedTenantId);
      const normalized = normalizeTenantRuntimeConfig(configInput, existing ?? {});
      const nowIso = new Date().toISOString();
      const createdAt = existing?.created_at ?? nowIso;

      const result = await query(
        `
          INSERT INTO ${runtimeConfigTable} (tenant_id, config_json, created_at, updated_at)
          VALUES ($1, $2::jsonb, $3, $4)
          ON CONFLICT (tenant_id) DO UPDATE
          SET config_json = EXCLUDED.config_json,
              updated_at = EXCLUDED.updated_at
          RETURNING tenant_id, config_json, created_at, updated_at
        `,
        [normalizedTenantId, JSON.stringify(normalized), createdAt, nowIso]
      );

      return asTenantRuntimeConfigRecord(result.rows[0]);
    },
    async close() {
      await ready.catch(() => {});
      await client.end();
    }
  };
}

export function createTenantRuntimeConfigStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresTenantRuntimeConfigStore(options);
  }

  if (backend === 'file') {
    return createFileTenantRuntimeConfigStore(options);
  }

  throw new Error(
    `Unsupported tenant runtime config store backend: ${backend}. Use "file" or "postgres".`
  );
}

