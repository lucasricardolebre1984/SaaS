# Spec - milestone-4-owner-console-approval-queue-ui-slice

Status: Implemented
Date: 2026-02-25

## Objective
Implementar UX operacional no Owner Console para fila de aprovacoes de confirmacoes do modulo 01, permitindo acoes humanas `aprovar/rejeitar` sem sair do chat.

## Scope
- Adicionar painel de fila de aprovacoes no workspace do modulo 01.
- Listar confirmacoes via endpoint `GET /v1/owner-concierge/interaction-confirmations`.
- Executar acoes via endpoint `POST /v1/owner-concierge/interaction-confirmations`.
- Exibir status operacional e feedback no chat.

## Out of Scope
- Regras de permissionamento por perfil.
- Paginacao server-side avancada.
- Notificacoes push em tempo real.

## Acceptance Criteria
- Usuario consegue listar confirmacoes por tenant e filtrar por status.
- Usuario consegue aprovar/rejeitar pendencias diretamente na fila.
- Ao enviar interacao com `confirm_required`, a fila e atualizada no console.
- Build do owner console permanece verde.
