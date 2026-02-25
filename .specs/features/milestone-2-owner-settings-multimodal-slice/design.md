# Design - milestone-2-owner-settings-multimodal-slice

Status: Approved
Date: 2026-02-24

## Architecture
- Extend existing owner-console static app with view switching:
  - `mod-01` chat workspace
  - `mod-settings` configuration workspace
- Keep existing runtime APIs untouched.
- Persist local settings and local cost metrics via `localStorage`.
- Protect settings workspace entry with admin password challenge and session-level unlock state.

## View Model
1. `module nav` (dynamic render)
   - core modules array (1..5)
   - append settings module as fixed last item
2. `chat workspace`
   - current chat + avatar panel
   - attachment action row (`Audio`, `Foto`, `Arquivo`)
3. `settings workspace`
   - runtime core card
   - OpenAI defaults card
   - persona prompts card (persona 1 + persona 2 with examples)
   - integrations card
   - cost metrics card
   - lock/unlock status badge (`admin: bloqueado/liberado`)

## Data Model (client-side)
- `owner_console_config_v1`:
  - `runtime`
  - `openai`
  - `personas`
  - `integrations`
  - `metrics_by_module`
- attachment queue:
  - `type`, `uri`, `mime_type`, `filename`, `size`
- send payload extension (optional):
  - `persona_overrides.owner_concierge_prompt`
  - `persona_overrides.whatsapp_agent_prompt`
- session storage:
  - `owner_console_settings_admin_unlock_v1` (`1` when unlocked for current browser session)

## Cost Metrics Model
- Local estimated spend map:
  - `mod-01-owner-concierge`
  - `mod-02-whatsapp-crm`
  - `mod-03-clientes`
  - `mod-04-agenda`
  - `mod-05-faturamento-cobranca`
- Track:
  - `calls`
  - `estimated_usd`
  - `estimated_brl` (conversion helper using local FX setting)

## Validation
- `node --check apps/owner-console/src/app.js`
- `npx nx run app-owner-console:build`
- `npx nx run app-owner-console:serve` + HTTP `200` check
