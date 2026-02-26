# Tasks - milestone-4-episode-recall-slice

**Ultima atualizacao:** 2026-02-26

## M4E-001 Episode context no recall

- [x] M4E-001a: No POST /v1/owner-concierge/interaction (send_message), apos retrieved_context, chamar episodeStore.listEpisodes(tenant_id, { session_id, limit: 5 }) e montar string episode_context (turn_count, created_at por episodio).
- [x] M4E-001b: Passar episode_context no payload para generateAssistantOutput (opcional; nao quebrar se store falhar).
- [x] M4E-001c: No owner-response-provider, injetar payload.episode_context em instructions e em system message quando nao vazio.
- [x] M4E-001d: Validar com teste de integracao (opcional) ou smoke manual; atualizar STATE/AGENTS apos Implement.
