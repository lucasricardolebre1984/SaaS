# Spec - mod-01-owner-memory-reembed-hardening-slice

Status: Implemented
Date: 2026-02-23

## Objective
Harden owner memory re-embedding scheduler for production-grade operation before transitioning to Milestone 2 UI work.

## Scope
- Add explicit pause/resume scheduler endpoints per tenant.
- Add run-due execution controls (`max_concurrency`, lock TTL).
- Enforce tenant-level run lock with stale-lock recovery.
- Persist scheduler data in both `file` and `postgres` backends.
- Add maintenance run history endpoint and storage.
- Emit maintenance lifecycle events (`started/completed/failed`).

## Functional Requirements
1. Scheduler endpoints must support:
   - `POST /internal/maintenance/owner-memory/reembed/schedules/pause`
   - `POST /internal/maintenance/owner-memory/reembed/schedules/resume`
2. Run-due endpoint must accept:
   - `max_concurrency` (bounded)
   - `lock_ttl_seconds` (bounded, stale-lock safe)
3. If a tenant run lock is active, run-due must skip that tenant deterministically.
4. Scheduler persistence must support both backends:
   - file
   - postgres
5. Run history must be queryable via:
   - `GET /internal/maintenance/owner-memory/reembed/runs`
6. Maintenance lifecycle must emit orchestration events:
   - `owner.memory.reembed.started`
   - `owner.memory.reembed.completed`
   - `owner.memory.reembed.failed`

## Non-Functional Requirements
- No regression in existing module 01/02/03/04/05 runtime flows.
- Compatible with current contract-check and smoke gates.
- Keep module boundaries intact (maintenance logic remains in mod-01 runtime surface).

## Out Of Scope
- Distributed scheduler daemon.
- Multi-node global lock service.
- UI scheduler management screens.

## Acceptance Criteria
- Endpoints and lock behavior implemented with automated tests.
- Postgres smoke validates scheduler persistence tables.
- All gates green:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
