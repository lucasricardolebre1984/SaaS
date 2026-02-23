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
- Dual layout engine:
  - `fabio2`: canonical dashboard shell
  - `studio`: premium AI-first shell
- Palette presets:
  - `ocean`, `forest`, `sunset`
- Tenant theme map:
  - configured in `app.js` (`TENANT_THEME_PRESETS`)
