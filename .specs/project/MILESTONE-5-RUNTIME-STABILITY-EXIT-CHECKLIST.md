# Milestone 5 Runtime Stability Exit Checklist

Date: 2026-03-02  
Status: Completed

## Scope
Milestone 5 stabilization slice - `milestone-5-runtime-stability-hotfix-slice`

## Exit Criteria (feature/tasks)
- [x] Sanitizacao defensiva de `openai.api_key` por tenant aplicada e validada.
- [x] Mobile Owner Console estabilizado (drawer/backdrop/fechamento + avatar fallback).
- [x] Hotfix inbound WhatsApp com tentativa de auto-resposta via Evolution sem quebrar webhook `accepted`.
- [x] UAT operacional OpenAI + Evolution no dev AWS com evidencias auditaveis.
- [x] Gate permanente de regressao de botoes/endpoints integrado em `preprod:validate`.

## Technical/Operational Gates
1. [x] Runtime tests
   - comando: `npx nx run app-platform-api:test`
   - evidencia: 62/62 pass (ultima execucao em 2026-03-02)
2. [x] Contract checks
   - comando: `npx nx run contract-tests:contract-checks`
   - evidencia: schemas + executable contract tests pass
3. [x] Owner build
   - comando: `npx nx run app-owner-console:build`
4. [x] CRM build
   - comando: `npx nx run app-crm-console:build`
5. [x] Unified gate com smoke de endpoints
   - comando: `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`
   - relatorio: `tools/reports/preprod-validate-20260302-165103.log`
6. [x] Endpoint smoke (owner/crm/mod03/mod04/mod05)
   - comando: `powershell -ExecutionPolicy Bypass -File tools/smoke-saas-endpoints.ps1 -BaseUrl https://dev.automaniaai.com.br/api -TenantId tenant_automania`
   - relatorio: `tools/reports/saas-endpoint-smoke-20260302-165147.json`
   - resultado: `PASS=25`, `WARN=1`, `FAIL=0`

## Runtime Dev Evidence (AWS)
- [x] Deploy atualizado em `/srv/SaaS` com `saas.service` ativa.
- [x] Health publico `https://dev.automaniaai.com.br/api/health` retornando `200`.
- [x] Conversa real no CRM (`+5516981903443`) com inbound e outbound `delivery_state=sent`.

## Governance
- [x] Contexto e prioridade alinhados em `AGENTS.md`, `STATE.md`, `PROXIMO-PASSO.md`, `STATUS-ATUAL.md`.
- [x] Planta de endpoints/botoes atualizada (`docs/PLANTA-ENDPOINTS-SAAS.md`).
- [x] Metricas registradas (`worklog.csv`, `costlog.csv`).

## Go/No-Go Decision
`GO` para encerrar o slice de estabilidade M5B.  
Operacao dev AWS estabilizada com trilha auditavel por endpoint e gate permanente de regressao.
