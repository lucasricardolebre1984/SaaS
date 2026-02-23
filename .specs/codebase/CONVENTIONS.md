# CONVENTIONS

Derived from fabio2 code and docs.

## Process conventions
- Register new bug in docs/BUGSREPORT.md before fixing.
- Update bug status in same delivery.
- Keep COFRE as canonical source for VIVA persona/skills memory.

## Backend conventions
- FastAPI with APIRouter per domain.
- Service-driven business logic under app/services.
- Async database sessions and explicit commits.
- Configuration via environment variables in app/config.py.

## Frontend conventions
- Next.js app router under src/app.
- Alias imports with @/*.
- TypeScript strict mode enabled.
- Dashboard pages grouped in (dashboard).

## Infra conventions
- Docker compose as primary local orchestration.
- .env based configuration for secrets/runtime.
- Dedicated compose files for local/prod variants.

## Gaps to standardize in new repo
- Unified lint/test standards across backend and frontend.
- Common module naming strategy for reuse across future SaaS.
- Stronger branch policy and mandatory phase gates.
- Explicit architecture decision records per major change.
