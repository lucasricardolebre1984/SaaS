# Design - milestone-4-dual-concierge-memory-orchestrator-slice

**Ultima atualizacao:** 2026-02-26

## 1. Short memory

- Store por (tenant_id, session_id): buffer de turnos (user text, assistant text, timestamp).
- Limite por sessao: N turnos (ex.: 20) ou tamanho max; FIFO.
- API: appendTurn(tenant_id, session_id, { role, content }); getLastTurns(tenant_id, session_id, limit).
- Persistencia: mesmo backend da orquestracao (file ou postgres); tabela/arquivo owner_short_memory.

## 2. Recall antes de gerar (Persona 1)

- Antes de generateAssistantOutput: getShortMemory(tenant_id, session_id, limit); ownerMemoryStore.retrieveContext(tenant_id, { text: userText, top_k: 5 }).
- Payload para provider: operational_context + short_memory + retrieved_context (medium/long memory, texto formatado dos itens).
- Provider injeta retrieved_context em system/instructions (Responses API e Chat Completions).
- Apos resposta: appendTurn(user), appendTurn(assistant).

## 3. Eventos crm.delegation

- events.schema.json: adicionar "crm.delegation.sent", "crm.delegation.failed".
- Payload: task_id, correlation_id, tenant_id, result_summary (sent) ou error_code (failed).
- Worker drain: apos persistir module.task.completed/failed para target_module mod-02-whatsapp-crm, emitir evento crm.delegation.sent ou crm.delegation.failed com mesmo correlation_id.

## 4. Promocao short->medium (M4D-009)

- Evento memory.episode.created no schema (tenant_id, session_id, turn_count, summary opcional).
- Criterio: a cada ownerEpisodeThreshold turnos (default 10), ao atingir multiplo (10, 20, 30...), apos persistir turnos user+assistant, emitir evento e persistir no orchestration store.
- Config: options.ownerEpisodeThreshold ou env OWNER_EPISODE_THRESHOLD (default 10).
- M4D-009c: owner-episode-store (file) persiste episodio ao emitir memory.episode.created; appendEpisode(tenant_id, session_id, { turn_count, summary, event_id, created_at }); listEpisodes(tenantId, { sessionId?, limit }) para uso futuro.

## 5. Canal e session_id

- request.session_id e request.tenant_id ja existem no interaction; usar como chave do short memory.
