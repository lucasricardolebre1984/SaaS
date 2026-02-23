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
