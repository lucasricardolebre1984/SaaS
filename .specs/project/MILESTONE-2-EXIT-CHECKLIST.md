# Milestone 2 Exit Checklist

Date: 2026-02-25  
Status: Completed

## Scope
Milestone 2 - Shared SaaS Template

## Exit Criteria (ROADMAP)
- [x] New SaaS skeleton created in less than 1 day
- [x] Shared modules reused with minimal overrides

## Operational/Governance Checklist
1. [x] UI shell concluído com dois layouts (`fabio2`, `studio`) para owner/crm console.
2. [x] Personalização de tema/paleta por tenant ativa no owner console.
3. [x] Gerador de starter SaaS publicado:
   - `npm run generate:saas-starter`
4. [x] Módulo `06 Configuracoes` funcional com:
   - senha admin
   - OpenAI defaults
   - integrações por módulo
   - métricas locais de custo
   - prompts Persona 1/2
5. [x] Contratos atualizados para `persona_overrides` opcional:
   - `libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json`
   - `libs/core/orchestration-contracts/schemas/commands.schema.json`
6. [x] Runtime valida e propaga persona overrides sem quebrar modo neutro:
   - `apps/platform-api/src/app.mjs`
   - `apps/platform-api/src/schemas.mjs`
7. [x] Gates técnicos verdes:
   - `npx nx run app-platform-api:test`
   - `npx nx run contract-tests:contract-checks`
   - `npx nx run app-owner-console:build`
8. [x] Smoke Postgres verde (stack isolada):
   - `npm run smoke:postgres`
   - compose project `fabio-postgres-smoke`
   - host port `55432` (sem conflito com `fabio2`)
9. [x] Manual operacional do template publicado:
   - `docs/SAAS-STANDARD-MANUAL.md`
10. [x] Governança atualizada:
    - `.specs/project/STATE.md`
    - `.specs/project/worklog.csv`
    - `.specs/project/costlog.csv`

## Evidence Snapshot
- Commit template/persona checkpoint:
  - `5b2b7ce` (`feat(m2): owner settings persona prompts and contract propagation`)
- Commit validação operacional:
  - `0d72fb6` (`chore(governance): log postgres smoke validation and isolation evidence`)

## Go/No-Go Decision
`GO` for Milestone 3 planning (production readiness), mantendo política de não deploy até checklist de pré-produção.
