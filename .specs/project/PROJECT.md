# PROJECT

Project: fabio (Automania AI institutional SaaS base)
Owner: Lucas Ricardo Lebre
Created: 2026-02-22
Status: Planning and foundation

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

## Scope for Foundation Cycle
- Brownfield mapping of fabio2.
- Creation of .specs governance and first migration feature plan.
- Nx bootstrap and workspace standards.
- Initial module decomposition plan.

## Success Criteria (Foundation)
- .specs complete and reviewed.
- First migration feature has approved spec/design/tasks.
- Workspace standards documented and reproducible.
- Metrics dictionary is in place with owner and formulas.

## Working Principles
- One phase at a time.
- No scope injection during execution.
- Every decision documented in STATE.md.
- Every feature must have spec/design/tasks before coding.
- Prefer reversible changes and explicit rollback paths.

## Legacy Handling Rule
Legacy implementation can be used only as behavior reference. New code in fabio must prioritize clean module boundaries, explicit contracts, and testable orchestration.
