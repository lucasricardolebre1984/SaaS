# Spec - dual-concierge-core-standard

Status: Draft
Date: 2026-02-22

## Context
Founder requires a reusable SaaS pattern where:
- Module 1 is the owner concierge/orchestrator.
- Module 2 is the WhatsApp CRM concierge.
- Both are neutral and reusable across companies by persona configuration.

## Problem
Current legacy implementation mixes orchestration, persona, and transport responsibilities, making scaling and reuse difficult.

## Objective
Define institutional standards for Module 1 and Module 2 so every new SaaS reuses the same architecture and only changes persona/palette/business config.

## Functional Requirements
1. Module 1 must orchestrate tasks for all business modules.
2. Module 2 must execute WhatsApp CRM workflows and return status events.
3. Orchestration between modules must happen through typed contracts/events.
4. Persona customization must be tenant-scoped and externalized from core code.
5. RAG/context must support controlled continuous learning with audit trail.

## Non-functional Requirements
- Multi-tenant safe boundaries.
- Full traceability of AI decisions/tool calls.
- Cost observability by module/persona/provider.
- Fallback behavior for provider degradation.

## Out of Scope
- Full implementation in this phase.
- Production deployment.
- Direct porting of legacy mixed orchestration code.

## Acceptance Criteria
- Architecture and contracts documented.
- Task plan created with verifiable checkpoints.
- Anti-Frankenstein rewrite policy linked and enforced.
