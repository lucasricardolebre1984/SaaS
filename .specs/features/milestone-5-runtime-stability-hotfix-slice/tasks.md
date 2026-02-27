# Tasks - milestone-5-runtime-stability-hotfix-slice

Status: In progress
Date: 2026-02-27

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
- Status: pending
- Output esperado:
  - validar voice/whisper em runtime dev com chave OpenAI valida por tenant.
  - validar `Gerar QR Code` do modulo 02 com instance Evolution ativa.
  - registrar evidencias finais de UAT em `STATUS-ATUAL.md`.

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
