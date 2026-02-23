# Design - runtime-dual-concierge-slice

Status: In Progress
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- Node HTTP server (no framework dependency)
- Ajv validators loaded from contract artifacts in `libs/`

## Endpoints
1. `GET /health`
2. `POST /v1/owner-concierge/interaction`
3. `POST /provider/evolution/webhook`
4. `POST /provider/evolution/outbound/validate`

## Validation Strategy
- Owner request validator uses `multimodal-api.schema.json` request node.
- Evolution webhook validator uses `evolution-webhook.schema.json`.
- Outbound queue validator uses `outbound-queue.schema.json`.

## Response Pattern
- Success:
  - status `200`
  - normalized response body
- Validation failure:
  - status `400`
  - `{ error: "validation_error", details: [...] }`

## Testing Strategy
- `node:test` integration-style tests boot local ephemeral server.
- Validate:
  - health response
  - valid/invalid owner interaction
  - valid/invalid webhook
  - valid/invalid outbound queue payload
