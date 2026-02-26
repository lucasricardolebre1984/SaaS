# Design - milestone-4-mod-01-chat-clean-voice-continuous-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Backend (`apps/platform-api/src/app.mjs`)
  - New endpoint:
    - `POST /v1/owner-concierge/audio/transcribe`
  - Uses tenant runtime OpenAI key/model context and calls OpenAI transcription API.
- Frontend (`apps/owner-console/src/app.js`)
  - Audio recorder stop handler switches from "attachment queue" to direct transcription flow.
  - Auto-submit transcript through existing owner interaction API.
  - Continuous mode toggles a layout state class for avatar-first UX.
  - Chat rendering simplified: no status/provider metadata in message body.
- Frontend styles (`apps/owner-console/src/styles.css`)
  - Cleaner chat spacing and reduced visual noise.
  - New continuous-active layout: enlarged avatar panel and minimized non-essential blocks.
  - Subtle Win11-like button treatment for primary/ghost actions.

## Runtime Rules
1. Tenant key required for server-side transcription endpoint.
2. Empty transcript returns validation error and does not auto-send.
3. Continuous mode only changes UX layout, not orchestration contracts.

## Validation Plan
- `npx nx run app-platform-api:test`
- `npx nx run app-owner-console:build`
- Manual smoke:
  - record audio and verify auto transcript send
  - toggle continuous and verify avatar-first layout
