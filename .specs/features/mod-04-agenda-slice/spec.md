# Spec - mod-04-agenda-slice

Status: Implemented
Date: 2026-02-23

## Objective
Implement the first executable migration slice for Module 04 (Agenda), with contract-first scheduling and reminder lifecycle integrated with dual-concierge orchestration.

## Scope
- Core appointment aggregate (`appointment`) and reminder aggregate (`reminder`).
- Appointment creation/update/cancel from owner requests.
- Reminder scheduling flow with deterministic status lifecycle.
- Reminder dispatch request command for WhatsApp channel through module 02.

## Functional Requirements
1. Runtime must accept appointment create/update/cancel payloads validated by JSON schema.
2. Runtime must persist appointments and reminders in pluggable backend:
   - `file` local baseline
   - `postgres` relational baseline
3. Runtime must emit agenda lifecycle events:
   - `agenda.reminder.scheduled`
   - `agenda.reminder.sent` (logical state transition after dispatch request)
   - `agenda.reminder.canceled`
4. Runtime must expose:
   - `POST /v1/agenda/appointments`
   - `PATCH /v1/agenda/appointments/:id`
   - `POST /v1/agenda/reminders`
   - `GET /v1/agenda/reminders`
5. Reminder dispatch to WhatsApp must be represented as orchestration command/event flow (without external provider call in this slice).

## Non-Functional Requirements
- Deterministic validation error model (`400` + contract details).
- Correlation id propagation from owner action to reminder lifecycle events.
- Contract checks and runtime tests executable through Nx.
- Backward compatibility with existing runtime endpoints and smoke flow.

## Out Of Scope
- Calendar UI.
- External calendar sync (Google/Microsoft).
- Real provider send execution for reminders.
- Production deployment.

## Acceptance Criteria
- Module 04 contracts published and validated.
- Agenda runtime endpoints implemented and covered by tests.
- Reminder lifecycle appears in orchestration trace with preserved correlation id.
- `contract-checks`, `app-platform-api:test`, and `smoke:postgres` remain green.
