# Design - milestone-4-mod-01-openai-strict-provider-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Backend change in `apps/platform-api/src/app.mjs`:
  - update tenant-aware response provider resolver to force `mode='openai'` whenever tenant API key is present.
- Frontend change in Owner Console:
  - `apps/owner-console/src/index.html`: add topbar provider status pill.
  - `apps/owner-console/src/app.js`: introduce provider status state updater and wire it into interaction success/error paths.
  - `apps/owner-console/src/styles.css`: add visual variants for provider status (`openai`, `local`, `error`).

## Runtime Rules
1. Tenant API key present => strict OpenAI provider.
2. Tenant API key absent => existing configured default provider behavior.
3. Provider status shown in UI must reflect last interaction result, not only runtime configuration snapshot.

## Validation Plan
- `npx nx run app-platform-api:test`
- `npx nx run app-owner-console:build`
- Manual smoke:
  - open `http://127.0.0.1:4001/owner/`
  - send interaction with tenant key configured and verify provider pill changes to `provider: openai`.
