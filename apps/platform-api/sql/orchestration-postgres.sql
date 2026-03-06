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

CREATE TABLE IF NOT EXISTS public.orchestration_task_confirmations (
  confirmation_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason_code TEXT NULL,
  owner_command_ref_json JSONB NOT NULL,
  task_plan_ref_json JSONB NOT NULL,
  request_snapshot_json JSONB NOT NULL,
  resolution_json JSONB NULL,
  module_task_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS orchestration_task_confirmations_tenant_status_idx
  ON public.orchestration_task_confirmations (tenant_id, status, created_at);

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

CREATE TABLE IF NOT EXISTS public.crm_leads (
  lead_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  external_key TEXT NULL,
  display_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  stage TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_tenant_external_key_ux
  ON public.crm_leads (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_leads_tenant_stage_idx
  ON public.crm_leads (tenant_id, stage);

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  campaign_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  external_key TEXT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  audience_segment TEXT NULL,
  state TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_campaigns_tenant_external_key_ux
  ON public.crm_campaigns (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_campaigns_tenant_state_idx
  ON public.crm_campaigns (tenant_id, state);

CREATE TABLE IF NOT EXISTS public.crm_followups (
  followup_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  campaign_id UUID NULL,
  external_key TEXT NULL,
  lead_id UUID NULL,
  customer_id UUID NULL,
  phone_e164 TEXT NOT NULL,
  message TEXT NOT NULL,
  schedule_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT NULL,
  last_error_code TEXT NULL,
  last_error_message TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id UUID NULL,
  trace_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_followups_tenant_external_key_ux
  ON public.crm_followups (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_followups_tenant_schedule_idx
  ON public.crm_followups (tenant_id, status, schedule_at);

CREATE TABLE IF NOT EXISTS public.tenant_runtime_configs (
  tenant_id TEXT PRIMARY KEY,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS tenant_runtime_configs_updated_idx
  ON public.tenant_runtime_configs (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_accounts (
  account_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  external_key TEXT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NULL,
  document_number TEXT NULL,
  industry TEXT NULL,
  website TEXT NULL,
  status TEXT NOT NULL,
  owner_user_id TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_accounts_tenant_external_key_ux
  ON public.crm_accounts (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_accounts_tenant_status_idx
  ON public.crm_accounts (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  contact_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account_id UUID NULL REFERENCES public.crm_accounts(account_id),
  external_key TEXT NULL,
  display_name TEXT NOT NULL,
  job_title TEXT NULL,
  phone_e164 TEXT NULL,
  email TEXT NULL,
  status TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_tenant_external_key_ux
  ON public.crm_contacts (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_contacts_tenant_account_idx
  ON public.crm_contacts (tenant_id, account_id, created_at);

CREATE INDEX IF NOT EXISTS crm_contacts_tenant_phone_idx
  ON public.crm_contacts (tenant_id, phone_e164);

CREATE TABLE IF NOT EXISTS public.crm_deals (
  deal_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  lead_id UUID NULL REFERENCES public.crm_leads(lead_id),
  account_id UUID NULL REFERENCES public.crm_accounts(account_id),
  contact_id UUID NULL REFERENCES public.crm_contacts(contact_id),
  external_key TEXT NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  amount NUMERIC(14, 2) NULL,
  currency CHAR(3) NULL,
  expected_close_date DATE NULL,
  owner_user_id TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_deals_tenant_external_key_ux
  ON public.crm_deals (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_deals_tenant_stage_idx
  ON public.crm_deals (tenant_id, stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS crm_deals_tenant_expected_close_idx
  ON public.crm_deals (tenant_id, expected_close_date);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  activity_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  deal_id UUID NULL REFERENCES public.crm_deals(deal_id),
  contact_id UUID NULL REFERENCES public.crm_contacts(contact_id),
  kind TEXT NOT NULL,
  title TEXT NULL,
  body TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  author_user_id TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS crm_activities_tenant_occurred_idx
  ON public.crm_activities (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS crm_activities_tenant_deal_idx
  ON public.crm_activities (tenant_id, deal_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  task_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  deal_id UUID NULL REFERENCES public.crm_deals(deal_id),
  contact_id UUID NULL REFERENCES public.crm_contacts(contact_id),
  title TEXT NOT NULL,
  description TEXT NULL,
  due_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assignee_user_id TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS crm_tasks_tenant_status_due_idx
  ON public.crm_tasks (tenant_id, status, due_at);

CREATE INDEX IF NOT EXISTS crm_tasks_tenant_assignee_due_idx
  ON public.crm_tasks (tenant_id, assignee_user_id, due_at);

CREATE TABLE IF NOT EXISTS public.crm_views (
  view_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  owner_user_id TEXT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  module TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_views_tenant_owner_module_name_ux
  ON public.crm_views (tenant_id, COALESCE(owner_user_id, ''), module, name);

CREATE INDEX IF NOT EXISTS crm_views_tenant_module_scope_idx
  ON public.crm_views (tenant_id, module, scope, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.owner_memory_entries (
  memory_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_id UUID NOT NULL,
  external_key TEXT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  salience_score NUMERIC(4, 3) NOT NULL,
  embedding_ref TEXT NULL,
  embedding_vector_json JSONB NULL,
  status TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS owner_memory_entries_tenant_external_key_ux
  ON public.owner_memory_entries (tenant_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS owner_memory_entries_tenant_session_idx
  ON public.owner_memory_entries (tenant_id, session_id, created_at);

CREATE TABLE IF NOT EXISTS public.owner_context_promotions (
  promotion_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  memory_id UUID NOT NULL REFERENCES public.owner_memory_entries(memory_id),
  action TEXT NOT NULL,
  reason_code TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS owner_context_promotions_tenant_created_idx
  ON public.owner_context_promotions (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS public.owner_memory_reembed_schedules (
  tenant_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL,
  limit_items INTEGER NOT NULL,
  mode TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ NULL,
  next_run_at TIMESTAMPTZ NULL,
  last_result_json JSONB NULL,
  run_lock_json JSONB NULL
);

CREATE INDEX IF NOT EXISTS owner_memory_reembed_schedules_enabled_next_idx
  ON public.owner_memory_reembed_schedules (enabled, next_run_at);

CREATE TABLE IF NOT EXISTS public.owner_memory_reembed_runs (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owner_memory_reembed_runs_tenant_started_idx
  ON public.owner_memory_reembed_runs (tenant_id, started_at DESC);
