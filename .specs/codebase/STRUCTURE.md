# STRUCTURE

Source: fabio2
Snapshot date: 2026-02-22

## Top-level folders observed
- backend
- frontend
- docs
- contratos
- viva-brain
- agent-skills (local support assets)

## Approximate file volume (sampled)
- backend/app files: 91
- frontend/src files: 38
- docs files: 36

## Key paths
- Backend runtime: backend/app
- Frontend runtime: frontend/src
- API router root: backend/app/api/router.py
- Contract templates: contratos/templates
- Deployment docs: DEPLOY_AWS.md
- Local setup scripts: setup-windows.ps1 and docker-compose.local.yml

## Structural concerns for migration
- Monolithic repository structure with mixed concerns at root.
- Multiple compose variants can diverge over time.
- Need explicit app/lib boundaries for scale and reuse.

## Target structural direction (fabio)
- apps/<product>
- libs/domain-*
- libs/feature-*
- libs/data-access-*
- libs/ui-*
- tools/
- .specs/
