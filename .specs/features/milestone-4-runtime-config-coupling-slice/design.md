# Design - milestone-4-runtime-config-coupling-slice

Status: Approved
Date: 2026-02-25

## Architecture
- New runtime component:
  - `apps/platform-api/src/tenant-runtime-config-store.mjs`
  - file-backed, tenant-scoped config persistence
- API integration in `apps/platform-api/src/app.mjs`:
  - runtime config endpoints (GET/POST)
  - tenant-aware provider resolution for owner response
  - tenant-aware persona fallback merge
  - tenant-aware confirmation policy override
- UI integration in `apps/owner-console/src/app.js`:
  - settings save performs backend sync (`/v1/owner-concierge/runtime-config`)
  - startup pulls sanitized runtime config snapshot
  - module 02 uses embedded CRM view (`iframe /crm`) instead of placeholder
- CRM integration in `apps/crm-console/src/app.js`:
  - supports query bootstrap (`tenant`, `api`, `layout`, `palette`) for owner->crm synchronization

## Data Model (tenant runtime config)
- `openai`
  - `api_key`
  - `model`
  - `vision_enabled`
  - `voice_enabled`
  - `image_generation_enabled`
  - `image_read_enabled`
- `personas`
  - `owner_concierge_prompt`
  - `whatsapp_agent_prompt`
- `execution`
  - `confirmations_enabled`

## Runtime Rules
1. Request `persona_overrides` wins over tenant persona defaults.
2. If tenant has OpenAI key, provider mode for owner response is forced to `openai`.
3. If tenant execution has `confirmations_enabled=false`, `confirm_required` is converted to `allow`.
4. If tenant runtime config does not exist, previous behavior is preserved.

## Validation Plan
- `npx nx run app-platform-api:test`
- `npx nx run contract-tests:contract-checks`
- `npx nx run app-owner-console:build`
- `npx nx run app-crm-console:build`
