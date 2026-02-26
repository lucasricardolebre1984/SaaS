# Design - milestone-4-mod-01-avatar-attachments-hotfix-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Frontend:
  - `apps/owner-console/src/app.js`
  - `apps/owner-console/src/index.html`
- Backend:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/owner-response-provider.mjs`
- Contract:
  - `libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json`

## Avatar Fix Design
- Use MP4 as default avatar source for compatibility-first playback.
- Register runtime fallback on video error.
- Force safe replay after source change and when continuous mode starts.

## Attachment Fix Design
- Frontend:
  - convert selected files/images to inline base64 when within size limit
  - extract bounded text excerpt from text-like files
  - send `attachments[]` with `data_base64` and/or `text_excerpt`
- Backend:
  - pass request attachments through interaction provider call
  - sanitize attachments in provider layer
  - build multimodal payload:
    - image attachments -> OpenAI image input data URL
    - text file excerpts -> appended textual context

## Validation Plan
- `node --check apps/owner-console/src/app.js`
- `npx nx run app-owner-console:build`
- `npx nx run app-platform-api:test`
- `npx nx run contract-tests:contract-checks`
