# Tasks - milestone-4-long-memory-promotion-slice

**Ultima atualizacao:** 2026-02-26

## M4L-001 Promocao episodio -> memoria longa

- [x] M4L-001a: Adicionar evento memory.promoted.from_episode em events.schema.json (payload tenant_id, session_id, turn_count, memory_id, episode_event_id).
- [x] M4L-001b: Em app.mjs apos appendEpisode: content + resolveMemoryEmbedding + createEntry (source episode_promotion, external_key); sucesso emite memory.promoted.from_episode; falha nao propaga.
- [x] M4L-001c: Validar testes e contract-checks; atualizar STATE ROADMAP AGENTS PROXIMO-PASSO worklog costlog.
