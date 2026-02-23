# Spec - mod-01-owner-memory-slice

Status: Implemented
Date: 2026-02-23

## Objective
Implement the first executable memory/context slice for Module 01 (Owner Concierge), providing auditable memory ingestion and controlled context promotion.

## Scope
- Owner memory entry aggregate (`owner_memory_entry`) create/list.
- Context promotion workflow (`promote`/`archive`) for stored memories.
- Tenant context summary for operational visibility.

## Functional Requirements
1. Runtime must accept memory entry payloads validated by JSON schema.
2. Runtime must persist owner memory in pluggable backend:
   - `file` local baseline
   - `postgres` relational baseline
3. Runtime must expose:
   - `POST /v1/owner-concierge/memory/entries`
   - `GET /v1/owner-concierge/memory/entries`
   - `POST /v1/owner-concierge/context/promotions`
   - `GET /v1/owner-concierge/context/summary`
4. Promotion action must emit orchestration event `owner.context.promoted`.
5. Promotion transition must be deterministic:
   - allowed from `candidate` to `promoted` or `archived`
   - blocked for terminal statuses.

## Non-Functional Requirements
- Deterministic validation/transition errors (`400` + details).
- Correlation id propagation from promotion request to emitted event.
- Contract checks and runtime tests executable in Nx.
- Backward compatibility with existing module slices and postgres smoke flow.

## Out Of Scope
- Real embedding generation.
- Vector database retrieval.
- LLM prompt assembly orchestration.

## Acceptance Criteria
- Module 01 memory contracts published and validated.
- Runtime endpoints implemented with tests for create/list/promotion/summary flows.
- Orchestration trace reflects `owner.context.promoted` for promotion flow.
- `contract-checks`, `app-platform-api:test`, and `smoke:postgres` remain green.
