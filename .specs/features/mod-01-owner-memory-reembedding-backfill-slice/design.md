# Design - mod-01-owner-memory-reembedding-backfill-slice

Status: Implemented
Date: 2026-02-23

## Runtime Surface
- New internal endpoint in `app-platform-api`:
  - `POST /internal/maintenance/owner-memory/reembed`

## Request/Response Shape
- Request:
  - `tenant_id` (required)
  - `limit` (default 50, bounded)
  - `dry_run` (default false)
  - `mode` (optional override for embedding provider)
- Response:
  - `tenant_id`
  - `mode`
  - `dry_run`
  - `scanned_count`
  - `updated_count`
  - `failed_count`
  - `skipped_count`
  - `processed` (per-item status)

## Store Extensions
- `owner-memory-store-file.mjs`:
  - `listEntriesMissingEmbedding(tenantId, limit)`
  - `updateEntryEmbedding(tenantId, memoryId, payload)`
- `owner-memory-store-postgres.mjs`:
  - `listEntriesMissingEmbedding(tenantId, limit)`
  - `updateEntryEmbedding(tenantId, memoryId, payload)`

## Embedding Resolution
- Reuse `createEmbeddingProvider` in app runtime.
- Allow per-call mode override by creating provider instance with same credentials/config.

## Safety Rules
- Process only entries missing vector.
- Respect tenant isolation.
- Dry-run does not mutate store.

## Testing Strategy
- Add runtime test to:
  - create entry with `ownerEmbeddingMode=off`
  - run maintenance endpoint with `mode=local`
  - verify entry gets `embedding_ref`
- Add dry-run validation path.
- Keep all existing gates green.
