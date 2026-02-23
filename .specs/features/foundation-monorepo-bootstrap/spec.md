# Spec - foundation-monorepo-bootstrap

Status: Draft
Date: 2026-02-22

## Problem
fabio2 has business value but not yet a reusable institutional base for multiple SaaS products.

## Objective
Create a clean monorepo foundation in fabio with strict process, modular boundaries, and metrics instrumentation before any production deployment.

## In Scope
- Initialize Nx workspace conventions.
- Define folder/module architecture for long-term reuse.
- Establish .specs governance and phase gates.
- Set baseline quality and metrics framework.

## Out of Scope
- Immediate production deployment.
- Full feature migration from fabio2 in this step.
- UI color palette customization implementation (tracked for later milestone).

## Functional Requirements
1. Repository must contain institutional .specs structure and governance docs.
2. Repository must have Nx operational baseline (workspace recognized, runnable targets).
3. There must be a documented migration strategy from fabio2 domains.
4. Metrics files must support engineering and financial tracking.

## Non-functional Requirements
- Reproducible setup on local windows.
- Clear rollback path for every migration batch.
- Low cognitive load for new agents joining later.
- No hidden runtime changes to fabio2 production path.

## Acceptance Criteria
- All foundation docs exist and are internally consistent.
- Nx commands can run in workspace baseline.
- First migration feature backlog is prioritized.
- Anti-pollution protocol documented and active.

## Clean-Room Migration Rules
1. Domain behavior may be imported, but legacy implementation cannot be copied blindly.
2. Route design must be normalized before migration (clear ownership, naming, versioning).
3. Persona/context logic must be decomposed into explicit modules and contracts.
4. Any legacy area tagged as "Frankenstein" must be rewritten with tests, not transplanted.
