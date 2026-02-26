# Spec - milestone-4-mod-01-owner-ai-runtime-slice

Status: Implemented
Date: 2026-02-25

## Objective
Evoluir o Module 01 (Owner Concierge) de resposta stub para resposta de IA real em tempo de execucao, mantendo neutralidade do core, suporte a `persona_overrides` por tenant e trilha auditavel contract-first.

## Scope
- Implementar baseline de resposta IA para `POST /v1/owner-concierge/interaction` (operacao `send_message`).
- Definir comportamento por modo de provider para owner runtime:
  - `openai` (estrito, erro explicito se sem chave/erro provider)
  - `local` (fallback deterministico)
  - `off` (sem inferencia externa, resposta institucional minima)
  - `auto` (openai quando disponivel, fallback local).
- Preservar fluxo de orquestracao atual (`owner.command.create` + `module.task.create`) sem quebra.
- Expor metadados de resposta (`provider`, `model`, `latency_ms`, `fallback_reason`) no payload de retorno.

## Out of Scope
- Voice streaming realtime bidirecional.
- Execucao automatica de tools multi-step pela IA dentro deste slice.
- Alteracoes de UX profundas no owner-console alem de exibir payload ja retornado.

## Acceptance Criteria
- `send_message` retorna `assistant_output` gerado por provider real/fallback conforme modo configurado.
- `persona_overrides` continuam propagando sem quebrar contratos existentes.
- Testes cobrem sucesso OpenAI mockado, fallback local e erro em modo estrito.
- Gates verdes:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres`
