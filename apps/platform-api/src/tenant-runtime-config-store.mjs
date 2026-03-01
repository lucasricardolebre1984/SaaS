import fs from 'node:fs';
import path from 'node:path';

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
    }
  };
}

export function createTenantRuntimeConfigStore(options = {}) {
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

