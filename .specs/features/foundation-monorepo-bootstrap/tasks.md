# Tasks - foundation-monorepo-bootstrap

Status: Completed
Date: 2026-02-22

## Task List

### FND-001 - Create institutional spec baseline
- Status: done
- Output:
  - .specs/project/* created
  - .specs/codebase/* created
  - .specs/features/foundation-monorepo-bootstrap/* created
- Verification:
  - Files exist and contain current context

### FND-002 - Bootstrap Nx in fabio
- Status: done
- Steps:
  1. run nx init
  2. validate nx workspace commands
  3. record baseline targets
- Verification:
  - nx report works
  - workspace has valid nx.json
- Evidence:
  - package.json
  - tsconfig.base.json
  - nx.json
  - `nx show projects` recognizes app/core/module/tool projects

### FND-003 - Define module boundaries
- Status: done
- Steps:
  1. create initial apps/libs skeleton
  2. define naming convention
  3. define dependency rules
- Verification:
  - architecture doc updated
  - boundaries documented
- Evidence:
  - apps/*/project.json (owner-console, crm-console, platform-api)
  - libs/*/project.json (mod/core projects)
  - .specs/project/BOUNDARIES.md

### FND-004 - Add quality gates
- Status: done
- Steps:
  1. define lint/test/typecheck tasks
  2. define minimal CI flow
  3. define failure policy
- Verification:
  - local runbook documented
  - CI draft documented
- Evidence:
  - tools/run-contract-checks.ps1
  - tools/validate-sample-tenant-pack.ps1
  - tools/validate-sample-tenant-pack.mjs
  - tools/contract-tests/executable-contract.test.mjs
  - tools/contract-tests/project.json
  - .specs/project/QUALITY_GATES.md

### FND-005 - Prepare first domain migration plan
- Status: done
- Steps:
  1. choose first domain pair (approved: mod-01 + mod-02)
  2. create feature spec/design/tasks
  3. set rollback checklist
- Verification:
  - first domain feature docs approved
- Evidence:
  - .specs/features/dual-concierge-core-standard/spec.md
  - .specs/features/dual-concierge-core-standard/design.md
  - .specs/features/dual-concierge-core-standard/tasks.md
  - .specs/features/dual-concierge-core-standard/ROLLBACK.md

## Phase Exit Criteria
- FND-002 to FND-005 complete.
- Decision gate logged in STATE.md before starting domain migration implementation.

### FND-006 - Legacy quarantine and rewrite policy
- Status: done
- Steps:
  1. create explicit list of legacy anti-patterns (routes/persona/context)
  2. define rewrite standards and forbidden shortcuts
  3. enforce contract-first migration checklist
- Verification:
  - policy documented in .specs
  - all future migration features reference this policy
- Evidence:
  - .specs/project/LEGACY_QUARANTINE.md
  - .specs/project/STATE.md (legacy policy and quarantine notes)

### FND-001A - Import approved legacy assets only
- Status: done
- Scope imported:
  - contratos/
- Scope explicitly not imported:
  - backend/
  - frontend/
  - docs/ (except future selective migration by spec)
- Verification:
  - fabio contains contratos assets
  - no runtime code copied from fabio2

### FND-007 - Define Dual Concierge Standard (Module 1 + Module 2)
- Status: done
- Steps:
  1. define owner concierge (module 1) responsibilities
  2. define whatsapp crm concierge (module 2) responsibilities
  3. define cross-module event contracts and governance
- Verification:
  - feature docs created under .specs/features/dual-concierge-core-standard/
