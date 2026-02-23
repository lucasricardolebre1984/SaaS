# Design - milestone-2-ui-shell-slice

Status: Approved
Date: 2026-02-23

## Architecture
- Static first UI shells with plain HTML/CSS/JS to reduce setup overhead and keep portability.
- Shared runtime integration through configurable `API base URL` fields in each console.
- Shared visual mode engine per console:
  - `data-layout` on `<html>`
  - `data-palette` on `<html>`
  - localStorage persistence + tenant preset map

## Owner Console Design
- Left navigation rail with modules 1..5.
- Main chat panel:
  - chat history list
  - composer with text input
  - send interaction action (`POST /v1/owner-concierge/interaction`)
- Right panel:
  - continuous chat control
  - avatar block with idle/speaking asset swap
  - health probe (`GET /health`)
- Layout profiles:
  - `fabio2`: fixed sidebar + sticky topbar + neutral cards
  - `studio`: premium AI-first visual layer (glass cards, glow gradients, motion-safe microinteractions)

## CRM Console Design
- Header with API URL and tenant id controls.
- KPI cards for lead stages.
- Lead list loaded from `GET /v1/crm/leads`.
- Lead creation form calling `POST /v1/crm/leads`.
- Layout profiles mirror owner console for cross-module consistency.

## Styling/Tokens
- CSS variable tokens (`--color-*`, `--radius-*`, `--space-*`, `--font-*`) defined per app baseline.
- Palette presets:
  - `ocean` (institutional default)
  - `forest` (enterprise calm)
  - `sunset` (commercial/high-contrast)
- Intentional visual direction:
  - `fabio2`: clean operational dashboard parity
  - `studio`: bento-like composition, glass layers, atmospheric gradients, subtle motion cues

## Nx Runtime Targets
- Replace placeholder targets with:
  - `serve`: static server script per app root/port
  - `build`: copy static source into `dist/apps/*`

## Validation
- Run:
  - `npx nx run app-owner-console:build`
  - `npx nx run app-crm-console:build`
- Keep existing backend gates untouched.
