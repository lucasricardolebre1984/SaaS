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

function splitSessionKey(key) {
  const raw = String(key ?? '');
  const separatorIndex = raw.indexOf(KEY_SEP);
  if (separatorIndex < 0) {
    return { tenantId: '', sessionId: '' };
  }
  return {
    tenantId: raw.slice(0, separatorIndex),
    sessionId: raw.slice(separatorIndex + KEY_SEP.length)
  };
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
    },

    getSessionTurns(tenantId, sessionId, limit = 40) {
      const key = sessionKey(tenantId, sessionId);
      if (!key || key === KEY_SEP) return [];
      const list = Array.isArray(data[key]) ? data[key] : [];
      const n = Math.min(Math.max(0, Number(limit) || 40), list.length);
      if (n <= 0) return [];
      const slice = list.slice(list.length - n);
      return slice.map((t) => ({
        role: t.role,
        content: t.content ?? '',
        ts: typeof t.ts === 'string' ? t.ts : null
      }));
    },

    listSessions(tenantId, limit = 20) {
      const tenant = String(tenantId ?? '');
      if (!tenant) return [];
      const cap = Math.max(1, Math.min(Number(limit) || 20, 200));
      const sessions = Object.entries(data)
        .map(([key, turns]) => {
          const { tenantId: keyTenantId, sessionId: keySessionId } = splitSessionKey(key);
          if (keyTenantId !== tenant || !keySessionId) return null;
          const list = Array.isArray(turns) ? turns : [];
          const lastTurn = list.length > 0 ? list[list.length - 1] : null;
          return {
            session_id: keySessionId,
            turn_count: list.length,
            last_ts: typeof lastTurn?.ts === 'string' ? lastTurn.ts : null,
            last_role: typeof lastTurn?.role === 'string' ? lastTurn.role : null,
            last_preview: typeof lastTurn?.content === 'string'
              ? lastTurn.content.slice(0, 160)
              : ''
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aTs = Date.parse(a.last_ts ?? '');
          const bTs = Date.parse(b.last_ts ?? '');
          const aValue = Number.isFinite(aTs) ? aTs : 0;
          const bValue = Number.isFinite(bTs) ? bTs : 0;
          return bValue - aValue;
        });
      return sessions.slice(0, cap);
    }
  };
}
