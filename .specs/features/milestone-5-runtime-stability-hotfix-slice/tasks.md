# Tasks - milestone-5-runtime-stability-hotfix-slice

Status: Completed
Date: 2026-03-02

## M5B-001 - Sanitizacao de API key tenant runtime
- Status: completed
- Output:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/tenant-runtime-config-store.mjs`
  - regra: manter somente primeiro token de `openai.api_key`.

## M5B-002 - Correcoes mobile owner console + fallback avatar
- Status: completed
- Output:
  - `apps/owner-console/src/index.html`
  - `apps/owner-console/src/styles.css`
  - `apps/owner-console/src/app.js`
  - drawer/backdrop/fechamento mobile + fallback de video no avatar continuo.

## M5B-003 - Higiene de branches remotas e protocolo
- Status: completed
- Output:
  - PR #3 mergeado em `main` (squash).
  - Branches remotas antigas removidas.
  - Branch protection da `main` restaurada.

## M5B-004 - Rollout AWS dev e validacao operacional
- Status: completed
- Output:
  - fallback de API key global aplicado para `audio/transcribe` e `audio/speech` no backend.
  - endpoint de QR Evolution robustecido com estados `ready|connected|pending_qr` e retry de create.
  - UX do CRM atualizada para exibir QR/pairing/status em vez de area vazia.
  - deploy executado em AWS dev (`/srv/SaaS`) com `saas.service` ativo e health `200`.

## M5B-005 - UAT operacional OpenAI + Evolution (dev)
- Status: completed
- Output:
  - voice/whisper validados em runtime dev com tenant config ativo.
  - `Gerar QR Code` validado no modulo 02 com instance Evolution ativa (`connected/open`).
  - evidencias finais registradas em `STATE.md`, `STATUS-ATUAL.md`, `worklog.csv`, `costlog.csv`.
  - smoke endpoint-a-endpoint Owner/CRM/Clientes/Agenda/Cobranca validado.
- Evidencias:
  - `tools/reports/preprod-validate-20260302-165103.log`
  - `tools/reports/saas-endpoint-smoke-20260302-165147.json` (`PASS=25`, `WARN=1`, `FAIL=0`)
  - health publico: `https://dev.automaniaai.com.br/api/health` (`200`)

## M5B-006 - Hotfix auto-resposta inbound WhatsApp (Evolution)
- Status: completed
- Output:
  - `apps/platform-api/src/app.mjs`
    - webhook inbound passa a tentar auto-resposta Evolution `sendText` com fallback de compatibilidade (`text` e `textMessage.text`);
    - resposta do webhook inclui `auto_reply.status` (`sent|failed|disabled|skipped`) sem quebrar `status=accepted`.
  - `apps/platform-api/src/app.test.mjs`
    - cobertura para inbound sem configuracao (`auto_reply.failed`);
    - cobertura para envio outbound com mock Evolution e fallback de payload.
- Validacao:
  - `npx nx run app-platform-api:test` (pass)
  - `npx nx run contract-tests:contract-checks` (pass)

## Evidence
- Branch: `main` (via PR #3 mergeado em 2026-02-26T21:56:05Z)
- Commit de runtime hotfix: `8474a4e` (main)
- Gate local:
  - `npx nx run app-platform-api:test` (pass)
  - `npx nx run app-crm-console:build` (pass)
  - `npx nx run app-owner-console:build` (pass)
- Deploy dev:
  - `npm run deploy:dev` (pass)
  - `https://dev.automaniaai.com.br/api/health` (200)
- Gate operacional atualizado:
  - `tools/preprod-validate.ps1` inclui `saas-endpoint-smoke` por padrao
  - flags de contingencia: `-SkipSaasEndpointSmoke`, `-SaasEndpointSmokeBaseUrl`, `-SaasEndpointSmokeTenantId`
