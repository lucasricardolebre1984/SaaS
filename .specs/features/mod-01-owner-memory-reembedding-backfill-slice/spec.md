# Spec - mod-01-owner-memory-reembedding-backfill-slice

Status: Implemented
Date: 2026-02-23

## Objective
Provide a controlled internal maintenance flow to backfill embeddings for owner memory entries that still have no persisted vector.

## Scope
- Add internal endpoint for tenant-scoped re-embedding batch processing.
- Process only entries with missing `embedding_vector` / `embedding_vector_json`.
- Support `dry_run` preview mode.

## Functional Requirements
1. Endpoint must accept:
   - `tenant_id` (required)
   - `limit` (optional)
   - `dry_run` (optional)
   - `mode` (optional `auto|openai|local|off`)
2. Endpoint must report deterministic batch stats:
   - scanned, updated, failed, skipped counts
3. In `dry_run=true`, no persistence updates are allowed.
4. Backfill must preserve module boundaries and reuse embedding provider logic.

## Non-Functional Requirements
- Works with both file and postgres backends.
- No regression in existing owner memory create/retrieval flows.
- Supports safe iterative execution in small batches.

## Out Of Scope
- Full scheduler/cron orchestration.
- Cross-tenant batch in one call.
- Vector index migration.

## Acceptance Criteria
- Internal maintenance endpoint implemented and tested.
- Backfill updates missing vectors and `embedding_ref` for selected tenant.
- Dry-run path validated.
- Gates green:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
