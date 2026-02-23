# ROADMAP

Last update: 2026-02-23

## Milestone 0 - Institutional Foundation (completed)
Objective: Create governance, architecture baseline, and metrics operating system.

Features:
- foundation-monorepo-bootstrap
- saas-standard-v1
- agent-skills-cli-mvp
- dual-concierge-core-standard
- engineering-metrics-platform
- module-decomposition-plan

Exit criteria:
- Foundation specs approved
- Nx workspace baseline running locally
- Quality gates documented

Status update:
- Exit criteria achieved (contracts + runtime skeleton + contract-check gate).
- Ready to execute Milestone 1 implementation slices.

## Milestone 1 - Core Platform Migration (current)
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

## Milestone 2 - Shared SaaS Template
Objective: Make this repository reusable as SaaS starter kit.

Deliverables:
- design system and layout shell
- configurable brand/palette tokens
- generator/playbook for spinning up new SaaS

Exit criteria:
- New SaaS skeleton created in less than 1 day
- Shared modules reused with minimal overrides

## Milestone 3 - Production Readiness
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

## Parking Lot (do not execute now)
- Multi-brand color palette system for each SaaS
- Advanced AI cost optimization per provider/model
- Cross-product analytics layer



