# Spec - milestone-4-mod-01-confirmation-workflow-slice

Status: Implemented
Date: 2026-02-25

## Objective
Implementar workflow explicito de confirmacao para decisoes `confirm_required` no Module 01, com endpoint dedicado para aprovar/rejeitar e despacho controlado de `module.task.create`.

## Scope
- Registrar confirmacoes pendentes quando a policy retornar `confirm_required`.
- Expor endpoint dedicado para decisao humana (`approve`/`reject`).
- Ao aprovar, criar/enfileirar `module.task.create` preservando `correlation_id` original.
- Ao rejeitar, manter trilha auditavel sem enfileirar task.
- Retornar metadados de confirmacao no payload de interaction.

## Out of Scope
- UI completa de fila de aprovacao no console.
- SLA/expiracao automatica por cron.
- Mudancas de dominio nos modulos 02/03/04/05.

## Acceptance Criteria
- `confirm_required` gera registro pendente e resposta com `confirmation_id`.
- Endpoint de confirmacao aprova/rejeita com validacao de estado (`pending` somente).
- Fluxo de aprovacao enfileira task apenas uma vez, com rastreabilidade.
- Fluxo de rejeicao nao enfileira task e retorna estado final auditavel.
- Gates verdes:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres`
