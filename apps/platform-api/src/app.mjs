import { randomUUID } from 'node:crypto';
import {
  evolutionWebhookValid,
  outboundQueueValid,
  orchestrationCommandValid,
  orchestrationEventValid,
  ownerInteractionValid
} from './schemas.mjs';
import { createOrchestrationStore } from './orchestration-store.mjs';
import { createTaskPlanner } from './task-planner.mjs';

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

function createModuleTaskEvents(moduleTaskCommand, fail) {
  if (!moduleTaskCommand) return [];

  const nowIso = new Date().toISOString();
  const taskId = moduleTaskCommand.payload.task_id;
  const sourceModule = moduleTaskCommand.target_module;
  const commonEnvelope = {
    schema_version: ORCHESTRATION_SCHEMA_VERSION,
    kind: 'event',
    tenant_id: moduleTaskCommand.tenant_id,
    correlation_id: moduleTaskCommand.correlation_id,
    trace_id: moduleTaskCommand.trace_id
  };

  const created = {
    ...commonEnvelope,
    event_id: randomUUID(),
    name: 'module.task.created',
    source_module: 'mod-01-owner-concierge',
    target_module: sourceModule,
    emitted_at: nowIso,
    causation_id: moduleTaskCommand.command_id,
    payload: {
      task_id: taskId,
      task_type: moduleTaskCommand.payload.task_type,
      target_module: sourceModule
    }
  };

  const accepted = {
    ...commonEnvelope,
    event_id: randomUUID(),
    name: 'module.task.accepted',
    source_module: sourceModule,
    target_module: 'mod-01-owner-concierge',
    emitted_at: nowIso,
    causation_id: moduleTaskCommand.command_id,
    status: 'accepted',
    payload: {
      task_id: taskId,
      accepted_by: `${sourceModule}-worker`
    }
  };

  if (fail) {
    return [
      created,
      accepted,
      {
        ...commonEnvelope,
        event_id: randomUUID(),
        name: 'module.task.failed',
        source_module: sourceModule,
        target_module: 'mod-01-owner-concierge',
        emitted_at: nowIso,
        causation_id: moduleTaskCommand.command_id,
        status: 'failed',
        payload: {
          task_id: taskId,
          error_code: 'SIMULATED_FAILURE',
          error_message: 'Simulated downstream task failure',
          retryable: true
        }
      }
    ];
  }

  return [
    created,
    accepted,
    {
      ...commonEnvelope,
      event_id: randomUUID(),
      name: 'module.task.completed',
      source_module: sourceModule,
      target_module: 'mod-01-owner-concierge',
      emitted_at: nowIso,
      causation_id: moduleTaskCommand.command_id,
      status: 'completed',
      payload: {
        task_id: taskId,
        result_summary: 'Task executed in runtime stub.',
        output_ref: `memory://task/${taskId}`
      }
    }
  ];
}

function persistCommand(store, command) {
  try {
    store.appendCommand(command);
    return null;
  } catch (error) {
    return error;
  }
}

function persistEvent(store, event) {
  try {
    store.appendEvent(event);
    return null;
  } catch (error) {
    return error;
  }
}

export function createApp(options = {}) {
  const store = createOrchestrationStore({
    storageDir: options.orchestrationStorageDir ?? options.storageDir,
    logLimit: options.orchestrationLogLimit ?? ORCHESTRATION_LOG_LIMIT
  });
  const taskPlanner = createTaskPlanner({
    policyPath: options.taskRoutingPolicyPath
  });

  return async function app(req, res) {
    const { method, url } = req;
    const parsedUrl = new URL(url ?? '/', 'http://localhost');
    const path = parsedUrl.pathname;

    if (method === 'GET' && path === '/health') {
      return json(res, 200, {
        status: 'ok',
        service: 'app-platform-api',
        orchestration: {
          storage_dir: store.storageDir,
          policy_path: taskPlanner.policyPath
        }
      });
    }

    if (method === 'GET' && path === '/internal/orchestration/commands') {
      const commands = store.getCommands();
      return json(res, 200, {
        count: commands.length,
        items: commands
      });
    }

    if (method === 'GET' && path === '/internal/orchestration/events') {
      const events = store.getEvents();
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

      const trace = store.getTrace(correlationId);
      return json(res, 200, {
        correlation_id: correlationId,
        commands: trace.commands,
        events: trace.events
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
      const ownerPersistError = persistCommand(store, ownerCommand);
      if (ownerPersistError) {
        return json(res, 500, {
          error: 'storage_error',
          details: String(ownerPersistError.message ?? ownerPersistError)
        });
      }

      const ownerCommandCreatedEvent = createOwnerCommandCreatedEvent(ownerCommand);
      const ownerCommandCreatedValidation = orchestrationEventValid(ownerCommandCreatedEvent);
      if (!ownerCommandCreatedValidation.ok) {
        return json(res, 500, {
          error: 'contract_generation_error',
          details: ownerCommandCreatedValidation.errors
        });
      }
      const ownerEventPersistError = persistEvent(store, ownerCommandCreatedEvent);
      if (ownerEventPersistError) {
        return json(res, 500, {
          error: 'storage_error',
          details: String(ownerEventPersistError.message ?? ownerEventPersistError)
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
        const moduleTaskPersistError = persistCommand(store, moduleTaskCommand);
        if (moduleTaskPersistError) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(moduleTaskPersistError.message ?? moduleTaskPersistError)
          });
        }
      }

      const moduleTaskEvents = createModuleTaskEvents(
        moduleTaskCommand,
        taskPlan?.simulate_failure === true
      );
      for (const evt of moduleTaskEvents) {
        const eventValidation = orchestrationEventValid(evt);
        if (!eventValidation.ok) {
          return json(res, 500, {
            error: 'contract_generation_error',
            details: eventValidation.errors
          });
        }
        const eventPersistError = persistEvent(store, evt);
        if (eventPersistError) {
          return json(res, 500, {
            error: 'storage_error',
            details: String(eventPersistError.message ?? eventPersistError)
          });
        }
      }

      const session_state = ownerSessionStateFromRequest(request);
      const avatar_state = avatarStateFromRequest(request);
      const downstreamTasks = moduleTaskCommand
        ? [{
          task_id: moduleTaskCommand.payload.task_id,
          target_module: moduleTaskCommand.target_module,
          task_type: moduleTaskCommand.payload.task_type
        }]
        : undefined;
      const failedModuleTask = moduleTaskEvents.find((item) => item.name === 'module.task.failed');

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
          text: failedModuleTask
            ? 'Interaction accepted. A downstream task failed in stub execution.'
            : request.operation === 'send_message'
              ? 'Interaction accepted for orchestration.'
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
  };
}
