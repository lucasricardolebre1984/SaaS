# Spec - milestone-5-runtime-stability-hotfix-slice

Status: Approved
Date: 2026-02-26

## Objective
Fechar falhas de estabilidade do runtime em `dev.automaniaai.com.br` com foco em:
- erro `provider:error` por chave OpenAI malformada no tenant runtime config;
- UX mobile do Owner Console (menu lateral e modo continuo/avatar);
- rastreabilidade operacional (branches, estado e evidencias).

## Scope
- Sanitizacao defensiva de `openai.api_key` no backend tenant runtime config.
- Ajustes mobile no Owner Console (drawer + backdrop + fechamento consistente).
- Fallback de video do avatar para evitar tela preta em navegadores mobile.
- Normalizacao de branches remotas para reduzir ruido operacional.
- Atualizacao de docs institucionais e logs.

## Functional Requirements
1. Runtime config deve truncar chave OpenAI para o primeiro token valido ao salvar.
2. Menu mobile deve abrir/fechar sem bloquear navegacao de modulos.
3. Avatar continuo deve ter fallback de renderizacao em mobile.
4. Repositorio remoto deve ficar com branch principal limpa para operacao (`main`).

## Non-Functional Requirements
- Todas as mudancas devem ser auditaveis por data/hora em `.specs/project/*`.
- Sem regressao em gates Nx (`app-platform-api:test`, `app-owner-console:build`).
- Sem dependencia de codigo legado `fabio2`.

## Out of Scope
- Refatoracao completa de layout mobile de todos os modulos.
- Nova arquitetura de deploy (ECS/EKS) neste slice.

## Acceptance Criteria
- `provider:error` por chave concatenada nao ocorre apos `Salvar Config`.
- Mobile drawer fecha corretamente em troca de modulo/click externo.
- Avatar continuo nao cai em tela preta quando `avatar-fullscreen.mp4` falhar.
- Branches remotas antigas removidas; protocolo de protecao da `main` restaurado.
