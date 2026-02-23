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
