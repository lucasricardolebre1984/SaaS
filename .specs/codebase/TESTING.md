# TESTING

Source: fabio2

## Current test landscape
Backend:
- pytest based suite under backend/tests
- async tests present (pytest-asyncio)
- domain tests include auth, contratos, viva, whatsapp flows

Frontend:
- no dedicated test framework config detected yet (no jest/vitest/playwright config file found in root scan)
- scripts include type-check and build validation

CI currently executes:
- Frontend: type-check + build
- Backend: syntax compile smoke (python -m compileall app)

## Gaps
- Limited automated frontend behavioral tests.
- CI backend is syntax-smoke only, not full pytest suite.
- No explicit coverage thresholds enforced.

## Migration recommendations
1. Keep current tests green baseline first.
2. Add Nx targets for test/lint/type-check per module.
3. Introduce minimum coverage policy incrementally.
4. Add smoke e2e for critical user paths before production cutover.
