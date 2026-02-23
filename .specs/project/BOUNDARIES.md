# BOUNDARIES

Date: 2026-02-23  
Status: Active

## Naming Convention
- Apps:
  - `app-owner-console`
  - `app-crm-console`
  - `app-platform-api`
- Core libs:
  - `core-orchestration-contracts`
  - `core-persona-registry`
  - `core-audit-metrics`
  - `core-data-model`
- Module libs:
  - `mod-01-owner-concierge`
  - `mod-02-whatsapp-crm`

## Dependency Rules (baseline)
1. Apps can depend on module and core libs.
2. Module libs can depend on core libs only.
3. Core libs cannot depend on module libs.
4. Cross-module calls must happen via contracts/events.
5. Tenant customization must stay in `tenants/*` or persona/policy configs, not core runtime.

## Contract-First Rule
- Any cross-module behavior starts with schema/contract update before runtime code.
- Contract checks are mandatory before checkpoint close:
  - `nx run contract-tests:contract-checks`
