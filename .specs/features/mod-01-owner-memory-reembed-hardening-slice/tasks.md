# Tasks - mod-01-owner-memory-reembed-hardening-slice

Status: Completed
Date: 2026-02-23

## M01H-001 - Add explicit pause/resume operations and scheduler controls
- Status: completed
- Output:
  - pause/resume endpoints by tenant
  - run-due control params (`max_concurrency`, `lock_ttl_seconds`)
- Verification:
  - runtime tests validate lifecycle and payload guards
- Evidence:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/app.test.mjs`

## M01H-002 - Add lock-safe execution and run history tracking
- Status: completed
- Output:
  - tenant run lock with stale-lock recovery
  - run history endpoint and persistence
- Verification:
  - runtime test validates locked-tenant skip behavior
- Evidence:
  - `apps/platform-api/src/owner-memory-maintenance-store-file.mjs`
  - `apps/platform-api/src/owner-memory-maintenance-store-postgres.mjs`
  - `apps/platform-api/src/app.mjs`

## M01H-003 - Add maintenance event telemetry and postgres parity
- Status: completed
- Output:
  - maintenance events (`started/completed/failed`) in orchestration contracts
  - postgres schema/tables and smoke validation coverage
- Verification:
  - contract checks and smoke postgres pass
- Evidence:
  - `libs/core/orchestration-contracts/schemas/events.schema.json`
  - `apps/platform-api/sql/orchestration-postgres.sql`
  - `tools/smoke-postgres-orchestration.ps1`

## M01H-004 - Validate gates and close governance checkpoint
- Status: completed
- Output:
  - pass `test`, `contract-checks`, `smoke:postgres`
  - update `STATE/worklog/costlog`
- Verification:
  - all gates green and docs consistent
- Gates executed:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
