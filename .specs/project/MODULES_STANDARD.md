# MODULES STANDARD

Date: 2026-02-22
Status: Institutional baseline (closed model)

## SaaS Standard Menu (fixed order)
1. Chat com IA (Owner Concierge)
2. CRM WhatsApp
3. Clientes
4. Agenda
5. Faturamento/Cobranca

## Core Product Pattern for every SaaS

### Module 01 - Owner Concierge (neutral orchestrator)
Purpose:
- Internal executive concierge for owner/operator.
- Main orchestration brain for the entire SaaS.
- Receives owner commands and dispatches work to other modules.

Mandatory capabilities:
- Chat UX with text, audio, image, and file attachments.
- Continuous chat mode with on-screen avatar.
- Multi-modal model usage (text, audio transcription, TTS, vision, image generation when enabled).
- Tool orchestration across modules 2, 3, 4, and 5.
- RAG + semantic memory + context layering + auditable learning.

Default behavior:
- Neutral assistant without tenant persona by default.
- Model default: `gpt-5.1-mini` (if available in provider account), with configurable fallback.

Avatar standard:
- Avatar assets path per tenant: `tenants/<tenant_id>/avatars/owner/`
- Voice/avatar profile config path: `tenants/<tenant_id>/personas/owner.yaml`

### Module 02 - WhatsApp CRM Concierge (neutral)
Purpose:
- Customer-facing WhatsApp concierge for lead capture and CRM automation.
- Executes outbound/inbound workflows requested by Module 01.

Mandatory capabilities:
- Evolution API integration in dedicated container.
- Lead capture, qualification, and lifecycle progression.
- Follow-up automation, reminders, cobranca workflows, campaign sends.
- Human handoff routing with reason codes.
- Delivery/read/failure tracking and retry policy.

Persona strategy:
- Neutral by default.
- Tenant custom persona in `tenants/<tenant_id>/personas/whatsapp.yaml`.

### Module 03 - Clientes (system of record)
Purpose:
- Unified customer register from all origins.

Input sources:
- Manual registration.
- Registration by Module 01.
- Registration/conversion from lead in Module 02.

Mandatory capabilities:
- Golden customer record.
- Deduplication and merge policy.
- Link to conversation history, contracts, agenda items, and billing state.

### Module 04 - Agenda
Purpose:
- Scheduling and reminders for owner and customer workflows.

Mandatory capabilities:
- Commitments, follow-ups, reminders, recurrence rules.
- Commands from Module 01 and execution reminders through Module 02.
- Clear status transitions (scheduled, done, missed, canceled).

### Module 05 - Faturamento/Cobranca
Purpose:
- Billing operations and collection orchestration.

Mandatory capabilities:
- Invoice/charge lifecycle.
- Collection automation over WhatsApp through Module 02.
- Payment status synchronization back to owner context in Module 01.

## Cross-Module Contract (mandatory)
- Module 1 creates intents/tasks.
- Target module executes and emits status events.
- Event bus is contract-first and typed.

Core events:
- owner.command.created
- module.task.created
- module.task.accepted
- module.task.completed
- module.task.failed
- crm.lead.created
- crm.lead.converted
- agenda.reminder.scheduled
- billing.charge.created
- billing.collection.requested
- billing.collection.sent
- billing.collection.failed

## Persona Strategy (multi-SaaS)
- Core modules remain neutral and reusable.
- Tenant persona packs customize behavior without changing core contracts.

Tenant config baseline:
- `tenants/<tenant_id>/personas/owner.yaml`
- `tenants/<tenant_id>/personas/whatsapp.yaml`
- `tenants/<tenant_id>/policies/*.yaml`
- `tenants/<tenant_id>/branding/*.yaml`

## Anti-Frankenstein Rules
- No direct copy of legacy mixed orchestration code.
- No hardcoded company persona in core modules.
- No hidden coupling between routing, memory, and transport layers.
- Every module integration must be schema-driven and testable.

## Quality Rule
Any new SaaS must reuse module 1-5 contracts unchanged, customizing only tenant persona/configuration unless a formal spec approves contract changes.
