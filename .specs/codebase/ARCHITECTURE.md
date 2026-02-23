# ARCHITECTURE

Source: fabio2

## Macro View
Browser (Next.js) -> FastAPI (/api/v1) -> PostgreSQL + Redis + external APIs.

## Main Runtime Components
- frontend (Next.js app)
- backend (FastAPI app)
- postgres
- redis
- evolution-api (WhatsApp bridge)

## Backend module layout
backend/app:
- api (v1 endpoints)
- services (business rules and orchestration)
- models (database models)
- schemas (pydantic contracts)
- core/config/db utilities

## API Domain Routing
Router prefixes in backend/app/api/router.py:
- /auth
- /contratos
- /clientes
- /agenda
- /google-calendar
- /whatsapp
- /webhook
- /whatsapp-chat
- /viva
- /cofre

## Frontend route groups
frontend/src/app:
- (dashboard): agenda, campanhas, chat, clientes, contratos, whatsapp
- viva
- api (currently no local route files found)

## Memory and persona model
Institutional rule declares COFRE as source of truth for VIVA personas/skills/memories.

## Deployment shape (current)
- Local: docker compose + local frontend dev
- AWS: EC2 Ubuntu + docker compose based deployment plan

## Architectural observations
- Domain-rich backend services with many integrations.
- Good separation between API routers and service layer.
- Potential coupling concentration in VIVA/WhatsApp services.
