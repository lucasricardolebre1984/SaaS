# Tasks - crm-modern-inbox-2026-slice

Status: In progress
Date: 2026-03-01

## FOCO
Este slice cria o **MVP institucional**: inbox + conversas + mensagens + persistência + webhook + envio.
Sem “CRM completo” além do necessário para operar WhatsApp-first no SaaS.

## Tasks

### T1) Contratos (schemas) do módulo 02
- Status: pending
- Criar schemas:
  - `conversation-list.schema.json`
  - `message-list.schema.json`
  - `conversation-send.schema.json`
- Atualizar checklist de integração (STD-005) com itens de persistência e idempotência.
- **Aceite:** `contract-tests:contract-checks` passa e os schemas têm exemplos válidos.

### T2) Data model + migrations (Postgres)
- Status: completed
- Definir SQL baseline para:
  - `crm_conversations`
  - `crm_messages`
  - (opcional) `crm_webhook_dedup`
- **Aceite:** smoke local com Postgres cria tabelas e permite inserir/consultar uma conversa e duas mensagens.
 - Evidencia: `apps/platform-api/src/crm-conversation-store-postgres.mjs` (auto-migrate `crm_conversations` + `crm_messages` com indices e unique de `provider_message_id` por tenant).

### T3) Stores (file + postgres)
- Status: completed
- Implementar stores com mesma interface:
  - `listConversations(tenant_id, cursor, limit)`
  - `listMessages(tenant_id, conversation_id, cursor, limit)`
  - `upsertInboundMessage(...)`
  - `recordOutboundQueued(...)`
  - `updateDeliveryState(...)`
- **Aceite:** testes unitários mínimos cobrindo upsert e paginação.
 - Evidencia:
   - `apps/platform-api/src/crm-conversation-store.mjs`
   - `apps/platform-api/src/crm-conversation-store-file.mjs`
   - `apps/platform-api/src/crm-conversation-store-postgres.mjs`

### T4) Webhook Evolution: persistir e deduplicar
- Status: completed
- Estender `POST /provider/evolution/webhook` para:
  - dedup por `event_id` e/ou `payload.message_id`
  - persistir mensagens inbound e atualizar conversa
  - atualizar delivery/read quando aplicável
- **Aceite:** webhook de teste cria conversa + mensagem e delivery_update atualiza estado.
 - Evidencia:
   - `apps/platform-api/src/app.mjs` (`/provider/evolution/webhook` persiste inbound em conversation store; atualiza delivery/read/failed por `message_id`).
   - `apps/platform-api/src/app.test.mjs` (`POST /provider/evolution/webhook maps raw ...`).

### T5) API REST CRM (conversas/mensagens/envio)
- Status: completed
- Implementar endpoints:
  - `GET /v1/crm/conversations`
  - `GET /v1/crm/conversations/:id/messages`
  - `POST /v1/crm/conversations/:id/send`
- **Aceite:** chamadas retornam JSON validado por schema; envio cria outbound `queued`.
 - Evidencia:
   - `GET /v1/crm/conversations`
   - `GET /v1/crm/conversations/:id/messages`
   - `POST /v1/crm/conversations/:id/send`
   - `POST /v1/crm/conversations/:id/read`
   - teste: `CRM conversation endpoints open thread and send outbound message`.

### T6) UI CRM: inbox + thread
- Status: completed (MVP)
- Implementar:
  - Lista de conversas (inbox)
  - Thread com histórico e composer
  - “Criar/Vincular lead” quando conversa não tiver lead
- **Aceite:** ao receber webhook, conversa aparece; thread abre; envio dispara outbound e aparece no histórico.
 - Evidencia:
   - `apps/crm-console/src/index.html`
   - `apps/crm-console/src/app.js`
   - `apps/crm-console/src/styles.css`
   - recursos: inbox lateral, thread, envio, abrir chat pela tabela de leads, botao `Qualificar` e update de stage.

### T7) Integração Evolution dev (AWS)
- Status: pending
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
