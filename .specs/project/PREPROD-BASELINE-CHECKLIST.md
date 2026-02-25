# Pre-Production Baseline Checklist

Date: 2026-02-25  
Status: Baseline published (planning)
Scope: Milestone 3 production readiness

## Purpose
Definir critério institucional mínimo para decisão `GO/NO-GO` antes de qualquer deploy real do SaaS padrão.

## Environment Promotion Matrix
1. `local`:
   - objetivo: desenvolvimento e validação técnica diária
   - promoção para `hml`: gates locais verdes + checklist de mudança preenchido
2. `hml`:
   - objetivo: validação integrada e operacional
   - promoção para `prod`: checklist pré-produção 100% aprovado
3. `prod`:
   - objetivo: operação de negócio
   - entrada somente com decisão formal `GO`

## Mandatory Gates (GO/NO-GO)
Gate orchestrator (preferred):
- comando: `npm run preprod:validate`
- evidência: `tools/reports/preprod-validate-<timestamp>.log`
- CI mapping: `.github/workflows/runtime-ci.yml`

1. Contract integrity:
   - comando: `npx nx run contract-tests:contract-checks`
   - owner: Engineering
   - status exigido: pass
2. Runtime regression:
   - comando: `npx nx run app-platform-api:test`
   - owner: Engineering
   - status exigido: pass
3. Tenant pack validation:
   - comando: `npm run tenant:validate`
   - owner: Engineering
   - status exigido: pass
4. Postgres end-to-end smoke:
   - comando: `npm run smoke:postgres`
   - owner: Engineering/Ops
   - status exigido: pass
5. Owner console build:
   - comando: `npx nx run app-owner-console:build`
   - owner: Engineering
   - status exigido: pass
6. CRM console build:
   - comando: `npx nx run app-crm-console:build`
   - owner: Engineering
   - status exigido: pass

## Operational Readiness Criteria
1. Runbook de deploy/rollback/incidente aprovado (M3P-002).
2. Observabilidade mínima (SLI/SLO/alertas) definida por módulo (M3P-003).
3. Plano de segredos/configuração aprovado por ambiente (M3P-004).
4. Responsáveis de plantão definidos para janela de mudança.
5. Janela de rollback documentada com procedimento testável.

## Evidence Package (required for GO)
1. Hashes dos últimos commits em `main`.
2. Resultado dos comandos de gate (timestamp local).
3. Links/paths dos runbooks vigentes.
4. Registro de decisão final em `.specs/project/STATE.md`.

## Decision Rule
- `GO`: todos os gates obrigatórios em `pass` e critérios operacionais aprovados.
- `NO-GO`: qualquer gate crítico falho, evidência incompleta, ou owner não aprovado.
