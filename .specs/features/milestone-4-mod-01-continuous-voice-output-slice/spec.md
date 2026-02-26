# Spec - milestone-4-mod-01-continuous-voice-output-slice

Status: Approved
Date: 2026-02-25

## Objective
Close the remaining Module 01 continuous-mode gap: assistant must reply with OpenAI voice output (not text-only) while continuous mode is active.

## Scope
- Add tenant-aware speech synthesis endpoint for Module 01:
  - `POST /v1/owner-concierge/audio/speech`
- Owner Console continuous mode behavior:
  - after each assistant response (provider=openai), auto-play synthesized voice
  - pause microphone recognition while audio is playing
  - resume continuous recognition immediately after playback ends
- Keep existing text chat, image/file analysis, and transcription flow unchanged.

## Functional Requirements
1. Speech endpoint requires `tenant_id`, `request_id`, and non-empty `text`.
2. Speech endpoint uses tenant OpenAI key from runtime config.
3. If tenant voice is disabled or key is absent, endpoint returns explicit error.
4. Continuous mode must not self-capture TTS output in recognition loop.
5. Voice profile defaults:
   - model: `gpt-4o-mini-tts`
   - voice: `shimmer`
   - speed: low-latency fast profile (`1.12`)

## Acceptance Criteria
- Continuous mode returns audible assistant response in browser after each OpenAI interaction.
- Recognition pauses during playback and resumes automatically.
- Existing multimodal attachments and text path remain functional.
