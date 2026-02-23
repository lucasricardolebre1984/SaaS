# LEGACY QUARANTINE

Date: 2026-02-23  
Status: Active

## Source System
- `C:\projetos\fabio2`

## Allowed
- Use legacy only as behavior reference.
- Import explicitly approved assets (current approved import: `contratos/`).

## Forbidden
- Direct copy/paste of mixed service/router/persona/context code from legacy runtime.
- Hidden coupling between module boundaries.
- Hardcoded tenant persona behavior inside core modules.

## Mandatory Migration Pattern
1. Extract behavior intent.
2. Define contract and boundaries.
3. Implement clean-room module.
4. Validate parity with contract tests.

## Enforcement
- Every migration feature must reference this policy.
- No "done" status without explicit contract evidence.
