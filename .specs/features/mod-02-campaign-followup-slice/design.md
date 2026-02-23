# Design - mod-02-campaign-followup-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- Endpoints:
  - `POST /v1/crm/campaigns`
  - `PATCH /v1/crm/campaigns/:id/state`
  - `GET /v1/crm/campaigns?tenant_id=...`
  - `POST /v1/crm/followups`
  - `GET /v1/crm/followups?tenant_id=...`
  - `POST /internal/worker/crm-followups/drain`

## Contracts
- Module 02 campaign/follow-up contracts:
  - `libs/mod-02-whatsapp-crm/contracts/campaign-create.schema.json`
  - `libs/mod-02-whatsapp-crm/contracts/campaign-state-update.schema.json`
  - `libs/mod-02-whatsapp-crm/contracts/campaign-list.schema.json`
  - `libs/mod-02-whatsapp-crm/contracts/followup-create.schema.json`
  - `libs/mod-02-whatsapp-crm/contracts/followup-list.schema.json`
- Existing integration contract reused:
  - `libs/mod-02-whatsapp-crm/integration/outbound-queue.schema.json`

## Workflow and State Rules
- Campaign transition guard source:
  - `libs/mod-02-whatsapp-crm/domain/workflows.json` (`workflows.campaign.transitions`)
- Guard behavior:
  - Invalid transition or trigger mismatch returns `transition_error`.
  - Same-state updates are accepted as idempotent no-op.
- Follow-up lifecycle:
  - `pending` -> `sent` (dispatch success)
  - `pending` -> `failed` (dispatch failure or outbound contract invalid)

## Persistence Adapters
- Store abstraction:
  - `crm-automation-store.mjs`
  - `crm-automation-store-file.mjs`
  - `crm-automation-store-postgres.mjs`
- File adapter:
  - `.runtime-data/crm-automation/campaigns.json`
  - `.runtime-data/crm-automation/followups.json`
- Postgres adapter:
  - `public.crm_campaigns`
  - `public.crm_followups`
  - unique `(tenant_id, external_key)` for idempotent create

## Orchestration Integration
- Campaign creation/state change emits:
  - `crm.campaign.created`
  - `crm.campaign.state.changed`
- Follow-up scheduling/dispatch emits:
  - `crm.followup.scheduled`
  - `crm.followup.sent`
  - `crm.followup.failed`
- Worker outbound payload must validate against outbound queue schema before sent event.

## Testing Strategy
- Contract checks:
  - parse new module 02 campaign/follow-up contracts
  - executable event mandatory list includes new CRM automation events
- Runtime tests:
  - campaign create/list/state transitions (valid + invalid)
  - follow-up create/list and worker drain (success + failure)
- Postgres smoke:
  - campaign and follow-up flow checkpoint
  - persisted row assertions in `crm_campaigns` and `crm_followups`
