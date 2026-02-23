# Design - mod-01-owner-memory-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- Endpoints:
  - `POST /v1/owner-concierge/memory/entries`
  - `GET /v1/owner-concierge/memory/entries?tenant_id=...&session_id=...&status=...`
  - `POST /v1/owner-concierge/context/promotions`
  - `GET /v1/owner-concierge/context/summary?tenant_id=...`

## Contracts
- Module 01 memory contracts:
  - `libs/mod-01-owner-concierge/contracts/memory-entry-create.schema.json`
  - `libs/mod-01-owner-concierge/contracts/memory-entry-list.schema.json`
  - `libs/mod-01-owner-concierge/contracts/context-promotion.schema.json`
  - `libs/mod-01-owner-concierge/contracts/context-summary.schema.json`
- Core orchestration extension:
  - event `owner.context.promoted`

## Data Model Baseline
- `owner_memory_entry`:
  - `memory_id`, `tenant_id`, `session_id`, `external_key`, `source`, `content`, `tags`, `salience_score`, `status`, `metadata`, `created_at`, `updated_at`
- `owner_context_promotion`:
  - `promotion_id`, `tenant_id`, `memory_id`, `action`, `reason_code`, `metadata`, `created_at`

## Persistence Adapters
- File adapter:
  - `.runtime-data/owner-memory/entries.json`
  - `.runtime-data/owner-memory/promotions.json`
- Postgres adapter:
  - `public.owner_memory_entries`
  - `public.owner_context_promotions`
  - unique `(tenant_id, external_key)` on entries

## Orchestration Integration
- Promotion action `promote` emits event:
  - `owner.context.promoted`
- Event is stored via existing orchestration store with preserved correlation and trace ids.

## Testing Strategy
- Contract checks:
  - parse and include new module 01 contracts
- Runtime tests:
  - memory create/list
  - promotion success with trace event
  - invalid transition rejection
  - context summary consistency
