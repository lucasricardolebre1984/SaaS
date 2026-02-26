import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_MAX_EPISODES_PER_TENANT = 500;

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) return fallbackValue;
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

export function createOwnerEpisodeStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'owner-episodes')
  );
  ensureDirectory(storageDir);

  const dataFilePath = path.join(storageDir, 'episodes.json');
  const maxPerTenant = Math.max(1, Number(options.maxEpisodesPerTenant ?? DEFAULT_MAX_EPISODES_PER_TENANT) || 500);

  let data = readJsonFile(dataFilePath, { items: [] });
  if (!Array.isArray(data.items)) data = { items: [] };

  function persist() {
    writeJsonFile(dataFilePath, data);
  }

  return {
    storageDir,

    appendEpisode(tenantId, sessionId, payload) {
      if (!tenantId || !sessionId) return;
      const episode = {
        episode_id: randomUUID(),
        tenant_id: String(tenantId),
        session_id: String(sessionId),
        turn_count: Math.max(1, Number(payload?.turn_count) ?? 1),
        summary: typeof payload?.summary === 'string' ? payload.summary : (payload?.summary ?? null),
        event_id: typeof payload?.event_id === 'string' ? payload.event_id : null,
        created_at: typeof payload?.created_at === 'string' ? payload.created_at : new Date().toISOString()
      };
      data.items.push(episode);
      const tenantEpisodes = data.items.filter((e) => e.tenant_id === episode.tenant_id);
      if (tenantEpisodes.length > maxPerTenant) {
        const toRemove = tenantEpisodes.length - maxPerTenant;
        const removed = new Set();
        let count = 0;
        for (let i = 0; i < data.items.length && count < toRemove; i++) {
          if (data.items[i].tenant_id === episode.tenant_id) {
            removed.add(data.items[i].episode_id);
            count++;
          }
        }
        data.items = data.items.filter((e) => !removed.has(e.episode_id));
      }
      persist();
    },

    listEpisodes(tenantId, opts = {}) {
      const sessionId = opts?.session_id ?? opts?.sessionId;
      const limit = Math.min(Math.max(0, Number(opts?.limit) ?? 50), 200);
      let list = data.items.filter((e) => e.tenant_id === tenantId);
      if (sessionId) list = list.filter((e) => e.session_id === sessionId);
      list = list.slice(-limit).reverse();
      return list;
    }
  };
}
