# Tasks - mod-02-campaign-followup-slice

Status: Completed
Date: 2026-02-23

## M02A-001 - Publish campaign and follow-up contracts
- Status: completed
- Output:
  - campaign create/state/list schemas
  - follow-up create/list schemas
- Verification:
  - contracts parse and are included in contract checks
- Evidence:
  - `libs/mod-02-whatsapp-crm/contracts/*campaign*.json`
  - `libs/mod-02-whatsapp-crm/contracts/*followup*.json`

## M02A-002 - Implement CRM automation store abstraction
- Status: completed
- Output:
  - `crm-automation-store` interface
  - file adapter
  - postgres adapter
- Verification:
  - runtime tests pass for file backend and postgres compatibility is preserved
- Evidence:
  - `apps/platform-api/src/crm-automation-store*.mjs`
  - `apps/platform-api/sql/orchestration-postgres.sql`

## M02A-003 - Implement campaign and follow-up runtime endpoints
- Status: completed
- Output:
  - `POST/PATCH/GET /v1/crm/campaigns`
  - `POST/GET /v1/crm/followups`
  - `POST /internal/worker/crm-followups/drain`
- Verification:
  - endpoint tests cover create/list/state-transition and worker dispatch paths
- Evidence:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/app.test.mjs`

## M02A-004 - Expand orchestration events and executable contract coverage
- Status: completed
- Output:
  - add CRM campaign/follow-up events into orchestration event schema
  - include mandatory checks in executable contract tests
- Verification:
  - `contract-tests:contract-checks` passes with new mandatory events
- Evidence:
  - `libs/core/orchestration-contracts/schemas/events.schema.json`
  - `tools/contract-tests/executable-contract.test.mjs`

## M02A-005 - Governance and metrics checkpoint
- Status: completed
- Output:
  - update `STATE.md`, `worklog.csv`, `costlog.csv`
- Verification:
  - docs and evidence consistent with delivered changes
