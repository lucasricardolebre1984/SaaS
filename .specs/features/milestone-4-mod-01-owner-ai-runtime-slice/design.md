# Design - milestone-4-mod-01-owner-ai-runtime-slice

Status: Draft
Date: 2026-02-25

## Architecture
- Reusar endpoint atual `POST /v1/owner-concierge/interaction`.
- Introduzir servico dedicado `owner-response-provider` para separar inferencia de IA da camada HTTP/orquestracao.
- Preservar modelo event-driven atual:
  - command `owner.command.create`
  - optional command `module.task.create`
  - eventos correspondentes.

## Provider Strategy
- Novo runtime mode para resposta de owner (independente do embedding mode, mas com naming alinhado):
  - `OWNER_RESPONSE_MODE=auto|openai|local|off`
- Configuracoes:
  - `OPENAI_API_KEY`
  - `OWNER_RESPONSE_MODEL` (default `gpt-5.1-mini`)
  - `OPENAI_BASE_URL` (suporte mock/local provider).

## Response Contract (incremental)
- `assistant_output` passa a incluir:
  - `text`
  - `provider`
  - `model`
  - `latency_ms`
  - `fallback_reason` (quando houver)

## Reliability/Observability
- Registrar erro de provider sem perder resposta HTTP estruturada.
- Em modo estrito `openai`, falha de provider deve retornar erro deterministico (`owner_response_provider_error`).
- Em `auto`, fallback local deve preencher `fallback_reason`.

## Validation Plan
1. Testes unitarios/integracao do app API cobrindo modos `openai/local/auto/off`.
2. Contract checks verdes.
3. Preprod gate sem smoke postgres.
