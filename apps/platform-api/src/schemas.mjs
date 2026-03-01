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
const interactionConfirmationActionSchema = readJson(
  'libs/mod-01-owner-concierge/contracts/interaction-confirmation-action.schema.json'
);
const interactionConfirmationListSchema = readJson(
  'libs/mod-01-owner-concierge/contracts/interaction-confirmation-list.schema.json'
);
const memoryEntryCreateSchema = readJson('libs/mod-01-owner-concierge/contracts/memory-entry-create.schema.json');
const memoryEntryListSchema = readJson('libs/mod-01-owner-concierge/contracts/memory-entry-list.schema.json');
const contextPromotionSchema = readJson('libs/mod-01-owner-concierge/contracts/context-promotion.schema.json');
const contextSummarySchema = readJson('libs/mod-01-owner-concierge/contracts/context-summary.schema.json');
const contextRetrievalRequestSchema = readJson('libs/mod-01-owner-concierge/contracts/context-retrieval-request.schema.json');
const contextRetrievalResponseSchema = readJson('libs/mod-01-owner-concierge/contracts/context-retrieval-response.schema.json');
const evolutionWebhookSchema = readJson('libs/mod-02-whatsapp-crm/integration/evolution-webhook.schema.json');
const outboundQueueSchema = readJson('libs/mod-02-whatsapp-crm/integration/outbound-queue.schema.json');
const leadCreateSchema = readJson('libs/mod-02-whatsapp-crm/contracts/lead-create.schema.json');
const leadStageUpdateSchema = readJson('libs/mod-02-whatsapp-crm/contracts/lead-stage-update.schema.json');
const leadListSchema = readJson('libs/mod-02-whatsapp-crm/contracts/lead-list.schema.json');
const campaignCreateSchema = readJson('libs/mod-02-whatsapp-crm/contracts/campaign-create.schema.json');
const campaignStateUpdateSchema = readJson('libs/mod-02-whatsapp-crm/contracts/campaign-state-update.schema.json');
const campaignListSchema = readJson('libs/mod-02-whatsapp-crm/contracts/campaign-list.schema.json');
const followupCreateSchema = readJson('libs/mod-02-whatsapp-crm/contracts/followup-create.schema.json');
const followupListSchema = readJson('libs/mod-02-whatsapp-crm/contracts/followup-list.schema.json');
const crmAiSuggestReplySchema = readJson('libs/mod-02-whatsapp-crm/contracts/crm-ai-suggest-reply.schema.json');
const crmAiQualifySchema = readJson('libs/mod-02-whatsapp-crm/contracts/crm-ai-qualify.schema.json');
const crmAiExecuteSchema = readJson('libs/mod-02-whatsapp-crm/contracts/crm-ai-execute.schema.json');
const customerCreateSchema = readJson('libs/mod-03-clientes/contracts/customer-create.schema.json');
const customerListSchema = readJson('libs/mod-03-clientes/contracts/customer-list.schema.json');
const customerEventsSchema = readJson('libs/mod-03-clientes/contracts/customer-events.schema.json');
const appointmentCreateSchema = readJson('libs/mod-04-agenda/contracts/appointment-create.schema.json');
const appointmentUpdateSchema = readJson('libs/mod-04-agenda/contracts/appointment-update.schema.json');
const reminderCreateSchema = readJson('libs/mod-04-agenda/contracts/reminder-create.schema.json');
const reminderListSchema = readJson('libs/mod-04-agenda/contracts/reminder-list.schema.json');
const reminderEventsSchema = readJson('libs/mod-04-agenda/contracts/reminder-events.schema.json');
const chargeCreateSchema = readJson('libs/mod-05-faturamento-cobranca/contracts/charge-create.schema.json');
const chargeUpdateSchema = readJson('libs/mod-05-faturamento-cobranca/contracts/charge-update.schema.json');
const paymentCreateSchema = readJson('libs/mod-05-faturamento-cobranca/contracts/payment-create.schema.json');
const chargeListSchema = readJson('libs/mod-05-faturamento-cobranca/contracts/charge-list.schema.json');
const billingEventsSchema = readJson('libs/mod-05-faturamento-cobranca/contracts/billing-events.schema.json');

ajv.addSchema(orchestrationBaseSchema, orchestrationBaseSchema.$id);

const validateOrchestrationCommand = ajv.compile(orchestrationCommandsSchema);
const validateOrchestrationEvent = ajv.compile(orchestrationEventsSchema);
const validateOwnerRequest = ajv.compile(multimodalApiSchema.properties.request);
const validateOwnerResponse = ajv.compile(multimodalApiSchema.properties.response);
const validateInteractionConfirmationActionRequest = ajv.compile(
  interactionConfirmationActionSchema.properties.request
);
const validateInteractionConfirmationActionResponse = ajv.compile(
  interactionConfirmationActionSchema.properties.response
);
const validateInteractionConfirmationListResponse = ajv.compile(
  interactionConfirmationListSchema
);
const validateMemoryEntryCreateRequest = ajv.compile(memoryEntryCreateSchema.properties.request);
const validateMemoryEntryListResponse = ajv.compile(memoryEntryListSchema);
const validateContextPromotionRequest = ajv.compile(contextPromotionSchema.properties.request);
const validateContextSummaryResponse = ajv.compile(contextSummarySchema);
const validateContextRetrievalRequest = ajv.compile(contextRetrievalRequestSchema.properties.request);
const validateContextRetrievalResponse = ajv.compile(contextRetrievalResponseSchema);
const validateEvolutionWebhook = ajv.compile(evolutionWebhookSchema);
const validateOutboundQueue = ajv.compile(outboundQueueSchema);
const validateLeadCreateRequest = ajv.compile(leadCreateSchema.properties.request);
const validateLeadStageUpdateRequest = ajv.compile(leadStageUpdateSchema.properties.request);
const validateLeadListResponse = ajv.compile(leadListSchema);
const validateCampaignCreateRequest = ajv.compile(campaignCreateSchema.properties.request);
const validateCampaignStateUpdateRequest = ajv.compile(campaignStateUpdateSchema.properties.request);
const validateCampaignListResponse = ajv.compile(campaignListSchema);
const validateFollowupCreateRequest = ajv.compile(followupCreateSchema.properties.request);
const validateFollowupListResponse = ajv.compile(followupListSchema);
const validateCrmAiSuggestReplyRequest = ajv.compile(crmAiSuggestReplySchema.properties.request);
const validateCrmAiQualifyRequest = ajv.compile(crmAiQualifySchema.properties.request);
const validateCrmAiExecuteRequest = ajv.compile(crmAiExecuteSchema.properties.request);
const validateCustomerCreateRequest = ajv.compile(customerCreateSchema.properties.request);
const validateCustomerListResponse = ajv.compile(customerListSchema);
const validateCustomerLifecycleEventPayload = ajv.compile(customerEventsSchema);
const validateAppointmentCreateRequest = ajv.compile(appointmentCreateSchema.properties.request);
const validateAppointmentUpdateRequest = ajv.compile(appointmentUpdateSchema.properties.request);
const validateReminderCreateRequest = ajv.compile(reminderCreateSchema.properties.request);
const validateReminderListResponse = ajv.compile(reminderListSchema);
const validateReminderLifecycleEventPayload = ajv.compile(reminderEventsSchema);
const validateChargeCreateRequest = ajv.compile(chargeCreateSchema.properties.request);
const validateChargeUpdateRequest = ajv.compile(chargeUpdateSchema.properties.request);
const validatePaymentCreateRequest = ajv.compile(paymentCreateSchema.properties.request);
const validateChargeListResponse = ajv.compile(chargeListSchema);
const validateBillingLifecycleEventPayload = ajv.compile(billingEventsSchema);

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

    const personaOverrides = payload.persona_overrides;
    if (personaOverrides !== undefined) {
      if (!personaOverrides || typeof personaOverrides !== 'object' || Array.isArray(personaOverrides)) {
        errors.push({
          instancePath: '/request/payload/persona_overrides',
          message: 'must be an object when provided for send_message'
        });
      } else {
        const ownerPrompt = typeof personaOverrides.owner_concierge_prompt === 'string'
          ? personaOverrides.owner_concierge_prompt.trim()
          : '';
        const whatsappPrompt = typeof personaOverrides.whatsapp_agent_prompt === 'string'
          ? personaOverrides.whatsapp_agent_prompt.trim()
          : '';
        if (ownerPrompt.length === 0 && whatsappPrompt.length === 0) {
          errors.push({
            instancePath: '/request/payload/persona_overrides',
            message: 'must provide at least one non-empty persona prompt'
          });
        }
      }
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

export function ownerInteractionResponseValid(body) {
  const ok = validateOwnerResponse(body);
  return { ok: Boolean(ok), errors: validateOwnerResponse.errors ?? [] };
}

export function interactionConfirmationActionValid(body) {
  const ok = validateInteractionConfirmationActionRequest(body?.request);
  const errors = [...(validateInteractionConfirmationActionRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function interactionConfirmationActionResponseValid(body) {
  const ok = validateInteractionConfirmationActionResponse(body);
  return { ok: Boolean(ok), errors: validateInteractionConfirmationActionResponse.errors ?? [] };
}

export function interactionConfirmationListResponseValid(body) {
  const ok = validateInteractionConfirmationListResponse(body);
  return { ok: Boolean(ok), errors: validateInteractionConfirmationListResponse.errors ?? [] };
}

export function memoryEntryCreateValid(body) {
  const ok = validateMemoryEntryCreateRequest(body?.request);
  const errors = [...(validateMemoryEntryCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function memoryEntryListValid(body) {
  const ok = validateMemoryEntryListResponse(body);
  return { ok: Boolean(ok), errors: validateMemoryEntryListResponse.errors ?? [] };
}

export function contextPromotionValid(body) {
  const ok = validateContextPromotionRequest(body?.request);
  const errors = [...(validateContextPromotionRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function contextSummaryValid(body) {
  const ok = validateContextSummaryResponse(body);
  return { ok: Boolean(ok), errors: validateContextSummaryResponse.errors ?? [] };
}

export function contextRetrievalRequestValid(body) {
  const ok = validateContextRetrievalRequest(body?.request);
  const errors = [...(validateContextRetrievalRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function contextRetrievalResponseValid(body) {
  const ok = validateContextRetrievalResponse(body);
  return { ok: Boolean(ok), errors: validateContextRetrievalResponse.errors ?? [] };
}

export function evolutionWebhookValid(body) {
  const ok = validateEvolutionWebhook(body);
  return { ok: Boolean(ok), errors: validateEvolutionWebhook.errors ?? [] };
}

export function outboundQueueValid(body) {
  const ok = validateOutboundQueue(body);
  return { ok: Boolean(ok), errors: validateOutboundQueue.errors ?? [] };
}

export function leadCreateValid(body) {
  const ok = validateLeadCreateRequest(body?.request);
  const errors = [...(validateLeadCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function leadStageUpdateValid(body) {
  const ok = validateLeadStageUpdateRequest(body?.request);
  const errors = [...(validateLeadStageUpdateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function leadListValid(body) {
  const ok = validateLeadListResponse(body);
  return { ok: Boolean(ok), errors: validateLeadListResponse.errors ?? [] };
}

export function campaignCreateValid(body) {
  const ok = validateCampaignCreateRequest(body?.request);
  const errors = [...(validateCampaignCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function campaignStateUpdateValid(body) {
  const ok = validateCampaignStateUpdateRequest(body?.request);
  const errors = [...(validateCampaignStateUpdateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function campaignListValid(body) {
  const ok = validateCampaignListResponse(body);
  return { ok: Boolean(ok), errors: validateCampaignListResponse.errors ?? [] };
}

export function followupCreateValid(body) {
  const ok = validateFollowupCreateRequest(body?.request);
  const errors = [...(validateFollowupCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function followupListValid(body) {
  const ok = validateFollowupListResponse(body);
  return { ok: Boolean(ok), errors: validateFollowupListResponse.errors ?? [] };
}

export function crmAiSuggestReplyValid(body) {
  const ok = validateCrmAiSuggestReplyRequest(body?.request);
  const errors = [...(validateCrmAiSuggestReplyRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function crmAiQualifyValid(body) {
  const ok = validateCrmAiQualifyRequest(body?.request);
  const errors = [...(validateCrmAiQualifyRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function crmAiExecuteValid(body) {
  const ok = validateCrmAiExecuteRequest(body?.request);
  const errors = [...(validateCrmAiExecuteRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
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

export function chargeCreateValid(body) {
  const ok = validateChargeCreateRequest(body?.request);
  const errors = [...(validateChargeCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function chargeUpdateValid(body) {
  const ok = validateChargeUpdateRequest(body?.request);
  const errors = [...(validateChargeUpdateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function paymentCreateValid(body) {
  const ok = validatePaymentCreateRequest(body?.request);
  const errors = [...(validatePaymentCreateRequest.errors ?? [])];
  return { ok: Boolean(ok) && errors.length === 0, errors };
}

export function chargeListValid(body) {
  const ok = validateChargeListResponse(body);
  return { ok: Boolean(ok), errors: validateChargeListResponse.errors ?? [] };
}

export function billingLifecycleEventPayloadValid(body) {
  const ok = validateBillingLifecycleEventPayload(body);
  return { ok: Boolean(ok), errors: validateBillingLifecycleEventPayload.errors ?? [] };
}
