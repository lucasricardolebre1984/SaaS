# Spec - milestone-4-mod-01-tool-execution-policy-slice

Status: Draft
Date: 2026-02-25

## Objective
Definir e implementar politica explicita de execucao de tools para o Module 01 (Owner Concierge), reduzindo acoplamento e risco operacional ao despachar tarefas para modulos 02/03/04/05.

## Scope
- Criar policy de decisao para `module.task.create` com regras por `task_type`:
  - allow/deny por modulo alvo
  - prioridade padrao
  - necessidade de confirmacao explicita para acoes sensiveis
- Aplicar validacao dessa policy no fluxo de `POST /v1/owner-concierge/interaction`.
- Retornar no payload de resposta metadados de decisao (`policy_rule_id`, `requires_confirmation`, `execution_decision`).
- Preservar contrato event-driven atual e rastreabilidade por `correlation_id`.

## Out of Scope
- UI de aprovacao humana completa no owner console.
- Execucao multi-step automatica de tools em cadeia.
- Mudancas de dominio nos modulos 02/03/04/05.

## Acceptance Criteria
- Dispatch de tasks do Module 01 passa por policy deterministica e auditavel.
- Tarefas sensiveis sao bloqueadas ou marcadas com `requires_confirmation` conforme policy.
- Testes cobrem allow, deny e confirm-required.
- Gates verdes:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres`
