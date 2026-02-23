# Spec - mod-01-openai-embedding-success-test-slice

Status: Implemented
Date: 2026-02-23

## Objective
Validate the successful runtime path of owner memory embedding generation in strict `openai` mode using a local mock server.

## Scope
- Add integration test covering successful `openai` embedding response.
- Assert memory create response remains contract-compatible and includes provider-generated `embedding_ref`.

## Functional Requirements
1. Test must start a local mock HTTP server for `/embeddings`.
2. App must run in `ownerEmbeddingMode=openai` with mock `openaiBaseUrl`.
3. Memory entry creation must succeed (`200`) and return entry with `embedding_ref` from provider mode.

## Non-Functional Requirements
- No outbound network dependency in tests.
- Existing tests and gates remain green.

## Out Of Scope
- Real OpenAI API calls in CI.
- New runtime contracts.

## Acceptance Criteria
- New test added and passing in `app-platform-api:test`.
- Full gates remain green (`test`, `contract-checks`, `smoke:postgres`).
