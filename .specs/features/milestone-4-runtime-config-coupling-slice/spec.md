# Spec - milestone-4-runtime-config-coupling-slice

Status: Approved
Date: 2026-02-25

## Objective
Close the runtime gap between Owner Console module `06 Configuracoes` and the platform API so tenant OpenAI/persona settings are truly applied in backend execution.

## Scope
- Add tenant runtime config API in `app-platform-api`:
  - `POST /v1/owner-concierge/runtime-config`
  - `GET /v1/owner-concierge/runtime-config`
- Persist tenant runtime config in local runtime store (file-backed).
- Apply tenant runtime config to owner interaction runtime:
  - OpenAI key/model from tenant config must drive assistant provider selection.
  - Tenant persona prompts must be applied when request does not provide explicit overrides.
  - Confirmation workflow can be disabled per tenant runtime config.
- Owner Console settings save must sync config to backend (not local-only).
- Module `02 CRM WhatsApp` inside Owner Console must be operationally coupled (no placeholder view).

## Functional Requirements
1. Saving module 06 settings must push OpenAI/persona config to backend by tenant.
2. With tenant OpenAI key configured, owner interaction response provider must run as `openai`.
3. Without persona prompts, system remains neutral and functional.
4. If tenant runtime sets `confirmations_enabled=false`, `confirm_required` routes must execute as `allow`.
5. Runtime config retrieval endpoint must return sanitized status (`api_key_configured`), not raw secret.
6. Selecting module 02 in Owner Console must open embedded CRM view synchronized with current tenant/api/layout/palette.

## Non-Functional Requirements
- Preserve existing contract/test gates and avoid regressions in legacy confirmation tests.
- Keep runtime behavior deterministic and auditable through existing trace endpoints.

## Acceptance Criteria
- Owner settings sync status confirms backend apply.
- `/api/health` remains healthy and runtime tests are green.
- New tests cover:
  - runtime config upsert/get
  - OpenAI provider usage from tenant config
  - confirmation bypass when tenant disables confirmations
