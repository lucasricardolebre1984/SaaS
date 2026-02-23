# Tasks - milestone-2-template-generator-slice

Status: Draft
Date: 2026-02-23

## M2T-001 - Define template manifest and placeholder model
- Status: pending
- Output:
  - explicit placeholder schema for generated files
  - base template tree definition
- Evidence:
  - `templates/saas-starter/*`
  - `docs/templates/manifest.md` (or equivalent local manifest file)

## M2T-002 - Implement generator script
- Status: pending
- Output:
  - generator CLI script with args validation
  - dry-run and overwrite logic
- Evidence:
  - `tools/generate-saas-starter.mjs`

## M2T-003 - Wire command entrypoint
- Status: pending
- Output:
  - npm script and/or Nx target for generation command
- Evidence:
  - `package.json`
  - `nx` project target (if applied)

## M2T-004 - Validate generation flow and close governance checkpoint
- Status: pending
- Output:
  - dry-run validation
  - real generation validation
  - conflict/overwrite validation
  - state/worklog/costlog update
- Verification:
  - `npm run ... -- --dry-run`
  - `npm run ... -- --output <path>`
