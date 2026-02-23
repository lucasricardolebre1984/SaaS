# Spec - saas-standard-v1

Status: Draft
Date: 2026-02-22

## Objective
Define and freeze the default SaaS product model for Automania AI as a reusable blueprint.

## Product Scope (closed)
Menu and modules are fixed:
1. Chat com IA (Module 01)
2. CRM WhatsApp (Module 02)
3. Clientes (Module 03)
4. Agenda (Module 04)
5. Faturamento/Cobranca (Module 05)

## Functional Requirements
1. Module 01 orchestrates all other modules.
2. Module 01 supports text, audio, image, and file interactions.
3. Module 01 supports continuous chat mode with avatar.
4. Module 02 integrates WhatsApp via Evolution API container.
5. Module 02 handles lead funnel, campaign, reminders, and collection messaging.
6. Module 03 stores unified customer records from manual and AI/CRM sources.
7. Module 04 supports scheduling and reminder lifecycle.
8. Module 05 supports billing and cobranca workflows and sends collection requests via Module 02.
9. All module interactions must be event-contract based.
10. Tenant personas are pluggable and optional.

## AI Behavior Requirements
- Default neutral behavior.
- Configurable default LLM model, with intended baseline `gpt-5.1-mini`.
- RAG with semantic retrieval and auditable memory promotion.
- No hidden silent learning writes to active prompt context.

## Non-Functional Requirements
- Multi-tenant safe boundaries.
- Full event traceability.
- Financial cost tracking by module and provider.
- Retry/fallback behavior for provider outages.

## Out of Scope
- Production deployment now.
- Legacy runtime code transplant.

## Acceptance Criteria
- Spec/design/tasks approved for this feature.
- Contracts and module skeletons generated.
- Governance docs updated and consistent.
