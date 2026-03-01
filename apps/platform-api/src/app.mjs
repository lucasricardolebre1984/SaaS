import { randomUUID } from 'node:crypto';
import {
  campaignCreateValid,
  campaignListValid,
  campaignStateUpdateValid,
  appointmentCreateValid,
  appointmentUpdateValid,
  billingLifecycleEventPayloadValid,
  chargeCreateValid,
  chargeListValid,
  chargeUpdateValid,
  contextPromotionValid,
  contextRetrievalRequestValid,
  contextRetrievalResponseValid,
  crmAiExecuteValid,
  crmAiQualifyValid,
  crmAiSuggestReplyValid,
  contextSummaryValid,
  customerCreateValid,
  customerLifecycleEventPayloadValid,
  customerListValid,
  evolutionWebhookValid,
  followupCreateValid,
  followupListValid,
  interactionConfirmationActionResponseValid,
  interactionConfirmationActionValid,
  interactionConfirmationListResponseValid,
  leadCreateValid,
  leadListValid,
  leadStageUpdateValid,
  memoryEntryCreateValid,
  memoryEntryListValid,
  outboundQueueValid,
  orchestrationCommandValid,
  orchestrationEventValid,
  ownerInteractionValid,
  ownerInteractionResponseValid,
  paymentCreateValid,
  reminderCreateValid,
  reminderLifecycleEventPayloadValid,
  reminderListValid
} from './schemas.mjs';
import { createOrchestrationStore } from './orchestration-store.mjs';
import { createTaskPlanner } from './task-planner.mjs';
import {
  findLeadStageTransition,
  listLeadStageTransitionsFrom,
  normalizeLeadStageForPublicEvent
} from './lead-funnel.mjs';
import { createCustomerStore } from './customer-store.mjs';
import { createAgendaStore } from './agenda-store.mjs';
import { createBillingStore } from './billing-store.mjs';
import { createLeadStore } from './lead-store.mjs';
import { createCrmAutomationStore } from './crm-automation-store.mjs';
import { createCrmConversationStore } from './crm-conversation-store.mjs';
import { createOwnerMemoryStore } from './owner-memory-store.mjs';
import { createOwnerMemoryMaintenanceStore } from './owner-memory-maintenance-store.mjs';
import { createOwnerShortMemoryStore } from './owner-short-memory-store.mjs';
import { createOwnerEpisodeStore } from './owner-episode-store.mjs';
import { createTenantRuntimeConfigStore } from './tenant-runtime-config-store.mjs';
import { createEmbeddingProvider } from './embedding-provider.mjs';
import { createOwnerResponseProvider } from './owner-response-provider.mjs';
import {
  mapCustomerCreateRequestToCommandPayload,
  mapCustomerCreateRequestToStoreRecord
} from './customer-mapper.mjs';

const ORCHESTRATION_SCHEMA_VERSION = '1.0.0';
const ORCHESTRATION_LOG_LIMIT = 200;
const DEFAULT_CORS_ALLOW_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const DEFAULT_CORS_ALLOW_HEADERS = 'content-type,authorization,x-requested-with';
const DEFAULT_CORS_MAX_AGE = '86400';

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseCorsAllowOrigins(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
  }
  const raw = String(value ?? '*').trim();
  if (raw === '*' || raw.length === 0) return ['*'];
  return raw.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
}

function resolveCorsOrigin(originHeader, allowOrigins) {
  if (allowOrigins.includes('*')) return '*';
  if (!originHeader) return null;
  const origin = String(originHeader).trim();
  if (allowOrigins.includes(origin)) return origin;
  return null;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ownerSessionStateFromRequest(request) {
  if (request.operation === 'toggle_continuous_mode') {
    if (request.payload?.enabled) {
      return { mode: 'continuous', state: 'active_continuous' };
    }
    return { mode: 'one-shot', state: 'paused' };
  }

  if (request.operation === 'send_message') {
    return { mode: 'one-shot', state: 'awaiting_user' };
  }

  return { mode: 'one-shot', state: 'idle' };
}

function modeFromRequest(request) {
  if (request.operation === 'toggle_continuous_mode' && request.payload?.enabled) {
    return 'continuous';
  }
  if (request.operation === 'avatar_config_upsert' && request.payload?.enabled) {
    return 'continuous';
  }
  return 'one-shot';
}

function avatarStateFromRequest(request) {
  if (request.operation === 'avatar_config_upsert') {
    if (request.payload?.enabled) {
      return {
        enabled: true,
        state: 'ready',
        voice_profile: request.payload.voice_profile ?? 'owner-default'
      };
    }
    return { enabled: false, state: 'disabled' };
  }

  if (request.operation === 'toggle_continuous_mode' && request.payload?.enabled) {
    return { enabled: true, state: 'ready', voice_profile: 'owner-default' };
  }

  return { enabled: false, state: 'disabled' };
}

function sanitizePersonaOverrides(raw) {
  if (!raw || typeof raw !== 'object') return undefined;

  const ownerPrompt = typeof raw.owner_concierge_prompt === 'string'
    ? raw.owner_concierge_prompt.trim()
    : '';
  const whatsappPrompt = typeof raw.whatsapp_agent_prompt === 'string'
    ? raw.whatsapp_agent_prompt.trim()
    : '';

  const sanitized = {};
  if (ownerPrompt.length > 0) {
    sanitized.owner_concierge_prompt = ownerPrompt;
  }
  if (whatsappPrompt.length > 0) {
    sanitized.whatsapp_agent_prompt = whatsappPrompt;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function mergePersonaOverrides(requestOverrides, tenantRuntimeConfig) {
  const fromRequest = sanitizePersonaOverrides(requestOverrides);
  if (fromRequest) return fromRequest;

  const tenantPersonas = tenantRuntimeConfig?.personas;
  if (!tenantPersonas || typeof tenantPersonas !== 'object') {
    return undefined;
  }
  return sanitizePersonaOverrides({
    owner_concierge_prompt: tenantPersonas.owner_concierge_prompt,
    whatsapp_agent_prompt: tenantPersonas.whatsapp_agent_prompt
  });
}

function normalizeApiKeyToken(value) {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  if (rawValue.length === 0) return '';
  // Prevent accidental multi-secret paste (e.g. "sk-... API_KEY=...").
  return rawValue.split(/\s+/)[0];
}

function resolveOpenAiApiKey(tenantRuntimeConfig, fallbackApiKey = '') {
  const tenantApiKey = normalizeApiKeyToken(tenantRuntimeConfig?.openai?.api_key);
  if (tenantApiKey.length > 0) {
    return tenantApiKey;
  }
  return normalizeApiKeyToken(fallbackApiKey);
}

function firstNonEmptyString(values = []) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return '';
}

function normalizeE164FromAny(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const source = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  const hasPlus = source.startsWith('+');
  const digits = source.replace(/\D/g, '');
  if (digits.length < 8) return '';
  return `${hasPlus ? '+' : '+'}${digits}`;
}

function normalizeE164FromCandidates(values = []) {
  let lidFallback = '';
  for (const value of values) {
    const raw = String(value ?? '').trim();
    if (!raw) continue;
    const normalized = normalizeE164FromAny(raw);
    if (!normalized) continue;
    if (raw.toLowerCase().includes('@lid')) {
      if (!lidFallback) {
        lidFallback = normalized;
      }
      continue;
    }
    return normalized;
  }
  return lidFallback;
}

function normalizeEvolutionEventType(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase().replace(/[.\s-]/g, '_');
  if (upper === 'MESSAGE_INBOUND' || upper === 'MESSAGES_UPSERT') return 'message.inbound';
  if (upper === 'MESSAGE_DELIVERY_UPDATE' || upper === 'MESSAGES_UPDATE') return 'message.delivery_update';
  if (upper === 'MESSAGE_READ_UPDATE') return 'message.read_update';
  if (upper === 'MESSAGE_FAILED') return 'message.failed';
  if (upper === 'CONNECTION_UPDATE') return 'connection.update';
  if (upper === 'QRCODE_UPDATED' || upper === 'QR_UPDATED') return 'qr.updated';
  return '';
}

function inferMessageTypeFromRawMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'object') return 'text';
  if (rawMessage.audioMessage) return 'audio';
  if (rawMessage.imageMessage) return 'image';
  if (rawMessage.documentMessage || rawMessage.videoMessage || rawMessage.stickerMessage) return 'file';
  return 'text';
}

function extractTextFromRawMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'object') return '';
  return firstNonEmptyString([
    rawMessage.conversation,
    rawMessage.extendedTextMessage?.text,
    rawMessage.imageMessage?.caption,
    rawMessage.videoMessage?.caption,
    rawMessage.documentMessage?.caption
  ]);
}

function normalizeEvolutionWebhookInput(rawBody) {
  const raw = rawBody && typeof rawBody === 'object' ? rawBody : null;
  if (!raw) return null;

  const data = raw.data && typeof raw.data === 'object' ? raw.data : {};
  const key = data.key && typeof data.key === 'object' ? data.key : {};
  const rawMessage = data.message && typeof data.message === 'object' ? data.message : {};
  const eventType = normalizeEvolutionEventType(
    firstNonEmptyString([raw.event_type, raw.event, raw.type, data.event])
  );
  if (!eventType) return null;

  const messageId = firstNonEmptyString([
    data.message_id,
    data.messageId,
    data.id,
    key.id,
    raw.message_id
  ]);
  if (!messageId) return null;

  const tenantId = firstNonEmptyString([raw.tenant_id, raw.tenantId, raw.instance, raw.instance_id]);
  if (!tenantId) return null;

  const fromE164 = normalizeE164FromCandidates([
    data.from_e164,
    data.from,
    data.sender,
    key.participantAlt,
    key.remoteJidAlt,
    data.remoteJidAlt,
    key.participant,
    key.remoteJid
  ]);
  const toE164 = normalizeE164FromCandidates([
    data.to_e164,
    data.to,
    data.recipient,
    key.remoteJidAlt,
    key.participantAlt,
    key.remoteJid,
    key.participant
  ]);
  const messageType = firstNonEmptyString([data.message_type, data.messageType])
    || inferMessageTypeFromRawMessage(rawMessage);
  const text = firstNonEmptyString([data.text, extractTextFromRawMessage(rawMessage)]);
  const deliveryState = firstNonEmptyString([data.delivery_state, data.status]).toLowerCase();

  return {
    event_id: firstNonEmptyString([raw.event_id, raw.eventId]) || randomUUID(),
    tenant_id: tenantId,
    provider: 'evolution-api',
    instance_id: firstNonEmptyString([raw.instance_id, raw.instance, raw.instanceName]) || tenantId,
    event_type: eventType,
    occurred_at: firstNonEmptyString([raw.occurred_at, raw.date_time, raw.dateTime]) || new Date().toISOString(),
    trace_id: firstNonEmptyString([raw.trace_id, raw.traceId]) || `trace-${randomUUID().slice(0, 12)}`,
    correlation_id: firstNonEmptyString([raw.correlation_id, raw.correlationId]) || randomUUID(),
    signature: firstNonEmptyString([raw.signature]) || 'evolution-raw',
    payload: {
      message_id: messageId,
      from_e164: fromE164 || undefined,
      to_e164: toE164 || undefined,
      message_type: ['text', 'audio', 'image', 'file'].includes(messageType) ? messageType : 'text',
      ...(text ? { text } : {}),
      ...(deliveryState && ['queued', 'sent', 'delivered', 'read', 'failed'].includes(deliveryState)
        ? { delivery_state: deliveryState }
        : {}),
      raw
    }
  };
}

function delayMs(ms) {
  const value = Number(ms);
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return new Promise((resolve) => setTimeout(resolve, safe));
}

function sanitizeProviderErrorDetails(error) {
  const raw = String(error?.message ?? error ?? '').trim();
  if (!raw) return 'provider_error';
  const masked = raw.replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***');
  const lowered = masked.toLowerCase();
  if (lowered.includes('incorrect api key') || lowered.includes('invalid_api_key')) {
    return 'openai_invalid_api_key';
  }
  if (lowered.includes('openai_not_configured')) {
    return 'openai_not_configured';
  }
  return masked.length > 220 ? `${masked.slice(0, 220)}...` : masked;
}

function extractEvolutionQrPayload(data) {
  const raw = data && typeof data === 'object' ? data : {};
  const nested = raw?.data && typeof raw.data === 'object' ? raw.data : raw?.result && typeof raw.result === 'object' ? raw.result : raw;
  const code = firstNonEmptyString([
    nested?.code,
    raw?.code,
    nested?.qr,
    nested?.qrCode,
    nested?.qr_code,
    nested?.qrcode,
    nested?.qrcode?.code,
    nested?.qrcode?.qr,
    nested?.qrcode?.value
  ]);

  const base64Image = firstNonEmptyString([
    nested?.base64,
    raw?.base64,
    nested?.qrcode?.base64
  ]);

  const pairingCode = firstNonEmptyString([
    nested?.pairingCode,
    raw?.pairingCode,
    nested?.pairing_code,
    raw?.pairing_code,
    nested?.pairCode,
    nested?.pair_code,
    nested?.qrcode?.pairingCode,
    nested?.qrcode?.pairing_code
  ]);

  const countValue = Number(nested?.count ?? raw?.count);
  const count = Number.isFinite(countValue) ? countValue : null;

  const connectionState = firstNonEmptyString([
    nested?.connectionState,
    raw?.connectionState,
    nested?.connection_state,
    raw?.connection_state,
    nested?.state,
    raw?.state,
    nested?.status,
    raw?.status,
    nested?.instance?.state,
    raw?.instance?.state,
    nested?.instance?.status,
    raw?.instance?.status
  ]).toLowerCase();

  return {
    code: code.length > 0 ? code : null,
    base64: base64Image.length > 0 ? base64Image : null,
    pairingCode: pairingCode.length > 0 ? pairingCode : null,
    count,
    connectionState: connectionState.length > 0 ? connectionState : null
  };
}

function stringOrFallback(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  return fallback;
}

function boolOrFallback(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function numberOrFallback(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function clampNumber(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeCrmAiMode(value, fallback = 'assist_execute') {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'suggest_only' || raw === 'assist_execute') return raw;
  return fallback;
}

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function truncateProviderErrorDetails(raw, maxLength = 220) {
  const details = String(raw ?? '').trim();
  if (!details) return 'provider_error';
  return details.length > maxLength ? `${details.slice(0, maxLength)}...` : details;
}

function normalizeEvolutionRecipientNumber(value) {
  const normalized = normalizeE164FromAny(value);
  if (!normalized) return '';
  return normalized.replace(/^\+/, '');
}

function extractEvolutionProviderMessageId(raw) {
  const payload = raw && typeof raw === 'object' ? raw : {};
  return firstNonEmptyString([
    payload?.key?.id,
    payload?.data?.key?.id,
    payload?.message_id,
    payload?.messageId,
    payload?.id,
    payload?.data?.id
  ]) || null;
}

async function sendEvolutionTextMessage({ baseUrl, apiKey, instanceId, number, text }) {
  const sanitizedBaseUrl = String(baseUrl ?? '').trim().replace(/\/$/, '');
  const sanitizedInstanceId = String(instanceId ?? '').trim();
  const sanitizedNumber = String(number ?? '').trim();
  const sanitizedText = String(text ?? '').trim();
  const url = `${sanitizedBaseUrl}/message/sendText/${encodeURIComponent(sanitizedInstanceId)}`;
  const headers = {
    apikey: String(apiKey ?? '').trim(),
    'content-type': 'application/json'
  };

  const attemptSend = async (payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const rawText = await response.text();
    let parsed = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }
    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        providerMessageId: extractEvolutionProviderMessageId(parsed),
        providerPayload: parsed
      };
    }
    return {
      ok: false,
      status: response.status,
      errorDetails: truncateProviderErrorDetails(rawText || parsed?.message || parsed?.error || '')
    };
  };

  const firstAttempt = await attemptSend({
    number: sanitizedNumber,
    text: sanitizedText
  });
  if (firstAttempt.ok) {
    return firstAttempt;
  }

  const secondAttempt = await attemptSend({
    number: sanitizedNumber,
    text: sanitizedText,
    textMessage: { text: sanitizedText }
  });
  if (secondAttempt.ok) {
    return {
      ...secondAttempt,
      fallbackPayloadUsed: true
    };
  }

  return {
    ok: false,
    status: secondAttempt.status || firstAttempt.status || 502,
    errorDetails: secondAttempt.errorDetails || firstAttempt.errorDetails || 'provider_send_error'
  };
}

function sanitizeTenantRuntimeConfigInput(rawConfig, fallbackConfig = null) {
  const raw = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const fallback = fallbackConfig && typeof fallbackConfig === 'object' ? fallbackConfig : {};

  const openaiRaw = raw.openai && typeof raw.openai === 'object' ? raw.openai : {};
  const openaiFallback = fallback.openai && typeof fallback.openai === 'object' ? fallback.openai : {};
  const personasRaw = raw.personas && typeof raw.personas === 'object' ? raw.personas : {};
  const personasFallback = fallback.personas && typeof fallback.personas === 'object' ? fallback.personas : {};
  const executionRaw = raw.execution && typeof raw.execution === 'object' ? raw.execution : {};
  const executionFallback = fallback.execution && typeof fallback.execution === 'object' ? fallback.execution : {};
  const integrationsRaw = raw.integrations && typeof raw.integrations === 'object' ? raw.integrations : {};
  const integrationsFallback =
    fallback.integrations && typeof fallback.integrations === 'object' ? fallback.integrations : {};
  const crmEvolutionRaw =
    integrationsRaw.crm_evolution && typeof integrationsRaw.crm_evolution === 'object'
      ? integrationsRaw.crm_evolution
      : {};
  const crmEvolutionFallback =
    integrationsFallback.crm_evolution && typeof integrationsFallback.crm_evolution === 'object'
      ? integrationsFallback.crm_evolution
      : {};

  const fallbackModel = stringOrFallback(openaiFallback.model, 'gpt-5-mini') || 'gpt-5-mini';
  const fallbackEvolutionInstance = stringOrFallback(crmEvolutionFallback.instance_id, 'fabio') || 'fabio';

  return {
    openai: {
      // Preserve existing tenant key when frontend sends config without api_key.
      api_key: normalizeApiKeyToken(
        Object.prototype.hasOwnProperty.call(openaiRaw, 'api_key')
          ? openaiRaw.api_key
          : openaiFallback.api_key
      ),
      model: stringOrFallback(openaiRaw.model, fallbackModel) || 'gpt-5-mini',
      vision_enabled: boolOrFallback(openaiRaw.vision_enabled, boolOrFallback(openaiFallback.vision_enabled, true)),
      voice_enabled: boolOrFallback(openaiRaw.voice_enabled, boolOrFallback(openaiFallback.voice_enabled, true)),
      image_generation_enabled: boolOrFallback(
        openaiRaw.image_generation_enabled,
        boolOrFallback(openaiFallback.image_generation_enabled, true)
      ),
      image_read_enabled: boolOrFallback(
        openaiRaw.image_read_enabled,
        boolOrFallback(openaiFallback.image_read_enabled, true)
      )
    },
    personas: {
      owner_concierge_prompt: stringOrFallback(
        personasRaw.owner_concierge_prompt,
        stringOrFallback(personasFallback.owner_concierge_prompt, '')
      ),
      whatsapp_agent_prompt: stringOrFallback(
        personasRaw.whatsapp_agent_prompt,
        stringOrFallback(personasFallback.whatsapp_agent_prompt, '')
      )
    },
    execution: {
      confirmations_enabled: boolOrFallback(
        executionRaw.confirmations_enabled,
        boolOrFallback(executionFallback.confirmations_enabled, false)
      ),
      whatsapp_ai_enabled: boolOrFallback(
        executionRaw.whatsapp_ai_enabled,
        boolOrFallback(executionFallback.whatsapp_ai_enabled, true)
      ),
      whatsapp_ai_mode: normalizeCrmAiMode(
        executionRaw.whatsapp_ai_mode,
        normalizeCrmAiMode(executionFallback.whatsapp_ai_mode, 'assist_execute')
      ),
      whatsapp_ai_min_confidence: clampNumber(
        numberOrFallback(
          executionRaw.whatsapp_ai_min_confidence,
          numberOrFallback(executionFallback.whatsapp_ai_min_confidence, 0.7)
        ),
        0,
        1
      )
    },
    integrations: {
      crm_evolution: {
        base_url: stringOrFallback(
          crmEvolutionRaw.base_url,
          stringOrFallback(crmEvolutionFallback.base_url, '')
        ),
        api_key: stringOrFallback(
          crmEvolutionRaw.api_key,
          stringOrFallback(crmEvolutionFallback.api_key, '')
        ),
        instance_id: stringOrFallback(crmEvolutionRaw.instance_id, fallbackEvolutionInstance) || 'fabio',
        auto_reply_enabled: boolOrFallback(
          crmEvolutionRaw.auto_reply_enabled,
          boolOrFallback(crmEvolutionFallback.auto_reply_enabled, false)
        ),
        auto_reply_use_ai: boolOrFallback(
          crmEvolutionRaw.auto_reply_use_ai,
          boolOrFallback(crmEvolutionFallback.auto_reply_use_ai, false)
        ),
        auto_reply_text: stringOrFallback(
          crmEvolutionRaw.auto_reply_text,
          stringOrFallback(
            crmEvolutionFallback.auto_reply_text,
            'Recebemos sua mensagem no WhatsApp. Em instantes retornaremos por aqui.'
          )
        )
      }
    }
  };
}

function validateTenantRuntimeConfigRequest(body) {
  const request = body?.request;
  const errors = [];

  if (!request || typeof request !== 'object') {
    errors.push({ instancePath: '/request', message: 'must be an object' });
    return { ok: false, errors };
  }

  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    errors.push({ instancePath: '/request/request_id', message: 'must be a non-empty string' });
  }

  if (typeof request.tenant_id !== 'string' || request.tenant_id.trim().length === 0) {
    errors.push({ instancePath: '/request/tenant_id', message: 'must be a non-empty string' });
  }

  if (!request.config || typeof request.config !== 'object' || Array.isArray(request.config)) {
    errors.push({ instancePath: '/request/config', message: 'must be an object' });
  }

  return { ok: errors.length === 0, errors };
}

function validateOwnerAudioTranscriptionRequest(body) {
  const request = body?.request;
  const errors = [];
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    errors.push({ instancePath: '/request', message: 'must be an object' });
    return { ok: false, errors };
  }

  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    errors.push({ instancePath: '/request/request_id', message: 'must be a non-empty string' });
  }
  if (typeof request.tenant_id !== 'string' || request.tenant_id.trim().length === 0) {
    errors.push({ instancePath: '/request/tenant_id', message: 'must be a non-empty string' });
  }
  if (typeof request.audio_base64 !== 'string' || request.audio_base64.trim().length === 0) {
    errors.push({ instancePath: '/request/audio_base64', message: 'must be a non-empty string' });
  }

  return { ok: errors.length === 0, errors };
}

function validateOwnerAudioSpeechRequest(body) {
  const request = body?.request;
  const errors = [];
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    errors.push({ instancePath: '/request', message: 'must be an object' });
    return { ok: false, errors };
  }

  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    errors.push({ instancePath: '/request/request_id', message: 'must be a non-empty string' });
  }
  if (typeof request.tenant_id !== 'string' || request.tenant_id.trim().length === 0) {
    errors.push({ instancePath: '/request/tenant_id', message: 'must be a non-empty string' });
  }
  if (typeof request.text !== 'string' || request.text.trim().length === 0) {
    errors.push({ instancePath: '/request/text', message: 'must be a non-empty string' });
  }

  return { ok: errors.length === 0, errors };
}

async function transcribeAudioWithOpenAi(input) {
  const startedAt = Date.now();
  const baseUrl = String(input.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const fileName = String(input.fileName ?? 'audio.webm').trim() || 'audio.webm';
  const mimeType = String(input.mimeType ?? 'audio/webm').trim() || 'audio/webm';
  const language = typeof input.language === 'string' ? input.language.trim() : '';
  const model = typeof input.model === 'string' && input.model.trim().length > 0
    ? input.model.trim()
    : 'whisper-1';

  let audioBytes;
  try {
    audioBytes = Buffer.from(String(input.audioBase64 ?? '').trim(), 'base64');
  } catch {
    throw new Error('invalid_audio_base64');
  }
  if (!audioBytes || audioBytes.length === 0) {
    throw new Error('invalid_audio_base64');
  }

  const formData = new FormData();
  formData.append('model', model);
  if (language.length > 0) {
    formData.append('language', language);
  }
  formData.append('file', new Blob([audioBytes], { type: mimeType }), fileName);

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`
    },
    body: formData
  });
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`openai_transcription_http_${response.status}:${raw.slice(0, 500)}`);
  }

  const body = await response.json();
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    throw new Error('openai_transcription_invalid_payload');
  }

  return {
    text,
    provider: 'openai',
    model: typeof body?.model === 'string' && body.model.trim().length > 0 ? body.model.trim() : model,
    latency_ms: Math.max(0, Date.now() - startedAt)
  };
}

function mimeTypeFromAudioFormat(format) {
  const normalized = String(format ?? '').toLowerCase();
  if (normalized === 'wav') return 'audio/wav';
  if (normalized === 'opus') return 'audio/ogg';
  if (normalized === 'aac') return 'audio/aac';
  if (normalized === 'flac') return 'audio/flac';
  if (normalized === 'pcm') return 'audio/wav';
  return 'audio/mpeg';
}

function parseSpeechSpeed(rawValue, fallback = 1.12) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0.25) return 0.25;
  if (parsed > 4) return 4;
  return parsed;
}

async function synthesizeSpeechWithOpenAi(input) {
  const startedAt = Date.now();
  const baseUrl = String(input.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = typeof input.model === 'string' && input.model.trim().length > 0
    ? input.model.trim()
    : 'gpt-4o-mini-tts';
  const voice = typeof input.voice === 'string' && input.voice.trim().length > 0
    ? input.voice.trim()
    : 'shimmer';
  const text = String(input.text ?? '').trim();
  if (!text) {
    throw new Error('speech_text_required');
  }
  const responseFormat = typeof input.responseFormat === 'string' && input.responseFormat.trim().length > 0
    ? input.responseFormat.trim().toLowerCase()
    : 'mp3';
  const speed = parseSpeechSpeed(input.speed);

  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: responseFormat,
      speed
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`openai_speech_http_${response.status}:${raw.slice(0, 500)}`);
  }

  const audioBytes = Buffer.from(await response.arrayBuffer());
  if (audioBytes.length === 0) {
    throw new Error('openai_speech_empty_audio');
  }

  const contentType = String(response.headers.get('content-type') ?? '').trim()
    || mimeTypeFromAudioFormat(responseFormat);

  return {
    audioBytes,
    contentType,
    provider: 'openai',
    model,
    voice,
    speed,
    latency_ms: Math.max(0, Date.now() - startedAt)
  };
}

function createRuntimeConfigSummary(tenantId, configRecord) {
  const normalized = sanitizeTenantRuntimeConfigInput(configRecord ?? {});
  const tenantApiKey = normalized.openai.api_key;
  const globalApiKey = normalizeApiKeyToken(process.env.OPENAI_API_KEY ?? '');
  const openaiConfigured = tenantApiKey.length > 0 || globalApiKey.length > 0;
  const ownerResponseMode = openaiConfigured ? 'openai' : 'auto';
  return {
    tenant_id: tenantId,
    status: 'ok',
    runtime: {
      owner_response_mode: ownerResponseMode,
      openai_configured: openaiConfigured,
      model: normalized.openai.model
    },
    openai: {
      api_key_configured: tenantApiKey.length > 0,
      vision_enabled: normalized.openai.vision_enabled,
      voice_enabled: normalized.openai.voice_enabled,
      image_generation_enabled: normalized.openai.image_generation_enabled,
      image_read_enabled: normalized.openai.image_read_enabled
    },
    personas: {
      owner_concierge_prompt: normalized.personas.owner_concierge_prompt,
      whatsapp_agent_prompt: normalized.personas.whatsapp_agent_prompt
    },
    execution: {
      confirmations_enabled: normalized.execution.confirmations_enabled,
      whatsapp_ai_enabled: normalized.execution.whatsapp_ai_enabled,
      whatsapp_ai_mode: normalized.execution.whatsapp_ai_mode,
      whatsapp_ai_min_confidence: normalized.execution.whatsapp_ai_min_confidence
    },
    integrations: {
      crm_evolution: {
        base_url: normalized.integrations.crm_evolution.base_url,
        api_key: normalized.integrations.crm_evolution.api_key ? '(configured)' : '',
        instance_id: normalized.integrations.crm_evolution.instance_id,
        auto_reply_enabled: normalized.integrations.crm_evolution.auto_reply_enabled === true,
        auto_reply_use_ai: normalized.integrations.crm_evolution.auto_reply_use_ai === true,
        auto_reply_text: normalized.integrations.crm_evolution.auto_reply_text
      }
    },
    updated_at: typeof configRecord?.updated_at === 'string' ? configRecord.updated_at : null
  };
}

function cleanShortText(value, maxLength = 500) {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength - 3)}...`;
}

function normalizeCrmAiTone(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'consultivo' || raw === 'direto' || raw === 'followup') return raw;
  return 'consultivo';
}

function parsePossibleJson(rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // no-op
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // no-op
    }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // no-op
    }
  }

  return null;
}

function resolveCrmAiRuntimeConfig(tenantRuntimeConfig) {
  const normalized = sanitizeTenantRuntimeConfigInput(tenantRuntimeConfig ?? {});
  return {
    enabled: normalized.execution.whatsapp_ai_enabled === true,
    mode: normalizeCrmAiMode(normalized.execution.whatsapp_ai_mode, 'assist_execute'),
    minConfidence: clampNumber(numberOrFallback(normalized.execution.whatsapp_ai_min_confidence, 0.7), 0, 1),
    prompt: cleanShortText(normalized.personas.whatsapp_agent_prompt, 12000)
  };
}

function buildCrmAiContextPack(conversation, lead, messages = []) {
  const sortedMessages = Array.isArray(messages) ? [...messages] : [];
  sortedMessages.sort((a, b) => String(a?.occurred_at ?? '').localeCompare(String(b?.occurred_at ?? '')));
  const recent = sortedMessages.slice(-12);
  const latestInbound = [...recent].reverse().find((item) => item?.direction === 'inbound') ?? null;
  const latestOutbound = [...recent].reverse().find((item) => item?.direction === 'outbound') ?? null;

  return {
    conversation_id: conversation?.conversation_id ?? '',
    contact_e164: conversation?.contact_e164 ?? '',
    display_name: conversation?.display_name ?? null,
    lead: lead
      ? {
        lead_id: lead.lead_id,
        stage: lead.stage,
        metadata: lead.metadata ?? {}
      }
      : null,
    latest_inbound_text: cleanShortText(latestInbound?.text ?? '', 1200),
    latest_outbound_text: cleanShortText(latestOutbound?.text ?? '', 1200),
    messages: recent.map((item) => ({
      direction: item.direction === 'outbound' ? 'outbound' : 'inbound',
      text: cleanShortText(item?.text ?? '', 600),
      occurred_at: item?.occurred_at ?? null,
      delivery_state: item?.delivery_state ?? 'unknown'
    }))
  };
}

function chooseHeuristicStage(currentStage, contextPack) {
  const transitions = listLeadStageTransitionsFrom(currentStage);
  const allowedTargets = new Set(transitions.map((item) => item.to));
  const latestText = String(contextPack?.latest_inbound_text ?? '').toLowerCase();

  if (!latestText || transitions.length === 0) {
    return {
      suggestedStage: currentStage,
      confidence: 0.45,
      reason: 'Sem evidencia suficiente na mensagem atual para avancar stage.'
    };
  }

  const targetIfAllowed = (stage) => (allowedTargets.has(stage) ? stage : null);
  const hasAny = (patterns) => patterns.some((pattern) => latestText.includes(pattern));

  let suggested = null;
  let confidence = 0.62;
  let reason = 'Sugestao baseada no conteudo da ultima mensagem inbound e no funil permitido.';

  if (hasAny(['nao tenho interesse', 'não tenho interesse', 'nao quero', 'cancelar', 'encerrar'])) {
    suggested = targetIfAllowed('lost') ?? targetIfAllowed('disqualified');
    confidence = 0.86;
    reason = 'Lead indicou desinteresse explicito; recomendado mover para encerramento.';
  } else if (hasAny(['fechar', 'aceito', 'aceitar', 'vamos contratar', 'pode emitir'])) {
    suggested = targetIfAllowed('won') ?? targetIfAllowed('negotiation') ?? targetIfAllowed('proposal');
    confidence = 0.84;
    reason = 'Mensagem indica intencao clara de fechamento.';
  } else if (hasAny(['desconto', 'condicao', 'condições', 'negociar', 'counter'])) {
    suggested = targetIfAllowed('negotiation') ?? targetIfAllowed('proposal');
    confidence = 0.79;
    reason = 'Lead trouxe objecao/contraproposta, sugerindo negociacao.';
  } else if (hasAny(['proposta', 'orcamento', 'orçamento', 'valor', 'preco', 'preço'])) {
    suggested = targetIfAllowed('proposal') ?? targetIfAllowed('qualified');
    confidence = 0.76;
    reason = 'Lead pediu detalhes comerciais e valor, indicando avancar para proposta.';
  } else if (hasAny(['quero', 'gostaria', 'tenho interesse', 'podemos conversar', 'como funciona'])) {
    suggested = targetIfAllowed('qualified') ?? targetIfAllowed('contacted');
    confidence = 0.72;
    reason = 'Lead demonstrou interesse ativo e abertura para qualificacao.';
  }

  if (!suggested) {
    suggested = transitions[0]?.to ?? currentStage;
    confidence = suggested === currentStage ? 0.45 : 0.6;
  }

  return {
    suggestedStage: suggested ?? currentStage,
    confidence: clampNumber(confidence, 0, 1),
    reason: cleanShortText(reason, 300)
  };
}

function buildHeuristicDraftReply(contextPack, tone = 'consultivo') {
  const latestInbound = String(contextPack?.latest_inbound_text ?? '').trim();
  const contactName = cleanShortText(contextPack?.display_name ?? '', 80);
  const salutation = contactName ? `Ola ${contactName}!` : 'Ola!';

  if (latestInbound.length === 0) {
    return {
      draftReply: `${salutation} Recebi sua mensagem e sigo a disposicao para ajudar com os proximos passos.`,
      confidence: 0.58,
      reasoningSummary: 'Sem texto inbound recente; usando resposta padrao de continuidade.'
    };
  }

  if (tone === 'direto') {
    return {
      draftReply: `${salutation} Obrigado pela mensagem. Posso te enviar agora uma proposta objetiva com valores e proximo passo?`,
      confidence: 0.68,
      reasoningSummary: 'Tom direto aplicado sobre a ultima interacao do lead.'
    };
  }

  if (tone === 'followup') {
    return {
      draftReply: `${salutation} Passando para dar continuidade ao seu atendimento. Quer que eu avance com a proxima etapa agora?`,
      confidence: 0.66,
      reasoningSummary: 'Tom de follow-up para reengajar o lead na thread ativa.'
    };
  }

  return {
    draftReply: `${salutation} Obrigado por compartilhar. Para te direcionar melhor, posso entender seu objetivo principal e prazo esperado?`,
    confidence: 0.7,
    reasoningSummary: 'Tom consultivo para qualificar intencao e prazo sem friccao.'
  };
}

function formatCrmAiMessageHistory(messages = []) {
  return messages
    .map((item) => {
      const who = item.direction === 'outbound' ? 'atendente' : 'lead';
      return `${who}: ${cleanShortText(item.text, 280)}`;
    })
    .join('\n');
}

async function generateCrmAiDraftReply({ provider, aiConfig, contextPack, tone }) {
  const normalizedTone = normalizeCrmAiTone(tone);
  const heuristic = buildHeuristicDraftReply(contextPack, normalizedTone);
  if (!provider) {
    return {
      ...heuristic,
      provider: 'local',
      model: null
    };
  }

  const messageHistory = formatCrmAiMessageHistory(contextPack.messages);
  const promptParts = [
    'Modo template SaaS neutro: nao cite marca/empresa especifica nem servicos fixos nao informados pelo usuario.',
    'Nao invente catalogo, links, CNPJ, preco ou prazo. Se faltar contexto, faca uma pergunta curta de esclarecimento.',
    `Tom desejado: ${normalizedTone}.`,
    `Stage atual: ${contextPack?.lead?.stage ?? 'new'}.`,
    `Historico:\n${messageHistory || '(sem historico)'}`,
    'Gere uma resposta curta para enviar agora no WhatsApp.',
    'Retorne apenas o texto final da resposta.'
  ];
  if (aiConfig.prompt) {
    promptParts.push(`Contexto extra do tenant:\n${aiConfig.prompt}`);
  }

  const payload = { text: promptParts.join('\n\n') };
  if (aiConfig.prompt) {
    payload.persona_overrides = { whatsapp_agent_prompt: aiConfig.prompt };
  }
  const reply = await provider.generateAssistantOutput(payload);

  if (reply?.provider !== 'openai') {
    return {
      ...heuristic,
      provider: reply?.provider ?? 'local',
      model: reply?.model ?? null
    };
  }

  const draft = cleanShortText(reply.text ?? '', 320);
  if (!draft) {
    return {
      ...heuristic,
      provider: 'openai',
      model: reply?.model ?? null
    };
  }

  return {
    draftReply: draft,
    confidence: 0.82,
    reasoningSummary: 'Resposta sugerida pela IA com contexto da thread e stage atual.',
    provider: 'openai',
    model: reply?.model ?? null
  };
}

async function generateCrmAiQualification({ provider, aiConfig, contextPack }) {
  const currentStage = String(contextPack?.lead?.stage ?? 'new').trim() || 'new';
  const heuristic = chooseHeuristicStage(currentStage, contextPack);
  const transitions = listLeadStageTransitionsFrom(currentStage);
  const transitionByTarget = new Map(transitions.map((item) => [item.to, item]));

  if (!provider) {
    return {
      currentStage,
      suggestedStage: heuristic.suggestedStage,
      confidence: heuristic.confidence,
      reason: heuristic.reason,
      requiredTrigger: transitionByTarget.get(heuristic.suggestedStage)?.trigger ?? null,
      provider: 'local',
      model: null
    };
  }

  const messageHistory = formatCrmAiMessageHistory(contextPack.messages);
  const allowedTargets = transitions.map((item) => item.to);
  const promptParts = [
    `Stage atual: ${currentStage}.`,
    `Stages permitidos: ${allowedTargets.length > 0 ? allowedTargets.join(', ') : '(nenhum)'}.`,
    `Historico:\n${messageHistory || '(sem historico)'}`,
    'Sugira o proximo stage com confianca entre 0 e 1.',
    'Retorne JSON estrito: {"suggested_stage":"...", "confidence":0.0, "reason":"..."}.'
  ];
  if (aiConfig.prompt) {
    promptParts.push(`Contexto extra do tenant:\n${aiConfig.prompt}`);
  }

  const payload = { text: promptParts.join('\n\n') };
  if (aiConfig.prompt) {
    payload.persona_overrides = { whatsapp_agent_prompt: aiConfig.prompt };
  }
  const output = await provider.generateAssistantOutput(payload);

  if (output?.provider !== 'openai') {
    return {
      currentStage,
      suggestedStage: heuristic.suggestedStage,
      confidence: heuristic.confidence,
      reason: heuristic.reason,
      requiredTrigger: transitionByTarget.get(heuristic.suggestedStage)?.trigger ?? null,
      provider: output?.provider ?? 'local',
      model: output?.model ?? null
    };
  }

  const parsed = parsePossibleJson(output.text);
  const suggestedFromAi = String(parsed?.suggested_stage ?? '').trim().toLowerCase();
  const candidate = transitionByTarget.get(suggestedFromAi);
  const numericConfidence = clampNumber(numberOrFallback(parsed?.confidence, heuristic.confidence), 0, 1);

  if (!candidate) {
    return {
      currentStage,
      suggestedStage: heuristic.suggestedStage,
      confidence: Math.min(numericConfidence, 0.74),
      reason: 'IA retornou stage nao permitido para a transicao atual; aplicado fallback seguro.',
      requiredTrigger: transitionByTarget.get(heuristic.suggestedStage)?.trigger ?? null,
      provider: 'openai',
      model: output?.model ?? null
    };
  }

  return {
    currentStage,
    suggestedStage: candidate.to,
    confidence: numericConfidence,
    reason: cleanShortText(parsed?.reason ?? 'Sugestao baseada em sinais da conversa recente.', 320),
    requiredTrigger: candidate.trigger,
    provider: 'openai',
    model: output?.model ?? null
  };
}

function resolveTenantExecutionPlan(taskPlan, tenantRuntimeConfig) {
  if (!taskPlan) return taskPlan;

  const hasExecutionOverride = (
    tenantRuntimeConfig &&
    tenantRuntimeConfig.execution &&
    typeof tenantRuntimeConfig.execution.confirmations_enabled === 'boolean'
  );
  const confirmationsEnabled = hasExecutionOverride &&
    tenantRuntimeConfig.execution.confirmations_enabled === true;
  if (!hasExecutionOverride || confirmationsEnabled || taskPlan.execution_decision !== 'confirm_required') {
    return taskPlan;
  }

  return {
    ...taskPlan,
    execution_decision: 'allow',
    requires_confirmation: false,
    policy_reason_code: 'tenant_runtime_confirmations_disabled'
  };
}

function createOwnerCommandEnvelope(request, correlationId, traceId, personaOverridesInput = undefined) {
  const mode = modeFromRequest(request);
  const text =
    request.operation === 'send_message'
      ? String(request.payload?.text ?? '')
      : `${request.operation}`;
  const attachments = Array.isArray(request.payload?.attachments)
    ? request.payload.attachments.map((item) => ({
      type: item.type,
      uri: item.uri
    }))
    : undefined;
  const personaOverrides = personaOverridesInput ?? sanitizePersonaOverrides(request.payload?.persona_overrides);

  const payload = {
    owner_command_id: request.request_id,
    text,
    mode
  };
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments;
  }
  if (personaOverrides) {
    payload.persona_overrides = personaOverrides;
  }

  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'command',
    command_id: randomUUID(),
    name: 'owner.command.create',
    tenant_id: request.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    created_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    actor: {
      actor_id: request.session_id,
      actor_type: 'owner',
      channel: request.channel
    },
    payload
  };
}

function createOwnerCommandCreatedEvent(ownerCommand) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'owner.command.created',
    tenant_id: ownerCommand.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: ownerCommand.correlation_id,
    causation_id: ownerCommand.command_id,
    trace_id: ownerCommand.trace_id,
    status: 'info',
    payload: {
      owner_command_id: ownerCommand.payload.owner_command_id,
      mode: ownerCommand.payload.mode
    }
  };
}

function createOwnerContextPromotedEvent(entry, correlationId, traceId, causationId) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'owner.context.promoted',
    tenant_id: entry.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    ...(causationId ? { causation_id: causationId } : {}),
    trace_id: traceId,
    status: 'info',
    payload: {
      memory_id: entry.memory_id,
      session_id: entry.session_id,
      status: 'promoted',
      salience_score: entry.salience_score
    }
  };
}

function createOwnerMemoryReembedMaintenanceEvent(name, tenantId, correlationId, traceId, payload) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name,
    tenant_id: tenantId,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    status: name === 'owner.memory.reembed.failed' ? 'failed' : (
      name === 'owner.memory.reembed.completed' ? 'completed' : 'info'
    ),
    payload
  };
}

function createModuleTaskCommand(request, ownerCommand, taskPlan) {
  if (!taskPlan) return null;
  const taskId = randomUUID();

  const command = {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'command',
    command_id: randomUUID(),
    name: 'module.task.create',
    tenant_id: request.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: taskPlan.target_module,
    created_at: new Date().toISOString(),
    correlation_id: ownerCommand.correlation_id,
    causation_id: ownerCommand.command_id,
    trace_id: ownerCommand.trace_id,
    actor: {
      actor_id: request.session_id,
      actor_type: 'owner',
      channel: request.channel
    },
    payload: {
      task_id: taskId,
      task_type: taskPlan.task_type,
      priority: taskPlan.priority,
      input: {
        request_id: request.request_id,
        session_id: request.session_id,
        text: String(request.payload?.text ?? ''),
        attachments_count: Array.isArray(request.payload?.attachments)
          ? request.payload.attachments.length
          : 0,
        planning_rule: taskPlan.rule_id
      }
    }
  };

  const personaOverrides = sanitizePersonaOverrides(ownerCommand.payload?.persona_overrides);
  if (personaOverrides) {
    command.payload.input.persona_overrides = personaOverrides;
  }

  return command;
}

function createPolicyDecision(taskPlan) {
  if (!taskPlan || typeof taskPlan !== 'object') {
    return {
      route_rule_id: null,
      policy_rule_id: null,
      execution_decision: 'none',
      requires_confirmation: false,
      reason_code: null
    };
  }

  return {
    route_rule_id: taskPlan.rule_id ?? null,
    policy_rule_id: taskPlan.policy_rule_id ?? null,
    execution_decision: taskPlan.execution_decision ?? 'none',
    requires_confirmation: taskPlan.requires_confirmation === true,
    reason_code: taskPlan.policy_reason_code ?? null
  };
}

function createConfirmationSummary(record) {
  if (!record) return undefined;
  return {
    confirmation_id: record.confirmation_id,
    status: record.status,
    task_type: record.task_plan_ref?.task_type ?? 'unknown.task',
    target_module: record.task_plan_ref?.target_module ?? 'mod-02-whatsapp-crm',
    reason_code: record.reason_code ?? null,
    created_at: record.created_at,
    resolved_at: record.resolved_at ?? null
  };
}

function createOwnerConfirmationRequestedEvent(record) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'owner.confirmation.requested',
    tenant_id: record.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: record.owner_command_ref.correlation_id,
    causation_id: record.owner_command_ref.command_id,
    trace_id: record.owner_command_ref.trace_id,
    status: 'info',
    payload: {
      confirmation_id: record.confirmation_id,
      task_type: record.task_plan_ref.task_type,
      target_module: record.task_plan_ref.target_module,
      reason_code: record.reason_code ?? null
    }
  };
}

function createOwnerConfirmationApprovedEvent(record, moduleTaskCommand) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'owner.confirmation.approved',
    tenant_id: record.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: record.owner_command_ref.correlation_id,
    causation_id: record.owner_command_ref.command_id,
    trace_id: record.owner_command_ref.trace_id,
    status: 'accepted',
    payload: {
      confirmation_id: record.confirmation_id,
      task_id: moduleTaskCommand.payload.task_id,
      task_type: moduleTaskCommand.payload.task_type,
      target_module: moduleTaskCommand.target_module
    }
  };
}

function createOwnerConfirmationRejectedEvent(record) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'owner.confirmation.rejected',
    tenant_id: record.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: record.owner_command_ref.correlation_id,
    causation_id: record.owner_command_ref.command_id,
    trace_id: record.owner_command_ref.trace_id,
    status: 'info',
    payload: {
      confirmation_id: record.confirmation_id,
      task_type: record.task_plan_ref.task_type,
      target_module: record.task_plan_ref.target_module,
      reason_code: record.reason_code ?? null
    }
  };
}

function createModuleTaskCommandFromConfirmation(record, actorSessionId) {
  const taskId = randomUUID();
  const snapshot = record.request_snapshot ?? {};
  const command = {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'command',
    command_id: randomUUID(),
    name: 'module.task.create',
    tenant_id: record.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: record.task_plan_ref.target_module,
    created_at: new Date().toISOString(),
    correlation_id: record.owner_command_ref.correlation_id,
    causation_id: record.owner_command_ref.command_id,
    trace_id: record.owner_command_ref.trace_id,
    actor: {
      actor_id: actorSessionId,
      actor_type: 'owner',
      channel: snapshot.channel ?? 'ui-chat'
    },
    payload: {
      task_id: taskId,
      task_type: record.task_plan_ref.task_type,
      priority: record.task_plan_ref.priority,
      input: {
        request_id: snapshot.request_id,
        session_id: snapshot.session_id,
        text: snapshot.text ?? '',
        attachments_count: Number(snapshot.attachments_count ?? 0),
        planning_rule: record.task_plan_ref.route_rule_id ?? 'confirmation_resume'
      }
    }
  };

  if (snapshot.persona_overrides) {
    command.payload.input.persona_overrides = snapshot.persona_overrides;
  }

  return command;
}

function createModuleTaskCreatedEvent(moduleTaskCommand) {
  const targetModule = moduleTaskCommand.target_module;
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'module.task.created',
    tenant_id: moduleTaskCommand.tenant_id,
    source_module: 'mod-01-owner-concierge',
    target_module: targetModule,
    emitted_at: new Date().toISOString(),
    correlation_id: moduleTaskCommand.correlation_id,
    causation_id: moduleTaskCommand.command_id,
    trace_id: moduleTaskCommand.trace_id,
    payload: {
      task_id: moduleTaskCommand.payload.task_id,
      task_type: moduleTaskCommand.payload.task_type,
      target_module: targetModule
    }
  };
}

function createModuleTaskAcceptedEvent(queueItem) {
  const command = queueItem.command;
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'module.task.accepted',
    tenant_id: command.tenant_id,
    source_module: command.target_module,
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: command.correlation_id,
    causation_id: command.command_id,
    trace_id: command.trace_id,
    status: 'accepted',
    payload: {
      task_id: command.payload.task_id,
      accepted_by: `${command.target_module}-worker`
    }
  };
}

function createModuleTaskTerminalEvent(queueItem) {
  const command = queueItem.command;
  const common = {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    tenant_id: command.tenant_id,
    source_module: command.target_module,
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: command.correlation_id,
    causation_id: command.command_id,
    trace_id: command.trace_id
  };

  if (queueItem.simulate_failure) {
    return {
      ...common,
      event_id: randomUUID(),
      name: 'module.task.failed',
      status: 'failed',
      payload: {
        task_id: command.payload.task_id,
        error_code: 'SIMULATED_FAILURE',
        error_message: 'Simulated downstream task failure',
        retryable: true
      }
    };
  }

  return {
    ...common,
    event_id: randomUUID(),
    name: 'module.task.completed',
    status: 'completed',
    payload: {
      task_id: command.payload.task_id,
      result_summary: 'Task executed in runtime worker stub.',
      output_ref: `memory://task/${command.payload.task_id}`
    }
  };
}

function createMemoryEpisodeCreatedEvent(tenantId, sessionId, turnCount, causationId, summary = null) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'memory.episode.created',
    tenant_id: tenantId,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: randomUUID(),
    causation_id: causationId,
    trace_id: randomUUID().slice(0, 8),
    status: 'info',
    payload: {
      tenant_id: tenantId,
      session_id: sessionId,
      turn_count: turnCount,
      summary: summary ?? null
    }
  };
}

function createMemoryPromotedFromEpisodeEvent(tenantId, sessionId, turnCount, memoryId, episodeEventId = null) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'memory.promoted.from_episode',
    tenant_id: tenantId,
    source_module: 'mod-01-owner-concierge',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: randomUUID(),
    trace_id: randomUUID().slice(0, 8),
    status: 'info',
    payload: {
      tenant_id: tenantId,
      session_id: sessionId,
      turn_count: turnCount,
      memory_id: memoryId,
      episode_event_id: episodeEventId ?? null
    }
  };
}

function createCrmDelegationEvent(queueItem, terminalEvent) {
  const command = queueItem.command;
  if (command.target_module !== 'mod-02-whatsapp-crm') return null;
  const base = {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    tenant_id: command.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: command.correlation_id,
    causation_id: command.command_id,
    trace_id: command.trace_id,
    payload: { task_id: command.payload.task_id }
  };
  if (terminalEvent.name === 'module.task.completed') {
    return {
      ...base,
      name: 'crm.delegation.sent',
      status: 'completed',
      payload: {
        ...base.payload,
        result_summary: terminalEvent.payload?.result_summary ?? 'Delegation executed.'
      }
    };
  }
  return {
    ...base,
    name: 'crm.delegation.failed',
    status: 'failed',
    payload: {
      ...base.payload,
      error_code: terminalEvent.payload?.error_code ?? 'DELEGATION_FAILED',
      retryable: Boolean(terminalEvent.payload?.retryable)
    }
  };
}

function actorFromCustomerSourceModule(sourceModule) {
  if (sourceModule === 'mod-02-whatsapp-crm') {
    return {
      actor_type: 'agent',
      channel: 'whatsapp'
    };
  }

  return {
    actor_type: 'owner',
    channel: 'ui-chat'
  };
}

function createCustomerUpsertCommandEnvelope(request, customerId, correlationId, traceId) {
  const actor = actorFromCustomerSourceModule(request.source_module);
  const payload = mapCustomerCreateRequestToCommandPayload(request, customerId);
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'command',
    command_id: randomUUID(),
    name: 'customer.record.upsert',
    tenant_id: request.tenant_id,
    source_module: request.source_module,
    target_module: 'mod-03-clientes',
    created_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    actor: {
      actor_id: request.request_id,
      actor_type: actor.actor_type,
      channel: actor.channel
    },
    payload
  };
}

function createCustomerLifecycleEvent(command, customer, action) {
  const eventName = action === 'updated' ? 'customer.updated' : 'customer.created';
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: eventName,
    tenant_id: command.tenant_id,
    source_module: 'mod-03-clientes',
    target_module: command.source_module,
    emitted_at: new Date().toISOString(),
    correlation_id: command.correlation_id,
    causation_id: command.command_id,
    trace_id: command.trace_id,
    status: 'info',
    payload: {
      customer_id: customer.customer_id,
      origin: customer.origin,
      status: customer.status,
      external_key: customer.external_key ?? null,
      source_module: command.source_module
    }
  };
}

function createAgendaReminderDispatchCommand(reminder, correlationId, traceId) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'command',
    command_id: randomUUID(),
    name: 'agenda.reminder.dispatch.request',
    tenant_id: reminder.tenant_id,
    source_module: 'mod-04-agenda',
    target_module: 'mod-02-whatsapp-crm',
    created_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    actor: {
      actor_id: reminder.reminder_id,
      actor_type: 'system',
      channel: 'scheduler'
    },
    payload: {
      reminder_id: reminder.reminder_id,
      appointment_id: reminder.appointment_id,
      schedule_at: reminder.schedule_at,
      phone_e164: reminder.recipient?.phone_e164,
      message: reminder.message
    }
  };
}

function createAgendaReminderEvent(eventName, reminder, correlationId, traceId, causationId, extras = {}) {
  const statusMap = {
    'agenda.reminder.scheduled': 'info',
    'agenda.reminder.sent': 'completed',
    'agenda.reminder.failed': 'failed',
    'agenda.reminder.canceled': 'info'
  };

  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: eventName,
    tenant_id: reminder.tenant_id,
    source_module: 'mod-04-agenda',
    target_module: reminder.channel === 'whatsapp' ? 'mod-02-whatsapp-crm' : 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    ...(causationId ? { causation_id: causationId } : {}),
    trace_id: traceId,
    status: statusMap[eventName],
    payload: {
      reminder_id: reminder.reminder_id,
      appointment_id: reminder.appointment_id,
      target_channel: reminder.channel,
      ...(eventName === 'agenda.reminder.scheduled' ? { schedule_at: reminder.schedule_at } : {}),
      ...(extras.dispatch_command_id !== undefined
        ? { dispatch_command_id: extras.dispatch_command_id }
        : {}),
      ...(extras.error_code ? { error_code: extras.error_code } : {})
    }
  };
}

function createBillingCollectionDispatchCommand(charge, collection, correlationId, traceId) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'command',
    command_id: randomUUID(),
    name: 'billing.collection.dispatch.request',
    tenant_id: charge.tenant_id,
    source_module: 'mod-05-faturamento-cobranca',
    target_module: 'mod-02-whatsapp-crm',
    created_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    actor: {
      actor_id: charge.charge_id,
      actor_type: 'system',
      channel: 'billing'
    },
    payload: {
      charge_id: charge.charge_id,
      customer_id: charge.customer_id,
      amount: charge.amount,
      currency: charge.currency,
      channel: 'whatsapp',
      phone_e164: collection.recipient.phone_e164,
      message: collection.message
    }
  };
}

function createBillingEvent(eventName, charge, correlationId, traceId, causationId, extraPayload = {}) {
  const basePayload = {
    charge_id: charge.charge_id
  };
  if (eventName === 'billing.charge.created') {
    basePayload.customer_id = charge.customer_id;
    basePayload.amount = charge.amount;
    basePayload.currency = charge.currency;
  }
  if (eventName === 'billing.collection.requested') {
    basePayload.channel = 'whatsapp';
  }

  const statusMap = {
    'billing.charge.created': 'info',
    'billing.collection.requested': 'info',
    'billing.payment.confirmed': 'completed'
  };

  const targetModuleMap = {
    'billing.charge.created': 'mod-01-owner-concierge',
    'billing.collection.requested': 'mod-02-whatsapp-crm',
    'billing.payment.confirmed': 'mod-01-owner-concierge'
  };

  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: eventName,
    tenant_id: charge.tenant_id,
    source_module: 'mod-05-faturamento-cobranca',
    target_module: targetModuleMap[eventName],
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    ...(causationId ? { causation_id: causationId } : {}),
    trace_id: traceId,
    status: statusMap[eventName],
    payload: {
      ...basePayload,
      ...extraPayload
    }
  };
}

function createCrmLeadCreatedEvent(lead, correlationId, traceId) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'crm.lead.created',
    tenant_id: lead.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    status: 'info',
    payload: {
      lead_id: lead.lead_id,
      source_channel: lead.source_channel,
      phone_e164: lead.phone_e164,
      stage: normalizeLeadStageForPublicEvent(lead.stage)
    }
  };
}

function createCrmCampaignCreatedEvent(campaign, correlationId, traceId) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'crm.campaign.created',
    tenant_id: campaign.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    trace_id: traceId,
    status: 'info',
    payload: {
      campaign_id: campaign.campaign_id,
      channel: campaign.channel,
      state: campaign.state,
      scheduled_at: campaign.scheduled_at
    }
  };
}

function createCrmCampaignStateChangedEvent(
  campaign,
  previousState,
  correlationId,
  traceId,
  causationId
) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'crm.campaign.state.changed',
    tenant_id: campaign.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    ...(causationId ? { causation_id: causationId } : {}),
    trace_id: traceId,
    status: 'info',
    payload: {
      campaign_id: campaign.campaign_id,
      from_state: previousState,
      to_state: campaign.state
    }
  };
}

function createCrmFollowupEvent(
  eventName,
  followup,
  correlationId,
  traceId,
  causationId,
  extraPayload = {}
) {
  const statusMap = {
    'crm.followup.scheduled': 'info',
    'crm.followup.sent': 'completed',
    'crm.followup.failed': 'failed'
  };

  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: eventName,
    tenant_id: followup.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-01-owner-concierge',
    emitted_at: new Date().toISOString(),
    correlation_id: correlationId,
    ...(causationId ? { causation_id: causationId } : {}),
    trace_id: traceId,
    status: statusMap[eventName],
    payload: {
      followup_id: followup.followup_id,
      campaign_id: followup.campaign_id,
      channel: followup.channel,
      schedule_at: followup.schedule_at,
      phone_e164: followup.phone_e164,
      ...extraPayload
    }
  };
}

function createBillingCollectionSentEvent(command) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'billing.collection.sent',
    tenant_id: command.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-05-faturamento-cobranca',
    emitted_at: new Date().toISOString(),
    correlation_id: command.correlation_id,
    causation_id: command.command_id,
    trace_id: command.trace_id,
    payload: {
      charge_id: command.payload.charge_id,
      message_id: `msg-${randomUUID()}`,
      sent_at: new Date().toISOString()
    }
  };
}

function createBillingCollectionFailedEvent(command, errorCode = 'DISPATCH_FAILED', retryable = true) {
  return {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    event_id: randomUUID(),
    name: 'billing.collection.failed',
    tenant_id: command.tenant_id,
    source_module: 'mod-02-whatsapp-crm',
    target_module: 'mod-05-faturamento-cobranca',
    emitted_at: new Date().toISOString(),
    correlation_id: command.correlation_id,
    causation_id: command.command_id,
    trace_id: command.trace_id,
    status: 'failed',
    payload: {
      charge_id: command.payload.charge_id,
      error_code: errorCode,
      retryable
    }
  };
}

async function persistCommandSafely(store, command) {
  try {
    await store.appendCommand(command);
    return null;
  } catch (error) {
    return error;
  }
}

async function persistEventSafely(store, event) {
  try {
    await store.appendEvent(event);
    return null;
  } catch (error) {
    return error;
  }
}

async function validateAndPersistEvent(store, event) {
  const validation = orchestrationEventValid(event);
  if (!validation.ok) {
    return { ok: false, type: 'contract_generation_error', details: validation.errors };
  }

  const storageError = await persistEventSafely(store, event);
  if (storageError) {
    return {
      ok: false,
      type: 'storage_error',
      details: String(storageError.message ?? storageError)
    };
  }

  return { ok: true };
}

function orchestrationInfo(store, policyPath, executionPolicyPath) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null,
      queue_file: null,
      policy_path: policyPath,
      execution_policy_path: executionPolicyPath
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir,
    queue_file: store.queueFilePath,
    policy_path: policyPath,
    execution_policy_path: executionPolicyPath
  };
}

function customerInfo(store) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir
  };
}

function agendaInfo(store) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir
  };
}

function billingInfo(store) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir
  };
}

function leadInfo(store) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir
  };
}

function crmAutomationInfo(store) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir
  };
}

function crmConversationInfo(store) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir
  };
}

function ownerMemoryInfo(store, embeddingProvider) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null,
      embedding_mode: embeddingProvider.mode
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir,
    embedding_mode: embeddingProvider.mode
  };
}

function ownerMemoryMaintenanceInfo(store) {
  if (store?.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null,
      schedules_path: null
    };
  }

  return {
    backend: 'file',
    storage_dir: store?.storageDir ?? null,
    schedules_path: store?.schedulesFilePath ?? null
  };
}

function tenantRuntimeConfigInfo(store) {
  return {
    backend: store?.backend ?? 'file',
    storage_dir: store?.storageDir ?? null,
    config_path: store?.configFilePath ?? null
  };
}

function ownerResponseInfo(provider) {
  return {
    mode: provider?.mode ?? 'auto',
    openai_available: provider?.canUseOpenAi === true
  };
}

function ownerConfirmationInfo(config) {
  return {
    max_pending_per_tenant: config.maxPendingPerTenant,
    ttl_seconds: config.ttlSeconds
  };
}

function parseMaintenanceEmbeddingMode(value) {
  if (value == null) return null;
  const mode = String(value).toLowerCase();
  if (mode === 'auto' || mode === 'openai' || mode === 'local' || mode === 'off') {
    return mode;
  }
  return null;
}

function parseMaintenanceLimit(value, fallback = 50) {
  const requested = Number(value ?? fallback);
  if (Number.isFinite(requested) && requested > 0) {
    return Math.min(Math.floor(requested), 500);
  }
  return fallback;
}

function parseMaintenanceConcurrency(value, fallback = 1) {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(Math.floor(parsed), 20);
}

function parseMaintenanceLockTtlSeconds(value, fallback = 120) {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 30 || parsed > 3600) {
    return null;
  }
  return Math.floor(parsed);
}

function parseMaintenanceRunsLimit(value, fallback = 50) {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(Math.floor(parsed), 200);
}

function parseConfirmationStatusFilter(value) {
  if (value == null || value === '') return 'all';
  const normalized = String(value).toLowerCase();
  if (normalized === 'all' || normalized === 'pending' || normalized === 'approved' || normalized === 'rejected') {
    return normalized;
  }
  return null;
}

function parseConfirmationListLimit(value, fallback = 50) {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(Math.floor(parsed), 200);
}

function parseConfirmationMaxPending(value, fallback = 20) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), 500);
}

function parseConfirmationTtlSeconds(value, fallback = 900) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), 7 * 24 * 3600);
}

function isConfirmationExpired(record, ttlSeconds) {
  const createdAtMs = Date.parse(record.created_at);
  if (!Number.isFinite(createdAtMs)) return false;
  const nowMs = Date.now();
  return nowMs - createdAtMs > ttlSeconds * 1000;
}

export function createApp(options = {}) {
  const backend = options.orchestrationBackend;
  const pgConnectionString = options.orchestrationPgDsn;
  const pgSchema = options.orchestrationPgSchema;
  const pgAutoMigrate = options.orchestrationPgAutoMigrate;

  const store = createOrchestrationStore({
    backend,
    storageDir: options.orchestrationStorageDir ?? options.storageDir,
    logLimit: options.orchestrationLogLimit ?? ORCHESTRATION_LOG_LIMIT,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const customerStore = createCustomerStore({
    backend,
    storageDir: options.customerStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const agendaStore = createAgendaStore({
    backend,
    storageDir: options.agendaStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const billingStore = createBillingStore({
    backend,
    storageDir: options.billingStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const leadStore = createLeadStore({
    backend,
    storageDir: options.leadStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const crmAutomationStore = createCrmAutomationStore({
    backend,
    storageDir: options.crmAutomationStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const crmConversationStore = createCrmConversationStore({
    backend,
    storageDir: options.crmConversationStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const ownerMemoryStore = createOwnerMemoryStore({
    backend,
    storageDir: options.ownerMemoryStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const ownerMemoryMaintenanceStore = createOwnerMemoryMaintenanceStore({
    backend,
    storageDir: options.ownerMemoryMaintenanceStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const tenantRuntimeConfigStore = createTenantRuntimeConfigStore({
    storageDir: options.tenantRuntimeConfigStorageDir ?? options.orchestrationStorageDir
  });
  const shortMemoryStore = createOwnerShortMemoryStore({
    storageDir: options.ownerShortMemoryStorageDir ?? options.orchestrationStorageDir,
    maxTurnsPerSession: options.ownerShortMemoryMaxTurns ?? 20
  });
  const episodeStore = createOwnerEpisodeStore({
    storageDir: options.ownerEpisodeStorageDir ?? options.orchestrationStorageDir,
    maxEpisodesPerTenant: options.ownerEpisodeMaxPerTenant ?? 500
  });
  const ownerEmbeddingProviderConfig = {
    mode: options.ownerEmbeddingMode,
    openaiApiKey: normalizeApiKeyToken(options.openaiApiKey ?? process.env.OPENAI_API_KEY ?? ''),
    openaiModel: options.ownerEmbeddingModel,
    openaiBaseUrl: options.openaiBaseUrl
  };
  const ownerEmbeddingProvider = createEmbeddingProvider(ownerEmbeddingProviderConfig);
  const ownerResponseProviderConfig = {
    mode: options.ownerResponseMode,
    openaiApiKey: normalizeApiKeyToken(options.openaiApiKey ?? process.env.OPENAI_API_KEY ?? ''),
    openaiModel: options.ownerResponseModel,
    openaiBaseUrl: options.openaiBaseUrl
  };
  const ownerResponseProvider = createOwnerResponseProvider(ownerResponseProviderConfig);
  async function resolveTenantRuntimeConfig(tenantId) {
    const normalizedTenantId = String(tenantId ?? '').trim();
    if (!normalizedTenantId) return null;
    return tenantRuntimeConfigStore.getTenantRuntimeConfig(normalizedTenantId);
  }

  async function resolveEvolutionRuntimeConfig(tenantId) {
    const normalizedTenantId = String(tenantId ?? '').trim();
    let tenantConfig = null;
    if (normalizedTenantId) {
      try {
        tenantConfig = await resolveTenantRuntimeConfig(normalizedTenantId);
      } catch {
        tenantConfig = null;
      }
    }

    const evolutionConfig =
      tenantConfig?.integrations?.crm_evolution && typeof tenantConfig.integrations.crm_evolution === 'object'
        ? tenantConfig.integrations.crm_evolution
        : {};

    let baseUrl = String(evolutionConfig.base_url ?? '').trim();
    let apiKey = String(evolutionConfig.api_key ?? '').trim();
    let instanceId = String(evolutionConfig.instance_id ?? '').trim();
    if (!baseUrl || !apiKey || !instanceId) {
      baseUrl = String(process.env.EVOLUTION_HTTP_BASE_URL ?? options.evolutionHttpBaseUrl ?? '').trim();
      apiKey = String(process.env.EVOLUTION_API_KEY ?? options.evolutionApiKey ?? '').trim();
      instanceId = String(process.env.EVOLUTION_INSTANCE_ID ?? options.evolutionInstanceId ?? 'fabio').trim() || 'fabio';
    }

    const autoReplyEnabled = parseBooleanFlag(
      evolutionConfig.auto_reply_enabled ?? process.env.EVOLUTION_AUTO_REPLY_ENABLED ?? options.evolutionAutoReplyEnabled,
      false
    );
    const autoReplyUseAi = parseBooleanFlag(
      evolutionConfig.auto_reply_use_ai ?? process.env.EVOLUTION_AUTO_REPLY_USE_AI ?? options.evolutionAutoReplyUseAi,
      false
    );
    const autoReplyText = firstNonEmptyString([
      evolutionConfig.auto_reply_text,
      process.env.EVOLUTION_AUTO_REPLY_TEXT,
      options.evolutionAutoReplyText,
      'Recebemos sua mensagem no WhatsApp. Em instantes retornaremos por aqui.'
    ]);

    return {
      tenantId: normalizedTenantId,
      baseUrl,
      apiKey,
      instanceId,
      autoReplyEnabled,
      autoReplyUseAi,
      autoReplyText
    };
  }

  function getOwnerResponseProviderForTenant(tenantRuntimeConfig) {
    const tenantApiKey = String(tenantRuntimeConfig?.openai?.api_key ?? '').trim();
    const tenantModel = String(tenantRuntimeConfig?.openai?.model ?? '').trim();

    if (tenantApiKey.length === 0 && tenantModel.length === 0) {
      return ownerResponseProvider;
    }

    return createOwnerResponseProvider({
      ...ownerResponseProviderConfig,
      mode: tenantApiKey.length > 0 ? 'openai' : ownerResponseProvider.mode,
      openaiApiKey: tenantApiKey.length > 0
        ? tenantApiKey
        : ownerResponseProviderConfig.openaiApiKey,
      openaiModel: tenantModel.length > 0
        ? tenantModel
        : ownerResponseProviderConfig.openaiModel
    });
  }

  const crmAiExecutionCache = new Map();
  const crmAiAuditLog = [];

  function makeCrmAiExecutionKey({ tenantId, conversationId, action, clientRequestId }) {
    return [
      String(tenantId ?? '').trim(),
      String(conversationId ?? '').trim(),
      String(action ?? '').trim(),
      String(clientRequestId ?? '').trim()
    ].join('|');
  }

  function appendCrmAiAudit(entry) {
    crmAiAuditLog.push({
      at: new Date().toISOString(),
      ...entry
    });
    if (crmAiAuditLog.length > 1000) {
      crmAiAuditLog.splice(0, crmAiAuditLog.length - 1000);
    }
  }

  async function resolveCrmThreadContext(tenantId, conversationId) {
    const conversation = await crmConversationStore.getConversationById(tenantId, conversationId);
    if (!conversation) {
      return {
        ok: false,
        code: 'conversation_not_found'
      };
    }

    const messages = await crmConversationStore.listMessages(tenantId, conversationId, { limit: 200 });
    const leads = await leadStore.listLeads(tenantId);
    const leadById = new Map(leads.map((item) => [item.lead_id, item]));
    const leadByPhone = new Map(leads.map((item) => [item.phone_e164, item]));
    const linkedLead = (
      (conversation.lead_id ? leadById.get(conversation.lead_id) : null)
      ?? leadByPhone.get(conversation.contact_e164)
      ?? null
    );

    return {
      ok: true,
      conversation,
      messages,
      lead: linkedLead
    };
  }

  function getOwnerEmbeddingProvider(modeOverride = null) {
    if (!modeOverride) {
      return ownerEmbeddingProvider;
    }
    return createEmbeddingProvider({
      ...ownerEmbeddingProviderConfig,
      mode: modeOverride
    });
  }
  const taskPlanner = createTaskPlanner({
    policyPath: options.taskRoutingPolicyPath,
    executionPolicyPath: options.taskExecutionPolicyPath
  });

  const LIST_LIMIT = 20;
  async function buildOperationalContextForOwner(tenantId, userText) {
    const t = String(userText ?? '').toLowerCase().trim();
    if (t.length < 2) return null;
    const parts = [];
    const wantClientes = /\b(clientes?|lista de clientes|quantos clientes|cadastro de clientes)\b/.test(t) || (/\b(listar|mostre|quais|o que tem)\b/.test(t) && /\b(cliente|contato)\b/.test(t));
    const wantAgenda = /\b(agenda|lembretes?|compromissos?|reuni[oó]es?)\b/.test(t) || (/\b(listar|mostre|quais|o que tem)\b/.test(t) && /\b(agenda|lembrete)\b/.test(t));
    const wantLeads = /\b(leads?|crm|qualifica[cç][aã]o)\b/.test(t) || (/\b(listar|mostre|quais|o que tem)\b/.test(t) && /\b(lead|crm)\b/.test(t));
    const wantCobranca = /\b(cobran[cç]as?|faturas?|faturamento|pagamentos?)\b/.test(t) || (/\b(listar|mostre|quais|o que tem)\b/.test(t) && /\b(cobrança|fatura)\b/.test(t));
    const wantAny = /\b(listar|mostre|quais|o que tem|navegar|saber o que|entender)\b/.test(t) && (wantClientes || wantAgenda || wantLeads || wantCobranca);
    if (!wantClientes && !wantAgenda && !wantLeads && !wantCobranca && !wantAny) return null;
    try {
      if (wantClientes || wantAny) {
        const raw = await customerStore.listCustomers(tenantId);
        const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const list = items.slice(0, LIST_LIMIT).map((c) => `${c.full_name ?? c.customer_id}${c.phone_e164 ? ` (${c.phone_e164})` : ''}`);
        parts.push(`Clientes (${items.length}): ${list.length ? list.join('; ') : 'nenhum cadastrado'}.`);
      }
      if (wantLeads || wantAny) {
        const raw = await leadStore.listLeads(tenantId);
        const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const list = items.slice(0, LIST_LIMIT).map((l) => `${(l.lead_id ?? '').slice(0, 8)} ${l.stage ?? '?'}`);
        parts.push(`Leads CRM (${items.length}): ${list.length ? list.join('; ') : 'nenhum'}.`);
      }
      if (wantAgenda || wantAny) {
        const raw = await agendaStore.listReminders(tenantId);
        const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const list = items.slice(0, LIST_LIMIT).map((r) => `${r.title ?? (r.reminder_id ?? '').slice(0, 8)} ${r.schedule_at ?? ''}`).filter(Boolean);
        parts.push(`Lembretes agenda (${items.length}): ${list.length ? list.join('; ') : 'nenhum'}.`);
      }
      if (wantCobranca || wantAny) {
        const raw = await billingStore.listCharges(tenantId);
        const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
        const list = items.slice(0, LIST_LIMIT).map((c) => `${(c.charge_id ?? '').slice(0, 8)} ${c.status ?? '?'} ${c.amount ?? ''}`).filter(Boolean);
        parts.push(`Cobranças (${items.length}): ${list.length ? list.join('; ') : 'nenhuma'}.`);
      }
      if (parts.length === 0) return null;
      return `Dados atuais do SaaS (para responder com precisão):\n${parts.join('\n')}`;
    } catch (err) {
      return null;
    }
  }

  const ownerConfirmationConfig = {
    maxPendingPerTenant: parseConfirmationMaxPending(
      options.ownerConfirmationMaxPendingPerTenant ??
      process.env.OWNER_CONFIRMATION_MAX_PENDING_PER_TENANT,
      20
    ),
    ttlSeconds: parseConfirmationTtlSeconds(
      options.ownerConfirmationTtlSeconds ??
      process.env.OWNER_CONFIRMATION_TTL_SECONDS,
      900
    )
  };
  const ownerEpisodeThreshold = Number(
    options.ownerEpisodeThreshold ?? process.env.OWNER_EPISODE_THRESHOLD ?? 10
  ) || 10;
  const corsAllowOrigins = parseCorsAllowOrigins(
    options.corsAllowOrigins ?? process.env.CORS_ALLOW_ORIGINS ?? '*'
  );
  const corsAllowMethods = String(
    options.corsAllowMethods ?? process.env.CORS_ALLOW_METHODS ?? DEFAULT_CORS_ALLOW_METHODS
  );
  const corsAllowHeaders = String(
    options.corsAllowHeaders ?? process.env.CORS_ALLOW_HEADERS ?? DEFAULT_CORS_ALLOW_HEADERS
  );
  const corsMaxAge = String(
    options.corsMaxAge ?? process.env.CORS_MAX_AGE ?? DEFAULT_CORS_MAX_AGE
  );

  async function runOwnerMemoryReembedBatch(input = {}) {
    const tenantId = String(input.tenant_id ?? '').trim();
    if (!tenantId) {
      return { ok: false, code: 'missing_tenant_id' };
    }

    const mode = parseMaintenanceEmbeddingMode(input.mode);
    if (input.mode != null && !mode) {
      return { ok: false, code: 'invalid_mode' };
    }

    const dryRun = input.dry_run === true;
    const maxItems = parseMaintenanceLimit(input.limit, 50);
    const candidates = await ownerMemoryStore.listEntriesMissingEmbedding(tenantId, maxItems);
    const provider = getOwnerEmbeddingProvider(mode);

    const processed = [];
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const entry of candidates) {
      if (dryRun) {
        processed.push({
          memory_id: entry.memory_id,
          status: 'dry_run'
        });
        continue;
      }

      let embedding;
      try {
        embedding = await provider.resolveMemoryEmbedding({
          tenant_id: entry.tenant_id,
          session_id: entry.session_id,
          memory_id: entry.memory_id,
          content: entry.content,
          tags: entry.tags ?? [],
          embedding_ref: entry.embedding_ref ?? null
        });
      } catch (error) {
        failed += 1;
        processed.push({
          memory_id: entry.memory_id,
          status: 'failed',
          reason: String(error.message ?? error)
        });
        continue;
      }

      if (!Array.isArray(embedding.embedding_vector) || embedding.embedding_vector.length === 0) {
        skipped += 1;
        processed.push({
          memory_id: entry.memory_id,
          status: 'skipped',
          reason: 'embedding_vector_missing'
        });
        continue;
      }

      const updateResult = await ownerMemoryStore.updateEntryEmbedding(
        entry.tenant_id,
        entry.memory_id,
        {
          embedding_ref: embedding.embedding_ref,
          embedding_vector: embedding.embedding_vector,
          metadata_patch: {
            embedding_backfill: {
              provider: embedding.provider,
              model: embedding.model,
              strategy: embedding.strategy,
              updated_at: new Date().toISOString()
            }
          }
        }
      );
      if (!updateResult.ok) {
        failed += 1;
        processed.push({
          memory_id: entry.memory_id,
          status: 'failed',
          reason: updateResult.code
        });
        continue;
      }

      updated += 1;
      processed.push({
        memory_id: entry.memory_id,
        status: 'updated',
        embedding_ref: updateResult.entry.embedding_ref ?? null
      });
    }

    return {
      ok: true,
      result: {
        tenant_id: tenantId,
        mode: mode ?? ownerEmbeddingProvider.mode,
        dry_run: dryRun,
        scanned_count: candidates.length,
        updated_count: updated,
        failed_count: failed,
        skipped_count: skipped,
        processed
      }
    };
  }

  const handler = async function app(req, res) {
    const { method, url } = req;
    const corsOrigin = resolveCorsOrigin(req.headers.origin, corsAllowOrigins);
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', corsAllowMethods);
      res.setHeader('Access-Control-Allow-Headers', corsAllowHeaders);
      res.setHeader('Access-Control-Max-Age', corsMaxAge);
      if (corsOrigin !== '*') {
        res.setHeader('Vary', 'Origin');
      }
    }

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(url ?? '/', 'http://localhost');
    const path = parsedUrl.pathname;

    try {
      if (method === 'GET' && path === '/health') {
        return json(res, 200, {
          status: 'ok',
          service: 'app-platform-api',
          orchestration: orchestrationInfo(store, taskPlanner.policyPath, taskPlanner.executionPolicyPath),
          customers: customerInfo(customerStore),
          agenda: agendaInfo(agendaStore),
          billing: billingInfo(billingStore),
          crm_leads: leadInfo(leadStore),
          crm_automation: crmAutomationInfo(crmAutomationStore),
          crm_conversations: crmConversationInfo(crmConversationStore),
          owner_memory: ownerMemoryInfo(ownerMemoryStore, ownerEmbeddingProvider),
          owner_memory_maintenance: ownerMemoryMaintenanceInfo(ownerMemoryMaintenanceStore),
          tenant_runtime_config: tenantRuntimeConfigInfo(tenantRuntimeConfigStore),
          owner_confirmation: ownerConfirmationInfo(ownerConfirmationConfig),
          owner_response: ownerResponseInfo(ownerResponseProvider)
        });
      }

      if (method === 'GET' && path === '/v1/owner-concierge/runtime-config') {
        const tenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        let configRecord;
        try {
          configRecord = await resolveTenantRuntimeConfig(tenantId);
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        const response = createRuntimeConfigSummary(tenantId, configRecord);
        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/owner-concierge/runtime-config') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = validateTenantRuntimeConfigRequest(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const tenantId = String(request.tenant_id).trim();
        let existingConfig = null;
        try {
          existingConfig = await resolveTenantRuntimeConfig(tenantId);
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }
        const normalizedConfig = sanitizeTenantRuntimeConfigInput(request.config, existingConfig);

        let updated;
        try {
          updated = await tenantRuntimeConfigStore.upsertTenantRuntimeConfig(tenantId, normalizedConfig);
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        const response = {
          request_id: String(request.request_id),
          ...createRuntimeConfigSummary(tenantId, updated),
          status: 'accepted'
        };
        return json(res, 200, { response });
      }

      if (method === 'POST' && path === '/v1/owner-concierge/audio/transcribe') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = validateOwnerAudioTranscriptionRequest(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const tenantId = String(request.tenant_id).trim();
        const tenantRuntimeConfig = await resolveTenantRuntimeConfig(tenantId);
        const resolvedApiKey = resolveOpenAiApiKey(
          tenantRuntimeConfig,
          ownerResponseProviderConfig.openaiApiKey
        );

        if (resolvedApiKey.length === 0) {
          return json(res, 400, { error: 'openai_not_configured' });
        }

        const mimeType = typeof request.mime_type === 'string'
          ? request.mime_type.trim()
          : 'audio/webm';
        const fileName = typeof request.filename === 'string' && request.filename.trim().length > 0
          ? request.filename.trim()
          : 'audio.webm';
        const language = typeof request.language === 'string' ? request.language.trim() : '';
        const model = typeof request.model === 'string' ? request.model.trim() : '';

        try {
          const transcription = await transcribeAudioWithOpenAi({
            apiKey: resolvedApiKey,
            baseUrl: options.openaiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
            audioBase64: request.audio_base64,
            mimeType,
            fileName,
            language,
            model
          });
          return json(res, 200, {
            response: {
              request_id: String(request.request_id),
              status: 'accepted',
              transcription
            }
          });
        } catch (error) {
          return json(res, 502, {
            error: 'owner_audio_transcription_error',
            details: sanitizeProviderErrorDetails(error)
          });
        }
      }

      if (method === 'POST' && path === '/v1/owner-concierge/audio/speech') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = validateOwnerAudioSpeechRequest(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const tenantId = String(request.tenant_id).trim();
        const tenantRuntimeConfig = await resolveTenantRuntimeConfig(tenantId);
        const resolvedApiKey = resolveOpenAiApiKey(
          tenantRuntimeConfig,
          ownerResponseProviderConfig.openaiApiKey
        );

        if (resolvedApiKey.length === 0) {
          return json(res, 400, { error: 'openai_not_configured' });
        }

        if (tenantRuntimeConfig?.openai?.voice_enabled === false) {
          return json(res, 400, { error: 'voice_disabled_by_tenant' });
        }

        try {
          const speech = await synthesizeSpeechWithOpenAi({
            apiKey: resolvedApiKey,
            baseUrl: options.openaiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
            text: String(request.text),
            model: typeof request.model === 'string' ? request.model.trim() : '',
            voice: typeof request.voice === 'string' ? request.voice.trim() : '',
            speed: request.speed,
            responseFormat: typeof request.response_format === 'string'
              ? request.response_format.trim()
              : ''
          });
          res.writeHead(200, {
            'content-type': speech.contentType,
            'cache-control': 'no-store',
            'x-owner-speech-provider': speech.provider,
            'x-owner-speech-model': speech.model,
            'x-owner-speech-voice': speech.voice,
            'x-owner-speech-speed': String(speech.speed),
            'x-owner-speech-latency-ms': String(speech.latency_ms),
            'x-owner-speech-request-id': String(request.request_id)
          });
          res.end(speech.audioBytes);
          return;
        } catch (error) {
          return json(res, 502, {
            error: 'owner_audio_speech_error',
            details: sanitizeProviderErrorDetails(error)
          });
        }
      }

      if (method === 'GET' && path === '/internal/orchestration/commands') {
        const commands = await store.getCommands();
        return json(res, 200, {
          count: commands.length,
          items: commands
        });
      }

      if (method === 'GET' && path === '/internal/orchestration/events') {
        const events = await store.getEvents();
        return json(res, 200, {
          count: events.length,
          items: events
        });
      }

      if (method === 'GET' && path === '/internal/orchestration/trace') {
        const correlationId = parsedUrl.searchParams.get('correlation_id');
        if (!correlationId) {
          return json(res, 400, { error: 'missing_correlation_id' });
        }

        const trace = await store.getTrace(correlationId);
        return json(res, 200, {
          correlation_id: correlationId,
          commands: trace.commands,
          events: trace.events
        });
      }

      if (method === 'GET' && path === '/internal/orchestration/module-task-queue') {
        const queue = await store.getModuleTaskQueue();
        return json(res, 200, {
          pending_count: queue.pending.length,
          history_count: queue.history.length,
          pending: queue.pending,
          history: queue.history
        });
      }

      if (method === 'POST' && path === '/internal/worker/module-tasks/drain') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const requestedLimit = Number(body.limit ?? 1);
        const maxItems = Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.min(Math.floor(requestedLimit), 100)
          : 1;

        const processed = [];
        let failed = 0;
        let succeeded = 0;
        for (let i = 0; i < maxItems; i += 1) {
          const queueItem = await store.claimNextModuleTask();
          if (!queueItem) break;

          const acceptedEvent = createModuleTaskAcceptedEvent(queueItem);
          const acceptedResult = await validateAndPersistEvent(store, acceptedEvent);
          if (!acceptedResult.ok) {
            return json(res, 500, {
              error: acceptedResult.type,
              details: acceptedResult.details
            });
          }

          const terminalEvent = createModuleTaskTerminalEvent(queueItem);
          const terminalResult = await validateAndPersistEvent(store, terminalEvent);
          if (!terminalResult.ok) {
            return json(res, 500, {
              error: terminalResult.type,
              details: terminalResult.details
            });
          }

          const delegationEvent = createCrmDelegationEvent(queueItem, terminalEvent);
          if (delegationEvent) {
            const delegationResult = await validateAndPersistEvent(store, delegationEvent);
            if (!delegationResult.ok) {
              return json(res, 500, {
                error: delegationResult.type,
                details: delegationResult.details
              });
            }
          }

          const completionStatus = terminalEvent.name === 'module.task.failed' ? 'failed' : 'completed';
          const completed = await store.completeModuleTask(queueItem.queue_item_id, {
            status: completionStatus,
            error_code: terminalEvent.payload?.error_code,
            result_summary: terminalEvent.payload?.result_summary
          });

          if (!completed) {
            return json(res, 500, {
              error: 'storage_error',
              details: `unable_to_complete_queue_item:${queueItem.queue_item_id}`
            });
          }

          if (completionStatus === 'failed') {
            failed += 1;
          } else {
            succeeded += 1;
          }

          processed.push({
            queue_item_id: queueItem.queue_item_id,
            task_id: queueItem.command.payload.task_id,
            correlation_id: queueItem.command.correlation_id,
            status: completionStatus
          });
        }

        return json(res, 200, {
          processed_count: processed.length,
          succeeded_count: succeeded,
          failed_count: failed,
          processed
        });
      }

      if (method === 'POST' && path === '/internal/worker/crm-collections/drain') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const requestedLimit = Number(body.limit ?? 10);
        const maxItems = Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.min(Math.floor(requestedLimit), 100)
          : 10;
        const forceFailure = body.force_failure === true;

        const commands = await store.getCommands();
        const events = await store.getEvents();
        const processedSet = new Set(
          events
            .filter((item) => (
              (item.name === 'billing.collection.sent' || item.name === 'billing.collection.failed') &&
              typeof item.causation_id === 'string'
            ))
            .map((item) => item.causation_id)
        );

        const candidates = commands.filter((item) => (
          item.name === 'billing.collection.dispatch.request' &&
          !processedSet.has(item.command_id)
        ));

        const processed = [];
        let succeeded = 0;
        let failed = 0;
        for (const command of candidates.slice(0, maxItems)) {
          const outbound = {
            queue_item_id: randomUUID(),
            tenant_id: command.tenant_id,
            trace_id: command.trace_id,
            correlation_id: command.correlation_id,
            idempotency_key: `collection:${command.command_id}`,
            context: {
              type: 'collection',
              context_id: command.payload.charge_id,
              task_id: command.payload.charge_id,
              module_source: 'mod-05-faturamento-cobranca'
            },
            recipient: {
              customer_id: command.payload.customer_id,
              phone_e164: command.payload.phone_e164
            },
            message: {
              type: 'text',
              text: command.payload.message
            },
            retry_policy: {
              max_attempts: 3,
              backoff_ms: 500
            },
            created_at: new Date().toISOString()
          };
          const outboundValidation = outboundQueueValid(outbound);
          if (!outboundValidation.ok) {
            const failedEvent = createBillingCollectionFailedEvent(
              command,
              'OUTBOUND_CONTRACT_INVALID',
              false
            );
            const failedResult = await validateAndPersistEvent(store, failedEvent);
            if (!failedResult.ok) {
              return json(res, 500, {
                error: failedResult.type,
                details: failedResult.details
              });
            }

            processed.push({
              command_id: command.command_id,
              charge_id: command.payload.charge_id,
              status: 'failed',
              reason: 'outbound_contract_invalid'
            });
            failed += 1;
            continue;
          }

          const shouldFail = forceFailure || /fail/i.test(String(command.payload.message ?? ''));
          const event = shouldFail
            ? createBillingCollectionFailedEvent(command, 'PROVIDER_SEND_ERROR', true)
            : createBillingCollectionSentEvent(command);
          const eventResult = await validateAndPersistEvent(store, event);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }

          processed.push({
            command_id: command.command_id,
            charge_id: command.payload.charge_id,
            status: shouldFail ? 'failed' : 'sent'
          });
          if (shouldFail) {
            failed += 1;
          } else {
            succeeded += 1;
          }
        }

        return json(res, 200, {
          processed_count: processed.length,
          succeeded_count: succeeded,
          failed_count: failed,
          processed
        });
      }

      if (method === 'POST' && path === '/internal/worker/crm-followups/drain') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const requestedLimit = Number(body.limit ?? 10);
        const maxItems = Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.min(Math.floor(requestedLimit), 100)
          : 10;
        const forceFailure = body.force_failure === true;

        const dueFollowups = await crmAutomationStore.claimPendingFollowups(
          maxItems,
          new Date().toISOString()
        );

        const processed = [];
        let succeeded = 0;
        let failed = 0;
        let skipped = 0;

        for (const item of dueFollowups) {
          const correlationId = item.correlation_id ?? item.followup_id;
          const traceId = item.trace_id ?? randomUUID();

          const outbound = {
            queue_item_id: randomUUID(),
            tenant_id: item.tenant_id,
            trace_id: traceId,
            correlation_id: correlationId,
            idempotency_key: `followup:${item.followup_id}`,
            context: {
              type: 'followup',
              context_id: item.followup_id,
              task_id: item.campaign_id ?? item.followup_id,
              module_source: 'mod-02-whatsapp-crm'
            },
            recipient: {
              ...(item.customer_id ? { customer_id: item.customer_id } : {}),
              ...(item.lead_id ? { lead_id: item.lead_id } : {}),
              phone_e164: item.phone_e164
            },
            message: {
              type: 'text',
              text: item.message
            },
            retry_policy: {
              max_attempts: 3,
              backoff_ms: 500
            },
            created_at: new Date().toISOString()
          };

          const outboundValidation = outboundQueueValid(outbound);
          if (!outboundValidation.ok) {
            const update = await crmAutomationStore.markFollowupFailed(item.tenant_id, item.followup_id, {
              error_code: 'OUTBOUND_CONTRACT_INVALID',
              error_message: 'followup_outbound_payload_invalid'
            });
            if (!update.ok) {
              skipped += 1;
              processed.push({
                followup_id: item.followup_id,
                status: 'skipped',
                reason: update.code
              });
              continue;
            }

            const failedEvent = createCrmFollowupEvent(
              'crm.followup.failed',
              update.followup,
              correlationId,
              traceId,
              item.followup_id,
              {
                error_code: 'OUTBOUND_CONTRACT_INVALID',
                retryable: false
              }
            );
            const failedResult = await validateAndPersistEvent(store, failedEvent);
            if (!failedResult.ok) {
              return json(res, 500, {
                error: failedResult.type,
                details: failedResult.details
              });
            }

            failed += 1;
            processed.push({
              followup_id: item.followup_id,
              status: 'failed',
              reason: 'outbound_contract_invalid'
            });
            continue;
          }

          const shouldFail = forceFailure || /fail/i.test(String(item.message ?? ''));
          if (shouldFail) {
            const update = await crmAutomationStore.markFollowupFailed(item.tenant_id, item.followup_id, {
              error_code: 'PROVIDER_SEND_ERROR',
              error_message: 'simulated_provider_failure'
            });
            if (!update.ok) {
              skipped += 1;
              processed.push({
                followup_id: item.followup_id,
                status: 'skipped',
                reason: update.code
              });
              continue;
            }

            const failedEvent = createCrmFollowupEvent(
              'crm.followup.failed',
              update.followup,
              correlationId,
              traceId,
              item.followup_id,
              {
                error_code: 'PROVIDER_SEND_ERROR',
                retryable: true
              }
            );
            const failedResult = await validateAndPersistEvent(store, failedEvent);
            if (!failedResult.ok) {
              return json(res, 500, {
                error: failedResult.type,
                details: failedResult.details
              });
            }

            failed += 1;
            processed.push({
              followup_id: item.followup_id,
              status: 'failed'
            });
            continue;
          }

          const update = await crmAutomationStore.markFollowupSent(item.tenant_id, item.followup_id, {
            provider_message_id: `msg-${randomUUID()}`
          });
          if (!update.ok) {
            skipped += 1;
            processed.push({
              followup_id: item.followup_id,
              status: 'skipped',
              reason: update.code
            });
            continue;
          }

          const sentEvent = createCrmFollowupEvent(
            'crm.followup.sent',
            update.followup,
            correlationId,
            traceId,
            item.followup_id,
            {
              provider_message_id: update.followup.provider_message_id
            }
          );
          const sentResult = await validateAndPersistEvent(store, sentEvent);
          if (!sentResult.ok) {
            return json(res, 500, {
              error: sentResult.type,
              details: sentResult.details
            });
          }

          succeeded += 1;
          processed.push({
            followup_id: item.followup_id,
            status: 'sent'
          });
        }

        return json(res, 200, {
          processed_count: processed.length,
          succeeded_count: succeeded,
          failed_count: failed,
          skipped_count: skipped,
          processed
        });
      }

      if (method === 'POST' && path === '/internal/maintenance/owner-memory/reembed') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const batchResult = await runOwnerMemoryReembedBatch(body);
        if (!batchResult.ok) {
          return json(res, 400, { error: batchResult.code });
        }
        return json(res, 200, batchResult.result);
      }

      if (method === 'POST' && path === '/internal/maintenance/owner-memory/reembed/schedules') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : '';
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const mode = parseMaintenanceEmbeddingMode(body.mode);
        if (body.mode != null && !mode) {
          return json(res, 400, { error: 'invalid_mode' });
        }

        try {
          const schedule = await ownerMemoryMaintenanceStore.upsertSchedule({
            tenant_id: tenantId,
            interval_minutes: body.interval_minutes,
            limit: body.limit,
            enabled: body.enabled,
            mode,
            run_now: body.run_now === true
          });
          return json(res, 200, { schedule });
        } catch (error) {
          return json(res, 400, {
            error: String(error.message ?? error)
          });
        }
      }

      if (method === 'POST' && path === '/internal/maintenance/owner-memory/reembed/schedules/pause') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : '';
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        try {
          const paused = await ownerMemoryMaintenanceStore.setScheduleEnabled(tenantId, false);
          if (!paused.ok && paused.code === 'not_found') {
            return json(res, 404, { error: 'not_found' });
          }
          if (!paused.ok) {
            return json(res, 400, { error: paused.code });
          }
          return json(res, 200, { schedule: paused.schedule });
        } catch (error) {
          return json(res, 400, { error: String(error.message ?? error) });
        }
      }

      if (method === 'POST' && path === '/internal/maintenance/owner-memory/reembed/schedules/resume') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : '';
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        try {
          const resumed = await ownerMemoryMaintenanceStore.setScheduleEnabled(tenantId, true, {
            run_now: body.run_now === true
          });
          if (!resumed.ok && resumed.code === 'not_found') {
            return json(res, 404, { error: 'not_found' });
          }
          if (!resumed.ok) {
            return json(res, 400, { error: resumed.code });
          }
          return json(res, 200, { schedule: resumed.schedule });
        } catch (error) {
          return json(res, 400, { error: String(error.message ?? error) });
        }
      }

      if (method === 'GET' && path === '/internal/maintenance/owner-memory/reembed/schedules') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        const items = await ownerMemoryMaintenanceStore.listSchedules(tenantId);
        return json(res, 200, {
          count: items.length,
          items
        });
      }

      if (method === 'GET' && path === '/internal/maintenance/owner-memory/reembed/runs') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        const limit = parseMaintenanceRunsLimit(parsedUrl.searchParams.get('limit'), 50);
        if (parsedUrl.searchParams.get('limit') != null && limit == null) {
          return json(res, 400, { error: 'invalid_limit' });
        }
        const items = await ownerMemoryMaintenanceStore.listRunRecords({
          tenant_id: tenantId,
          limit
        });
        return json(res, 200, {
          count: items.length,
          items
        });
      }

      if (method === 'POST' && path === '/internal/maintenance/owner-memory/reembed/schedules/run-due') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id.trim() : null;
        if (body.tenant_id != null && !tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const dryRun = body.dry_run === true;
        const force = body.force === true;
        const maxConcurrency = parseMaintenanceConcurrency(body.max_concurrency, 1);
        if (body.max_concurrency != null && maxConcurrency == null) {
          return json(res, 400, { error: 'invalid_max_concurrency' });
        }
        const lockTtlSeconds = parseMaintenanceLockTtlSeconds(body.lock_ttl_seconds, 120);
        if (body.lock_ttl_seconds != null && lockTtlSeconds == null) {
          return json(res, 400, { error: 'invalid_lock_ttl_seconds' });
        }

        const schedules = await ownerMemoryMaintenanceStore.listRunnableSchedules({
          tenant_id: tenantId,
          now_iso: new Date().toISOString(),
          force
        });

        let executed = 0;
        let failed = 0;
        let skippedLocked = 0;
        const runs = new Array(schedules.length);

        const executeSchedule = async (index) => {
          const schedule = schedules[index];
          const runId = randomUUID();
          const traceId = randomUUID();
          const startedAt = new Date().toISOString();
          const lock = await ownerMemoryMaintenanceStore.acquireRunLock(schedule.tenant_id, {
            run_id: runId,
            owner: 'run-due',
            lock_ttl_seconds: lockTtlSeconds
          });

          if (!lock.ok && lock.code === 'locked') {
            skippedLocked += 1;
            const skippedRun = {
              run_id: runId,
              tenant_id: schedule.tenant_id,
              status: 'skipped_locked',
              reason: 'lock_active',
              stale_recovered: lock.stale_recovered === true
            };
            runs[index] = skippedRun;
            await ownerMemoryMaintenanceStore.recordRun({
              run_id: runId,
              tenant_id: schedule.tenant_id,
              trigger: 'schedule-run-due',
              status: 'skipped_locked',
              dry_run: dryRun,
              started_at: startedAt,
              finished_at: new Date().toISOString(),
              details: {
                reason: 'lock_active',
                lock
              }
            });
            return;
          }

          if (!lock.ok) {
            failed += 1;
            const failedRun = {
              run_id: runId,
              tenant_id: schedule.tenant_id,
              status: 'failed',
              reason: lock.code
            };
            runs[index] = failedRun;
            await ownerMemoryMaintenanceStore.recordRun({
              run_id: runId,
              tenant_id: schedule.tenant_id,
              trigger: 'schedule-run-due',
              status: 'failed',
              dry_run: dryRun,
              started_at: startedAt,
              finished_at: new Date().toISOString(),
              details: { reason: lock.code }
            });
            return;
          }

          try {
            const startedEvent = createOwnerMemoryReembedMaintenanceEvent(
              'owner.memory.reembed.started',
              schedule.tenant_id,
              runId,
              traceId,
              {
                run_id: runId,
                trigger: 'schedule-run-due',
                dry_run: dryRun,
                limit: schedule.limit,
                mode: schedule.mode ?? ownerEmbeddingProvider.mode
              }
            );
            const startedEventResult = await validateAndPersistEvent(store, startedEvent);
            if (!startedEventResult.ok) {
              failed += 1;
              runs[index] = {
                run_id: runId,
                tenant_id: schedule.tenant_id,
                status: 'failed',
                reason: startedEventResult.type
              };
              await ownerMemoryMaintenanceStore.markScheduleFailure(
                schedule.tenant_id,
                startedEventResult.type,
                { details: startedEventResult.details }
              );
              await ownerMemoryMaintenanceStore.recordRun({
                run_id: runId,
                tenant_id: schedule.tenant_id,
                trigger: 'schedule-run-due',
                status: 'failed',
                dry_run: dryRun,
                started_at: startedAt,
                finished_at: new Date().toISOString(),
                details: {
                  reason: startedEventResult.type,
                  event_details: startedEventResult.details
                }
              });
              return;
            }

            const run = await runOwnerMemoryReembedBatch({
              tenant_id: schedule.tenant_id,
              limit: schedule.limit,
              mode: schedule.mode,
              dry_run: dryRun
            });
            if (!run.ok) {
              failed += 1;
              runs[index] = {
                run_id: runId,
                tenant_id: schedule.tenant_id,
                status: 'failed',
                reason: run.code
              };
              const failedEvent = createOwnerMemoryReembedMaintenanceEvent(
                'owner.memory.reembed.failed',
                schedule.tenant_id,
                runId,
                traceId,
                {
                  run_id: runId,
                  trigger: 'schedule-run-due',
                  dry_run: dryRun,
                  error_code: run.code,
                  error_message: run.code
                }
              );
              await validateAndPersistEvent(store, failedEvent);
              await ownerMemoryMaintenanceStore.markScheduleFailure(
                schedule.tenant_id,
                run.code,
                { reason: run.code }
              );
              await ownerMemoryMaintenanceStore.recordRun({
                run_id: runId,
                tenant_id: schedule.tenant_id,
                trigger: 'schedule-run-due',
                status: 'failed',
                dry_run: dryRun,
                started_at: startedAt,
                finished_at: new Date().toISOString(),
                details: { reason: run.code }
              });
              return;
            }

            executed += 1;
            runs[index] = {
              run_id: runId,
              tenant_id: schedule.tenant_id,
              status: 'completed',
              stale_recovered: lock.stale_recovered === true,
              ...run.result
            };
            const completedEvent = createOwnerMemoryReembedMaintenanceEvent(
              'owner.memory.reembed.completed',
              schedule.tenant_id,
              runId,
              traceId,
              {
                run_id: runId,
                trigger: 'schedule-run-due',
                dry_run: dryRun,
                scanned_count: run.result.scanned_count,
                updated_count: run.result.updated_count,
                failed_count: run.result.failed_count,
                skipped_count: run.result.skipped_count
              }
            );
            await validateAndPersistEvent(store, completedEvent);
            if (!dryRun) {
              await ownerMemoryMaintenanceStore.markScheduleRun(
                schedule.tenant_id,
                run.result
              );
            }
            await ownerMemoryMaintenanceStore.recordRun({
              run_id: runId,
              tenant_id: schedule.tenant_id,
              trigger: 'schedule-run-due',
              status: 'completed',
              dry_run: dryRun,
              started_at: startedAt,
              finished_at: new Date().toISOString(),
              details: run.result
            });
          } catch (error) {
            failed += 1;
            const reason = String(error.message ?? error);
            runs[index] = {
              run_id: runId,
              tenant_id: schedule.tenant_id,
              status: 'failed',
              reason
            };
            const failedEvent = createOwnerMemoryReembedMaintenanceEvent(
              'owner.memory.reembed.failed',
              schedule.tenant_id,
              runId,
              traceId,
              {
                run_id: runId,
                trigger: 'schedule-run-due',
                dry_run: dryRun,
                error_code: 'runtime_error',
                error_message: reason
              }
            );
            await validateAndPersistEvent(store, failedEvent);
            await ownerMemoryMaintenanceStore.markScheduleFailure(
              schedule.tenant_id,
              'runtime_error',
              { reason }
            );
            await ownerMemoryMaintenanceStore.recordRun({
              run_id: runId,
              tenant_id: schedule.tenant_id,
              trigger: 'schedule-run-due',
              status: 'failed',
              dry_run: dryRun,
              started_at: startedAt,
              finished_at: new Date().toISOString(),
              details: { reason }
            });
          } finally {
            await ownerMemoryMaintenanceStore.releaseRunLock(schedule.tenant_id, runId);
          }
        };

        let cursor = 0;
        const workerCount = Math.min(maxConcurrency, Math.max(schedules.length, 1));
        const workers = Array.from({ length: workerCount }, async () => {
          while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= schedules.length) {
              return;
            }
            await executeSchedule(index);
          }
        });
        await Promise.all(workers);

        const runItems = runs.filter(Boolean);

        return json(res, 200, {
          dry_run: dryRun,
          force,
          max_concurrency: maxConcurrency,
          lock_ttl_seconds: lockTtlSeconds,
          due_count: schedules.length,
          executed_count: executed,
          failed_count: failed,
          skipped_locked_count: skippedLocked,
          runs: runItems
        });
      }

      if (method === 'POST' && path === '/v1/crm/campaigns') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = campaignCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        let createResult;
        try {
          createResult = await crmAutomationStore.createCampaign({
            campaign_id: request.campaign.campaign_id ?? randomUUID(),
            tenant_id: request.tenant_id,
            external_key: request.campaign.external_key ?? null,
            name: request.campaign.name,
            channel: request.campaign.channel ?? 'whatsapp',
            audience_segment: request.campaign.audience_segment ?? null,
            state: request.campaign.state ?? 'draft',
            scheduled_at: request.campaign.scheduled_at ?? null,
            metadata: request.campaign.metadata ?? {}
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        let lifecycleEventName = null;
        if (createResult.action !== 'idempotent') {
          const createdEvent = createCrmCampaignCreatedEvent(
            createResult.campaign,
            correlationId,
            traceId
          );
          const eventResult = await validateAndPersistEvent(store, createdEvent);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }
          lifecycleEventName = createdEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: createResult.action,
            campaign: createResult.campaign,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'PATCH' && path.startsWith('/v1/crm/campaigns/') && path.endsWith('/state')) {
        const campaignId = path.slice('/v1/crm/campaigns/'.length).replace('/state', '');
        if (!campaignId) {
          return json(res, 400, { error: 'missing_campaign_id' });
        }

        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = campaignStateUpdateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();

        let updateResult;
        try {
          updateResult = await crmAutomationStore.updateCampaignState(
            request.tenant_id,
            campaignId,
            request.changes
          );
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        if (!updateResult.ok && updateResult.code === 'not_found') {
          return json(res, 404, { error: 'not_found' });
        }
        if (!updateResult.ok) {
          return json(res, 400, {
            error: 'transition_error',
            details: updateResult
          });
        }

        let lifecycleEventName = null;
        if (updateResult.changed) {
          const changedEvent = createCrmCampaignStateChangedEvent(
            updateResult.campaign,
            updateResult.previous_state,
            correlationId,
            traceId,
            request.request_id
          );
          const eventResult = await validateAndPersistEvent(store, changedEvent);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }
          lifecycleEventName = changedEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: updateResult.changed ? 'updated' : 'idempotent',
            campaign: updateResult.campaign,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'GET' && path === '/v1/crm/campaigns') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const items = await crmAutomationStore.listCampaigns(tenantId);
        const response = {
          tenant_id: tenantId,
          count: items.length,
          items
        };
        const validation = campaignListValid(response);
        if (!validation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: validation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/crm/followups') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = followupCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        let createResult;
        try {
          createResult = await crmAutomationStore.createFollowup({
            followup_id: request.followup.followup_id ?? randomUUID(),
            tenant_id: request.tenant_id,
            campaign_id: request.followup.campaign_id ?? null,
            external_key: request.followup.external_key ?? null,
            lead_id: request.followup.lead_id ?? null,
            customer_id: request.followup.customer_id ?? null,
            phone_e164: request.followup.phone_e164,
            message: request.followup.message,
            schedule_at: request.followup.schedule_at,
            channel: request.followup.channel ?? 'whatsapp',
            status: request.followup.status ?? 'pending',
            metadata: request.followup.metadata ?? {},
            correlation_id: correlationId,
            trace_id: traceId
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        let lifecycleEventName = null;
        if (createResult.action !== 'idempotent') {
          const scheduledEvent = createCrmFollowupEvent(
            'crm.followup.scheduled',
            createResult.followup,
            correlationId,
            traceId,
            request.request_id
          );
          const eventResult = await validateAndPersistEvent(store, scheduledEvent);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }
          lifecycleEventName = scheduledEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: createResult.action,
            followup: createResult.followup,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'GET' && path === '/v1/crm/followups') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const status = parsedUrl.searchParams.get('status');
        const items = await crmAutomationStore.listFollowups(tenantId, {
          status: status && status.length > 0 ? status : undefined
        });
        const response = {
          tenant_id: tenantId,
          count: items.length,
          items
        };
        const validation = followupListValid(response);
        if (!validation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: validation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/crm/leads') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = leadCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        let createResult;
        try {
          createResult = await leadStore.createLead({
            lead_id: request.lead.lead_id ?? randomUUID(),
            tenant_id: request.tenant_id,
            external_key: request.lead.external_key ?? null,
            display_name: request.lead.display_name,
            phone_e164: request.lead.phone_e164,
            source_channel: request.lead.source_channel,
            stage: request.lead.stage ?? 'new',
            metadata: request.lead.metadata ?? {}
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        let lifecycleEventName = null;
        if (createResult.action !== 'idempotent') {
          const leadCreatedEvent = createCrmLeadCreatedEvent(
            createResult.lead,
            correlationId,
            traceId
          );
          const eventResult = await validateAndPersistEvent(store, leadCreatedEvent);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }
          lifecycleEventName = leadCreatedEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: createResult.action,
            lead: createResult.lead,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'PATCH' && path.startsWith('/v1/crm/leads/') && path.endsWith('/stage')) {
        const leadId = path.slice('/v1/crm/leads/'.length).replace('/stage', '');
        if (!leadId) {
          return json(res, 400, { error: 'missing_lead_id' });
        }

        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = leadStageUpdateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        let updateResult;
        try {
          updateResult = await leadStore.updateLeadStage(
            request.tenant_id,
            leadId,
            request.changes
          );
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        if (!updateResult.ok && updateResult.code === 'not_found') {
          return json(res, 404, { error: 'not_found' });
        }
        if (!updateResult.ok) {
          return json(res, 400, {
            error: 'transition_error',
            details: updateResult
          });
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'updated',
            lead: updateResult.lead
          }
        });
      }

      if (method === 'GET' && path === '/v1/crm/leads') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const items = await leadStore.listLeads(tenantId);
        const response = {
          tenant_id: tenantId,
          count: items.length,
          items
        };
        const validation = leadListValid(response);
        if (!validation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: validation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'GET' && path === '/v1/crm/conversations') {
        const tenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const limitRaw = Number(parsedUrl.searchParams.get('limit') ?? 100);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
        const conversations = await crmConversationStore.listConversations(tenantId, { limit });
        const leads = await leadStore.listLeads(tenantId);
        const leadById = new Map(leads.map((item) => [item.lead_id, item]));
        const leadByPhone = new Map(leads.map((item) => [item.phone_e164, item]));

        const items = conversations.map((conversation) => {
          const linkedLead = (
            (conversation.lead_id ? leadById.get(conversation.lead_id) : null)
            ?? leadByPhone.get(conversation.contact_e164)
            ?? null
          );
          return {
            ...conversation,
            lead_id: linkedLead?.lead_id ?? conversation.lead_id ?? null,
            lead_stage: linkedLead?.stage ?? null
          };
        });
        return json(res, 200, {
          tenant_id: tenantId,
          count: items.length,
          items
        });
      }

      const conversationMessagesMatch = path.match(/^\/v1\/crm\/conversations\/([^/]+)\/messages$/);
      if (method === 'GET' && conversationMessagesMatch) {
        const tenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        const conversationId = decodeURIComponent(conversationMessagesMatch[1] ?? '').trim();
        if (!conversationId) {
          return json(res, 400, { error: 'missing_conversation_id' });
        }
        const conversation = await crmConversationStore.getConversationById(tenantId, conversationId);
        if (!conversation) {
          return json(res, 404, { error: 'conversation_not_found' });
        }
        const limitRaw = Number(parsedUrl.searchParams.get('limit') ?? 200);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
        const items = await crmConversationStore.listMessages(tenantId, conversationId, { limit });
        return json(res, 200, {
          tenant_id: tenantId,
          conversation,
          count: items.length,
          items
        });
      }

      const conversationReadMatch = path.match(/^\/v1\/crm\/conversations\/([^/]+)\/read$/);
      if (method === 'POST' && conversationReadMatch) {
        const tenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        const conversationId = decodeURIComponent(conversationReadMatch[1] ?? '').trim();
        if (!conversationId) {
          return json(res, 400, { error: 'missing_conversation_id' });
        }
        const result = await crmConversationStore.markConversationRead(tenantId, conversationId);
        if (!result.ok) {
          return json(res, 404, { error: 'conversation_not_found' });
        }
        return json(res, 200, {
          status: 'updated',
          conversation: result.conversation
        });
      }

      const conversationSendMatch = path.match(/^\/v1\/crm\/conversations\/([^/]+)\/send$/);
      if (method === 'POST' && conversationSendMatch) {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }
        const request = body?.request && typeof body.request === 'object' ? body.request : {};
        const tenantId = String(request.tenant_id ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        const text = String(request.text ?? '').trim();
        if (!text) {
          return json(res, 400, { error: 'missing_text' });
        }
        const conversationId = decodeURIComponent(conversationSendMatch[1] ?? '').trim();
        if (!conversationId) {
          return json(res, 400, { error: 'missing_conversation_id' });
        }

        const conversation = await crmConversationStore.getConversationById(tenantId, conversationId);
        if (!conversation) {
          return json(res, 404, { error: 'conversation_not_found' });
        }

        const evolutionRuntime = await resolveEvolutionRuntimeConfig(tenantId);
        if (!evolutionRuntime.baseUrl || !evolutionRuntime.apiKey || !evolutionRuntime.instanceId) {
          return json(res, 503, { error: 'evolution_not_configured' });
        }

        const recipientNumber = normalizeEvolutionRecipientNumber(conversation.contact_e164);
        if (!recipientNumber) {
          return json(res, 400, { error: 'invalid_recipient' });
        }

        let providerResult = null;
        try {
          providerResult = await sendEvolutionTextMessage({
            baseUrl: evolutionRuntime.baseUrl,
            apiKey: evolutionRuntime.apiKey,
            instanceId: evolutionRuntime.instanceId,
            number: recipientNumber,
            text
          });
        } catch (error) {
          providerResult = {
            ok: false,
            status: 502,
            errorDetails: truncateProviderErrorDetails(error?.message ?? error)
          };
        }

        const saved = await crmConversationStore.appendOutboundMessage({
          tenant_id: tenantId,
          conversation_id: conversationId,
          provider: 'evolution-api',
          provider_message_id: providerResult?.providerMessageId ?? null,
          message_type: 'text',
          text,
          delivery_state: providerResult?.ok ? 'sent' : 'failed',
          occurred_at: new Date().toISOString(),
          metadata: {
            source: 'crm_console_send',
            provider_status: providerResult?.status ?? null,
            provider_error: providerResult?.ok ? null : (providerResult?.errorDetails ?? null)
          }
        });
        if (!saved.ok) {
          return json(res, 404, { error: 'conversation_not_found' });
        }

        if (!providerResult?.ok) {
          return json(res, 502, {
            error: 'provider_send_error',
            provider_status: providerResult?.status ?? 502,
            details: providerResult?.errorDetails ?? 'provider_send_error',
            message: saved.message
          });
        }

        return json(res, 200, {
          status: 'sent',
          message: saved.message,
          provider_message_id: providerResult.providerMessageId ?? null
        });
      }

      const conversationAiSuggestReplyMatch = path.match(/^\/v1\/crm\/conversations\/([^/]+)\/ai\/suggest-reply$/);
      if (method === 'POST' && conversationAiSuggestReplyMatch) {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = crmAiSuggestReplyValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const tenantId = String(request.tenant_id ?? '').trim();
        const conversationId = decodeURIComponent(conversationAiSuggestReplyMatch[1] ?? '').trim();
        if (!conversationId) {
          return json(res, 400, { error: 'missing_conversation_id' });
        }

        const contextResult = await resolveCrmThreadContext(tenantId, conversationId);
        if (!contextResult.ok) {
          return json(res, 404, { error: contextResult.code });
        }

        const tenantRuntimeConfig = await resolveTenantRuntimeConfig(tenantId);
        const aiConfig = resolveCrmAiRuntimeConfig(tenantRuntimeConfig);
        if (!aiConfig.enabled) {
          return json(res, 403, {
            error: 'crm_ai_disabled',
            mode: aiConfig.mode
          });
        }

        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        const contextPack = buildCrmAiContextPack(
          contextResult.conversation,
          contextResult.lead,
          contextResult.messages
        );
        const provider = getOwnerResponseProviderForTenant(tenantRuntimeConfig);

        let suggestion;
        try {
          suggestion = await generateCrmAiDraftReply({
            provider,
            aiConfig,
            contextPack,
            tone: request.tone
          });
        } catch (error) {
          appendCrmAiAudit({
            tenant_id: tenantId,
            conversation_id: conversationId,
            action: 'suggest_reply',
            status: 'failed',
            correlation_id: correlationId,
            trace_id: traceId,
            details: truncateProviderErrorDetails(error?.message ?? error, 800)
          });
          return json(res, 502, {
            error: 'ai_provider_error',
            details: truncateProviderErrorDetails(error?.message ?? error, 800),
            correlation_id: correlationId,
            trace_id: traceId
          });
        }

        appendCrmAiAudit({
          tenant_id: tenantId,
          conversation_id: conversationId,
          action: 'suggest_reply',
          status: 'ok',
          correlation_id: correlationId,
          trace_id: traceId,
          confidence: suggestion.confidence,
          provider: suggestion.provider
        });

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'ok',
            conversation_id: conversationId,
            draft_reply: suggestion.draftReply,
            confidence: suggestion.confidence,
            reasoning_summary: suggestion.reasoningSummary,
            policy: {
              enabled: aiConfig.enabled,
              mode: aiConfig.mode,
              min_confidence: aiConfig.minConfidence
            },
            provider: {
              name: suggestion.provider ?? 'local',
              model: suggestion.model ?? null
            },
            correlation_id: correlationId,
            trace_id: traceId
          }
        });
      }

      const conversationAiQualifyMatch = path.match(/^\/v1\/crm\/conversations\/([^/]+)\/ai\/qualify$/);
      if (method === 'POST' && conversationAiQualifyMatch) {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = crmAiQualifyValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const tenantId = String(request.tenant_id ?? '').trim();
        const conversationId = decodeURIComponent(conversationAiQualifyMatch[1] ?? '').trim();
        if (!conversationId) {
          return json(res, 400, { error: 'missing_conversation_id' });
        }

        const contextResult = await resolveCrmThreadContext(tenantId, conversationId);
        if (!contextResult.ok) {
          return json(res, 404, { error: contextResult.code });
        }

        if (!contextResult.lead) {
          return json(res, 404, { error: 'lead_not_found_for_conversation' });
        }

        const tenantRuntimeConfig = await resolveTenantRuntimeConfig(tenantId);
        const aiConfig = resolveCrmAiRuntimeConfig(tenantRuntimeConfig);
        if (!aiConfig.enabled) {
          return json(res, 403, {
            error: 'crm_ai_disabled',
            mode: aiConfig.mode
          });
        }

        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        const contextPack = buildCrmAiContextPack(
          contextResult.conversation,
          contextResult.lead,
          contextResult.messages
        );
        const provider = getOwnerResponseProviderForTenant(tenantRuntimeConfig);

        let qualification;
        try {
          qualification = await generateCrmAiQualification({
            provider,
            aiConfig,
            contextPack
          });
        } catch (error) {
          appendCrmAiAudit({
            tenant_id: tenantId,
            conversation_id: conversationId,
            action: 'qualify',
            status: 'failed',
            correlation_id: correlationId,
            trace_id: traceId,
            details: truncateProviderErrorDetails(error?.message ?? error, 800)
          });
          return json(res, 502, {
            error: 'ai_provider_error',
            details: truncateProviderErrorDetails(error?.message ?? error, 800),
            correlation_id: correlationId,
            trace_id: traceId
          });
        }

        let suggestedStage = qualification.suggestedStage;
        let requiredTrigger = qualification.requiredTrigger;
        let confidence = qualification.confidence;
        let reason = qualification.reason;

        if (confidence < aiConfig.minConfidence) {
          suggestedStage = qualification.currentStage;
          requiredTrigger = null;
          reason = `Confianca ${confidence.toFixed(2)} abaixo do limiar ${aiConfig.minConfidence.toFixed(2)}; manter stage atual.`;
        }

        appendCrmAiAudit({
          tenant_id: tenantId,
          conversation_id: conversationId,
          action: 'qualify',
          status: 'ok',
          correlation_id: correlationId,
          trace_id: traceId,
          confidence,
          suggested_stage: suggestedStage,
          provider: qualification.provider
        });

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'ok',
            conversation_id: conversationId,
            current_stage: qualification.currentStage,
            suggested_stage: suggestedStage,
            confidence: confidence,
            reason: reason,
            required_trigger: requiredTrigger,
            policy: {
              enabled: aiConfig.enabled,
              mode: aiConfig.mode,
              min_confidence: aiConfig.minConfidence
            },
            provider: {
              name: qualification.provider ?? 'local',
              model: qualification.model ?? null
            },
            correlation_id: correlationId,
            trace_id: traceId
          }
        });
      }

      const conversationAiExecuteMatch = path.match(/^\/v1\/crm\/conversations\/([^/]+)\/ai\/execute$/);
      if (method === 'POST' && conversationAiExecuteMatch) {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = crmAiExecuteValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const tenantId = String(request.tenant_id ?? '').trim();
        const conversationId = decodeURIComponent(conversationAiExecuteMatch[1] ?? '').trim();
        if (!conversationId) {
          return json(res, 400, { error: 'missing_conversation_id' });
        }

        const contextResult = await resolveCrmThreadContext(tenantId, conversationId);
        if (!contextResult.ok) {
          return json(res, 404, { error: contextResult.code });
        }

        const tenantRuntimeConfig = await resolveTenantRuntimeConfig(tenantId);
        const aiConfig = resolveCrmAiRuntimeConfig(tenantRuntimeConfig);
        if (!aiConfig.enabled) {
          return json(res, 403, {
            error: 'crm_ai_disabled',
            mode: aiConfig.mode
          });
        }
        if (aiConfig.mode !== 'assist_execute') {
          return json(res, 409, {
            error: 'crm_ai_execute_blocked',
            mode: aiConfig.mode
          });
        }

        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        const action = String(request.action ?? '').trim();
        const clientRequestId = String(request.client_request_id ?? '').trim();
        const executionCacheKey = makeCrmAiExecutionKey({
          tenantId,
          conversationId,
          action,
          clientRequestId
        });
        const cachedExecution = crmAiExecutionCache.get(executionCacheKey);
        if (cachedExecution) {
          return json(res, 200, {
            response: {
              ...cachedExecution,
              status: 'idempotent',
              request_id: request.request_id
            }
          });
        }

        if (action === 'send_reply') {
          const replyText = cleanShortText(request?.payload?.reply_text ?? '', 2000);
          if (!replyText) {
            return json(res, 400, { error: 'missing_reply_text' });
          }

          const evolutionRuntime = await resolveEvolutionRuntimeConfig(tenantId);
          if (!evolutionRuntime.baseUrl || !evolutionRuntime.apiKey || !evolutionRuntime.instanceId) {
            return json(res, 503, { error: 'evolution_not_configured' });
          }

          const recipientNumber = normalizeEvolutionRecipientNumber(contextResult.conversation.contact_e164);
          if (!recipientNumber) {
            return json(res, 400, { error: 'invalid_recipient' });
          }

          let providerResult = null;
          try {
            providerResult = await sendEvolutionTextMessage({
              baseUrl: evolutionRuntime.baseUrl,
              apiKey: evolutionRuntime.apiKey,
              instanceId: evolutionRuntime.instanceId,
              number: recipientNumber,
              text: replyText
            });
          } catch (error) {
            providerResult = {
              ok: false,
              status: 502,
              errorDetails: truncateProviderErrorDetails(error?.message ?? error)
            };
          }

          const saved = await crmConversationStore.appendOutboundMessage({
            tenant_id: tenantId,
            conversation_id: conversationId,
            provider: 'evolution-api',
            provider_message_id: providerResult?.providerMessageId ?? null,
            message_type: 'text',
            text: replyText,
            delivery_state: providerResult?.ok ? 'sent' : 'failed',
            occurred_at: new Date().toISOString(),
            metadata: {
              source: 'crm_ai_execute',
              ai_action: 'send_reply',
              provider_status: providerResult?.status ?? null,
              provider_error: providerResult?.ok ? null : (providerResult?.errorDetails ?? null),
              correlation_id: correlationId,
              trace_id: traceId
            }
          });
          if (!saved.ok) {
            return json(res, 404, { error: 'conversation_not_found' });
          }

          appendCrmAiAudit({
            tenant_id: tenantId,
            conversation_id: conversationId,
            action: 'execute_send_reply',
            status: providerResult?.ok ? 'ok' : 'failed',
            correlation_id: correlationId,
            trace_id: traceId,
            provider_status: providerResult?.status ?? null
          });

          if (!providerResult?.ok) {
            return json(res, 502, {
              error: 'provider_send_error',
              provider_status: providerResult?.status ?? 502,
              details: providerResult?.errorDetails ?? 'provider_send_error',
              message: saved.message
            });
          }

          const responsePayload = {
            request_id: request.request_id,
            status: 'ok',
            executed_action: 'send_reply',
            conversation_id: conversationId,
            provider_result: {
              status: providerResult.status ?? 200,
              provider_message_id: providerResult.providerMessageId ?? null
            },
            message: saved.message,
            correlation_id: correlationId,
            trace_id: traceId
          };
          crmAiExecutionCache.set(executionCacheKey, responsePayload);
          return json(res, 200, { response: responsePayload });
        }

        if (action === 'update_stage') {
          const lead = contextResult.lead;
          if (!lead) {
            return json(res, 404, { error: 'lead_not_found_for_conversation' });
          }

          const currentStage = String(lead.stage ?? '').trim();
          const toStage = String(request?.payload?.to_stage ?? '').trim();
          if (!toStage) {
            return json(res, 400, { error: 'missing_to_stage' });
          }

          const transition = findLeadStageTransition(currentStage, toStage);
          const trigger = cleanShortText(request?.payload?.trigger ?? transition?.trigger ?? '', 120);
          const reasonCode = cleanShortText(
            request?.payload?.reason_code ?? (transition?.requires_reason_code ? 'ai_stage_update' : ''),
            120
          );

          let updateResult;
          try {
            updateResult = await leadStore.updateLeadStage(
              tenantId,
              lead.lead_id,
              {
                to_stage: toStage,
                trigger,
                reason_code: reasonCode,
                metadata: {
                  ...(lead.metadata && typeof lead.metadata === 'object' ? lead.metadata : {}),
                  ai_action: 'update_stage',
                  ai_correlation_id: correlationId,
                  ai_trace_id: traceId
                }
              }
            );
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }

          if (!updateResult.ok && updateResult.code === 'not_found') {
            return json(res, 404, { error: 'not_found' });
          }
          if (!updateResult.ok) {
            return json(res, 400, {
              error: 'transition_error',
              details: updateResult
            });
          }

          appendCrmAiAudit({
            tenant_id: tenantId,
            conversation_id: conversationId,
            action: 'execute_update_stage',
            status: 'ok',
            correlation_id: correlationId,
            trace_id: traceId,
            from_stage: currentStage,
            to_stage: toStage
          });

          const responsePayload = {
            request_id: request.request_id,
            status: 'ok',
            executed_action: 'update_stage',
            conversation_id: conversationId,
            lead_result: updateResult.lead,
            correlation_id: correlationId,
            trace_id: traceId
          };
          crmAiExecutionCache.set(executionCacheKey, responsePayload);
          return json(res, 200, { response: responsePayload });
        }

        return json(res, 400, { error: 'invalid_ai_action' });
      }

      if (method === 'POST' && path === '/v1/billing/charges') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = chargeCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        let upsertResult;
        try {
          upsertResult = await billingStore.createCharge({
            charge_id: request.charge.charge_id ?? randomUUID(),
            tenant_id: request.tenant_id,
            customer_id: request.charge.customer_id,
            external_key: request.charge.external_key ?? null,
            amount: request.charge.amount,
            currency: request.charge.currency,
            due_date: request.charge.due_date ?? null,
            status: request.charge.status ?? 'open',
            metadata: request.charge.metadata ?? {}
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        let lifecycleEventName = null;
        if (upsertResult.action !== 'idempotent') {
          const chargeCreatedEvent = createBillingEvent(
            'billing.charge.created',
            upsertResult.charge,
            correlationId,
            traceId
          );
          const payloadValidation = billingLifecycleEventPayloadValid({
            name: chargeCreatedEvent.name,
            payload: chargeCreatedEvent.payload
          });
          if (!payloadValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: payloadValidation.errors
            });
          }
          const eventResult = await validateAndPersistEvent(store, chargeCreatedEvent);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }
          lifecycleEventName = chargeCreatedEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: upsertResult.action,
            charge: upsertResult.charge,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'PATCH' && path.startsWith('/v1/billing/charges/')) {
        const chargeId = path.slice('/v1/billing/charges/'.length);
        if (!chargeId) {
          return json(res, 400, { error: 'missing_charge_id' });
        }

        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = chargeUpdateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        let updated;
        try {
          updated = await billingStore.updateCharge(
            request.tenant_id,
            chargeId,
            request.changes
          );
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        if (!updated) {
          return json(res, 404, { error: 'not_found' });
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'updated',
            charge: updated
          }
        });
      }

      if (method === 'POST' && path.startsWith('/v1/billing/charges/') && path.endsWith('/collection-request')) {
        const chargeId = path
          .slice('/v1/billing/charges/'.length)
          .replace('/collection-request', '');
        if (!chargeId) {
          return json(res, 400, { error: 'missing_charge_id' });
        }

        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const request = body?.request;
        if (!request || typeof request !== 'object') {
          return json(res, 400, { error: 'validation_error', details: [{ message: 'missing request object' }] });
        }
        if (typeof request.request_id !== 'string' || request.request_id.length === 0) {
          return json(res, 400, {
            error: 'validation_error',
            details: [{ instancePath: '/request/request_id', message: 'must be non-empty string' }]
          });
        }
        if (typeof request.tenant_id !== 'string' || request.tenant_id.length === 0) {
          return json(res, 400, {
            error: 'validation_error',
            details: [{ instancePath: '/request/tenant_id', message: 'must be non-empty string' }]
          });
        }

        const phone = request?.collection?.recipient?.phone_e164;
        if (typeof phone !== 'string' || !/^\+[1-9][0-9]{7,14}$/.test(phone)) {
          return json(res, 400, {
            error: 'validation_error',
            details: [{
              instancePath: '/request/collection/recipient/phone_e164',
              message: 'must be valid e164'
            }]
          });
        }

        const charge = await billingStore.getChargeById(request.tenant_id, chargeId);
        if (!charge) {
          return json(res, 404, { error: 'charge_not_found' });
        }

        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();
        const message = String(
          request?.collection?.message ??
          `Cobranca pendente no valor de ${charge.currency} ${Number(charge.amount).toFixed(2)}.`
        ).trim();
        if (message.length === 0) {
          return json(res, 400, {
            error: 'validation_error',
            details: [{ instancePath: '/request/collection/message', message: 'must be non-empty string' }]
          });
        }

        let updatedCharge;
        try {
          updatedCharge = await billingStore.updateCharge(request.tenant_id, charge.charge_id, {
            status: 'collection_requested'
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        const dispatchCommand = createBillingCollectionDispatchCommand(
          updatedCharge ?? charge,
          {
            recipient: { phone_e164: phone },
            message
          },
          correlationId,
          traceId
        );
        const commandValidation = orchestrationCommandValid(dispatchCommand);
        if (!commandValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: commandValidation.errors
          });
        }

        const commandPersistError = await persistCommandSafely(store, dispatchCommand);
        if (commandPersistError) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(commandPersistError.message ?? commandPersistError)
          });
        }

        const collectionRequestedEvent = createBillingEvent(
          'billing.collection.requested',
          updatedCharge ?? charge,
          correlationId,
          traceId,
          dispatchCommand.command_id
        );
        const payloadValidation = billingLifecycleEventPayloadValid({
          name: collectionRequestedEvent.name,
          payload: collectionRequestedEvent.payload
        });
        if (!payloadValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: payloadValidation.errors
          });
        }

        const eventResult = await validateAndPersistEvent(store, collectionRequestedEvent);
        if (!eventResult.ok) {
          return json(res, 500, {
            error: eventResult.type,
            details: eventResult.details
          });
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'collection_requested',
            charge: updatedCharge ?? charge,
            orchestration: {
              command_id: dispatchCommand.command_id,
              correlation_id: correlationId,
              lifecycle_event_name: collectionRequestedEvent.name
            }
          }
        });
      }

      if (method === 'POST' && path === '/v1/billing/payments') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = paymentCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const charge = await billingStore.getChargeById(
          request.tenant_id,
          request.payment.charge_id
        );
        if (!charge) {
          return json(res, 404, { error: 'charge_not_found' });
        }

        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();

        let paymentResult;
        try {
          paymentResult = await billingStore.createPayment({
            payment_id: request.payment.payment_id ?? randomUUID(),
            charge_id: request.payment.charge_id,
            tenant_id: request.tenant_id,
            external_key: request.payment.external_key ?? null,
            amount: request.payment.amount,
            currency: request.payment.currency,
            paid_at: request.payment.paid_at ?? new Date().toISOString(),
            status: request.payment.status,
            metadata: request.payment.metadata ?? {}
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        let chargeAfterPayment = charge;
        let lifecycleEventName = null;
        if (paymentResult.action !== 'idempotent') {
          const nextChargeStatus = paymentResult.payment.status === 'confirmed' ? 'paid' : 'failed';
          try {
            chargeAfterPayment = await billingStore.updateCharge(
              request.tenant_id,
              request.payment.charge_id,
              { status: nextChargeStatus }
            ) ?? charge;
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }

          if (paymentResult.payment.status === 'confirmed') {
            const paymentConfirmedEvent = createBillingEvent(
              'billing.payment.confirmed',
              chargeAfterPayment,
              correlationId,
              traceId,
              undefined,
              {
                payment_id: paymentResult.payment.payment_id,
                amount: paymentResult.payment.amount,
                currency: paymentResult.payment.currency,
                paid_at: paymentResult.payment.paid_at
              }
            );
            const payloadValidation = billingLifecycleEventPayloadValid({
              name: paymentConfirmedEvent.name,
              payload: paymentConfirmedEvent.payload
            });
            if (!payloadValidation.ok) {
              return json(res, 500, {
                error: 'contract_generation_error',
                details: payloadValidation.errors
              });
            }
            const eventResult = await validateAndPersistEvent(store, paymentConfirmedEvent);
            if (!eventResult.ok) {
              return json(res, 500, {
                error: eventResult.type,
                details: eventResult.details
              });
            }
            lifecycleEventName = paymentConfirmedEvent.name;
          }
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: paymentResult.action,
            payment: paymentResult.payment,
            charge: chargeAfterPayment,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'GET' && path === '/v1/billing/charges') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const items = await billingStore.listCharges(tenantId);
        const response = {
          tenant_id: tenantId,
          count: items.length,
          items
        };
        const validation = chargeListValid(response);
        if (!validation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: validation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/agenda/appointments') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = appointmentCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const startAt = new Date(request.appointment.start_at).getTime();
        const endAt = request.appointment.end_at
          ? new Date(request.appointment.end_at).getTime()
          : null;
        if (endAt !== null && Number.isFinite(startAt) && Number.isFinite(endAt) && endAt < startAt) {
          return json(res, 400, {
            error: 'validation_error',
            details: [{
              instancePath: '/request/appointment/end_at',
              message: 'must be greater than or equal to start_at'
            }]
          });
        }

        let createResult;
        try {
          createResult = await agendaStore.createAppointment({
            appointment_id: request.appointment.appointment_id ?? randomUUID(),
            tenant_id: request.tenant_id,
            external_key: request.appointment.external_key ?? null,
            title: request.appointment.title,
            description: request.appointment.description ?? '',
            start_at: request.appointment.start_at,
            end_at: request.appointment.end_at ?? null,
            timezone: request.appointment.timezone,
            status: request.appointment.status ?? 'scheduled',
            metadata: request.appointment.metadata ?? {}
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: createResult.action,
            appointment: createResult.appointment
          }
        });
      }

      if (method === 'PATCH' && path.startsWith('/v1/agenda/appointments/')) {
        const appointmentId = path.slice('/v1/agenda/appointments/'.length);
        if (!appointmentId) {
          return json(res, 400, { error: 'missing_appointment_id' });
        }

        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = appointmentUpdateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        let updated;
        try {
          updated = await agendaStore.updateAppointment(
            request.tenant_id,
            appointmentId,
            request.changes
          );
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        if (!updated) {
          return json(res, 404, { error: 'not_found' });
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'updated',
            appointment: updated
          }
        });
      }

      if (method === 'POST' && path === '/v1/agenda/reminders') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = reminderCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const appointment = await agendaStore.getAppointmentById(
          request.tenant_id,
          request.reminder.appointment_id
        );
        if (!appointment) {
          return json(res, 404, {
            error: 'appointment_not_found',
            details: request.reminder.appointment_id
          });
        }

        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();

        let reminderResult;
        try {
          reminderResult = await agendaStore.createReminder({
            reminder_id: request.reminder.reminder_id ?? randomUUID(),
            appointment_id: request.reminder.appointment_id,
            tenant_id: request.tenant_id,
            external_key: request.reminder.external_key ?? null,
            schedule_at: request.reminder.schedule_at,
            channel: request.reminder.channel,
            message: request.reminder.message,
            recipient: request.reminder.recipient ?? {},
            status: 'scheduled',
            metadata: request.reminder.metadata ?? {}
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        const lifecycleEvents = [];
        let dispatchCommandId = null;
        const reminder = reminderResult.reminder;

        if (reminderResult.action !== 'idempotent') {
          const scheduledEvent = createAgendaReminderEvent(
            'agenda.reminder.scheduled',
            reminder,
            correlationId,
            traceId
          );
          const scheduledPayloadValidation = reminderLifecycleEventPayloadValid({
            name: scheduledEvent.name,
            payload: {
              ...scheduledEvent.payload,
              status: 'scheduled'
            }
          });
          if (!scheduledPayloadValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: scheduledPayloadValidation.errors
            });
          }

          const scheduledEventResult = await validateAndPersistEvent(store, scheduledEvent);
          if (!scheduledEventResult.ok) {
            return json(res, 500, {
              error: scheduledEventResult.type,
              details: scheduledEventResult.details
            });
          }
          lifecycleEvents.push(scheduledEvent.name);

          if (reminder.channel === 'whatsapp') {
            const dispatchCommand = createAgendaReminderDispatchCommand(reminder, correlationId, traceId);
            const dispatchValidation = orchestrationCommandValid(dispatchCommand);
            if (!dispatchValidation.ok) {
              return json(res, 500, {
                error: 'contract_generation_error',
                details: dispatchValidation.errors
              });
            }

            const dispatchPersistError = await persistCommandSafely(store, dispatchCommand);
            if (dispatchPersistError) {
              return json(res, 500, {
                error: 'storage_error',
                details: String(dispatchPersistError.message ?? dispatchPersistError)
              });
            }
            dispatchCommandId = dispatchCommand.command_id;

            await agendaStore.updateReminder(reminder.tenant_id, reminder.reminder_id, {
              status: 'dispatch_requested',
              dispatch_command_id: dispatchCommandId
            });
          }

          const sentEvent = createAgendaReminderEvent(
            'agenda.reminder.sent',
            reminder,
            correlationId,
            traceId,
            dispatchCommandId,
            { dispatch_command_id: dispatchCommandId }
          );
          const sentPayloadValidation = reminderLifecycleEventPayloadValid({
            name: sentEvent.name,
            payload: {
              ...sentEvent.payload,
              status: 'sent'
            }
          });
          if (!sentPayloadValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: sentPayloadValidation.errors
            });
          }

          const sentEventResult = await validateAndPersistEvent(store, sentEvent);
          if (!sentEventResult.ok) {
            return json(res, 500, {
              error: sentEventResult.type,
              details: sentEventResult.details
            });
          }
          lifecycleEvents.push(sentEvent.name);

          await agendaStore.updateReminder(reminder.tenant_id, reminder.reminder_id, {
            status: 'sent',
            dispatch_command_id: dispatchCommandId
          });
        }

        const finalReminder = await agendaStore.listReminders(request.tenant_id)
          .then((items) => items.find((item) => item.reminder_id === reminder.reminder_id) ?? reminder);

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: reminderResult.action,
            reminder: finalReminder,
            orchestration: {
              correlation_id: correlationId,
              dispatch_command_id: dispatchCommandId,
              lifecycle_events: lifecycleEvents
            }
          }
        });
      }

      if (method === 'GET' && path === '/v1/agenda/reminders') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const items = await agendaStore.listReminders(tenantId);
        const response = {
          tenant_id: tenantId,
          count: items.length,
          items
        };

        const validation = reminderListValid(response);
        if (!validation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: validation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/customers') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = customerCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const customerId = request.customer.customer_id ?? randomUUID();
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();

        const customerUpsertCommand = createCustomerUpsertCommandEnvelope(
          request,
          customerId,
          correlationId,
          traceId
        );
        const commandValidation = orchestrationCommandValid(customerUpsertCommand);
        if (!commandValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: commandValidation.errors
          });
        }
        const commandPersistError = await persistCommandSafely(store, customerUpsertCommand);
        if (commandPersistError) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(commandPersistError.message ?? commandPersistError)
          });
        }

        let upsertResult;
        try {
          upsertResult = await customerStore.upsertCustomer(
            mapCustomerCreateRequestToStoreRecord(request, customerId)
          );
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        let lifecycleEventName = null;
        if (upsertResult.action !== 'idempotent') {
          const lifecycleEvent = createCustomerLifecycleEvent(
            customerUpsertCommand,
            upsertResult.customer,
            upsertResult.action
          );
          const payloadValidation = customerLifecycleEventPayloadValid({
            name: lifecycleEvent.name,
            payload: lifecycleEvent.payload
          });
          if (!payloadValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: payloadValidation.errors
            });
          }

          const eventValidation = orchestrationEventValid(lifecycleEvent);
          if (!eventValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: eventValidation.errors
            });
          }

          const eventPersistError = await persistEventSafely(store, lifecycleEvent);
          if (eventPersistError) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(eventPersistError.message ?? eventPersistError)
            });
          }

          lifecycleEventName = lifecycleEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: upsertResult.action,
            customer: upsertResult.customer,
            orchestration: {
              command_id: customerUpsertCommand.command_id,
              correlation_id: customerUpsertCommand.correlation_id,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'GET' && path === '/v1/customers') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const items = await customerStore.listCustomers(tenantId);
        const response = {
          tenant_id: tenantId,
          count: items.length,
          items
        };
        const validation = customerListValid(response);
        if (!validation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: validation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'GET' && path.startsWith('/v1/customers/')) {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        const customerId = path.slice('/v1/customers/'.length);
        if (!customerId) {
          return json(res, 400, { error: 'missing_customer_id' });
        }

        const customer = await customerStore.getCustomerById(tenantId, customerId);
        if (!customer) {
          return json(res, 404, { error: 'not_found' });
        }

        return json(res, 200, { customer });
      }

      if (method === 'POST' && path === '/v1/owner-concierge/memory/entries') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = memoryEntryCreateValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        let embeddingResult;
        try {
          embeddingResult = await ownerEmbeddingProvider.resolveMemoryEmbedding({
            tenant_id: request.tenant_id,
            session_id: request.session_id,
            memory_id: request.memory.memory_id ?? null,
            content: request.memory.content,
            tags: request.memory.tags ?? [],
            embedding_ref: request.memory.embedding_ref ?? null
          });
        } catch (error) {
          return json(res, 500, {
            error: 'embedding_error',
            details: String(error.message ?? error)
          });
        }

        const metadata = {
          ...(request.memory.metadata ?? {}),
          embedding: {
            provider: embeddingResult.provider,
            model: embeddingResult.model,
            strategy: embeddingResult.strategy
          }
        };

        let createResult;
        try {
          createResult = await ownerMemoryStore.createEntry({
            memory_id: request.memory.memory_id ?? randomUUID(),
            tenant_id: request.tenant_id,
            session_id: request.session_id,
            external_key: request.memory.external_key ?? null,
            source: request.memory.source,
            content: request.memory.content,
            tags: request.memory.tags ?? [],
            salience_score: request.memory.salience_score ?? 0.5,
            embedding_ref: embeddingResult.embedding_ref,
            embedding_vector: embeddingResult.embedding_vector,
            metadata
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: createResult.action,
            entry: createResult.entry
          }
        });
      }

      if (method === 'GET' && path === '/v1/owner-concierge/memory/entries') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        const sessionId = parsedUrl.searchParams.get('session_id');
        const status = parsedUrl.searchParams.get('status');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        if (!sessionId) {
          return json(res, 400, { error: 'missing_session_id' });
        }

        const items = await ownerMemoryStore.listEntries(tenantId, {
          sessionId,
          status: status ?? undefined
        });
        const response = {
          tenant_id: tenantId,
          session_id: sessionId,
          count: items.length,
          items
        };
        const listValidation = memoryEntryListValid(response);
        if (!listValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: listValidation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/owner-concierge/context/promotions') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = contextPromotionValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const correlationId = request.correlation_id ?? randomUUID();
        const traceId = randomUUID();

        let promotionResult;
        try {
          promotionResult = await ownerMemoryStore.applyPromotion(
            request.tenant_id,
            request.memory_id,
            request.action,
            request.reason_code,
            request.metadata ?? {}
          );
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        if (!promotionResult.ok && promotionResult.code === 'not_found') {
          return json(res, 404, { error: 'not_found' });
        }
        if (!promotionResult.ok) {
          return json(res, 400, {
            error: 'transition_error',
            details: promotionResult
          });
        }

        let lifecycleEventName = null;
        if (request.action === 'promote') {
          const promotedEvent = createOwnerContextPromotedEvent(
            promotionResult.entry,
            correlationId,
            traceId
          );
          const eventResult = await validateAndPersistEvent(store, promotedEvent);
          if (!eventResult.ok) {
            return json(res, 500, {
              error: eventResult.type,
              details: eventResult.details
            });
          }
          lifecycleEventName = promotedEvent.name;
        }

        return json(res, 200, {
          response: {
            request_id: request.request_id,
            status: 'updated',
            action: request.action,
            entry: promotionResult.entry,
            orchestration: {
              correlation_id: correlationId,
              lifecycle_event_name: lifecycleEventName
            }
          }
        });
      }

      if (method === 'GET' && path === '/v1/owner-concierge/context/summary') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const summary = await ownerMemoryStore.getSummary(tenantId);
        const summaryValidation = contextSummaryValid(summary);
        if (!summaryValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: summaryValidation.errors
          });
        }

        return json(res, 200, summary);
      }

      if (method === 'POST' && path === '/v1/owner-concierge/context/retrieve') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = contextRetrievalRequestValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const retrieval = await ownerMemoryStore.retrieveContext(request.tenant_id, {
          ...request.query
        });

        const response = {
          request_id: request.request_id,
          tenant_id: request.tenant_id,
          status: 'ok',
          retrieval
        };
        const responseValidation = contextRetrievalResponseValid(response);
        if (!responseValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: responseValidation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'GET' && path === '/v1/owner-concierge/sessions') {
        const tenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        const limitRaw = Number(parsedUrl.searchParams.get('limit') ?? 20);
        const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 20, 200));
        const items = typeof shortMemoryStore.listSessions === 'function'
          ? shortMemoryStore.listSessions(tenantId, limit)
          : [];
        return json(res, 200, {
          tenant_id: tenantId,
          items
        });
      }

      if (method === 'GET' && path === '/v1/owner-concierge/session-turns') {
        const tenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        const sessionId = String(parsedUrl.searchParams.get('session_id') ?? '').trim();
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }
        if (!sessionId) {
          return json(res, 400, { error: 'missing_session_id' });
        }
        const limitRaw = Number(parsedUrl.searchParams.get('limit') ?? 80);
        const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 80, 400));
        const turns = typeof shortMemoryStore.getSessionTurns === 'function'
          ? shortMemoryStore.getSessionTurns(tenantId, sessionId, limit)
          : shortMemoryStore.getLastTurns(tenantId, sessionId, limit);

        return json(res, 200, {
          tenant_id: tenantId,
          session_id: sessionId,
          turns: Array.isArray(turns) ? turns : []
        });
      }

      if (method === 'POST' && path === '/v1/owner-concierge/interaction') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = ownerInteractionValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        let tenantRuntimeConfig;
        try {
          tenantRuntimeConfig = await resolveTenantRuntimeConfig(request.tenant_id);
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        const personaOverrides = mergePersonaOverrides(
          request.payload?.persona_overrides,
          tenantRuntimeConfig
        );
        const taskPlan = resolveTenantExecutionPlan(taskPlanner.plan(request), tenantRuntimeConfig);
        const policyDecision = createPolicyDecision(taskPlan);
        const requiresConfirmation = taskPlan?.execution_decision === 'confirm_required';
        if (requiresConfirmation) {
          let pendingCount = 0;
          try {
            pendingCount = await store.countPendingTaskConfirmations(request.tenant_id);
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }

          if (pendingCount >= ownerConfirmationConfig.maxPendingPerTenant) {
            return json(res, 429, {
              error: 'confirmation_queue_limit_reached',
              details: {
                tenant_id: request.tenant_id,
                pending_count: pendingCount,
                max_pending_per_tenant: ownerConfirmationConfig.maxPendingPerTenant,
                policy_decision: policyDecision
              }
            });
          }
        }

        const correlationId = randomUUID();
        const traceId = randomUUID();
        const ownerCommand = createOwnerCommandEnvelope(
          request,
          correlationId,
          traceId,
          personaOverrides
        );
        const ownerCommandValidation = orchestrationCommandValid(ownerCommand);
        if (!ownerCommandValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: ownerCommandValidation.errors
          });
        }
        const ownerPersistError = await persistCommandSafely(store, ownerCommand);
        if (ownerPersistError) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(ownerPersistError.message ?? ownerPersistError)
          });
        }

        const ownerCommandCreatedEvent = createOwnerCommandCreatedEvent(ownerCommand);
        const ownerEventResult = await validateAndPersistEvent(store, ownerCommandCreatedEvent);
        if (!ownerEventResult.ok) {
          return json(res, 500, {
            error: ownerEventResult.type,
            details: ownerEventResult.details
          });
        }

        const shouldCreateModuleTask = taskPlan?.execution_decision === 'allow';
        const moduleTaskCommand = shouldCreateModuleTask
          ? createModuleTaskCommand(request, ownerCommand, taskPlan)
          : null;
        let confirmationSummary;

        if (requiresConfirmation && taskPlan) {
          const confirmationInput = {
            tenant_id: request.tenant_id,
            reason_code: taskPlan.policy_reason_code ?? null,
            owner_command_ref: {
              command_id: ownerCommand.command_id,
              correlation_id: ownerCommand.correlation_id,
              trace_id: ownerCommand.trace_id
            },
            task_plan_ref: {
              target_module: taskPlan.target_module,
              task_type: taskPlan.task_type,
              priority: taskPlan.priority,
              simulate_failure: taskPlan.simulate_failure === true,
              route_rule_id: taskPlan.rule_id ?? null,
              policy_rule_id: taskPlan.policy_rule_id ?? null
            },
            request_snapshot: {
              request_id: request.request_id,
              session_id: request.session_id,
              channel: request.channel,
              text: String(request.payload?.text ?? ''),
              attachments_count: Array.isArray(request.payload?.attachments)
                ? request.payload.attachments.length
                : 0,
              persona_overrides: personaOverrides ?? null
            }
          };

          let confirmationRecord;
          try {
            confirmationRecord = await store.createTaskConfirmation(confirmationInput);
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }

          const requestedEvent = createOwnerConfirmationRequestedEvent(confirmationRecord);
          const requestedEventResult = await validateAndPersistEvent(store, requestedEvent);
          if (!requestedEventResult.ok) {
            return json(res, 500, {
              error: requestedEventResult.type,
              details: requestedEventResult.details
            });
          }

          confirmationSummary = createConfirmationSummary(confirmationRecord);
        }

        if (moduleTaskCommand) {
          const moduleTaskCommandValidation = orchestrationCommandValid(moduleTaskCommand);
          if (!moduleTaskCommandValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: moduleTaskCommandValidation.errors
            });
          }
          const moduleTaskPersistError = await persistCommandSafely(store, moduleTaskCommand);
          if (moduleTaskPersistError) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(moduleTaskPersistError.message ?? moduleTaskPersistError)
            });
          }

          const createdEvent = createModuleTaskCreatedEvent(moduleTaskCommand);
          const createdEventResult = await validateAndPersistEvent(store, createdEvent);
          if (!createdEventResult.ok) {
            return json(res, 500, {
              error: createdEventResult.type,
              details: createdEventResult.details
            });
          }

          try {
            await store.enqueueModuleTask(moduleTaskCommand, {
              simulateFailure: taskPlan?.simulate_failure === true
            });
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }
        }

        const session_state = ownerSessionStateFromRequest(request);
        const avatar_state = avatarStateFromRequest(request);
        const downstreamTasks = moduleTaskCommand
          ? [{
            task_id: moduleTaskCommand.payload.task_id,
            target_module: moduleTaskCommand.target_module,
            task_type: moduleTaskCommand.payload.task_type,
            status: 'queued'
          }]
          : undefined;

        let assistantOutput;
        if (request.operation === 'send_message') {
          try {
            const userText = String(request.payload?.text ?? '');
            let operationalContext = null;
            try {
              operationalContext = await buildOperationalContextForOwner(request.tenant_id, userText);
            } catch (_) {
              operationalContext = null;
            }
            let shortMemory = [];
            try {
              shortMemory = shortMemoryStore.getLastTurns(request.tenant_id, request.session_id, 20);
            } catch (_) {
              shortMemory = [];
            }
            let retrievedContext = null;
            try {
              const retrieval = await ownerMemoryStore.retrieveContext(request.tenant_id, {
                text: userText,
                top_k: 5
              });
              const items = retrieval?.items ?? [];
              if (items.length > 0) {
                const parts = items
                  .filter((it) => typeof it?.content === 'string' && it.content.trim().length > 0)
                  .map((it, i) => `[${i + 1}] ${it.content.trim()}`)
                  .slice(0, 5);
                if (parts.length > 0) {
                  retrievedContext = parts.join('\n\n');
                }
              }
            } catch (_) {
              retrievedContext = null;
            }
            let episodeContext = null;
            try {
              const episodes = episodeStore.listEpisodes(request.tenant_id, {
                session_id: request.session_id,
                limit: 5
              });
              if (Array.isArray(episodes) && episodes.length > 0) {
                const lines = episodes.map((e) => {
                  const at = e.created_at ? ` at ${e.created_at}` : '';
                  const sum = typeof e.summary === 'string' && e.summary.trim() ? `: ${e.summary.trim().slice(0, 100)}` : '';
                  return `- Turn ${e.turn_count ?? '?'}${at}${sum}`;
                });
                episodeContext = lines.join('\n');
              }
            } catch (_) {
              episodeContext = null;
            }
            const tenantResponseProvider = getOwnerResponseProviderForTenant(tenantRuntimeConfig);
            assistantOutput = await tenantResponseProvider.generateAssistantOutput({
              text: userText,
              tenant_id: request.tenant_id,
              session_id: request.session_id,
              persona_overrides: personaOverrides,
              attachments: Array.isArray(request.payload?.attachments)
                ? request.payload.attachments
                : [],
              operational_context: operationalContext ?? undefined,
              short_memory: shortMemory.length > 0 ? shortMemory : undefined,
              retrieved_context: retrievedContext ?? undefined,
              episode_context: episodeContext ?? undefined
            });
            try {
              shortMemoryStore.appendTurn(request.tenant_id, request.session_id, { role: 'user', content: userText });
              shortMemoryStore.appendTurn(request.tenant_id, request.session_id, { role: 'assistant', content: assistantOutput?.text ?? '' });
              const episodeThreshold = Number(ownerEpisodeThreshold ?? 10) || 10;
              const turnCount = shortMemoryStore.getTurnCount(request.tenant_id, request.session_id);
              if (turnCount >= episodeThreshold && turnCount % episodeThreshold === 0) {
                const episodeEvent = createMemoryEpisodeCreatedEvent(
                  request.tenant_id,
                  request.session_id,
                  turnCount,
                  ownerCommand.command_id,
                  null
                );
                const episodeResult = await validateAndPersistEvent(store, episodeEvent);
                if (episodeResult.ok) {
                  try {
                    episodeStore.appendEpisode(request.tenant_id, request.session_id, {
                      turn_count: turnCount,
                      summary: null,
                      event_id: episodeEvent.event_id,
                      created_at: episodeEvent.emitted_at
                    });
                  } catch (_) {}
                  try {
                    const promotionContent = `Session milestone at turn ${turnCount} (session ${request.session_id}).`;
                    const embeddingResult = await ownerEmbeddingProvider.resolveMemoryEmbedding({
                      tenant_id: request.tenant_id,
                      session_id: request.session_id,
                      memory_id: null,
                      content: promotionContent,
                      tags: ['episode', 'milestone']
                    });
                    const externalKey = `episode_${request.tenant_id}_${request.session_id}_${turnCount}`;
                    const memoryId = randomUUID();
                    const createResult = await ownerMemoryStore.createEntry({
                      memory_id: memoryId,
                      tenant_id: request.tenant_id,
                      session_id: request.session_id,
                      external_key: externalKey,
                      source: 'episode_promotion',
                      content: promotionContent,
                      tags: ['episode', 'milestone'],
                      salience_score: 0.5,
                      embedding_ref: embeddingResult.embedding_ref,
                      embedding_vector: embeddingResult.embedding_vector,
                      metadata: { episode_event_id: episodeEvent.event_id }
                    });
                    if (createResult?.entry?.memory_id) {
                      const promotedEvent = createMemoryPromotedFromEpisodeEvent(
                        request.tenant_id,
                        request.session_id,
                        turnCount,
                        createResult.entry.memory_id,
                        episodeEvent.event_id
                      );
                      await validateAndPersistEvent(store, promotedEvent);
                    }
                  } catch (_) {}
                }
              }
            } catch (_) {}
          } catch (error) {
            return json(res, 502, {
              error: 'owner_response_provider_error',
              details: sanitizeProviderErrorDetails(error)
            });
          }
        } else {
          assistantOutput = {
            text: 'Operation accepted.',
            provider: 'none',
            model: null,
            latency_ms: 0,
            fallback_reason: 'non_message_operation'
          };
        }

        const response = {
          request_id: request.request_id,
          status: 'accepted',
          owner_command: {
            command_id: ownerCommand.command_id,
            correlation_id: ownerCommand.correlation_id,
            name: ownerCommand.name
          },
          session_state,
          avatar_state,
          assistant_output: assistantOutput,
          policy_decision: policyDecision
        };

        if (confirmationSummary) {
          response.confirmation = confirmationSummary;
        }
        if (downstreamTasks) {
          response.downstream_tasks = downstreamTasks;
        }

        const responseValidation = ownerInteractionResponseValid(response);
        if (!responseValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: responseValidation.errors
          });
        }

        return json(res, 200, { response });
      }

      if (method === 'GET' && path === '/v1/owner-concierge/interaction-confirmations') {
        const tenantId = parsedUrl.searchParams.get('tenant_id');
        if (!tenantId) {
          return json(res, 400, { error: 'missing_tenant_id' });
        }

        const statusFilter = parseConfirmationStatusFilter(parsedUrl.searchParams.get('status'));
        if (!statusFilter) {
          return json(res, 400, { error: 'invalid_status_filter' });
        }
        const listLimit = parseConfirmationListLimit(parsedUrl.searchParams.get('limit'), 50);
        if (!listLimit) {
          return json(res, 400, { error: 'invalid_limit' });
        }

        let items;
        try {
          items = await store.listTaskConfirmations(tenantId, {
            status: statusFilter,
            limit: listLimit
          });
        } catch (error) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(error.message ?? error)
          });
        }

        const response = {
          tenant_id: tenantId,
          status_filter: statusFilter,
          count: items.length,
          items: items.map((item) => createConfirmationSummary(item))
        };
        const responseValidation = interactionConfirmationListResponseValid(response);
        if (!responseValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: responseValidation.errors
          });
        }

        return json(res, 200, response);
      }

      if (method === 'POST' && path === '/v1/owner-concierge/interaction-confirmations') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = interactionConfirmationActionValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        const request = body.request;
        const existing = await store.getTaskConfirmation(request.tenant_id, request.confirmation_id);
        if (!existing) {
          return json(res, 404, { error: 'confirmation_not_found' });
        }
        if (existing.status !== 'pending') {
          return json(res, 409, {
            error: 'confirmation_not_pending',
            status: existing.status
          });
        }
        if (isConfirmationExpired(existing, ownerConfirmationConfig.ttlSeconds)) {
          const expired = await store.resolveTaskConfirmation(
            request.tenant_id,
            request.confirmation_id,
            {
              status: 'rejected',
              action: 'reject',
              actor_session_id: request.session_id,
              resolution_reason: 'expired_ttl'
            }
          );
          if (!expired) {
            return json(res, 500, {
              error: 'storage_error',
              details: `unable_to_resolve_expired_confirmation:${request.confirmation_id}`
            });
          }

          const expiredEvent = createOwnerConfirmationRejectedEvent(expired);
          const expiredEventResult = await validateAndPersistEvent(store, expiredEvent);
          if (!expiredEventResult.ok) {
            return json(res, 500, {
              error: expiredEventResult.type,
              details: expiredEventResult.details
            });
          }

          return json(res, 409, {
            error: 'confirmation_expired',
            confirmation: createConfirmationSummary(expired)
          });
        }

        if (request.decision === 'approve') {
          const moduleTaskCommand = createModuleTaskCommandFromConfirmation(existing, request.session_id);
          const moduleTaskCommandValidation = orchestrationCommandValid(moduleTaskCommand);
          if (!moduleTaskCommandValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: moduleTaskCommandValidation.errors
            });
          }

          const moduleTaskPersistError = await persistCommandSafely(store, moduleTaskCommand);
          if (moduleTaskPersistError) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(moduleTaskPersistError.message ?? moduleTaskPersistError)
            });
          }

          const createdEvent = createModuleTaskCreatedEvent(moduleTaskCommand);
          const createdEventResult = await validateAndPersistEvent(store, createdEvent);
          if (!createdEventResult.ok) {
            return json(res, 500, {
              error: createdEventResult.type,
              details: createdEventResult.details
            });
          }

          try {
            await store.enqueueModuleTask(moduleTaskCommand, {
              simulateFailure: existing.task_plan_ref?.simulate_failure === true
            });
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }

          const resolved = await store.resolveTaskConfirmation(
            request.tenant_id,
            request.confirmation_id,
            {
              status: 'approved',
              action: 'approve',
              actor_session_id: request.session_id,
              resolution_reason: request.resolution_reason ?? null,
              module_task: {
                task_id: moduleTaskCommand.payload.task_id,
                target_module: moduleTaskCommand.target_module,
                task_type: moduleTaskCommand.payload.task_type,
                status: 'queued'
              }
            }
          );
          if (!resolved) {
            return json(res, 500, {
              error: 'storage_error',
              details: `unable_to_resolve_confirmation:${request.confirmation_id}`
            });
          }

          const approvedEvent = createOwnerConfirmationApprovedEvent(resolved, moduleTaskCommand);
          const approvedEventResult = await validateAndPersistEvent(store, approvedEvent);
          if (!approvedEventResult.ok) {
            return json(res, 500, {
              error: approvedEventResult.type,
              details: approvedEventResult.details
            });
          }

          const response = {
            request_id: request.request_id,
            status: 'accepted',
            confirmation: createConfirmationSummary(resolved),
            downstream_task: {
              task_id: moduleTaskCommand.payload.task_id,
              target_module: moduleTaskCommand.target_module,
              task_type: moduleTaskCommand.payload.task_type,
              status: 'queued'
            }
          };

          const responseValidation = interactionConfirmationActionResponseValid(response);
          if (!responseValidation.ok) {
            return json(res, 500, {
              error: 'contract_generation_error',
              details: responseValidation.errors
            });
          }

          return json(res, 200, { response });
        }

        const resolved = await store.resolveTaskConfirmation(
          request.tenant_id,
          request.confirmation_id,
          {
            status: 'rejected',
            action: 'reject',
            actor_session_id: request.session_id,
            resolution_reason: request.resolution_reason ?? null
          }
        );
        if (!resolved) {
          return json(res, 500, {
            error: 'storage_error',
            details: `unable_to_resolve_confirmation:${request.confirmation_id}`
          });
        }

        const rejectedEvent = createOwnerConfirmationRejectedEvent(resolved);
        const rejectedEventResult = await validateAndPersistEvent(store, rejectedEvent);
        if (!rejectedEventResult.ok) {
          return json(res, 500, {
            error: rejectedEventResult.type,
            details: rejectedEventResult.details
          });
        }

        const response = {
          request_id: request.request_id,
          status: 'accepted',
          confirmation: createConfirmationSummary(resolved)
        };
        const responseValidation = interactionConfirmationActionResponseValid(response);
        if (!responseValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: responseValidation.errors
          });
        }
        return json(res, 200, { response });
      }

      if (method === 'POST' && path === '/provider/evolution/webhook') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const strictValidation = evolutionWebhookValid(body);
        const shouldTryRawNormalization = (
          body &&
          typeof body === 'object' &&
          !Array.isArray(body) &&
          (Object.prototype.hasOwnProperty.call(body, 'event') || Object.prototype.hasOwnProperty.call(body, 'data')) &&
          !Object.prototype.hasOwnProperty.call(body, 'provider')
        );
        const normalizedBody = strictValidation.ok
          ? body
          : (shouldTryRawNormalization ? normalizeEvolutionWebhookInput(body) : body);
        const validation = evolutionWebhookValid(normalizedBody);
        if (!validation.ok || !normalizedBody) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        let inboundResult = null;
        let autoReplyResult = null;
        let deliveryUpdateResult = null;
        let inboundConversation = null;
        if (
          normalizedBody.event_type === 'message.inbound' &&
          typeof normalizedBody.payload?.from_e164 === 'string' &&
          normalizedBody.payload.from_e164.length > 0
        ) {
          try {
            const phoneE164 = normalizedBody.payload.from_e164;
            const rawName = firstNonEmptyString([
              body?.data?.pushName,
              body?.data?.notifyName,
              body?.pushName
            ]);
            const fallbackName = `Lead ${phoneE164.slice(-4)}`;
            const leadCreateResult = await leadStore.createLead({
              lead_id: randomUUID(),
              tenant_id: normalizedBody.tenant_id,
              external_key: `wa:${phoneE164}`,
              display_name: rawName || fallbackName,
              phone_e164: phoneE164,
              source_channel: 'whatsapp',
              stage: 'new',
              metadata: {
                origin: 'evolution_webhook',
                message_id: normalizedBody.payload.message_id,
                event_type: normalizedBody.event_type
              }
            });

            let lifecycleEventName = null;
            if (leadCreateResult.action !== 'idempotent') {
              const leadCreatedEvent = createCrmLeadCreatedEvent(
                leadCreateResult.lead,
                normalizedBody.correlation_id ?? randomUUID(),
                normalizedBody.trace_id ?? `trace-${randomUUID().slice(0, 12)}`
              );
              const eventResult = await validateAndPersistEvent(store, leadCreatedEvent);
              if (!eventResult.ok) {
                return json(res, 500, {
                  error: eventResult.type,
                  details: eventResult.details
                });
              }
              lifecycleEventName = leadCreatedEvent.name;
            }

            inboundResult = {
              status: leadCreateResult.action,
              lead_id: leadCreateResult.lead?.lead_id ?? null,
              lifecycle_event_name: lifecycleEventName
            };

            const inboundOccurredAt = new Date().toISOString();
            const persistedInbound = await crmConversationStore.upsertInboundMessage({
              tenant_id: normalizedBody.tenant_id,
              contact_e164: phoneE164,
              display_name: rawName || fallbackName,
              lead_id: leadCreateResult.lead?.lead_id ?? null,
              provider: normalizedBody.provider ?? 'evolution-api',
              provider_message_id: normalizedBody.payload.message_id,
              message_type: normalizedBody.payload.message_type ?? 'text',
              text: normalizedBody.payload.text ?? '',
              delivery_state: normalizedBody.payload.delivery_state ?? 'received',
              occurred_at: inboundOccurredAt,
              metadata: {
                source: 'evolution_webhook_inbound',
                provider_occurred_at: normalizedBody.occurred_at ?? null
              }
            });
            inboundConversation = persistedInbound?.conversation ?? null;

            const fromMe = Boolean(
              body?.data?.key?.fromMe
              ?? normalizedBody?.payload?.raw?.data?.key?.fromMe
            );
            if (!fromMe) {
              const evolutionRuntime = await resolveEvolutionRuntimeConfig(normalizedBody.tenant_id);
              if (!evolutionRuntime.autoReplyEnabled) {
                autoReplyResult = { status: 'disabled' };
              } else if (!evolutionRuntime.baseUrl || !evolutionRuntime.apiKey || !evolutionRuntime.instanceId) {
                autoReplyResult = {
                  status: 'failed',
                  error: 'evolution_not_configured'
                };
              } else {
                const recipientNumber = normalizeEvolutionRecipientNumber(phoneE164);
                if (!recipientNumber) {
                  autoReplyResult = {
                    status: 'failed',
                    error: 'invalid_recipient'
                  };
                } else {
                  try {
                    let autoReplyText = evolutionRuntime.autoReplyText;
                    let autoReplyMode = evolutionRuntime.autoReplyUseAi ? 'ai' : 'static';
                    let aiProvider = null;
                    let aiModel = null;
                    let aiError = null;

                    if (evolutionRuntime.autoReplyUseAi && inboundConversation?.conversation_id) {
                      try {
                        const tenantRuntimeConfig = await resolveTenantRuntimeConfig(normalizedBody.tenant_id);
                        const aiConfig = resolveCrmAiRuntimeConfig(tenantRuntimeConfig);
                        if (aiConfig.enabled && aiConfig.mode === 'assist_execute') {
                          const threadContext = await resolveCrmThreadContext(
                            normalizedBody.tenant_id,
                            inboundConversation.conversation_id
                          );
                          if (threadContext.ok) {
                            const contextPack = buildCrmAiContextPack(
                              threadContext.conversation,
                              threadContext.lead,
                              threadContext.messages
                            );
                            // Keep auto-reply neutral/virgin: only latest inbound signal, no long thread carry-over.
                            const latestInbound = [...(threadContext.messages ?? [])]
                              .reverse()
                              .find((item) => item?.direction === 'inbound');
                            const neutralContextPack = {
                              ...contextPack,
                              latest_outbound_text: '',
                              messages: latestInbound
                                ? [{
                                  direction: 'inbound',
                                  text: cleanShortText(latestInbound?.text ?? '', 600),
                                  occurred_at: latestInbound?.occurred_at ?? null,
                                  delivery_state: latestInbound?.delivery_state ?? 'unknown'
                                }]
                                : []
                            };
                            const provider = getOwnerResponseProviderForTenant(tenantRuntimeConfig);
                            const aiDraft = await generateCrmAiDraftReply({
                              provider,
                              aiConfig,
                              contextPack: neutralContextPack,
                              tone: 'consultivo'
                            });
                            const candidateReply = cleanShortText(aiDraft?.draftReply ?? '', 2000);
                            if (candidateReply) {
                              autoReplyText = candidateReply;
                              aiProvider = aiDraft?.provider ?? null;
                              aiModel = aiDraft?.model ?? null;
                            } else {
                              autoReplyMode = 'static_fallback';
                            }
                          } else {
                            autoReplyMode = 'static_fallback';
                            aiError = 'thread_context_unavailable';
                          }
                        } else {
                          autoReplyMode = 'static_fallback';
                          aiError = 'crm_ai_disabled_or_mode_blocked';
                        }
                      } catch (error) {
                        autoReplyMode = 'static_fallback';
                        aiError = truncateProviderErrorDetails(error?.message ?? error);
                      }
                    }

                    const sendResult = await sendEvolutionTextMessage({
                      baseUrl: evolutionRuntime.baseUrl,
                      apiKey: evolutionRuntime.apiKey,
                      instanceId: evolutionRuntime.instanceId,
                      number: recipientNumber,
                      text: autoReplyText
                    });
                    if (sendResult.ok) {
                      if (inboundConversation?.conversation_id) {
                        await crmConversationStore.appendOutboundMessage({
                          tenant_id: normalizedBody.tenant_id,
                          conversation_id: inboundConversation.conversation_id,
                          provider: 'evolution-api',
                          provider_message_id: sendResult.providerMessageId ?? null,
                          message_type: 'text',
                          text: autoReplyText,
                          delivery_state: 'sent',
                          occurred_at: new Date().toISOString(),
                          metadata: {
                            source: 'evolution_auto_reply',
                            auto_reply_mode: autoReplyMode,
                            ai_provider: aiProvider,
                            ai_model: aiModel,
                            ai_error: aiError,
                            fallback_payload_used: Boolean(sendResult.fallbackPayloadUsed)
                          }
                        });
                      }
                      autoReplyResult = {
                        status: 'sent',
                        instance_id: evolutionRuntime.instanceId,
                        mode: autoReplyMode,
                        provider: aiProvider,
                        model: aiModel,
                        ...(aiError ? { ai_error: aiError } : {}),
                        provider_message_id: sendResult.providerMessageId,
                        ...(sendResult.fallbackPayloadUsed ? { fallback_payload_used: true } : {})
                      };
                    } else {
                      if (inboundConversation?.conversation_id) {
                        await crmConversationStore.appendOutboundMessage({
                          tenant_id: normalizedBody.tenant_id,
                          conversation_id: inboundConversation.conversation_id,
                          provider: 'evolution-api',
                          provider_message_id: null,
                          message_type: 'text',
                          text: autoReplyText,
                          delivery_state: 'failed',
                          occurred_at: new Date().toISOString(),
                          metadata: {
                            source: 'evolution_auto_reply',
                            auto_reply_mode: autoReplyMode,
                            ai_provider: aiProvider,
                            ai_model: aiModel,
                            ai_error: aiError,
                            provider_status: sendResult.status ?? null,
                            provider_error: sendResult.errorDetails ?? null
                          }
                        });
                      }
                      autoReplyResult = {
                        status: 'failed',
                        error: 'provider_send_error',
                        mode: autoReplyMode,
                        provider: aiProvider,
                        model: aiModel,
                        ...(aiError ? { ai_error: aiError } : {}),
                        provider_status: sendResult.status,
                        details: sendResult.errorDetails
                      };
                    }
                  } catch (error) {
                    autoReplyResult = {
                      status: 'failed',
                      error: 'provider_unreachable',
                      details: truncateProviderErrorDetails(error?.message ?? error)
                    };
                  }
                }
              }
            } else {
              autoReplyResult = {
                status: 'skipped',
                reason: 'from_me_message'
              };
            }
          } catch (error) {
            return json(res, 500, {
              error: 'storage_error',
              details: String(error.message ?? error)
            });
          }
        }

        if (
          (
            normalizedBody.event_type === 'message.delivery_update' ||
            normalizedBody.event_type === 'message.read_update' ||
            normalizedBody.event_type === 'message.failed'
          ) &&
          typeof normalizedBody.payload?.message_id === 'string' &&
          normalizedBody.payload.message_id.length > 0
        ) {
          const nextState = (
            normalizedBody.payload.delivery_state
            ?? (normalizedBody.event_type === 'message.read_update' ? 'read' : null)
            ?? (normalizedBody.event_type === 'message.failed' ? 'failed' : null)
            ?? (normalizedBody.event_type === 'message.delivery_update' ? 'delivered' : null)
            ?? 'unknown'
          );
          const updateResult = await crmConversationStore.updateMessageDeliveryState(
            normalizedBody.tenant_id,
            normalizedBody.payload.message_id,
            nextState
          );
          deliveryUpdateResult = {
            status: updateResult.ok ? 'updated' : 'not_found',
            message_id: normalizedBody.payload.message_id,
            delivery_state: nextState
          };
        }

        return json(res, 200, {
          status: 'accepted',
          normalized: {
            tenant_id: normalizedBody.tenant_id,
            event_type: normalizedBody.event_type,
            message_id: normalizedBody.payload.message_id,
            delivery_state: normalizedBody.payload.delivery_state ?? 'unknown'
          },
          ...(inboundResult ? { inbound: inboundResult } : {}),
          ...(autoReplyResult ? { auto_reply: autoReplyResult } : {}),
          ...(deliveryUpdateResult ? { delivery_update: deliveryUpdateResult } : {})
        });
      }

      if (method === 'POST' && path === '/provider/evolution/outbound/validate') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = outboundQueueValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        return json(res, 200, {
          status: 'valid',
          queue_item_id: body.queue_item_id
        });
      }

      if (method === 'GET' && path === '/v1/whatsapp/evolution/qr') {
        const queryTenantId = String(parsedUrl.searchParams.get('tenant_id') ?? '').trim();
        const forceNewInstance = String(parsedUrl.searchParams.get('force_new') ?? '').trim() === '1';
        let baseUrl = '';
        let apiKey = '';
        let instanceId = '';
        if (queryTenantId) {
          try {
            const tenantConfig = await resolveTenantRuntimeConfig(queryTenantId);
            const ce = tenantConfig?.integrations?.crm_evolution;
            if (ce && typeof ce === 'object') {
              baseUrl = String(ce.base_url ?? '').trim();
              apiKey = String(ce.api_key ?? '').trim();
              instanceId = String(ce.instance_id ?? 'fabio').trim() || 'fabio';
            }
          } catch (_) {}
        }
        if (!baseUrl || !apiKey || !instanceId) {
          baseUrl = String(process.env.EVOLUTION_HTTP_BASE_URL ?? options.evolutionHttpBaseUrl ?? '').trim();
          apiKey = String(process.env.EVOLUTION_API_KEY ?? options.evolutionApiKey ?? '').trim();
          instanceId = String(process.env.EVOLUTION_INSTANCE_ID ?? options.evolutionInstanceId ?? 'fabio').trim() || 'fabio';
        }
        if (!baseUrl || !apiKey || !instanceId) {
          return json(res, 503, {
            error: 'evolution_not_configured',
            message: 'Configure no menu 06 Configuracoes (Evolution Base URL, API Key, Instance ID) ou env: EVOLUTION_HTTP_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_ID.'
          });
        }
        const baseUrlSanitized = baseUrl.replace(/\/$/, '');
        const evolutionConnectUrl = `${baseUrlSanitized}/instance/connect/${encodeURIComponent(instanceId)}`;
        const evolutionConnectionStateUrl = `${baseUrlSanitized}/instance/connectionState/${encodeURIComponent(instanceId)}`;
        const evolutionCreateUrl = `${baseUrlSanitized}/instance/create`;
        const headers = { apikey: apiKey };
        const connectOnce = async () => {
          const tryRequest = async (httpMethod) => {
            const evolutionRes = await fetch(evolutionConnectUrl, {
              method: httpMethod,
              headers
            });
            if (!evolutionRes.ok) {
              const text = await evolutionRes.text();
              return { ok: false, status: evolutionRes.status, details: text.slice(0, 500) };
            }
            const data = await evolutionRes.json();
            return { ok: true, data };
          };

          const getAttempt = await tryRequest('GET');
          if (getAttempt.ok) return getAttempt;

          if (getAttempt.status === 404 || getAttempt.status === 405) {
            const postAttempt = await tryRequest('POST');
            if (postAttempt.ok) return postAttempt;
            return postAttempt;
          }

          return getAttempt;
        };
        const fetchConnectionState = async () => {
          try {
            const stateRes = await fetch(evolutionConnectionStateUrl, {
              method: 'GET',
              headers
            });
            if (!stateRes.ok) {
              return null;
            }
            const stateData = await stateRes.json().catch(() => null);
            const rawState = firstNonEmptyString([
              stateData?.instance?.state,
              stateData?.state,
              stateData?.connectionState,
              stateData?.status
            ]);
            return rawState ? rawState.toLowerCase() : null;
          } catch {
            return null;
          }
        };
        try {
          let connectResult = { ok: false, status: 0, details: '' };
          let payload = { code: null, pairingCode: null, connectionState: null };

          if (!forceNewInstance) {
            connectResult = await connectOnce();
            payload = connectResult.ok
              ? extractEvolutionQrPayload(connectResult.data)
              : { code: null, pairingCode: null, connectionState: null };
            if (connectResult.ok && !payload.connectionState) {
              payload.connectionState = await fetchConnectionState();
            }
          }

          const shouldCreateInstance = forceNewInstance || !connectResult.ok;

          if (shouldCreateInstance) {
            try {
              const createRes = await fetch(evolutionCreateUrl, {
                method: 'POST',
                headers: {
                  ...headers,
                  'content-type': 'application/json'
                },
                body: JSON.stringify({
                  instanceName: instanceId,
                  qrcode: true,
                  integration: 'WHATSAPP-BAILEYS'
                })
              });
              if (createRes.ok) {
                const createBody = await createRes.json().catch(() => ({}));
                const createPayload = extractEvolutionQrPayload(createBody);
                if (!createPayload.connectionState) {
                  createPayload.connectionState = await fetchConnectionState();
                }
                if (createPayload.code || createPayload.pairingCode || createPayload.connectionState === 'open') {
                  payload = createPayload;
                }
              }
            } catch {
              // no-op: connect retry still attempted below.
            }

          }

          if (!payload.code && !payload.pairingCode && payload.connectionState !== 'open') {
            for (let attempt = 0; attempt < 16; attempt += 1) {
              await delayMs(1200);
              connectResult = await connectOnce();
              if (!connectResult.ok) {
                continue;
              }
              payload = extractEvolutionQrPayload(connectResult.data);
              if (!payload.connectionState) {
                payload.connectionState = await fetchConnectionState();
              }
              if (payload.code || payload.pairingCode || payload.connectionState === 'open') {
                break;
              }
            }
          }

          if (!payload.code && !payload.pairingCode && payload.connectionState !== 'open' && !connectResult.ok) {
            return json(res, connectResult.status >= 500 ? 502 : connectResult.status, {
              error: 'evolution_error',
              status: connectResult.status,
              details: connectResult.details
            });
          }

          let status = 'pending_qr';
          let message = 'QR ainda nao disponivel. Aguarde alguns segundos e clique novamente.';
          if (payload.base64 || payload.code || payload.pairingCode) {
            status = 'ready';
            message = 'Escaneie o QR com WhatsApp (Dispositivo vinculado) ou use o codigo de vinculacao.';
          } else if (payload.connectionState === 'open' || payload.connectionState === 'connected') {
            status = 'connected';
            message = 'Instancia ja conectada no WhatsApp. QR nao e necessario neste estado.';
          }

          return json(res, 200, {
            ...payload,
            instanceId,
            status,
            message
          });
        } catch (err) {
          return json(res, 502, {
            error: 'evolution_unreachable',
            details: String(err?.message ?? err)
          });
        }
      }

      return json(res, 404, { error: 'not_found' });
    } catch (error) {
      return json(res, 500, {
        error: 'runtime_error',
        details: String(error?.message ?? error)
      });
    }
  };

  handler.store = store;
  handler.customerStore = customerStore;
  handler.agendaStore = agendaStore;
  handler.billingStore = billingStore;
  handler.leadStore = leadStore;
  handler.crmAutomationStore = crmAutomationStore;
  handler.crmConversationStore = crmConversationStore;
  handler.ownerMemoryStore = ownerMemoryStore;
  handler.ownerMemoryMaintenanceStore = ownerMemoryMaintenanceStore;
  handler.tenantRuntimeConfigStore = tenantRuntimeConfigStore;
  handler.ownerResponseProvider = ownerResponseProvider;
  handler.crmAiAuditLog = crmAiAuditLog;
  return handler;
}

