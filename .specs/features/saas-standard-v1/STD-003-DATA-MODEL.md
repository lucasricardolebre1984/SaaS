# STD-003 - Data Model Baseline

Status: Completed  
Date: 2026-02-23

## Objective
Define the initial relational baseline for SaaS Standard v1 covering:
- conversations
- leads
- customers
- agenda
- billing
- memory
- personas
- metrics

## Baseline Principles
- Multi-tenant isolation by `tenant_id` on all business tables.
- UUID primary keys for distributed-safe writes.
- Event traceability via `correlation_id` and `trace_id`.
- Module ownership is explicit and enforced by boundaries.
- Soft delete (`archived_at`) only where historical audit is required.

## Ownership by Module
- Module 01 (owner concierge):
  - `conversations`
  - `conversation_messages`
  - `conversation_attachments`
  - `owner_commands`
- Module 02 (whatsapp crm):
  - `crm_leads`
  - `crm_lead_stage_history`
  - `crm_campaigns`
  - `crm_campaign_recipients`
  - `crm_message_dispatches`
- Module 03 (clientes):
  - `customers`
  - `customer_contacts`
  - `customer_identities`
  - `customer_merge_audit`
- Module 04 (agenda):
  - `agenda_events`
  - `agenda_attendees`
  - `agenda_reminders`
  - `agenda_delivery_log`
- Module 05 (billing/cobranca):
  - `billing_charges`
  - `billing_charge_events`
  - `billing_collection_attempts`
  - `billing_payments`
- Shared core:
  - `tenants`
  - `domain_events`
  - `module_tasks`
  - `memory_documents`
  - `memory_chunks`
  - `memory_embeddings`
  - `memory_promotion_queue`
  - `persona_profiles`
  - `persona_versions`
  - `tenant_policy_sets`
  - `tenant_policy_rules`
  - `audit_logs`
  - `ai_usage_metrics`
  - `provider_cost_entries`
  - `kpi_daily_snapshots`

## Key Entity Relations (high level)
- A tenant has many conversations, leads, customers, agenda items, charges, and memory assets.
- A conversation has many messages and attachments.
- A lead can convert into one customer (`crm_lead_stage_history` keeps lifecycle trace).
- A customer can have many charges, reminders, and contacts.
- A charge can have many collection attempts and payments.
- A memory document has many chunks; each chunk has one embedding row.
- Persona profile has many persona versions; tenant policy set has many rules.

## Cross-Module Constraints
- Module 02 writes customer-related data only through conversion contract; module 03 is source of truth.
- Module 05 owns billing truth; module 02 stores only communication/dispatch outcomes.
- Module 01 can read all projection-safe domains but writes directly only to module 01 tables and contract bus tables.

## Artifacts
- Table map (machine-readable):
  - `libs/core/data-model/table-map.json`
- ER draft:
  - `libs/core/data-model/er-baseline.mmd`

## Next Data Tasks (for implementation phase)
- Add migration-ready SQL DDL per ownership slice.
- Define indexes by hot query paths.
- Add partition strategy for `domain_events`, `audit_logs`, and `ai_usage_metrics`.
