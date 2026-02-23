# Design - foundation-monorepo-bootstrap

Status: Draft
Date: 2026-02-22

## High-level Design

Create a modular Nx workspace with explicit separation:
- apps: deployable products
- libs: reusable domain and UI modules
- tools: scripts/generators/automation
- .specs: governance and execution memory

## Proposed Initial Layout

- apps/fabio-web (future frontend app shell)
- apps/fabio-api (future backend service shell)
- libs/domain-auth
- libs/domain-clientes
- libs/domain-contratos
- libs/domain-agenda
- libs/domain-whatsapp
- libs/domain-viva
- libs/ui-shell
- libs/ui-design-tokens (future palette strategy)
- libs/util-observability

## Migration Strategy
Phase A:
- bootstrap workspace and keep placeholders.
- no production traffic.

Phase B:
- migrate one domain at a time from fabio2.
- each domain requires spec/design/tasks and verification.

Phase C:
- cross-domain integration and hardening.

## Quality Gates per migration batch
1. Build and type-check pass.
2. Unit/smoke tests pass.
3. Contracts documented.
4. Rollback note written.
5. Metrics updated.

## Operational Controls
- Work only in active phase.
- New ideas go to parking lot.
- No direct scope jump to implementation without approved tasks.

## Contract-First Migration Pattern
For each domain migration:
1. Extract business capabilities from fabio2.
2. Define API/domain contracts (inputs, outputs, errors, side effects).
3. Implement fresh module in fabio respecting boundaries.
4. Run parity checks against expected business behavior.

### Forbidden shortcuts
- Copying large service files from legacy.
- Reusing mixed persona/context orchestration without redesign.
- Keeping undocumented cross-module dependencies.
