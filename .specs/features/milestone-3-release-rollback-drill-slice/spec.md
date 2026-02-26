# Spec - milestone-3-release-rollback-drill-slice

Status: Approved
Date: 2026-02-25

## Objective
Executar um slice operacional de dry-run de release e drill de rollback para validar prontidao real de producao com evidencia auditavel.

## Scope
- Publicar script de dry-run de release com checklist tecnico e baseline de protecao de branch.
- Publicar script de rollback drill com validacao de fallback operacional.
- Integrar os novos comandos no gate institucional preprod.
- Atualizar runbook e checklist com o fluxo executavel.

## Functional Requirements
1. Disponibilizar comando `npm run release:dry-run`.
2. Disponibilizar comando `npm run rollback:drill`.
3. Cada comando deve gerar relatorio com timestamp em `tools/reports/`.
4. `preprod:validate` deve executar os checks operacionais sem recursao.

## Non-Functional Requirements
- Scripts em PowerShell (`pwsh`) com falha deterministica em erro.
- Saida simples para leitura por operador.
- Nenhuma mudanca em contratos de dominio dos modulos 01..05.

## Acceptance Criteria
- Scripts versionados e executaveis via `package.json`.
- Evidencia de execucao local registrada em `tools/reports/`.
- Governanca atualizada (`STATE`, `worklog`, `costlog`, runbook, checklist).
