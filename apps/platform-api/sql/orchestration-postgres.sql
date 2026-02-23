-- Runtime orchestration persistence baseline for app-platform-api
-- Applies queue/worker compatible schema for commands, events, and module task queue.

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.orchestration_commands (
  id BIGSERIAL PRIMARY KEY,
  command_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  correlation_id UUID NOT NULL,
  trace_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  command_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS orchestration_commands_correlation_idx
  ON public.orchestration_commands (correlation_id, created_at);

CREATE TABLE IF NOT EXISTS public.orchestration_events (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  correlation_id UUID NOT NULL,
  trace_id TEXT NOT NULL,
  emitted_at TIMESTAMPTZ NOT NULL,
  event_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS orchestration_events_correlation_idx
  ON public.orchestration_events (correlation_id, emitted_at);

CREATE TABLE IF NOT EXISTS public.orchestration_module_task_queue (
  queue_item_id UUID PRIMARY KEY,
  status TEXT NOT NULL,
  enqueued_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  simulate_failure BOOLEAN NOT NULL,
  error_code TEXT NULL,
  result_summary TEXT NULL,
  command_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS orchestration_module_task_queue_status_idx
  ON public.orchestration_module_task_queue (status, enqueued_at);

CREATE TABLE IF NOT EXISTS public.customers (
  customer_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  primary_phone TEXT NULL,
  primary_email TEXT NULL,
  origin TEXT NOT NULL,
  status TEXT NOT NULL,
  external_key TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_external_key_ux
  ON public.customers (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS customers_tenant_created_idx
  ON public.customers (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS public.agenda_appointments (
  appointment_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  external_key TEXT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS agenda_appointments_tenant_external_key_ux
  ON public.agenda_appointments (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.agenda_reminders (
  reminder_id UUID PRIMARY KEY,
  appointment_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  external_key TEXT NULL,
  schedule_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  dispatch_command_id UUID NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS agenda_reminders_tenant_external_key_ux
  ON public.agenda_reminders (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS agenda_reminders_tenant_schedule_idx
  ON public.agenda_reminders (tenant_id, schedule_at);

CREATE TABLE IF NOT EXISTS public.billing_charges (
  charge_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id UUID NOT NULL,
  external_key TEXT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  currency CHAR(3) NOT NULL,
  due_date DATE NULL,
  status TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_charges_tenant_external_key_ux
  ON public.billing_charges (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_charges_tenant_due_date_idx
  ON public.billing_charges (tenant_id, due_date);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  payment_id UUID PRIMARY KEY,
  charge_id UUID NOT NULL REFERENCES public.billing_charges(charge_id),
  tenant_id TEXT NOT NULL,
  external_key TEXT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  currency CHAR(3) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_payments_tenant_external_key_ux
  ON public.billing_payments (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_payments_tenant_paid_at_idx
  ON public.billing_payments (tenant_id, paid_at);
