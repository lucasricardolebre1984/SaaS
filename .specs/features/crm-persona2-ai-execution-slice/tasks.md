# Tasks - crm-persona2-ai-execution-slice

Status: Draft
Date: 2026-03-01

## FOCO
Implementar IA da Persona 2 dentro do CRM inbox/thread sem quebrar operacao manual ja entregue.

## T1) Contratos IA CRM
- Criar schemas:
  - `crm-ai-suggest-reply.schema.json`
  - `crm-ai-qualify.schema.json`
  - `crm-ai-execute.schema.json`
- Integrar em `contract-tests`.
- Aceite:
  - `npx nx run contract-tests:contract-checks` passa.
- Status: pending

## T2) Runtime-config tenant para IA Persona 2
- Estender `GET/POST /v1/owner-concierge/runtime-config` para campos de IA do CRM:
  - `execution.whatsapp_ai_enabled`
  - `execution.whatsapp_ai_mode`
  - `execution.whatsapp_ai_min_confidence`
- Aceite:
  - salvar/carregar no menu 06 por tenant.
- Status: pending

## T3) Service de IA Persona 2 (backend)
- Implementar provider adapter para sugestao de resposta e qualificacao.
- Entrada: context pack da conversa + prompt tenant.
- Saida: `draft_reply`, `suggested_stage`, `confidence`, `reason`.
- Aceite:
  - testes com mock provider cobrindo sucesso/falha.
- Status: pending

## T4) Endpoint `ai/suggest-reply`
- Implementar `POST /v1/crm/conversations/:id/ai/suggest-reply`.
- Aceite:
  - retorna rascunho valido para conversa existente.
- Status: pending

## T5) Endpoint `ai/qualify`
- Implementar `POST /v1/crm/conversations/:id/ai/qualify`.
- Mapear sugestao para trigger de transicao valida.
- Aceite:
  - retorno inclui `suggested_stage`, `confidence`, `required_trigger`.
- Status: pending

## T6) Endpoint `ai/execute`
- Implementar `POST /v1/crm/conversations/:id/ai/execute`.
- Suportar:
  - `send_reply`
  - `update_stage`
- Respeitar mode tenant (`suggest_only` bloqueia execucao).
- Aceite:
  - executa com sucesso em `assist_execute` e bloqueia em `suggest_only`.
- Status: pending

## T7) Auditoria e eventos
- Emitir eventos auditaveis de sugestao/execucao IA.
- Persistir metadados IA no thread quando aplicavel.
- Aceite:
  - trace por `correlation_id` mostra ciclo completo.
- Status: pending

## T8) UI CRM (thread IA)
- Adicionar botoes de IA no thread:
  - `Sugerir Resposta IA`
  - `Qualificar por IA`
  - `Executar IA`
- Mostrar confianca/justificativa.
- Aceite:
  - operador consegue executar ciclo IA sem sair da conversa.
- Status: pending

## T9) Gates e UAT
- Gates:
  - `npx nx run app-platform-api:test`
  - `npx nx run app-crm-console:build`
  - `npx nx run contract-tests:contract-checks`
- UAT dev:
  - inbound real -> suggest -> execute send -> qualify stage.
- Status: pending

## Evidencias obrigatorias
- Logs de gate anexados.
- Print/video curto do fluxo IA no CRM thread.
- Registro em `STATE`, `STATUS-ATUAL`, `worklog.csv`, `costlog.csv`.
