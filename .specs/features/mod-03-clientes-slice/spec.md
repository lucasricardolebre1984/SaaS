# Spec - mod-03-clientes-slice

Status: Draft
Date: 2026-02-23

## Objective
Implement the first executable migration slice for Module 03 (Clientes), preserving contract-first boundaries and dual-concierge orchestration compatibility.

## Scope
- Customer aggregate baseline (`customer`) with lifecycle states.
- Customer creation from two origins:
  - manual owner action (Module 01)
  - lead conversion signal (Module 02)
- Basic customer retrieval for orchestration consumers.
- Contract-level compatibility with existing command/event envelope model.

## Functional Requirements
1. Runtime must accept customer create command payloads validated by JSON schema.
2. Runtime must persist customer records in pluggable store mode:
   - `file` (local baseline)
   - `postgres` (relational baseline)
3. Runtime must emit customer lifecycle events:
   - `customer.created`
   - `customer.updated` (when status/fields change)
4. Lead conversion from Module 02 must map to deterministic customer create contract.
5. Owner lookup flow must expose `GET /v1/customers/:id` and `GET /v1/customers`.

## Non-Functional Requirements
- Idempotent creation for repeated external correlation keys.
- Deterministic validation errors (`400` with contract details).
- Traceability: correlation id from origin command must be preserved in emitted events.
- Contract tests and runtime tests must run in Nx.

## Out Of Scope
- Full CRM UI.
- Billing integration logic.
- Advanced segmentation, scoring, or campaign execution.
- Production deployment.

## Acceptance Criteria
- Contracts for module 03 customer create/list/get are published.
- Runtime endpoints + store adapters pass tests for file and postgres paths.
- Contract checks remain green.
- Trace endpoint reflects customer command/event chain with preserved correlation id.
