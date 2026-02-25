# Design - milestone-4-mod-01-tool-execution-policy-slice

Status: Draft
Date: 2026-02-25

## Architecture
- Reusar planner atual de task routing do Module 01.
- Introduzir camada de policy enforcement antes de persistir/enfileirar `module.task.create`.
- Manter `owner.command.create` sempre auditado, mesmo quando task for negada por policy.

## Policy Model
- Arquivo de policy versionado no repo (exemplo):
  - `apps/platform-api/config/owner-tool-execution-policy.json`
- Campos previstos por regra:
  - `rule_id`
  - `task_type`
  - `target_module`
  - `decision` (`allow|deny|confirm_required`)
  - `priority_override` (opcional)
  - `reason_code`

## Runtime Behavior
- `allow`: cria/enfileira `module.task.create` normalmente.
- `deny`: nao cria task; retorna resposta com motivo de bloqueio.
- `confirm_required`: nao enfileira automaticamente; retorna estado aguardando confirmacao.

## Contract Impact
- Incremento em `downstream_tasks` ou novo bloco `policy_decision` na resposta de interaction.
- Sem quebra de compatibilidade para consumidores existentes.

## Validation Plan
1. Testes unitarios/integracao para allow/deny/confirm_required.
2. Contract checks com schema atualizado.
3. Gate preprod sem smoke postgres.
