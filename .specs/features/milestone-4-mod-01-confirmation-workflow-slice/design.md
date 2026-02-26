# Design - milestone-4-mod-01-confirmation-workflow-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Reusar o planner/policy existente.
- Introduzir persistencia de `task confirmations` no orchestration store (file + postgres).
- Adicionar endpoint `POST /v1/owner-concierge/interaction-confirmations` para decisao humana.

## Data Model (confirmation)
Campos principais:
- `confirmation_id`
- `tenant_id`
- `status` (`pending|approved|rejected`)
- `owner_command_ref` (`command_id`, `correlation_id`, `trace_id`)
- `task_plan_ref` (`target_module`, `task_type`, `priority`, `simulate_failure`, regras)
- `request_snapshot` (request/session/text/attachments/persona_overrides)
- `resolution` (acao, ator, timestamps)

## Runtime Behavior
1. Interaction `send_message` + decision `confirm_required`:
   - persiste `owner.command.create` e `owner.command.created`
   - cria confirmation `pending`
   - emite evento `owner.confirmation.requested`
   - nao cria `module.task.create`
2. Endpoint de confirmacao:
   - `approve`: cria/enfileira task e finaliza confirmation como `approved`
   - `reject`: finaliza confirmation como `rejected`
   - emite eventos de resolucao (`owner.confirmation.approved|rejected`)

## Contract Impact
- `multimodal-api.schema.json`: bloco opcional `response.confirmation`.
- Novo contrato de endpoint: `interaction-confirmation-action.schema.json`.
- `events.schema.json`: novos eventos de confirmacao.

## Validation Plan
1. Testes de integracao para pending/approve/reject e idempotencia de estado.
2. Contract checks com novos schemas.
3. Gate preprod sem smoke postgres.
