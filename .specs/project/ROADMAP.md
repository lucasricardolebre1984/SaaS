# ROADMAP

Last update: 2026-02-25

## Milestone 0 - Institutional Foundation (completed)
Objective: Create governance, architecture baseline, and metrics operating system.

Features:
- foundation-monorepo-bootstrap
- saas-standard-v1
- agent-skills-cli-mvp
- dual-concierge-core-standard
- engineering-metrics-platform
- module-decomposition-plan
- runtime-dual-concierge-slice

Exit criteria:
- Foundation specs approved
- Nx workspace baseline running locally
- Quality gates documented

Status update:
- Exit criteria achieved (contracts + runtime skeleton + contract-check gate).
- Ready to execute Milestone 1 implementation slices.

## Milestone 1 - Core Platform Migration (completed)
Objective: Bring core domains from fabio2 into modular architecture.

Target domains:
- mod-01-owner-concierge
- mod-02-whatsapp-crm
- mod-03-clientes
- mod-04-agenda
- mod-05-faturamento-cobranca
- contratos

Exit criteria:
- Domain boundaries respected
- CI quality gates stable
- No regression in key user flows

Status update:
- Exit checklist closed in `.specs/project/MILESTONE-1-EXIT-CHECKLIST.md`.
- Ready to start Milestone 2 implementation stream.

## Milestone 2 - Shared SaaS Template (completed)
Objective: Make this repository reusable as SaaS starter kit.

Deliverables:
- design system and layout shell
- configurable brand/palette tokens
- generator/playbook for spinning up new SaaS

Exit criteria:
- New SaaS skeleton created in less than 1 day
- Shared modules reused with minimal overrides

Status update:
- UI shell slice completed (`milestone-2-ui-shell-slice`).
- Template generator slice completed (`milestone-2-template-generator-slice`).
- Owner settings/multimodal slice implemented with persona 1/2 prompt contract propagation (`milestone-2-owner-settings-multimodal-slice`).
- Milestone 2 exit checklist closed with explicit GO decision:
  - `.specs/project/MILESTONE-2-EXIT-CHECKLIST.md`

## Milestone 3 - Production Readiness (completed)
Objective: Enable controlled deploy with observability and rollback.

Deliverables:
- release strategy
- aws runbook
- incident and rollback procedures
- cost and reliability dashboards

Exit criteria:
- pre-production checklist pass
- canary deployment validated
- rollback tested

Status update:
- Planning baseline completed com artifacts:
  - `.specs/project/PREPROD-BASELINE-CHECKLIST.md`
  - `apps/platform-api/RUNBOOK-production-readiness.md`
  - `.specs/project/OBSERVABILITY-BASELINE-M3.md`
  - `.specs/project/SECRETS-HARDENING-PLAN-M3.md`
- First execution slice completed:
  - `milestone-3-operational-hardening-slice`
  - executable gate command: `npm run preprod:validate`
- CI integration slice completed:
  - `milestone-3-ci-preprod-gate-slice`
  - runtime workflow runs unified gate and publishes report artifact
- Branch protection slice completed:
  - automation published (`tools/enforce-branch-protection.ps1`)
  - enforcement completed on `main` with required check `Preprod Validate`
- Release/rollback drill slice completed:
  - `milestone-3-release-rollback-drill-slice`
  - commands published:
    - `npm run release:dry-run`
    - `npm run rollback:drill`
  - unified gate now executes operational drill checks with report artifacts
- Milestone 3 exit checklist closed com decisao GO:
  - `.specs/project/MILESTONE-3-EXIT-CHECKLIST.md`

## Milestone 4 - Next Cycle Definition (planned)
Objective: Define the next implementation stream after Milestone 3 readiness closure.

Deliverables:
- first post-M3 feature slice opened in `.specs/features/*`
- spec/design/tasks approved before implementation
- STATE and AGENTS aligned to the new active feature

Exit criteria:
- next feature has approved `spec.md`, `design.md`, and `tasks.md`
- implementation can start without scope ambiguity

Status update:
- kickoff started:
  - feature opened: `milestone-4-mod-01-owner-ai-runtime-slice`
  - feature implemented and validated:
    - owner response runtime provider (`auto/openai/local/off`) integrated in module 01
    - contract enrichment for `assistant_output`
    - gates passed (`app-platform-api:test`, `contract-checks`, `preprod:validate -- -SkipSmokePostgres`)

## Parking Lot (do not execute now)
- Multi-brand color palette system for each SaaS
- Advanced AI cost optimization per provider/model
- Cross-product analytics layer
