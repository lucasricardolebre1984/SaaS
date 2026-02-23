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

export function createApp(options = {}) {
  const store = createOrchestrationStore({
    backend: options.orchestrationBackend,
    storageDir: options.orchestrationStorageDir ?? options.storageDir,
    logLimit: options.orchestrationLogLimit ?? ORCHESTRATION_LOG_LIMIT,
    pgConnectionString: options.orchestrationPgDsn,
    pgSchema: options.orchestrationPgSchema,
    pgAutoMigrate: options.orchestrationPgAutoMigrate
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
          orchestration: orchestrationInfo(store, taskPlanner.policyPath)
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
  return handler;
}
