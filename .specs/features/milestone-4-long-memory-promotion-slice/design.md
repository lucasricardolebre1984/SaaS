# Design - milestone-4-long-memory-promotion-slice

**Ultima atualizacao:** 2026-02-26

## Fluxo

1. No fluxo de send_message (POST /v1/owner-concierge/interaction), apos `episodeStore.appendEpisode` quando um episodio e criado (turnCount % episodeThreshold === 0):
2. Montar conteudo para memoria longa: texto descritivo do marco (ex. "Session milestone at turn N (session S).").
3. Obter embedding via `ownerEmbeddingProvider.resolveMemoryEmbedding` (tenant_id, session_id, content). Se falhar (ex.: sem chave OpenAI), ignorar e nao propagar erro.
4. Chamar `ownerMemoryStore.createEntry` com: source `episode_promotion`, external_key `episode_{tenant_id}_{session_id}_{turnCount}`, content, tags opcionais (ex. `["episode", "milestone"]`), embedding_ref/embedding_vector do passo 3.
5. Se createEntry retornar (created ou idempotent), emitir evento `memory.promoted.from_episode` com payload (tenant_id, session_id, turn_count, memory_id, event_id do episodio).

## Contrato

- Novo evento: `memory.promoted.from_episode` em events.schema.json.
- Payload minimo: tenant_id, session_id, turn_count, memory_id (uuid da entrada criada), episode_event_id (opcional).

## Idempotencia

- external_key garante que o mesmo episodio nao gera duplicata na memoria longa (createEntry ja trata por external_key e memory_id).

## Riscos

- Embedding provider indisponivel ou sem chave: promocao nao ocorre; fluxo da interacao segue normal.
