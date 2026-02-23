# Spec - mod-01-rag-retrieval-slice

Status: Implemented
Date: 2026-02-23

## Objective
Implement the first retrieval layer for Module 01 memory, vector-ready and contract-first, to supply relevant promoted context to owner interactions.

## Scope
- Retrieval query contract for owner context search.
- Deterministic lexical+salience ranking baseline.
- Retrieval endpoint over existing owner memory store.

## Functional Requirements
1. Runtime must accept context retrieval request payload validated by JSON schema.
2. Runtime must expose:
   - `POST /v1/owner-concierge/context/retrieve`
3. Retrieval must support:
   - query text
   - optional session filter
   - optional tag hints
   - top-k and min-score parameters
4. Retrieval must be vector-ready:
   - include `embedding_ref` in returned items
   - explicit retrieval strategy metadata
5. Retrieval must default to promoted memory entries and allow optional candidate inclusion.

## Non-Functional Requirements
- Deterministic ranking with stable tie-break.
- Contract checks and runtime tests executable in Nx.
- Backward compatibility with existing owner memory endpoints and postgres smoke flow.

## Out Of Scope
- Embedding generation jobs.
- External vector DB integration.
- Prompt orchestration with LLM provider calls.

## Acceptance Criteria
- Retrieval contracts published and validated.
- Runtime retrieval endpoint implemented with tests for success and validation errors.
- Postgres smoke flow validates retrieval output.
- `contract-checks`, `app-platform-api:test`, and `smoke:postgres` remain green.
