import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const orchestrationBaseSchema = readJson('libs/core/orchestration-contracts/schemas/base.schema.json');
const orchestrationCommandsSchema = readJson('libs/core/orchestration-contracts/schemas/commands.schema.json');
const orchestrationEventsSchema = readJson('libs/core/orchestration-contracts/schemas/events.schema.json');
const multimodalApiSchema = readJson('libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json');
const evolutionWebhookSchema = readJson('libs/mod-02-whatsapp-crm/integration/evolution-webhook.schema.json');
const outboundQueueSchema = readJson('libs/mod-02-whatsapp-crm/integration/outbound-queue.schema.json');

ajv.addSchema(orchestrationBaseSchema, orchestrationBaseSchema.$id);

const validateOrchestrationCommand = ajv.compile(orchestrationCommandsSchema);
const validateOrchestrationEvent = ajv.compile(orchestrationEventsSchema);
const validateOwnerRequest = ajv.compile(multimodalApiSchema.properties.request);
const validateEvolutionWebhook = ajv.compile(evolutionWebhookSchema);
const validateOutboundQueue = ajv.compile(outboundQueueSchema);

function operationSpecificOwnerErrors(request) {
  const errors = [];
  if (!request || typeof request !== 'object') return errors;

  const op = request.operation;
  const payload = request.payload ?? {};

  if (op === 'send_message') {
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      errors.push({
        instancePath: '/request/payload/text',
        message: 'must be a non-empty string for send_message'
      });
    }
  }

  if (op === 'toggle_continuous_mode') {
    if (typeof payload.enabled !== 'boolean') {
      errors.push({
        instancePath: '/request/payload/enabled',
        message: 'must be a boolean for toggle_continuous_mode'
      });
    }
  }

  if (op === 'avatar_config_upsert') {
    if (typeof payload.enabled !== 'boolean') {
      errors.push({
        instancePath: '/request/payload/enabled',
        message: 'must be a boolean for avatar_config_upsert'
      });
    }
    if (typeof payload.avatar_asset_path !== 'string' || payload.avatar_asset_path.length === 0) {
      errors.push({
        instancePath: '/request/payload/avatar_asset_path',
        message: 'must be a non-empty string for avatar_config_upsert'
      });
    }
    if (typeof payload.persona_profile_path !== 'string' || payload.persona_profile_path.length === 0) {
      errors.push({
        instancePath: '/request/payload/persona_profile_path',
        message: 'must be a non-empty string for avatar_config_upsert'
      });
    }
  }

  return errors;
}

export function ownerInteractionValid(body) {
  const ok = validateOwnerRequest(body?.request);
  const errors = [...(validateOwnerRequest.errors ?? [])];
  errors.push(...operationSpecificOwnerErrors(body?.request));
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function evolutionWebhookValid(body) {
  const ok = validateEvolutionWebhook(body);
  return { ok: Boolean(ok), errors: validateEvolutionWebhook.errors ?? [] };
}

export function outboundQueueValid(body) {
  const ok = validateOutboundQueue(body);
  return { ok: Boolean(ok), errors: validateOutboundQueue.errors ?? [] };
}

export function orchestrationCommandValid(body) {
  const ok = validateOrchestrationCommand(body);
  return { ok: Boolean(ok), errors: validateOrchestrationCommand.errors ?? [] };
}

export function orchestrationEventValid(body) {
  const ok = validateOrchestrationEvent(body);
  return { ok: Boolean(ok), errors: validateOrchestrationEvent.errors ?? [] };
}
