# Tasks - milestone-4-runtime-config-coupling-slice

Status: Completed
Date: 2026-02-25

## M4RC-001 - Add tenant runtime config store and API endpoints
- Status: completed
- Output:
  - file-backed `tenant-runtime-config-store`
  - endpoints:
    - `POST /v1/owner-concierge/runtime-config`
    - `GET /v1/owner-concierge/runtime-config`
- Evidence:
  - `apps/platform-api/src/tenant-runtime-config-store.mjs`
  - `apps/platform-api/src/app.mjs`

## M4RC-002 - Apply tenant runtime config in owner interaction runtime
- Status: completed
- Output:
  - tenant OpenAI key/model applied to owner response provider
  - tenant personas applied as fallback when request does not provide overrides
  - tenant config can disable confirmation workflow (`confirm_required -> allow`)
- Evidence:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/app.test.mjs`

## M4RC-003 - Couple Owner Console settings to backend runtime
- Status: completed
- Output:
  - save config syncs to backend runtime config endpoint
  - startup pulls backend runtime snapshot
  - module 06 copy updated to reflect real backend coupling
- Evidence:
  - `apps/owner-console/src/app.js`
  - `apps/owner-console/src/index.html`

## M4RC-004 - Validate gates and governance
- Status: completed
- Verification:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npx nx run app-owner-console:build`
  - `npx nx run app-crm-console:build`
