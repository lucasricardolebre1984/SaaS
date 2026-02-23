# Design - mod-01-rag-vector-ready-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- Existing endpoint reused:
  - `POST /v1/owner-concierge/context/retrieve`

## Contracts
- Update:
  - `libs/mod-01-owner-concierge/contracts/context-retrieval-request.schema.json`
  - `libs/mod-01-owner-concierge/contracts/context-retrieval-response.schema.json`

## Retrieval Strategy
- Default (compatibility):
  - `lexical-salience-v1`
- New vector-ready strategy:
  - `hybrid-lexical-vector-v1`
  - score composition:
    - lexical score (term/tag overlap + salience)
    - vector similarity score (deterministic local embedding)
    - hybrid weighted score bounded to `0..1`

## Deterministic Vector Layer
- Build local semantic vector from normalized text/tags.
- No remote model call in this slice.
- Optional request embedding can override query-side generated vector.

## Response Additions
- Retrieval item includes:
  - `lexical_score`
  - `vector_score`
  - `score` (hybrid final score)
- Keep existing fields (`matched_terms`, `matched_tags`, `embedding_ref`) for compatibility.

## Testing Strategy
- Add tests in `apps/platform-api/src/app.test.mjs`:
  - vector-ready retrieval returns hybrid strategy and score breakdown.
  - malformed query embedding is rejected by request contract.
- Keep existing retrieval tests passing for lexical path.
