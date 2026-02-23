# Tasks - runtime-dual-concierge-slice

Status: In Progress
Date: 2026-02-23

## RDS-001 - Implement API runtime skeleton
- Status: done
- Output:
  - server entrypoint and HTTP handlers in `app-platform-api`
- Verification:
  - local server starts and health endpoint responds
- Evidence:
  - apps/platform-api/src/server.mjs
  - apps/platform-api/src/app.mjs

## RDS-002 - Wire contract validators
- Status: done
- Output:
  - Ajv validators for owner interaction, webhook, outbound queue
- Verification:
  - invalid payloads return 400 with validation details
- Evidence:
  - apps/platform-api/src/schemas.mjs

## RDS-003 - Add runtime tests
- Status: done
- Output:
  - executable endpoint tests using `node:test`
- Verification:
  - `nx run app-platform-api:test` passes
- Evidence:
  - apps/platform-api/src/app.test.mjs
  - target `app-platform-api:test` in apps/platform-api/project.json

## RDS-004 - Integrate with governance and metrics
- Status: done
- Output:
  - STATE/worklog/costlog updates
- Verification:
  - checkpoint consistent with execution evidence

## RDS-005 - Add in-memory orchestration dispatch simulation
- Status: done
- Output:
  - runtime emits `owner.command.create` and `module.task.create` envelopes validated against core orchestration contracts
  - runtime simulates downstream task lifecycle events (`module.task.created`, `module.task.accepted`, `module.task.completed`/`module.task.failed`)
  - internal trace endpoints available for correlation inspection
- Verification:
  - `nx run app-platform-api:test` passes with correlation and lifecycle assertions
  - `nx run contract-tests:contract-checks` remains passing
- Evidence:
  - apps/platform-api/src/app.mjs
  - apps/platform-api/src/schemas.mjs
  - apps/platform-api/src/app.test.mjs

## RDS-006 - Add durable store and policy-driven routing
- Status: done
- Output:
  - orchestration commands/events persisted to local NDJSON files with startup rehydration
  - task planner moved to explicit policy config file
  - runtime tests cover durable trace reload and policy-based routing
- Verification:
  - `nx run app-platform-api:test` passes with storage and policy assertions
  - `nx run contract-tests:contract-checks` remains passing
- Evidence:
  - apps/platform-api/src/orchestration-store.mjs
  - apps/platform-api/src/task-planner.mjs
  - apps/platform-api/config/task-routing.policy.json
  - apps/platform-api/src/app.mjs
  - apps/platform-api/src/app.test.mjs

## RDS-007 - Add queue/worker boundary for module task lifecycle
- Status: done
- Output:
  - interaction endpoint now queues module tasks after `module.task.created`
  - internal worker drain endpoint processes queued tasks and emits `module.task.accepted` + terminal event
  - queue state persisted durably and rehydrated on restart
- Verification:
  - `nx run app-platform-api:test` passes with queue/worker lifecycle assertions
  - `nx run contract-tests:contract-checks` remains passing
- Evidence:
  - apps/platform-api/src/orchestration-store.mjs
  - apps/platform-api/src/app.mjs
  - apps/platform-api/src/app.test.mjs

## RDS-008 - Add pluggable relational persistence adapter (Postgres)
- Status: done
- Output:
  - orchestration store refactored to backend factory (`file` and `postgres`)
  - Postgres adapter created for commands/events/queue lifecycle with auto-migrate option
  - SQL schema baseline added for operational setup
- Verification:
  - `nx run app-platform-api:test` passes on `file` backend after store abstraction
  - `nx run contract-tests:contract-checks` remains passing
  - Postgres live integration test pending (no local DB provisioned in this checkpoint)
- Evidence:
  - apps/platform-api/src/orchestration-store.mjs
  - apps/platform-api/src/orchestration-store-file.mjs
  - apps/platform-api/src/orchestration-store-postgres.mjs
  - apps/platform-api/sql/orchestration-postgres.sql
  - apps/platform-api/src/app.mjs
