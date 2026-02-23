# Design - milestone-2-template-generator-slice

Status: Approved
Date: 2026-02-23

## Architecture
- Use a lightweight Node script generator under `tools/`.
- Source templates from a dedicated template tree (for example `templates/saas-starter/`).
- Keep generated artifact external to runtime core, so template changes do not mutate core contracts.

## Proposed Components
1. `tools/generate-saas-starter.mjs`
   - parses args
   - validates input (layout/palette)
   - resolves output path
   - supports `--dry-run` and `--overwrite`
2. `templates/saas-starter/`
   - branding/theme config template
   - README template
   - optional tenant preset template snippet
3. `tools/render-template.mjs` (optional helper)
   - token replacement for placeholders (`{{saas_name}}`, `{{tenant_id}}`, etc.)

## Data/Config Model
- Generated theme config (example):
  - `saas_name`
  - `tenant_id`
  - `layout_default`
  - `palette_default`
  - module labels (1..5)
- Generated runbook:
  - start-day command
  - end-day command
  - where to change colors/layout/persona presets

## Validation Plan
- `dry-run` prints exact file tree/actions.
- real run creates output folder with expected files.
- rerun without overwrite flag fails predictably.
- rerun with overwrite flag replaces output predictably.
