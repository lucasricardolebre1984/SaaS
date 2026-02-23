# Spec - mod-05-faturamento-cobranca-slice

Status: Draft
Date: 2026-02-23

## Objective
Implement the first executable migration slice for Module 05 (Faturamento/Cobranca) with contract-first billing and collection orchestration integrated to module 02.

## Scope
- Core charge aggregate (`charge`) and payment aggregate (`payment`).
- Charge creation/update lifecycle from owner requests.
- Collection request flow targeting module 02 (WhatsApp CRM).
- Payment confirmation flow updating charge status.

## Functional Requirements
1. Runtime must accept charge create/update payloads validated by JSON schema.
2. Runtime must persist charges and payments in pluggable backend:
   - `file` local baseline
   - `postgres` relational baseline
3. Runtime must expose:
   - `POST /v1/billing/charges`
   - `PATCH /v1/billing/charges/:id`
   - `POST /v1/billing/charges/:id/collection-request`
   - `POST /v1/billing/payments`
   - `GET /v1/billing/charges`
4. Collection request must emit orchestration signal for module 02.
5. Payment confirmation must transition charge state deterministically.

## Non-Functional Requirements
- Deterministic validation errors (`400` + contract details).
- Correlation id propagation from charge command to billing events.
- Contract checks and runtime tests executable in Nx.
- Backward compatibility with existing runtime and smoke flow.

## Out Of Scope
- PSP integration (Stripe/Pagar.me/etc.).
- Fiscal document issuance.
- Production deployment.

## Acceptance Criteria
- Module 05 contracts published and validated.
- Runtime endpoints implemented with tests for create/update/collection/payment flows.
- Billing lifecycle appears in orchestration trace with preserved correlation id.
- `contract-checks`, `app-platform-api:test`, and `smoke:postgres` remain green.
