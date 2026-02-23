import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

function normalizeRunsLimit(limit, fallback = 50) {
  const value = Number(limit ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(value), 200);
}

function normalizeLockTtlSeconds(lockTtlSeconds, fallback = 120) {
  const value = Number(lockTtlSeconds ?? fallback);
  if (!Number.isFinite(value) || value < 30 || value > 3600) {
    throw new Error('invalid_lock_ttl_seconds');
  }
  return Math.floor(value);
}

function computeNextRunAt(baseIso, intervalMinutes) {
  const date = new Date(baseIso);
  date.setMinutes(date.getMinutes() + intervalMinutes);
  return date.toISOString();
}

function computeLockExpiresAt(baseIso, lockTtlSeconds) {
  const date = new Date(baseIso);
  date.setSeconds(date.getSeconds() + lockTtlSeconds);
  return date.toISOString();
}

function toPublicSchedule(schedule) {
  const copy = clone(schedule);
  if (!copy.run_lock) {
    delete copy.run_lock;
  }
  return copy;
}

export function createFileOwnerMemoryMaintenanceStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'owner-memory-maintenance')
  );
  const maxRunHistory = Math.max(50, Math.min(Number(options.maxRunHistory ?? 1000), 5000));
  ensureDirectory(storageDir);

  const schedulesFilePath = path.join(storageDir, 'reembed-schedules.json');
  const runsFilePath = path.join(storageDir, 'reembed-runs.json');
  const schedulesState = readJsonFile(schedulesFilePath, { items: [] });
  const runsState = readJsonFile(runsFilePath, { items: [] });
  if (!Array.isArray(schedulesState.items)) {
    schedulesState.items = [];
  }
  if (!Array.isArray(runsState.items)) {
    runsState.items = [];
  }

  function persistSchedules() {
    writeJsonFile(schedulesFilePath, schedulesState);
  }

  function persistRuns() {
    writeJsonFile(runsFilePath, runsState);
  }

  function getSchedule(tenantId) {
    return schedulesState.items.find((item) => item.tenant_id === tenantId) ?? null;
  }

  return {
    backend: 'file',
    storageDir,
    schedulesFilePath,
    runsFilePath,
    async upsertSchedule(input = {}) {
      const tenantId = String(input.tenant_id ?? '').trim();
      if (!tenantId) {
        throw new Error('missing_tenant_id');
      }

      const nowIso = new Date().toISOString();
      const existing = getSchedule(tenantId);
      const intervalMinutes = normalizeInterval(input.interval_minutes, existing?.interval_minutes ?? null);
      const limit = normalizeLimit(input.limit, existing?.limit ?? 50);
      const enabled = input.enabled == null ? (existing?.enabled ?? true) : input.enabled === true;
      const mode = normalizeMode(input.mode);
      if (input.mode != null && mode == null) {
        throw new Error('invalid_mode');
      }

      const shouldRunNow = input.run_now === true;
      let nextRunAt = null;
      if (enabled) {
        if (shouldRunNow) {
          nextRunAt = nowIso;
        } else if (existing?.next_run_at) {
          nextRunAt = existing.next_run_at;
        } else {
          nextRunAt = nowIso;
        }
      }

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
        last_result: existing?.last_result ?? null,
        run_lock: enabled ? (existing?.run_lock ?? null) : null
      };

      if (existing) {
        const index = schedulesState.items.findIndex((item) => item.tenant_id === tenantId);
        schedulesState.items[index] = schedule;
      } else {
        schedulesState.items.push(schedule);
      }
      persistSchedules();
      return toPublicSchedule(schedule);
    },
    async setScheduleEnabled(tenantId, enabled, options = {}) {
      const id = String(tenantId ?? '').trim();
      if (!id) {
        throw new Error('missing_tenant_id');
      }
      const schedule = getSchedule(id);
      if (!schedule) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = new Date().toISOString();
      schedule.enabled = enabled === true;
      schedule.updated_at = nowIso;
      if (!schedule.enabled) {
        schedule.next_run_at = null;
        schedule.run_lock = null;
      } else {
        schedule.next_run_at = options.run_now === true
          ? nowIso
          : (schedule.next_run_at ?? nowIso);
      }
      persistSchedules();
      return { ok: true, schedule: toPublicSchedule(schedule) };
    },
    async listSchedules(tenantId = null) {
      return schedulesState.items
        .filter((item) => !tenantId || item.tenant_id === tenantId)
        .sort((a, b) => String(a.tenant_id).localeCompare(String(b.tenant_id)))
        .map(toPublicSchedule);
    },
    async listRunnableSchedules(options = {}) {
      const tenantId = options.tenant_id ? String(options.tenant_id).trim() : null;
      const force = options.force === true;
      const nowIso = options.now_iso ?? new Date().toISOString();
      const nowTs = new Date(nowIso).getTime();

      return schedulesState.items
        .filter((item) => !tenantId || item.tenant_id === tenantId)
        .filter((item) => item.enabled === true)
        .filter((item) => {
          if (force) return true;
          if (!item.next_run_at) return false;
          const nextRunTs = new Date(item.next_run_at).getTime();
          return Number.isFinite(nextRunTs) && nextRunTs <= nowTs;
        })
        .sort((a, b) => String(a.next_run_at ?? '').localeCompare(String(b.next_run_at ?? '')))
        .map(toPublicSchedule);
    },
    async acquireRunLock(tenantId, options = {}) {
      const id = String(tenantId ?? '').trim();
      if (!id) {
        throw new Error('missing_tenant_id');
      }
      const schedule = getSchedule(id);
      if (!schedule) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = options.now_iso ?? new Date().toISOString();
      const nowTs = new Date(nowIso).getTime();
      const lockTtlSeconds = normalizeLockTtlSeconds(options.lock_ttl_seconds, 120);
      const currentLock = schedule.run_lock ?? null;
      let staleRecovered = false;
      if (currentLock?.lock_expires_at) {
        const lockExpiresTs = new Date(currentLock.lock_expires_at).getTime();
        if (Number.isFinite(lockExpiresTs) && lockExpiresTs > nowTs) {
          return { ok: false, code: 'locked', lock: clone(currentLock), stale_recovered: false };
        }
        staleRecovered = true;
      }

      const lock = {
        run_id: String(options.run_id ?? randomUUID()),
        owner: String(options.owner ?? 'scheduler'),
        locked_at: nowIso,
        lock_expires_at: computeLockExpiresAt(nowIso, lockTtlSeconds)
      };

      schedule.run_lock = lock;
      schedule.updated_at = nowIso;
      persistSchedules();

      return { ok: true, lock: clone(lock), stale_recovered: staleRecovered };
    },
    async releaseRunLock(tenantId, runId = null) {
      const id = String(tenantId ?? '').trim();
      if (!id) {
        throw new Error('missing_tenant_id');
      }
      const schedule = getSchedule(id);
      if (!schedule) {
        return { ok: false, code: 'not_found' };
      }
      if (!schedule.run_lock) {
        return { ok: true, released: false };
      }
      if (runId && schedule.run_lock.run_id !== runId) {
        return { ok: false, code: 'lock_mismatch' };
      }

      schedule.run_lock = null;
      schedule.updated_at = new Date().toISOString();
      persistSchedules();
      return { ok: true, released: true };
    },
    async markScheduleRun(tenantId, result = {}) {
      const id = String(tenantId ?? '').trim();
      const schedule = getSchedule(id);
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
        status: 'completed',
        dry_run: result.dry_run === true,
        scanned_count: Number(result.scanned_count ?? 0),
        updated_count: Number(result.updated_count ?? 0),
        failed_count: Number(result.failed_count ?? 0),
        skipped_count: Number(result.skipped_count ?? 0),
        completed_at: nowIso
      };
      schedule.run_lock = null;

      persistSchedules();
      return { ok: true, schedule: toPublicSchedule(schedule) };
    },
    async markScheduleFailure(tenantId, errorCode, details = {}) {
      const id = String(tenantId ?? '').trim();
      const schedule = getSchedule(id);
      if (!schedule) {
        return { ok: false, code: 'not_found' };
      }

      const nowIso = new Date().toISOString();
      schedule.updated_at = nowIso;
      schedule.next_run_at = schedule.enabled
        ? computeNextRunAt(nowIso, schedule.interval_minutes)
        : null;
      schedule.last_result = {
        status: 'failed',
        error_code: String(errorCode ?? 'run_failed'),
        details,
        completed_at: nowIso
      };
      schedule.run_lock = null;

      persistSchedules();
      return { ok: true, schedule: toPublicSchedule(schedule) };
    },
    async recordRun(record = {}) {
      const normalized = {
        run_id: String(record.run_id ?? randomUUID()),
        tenant_id: String(record.tenant_id ?? ''),
        trigger: String(record.trigger ?? 'manual'),
        status: String(record.status ?? 'completed'),
        dry_run: record.dry_run === true,
        started_at: record.started_at ?? new Date().toISOString(),
        finished_at: record.finished_at ?? new Date().toISOString(),
        details: record.details ?? {},
        created_at: new Date().toISOString()
      };
      runsState.items.push(normalized);
      if (runsState.items.length > maxRunHistory) {
        runsState.items = runsState.items.slice(runsState.items.length - maxRunHistory);
      }
      persistRuns();
      return clone(normalized);
    },
    async listRunRecords(options = {}) {
      const tenantId = options.tenant_id ? String(options.tenant_id).trim() : null;
      const limit = normalizeRunsLimit(options.limit, 50);
      return runsState.items
        .filter((item) => !tenantId || item.tenant_id === tenantId)
        .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))
        .slice(0, limit)
        .map(clone);
    },
    async close() {}
  };
}
