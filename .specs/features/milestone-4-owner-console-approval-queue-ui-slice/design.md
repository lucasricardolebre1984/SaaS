# Design - milestone-4-owner-console-approval-queue-ui-slice

Status: Approved
Date: 2026-02-25

## UI Placement
- Painel no proprio `chat-panel` do modulo 01, abaixo das mensagens.
- Componentes:
  - status da fila
  - filtro de status (`pending|approved|rejected|all`)
  - limite local de itens
  - tabela com acoes por linha

## Runtime Wiring
- Load queue:
  - `GET /v1/owner-concierge/interaction-confirmations?tenant_id=<id>&status=<s>&limit=<n>`
- Resolve queue item:
  - `POST /v1/owner-concierge/interaction-confirmations`
  - payload com `decision=approve|reject`

## UX Behavior
- `pending` mostra botoes `Aprovar` e `Rejeitar`.
- Itens resolvidos aparecem somente quando filtro incluir status final.
- Erros de API exibem mensagem operacional em `confirmationsStatus` e no chat.
- Em `confirm_required` retornado no chat, dispara refresh automatico da fila.

## Validation Plan
1. Build owner console.
2. Testes runtime existentes mantidos verdes.
3. Gate preprod sem smoke postgres.
