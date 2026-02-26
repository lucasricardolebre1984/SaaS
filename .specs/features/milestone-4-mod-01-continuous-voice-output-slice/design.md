# Design - milestone-4-mod-01-continuous-voice-output-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Backend (`apps/platform-api/src/app.mjs`)
  - add request validator: `validateOwnerAudioSpeechRequest`
  - add OpenAI speech helper: `synthesizeSpeechWithOpenAi`
  - expose endpoint:
    - `POST /v1/owner-concierge/audio/speech`
  - endpoint behavior:
    - resolve tenant runtime config
    - enforce tenant OpenAI key and `voice_enabled`
    - call OpenAI `/audio/speech`
    - stream binary audio (`audio/mpeg`) back to client
- Frontend (`apps/owner-console/src/app.js`)
  - add continuous speech playback pipeline:
    - `synthesizeAssistantSpeech(text)` fetches backend speech endpoint
    - `playContinuousAssistantSpeech(text)` pauses recognition, plays audio, resumes recognition
  - guard recognition callbacks while TTS output is active to avoid self-loop capture
  - keep all current interaction and attachment contracts unchanged

## Runtime Rules
1. Only active in continuous mode and when provider is OpenAI.
2. If speech generation/playback fails, keep text response and surface explicit operational error in chat.
3. Exiting continuous mode always stops recognition and current TTS playback.

## Validation Plan
- `npx nx run app-platform-api:test`
- `npx nx run app-owner-console:build`
- Manual smoke in `/owner/`:
  - enable continuous mode
  - speak a prompt
  - confirm assistant responds by voice and then resumes listening
