# PROJECT

Project: fabio (Automania AI institutional SaaS base)
Owner: Lucas Ricardo Lebre
Created: 2026-02-22
Status: Execution (post-Milestone 3 transition)

## Vision
Build a reusable SaaS base that can be cloned for future products, with strict process discipline, module boundaries, and measurable engineering/financial performance from day 1.

## Why this exists
- Current system (fabio2) has strong business value but mixed structure.
- New repository (fabio) is a clean foundation for scale.
- Goal is repeatable architecture for multiple SaaS products.

## Primary Goals
1. Establish monorepo architecture with clear module boundaries.
2. Define institutional workflow: Specify -> Design -> Tasks -> Implement+Validate.
3. Instrument technical, operational, and financial metrics.
4. Keep production untouched until migration quality gates pass.

## Non-goals (for now)
- No production deployment from this repo yet.
- No risky direct migration without specification and task gating.
- No ad-hoc feature work outside the active phase.

## Scope for Current Cycle
- Brownfield mapping of fabio2.
- Milestone 2 UI and template hardening.
- Owner console settings/multimodal baseline.
- Persona 1/2 optional prompt wiring in settings and interaction contracts.
- SaaS starter generator and operational runbooks.
- Milestone 3 planning and production-readiness closure completed.
- Milestone 4 scope definition kickoff (next slice in Specify phase).

## Success Criteria (Current Cycle)
- .specs complete and reviewed.
- Active milestone feature has approved spec/design/tasks and implementation evidence.
- Workspace standards and daily commands documented in `AGENTS.md`.
- Metrics and checkpoints updated (`STATE`, `worklog`, `costlog`).

## Working Principles
- One phase at a time.
- No scope injection during execution.
- Every decision documented in STATE.md.
- Every feature must have spec/design/tasks before coding.
- Prefer reversible changes and explicit rollback paths.

## Legacy Handling Rule
Legacy implementation can be used only as behavior reference. New code in fabio must prioritize clean module boundaries, explicit contracts, and testable orchestration.
