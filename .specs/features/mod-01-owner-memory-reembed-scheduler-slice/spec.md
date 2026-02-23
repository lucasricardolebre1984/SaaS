# Spec - mod-01-owner-memory-reembed-scheduler-slice

Status: Implemented
Date: 2026-02-23

## Objective
Provide controlled tenant-level scheduling for owner memory embedding backfill without requiring ad-hoc manual calls for every batch.

## Scope
- Add internal schedule management endpoints for owner memory re-embedding maintenance.
- Allow due-run execution across configured tenant schedules.
- Reuse existing backfill runtime logic and provider modes.

## Functional Requirements
1. Must support schedule upsert by tenant with:
   - `tenant_id` (required)
   - `interval_minutes` (required)
   - `limit` (optional)
   - `mode` (optional `auto|openai|local|off`)
   - `enabled` (optional)
   - `run_now` (optional)
2. Must expose list endpoint for configured schedules.
3. Must expose run-due endpoint with:
   - optional `tenant_id` filter
   - optional `dry_run`
   - optional `force`
4. Must persist schedule state and track:
   - `last_run_at`
   - `next_run_at`
   - last batch summary

## Non-Functional Requirements
- No regression in existing owner memory and retrieval flows.
- Backfill scheduler must keep strict tenant isolation.
- Keep scheduler storage independent from domain storage backend.

## Out Of Scope
- Native cron daemon lifecycle in app process.
- Multi-node distributed locking.
- Vector index rebuild orchestration.

## Acceptance Criteria
- New internal scheduler endpoints implemented and tested.
- Schedule run-due uses same batch semantics as manual re-embed endpoint.
- Runtime quality gates green:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
