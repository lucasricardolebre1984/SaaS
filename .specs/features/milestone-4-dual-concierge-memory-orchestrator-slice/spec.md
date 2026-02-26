# Spec - milestone-4-dual-concierge-memory-orchestrator-slice

**Ultima atualizacao:** 2026-02-26

## Objetivo

Implementar o orquestrador de memoria dual-concierge: Persona 1 (owner) com recall completo (short + medium/long) e controle de sessao; Persona 2 (WhatsApp CRM) com eventos de delegacao auditaveis; ciclo P1->P2->P1 fechado com worker que emite eventos.

## Escopo

- Short memory: persistir turno por (tenant_id, session_id); recall antes de gerar resposta.
- Promocao short->medium: episodios e evento auditavel (M4D-009).
- Recall unificado: short + retrieval (medium/long) + operational_context antes de gerar (M4D-010).
- Worker delegacao: ao processar tarefa mod-02, emitir crm.delegation.sent ou crm.delegation.failed (M4D-011/012).

## Premissas

- CONTEXT.md: no-context-loss, aprendizado continuo, tenant/session/channel.
- Contratos: commands.schema (crm.whatsapp.send), events.schema (adicionar crm.delegation.sent/failed).
- Memoria longa e retrieval ja existem; integrar no recall.

## Exit criteria Specify

- [x] spec.md aprovado
- [x] design.md aprovado
- [x] tasks.md aprovado

## Exit criteria Implement (closed 2026-02-26)

- [x] M4D-008 short memory store e recall
- [x] M4D-009a/b episodio (memory.episode.created)
- [x] M4D-010 recall unificado (short + operational_context + retrieved_context)
- [x] M4D-011/012 eventos crm.delegation e worker drain
- [x] M4D-009c persistir episodio em medium store (owner-episode-store)
