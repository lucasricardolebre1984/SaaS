# Design - mod-01-owner-memory-reembed-scheduler-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- Internal maintenance endpoints:
  - `POST /internal/maintenance/owner-memory/reembed/schedules`
  - `GET /internal/maintenance/owner-memory/reembed/schedules`
  - `POST /internal/maintenance/owner-memory/reembed/schedules/run-due`

## Scheduler Store
- New file-backed store module:
  - `apps/platform-api/src/owner-memory-maintenance-store.mjs`
- Storage file:
  - `reembed-schedules.json`
- Data shape per tenant:
  - `tenant_id`
  - `enabled`
  - `interval_minutes`
  - `limit`
  - `mode`
  - `created_at`
  - `updated_at`
  - `last_run_at`
  - `next_run_at`
  - `last_result`

## Reuse Strategy
- Extract/reuse owner memory re-embed batch logic in shared app runtime function.
- Manual endpoint and scheduler run-due endpoint call the same execution path.

## Execution Model
- Schedule upsert writes/updates tenant schedule config.
- Run-due fetches runnable schedules (`next_run_at <= now` or `force=true`).
- For each schedule:
  - execute batch with configured `limit` and `mode`
  - if not dry-run, update `last_run_at`, `next_run_at`, and `last_result`

## Safety Rules
- Never run for missing tenant id.
- Reject invalid provider mode.
- Limit batch size to maximum 500.
- Keep schedule storage separate from owner memory data backend.

## Testing Strategy
- Runtime tests validate:
  - upsert/list scheduler endpoints
  - run-due dry-run path
  - run-due execute path updates embeddings
  - schedule state updates (`last_run_at` and `last_result`)
  - payload validation errors (`missing_tenant_id`, invalid interval/mode)
