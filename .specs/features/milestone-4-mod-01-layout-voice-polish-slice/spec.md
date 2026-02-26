# Spec - milestone-4-mod-01-layout-voice-polish-slice

Status: Approved
Date: 2026-02-25

## Objective
Polish Module 01 chat ergonomics and continuous voice mode to match the expected Fabio2 operational feel.

## Scope
- Optimize space usage in Owner chat layout:
  - reduce right avatar panel footprint in standard mode
  - eliminate dead white area below composer
  - keep message composer anchored at the bottom
  - place attachment actions beside the composer in compact format
- Continuous mode behavior:
  - keep immersive avatar stage without aggressive zoom/crop
  - enable browser-level continuous speech recognition loop
  - auto-send final recognized speech as owner interaction text
- Chat cleanliness:
  - remove status/noise prefixes from assistant text in the main chat stream

## Functional Requirements
1. Composer stays at bottom with larger text area and compact side actions (`Audio`, `Foto`, `Arquivo`).
2. Right panel uses less horizontal space in non-continuous mode.
3. Continuous mode toggles voice recognition start/stop with automatic restart while active.
4. Assistant bubble text suppresses protocol noise like `[accepted]` and provider/task telemetry fragments.

## Acceptance Criteria
- Module 01 uses available viewport better on desktop without lower dead strip.
- Continuous mode can capture speech continuously in supported browsers and send recognized messages.
- Avatar stage no longer renders oversized/cropped giant brain during continuous mode.
- Owner chat appears operationally clean (content-first).
