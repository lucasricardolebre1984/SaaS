# Backend Switch Runbook (file -> postgres)

Date: 2026-02-23  
Scope: `app-platform-api` orchestration persistence

## Goal

Switch orchestration persistence from `file` backend to `postgres` backend with validated smoke flow.

## Preconditions

- Docker running locally
- Node dependencies installed (`npm install`)

## Local Postgres Smoke (one command)

```powershell
npm run smoke:postgres
```

What this does:

1. Starts `postgres:16-alpine` via `tools/postgres-smoke/docker-compose.yml` on `127.0.0.1:55432`
   - Compose project name is fixed to `fabio-postgres-smoke` (isolated from `fabio2`)
2. Starts `app-platform-api` with:
   - `ORCHESTRATION_STORE_BACKEND=postgres`
   - `ORCHESTRATION_PG_DSN=postgres://fabio:fabio@127.0.0.1:55432/fabio_dev`
3. Executes end-to-end flow:
   - `POST /v1/owner-concierge/interaction`
   - `POST /internal/worker/module-tasks/drain`
   - `GET /internal/orchestration/trace`
4. Verifies persisted rows in:
   - `public.orchestration_commands`
   - `public.orchestration_events`
   - `public.orchestration_module_task_queue`
5. Stops containers and removes volumes (default behavior)

Isolation note:
- This smoke flow does not reuse `fabio2` containers, network, or volumes.
- Dedicated Docker artifacts are prefixed with `fabio-postgres-smoke`.

## Manual Runtime Switch

Set environment variables before running API:

```powershell
$env:ORCHESTRATION_STORE_BACKEND='postgres'
$env:ORCHESTRATION_PG_DSN='postgres://fabio:fabio@127.0.0.1:55432/fabio_dev'
node apps/platform-api/src/server.mjs
```

Optional:

- `ORCHESTRATION_PG_SCHEMA` (default: `public`)
- `ORCHESTRATION_PG_AUTO_MIGRATE=false` to disable startup schema creation

## Rollback

To rollback instantly to current stable behavior:

```powershell
$env:ORCHESTRATION_STORE_BACKEND='file'
Remove-Item Env:ORCHESTRATION_PG_DSN -ErrorAction SilentlyContinue
node apps/platform-api/src/server.mjs
```

No contract/API changes are required for rollback.

## SQL Baseline

Reference schema: `apps/platform-api/sql/orchestration-postgres.sql`

Also includes Module 03 baseline table:
- `public.customers`
