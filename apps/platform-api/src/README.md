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
- `GET /internal/orchestration/module-task-queue`
- `POST /internal/worker/module-tasks/drain`

## Runtime Notes

- Orchestration envelopes are persisted as NDJSON in `.runtime-data/orchestration/`.
- Module task queue state is persisted in `.runtime-data/orchestration/module-task-queue.json`.
- Task planning uses policy file: `apps/platform-api/config/task-routing.policy.json`.
