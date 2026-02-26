# Tasks - milestone-4-dual-concierge-memory-orchestrator-slice

**Ultima atualizacao:** 2026-02-26

## M4D-008 Short memory store e recall

- [x] M4D-008a: Criar owner-short-memory-store (appendTurn, getLastTurns) com backend file (path por tenant/session ou arquivo unico indexado).
- [x] M4D-008b: No POST /v1/owner-concierge/interaction (send_message), antes de generateAssistantOutput, obter short_memory e passar no payload.
- [x] M4D-008c: Apos gerar resposta, persistir turno user e turno assistant no short memory.

## M4D-009 Promocao short->medium (episodio)

- [x] M4D-009a: Definir criterio (ex.: 10 turnos ou sessao inativa 5 min). Criterio: a cada N turnos (ownerEpisodeThreshold, default 10), ao atingir multiplo de N.
- [x] M4D-009b: Emitir memory.episode.created com payload tenant_id, session_id, turn_count, summary (opcional). Evento no schema; emitido apos append turn quando turn_count % threshold === 0.
- [x] M4D-009c: Persistir episodio em medium store (owner-episode-store: appendEpisode ao emitir memory.episode.created; listEpisodes por tenant/session).

## M4D-010 Recall unificado

- [x] M4D-010a: Combinar short_memory + operational_context no payload do provider (ja feito em 008b).
- [x] M4D-010b: Incluir resultado de retrieval (owner memory medium/long) no payload; provider injeta em system/instructions como retrieved_context (top_k 5, query_text = userText).

## M4D-011/012 Worker delegacao CRM

- [x] M4D-011: Adicionar eventos crm.delegation.sent e crm.delegation.failed em events.schema.json com payload (task_id, correlation_id, tenant_id, result_summary/error_code).
- [x] M4D-012a: No drain (POST /internal/worker/module-tasks/drain), apos persistir module.task.completed/failed, se target_module === mod-02-whatsapp-crm, criar e persistir crm.delegation.sent ou crm.delegation.failed.
- [x] M4D-012b: Schema e drain ja cobertos; contract-tests validam schema (eventos no enum).
