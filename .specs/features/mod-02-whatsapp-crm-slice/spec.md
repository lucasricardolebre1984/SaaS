# Spec - mod-02-whatsapp-crm-slice

Status: Implemented
Date: 2026-02-23

## Objective
Implement the first executable migration slice for Module 02 (WhatsApp CRM), covering lead funnel runtime and billing collection dispatch worker.

## Scope
- Lead aggregate (`lead`) create/list and controlled stage transitions.
- Runtime enforcement of lead-funnel transition rules from module domain definitions.
- Collection dispatch worker for `billing.collection.dispatch.request` commands with billing feedback events.

## Functional Requirements
1. Runtime must accept lead create payload validated by JSON schema.
2. Runtime must accept lead stage transition payload validated by JSON schema.
3. Runtime must persist leads in pluggable backend:
   - `file` local baseline
   - `postgres` relational baseline
4. Runtime must expose:
   - `POST /v1/crm/leads`
   - `PATCH /v1/crm/leads/:id/stage`
   - `GET /v1/crm/leads`
   - `POST /internal/worker/crm-collections/drain`
5. Lead stage transition must enforce transition matrix and required reason_code rules.
6. Collection dispatch worker must consume pending dispatch commands and emit:
   - `billing.collection.sent`
   - `billing.collection.failed`

## Non-Functional Requirements
- Deterministic validation and transition errors (`400`).
- Correlation id preservation from dispatch command to emitted billing events.
- Contract checks and runtime tests executable in Nx.
- Backward compatibility with module 03/04/05 slices and postgres smoke.

## Out Of Scope
- Campaign scheduling engine.
- Full inbound message NLP processing.
- Production provider retries and SLA policies.

## Acceptance Criteria
- Module 02 lead contracts published and validated.
- Runtime endpoints implemented with tests for create/list/transition and worker dispatch flow.
- Billing trace reflects `billing.collection.dispatch.request -> billing.collection.sent|failed`.
- `contract-checks`, `app-platform-api:test`, and `smoke:postgres` remain green.
