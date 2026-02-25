# Design - milestone-4-mod-01-confirmation-queue-safeguards-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Reusar store de confirmations existente (file + postgres).
- Adicionar operacoes de leitura/contagem por tenant.
- Aplicar safeguards no runtime antes de criar novos pendentes e no endpoint de resolucao.

## Safeguards
- `max_pending_per_tenant`:
  - configuravel por runtime/env
  - bloqueia criacao de novo pending quando limite for atingido
- `confirmation_ttl_seconds`:
  - verificacao no endpoint de acao (`approve|reject`)
  - se expirado, confirmation e fechada como `rejected` por expiracao

## API Additions
- `GET /v1/owner-concierge/interaction-confirmations`
  - query: `tenant_id` (obrigatorio), `status` (opcional), `limit` (opcional)

## Contracts
- Novo schema de resposta de listagem de confirmations.
- Sem quebra no schema existente de action.

## Validation Plan
1. Testes de limite por tenant.
2. Testes de expiracao TTL com bloqueio de enfileiramento.
3. Testes do endpoint de listagem com filtro de status.
