# Tasks - mod-02-whatsapp-crm-slice

Status: Completed
Date: 2026-02-23

## M02-001 - Publish lead runtime contracts
- Status: completed
- Output:
  - lead create/update/list schemas
- Verification:
  - contracts parse and are included in contract checks
- Evidence:
  - `libs/mod-02-whatsapp-crm/contracts/*`

## M02-002 - Implement lead store abstraction
- Status: completed
- Output:
  - lead store interface
  - file adapter
  - postgres adapter
- Verification:
  - runtime tests pass for file backend and postgres compatibility preserved
- Evidence:
  - `apps/platform-api/src/lead-store*.mjs`
  - `apps/platform-api/sql/orchestration-postgres.sql`

## M02-003 - Implement CRM lead runtime endpoints
- Status: completed
- Output:
  - `POST /v1/crm/leads`
  - `PATCH /v1/crm/leads/:id/stage`
  - `GET /v1/crm/leads`
- Verification:
  - endpoint tests cover create/list and transition validation paths
- Evidence:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/app.test.mjs`

## M02-004 - Implement collection dispatch worker
- Status: completed
- Output:
  - `POST /internal/worker/crm-collections/drain`
  - emits `billing.collection.sent` or `billing.collection.failed`
- Verification:
  - trace reflects dispatch command causation and billing event emission
- Evidence:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/app.test.mjs`

## M02-005 - Governance and metrics checkpoint
- Status: completed
- Output:
  - STATE/worklog/costlog updated
- Verification:
  - docs and evidence consistent with delivered changes
