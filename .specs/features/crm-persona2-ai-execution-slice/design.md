# Design - crm-persona2-ai-execution-slice

Status: Draft
Date: 2026-03-01

## 1) Architectural Fit (Dual-Concierge)
- **Persona 1 (mod-01)**: continua orquestradora global do SaaS.
- **Persona 2 (mod-02)**: passa a ter runtime de IA dedicado ao contexto de conversa WhatsApp.
- **Modulo 06**: segue como ponto unico de configuracao por tenant (prompts/politicas IA).

## 2) Execution Model
- `suggest_only`:
  - IA sugere resposta/qualificacao.
  - humano decide executar.
- `assist_execute`:
  - IA sugere e pode executar via endpoint unico (`ai/execute`) com controles de policy.

## 3) Prompt Stack
1. System base institucional (papel Persona 2, tom comercial, objetividade).
2. Prompt tenant do menu 06: `personas.whatsapp_agent_prompt`.
3. Guardrails de seguranca:
   - sem promessas juridicas/financeiras nao autorizadas;
   - sem inventar preco/prazo sem dado de contexto.
4. Context pack da conversa (ultimas mensagens + stage + metadados relevantes).

## 4) API Contracts (proposta)
### 4.1 Suggest Reply
- `POST /v1/crm/conversations/:id/ai/suggest-reply`
- input:
  - `tenant_id`
  - `tone` opcional (`consultivo`, `direto`, `followup`)
- output:
  - `draft_reply`
  - `confidence`
  - `reasoning_summary` (curto, auditavel)

### 4.2 Qualify
- `POST /v1/crm/conversations/:id/ai/qualify`
- output:
  - `current_stage`
  - `suggested_stage`
  - `confidence`
  - `reason`
  - `required_trigger`

### 4.3 Execute
- `POST /v1/crm/conversations/:id/ai/execute`
- actions:
  - `send_reply`
  - `update_stage`
- output:
  - `status`
  - `executed_action`
  - `provider_result` (quando envio)
  - `lead_result` (quando stage)

## 5) Runtime Config Extension (tenant)
- Reuso de `runtime-config` no menu 06:
  - `execution.whatsapp_ai_mode`: `suggest_only|assist_execute`
  - `execution.whatsapp_ai_min_confidence`: number (default 0.7)
  - `execution.whatsapp_ai_enabled`: boolean

## 6) Data + Audit
- Persistir insights IA no `metadata` de mensagem/conversa quando aplicavel:
  - `ai_source`, `ai_confidence`, `ai_action`.
- Registrar evento auditavel por acao:
  - `crm.ai.reply.suggested`
  - `crm.ai.reply.executed`
  - `crm.ai.stage.suggested`
  - `crm.ai.stage.executed`

## 7) UI Design (mod-02 CRM)
- Thread ganha bloco IA:
  - botao `Sugerir Resposta IA`;
  - botao `Qualificar por IA`;
  - botao `Executar IA`.
- Mostrar badge de confianca e justificativa curta.
- Mostrar estado de policy (`suggest_only` vs `assist_execute`) visivel.

## 8) Validation Strategy
- Unit + integration:
  - sugestao de resposta com prompt tenant;
  - qualificacao com trigger valido;
  - execute stage respeitando transicoes.
- End-to-end dev:
  - inbound real -> sugestao IA -> envio -> thread atualizado -> stage atualizado.

## 9) Rollout
- Flag por tenant (`whatsapp_ai_enabled`).
- Primeiro habilitar para `tenant_automania`.
- Se regressao, fallback imediato para operacao manual (inbox/thread sem IA).
