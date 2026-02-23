# STACK

Source codebase analyzed: C:\projetos\fabio2
Analysis date: 2026-02-22

## Languages and Runtime
- Python 3.11 (backend)
- TypeScript + React (frontend)
- Node.js 20 runtime in CI (frontend)
- Docker/Docker Compose for local and aws deployment

## Backend
- Framework: FastAPI
- ORM: SQLAlchemy async + asyncpg
- Migrations: Alembic
- Cache/queue support: Redis
- Validation: Pydantic v2
- Auth: JWT + passlib/bcrypt
- Observability libs: structlog, python-json-logger
- Testing: pytest, pytest-asyncio, pytest-cov

## Frontend
- Framework: Next.js 14 (App Router)
- React 18, TypeScript strict mode
- Styling: Tailwind CSS + shadcn/radix primitives
- Data fetch: Axios + TanStack Query
- Validation/forms: zod + react-hook-form

## Infra and Containers
- PostgreSQL (pgvector image)
- Redis
- Evolution API (WhatsApp)
- Optional pgAdmin profile in compose
- Backend and frontend dockerfiles present

## AI and Voice Integrations (configured in backend)
- OpenAI
- MiniMax TTS
- Optional DeepSeek / Ollama compatibility settings

## Current CI
- GitHub Actions (.github/workflows/main.yml)
- Frontend: npm ci, type-check, build
- Backend: pip install, python compileall smoke
