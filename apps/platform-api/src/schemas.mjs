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
const customerCreateSchema = readJson('libs/mod-03-clientes/contracts/customer-create.schema.json');
const customerListSchema = readJson('libs/mod-03-clientes/contracts/customer-list.schema.json');
const customerEventsSchema = readJson('libs/mod-03-clientes/contracts/customer-events.schema.json');
const appointmentCreateSchema = readJson('libs/mod-04-agenda/contracts/appointment-create.schema.json');
const appointmentUpdateSchema = readJson('libs/mod-04-agenda/contracts/appointment-update.schema.json');
const reminderCreateSchema = readJson('libs/mod-04-agenda/contracts/reminder-create.schema.json');
const reminderListSchema = readJson('libs/mod-04-agenda/contracts/reminder-list.schema.json');
const reminderEventsSchema = readJson('libs/mod-04-agenda/contracts/reminder-events.schema.json');

ajv.addSchema(orchestrationBaseSchema, orchestrationBaseSchema.$id);

const validateOrchestrationCommand = ajv.compile(orchestrationCommandsSchema);
const validateOrchestrationEvent = ajv.compile(orchestrationEventsSchema);
const validateOwnerRequest = ajv.compile(multimodalApiSchema.properties.request);
const validateEvolutionWebhook = ajv.compile(evolutionWebhookSchema);
const validateOutboundQueue = ajv.compile(outboundQueueSchema);
const validateCustomerCreateRequest = ajv.compile(customerCreateSchema.properties.request);
const validateCustomerListResponse = ajv.compile(customerListSchema);
const validateCustomerLifecycleEventPayload = ajv.compile(customerEventsSchema);
const validateAppointmentCreateRequest = ajv.compile(appointmentCreateSchema.properties.request);
const validateAppointmentUpdateRequest = ajv.compile(appointmentUpdateSchema.properties.request);
const validateReminderCreateRequest = ajv.compile(reminderCreateSchema.properties.request);
const validateReminderListResponse = ajv.compile(reminderListSchema);
const validateReminderLifecycleEventPayload = ajv.compile(reminderEventsSchema);

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

export function customerCreateValid(body) {
  const ok = validateCustomerCreateRequest(body?.request);
  const errors = [...(validateCustomerCreateRequest.errors ?? [])];

  const request = body?.request;
  if (request?.origin === 'lead_conversion') {
    if (request.source_module !== 'mod-02-whatsapp-crm') {
      errors.push({
        instancePath: '/request/source_module',
        message: 'must be mod-02-whatsapp-crm when origin=lead_conversion'
      });
    }
    if (!request.lead || typeof request.lead !== 'object') {
      errors.push({
        instancePath: '/request/lead',
        message: 'must be provided when origin=lead_conversion'
      });
    } else if (typeof request.lead.lead_id !== 'string' || request.lead.lead_id.length === 0) {
      errors.push({
        instancePath: '/request/lead/lead_id',
        message: 'must be provided when origin=lead_conversion'
      });
    }
  }

  if (request?.origin === 'manual_owner' && request.source_module !== 'mod-01-owner-concierge') {
    errors.push({
      instancePath: '/request/source_module',
      message: 'must be mod-01-owner-concierge when origin=manual_owner'
    });
  }

  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function customerListValid(body) {
  const ok = validateCustomerListResponse(body);
  return { ok: Boolean(ok), errors: validateCustomerListResponse.errors ?? [] };
}

export function customerLifecycleEventPayloadValid(body) {
  const ok = validateCustomerLifecycleEventPayload(body);
  return { ok: Boolean(ok), errors: validateCustomerLifecycleEventPayload.errors ?? [] };
}

export function appointmentCreateValid(body) {
  const ok = validateAppointmentCreateRequest(body?.request);
  const errors = [...(validateAppointmentCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function appointmentUpdateValid(body) {
  const ok = validateAppointmentUpdateRequest(body?.request);
  const errors = [...(validateAppointmentUpdateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function reminderCreateValid(body) {
  const ok = validateReminderCreateRequest(body?.request);
  const errors = [...(validateReminderCreateRequest.errors ?? [])];
  const request = body?.request;

  if (request?.reminder?.channel === 'whatsapp') {
    const phone = request?.reminder?.recipient?.phone_e164;
    if (typeof phone !== 'string' || !/^\+[1-9][0-9]{7,14}$/.test(phone)) {
      errors.push({
        instancePath: '/request/reminder/recipient/phone_e164',
        message: 'must be valid e164 when channel=whatsapp'
      });
    }
  }

  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function reminderListValid(body) {
  const ok = validateReminderListResponse(body);
  return { ok: Boolean(ok), errors: validateReminderListResponse.errors ?? [] };
}

export function reminderLifecycleEventPayloadValid(body) {
  const ok = validateReminderLifecycleEventPayload(body);
  return { ok: Boolean(ok), errors: validateReminderLifecycleEventPayload.errors ?? [] };
}
