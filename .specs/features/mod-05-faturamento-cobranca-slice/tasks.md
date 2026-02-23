# Tasks - mod-05-faturamento-cobranca-slice

Status: Completed
Date: 2026-02-23

## M05-001 - Publish module 05 billing contracts
- Status: completed
- Output:
  - charge create/update/list schemas
  - payment create schema
  - billing lifecycle event schema
- Verification:
  - contracts parse and are included in contract checks
- Evidence:
  - libs/mod-05-faturamento-cobranca/contracts/*

## M05-002 - Implement billing store abstraction
- Status: completed
- Output:
  - billing store interface
  - file adapter (charges/payments)
  - postgres adapter (charges/payments)
- Verification:
  - runtime tests pass for file backend and postgres smoke compatibility preserved
- Evidence:
  - apps/platform-api/src/billing-store*.mjs
  - apps/platform-api/sql/orchestration-postgres.sql

## M05-003 - Implement billing runtime endpoints
- Status: completed
- Output:
  - `POST /v1/billing/charges`
  - `PATCH /v1/billing/charges/:id`
  - `POST /v1/billing/charges/:id/collection-request`
  - `POST /v1/billing/payments`
  - `GET /v1/billing/charges`
- Verification:
  - endpoint tests cover success + validation failure paths
- Evidence:
  - apps/platform-api/src/app.mjs
  - apps/platform-api/src/app.test.mjs

## M05-004 - Emit billing orchestration signals
- Status: completed
- Output:
  - command/event flow for collection request to module 02
  - payment confirmation event flow
- Verification:
  - trace endpoint reflects billing correlation chain
- Evidence:
  - libs/core/orchestration-contracts/schemas/commands.schema.json
  - libs/core/orchestration-contracts/schemas/events.schema.json
  - apps/platform-api/src/app.mjs

## M05-005 - Governance and metrics checkpoint
- Status: completed
- Output:
  - STATE/worklog/costlog updated
- Verification:
  - docs and evidence consistent with delivered changes
