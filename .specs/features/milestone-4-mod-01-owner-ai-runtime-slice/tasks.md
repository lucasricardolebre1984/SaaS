# Tasks - milestone-4-mod-01-owner-ai-runtime-slice

Status: Draft
Date: 2026-02-25

## M4O-001 - Aprovar contrato incremental de `assistant_output`
- Status: pending
- Output:
  - schema/validacao runtime alinhados com novos campos (`provider`, `model`, `latency_ms`, `fallback_reason`)
- Evidence:
  - `apps/platform-api/src/schemas.mjs`
  - `apps/platform-api/src/app.test.mjs`

## M4O-002 - Implementar `owner-response-provider` com modos `auto/openai/local/off`
- Status: pending
- Output:
  - servico dedicado de inferencia
  - integracao no endpoint `/v1/owner-concierge/interaction` operacao `send_message`
- Evidence:
  - `apps/platform-api/src/owner-response-provider.mjs`
  - `apps/platform-api/src/app.mjs`

## M4O-003 - Cobrir testes de sucesso/fallback/erro estrito
- Status: pending
- Output:
  - suite cobrindo openai mock, local fallback e strict openai failure
- Evidence:
  - `apps/platform-api/src/app.test.mjs`

## M4O-004 - Fechar gates e governanca do slice
- Status: pending
- Output:
  - gates verdes + atualizacao de state/worklog/costlog
- Evidence:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres`
  - `.specs/project/STATE.md`
  - `.specs/project/worklog.csv`
  - `.specs/project/costlog.csv`
