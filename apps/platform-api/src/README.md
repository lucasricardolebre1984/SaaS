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

- Store backend:
  - `file` (default): persists in `.runtime-data/orchestration/`
  - `postgres`: persists in PostgreSQL tables (auto-migrate on startup)
- For `postgres` backend configure:
  - `ORCHESTRATION_STORE_BACKEND=postgres`
  - `ORCHESTRATION_PG_DSN=postgres://...`
  - optional `ORCHESTRATION_PG_SCHEMA=public`
- Task planning uses policy file: `apps/platform-api/config/task-routing.policy.json`.
- SQL baseline: `apps/platform-api/sql/orchestration-postgres.sql`.
