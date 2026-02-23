import fs from 'node:fs';
import path from 'node:path';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function normalizeMode(mode) {
  if (mode == null || mode === '') return null;
  const normalized = String(mode).toLowerCase();
  if (
    normalized === 'auto'
    || normalized === 'openai'
    || normalized === 'local'
    || normalized === 'off'
  ) {
    return normalized;
  }
  return null;
}

function normalizeLimit(limit, fallback = 50) {
  const value = Number(limit ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('invalid_limit');
  }
  return Math.min(Math.floor(value), 500);
}

function normalizeInterval(intervalMinutes, fallback = null) {
  const value = Number(intervalMinutes ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('invalid_interval_minutes');
  }
  return Math.min(Math.floor(value), 1440);
}

function computeNextRunAt(baseIso, intervalMinutes) {
  const date = new Date(baseIso);
  date.setMinutes(date.getMinutes() + intervalMinutes);
  return date.toISOString();
}

export function createOwnerMemoryMaintenanceStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'owner-memory-maintenance')
  );
  ensureDirectory(storageDir);
  const schedulesFilePath = path.join(storageDir, 'reembed-schedules.json');
  const state = readJsonFile(schedulesFilePath, { items: [] });
  if (!Array.isArray(state.items)) {
    state.items = [];
  }

  function persist() {
    writeJsonFile(schedulesFilePath, state);
  }

  return {
    storageDir,
    schedulesFilePath,
    async upsertSchedule(input = {}) {
      const tenantId = String(input.tenant_id ?? '').trim();
      if (!tenantId) {
        throw new Error('missing_tenant_id');
      }

      const nowIso = new Date().toISOString();
      const existing = state.items.find((item) => item.tenant_id === tenantId) ?? null;
      const intervalMinutes = normalizeInterval(input.interval_minutes, existing?.interval_minutes ?? null);
      const limit = normalizeLimit(input.limit, existing?.limit ?? 50);
      const enabled = input.enabled == null ? (existing?.enabled ?? true) : input.enabled === true;
      const mode = normalizeMode(input.mode);
      if (input.mode != null && mode == null) {
        throw new Error('invalid_mode');
      }

      const shouldRunNow = input.run_now === true;
      const nextRunAt = enabled
        ? (
          shouldRunNow
            ? nowIso
            : (existing?.next_run_at ?? nowIso)
        )
        : null;

      const schedule = {
        tenant_id: tenantId,
        enabled,
        interval_minutes: intervalMinutes,
        limit,
        mode,
        created_at: existing?.created_at ?? nowIso,
        updated_at: nowIso,
        last_run_at: existing?.last_run_at ?? null,
        next_run_at: nextRunAt,
        last_result: existing?.last_result ?? null
      };

      if (existing) {
        const index = state.items.findIndex((item) => item.tenant_id === tenantId);
        state.items[index] = schedule;
      } else {
        state.items.push(schedule);
      }
      persist();
      return clone(schedule);
    },
    async listSchedules(tenantId = null) {
      return state.items
        .filter((item) => !tenantId || item.tenant_id === tenantId)
        .sort((a, b) => String(a.tenant_id).localeCompare(String(b.tenant_id)))
        .map(clone);
    },
    async listRunnableSchedules(options = {}) {
      const tenantId = options.tenant_id ? String(options.tenant_id).trim() : null;
      const force = options.force === true;
      const nowIso = options.now_iso ?? new Date().toISOString();
      const now = new Date(nowIso).getTime();

      return state.items
        .filter((item) => !tenantId || item.tenant_id === tenantId)
        .filter((item) => item.enabled === true)
        .filter((item) => {
          if (force) return true;
          if (!item.next_run_at) return false;
          const nextRunTs = new Date(item.next_run_at).getTime();
          return Number.isFinite(nextRunTs) && nextRunTs <= now;
        })
        .sort((a, b) => String(a.next_run_at ?? '').localeCompare(String(b.next_run_at ?? '')))
        .map(clone);
    },
    async markScheduleRun(tenantId, result = {}) {
      const id = String(tenantId ?? '').trim();
      const schedule = state.items.find((item) => item.tenant_id === id);
      if (!schedule) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = new Date().toISOString();
      schedule.last_run_at = nowIso;
      schedule.updated_at = nowIso;
      schedule.next_run_at = schedule.enabled
        ? computeNextRunAt(nowIso, schedule.interval_minutes)
        : null;
      schedule.last_result = {
        dry_run: result.dry_run === true,
        scanned_count: Number(result.scanned_count ?? 0),
        updated_count: Number(result.updated_count ?? 0),
        failed_count: Number(result.failed_count ?? 0),
        skipped_count: Number(result.skipped_count ?? 0),
        completed_at: nowIso
      };

      persist();
      return { ok: true, schedule: clone(schedule) };
    }
  };
}
