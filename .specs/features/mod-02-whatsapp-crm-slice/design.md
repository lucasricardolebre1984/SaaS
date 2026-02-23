# Design - mod-02-whatsapp-crm-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- Endpoints:
  - `POST /v1/crm/leads`
  - `PATCH /v1/crm/leads/:id/stage`
  - `GET /v1/crm/leads?tenant_id=...`
  - `POST /internal/worker/crm-collections/drain`

## Contracts
- Module 02 lead contracts:
  - `libs/mod-02-whatsapp-crm/contracts/lead-create.schema.json`
  - `libs/mod-02-whatsapp-crm/contracts/lead-stage-update.schema.json`
  - `libs/mod-02-whatsapp-crm/contracts/lead-list.schema.json`
- Existing integration contracts reused:
  - `libs/mod-02-whatsapp-crm/integration/evolution-webhook.schema.json`
  - `libs/mod-02-whatsapp-crm/integration/outbound-queue.schema.json`

## Data Model Baseline
- `crm_lead`:
  - `lead_id`, `tenant_id`, `external_key`, `display_name`, `phone_e164`, `source_channel`, `stage`, `metadata`, `created_at`, `updated_at`
- Transition guard:
  - source: `libs/mod-02-whatsapp-crm/domain/lead-funnel.transitions.json`
  - enforced in runtime store update method

## Persistence Adapters
- File adapter:
  - `.runtime-data/crm/leads.json`
- Postgres adapter:
  - `public.crm_leads`
  - unique `(tenant_id, external_key)` for idempotency

## Orchestration Integration
- Lead creation emits `crm.lead.created` with normalized public stage.
- Collection worker scans orchestration commands for unprocessed:
  - `billing.collection.dispatch.request`
- Worker validates outbound payload against mod-02 outbound queue schema and emits:
  - `billing.collection.sent` on success
  - `billing.collection.failed` on failure

## Testing Strategy
- Contract checks:
  - parse module 02 contracts + domain + integration schemas
- Runtime tests:
  - lead create/list happy path
  - stage transition allowed and rejected paths
  - collection worker dispatch emits billing events and preserves correlation chain
