# Design - milestone-3-release-rollback-drill-slice

Status: Approved
Date: 2026-02-25

## Execution Model
Two operational scripts:
1. `tools/release-dry-run.ps1`
2. `tools/rollback-drill.ps1`

## release-dry-run flow
1. Capture git metadata (branch, head, dirty files).
2. Optionally execute `preprod:validate`.
3. Optionally verify branch protection baseline via `gh api`.
4. Persist report `tools/reports/release-dry-run-<timestamp>.log`.

## rollback-drill flow
1. Execute runtime tests with file backend (rollback target path).
2. Optionally execute postgres smoke to validate primary path.
3. Persist report `tools/reports/rollback-drill-<timestamp>.log`.

## preprod gate integration
- Add operational gates at the end:
  - `release-dry-run` (no recursion mode)
  - `rollback-drill` (skip postgres smoke if already covered)

## Validation Strategy
1. `npm run release:dry-run -- -SkipPreprodValidate -SkipBranchProtectionCheck`
2. `npm run rollback:drill -- -SkipPostgresSmoke`
3. `npm run preprod:validate -- -SkipSmokePostgres`
