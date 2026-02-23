# Design - dual-concierge-core-standard

Status: Draft
Date: 2026-02-22

## Logical Architecture

- app.owner-console (UI for owner)
- service.mod01-owner-concierge (orchestrator)
- service.mod02-whatsapp-crm (lead + campaign + follow-up)
- shared.context-rag
- shared.persona-registry
- shared.event-contracts
- shared.audit-metrics

## Module 01 - Owner Concierge
Responsibilities:
- Understand owner intent.
- Plan multi-step actions.
- Call internal tools and dispatch CRM tasks to module 2.
- Track objective completion and exceptions.

Core interfaces:
- `POST /owner/commands`
- `GET /owner/commands/{id}`
- event emit: `owner.command.created`

## Module 02 - WhatsApp CRM Concierge
Responsibilities:
- Manage inbound/outbound WhatsApp CRM lifecycle.
- Qualify leads and persist CRM state.
- Execute reminders/cobranças/campaign sends.
- Return outcomes and handoff requests.

Core interfaces:
- `POST /crm/tasks`
- `GET /crm/tasks/{id}`
- `POST /crm/conversations/{id}/handoff`

Events:
- `crm.task.created`
- `crm.task.sent`
- `crm.task.failed`
- `crm.lead.updated`
- `crm.handoff.required`

## Context and RAG Layers
1. Platform policy context (global)
2. Tenant persona context (company-specific)
3. Domain knowledge context (contracts, crm playbooks, procedures)
4. Session/runtime context (ephemeral)

All four layers are versioned and auditable.

## Continuous Learning (Controlled)
- Feedback is stored as candidate knowledge.
- Promotion to active context requires review policy (human or rule-based approval).
- No silent auto-prompt mutation in production.

## OpenAI-aligned Implementation Guidance
- Prefer Responses API for new flows.
- Use explicit tool schemas and strict tool calling for orchestration.
- Keep conversation state in dedicated conversation objects.
- Evaluate regularly with automated + trace-based grading.

## References (best-practice anchors)
- OpenAI Responses migration guide: https://platform.openai.com/docs/guides/responses-vs-chat-completions
- OpenAI Function calling lifecycle: https://platform.openai.com/docs/guides/function-calling/lifecycle
- OpenAI File Search: https://platform.openai.com/docs/guides/tools-file-search/
- OpenAI Evaluation best practices: https://platform.openai.com/docs/guides/evaluation-best-practices
- OpenAI Agents SDK handoff: https://openai.github.io/openai-agents-js/openai/agents/functions/handoff/
- AWS Well-Architected Cost: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html
- AWS Cloud Financial Management: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/practice-cloud-financial-management.html
