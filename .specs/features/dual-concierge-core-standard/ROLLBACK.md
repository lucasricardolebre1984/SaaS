# Rollback Checklist - Dual Concierge Core Standard

Date: 2026-02-23

## Trigger Conditions
- Contract check failures after migration.
- Cross-module event incompatibility.
- Lead/collection critical flow regression.

## Rollback Steps
1. Freeze new runtime rollout in fabio.
2. Keep fabio2 as active production path (already mandated).
3. Revert only affected module changes in fabio branch.
4. Restore previous approved contract snapshots.
5. Re-run:
   - `nx run contract-tests:contract-checks`
   - sample tenant validation

## Exit Conditions
- Contract checks pass again.
- State and tasks updated with incident note.
- Regression root-cause logged before next attempt.
