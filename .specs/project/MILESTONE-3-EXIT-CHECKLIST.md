# Milestone 3 Exit Checklist

Date: 2026-02-25  
Status: Completed

## Scope
Milestone 3 - Production Readiness

## Exit Criteria (ROADMAP)
- [x] Pre-production checklist pass (`PREPROD-BASELINE-CHECKLIST.md` gates verdes).
- [x] Release/rollback drills executados com sucesso.
- [x] Owner Console modulos 03/04/05 funcionais contra runtime.

## Technical/Operational Gates
1. [x] Runtime regression tests
   - comando: `npx nx run app-platform-api:test`
   - evidencias:
     - execucao direta local (pass)
     - execucoes dentro de `npm run preprod:validate` e `npm run rollback:drill` (file backend)
2. [x] Contract integrity + tenant pack
   - comando: `npx nx run contract-tests:contract-checks`
   - comando: `npm run tenant:validate`
   - evidencias:
     - todos os schemas JSON `libs/core` e `libs/mod-0x-*` OK
     - sample tenant pack validado (owner/whatsapp personas + tenant policy)
3. [x] Owner console build
   - comando: `npx nx run app-owner-console:build`
   - evidencias:
     - build estatico bem sucedido em `dist/apps/owner-console`
4. [x] CRM console build
   - comando: `npx nx run app-crm-console:build`
   - evidencias:
     - build estatico bem sucedido em `dist/apps/crm-console`
5. [x] Release dry-run
   - comando: `npm run release:dry-run -- -SkipPreprodValidate -SkipBranchProtectionCheck -SkipSmokePostgres`
   - evidencias:
     - relatorio: `tools/reports/release-dry-run-20260225-042900.log`
6. [x] Rollback drill
   - comando: `npm run rollback:drill -- -SkipPostgresSmoke`
   - evidencias:
     - relatorio: `tools/reports/rollback-drill-20260225-042902.log`
7. [x] Unified preprod gate
   - comando: `npm run preprod:validate -- -SkipSmokePostgres`
   - evidencias:
     - relatorio: `tools/reports/preprod-validate-20260225-042844.log`

## Owner Console Evidence (modulos 03/04/05)
- [x] Modulo 03 - Clientes
  - criar/listar cliente via owner console, operando sobre `/v1/customers`.
- [x] Modulo 04 - Agenda
  - criar/atualizar appointment e criar/listar reminder via owner console (`/v1/agenda/appointments`, `/v1/agenda/reminders`).
- [x] Modulo 05 - Faturamento/Cobranca
  - criar/atualizar charge, registrar payment e listar cobrancas (`/v1/billing/charges`, `/v1/billing/payments`).

## Governance/Branch Protection
- [x] Branch protection aplicada em `main` com check obrigatorio `Preprod Validate`.
  - artefato: `.specs/project/GITHUB-BRANCH-PROTECTION.md`
- [x] CI `runtime-ci` executa `npm run preprod:validate` em `push/pull_request` para `main` e publica artifact de report.

## Metrics/Governance
- [x] `worklog.csv` atualizado com esforco da Milestone 3 exit checklist.
- [x] `costlog.csv` atualizado se houver custos adicionais relevantes.

## Go/No-Go Decision
`GO` para readiness de producao segundo baseline da Milestone 3, mantendo regra de so promover para ambientes superiores (hml/prod) mediante gate `preprod:validate` verde e janela de mudanca aprovada.
