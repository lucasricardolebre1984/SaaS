# Design - mod-04-agenda-slice

Status: Draft
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- New endpoints:
  - `POST /v1/agenda/appointments`
  - `PATCH /v1/agenda/appointments/:id`
  - `POST /v1/agenda/reminders`
  - `GET /v1/agenda/reminders?tenant_id=...`

## Contracts
- Module 04 contract package:
  - `libs/mod-04-agenda/contracts/appointment-create.schema.json`
  - `libs/mod-04-agenda/contracts/appointment-update.schema.json`
  - `libs/mod-04-agenda/contracts/reminder-create.schema.json`
  - `libs/mod-04-agenda/contracts/reminder-list.schema.json`
  - `libs/mod-04-agenda/contracts/reminder-events.schema.json`
- Core orchestration schema extension:
  - command names for reminder dispatch intent (module 04 -> module 02)
  - event names for reminder lifecycle terminal updates

## Data Model Baseline
- `appointment`:
  - `appointment_id`, `tenant_id`, `title`, `description`, `start_at`, `end_at`, `timezone`, `status`, `created_at`, `updated_at`
- `reminder`:
  - `reminder_id`, `appointment_id`, `tenant_id`, `schedule_at`, `channel`, `recipient`, `status`, `external_key`, `created_at`, `updated_at`
- Status lifecycle:
  - `scheduled` -> `dispatch_requested` -> `sent` | `failed` | `canceled`

## Persistence Adapters
- File adapter:
  - `.runtime-data/agenda/appointments.json`
  - `.runtime-data/agenda/reminders.json`
- Postgres adapter:
  - `public.agenda_appointments`
  - `public.agenda_reminders`
  - unique `(tenant_id, external_key)` for reminder idempotency

## Orchestration Integration
- Reminder scheduling emits:
  - `agenda.reminder.scheduled`
- Dispatch request emits:
  - command targeting `mod-02-whatsapp-crm` for reminder delivery intent
- Dispatch completion in this slice remains simulated by internal state update and event emission.

## Testing Strategy
- Contract tests:
  - parse + required field coverage for module 04 schemas
- Runtime tests:
  - create/update appointment
  - create reminder and list reminders
  - idempotent reminder by external key
  - correlation trace contains agenda lifecycle event(s)
  - validation errors for bad schedule/channel payloads
