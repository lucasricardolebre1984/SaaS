# Design - mod-01-owner-memory-reembed-hardening-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- Existing:
  - `POST /internal/maintenance/owner-memory/reembed/schedules/run-due`
- Added:
  - `POST /internal/maintenance/owner-memory/reembed/schedules/pause`
  - `POST /internal/maintenance/owner-memory/reembed/schedules/resume`
  - `GET /internal/maintenance/owner-memory/reembed/runs`

## Scheduler Hardening Controls
- `max_concurrency`: bounded worker pool execution for due schedules.
- `lock_ttl_seconds`: per-tenant run lock TTL to prevent concurrent re-embed execution overlap.
- stale lock recovery:
  - expired lock can be replaced by next run attempt.

## Persistence Design
- Maintenance store promoted to backend wrapper:
  - `owner-memory-maintenance-store.mjs`
- File adapter:
  - `owner-memory-maintenance-store-file.mjs`
  - persists schedules + run history JSON.
- Postgres adapter:
  - `owner-memory-maintenance-store-postgres.mjs`
  - tables:
    - `owner_memory_reembed_schedules`
    - `owner_memory_reembed_runs`

## Event Telemetry
- New orchestration event names:
  - `owner.memory.reembed.started`
  - `owner.memory.reembed.completed`
  - `owner.memory.reembed.failed`
- Emission point:
  - scheduler run-due execution path.

## Operational Updates
- Smoke flow expanded to validate scheduler endpoints and persisted scheduler rows in postgres.
- Backend switch runbook updated with scheduler-specific flow and tables.

## Testing Strategy
- Runtime tests cover:
  - pause/resume endpoint behavior
  - run-due with concurrency and lock skip path
  - payload validation for concurrency/lock TTL
  - run history retrieval
- Existing tests continue validating non-scheduler modules.
