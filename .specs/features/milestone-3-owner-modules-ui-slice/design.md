# Design - milestone-3-owner-modules-ui-slice

Status: Approved
Date: 2026-02-25

## UI Strategy
- Criar `moduleWorkspace` dedicado com tres views internas:
  - `moduleClientesView`
  - `moduleAgendaView`
  - `moduleBillingView`
- Alternar views conforme `state.activeModuleId`.

## Data Access Strategy
- Reusar fetch nativo com helper comum para request/response.
- Montar payloads conforme contratos ja publicados em `libs/mod-03`, `libs/mod-04`, `libs/mod-05`.
- Converter `datetime-local` para ISO 8601 no client.

## UX/Resilience
- Painel de status por modulo para mensagens de operacao.
- Listagens com refresh manual por modulo.
- Cache leve em memoria para ids recentes (appointments/charges/clientes) para facilitar operacoes encadeadas.

## Validation Plan
1. Build owner console.
2. Gate preprod sem smoke postgres.
3. Teste manual local:
   - criar/listar cliente
   - criar appointment + reminder/list
   - criar charge + payment/list
