# Design - milestone-4-mod-01-avatar-fullscreen-slice

Status: Approved
Date: 2026-02-25

## Media Pipeline
- Source asset:
  - `C:\Users\Lucas\Desktop\Lucas\AvatarSaaS.mov`
- Generated web assets:
  - `apps/owner-console/src/avatar/assets/avatar-fullscreen.mp4`
  - `apps/owner-console/src/avatar/assets/avatar-fullscreen.webm`

## Frontend Changes
- `index.html`
  - add `continuousBackBtn` inside `voice-panel`
  - point avatar idle/speaking videos to `avatar-fullscreen.webm` (runtime fallback handled in JS)
- `styles.css`
  - in `body.continuous-active`:
    - hide sidebar/topbar/chat/meta and card header
    - render voice panel fixed fullscreen
    - show transparent floating `Voltar` button
    - avatar fills entire viewport
- `app.js`
  - add source chooser:
    - webm preferred
    - mp4 fallback when webm not supported
  - wire `continuousBackBtn` to disable continuous mode
  - keep existing continuous speech loop behavior

## Validation Plan
- `node --check apps/owner-console/src/app.js`
- `npx nx run app-owner-console:build`
- Manual:
  - open `/owner/`
  - activate continuous mode
  - verify fullscreen avatar + only `Voltar` visible
  - click `Voltar` and confirm layout restoration
