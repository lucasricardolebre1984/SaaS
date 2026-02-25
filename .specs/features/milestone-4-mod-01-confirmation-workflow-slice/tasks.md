# Tasks - milestone-4-mod-01-confirmation-workflow-slice

Status: Completed
Date: 2026-02-25

## M4C-001 - Publicar contratos de confirmacao
- Status: completed
- Output:
  - `response.confirmation` em interaction
  - schema do endpoint de decisao de confirmacao
  - eventos de confirmacao em contracts core
- Evidence:
  - `libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json`
  - `libs/mod-01-owner-concierge/contracts/interaction-confirmation-action.schema.json`
  - `libs/core/orchestration-contracts/schemas/events.schema.json`

## M4C-002 - Implementar persistencia e endpoint de resolucao
- Status: completed
- Output:
  - store com suporte a confirmations (`file` + `postgres`)
  - endpoint `POST /v1/owner-concierge/interaction-confirmations`
  - criacao de pending confirmation no fluxo `confirm_required`
- Evidence:
  - `apps/platform-api/src/orchestration-store-file.mjs`
  - `apps/platform-api/src/orchestration-store-postgres.mjs`
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/sql/orchestration-postgres.sql`

## M4C-003 - Cobrir testes de workflow
- Status: completed
- Output:
  - testes integration cobrindo pending + approve + reject + estado invalido
- Evidence:
  - `apps/platform-api/src/app.test.mjs`

## M4C-004 - Fechar gates e governanca
- Status: completed
- Output:
  - gates verdes e atualizacao de contexto institucional
- Evidence:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres`
  - `.specs/project/ROADMAP.md`
  - `.specs/project/STATE.md`
  - `.specs/project/worklog.csv`
  - `.specs/project/costlog.csv`
