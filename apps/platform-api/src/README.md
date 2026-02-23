# app-platform-api

Runtime skeleton placeholder for API orchestration surface.

## Endpoints

- `GET /health`
- `POST /v1/owner-concierge/interaction`
- `POST /provider/evolution/webhook`
- `POST /provider/evolution/outbound/validate`
- `GET /internal/orchestration/commands`
- `GET /internal/orchestration/events`
- `GET /internal/orchestration/trace?correlation_id={uuid}`

## Runtime Notes

- Orchestration envelopes are persisted as NDJSON in `.runtime-data/orchestration/`.
- Task planning uses policy file: `apps/platform-api/config/task-routing.policy.json`.
