# Design - mod-01-rag-retrieval-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- Endpoint:
  - `POST /v1/owner-concierge/context/retrieve`

## Contracts
- Module 01 retrieval contracts:
  - `libs/mod-01-owner-concierge/contracts/context-retrieval-request.schema.json`
  - `libs/mod-01-owner-concierge/contracts/context-retrieval-response.schema.json`

## Retrieval Strategy
- Baseline strategy id: `lexical-salience-v1`
- Ranking signals:
  - term overlap between query and memory content
  - tag overlap
  - salience score
- Status policy:
  - default retrieve only `promoted`
  - optional include `candidate`
  - archived excluded by default
- Tie-break:
  - score desc
  - updated_at desc

## Persistence Usage
- Reuses owner memory store adapters:
  - file: in-memory scoring over `.runtime-data/owner-memory/entries.json`
  - postgres: fetch candidates from `owner_memory_entries`, score in runtime

## Vector-ready Hooks
- Response includes:
  - `vector_ready=true`
  - `embedding_ref` per context item
- Request accepts strategy hint (`vector-ready`), internally mapped to lexical baseline for now.

## Testing Strategy
- Runtime tests:
  - retrieval success after memory promotion
  - malformed retrieval request validation
- Smoke:
  - memory create/promote + retrieval in postgres path
