# app-owner-console

Module 01 visual shell for owner orchestration.

## Current scope

- SaaS module menu (1..5)
- Owner chat panel connected to `/v1/owner-concierge/interaction`
- Continuous mode toggle
- Avatar panel using local `idle/speaking` assets
- API health probe

## UI Building Blocks

- `avatar/VoiceReactiveAvatar`: reusable React component (optional integration path)
- `index.html`, `styles.css`, `app.js`: static shell baseline for Milestone 2
- Triple layout engine:
  - `layout1`: institutional premium shell
  - `layout2`: flagship neural shell
  - `layout3`: executive light shell
- Palette presets:
  - `palette1`, `palette2`, `palette3`, `palette4`
- Tenant theme map:
  - configured in `app.js` (`TENANT_THEME_PRESETS`)
