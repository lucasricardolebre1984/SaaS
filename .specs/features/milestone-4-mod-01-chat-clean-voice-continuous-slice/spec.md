# Spec - milestone-4-mod-01-chat-clean-voice-continuous-slice

Status: Approved
Date: 2026-02-25

## Objective
Deliver a clean Owner Chat experience aligned to fabio2 operational behavior, with direct audio transcription and a usable continuous voice mode.

## Scope
- Module 01 UI cleanup:
  - remove noisy runtime telemetry from chat bubbles
  - keep operational diagnostics outside the main chat stream
  - refine visual hierarchy to a cleaner Fabio2-like baseline
- Direct audio flow:
  - record audio and transcribe directly (no attachment queue dependency)
  - send transcribed text automatically to owner interaction
- Continuous mode UX:
  - activating continuous mode must switch to avatar-first experience
  - avatar stage must expand to immersive panel while active
- Backend support:
  - add tenant-aware OpenAI transcription endpoint for module 01

## Functional Requirements
1. Audio record button triggers capture -> transcription -> chat send pipeline.
2. If transcription fails, user gets explicit error and can retry.
3. Continuous mode toggles UI state and keeps avatar stage as primary focus.
4. Chat messages show assistant/user content only, without internal contract noise.

## Acceptance Criteria
- Voice capture sends meaningful transcript text without manual file submit.
- Continuous mode visibly changes layout to avatar-centric stage.
- Chat appears visually cleaner and closer to fabio2 references.
