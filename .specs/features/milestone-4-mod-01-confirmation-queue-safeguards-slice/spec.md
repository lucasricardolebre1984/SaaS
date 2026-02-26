# Spec - milestone-4-mod-01-confirmation-queue-safeguards-slice

Status: Implemented
Date: 2026-02-25

## Objective
Endurecer o workflow de confirmacao do Module 01 com safeguards multi-tenant e base para fila operacional de aprovacoes.

## Scope
- Aplicar limite de confirmacoes pendentes por tenant.
- Aplicar TTL para confirmacoes pendentes no momento da resolucao.
- Expor endpoint de listagem para fila de confirmacoes por tenant.
- Preservar rastreabilidade e contratos event-driven.

## Out of Scope
- UI completa de fila no owner console.
- Escalonamento por perfil de aprovador.
- Politica dinamica por tenant via painel.

## Acceptance Criteria
- Tenant nao excede `max_pending` configurado.
- Confirmacao expirada por TTL nao enfileira task.
- Endpoint de listagem retorna fila filtravel por status.
- Gates verdes:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres`
