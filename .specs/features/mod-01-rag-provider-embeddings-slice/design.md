# Design - mod-01-rag-provider-embeddings-slice

Status: Implemented
Date: 2026-02-23

## Runtime Components
- New:
  - `apps/platform-api/src/embedding-provider.mjs`
  - `apps/platform-api/src/semantic-embedding.mjs`
- Updated:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/owner-memory-store-file.mjs`
  - `apps/platform-api/src/owner-memory-store-postgres.mjs`
  - `apps/platform-api/src/context-retrieval.mjs`

## Provider Modes
- `auto` (default):
  - OpenAI if configured
  - fallback local deterministic embedding
- `openai`:
  - strict provider mode (error if not configured)
- `local`:
  - deterministic local embedding only
- `off`:
  - no vector generation

## Data Model
- Internal owner memory persistence gains `embedding_vector`:
  - File adapter: stored in JSON records.
  - Postgres adapter: `owner_memory_entries.embedding_vector_json JSONB`.
- Public response remains unchanged (no new fields in memory list contract).

## Retrieval Integration
- Retrieval keeps strategy behavior from vector-ready slice.
- Query vector:
  - request-provided embedding if present
  - otherwise derived locally
- Entry vector:
  - persisted `embedding_vector` when available
  - fallback to deterministic local derivation from content/tags

## Error Semantics
- Embedding resolution failure in strict mode returns:
  - `500`
  - `{ error: "embedding_error", details: ... }`

## Testing Strategy
- Add unit/integration tests in `app.test.mjs` for:
  - auto/local fallback produces `embedding_ref` and successful create
  - strict openai mode without key fails with `embedding_error`
  - retrieval works using entries created under new embedding flow
- Preserve full existing gate coverage.
