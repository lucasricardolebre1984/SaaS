# app-platform-api

Runtime skeleton placeholder for API orchestration surface.

## Endpoints

- `GET /health`
- `POST /v1/billing/charges`
- `PATCH /v1/billing/charges/:id`
- `POST /v1/billing/charges/:id/collection-request`
- `POST /v1/billing/payments`
- `GET /v1/billing/charges?tenant_id=...`
- `POST /v1/agenda/appointments`
- `PATCH /v1/agenda/appointments/:id`
- `POST /v1/agenda/reminders`
- `GET /v1/agenda/reminders?tenant_id=...`
- `POST /v1/customers`
- `GET /v1/customers?tenant_id=...`
- `GET /v1/customers/:id?tenant_id=...`
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
- Customer store backend follows the same toggle (`ORCHESTRATION_STORE_BACKEND`) and persists:
  - `file`: `.runtime-data/customers/`
  - `postgres`: `public.customers`
- Agenda store backend follows the same toggle (`ORCHESTRATION_STORE_BACKEND`) and persists:
  - `file`: `.runtime-data/agenda/`
  - `postgres`: `public.agenda_appointments`, `public.agenda_reminders`
- Billing store backend follows the same toggle (`ORCHESTRATION_STORE_BACKEND`) and persists:
  - `file`: `.runtime-data/billing/`
  - `postgres`: `public.billing_charges`, `public.billing_payments`
- For `postgres` backend configure:
  - `ORCHESTRATION_STORE_BACKEND=postgres`
  - `ORCHESTRATION_PG_DSN=postgres://...`
  - optional `ORCHESTRATION_PG_SCHEMA=public`
- Task planning uses policy file: `apps/platform-api/config/task-routing.policy.json`.
- SQL baseline: `apps/platform-api/sql/orchestration-postgres.sql`.
- Operational runbook: `apps/platform-api/RUNBOOK-backend-switch.md`.
- Local smoke command: `npm run smoke:postgres`.
- Smoke Docker project is isolated as `fabio-postgres-smoke` (no shared infra with `fabio2`).
