# Design - milestone-4-mod-01-layout-voice-polish-slice

Status: Approved
Date: 2026-02-25

## Architecture
- Frontend only (`apps/owner-console/src/*`).
- No contract shape changes.
- No backend endpoint changes for this slice.

## UI/UX Adjustments
- `index.html`
  - move attachment actions into the same composer row
  - convert message input from single-line input to compact multiline textarea
- `styles.css`
  - reduce workspace right column width
  - make chat/voice panels column-flex with composer pinned to bottom
  - compact side attachment buttons
  - tune continuous avatar stage to landscape framing and avoid portrait zoom artifacts

## Continuous Voice Runtime
- `app.js`
  - add browser SpeechRecognition loop (`SpeechRecognition`/`webkitSpeechRecognition`)
  - on final transcript, call existing `sendInteraction(text, [])`
  - on transient end/error while active, auto-restart with short backoff
  - on permission denial, stop continuous mode and surface explicit guidance

## Chat Output Cleanup
- `app.js`
  - normalize assistant text before render:
    - strip leading status markers (`[accepted]`, etc.)
    - strip inline protocol telemetry (`tasks`, `provider=...`)

## Validation Plan
- `npx nx run app-owner-console:build`
- Manual smoke in `/owner/`:
  - verify compact composer placement and reduced right panel width
  - verify continuous toggle starts/stops browser voice loop
  - verify avatar framing in continuous mode without giant crop
