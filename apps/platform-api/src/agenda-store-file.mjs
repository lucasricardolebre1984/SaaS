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

function normalizeAppointmentInput(input) {
  return {
    appointment_id: input.appointment_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    title: String(input.title ?? '').trim(),
    description: input.description ?? '',
    start_at: input.start_at,
    end_at: input.end_at ?? null,
    timezone: input.timezone,
    status: input.status ?? 'scheduled',
    metadata: input.metadata ?? {}
  };
}

function normalizeReminderInput(input) {
  return {
    reminder_id: input.reminder_id,
    appointment_id: input.appointment_id,
    tenant_id: input.tenant_id,
    external_key: input.external_key ?? null,
    schedule_at: input.schedule_at,
    channel: input.channel,
    message: String(input.message ?? '').trim(),
    recipient: input.recipient ?? {},
    status: input.status ?? 'scheduled',
    dispatch_command_id: input.dispatch_command_id ?? null,
    metadata: input.metadata ?? {}
  };
}

function findByExternalKey(items, tenantId, externalKey) {
  if (!externalKey) return null;
  return items.find(
    (item) => item.tenant_id === tenantId && item.external_key === externalKey
  ) ?? null;
}

export function createFileAgendaStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'agenda')
  );
  ensureDirectory(storageDir);

  const appointmentsFilePath = path.join(storageDir, 'appointments.json');
  const remindersFilePath = path.join(storageDir, 'reminders.json');

  const appointmentsState = readJsonFile(appointmentsFilePath, { items: [] });
  const remindersState = readJsonFile(remindersFilePath, { items: [] });

  if (!Array.isArray(appointmentsState.items)) {
    appointmentsState.items = [];
  }
  if (!Array.isArray(remindersState.items)) {
    remindersState.items = [];
  }

  function persistAppointments() {
    writeJsonFile(appointmentsFilePath, appointmentsState);
  }

  function persistReminders() {
    writeJsonFile(remindersFilePath, remindersState);
  }

  return {
    backend: 'file',
    storageDir,
    appointmentsFilePath,
    remindersFilePath,
    async createAppointment(input) {
      const normalized = normalizeAppointmentInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        appointmentsState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', appointment: clone(byExternalKey) };
      }

      const existing = appointmentsState.items.find(
        (item) =>
          item.tenant_id === normalized.tenant_id &&
          item.appointment_id === normalized.appointment_id
      );
      if (existing) {
        return { action: 'idempotent', appointment: clone(existing) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      appointmentsState.items.push(created);
      persistAppointments();
      return { action: 'created', appointment: clone(created) };
    },
    async updateAppointment(tenantId, appointmentId, changes) {
      const item = appointmentsState.items.find(
        (entry) => entry.tenant_id === tenantId && entry.appointment_id === appointmentId
      );
      if (!item) return null;

      const allowed = ['title', 'description', 'start_at', 'end_at', 'timezone', 'status', 'metadata'];
      for (const key of allowed) {
        if (Object.hasOwn(changes, key)) {
          item[key] = changes[key];
        }
      }
      item.updated_at = new Date().toISOString();
      persistAppointments();
      return clone(item);
    },
    async getAppointmentById(tenantId, appointmentId) {
      const item = appointmentsState.items.find(
        (entry) => entry.tenant_id === tenantId && entry.appointment_id === appointmentId
      );
      return item ? clone(item) : null;
    },
    async createReminder(input) {
      const normalized = normalizeReminderInput(input);
      const nowIso = new Date().toISOString();

      const byExternalKey = findByExternalKey(
        remindersState.items,
        normalized.tenant_id,
        normalized.external_key
      );
      if (byExternalKey) {
        return { action: 'idempotent', reminder: clone(byExternalKey) };
      }

      const existing = remindersState.items.find(
        (item) => item.tenant_id === normalized.tenant_id && item.reminder_id === normalized.reminder_id
      );
      if (existing) {
        return { action: 'idempotent', reminder: clone(existing) };
      }

      const created = {
        ...normalized,
        created_at: nowIso,
        updated_at: nowIso
      };
      remindersState.items.push(created);
      persistReminders();
      return { action: 'created', reminder: clone(created) };
    },
    async updateReminder(tenantId, reminderId, changes) {
      const item = remindersState.items.find(
        (entry) => entry.tenant_id === tenantId && entry.reminder_id === reminderId
      );
      if (!item) return null;

      const allowed = ['status', 'dispatch_command_id', 'recipient', 'message', 'metadata', 'schedule_at'];
      for (const key of allowed) {
        if (Object.hasOwn(changes, key)) {
          item[key] = changes[key];
        }
      }
      item.updated_at = new Date().toISOString();
      persistReminders();
      return clone(item);
    },
    async listReminders(tenantId) {
      return remindersState.items
        .filter((item) => item.tenant_id === tenantId)
        .sort((a, b) => String(a.schedule_at).localeCompare(String(b.schedule_at)))
        .map(clone);
    },
    async close() {}
  };
}
