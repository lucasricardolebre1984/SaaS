# Spec - milestone-2-owner-settings-multimodal-slice

Status: Approved
Date: 2026-02-24

## Objective
Expand Owner Console baseline with a dedicated `06 Configuracoes` module for API/integration setup and cost visibility, plus multimodal chat inputs (audio, image, file).

## Scope
- Add module navigation item `06 Configuracoes` as fixed last item.
- Move runtime controls from topbar into configuration module.
- Add settings sections for:
  - Runtime core (API base, tenant, session, layout, palette)
  - OpenAI default baseline (model and feature toggles)
  - Persona prompts for module 01 and module 02
  - Module integrations (Google Calendar, Evolution, billing provider placeholders)
  - API spend metrics by module
- Add chat attachment controls:
  - audio
  - image/photo
  - generic file

## Functional Requirements
1. Sidebar must always render:
   - modules 1..5
   - module 6 (`Configuracoes`) as last position
2. Configuration values must persist locally and reload on startup.
3. Chat payload must support `attachments` compatible with module-01 multimodal contract (`type`, `uri`, optional `mime_type`, `filename`).
4. UI must show spend metrics by module with reset capability.
5. OpenAI defaults must be prefilled with `gpt-5.1-mini` and multimodal toggles enabled.
6. Module `06 Configuracoes` access must require admin password challenge in UI.
7. Configuration module must expose prompt fields for:
   - Persona 1 (owner concierge / orchestrator)
   - Persona 2 (whatsapp agent)
8. `send_message` payload must allow optional `persona_overrides` and propagate in orchestration command/task input.
9. If persona prompts are empty, runtime must stay neutral and keep normal memory/context flow.

## Non-Functional Requirements
- No secrets persisted server-side in this slice (local workspace only).
- Keep owner-console dependency-light (plain HTML/CSS/JS).
- Preserve current layout profile system (`fabio2` and `studio`).

## Out Of Scope
- Secure secret vault backend.
- Real provider billing reconciliation from external APIs.
- Full module 2..5 dedicated pages.

## Acceptance Criteria
- Owner console has working module `06 Configuracoes`.
- Owner console blocks module `06 Configuracoes` while admin password is invalid.
- API/runtime controls are operable from config module.
- Audio/image/file actions generate valid attachment payload for owner interaction endpoint.
- Cost dashboard renders values for modules 1..5 and can be reset.
- Persona prompts can be saved in settings and are sent as optional overrides in owner interaction flow.
- Without persona prompts configured, interaction flow remains valid and functional.
