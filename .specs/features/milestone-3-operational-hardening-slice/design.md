# Design - milestone-3-operational-hardening-slice

Status: Approved
Date: 2026-02-25

## Execution Model
Single orchestrator script:
- `tools/preprod-validate.ps1`

Script flow:
1. Resolve repo root.
2. Build ordered gate list.
3. Execute each gate sequentially.
4. Persist report file with:
   - run timestamp
   - gate name
   - command
   - status (pass/fail)
5. Return non-zero exit on first failure.

## Gate Set (v1)
1. `npx nx run app-platform-api:test`
2. `npx nx run contract-tests:contract-checks`
3. `npm run tenant:validate`
4. `npx nx run app-owner-console:build`
5. `npx nx run app-crm-console:build`
6. `npm run smoke:postgres`

## Report Artifact
- Path: `tools/reports/preprod-validate-<timestamp>.log`
- Human-readable with one line per gate.

## Validation Strategy
- Execute `npm run preprod:validate`.
- Confirm all gates pass.
- Confirm report file creation.
