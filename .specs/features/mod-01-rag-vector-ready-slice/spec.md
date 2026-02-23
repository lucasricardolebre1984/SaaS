# Spec - mod-01-rag-vector-ready-slice

Status: Implemented
Date: 2026-02-23

## Objective
Advance Module 01 retrieval from lexical baseline to a deterministic hybrid lexical+vector-ready strategy without external provider dependency.

## Scope
- Extend retrieval contracts to support explicit vector-ready query mode.
- Implement hybrid ranking path (`lexical + vector + salience`) in retrieval service.
- Preserve backward compatibility for existing lexical retrieval requests.

## Functional Requirements
1. Retrieval request must support optional vector hints:
   - strategy selection for vector-ready mode
   - optional query embedding array
2. Retrieval response must expose strategy used and vector-aware scoring details.
3. Hybrid scoring must remain deterministic and bounded (`0..1`).
4. Existing clients using lexical request shape must continue to work unchanged.

## Non-Functional Requirements
- No outbound dependency on model provider in this slice.
- Contract validation must stay strict (`400` on malformed request, `500` on invalid generated payload).
- Runtime, contract checks, and postgres smoke must remain green.

## Out Of Scope
- Remote embedding provider integration.
- ANN/HNSW index engine.
- RAG chunking pipeline redesign.

## Acceptance Criteria
- Retrieval contracts updated and validated in contract checks.
- Retrieval runtime returns hybrid strategy and vector score when vector-ready mode is requested.
- Tests cover:
  - lexical default path
  - vector-ready path
  - malformed vector request validation
- Gates green:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
