# Design - milestone-5-runtime-stability-hotfix-slice

Status: Approved
Date: 2026-02-26

## Problem Decomposition
1. **Provider 401 / incorrect_api_key**
   - Causa: payload de `api_key` no tenant runtime config contendo texto extra apos a chave.
   - Efeito: chamadas OpenAI em `/responses`, `/chat/completions` e `/audio/transcriptions` falham.
2. **Mobile drawer inconsistente**
   - Causa: ausencia de backdrop e fechamento incompleto em fluxos de navegacao.
   - Efeito: sidebar fica sobreposta, dificultando uso em iPhone/Android.
3. **Avatar preto no modo continuo**
   - Causa: falha de decode/playback do asset fullscreen em alguns browsers mobile.
   - Efeito: experiencia imersiva quebrada.

## Solution
1. Backend sanitization:
   - `sanitizeTenantRuntimeConfigInput`: normaliza `openai.api_key` usando somente primeiro token.
   - `tenant-runtime-config-store`: aplica mesma regra ao persistir/atualizar.
2. Owner console mobile:
   - `sidebar-backdrop` no DOM.
   - `closeMobileMenu()` chamado em:
     - troca de modulo
     - click no backdrop
     - `Esc`
     - resize para desktop.
3. Avatar fallback:
   - erro no `avatar-fullscreen` troca para:
     - idle: `brain-idle.mp4`
     - speaking: `brain-speaking.mp4`.

## Deployment/Operations
- Branch de entrega consolidada em `main` via PR #3 mergeado.
- Branches remotas antigas removidas para reduzir deriva operacional.
- Protecoes da `main` reaplicadas apos merge:
  - status check `Preprod Validate`
  - 1 aprovacao obrigatoria
  - enforce admins ativo.

## Validation Plan
1. `npx nx run app-platform-api:test`
2. `npx nx run app-owner-console:build`
3. Smoke manual em `dev.automaniaai.com.br`:
   - salvar config OpenAI
   - enviar texto/audio
   - testar menu mobile
   - testar modo continuo/avatar.
