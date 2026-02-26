# Design - milestone-5-aws-production-bootstrap-slice

Status: Approved
Date: 2026-02-26

## Deployment Topology (dev)
1. **Application node (AWS EC2 Ubuntu)**
   - processa `app-platform-api` (API + Owner + CRM no endpoint unico `:4001`).
   - reverse proxy (Nginx) publica `https://dev.automaniaai.com`.
2. **Database (AWS RDS PostgreSQL)**
   - backend `ORCHESTRATION_STORE_BACKEND=postgres`.
   - DSN via segredo/variavel de ambiente no host.
3. **WhatsApp provider (Evolution API)**
   - roda server-side (container no host dedicado ou no mesmo host dev).
   - SaaS integra por `integrations.crm_evolution` por tenant (menu 06).
4. **Multi-tenant model**
   - um deploy `fabio`, varios tenants (`tenant_joao`, `tenant_roberto`, ...).
   - isolamento por `tenant_id` em contratos/store.

## Configuration Model
- Runtime config por tenant continua em `runtime-config`.
- Para ambiente real, segredos devem sair de local/browser e entrar por vault/env no backend.
- Campo de configuracao no modulo 06 permanece control-plane do tenant, mas com politica de segredo mascarado.

## Readiness Gate (`deploy:aws:readiness`)
- Wrapper sobre gate institucional `preprod:validate`.
- Etapas adicionais:
  - validar existencia de `.env.aws.example`
  - validar placeholders obrigatorios de deploy
  - opcionalmente validar resolucao DNS de `dev.automaniaai.com`
- Artefato: `tools/reports/deploy-aws-readiness-<timestamp>.log`.

## Operational Artifacts
- Runbook de deploy dev AWS + DNS Hostinger.
- Atualizacao de `README.md` com comandos de readiness e fluxo dev->hml->prod.
- Atualizacao de `GATES.md` com gate de deploy AWS.

## Validation Strategy
1. `npx nx run app-platform-api:test`
2. `npx nx run contract-tests:contract-checks`
3. `npx nx run app-owner-console:build`
4. `npx nx run app-crm-console:build`
5. `npm run smoke:postgres`
6. `npm run deploy:aws:readiness -- -SkipDnsResolve`
