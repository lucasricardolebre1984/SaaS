# Design - milestone-4-episode-recall-slice

**Ultima atualizacao:** 2026-02-26

## 1. Fonte de episodios

- episodeStore.listEpisodes(tenantId, { session_id: sessionId, limit: 5 }) — ultimos 5 episodios da sessao (ou do tenant se session_id opcional).
- Ordenacao: listEpisodes ja retorna mais recentes primeiro (reverse).

## 2. Formato para o provider

- episode_context: string com linhas por episodio, ex.:
  "Session milestones (recent):\n- Turn 10 at 2026-02-26T12:00:00Z\n- Turn 20 at 2026-02-26T12:05:00Z"
- Se summary existir no futuro, incluir resumo curto por episodio.

## 3. Integracao no app

- No bloco send_message, apos shortMemory e retrieved_context, chamar listEpisodes(tenant_id, session_id, limit: 5).
- Montar string episode_context e passar no payload para generateAssistantOutput.
- Nao falhar a interaction se episodeStore falhar; usar episode_context vazio.

## 4. Integracao no provider

- owner-response-provider: ler payload.episode_context (string); se nao vazio, adicionar bloco em instructions (Responses API) e em system message (Chat Completions): "Recent session milestones (for context):\n{episode_context}"
