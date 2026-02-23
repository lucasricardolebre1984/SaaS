import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_LOG_LIMIT = 200;

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

export function createOrchestrationStore(options = {}) {
  const logLimit = Number(options.logLimit ?? DEFAULT_LOG_LIMIT);
  const storageDir = path.resolve(options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'orchestration'));
  ensureDirectory(storageDir);

  const commandsFilePath = path.join(storageDir, 'commands.ndjson');
  const eventsFilePath = path.join(storageDir, 'events.ndjson');
  const commands = loadNdjson(commandsFilePath, logLimit);
  const events = loadNdjson(eventsFilePath, logLimit);

  return {
    storageDir,
    commandsFilePath,
    eventsFilePath,
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
    }
  };
}
