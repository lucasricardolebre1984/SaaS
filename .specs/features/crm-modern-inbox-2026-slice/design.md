# Design - crm-modern-inbox-2026-slice

Status: Draft
Date: 2026-02-28

## 1) Architectural fit (SaaS Standard v1)
- **Módulo 01** (Owner Concierge): orquestra e consulta contexto do CRM via contratos (não “vira” o CRM).
- **Módulo 02** (WhatsApp CRM): **dono** de conversas, mensagens, leads CRM e automações de follow-up/campanhas.
- **Módulo 03/04/05**: clientes/agenda/cobrança continuam donos de seus registros; módulo 02 só referencia e aciona via eventos/contratos.
- **Módulo 06**: configurações por tenant (incluindo regra “criar lead no primeiro inbound”, thresholds, templates, etc.).

## 2) Data model (proposta)

### 2.1 Tabelas (Postgres)
**A) `crm_conversations`**
- `conversation_id` (uuid, pk)
- `tenant_id` (text, index)
- `contact_e164` (text, index) — chave de roteamento principal do inbox
- `lead_id` (uuid, nullable, index)
- `customer_id` (uuid, nullable, index)
- `last_message_at` (timestamptz, index)
- `unread_count` (int, default 0)
- `metadata` (jsonb)

**B) `crm_messages`**
- `message_row_id` (uuid, pk)
- `tenant_id` (text, index)
- `conversation_id` (uuid, index)
- `provider` (text) — `evolution-api`
- `provider_message_id` (text, index) — `payload.message_id`
- `direction` (text) — `inbound|outbound`
- `message_type` (text) — `text|audio|image|file`
- `text` (text, nullable)
- `media_url` (text, nullable)
- `delivery_state` (text) — `queued|sent|delivered|read|failed|unknown`
- `occurred_at` (timestamptz, index)
- `raw` (jsonb, nullable) — opcional (ou pointer/hash)

**C) `crm_webhook_dedup`** (opcional)
- `tenant_id`, `event_id`/`provider_message_id`, `received_at`
- objetivo: idempotência e replay protection.

### 2.2 Índices mínimos
- `crm_conversations(tenant_id, last_message_at desc)`
- `crm_conversations(tenant_id, contact_e164)`
- `crm_messages(tenant_id, conversation_id, occurred_at desc)`
- `crm_messages(tenant_id, provider_message_id)`

## 3) Webhook flow (Evolution → SaaS)

### 3.1 Entrada
- Evolução do handler `POST /provider/evolution/webhook`:
  - validar contrato (`evolution-webhook.schema.json`)
  - deduplicar (por `event_id` e/ou `payload.message_id`)
  - normalizar `tenant_id`, `instance_id`, `event_type`, `payload.*`
  - persistir em `crm_messages` e upsert em `crm_conversations`
  - (opcional) criar lead se não existir e a regra estiver habilitada
  - emitir evento(s) auditáveis: `crm.message.received`, `crm.lead.created` (quando aplicável)

### 3.2 Regras de criação automática de lead
Regra por tenant (módulo 06):
- `crm.auto_create_lead_on_first_inbound = true|false`
- `crm.initial_stage = new|contacted` (default: `new`)
- `crm.lead_dedupe_window_days` (default: 30) — evita recriar lead para o mesmo número

### 3.3 Atualizações de estado de entrega
Para `message.delivery_update` / `message.read_update`:
- localizar `crm_messages` por `provider_message_id`
- atualizar `delivery_state`
- atualizar métricas (sucesso/falha) e rastreio

## 4) API contracts (proposta)

### 4.1 `GET /v1/crm/conversations?tenant_id=...`
Retorna lista paginada:
- `conversation_id`, `contact_e164`, `lead_id?`, `customer_id?`
- `last_message_preview`, `last_message_at`, `unread_count`
- `lead_stage?` (se vinculado)

### 4.2 `GET /v1/crm/conversations/:id/messages?tenant_id=...&cursor=...`
Retorna histórico paginado:
- mensagens ordenadas por `occurred_at`
- campos mínimos + `delivery_state`

### 4.3 `POST /v1/crm/conversations/:id/send?tenant_id=...`
Corpo:
- `message_type`, `text?`, `media_url?`, `idempotency_key`
Comportamento:
- valida schema outbound
- enfileira no outbound queue do módulo 02
- persiste mensagem outbound com `delivery_state=queued`

## 5) UI (CRM Console)

### 5.1 Inbox
- coluna esquerda com lista de conversas (última mensagem, data/hora, badge não lidas)
- filtro por estágio de lead (quando vinculado)

### 5.2 Thread
- histórico em timeline (inbound/outbound)
- composer com templates e ações rápidas
- ações: “Criar/Vincular lead”, “Converter para cliente” (quando aplicável)

## 6) Observabilidade (mínimo)
- contadores por tenant:
  - inbound recebidos
  - outbound enviados
  - taxa de falha (provider)
- rastreio por `correlation_id` em `/internal/orchestration/trace`

## 7) Segurança/Compliance
- validação de assinatura do webhook (quando disponível)
- mascaramento de PII em logs
- replay protection via dedup store
