# SaaS Starter Template Manifest

Date: 2026-02-23
Feature: milestone-2-template-generator-slice

## Placeholder Schema
- `{{saas_name}}`: display name for generated SaaS package.
- `{{tenant_id}}`: default tenant id used by generated shell presets.
- `{{layout_default}}`: default layout profile (`fabio2` | `studio`).
- `{{palette_default}}`: default palette profile (`ocean` | `forest` | `sunset`).
- `{{generated_at}}`: UTC timestamp written by generator runtime.

## Template Root
- `templates/saas-starter/`

## Generated File Model
- `README.md`
- `RUNBOOK.md`
- `config/theme.json`
- `config/modules.json`
- `apps/owner-console/theme-preset.json`
- `apps/crm-console/theme-preset.json`

## Determinism Rules
1. Same input args generate the same directory/file structure.
2. Placeholder substitution is plain token replacement (no implicit transforms).
3. Existing output path fails unless `--overwrite` is explicitly set.
