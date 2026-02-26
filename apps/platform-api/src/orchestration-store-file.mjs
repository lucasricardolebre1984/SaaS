import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_LOG_LIMIT = 200;
const DEFAULT_QUEUE_HISTORY_LIMIT = 500;

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadNdjson(filePath, limit) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];

  const items = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      items.push(JSON.parse(line));
    } catch {
      // Keep runtime resilient when one line is corrupted.
    }
  }

  if (items.length <= limit) return items;
  return items.slice(items.length - limit);
}

function appendNdjson(filePath, value) {
  const line = `${JSON.stringify(value)}\n`;
  fs.appendFileSync(filePath, line, 'utf8');
}

function appendMemory(list, value, limit) {
  list.push(value);
  if (list.length > limit) {
    list.shift();
  }
}

function clone(value) {
  return structuredClone(value);
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

export function createFileOrchestrationStore(options = {}) {
  const logLimit = Number(options.logLimit ?? DEFAULT_LOG_LIMIT);
  const queueHistoryLimit = Number(options.queueHistoryLimit ?? DEFAULT_QUEUE_HISTORY_LIMIT);
  const storageDir = path.resolve(options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'orchestration'));
  ensureDirectory(storageDir);

  const commandsFilePath = path.join(storageDir, 'commands.ndjson');
  const eventsFilePath = path.join(storageDir, 'events.ndjson');
  const queueFilePath = path.join(storageDir, 'module-task-queue.json');
  const confirmationsFilePath = path.join(storageDir, 'task-confirmations.json');
  const commands = loadNdjson(commandsFilePath, logLimit);
  const events = loadNdjson(eventsFilePath, logLimit);
  const initialQueueState = readJsonFile(queueFilePath, { pending: [], history: [] });
  const initialConfirmationsState = readJsonFile(confirmationsFilePath, { pending: [], history: [] });
  const queueState = {
    pending: Array.isArray(initialQueueState.pending) ? initialQueueState.pending : [],
    history: Array.isArray(initialQueueState.history) ? initialQueueState.history : []
  };
  const confirmationsState = {
    pending: Array.isArray(initialConfirmationsState.pending)
      ? initialConfirmationsState.pending
      : [],
    history: Array.isArray(initialConfirmationsState.history)
      ? initialConfirmationsState.history
      : []
  };

  function persistQueueState() {
    if (queueState.history.length > queueHistoryLimit) {
      queueState.history = queueState.history.slice(queueState.history.length - queueHistoryLimit);
    }
    writeJsonFile(queueFilePath, queueState);
  }

  function persistConfirmationsState() {
    if (confirmationsState.history.length > queueHistoryLimit) {
      confirmationsState.history = confirmationsState.history.slice(
        confirmationsState.history.length - queueHistoryLimit
      );
    }
    writeJsonFile(confirmationsFilePath, confirmationsState);
  }

  return {
    backend: 'file',
    storageDir,
    commandsFilePath,
    eventsFilePath,
    queueFilePath,
    confirmationsFilePath,
    appendCommand(command) {
      appendNdjson(commandsFilePath, command);
      appendMemory(commands, command, logLimit);
    },
    appendEvent(event) {
      appendNdjson(eventsFilePath, event);
      appendMemory(events, event, logLimit);
    },
    getCommands() {
      return clone(commands);
    },
    getEvents() {
      return clone(events);
    },
    getTrace(correlationId) {
      return {
        commands: commands.filter((item) => item.correlation_id === correlationId).map(clone),
        events: events.filter((item) => item.correlation_id === correlationId).map(clone)
      };
    },
    enqueueModuleTask(command, options = {}) {
      const nowIso = new Date().toISOString();
      const item = {
        queue_item_id: randomUUID(),
        status: 'queued',
        enqueued_at: nowIso,
        updated_at: nowIso,
        simulate_failure: options.simulateFailure === true,
        command
      };
      queueState.pending.push(item);
      persistQueueState();
      return clone(item);
    },
    claimNextModuleTask() {
      const index = queueState.pending.findIndex((item) => item.status === 'queued');
      if (index < 0) return null;

      const nowIso = new Date().toISOString();
      queueState.pending[index].status = 'processing';
      queueState.pending[index].started_at = nowIso;
      queueState.pending[index].updated_at = nowIso;
      persistQueueState();
      return clone(queueState.pending[index]);
    },
    completeModuleTask(queueItemId, completion) {
      const index = queueState.pending.findIndex((item) => item.queue_item_id === queueItemId);
      if (index < 0) return null;

      const nowIso = new Date().toISOString();
      const item = queueState.pending[index];
      item.status = completion.status;
      item.updated_at = nowIso;
      item.finished_at = nowIso;
      if (completion.error_code) item.error_code = completion.error_code;
      if (completion.result_summary) item.result_summary = completion.result_summary;

      const finalized = queueState.pending.splice(index, 1)[0];
      queueState.history.push(finalized);
      persistQueueState();
      return clone(finalized);
    },
    getModuleTaskQueue() {
      return {
        pending: queueState.pending.map(clone),
        history: queueState.history.map(clone)
      };
    },
    createTaskConfirmation(input) {
      const nowIso = new Date().toISOString();
      const confirmation = {
        confirmation_id: randomUUID(),
        tenant_id: input.tenant_id,
        status: 'pending',
        reason_code: input.reason_code ?? null,
        owner_command_ref: clone(input.owner_command_ref),
        task_plan_ref: clone(input.task_plan_ref),
        request_snapshot: clone(input.request_snapshot),
        created_at: nowIso,
        updated_at: nowIso,
        resolved_at: null,
        resolution: null,
        module_task: null
      };
      confirmationsState.pending.push(confirmation);
      persistConfirmationsState();
      return clone(confirmation);
    },
    getTaskConfirmation(tenantId, confirmationId) {
      const pending = confirmationsState.pending.find(
        (item) => item.tenant_id === tenantId && item.confirmation_id === confirmationId
      );
      if (pending) return clone(pending);

      const history = confirmationsState.history.find(
        (item) => item.tenant_id === tenantId && item.confirmation_id === confirmationId
      );
      if (history) return clone(history);

      return null;
    },
    countPendingTaskConfirmations(tenantId) {
      return confirmationsState.pending.filter((item) => item.tenant_id === tenantId).length;
    },
    listTaskConfirmations(tenantId, options = {}) {
      const status = typeof options.status === 'string' ? options.status : 'all';
      const limit = Number.isFinite(Number(options.limit))
        ? Math.max(1, Math.min(200, Math.floor(Number(options.limit))))
        : 50;

      let items = [
        ...confirmationsState.pending,
        ...confirmationsState.history
      ].filter((item) => item.tenant_id === tenantId);

      if (status !== 'all') {
        items = items.filter((item) => item.status === status);
      }

      items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return items.slice(0, limit).map(clone);
    },
    resolveTaskConfirmation(tenantId, confirmationId, resolution) {
      const index = confirmationsState.pending.findIndex(
        (item) => item.tenant_id === tenantId && item.confirmation_id === confirmationId
      );
      if (index < 0) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const item = confirmationsState.pending[index];
      item.status = resolution.status;
      item.updated_at = nowIso;
      item.resolved_at = nowIso;
      item.resolution = {
        action: resolution.action,
        actor_session_id: resolution.actor_session_id,
        resolution_reason: resolution.resolution_reason ?? null
      };
      if (resolution.module_task) {
        item.module_task = clone(resolution.module_task);
      }

      const finalized = confirmationsState.pending.splice(index, 1)[0];
      confirmationsState.history.push(finalized);
      persistConfirmationsState();
      return clone(finalized);
    },
    async close() {}
  };
}
