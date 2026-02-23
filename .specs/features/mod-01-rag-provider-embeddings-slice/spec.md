# Spec - mod-01-rag-provider-embeddings-slice

Status: Implemented
Date: 2026-02-23

## Objective
Add provider-backed embedding generation for Module 01 owner memory with deterministic local fallback, preserving current retrieval behavior and contracts.

## Scope
- Introduce embedding provider runtime service with modes:
  - `auto` (default)
  - `openai`
  - `local`
  - `off`
- Generate and persist embedding vectors for owner memory entries at create time.
- Keep retrieval contract-compatible while improving semantic relevance when vectors are present.

## Functional Requirements
1. Memory create flow must resolve embedding data before persistence.
2. In `auto` mode:
   - use OpenAI embeddings if credentials are available
   - fallback to local deterministic embedding on provider errors/unavailable config
3. In `openai` mode without valid credentials, runtime returns deterministic error (`embedding_error`).
4. Persisted owner memory record must include:
   - `embedding_ref` (public)
   - `embedding_vector` (internal, not exposed in response contracts)
5. Retrieval service must consume persisted vectors when available.

## Non-Functional Requirements
- No regression in existing module 01/02/03/04/05 flows.
- No contract drift in public memory list/summary/retrieval response schemas (except already approved retrieval hybrid fields).
- Postgres and file backends must behave consistently.

## Out Of Scope
- Vector database integration (pgvector/ANN).
- External provider multiplexing beyond OpenAI.
- Background re-embedding jobs for historical entries.

## Acceptance Criteria
- Embedding provider implemented and integrated in memory create runtime.
- File and Postgres stores persist vectors internally and keep public response shape stable.
- Tests cover:
  - local/auto fallback behavior
  - strict openai mode error when key missing
  - retrieval still functional with stored vectors
- Gates green:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
