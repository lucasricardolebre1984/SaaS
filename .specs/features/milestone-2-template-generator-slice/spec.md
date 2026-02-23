# Spec - milestone-2-template-generator-slice

Status: Draft
Date: 2026-02-23

## Objective
Deliver a reusable generator/playbook so a new SaaS variant can be scaffolded from this repository in less than one day.

## Scope
- Add a starter generator command for SaaS instantiation.
- Generate baseline brand/theme config (layout + palette defaults).
- Generate starter documentation pack for the new SaaS context.
- Keep current module shell architecture (modules 1..5) as default baseline.

## Functional Requirements
1. Generator must accept at least:
   - `saas_name`
   - `tenant_id`
   - `layout_default` (`fabio2` | `studio`)
   - `palette_default` (`ocean` | `forest` | `sunset`)
2. Generator must output a ready-to-edit starter package with:
   - branding/theme config file
   - owner console + crm console defaults wired to the selected theme
   - operational README/runbook for day-1 usage
3. Generator must provide safe behavior:
   - fail on existing target unless explicit overwrite flag
   - deterministic output paths
4. Generator must support dry-run mode for preview.

## Non-Functional Requirements
- Keep implementation dependency-light.
- Keep generation deterministic (same input -> same structure).
- Preserve contract-first governance and anti-pollution protocol.

## Out Of Scope
- Full CI/CD pipeline generation.
- Cloud deployment automation.
- Runtime business module customization beyond baseline shell/config.

## Acceptance Criteria
- A single command creates a new SaaS starter artifact from current baseline.
- Generated artifact includes editable theme/layout defaults and documented next steps.
- Dry-run and overwrite protections are validated.
