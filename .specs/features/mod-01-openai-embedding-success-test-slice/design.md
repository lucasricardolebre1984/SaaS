# Design - mod-01-openai-embedding-success-test-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- Test-only change in:
  - `apps/platform-api/src/app.test.mjs`

## Test Strategy
- Start local mock provider server returning OpenAI-like payload:
  - `{ data: [{ embedding: [...] }] }`
- Start isolated app instance with:
  - `ownerEmbeddingMode: "openai"`
  - `openaiApiKey: "test-key"`
  - `openaiBaseUrl: <mock-url>`
- Call `POST /v1/owner-concierge/memory/entries`.
- Assert:
  - status `200`
  - `response.entry.embedding_ref` starts with `openai:`
  - mock endpoint received request

## Safety
- Isolated temp directories and server lifecycle cleanup in `finally`.
- No production runtime behavior changes.
