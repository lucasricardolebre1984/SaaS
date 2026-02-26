# Tasks - milestone-3-ci-preprod-gate-slice

Status: Completed
Date: 2026-02-25

## M3C-001 - Integrate preprod gate in runtime CI workflow
- Status: completed
- Output:
  - update `.github/workflows/runtime-ci.yml` to run `npm run preprod:validate`
  - upload preprod report artifact
  - ensure npm scripts use `pwsh` for Linux runner compatibility
- Evidence:
  - `.github/workflows/runtime-ci.yml`
  - local dry validation report: `tools/reports/preprod-validate-*.log`

## M3C-002 - Governance checkpoint
- Status: completed
- Output:
  - update `STATE`, `worklog`, `costlog`
  - record next natural step
