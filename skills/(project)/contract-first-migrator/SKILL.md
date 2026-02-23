---
name: contract-first-migrator
description: Migrates behavior from fabio2 using clean-room, contract-first rules. Use when translating legacy capabilities without importing architecture debt.
---

# Contract First Migrator

## When to use
- Migrating any legacy behavior from `fabio2`.
- Rebuilding route/persona/context flows from legacy references.

## Source of truth
- `.specs/project/STATE.md` (legacy quarantine policy)
- `.specs/project/BASELINE_SCOPE.md`
- `.specs/codebase/FABIO2_AI_INVENTORY.md`

## Process
1. Extract business behavior from legacy.
2. Define new contract (input, output, side effects, errors).
3. Implement fresh module aligned to current boundaries.
4. Validate parity using behavior-level tests.

## Forbidden shortcuts
- Copying legacy service/router files directly.
- Reusing mixed persona/context/webhook code as-is.
- Creating hidden module coupling.

## Required outputs
- Contract schema update.
- Migration note with risk and rollback.
- Test evidence for behavior parity.
