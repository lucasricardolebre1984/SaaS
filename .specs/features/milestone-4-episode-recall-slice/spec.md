# Spec - milestone-4-episode-recall-slice

**Ultima atualizacao:** 2026-02-26

## Objetivo

Incluir episodios recentes (medium memory) no recall do Persona 1, para a IA usar marcos de sessao ao responder. Fecha o uso ponta a ponta short + medium + long no fluxo de resposta.

## Escopo

- Antes de generateAssistantOutput: obter ultimos N episodios do tenant/sessao (episodeStore.listEpisodes).
- Formatar episodios (turn_count, created_at, summary se houver) e passar no payload como episode_context.
- Provider injeta episode_context em system/instructions ao lado de operational_context e retrieved_context.
- Nao alterar contrato de API publica; apenas enriquecer contexto interno.

## Premissas

- owner-episode-store (M4D-009c) ja implementado com listEpisodes(tenantId, opts).
- CONTEXT: recall unificado short + medium + long; no-context-loss.

## Exit criteria Specify

- [x] spec.md aprovado
- [x] design.md aprovado
- [x] tasks.md aprovado

## Exit criteria Implement

- [x] M4E-001a..d: episode_context no recall (app + provider); testes e governance atualizados.
