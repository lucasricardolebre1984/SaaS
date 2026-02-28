# Tasks - crm-modern-inbox-2026-slice

Status: Draft
Date: 2026-02-28

## FOCO
Este slice cria o **MVP institucional**: inbox + conversas + mensagens + persistência + webhook + envio.
Sem “CRM completo” além do necessário para operar WhatsApp-first no SaaS.

## Tasks

### T1) Contratos (schemas) do módulo 02
- Criar schemas:
  - `conversation-list.schema.json`
  - `message-list.schema.json`
  - `conversation-send.schema.json`
- Atualizar checklist de integração (STD-005) com itens de persistência e idempotência.
- **Aceite:** `contract-tests:contract-checks` passa e os schemas têm exemplos válidos.

### T2) Data model + migrations (Postgres)
- Definir SQL baseline para:
  - `crm_conversations`
  - `crm_messages`
  - (opcional) `crm_webhook_dedup`
- **Aceite:** smoke local com Postgres cria tabelas e permite inserir/consultar uma conversa e duas mensagens.

### T3) Stores (file + postgres)
- Implementar stores com mesma interface:
  - `listConversations(tenant_id, cursor, limit)`
  - `listMessages(tenant_id, conversation_id, cursor, limit)`
  - `upsertInboundMessage(...)`
  - `recordOutboundQueued(...)`
  - `updateDeliveryState(...)`
- **Aceite:** testes unitários mínimos cobrindo upsert e paginação.

### T4) Webhook Evolution: persistir e deduplicar
- Estender `POST /provider/evolution/webhook` para:
  - dedup por `event_id` e/ou `payload.message_id`
  - persistir mensagens inbound e atualizar conversa
  - atualizar delivery/read quando aplicável
- **Aceite:** webhook de teste cria conversa + mensagem e delivery_update atualiza estado.

### T5) API REST CRM (conversas/mensagens/envio)
- Implementar endpoints:
  - `GET /v1/crm/conversations`
  - `GET /v1/crm/conversations/:id/messages`
  - `POST /v1/crm/conversations/:id/send`
- **Aceite:** chamadas retornam JSON validado por schema; envio cria outbound `queued`.

### T6) UI CRM: inbox + thread
- Implementar:
  - Lista de conversas (inbox)
  - Thread com histórico e composer
  - “Criar/Vincular lead” quando conversa não tiver lead
- **Aceite:** ao receber webhook, conversa aparece; thread abre; envio dispara outbound e aparece no histórico.

### T7) Integração Evolution dev (AWS)
- Configurar Evolution para apontar webhook para o SaaS:
  - URL: `https://dev.automaniaai.com.br/api/provider/evolution/webhook`
  - eventos mínimos: inbound + delivery + read
- **Aceite:** mensagem enviada do WhatsApp chega e aparece no inbox do SaaS.

## Evidências (obrigatório)
- Logs de gate:
  - `npm run preprod:validate`
  - `npm run smoke:postgres` (quando aplicável)
- Prova de operação:
  - print do inbox com conversa e thread com pelo menos 1 inbound + 1 outbound.
