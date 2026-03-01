# Spec - crm-persona2-ai-execution-slice

Status: Draft
Date: 2026-03-01

## Objective
Adicionar IA operacional no modulo 02 para a **Persona 2 (WhatsApp CRM)** com foco em:
- sugerir resposta por thread;
- sugerir qualificacao e proximo stage do lead;
- executar resposta/qualificacao com trilha auditavel e controle por tenant.

## Context
- `.specs/project/CONTEXT.md` (modelo dual-concierge canonico).
- `.specs/project/BASELINE-PERSONAS-RUNTIME-CONFIG.md` (prompts Persona 1/2 no menu 06).
- `.specs/features/crm-modern-inbox-2026-slice/*` (inbox/thread MVP ja entregue).

## Problem Statement
O CRM ja possui inbox e thread, mas ainda opera quase 100% manual:
1. nao existe sugeridor de resposta da Persona 2 por conversa;
2. nao existe qualificacao assistida por IA com justificativa;
3. nao existe fluxo padrao de execucao segura (sugere -> confirma -> executa) com auditoria completa.

## Scope
### In-scope (MVP IA Persona 2)
- Endpoints de IA no CRM:
  - `POST /v1/crm/conversations/:id/ai/suggest-reply`
  - `POST /v1/crm/conversations/:id/ai/qualify`
  - `POST /v1/crm/conversations/:id/ai/execute`
- Context pack da thread para IA:
  - ultimas mensagens inbound/outbound;
  - lead atual (stage, metadata);
  - dados operacionais minimos do tenant.
- Runtime-config por tenant (menu 06) para modulo 02:
  - habilitar IA Persona 2;
  - modo de execucao (`suggest_only`, `assist_execute`);
  - limiar de confianca para sugestao de stage.
- Auditoria:
  - registrar prompt policy aplicada, sugestao, acao executada, correlation_id/trace_id.

### Out of scope (neste slice)
- Autopilot total sem aprovacao humana.
- Campanhas inteligentes completas (multistep) com aprendizado autonomo.
- Refatoracao de todos os modulos 03/04/05 para agente autonomo.

## Functional Requirements
1. IA de resposta deve gerar texto curto, objetivo e alinhado ao prompt da Persona 2 do tenant.
2. IA de qualificacao deve sugerir `next_stage` + `reason` + `confidence` (0..1).
3. Execucao de acao deve exigir tenant_id e conversation_id validos.
4. `ai/execute` deve suportar pelo menos:
   - `send_reply`
   - `update_stage`
5. Toda acao de IA deve ser tenant-scoped e auditable.
6. Falha do provider nao pode quebrar a thread; deve retornar erro estruturado.
7. Prompt do menu 06 deve influenciar a IA da Persona 2 em runtime.
8. Mudanca de stage por IA deve respeitar `lead-funnel.transitions.json`.

## Non-Functional Requirements
- Latencia alvo (p95): <= 4s para sugestao textual.
- Zero vazamento cross-tenant.
- Logs com PII minimizada.
- Idempotencia para execucao (chave por `conversation_id + action + client_request_id`).

## Acceptance Criteria
1. Com conversa aberta no CRM, ao pedir sugestao de resposta:
   - backend retorna `draft_reply` com status `ok`;
   - UI preenche composer com rascunho.
2. Ao pedir qualificacao por IA:
   - backend retorna `current_stage`, `suggested_stage`, `confidence`, `reason`.
3. Ao executar resposta IA:
   - mensagem e enviada ao WhatsApp provider;
   - mensagem outbound aparece no thread;
   - evento de auditoria e persistido.
4. Ao executar update de stage IA:
   - transition valida e aplicada no lead;
   - KPI/stage na UI atualiza.
5. Prompt da Persona 2 alterado no menu 06 muda claramente o estilo da resposta sugerida.

## Risks
- Drift de prompt levando a respostas longas/imprecisas.
- Alucinacao em qualificacao sem evidencia suficiente.
- Custos de IA por volume de threads.

## Mitigations
- Template de resposta com limite de tamanho.
- Confidence threshold + fallback para `suggest_only`.
- Medicao de custo/uso por tenant no worklog/costlog e metricas operacionais.
