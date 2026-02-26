import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_TURNS_PER_SESSION = 20;
const KEY_SEP = '|';

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

function sessionKey(tenantId, sessionId) {
  return `${String(tenantId ?? '')}${KEY_SEP}${String(sessionId ?? '')}`;
}

export function createOwnerShortMemoryStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'owner-short-memory')
  );
  ensureDirectory(storageDir);

  const dataFilePath = path.join(storageDir, 'sessions.json');
  const maxTurnsPerSession = Number(options.maxTurnsPerSession ?? DEFAULT_MAX_TURNS_PER_SESSION) || 20;

  let data = readJsonFile(dataFilePath, {});
  if (typeof data !== 'object' || data === null) {
    data = {};
  }

  function persist() {
    writeJsonFile(dataFilePath, data);
  }

  return {
    storageDir,

    appendTurn(tenantId, sessionId, turn) {
      const key = sessionKey(tenantId, sessionId);
      if (!key || key === KEY_SEP) return;
      const role = turn?.role === 'user' || turn?.role === 'assistant' ? turn.role : 'user';
      const content = typeof turn?.content === 'string' ? turn.content : String(turn?.content ?? '');
      if (!Array.isArray(data[key])) {
        data[key] = [];
      }
      data[key].push({
        role,
        content,
        ts: new Date().toISOString()
      });
      if (data[key].length > maxTurnsPerSession) {
        data[key] = data[key].slice(data[key].length - maxTurnsPerSession);
      }
      persist();
    },

    getLastTurns(tenantId, sessionId, limit = 20) {
      const key = sessionKey(tenantId, sessionId);
      if (!key || key === KEY_SEP) return [];
      const list = Array.isArray(data[key]) ? data[key] : [];
      const n = Math.min(Math.max(0, Number(limit) || 20), list.length);
      if (n <= 0) return [];
      const slice = list.slice(list.length - n);
      return slice.map((t) => ({ role: t.role, content: t.content ?? '' }));
    },

    getTurnCount(tenantId, sessionId) {
      const key = sessionKey(tenantId, sessionId);
      if (!key || key === KEY_SEP) return 0;
      const list = Array.isArray(data[key]) ? data[key] : [];
      return list.length;
    }
  };
}
