# STATE

Last update: 2026-02-23
Active phase: Implement + Validate (runtime dual concierge slice)
Active feature: runtime-dual-concierge-slice

## Current Decisions
1. Use creation-with-controlled-migration strategy (not direct replacement of fabio2).
2. Keep fabio2 production flow stable while fabio matures.
3. Work in phased specs to avoid scope pollution.
4. Track both engineering and financial metrics from the start.

## Anti-pollution Protocol
- FOCO: continue current phase only.
- ESTACIONAR: store new idea in backlog, no immediate implementation.
- MUDANCA CRITICA: evaluate impact before changing active scope.
- TROCAR FASE: allowed only after phase checklist is complete.

## Open Risks
- Hidden coupling between backend services in fabio2.
- Inconsistent docs vs runtime behavior in legacy areas.
- Scope creep during architecture bootstrap.

## Mitigations
- Brownfield docs maintained as source of truth.
- Task gating with explicit acceptance criteria.
- Weekly architecture review before new migrations.

## Session Notes
- fabio repo initialized and linked to GitHub.
- fabio2 analyzed for stack, architecture, integrations, and tests.
- .specs baseline created in fabio.
- STD-001 completed: canonical module command/event contracts published in libs/core/orchestration-contracts (JSON Schema + TS/Python stubs).
- SKL-005 completed: daily bootstrap script added in tools/start-day.ps1 (optional skills install + context load + kickoff prompt).
- SKL-006 completed: end-of-day checkpoint script added in tools/end-day.ps1 (work/cost logging + pending tasks + next-day command).
- STD-002 completed: CRM lead funnel/campaign/cobranca domain model and transition test draft published for module 02.
- STD-003 completed: baseline relational model with table ownership map and ER draft published in libs/core/data-model.
- STD-004 completed: module 01 multimodal interaction API contract and continuous chat/avatar state model published.
- STD-005 completed: evolution integration baseline published for module 02 (container, webhook, outbound queue, checklist).
- STD-006 completed: tenant persona packaging baseline published with schemas, YAML templates, and sample tenant pack validation script.
- STD-007 completed: observability and finops maps published with explicit formula linkage to METRICS.md.
- Nx workspace runtime skeleton bootstrapped with project graph and target wiring.
- Contract checks automated via Nx target `contract-tests:contract-checks`.
- Executable contract tests available via Nx target `contract-tests:test`.
- Foundation tasks FND-002..FND-006 finalized with explicit evidence.
- Runtime dual concierge slice implemented in app-platform-api with contract-validated endpoints.
- Runtime tests added and passing via `nx run app-platform-api:test`.
- Runtime orchestration stub now emits validated command/event envelopes with in-memory trace endpoints and preserved correlation id.
- Runtime now persists orchestration envelopes in durable NDJSON storage and applies policy-driven downstream task routing.
- Runtime now has queue/worker boundary for module-task lifecycle with durable queue rehydration.

## Next Checkpoint
Replace NDJSON local durability with relational persistence (Postgres schema) while preserving queue/worker contract behavior.

## Legacy Quarantine Policy (critical)
- Legacy code in fabio2 is reference for business behavior, not implementation source.
- Direct copy/paste of route, persona, or context orchestration code is forbidden by default.
- Every migrated domain must define contract-first interfaces before implementation.
- Persona and context flow will be redesigned as explicit modules with boundaries and tests.
- If behavior is unclear, preserve business intent and rewrite implementation cleanly.
- contratos directory copied from fabio2 as approved legacy asset import.

## Scope Decisions (new)
- Closed SaaS model approved with modules 1 to 5.
- Module 01 is owner orchestrator with continuous chat + avatar support.
- Module 02 is WhatsApp CRM concierge integrated with Evolution container.
- Module 03, 04, and 05 are mandatory as reusable neutral core modules.
- Persona remains optional/configurable and tenant-specific.

- agent-skills-cli-mvp MVP completed (skills + trigger matrix + runbook + installer test).
