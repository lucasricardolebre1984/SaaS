# Tasks - milestone-5-runtime-stability-hotfix-slice

Status: In progress
Date: 2026-02-26

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
- Status: pending
- Output esperado:
  - aplicar ultimo commit no host (`/srv/SaaS`).
  - limpar valor legado de `tenant-runtime-config.json` no servidor (se necessario).
  - validar `provider: openai` + audio transcribe/speech.

## Evidence
- Branch: `main` (via PR #3 mergeado em 2026-02-26T21:56:05Z)
- Commit local de hotfix: `56af922` (incluido no merge squash de `main`)
- Gate local:
  - `npx nx run app-platform-api:test` (pass)
  - `npx nx run app-owner-console:build` (pass)
