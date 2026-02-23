# Tasks - mod-03-clientes-slice

Status: Draft
Date: 2026-02-23

## M03-001 - Publish module 03 customer contracts
- Status: pending
- Output:
  - customer create/list/get payload schemas
  - customer lifecycle event payload schema
- Verification:
  - contract checks parse all schemas
- Evidence:
  - libs/mod-03-clientes/contracts/*

## M03-002 - Implement customer store abstraction
- Status: pending
- Output:
  - customer store interface
  - file adapter
  - postgres adapter
- Verification:
  - unit/runtime tests pass for both backends
- Evidence:
  - apps/platform-api/src/customer-store*.mjs

## M03-003 - Implement customer runtime endpoints
- Status: pending
- Output:
  - `POST /v1/customers`
  - `GET /v1/customers`
  - `GET /v1/customers/:id`
- Verification:
  - endpoint tests validate success and validation errors
- Evidence:
  - apps/platform-api/src/app.mjs
  - apps/platform-api/src/app.test.mjs

## M03-004 - Add lead conversion mapping from module 02
- Status: pending
- Output:
  - deterministic mapper from module 02 conversion payload to module 03 contract
- Verification:
  - conversion-origin test creates a customer with preserved correlation id
- Evidence:
  - apps/platform-api/src/customer-mapper.mjs
  - apps/platform-api/src/app.test.mjs

## M03-005 - Emit customer lifecycle events in orchestration trace
- Status: pending
- Output:
  - `customer.created` and `customer.updated` event emission
- Verification:
  - trace endpoint reflects new lifecycle events for customer flows
- Evidence:
  - apps/platform-api/src/app.mjs
  - apps/platform-api/src/app.test.mjs

## M03-006 - Governance and metrics checkpoint
- Status: pending
- Output:
  - STATE/worklog/costlog updated
- Verification:
  - docs consistent with delivered evidence
