# Spec - milestone-4-long-memory-promotion-slice

**Ultima atualizacao:** 2026-02-26

## Objetivo

Fechar o ciclo de aprendizado do SaaS: promover conteudo (episodios) para a memoria longa (RAG) por tenant, com auditoria. Assim o conhecimento do tenant cresce com o uso e o produto atinge memoria + contexto + aprendizado completos.

## Escopo

- Apos criar episodio (memory.episode.created + episodeStore.appendEpisode), promover para memoria longa: criar entrada no owner memory store com conteudo derivado do episodio (ex.: marco de sessao no turno N), source `episode_promotion`, external_key para idempotencia.
- Emitir evento de contrato `memory.promoted.from_episode` quando a promocao for persistida (rastreabilidade).
- Se embedding falhar (ex.: tenant sem chave), nao quebrar o fluxo; promocao e best-effort.
- Nao alterar API publica; apenas enriquecer o fluxo interno.

## Premissas

- owner-episode-store e owner-memory-store (long) ja existem.
- Retrieval (RAG) ja usa o owner memory store; novas entradas passam a ser recuperaveis.
- PROXIMO-PASSO.md define este passo como o unico para fechar memoria/contexto/aprendizado no produto.

## Exit criteria Specify

- [ ] spec.md aprovado
- [ ] design.md aprovado
- [ ] tasks.md aprovado

## Exit criteria Implement

- [x] M4L-001a..c implementados; testes (app-platform-api:test 51 pass) e contract-checks passaram; governance atualizado.
