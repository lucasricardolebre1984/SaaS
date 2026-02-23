import { randomUUID } from 'node:crypto';
import {
  appointmentCreateValid,
  appointmentUpdateValid,
  billingLifecycleEventPayloadValid,
  chargeCreateValid,
  chargeListValid,
  chargeUpdateValid,
  contextPromotionValid,
  contextSummaryValid,
  customerCreateValid,
  customerLifecycleEventPayloadValid,
  customerListValid,
  evolutionWebhookValid,
  leadCreateValid,
  leadListValid,
  leadStageUpdateValid,
  memoryEntryCreateValid,
  memoryEntryListValid,
  outboundQueueValid,
  orchestrationCommandValid,
  orchestrationEventValid,
  ownerInteractionValid,
  paymentCreateValid,
  reminderCreateValid,
  reminderLifecycleEventPayloadValid,
  reminderListValid
} from './schemas.mjs';
import { createOrchestrationStore } from './orchestration-store.mjs';
import { createTaskPlanner } from './task-planner.mjs';
import { normalizeLeadStageForPublicEvent } from './lead-funnel.mjs';
import { createCustomerStore } from './customer-store.mjs';
import { createAgendaStore } from './agenda-store.mjs';
import { createBillingStore } from './billing-store.mjs';
import { createLeadStore } from './lead-store.mjs';
import { createOwnerMemoryStore } from './owner-memory-store.mjs';
import {
  mapCustomerCreateRequestToCommandPayload,
  mapCustomerCreateRequestToStoreRecord
} from './customer-mapper.mjs';

const ORCHESTRATION_SCHEMA_VERSION = '1.0.0';
const ORCHESTRATION_LOG_LIMIT = 200;

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
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

function createOwnerCommandEnvelope(request, correlationId, traceId) {
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

  const payload = {
    owner_command_id: request.request_id,
    text,
    mode
  };
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments;
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

function createModuleTaskCommand(request, ownerCommand, taskPlan) {
  if (!taskPlan) return null;
  const taskId = randomUUID();

  return {
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

function orchestrationInfo(store, policyPath) {
  if (store.backend === 'postgres') {
    return {
      backend: 'postgres',
      storage_dir: null,
      queue_file: null,
      policy_path: policyPath
    };
  }

  return {
    backend: 'file',
    storage_dir: store.storageDir,
    queue_file: store.queueFilePath,
    policy_path: policyPath
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

function ownerMemoryInfo(store) {
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
  const ownerMemoryStore = createOwnerMemoryStore({
    backend,
    storageDir: options.ownerMemoryStorageDir,
    pgConnectionString,
    pgSchema,
    pgAutoMigrate
  });
  const taskPlanner = createTaskPlanner({
    policyPath: options.taskRoutingPolicyPath
  });

  const handler = async function app(req, res) {
    const { method, url } = req;
    const parsedUrl = new URL(url ?? '/', 'http://localhost');
    const path = parsedUrl.pathname;

    try {
      if (method === 'GET' && path === '/health') {
        return json(res, 200, {
          status: 'ok',
          service: 'app-platform-api',
          orchestration: orchestrationInfo(store, taskPlanner.policyPath),
          customers: customerInfo(customerStore),
          agenda: agendaInfo(agendaStore),
          billing: billingInfo(billingStore),
          crm_leads: leadInfo(leadStore),
          owner_memory: ownerMemoryInfo(ownerMemoryStore)
        });
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
            embedding_ref: request.memory.embedding_ref ?? null,
            metadata: request.memory.metadata ?? {}
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
        const correlationId = randomUUID();
        const traceId = randomUUID();
        const ownerCommand = createOwnerCommandEnvelope(request, correlationId, traceId);
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

        const taskPlan = taskPlanner.plan(request);
        const moduleTaskCommand = createModuleTaskCommand(request, ownerCommand, taskPlan);
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
          assistant_output: {
            text: request.operation === 'send_message'
              ? 'Interaction accepted and task queued for worker processing.'
              : 'Operation accepted.'
          }
        };

        if (downstreamTasks) {
          response.downstream_tasks = downstreamTasks;
        }

        return json(res, 200, { response });
      }

      if (method === 'POST' && path === '/provider/evolution/webhook') {
        const body = await readJsonBody(req);
        if (body === null) {
          return json(res, 400, { error: 'invalid_json' });
        }

        const validation = evolutionWebhookValid(body);
        if (!validation.ok) {
          return json(res, 400, {
            error: 'validation_error',
            details: validation.errors
          });
        }

        return json(res, 200, {
          status: 'accepted',
          normalized: {
            tenant_id: body.tenant_id,
            event_type: body.event_type,
            message_id: body.payload.message_id,
            delivery_state: body.payload.delivery_state ?? 'unknown'
          }
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
  handler.ownerMemoryStore = ownerMemoryStore;
  return handler;
}
