# Spec - crm-modern-inbox-2026-slice

Status: Approved
Date: 2026-03-01

## Objective
Evoluir o **módulo 02 (CRM WhatsApp)** de “lista de leads” para um **CRM moderno 2026** com:
- **Inbox unificado** (conversas por contato/lead, com última mensagem e não lidas)
- **Thread de conversa** (histórico completo, envio de mensagens, estados de entrega)
- **Captura automática de lead** a partir de mensagens inbound (configurável por tenant)
- **IA orquestradora com trilha auditável** (o que a IA fez no CRM e por quê)

Tudo mantendo:
- Nx monorepo e padrão SaaS Standard v1 (módulos 01..06)
- contract-first (schemas + validação)
- multi-tenant (`tenant_id`)
- rastreabilidade e eventos auditáveis

## Context (fonte de verdade)
- `AGENTS.md` (workflow gate; anti-pollution)
- `.specs/project/CONTEXT.md` (dual-concierge, funil CRM)
- `libs/mod-02-whatsapp-crm/*` (contratos e integração Evolution STD-005)

## Problem Statement (estado atual)
1. O endpoint `POST /provider/evolution/webhook` estava sem persistência de conversas/mensagens para operação de inbox.
2. O `app-crm-console` estava em modo **shell**: KPIs + listagem/criação de leads, sem abertura de thread.

Resultado: mensagens do WhatsApp **não aparecem no SaaS** e o CRM fica “cego” para a operação real.

## Scope
### In-scope (MVP deste slice)
- Persistência de **conversas** e **mensagens** (inbound/outbound) no backend (Postgres e/ou file, alinhado ao toggle existente).
- Extensão do webhook Evolution para:
  - persistir mensagens inbound,
  - atualizar estado de entrega (delivery/read),
  - (opcional) criar/vincular lead por regra.
- Novos endpoints contract-first:
  - `GET /v1/crm/conversations?tenant_id=...`
  - `GET /v1/crm/conversations/:id/messages?tenant_id=...`
  - `POST /v1/crm/conversations/:id/send?tenant_id=...`
- UI CRM:
  - lista de conversas (inbox),
  - tela de thread com histórico e composer de envio,
  - vínculo conversa ↔ lead ↔ cliente (quando existir).
- Auditoria mínima: registrar “quem/qual ação” em eventos (correlation/trace).

### Out of scope (neste slice)
- “CRM completo” (pipeline de deals avançado, forecasting, playbooks completos, permissões RBAC finas, SLA, etc.) — ficará para slices seguintes.
- Migração direta de UI/arquitetura do `fabio2` (legado é referência de comportamento apenas).

## Non-functional Requirements
- **Auditabilidade**: toda criação/alteração relevante deve gerar evento rastreável (tenant_id, correlation_id, trace_id).
- **Idempotência**: webhook deve deduplicar por `event_id`/`message_id` (janela configurável).
- **Privacidade**: mascarar PII em logs; armazenar `raw` com cuidado (ou pointer/hash).
- **Performance**: paginação de mensagens; índices por tenant + conversation_id + occurred_at.

## Acceptance Criteria
- Enviando uma mensagem do WhatsApp para a instância conectada:
  - o webhook é recebido e persistido;
  - a conversa aparece no inbox do CRM do tenant correto;
  - ao abrir a conversa, o thread mostra a mensagem inbound.
- Enviando mensagem pelo CRM:
  - registra outbound no histórico (com estado `queued/sent/...`);
  - atualiza delivery/read quando webhook chegar.
- Se a regra “criar lead no primeiro inbound” estiver habilitada:
  - lead é criado e vinculado à conversa, com estágio inicial consistente com o funil padrão.

## 2026 References (fontes)
- WhatsApp no CRM supera e-mail em engajamento e conversão (2026): `https://www.inogic.com/blog/2026/02/whatsapp-messaging-in-crm-why-it-outperforms-email-in-2026/`
- Transparência/auditoria de ações de IA no CRM (audit cards) (Jan/2026): `https://profound.ly/media/profoundly-hubspot-updates/january-27-2026-hubspot-updates-customer-agent-message-insights?hs_amp=true`
- Guia 2026 de “unified inbox” e threads de conversa (2026): `https://useconverge.app/learn/unified-inbox-guide`

## Benchmark visual (solicitacao do owner)
- Referencia de UX de CRM no nivel Monday board informado pelo owner.
- Observacao: board Monday e privado; validacao externa retornou apenas landing/login (`monday.com: Where Teams Get Work Done`), sem acesso ao board interno sem sessao autenticada.

