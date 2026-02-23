# STD-005 - Evolution Integration Baseline (Module 02)

Status: Completed  
Date: 2026-02-23

## Objective
Define the baseline integration contract for WhatsApp provider (Evolution API) in Module 02:
- container contract
- webhook inbound contract
- outbound queue contract
- integration checklist

## Scope
- Contract-first baseline only.
- No deployment/runtime activation in this phase.
- No provider-specific business logic hardcoded in core.

## Container Contract (high level)
- Dedicated service in private network (module 02 integration boundary).
- Expose internal HTTP endpoint for module 02 adapter.
- API key authentication required.
- Health endpoint required for readiness/liveness.
- Webhook callback endpoint from provider to module 02 required.

Machine-readable artifact:
- `libs/mod-02-whatsapp-crm/integration/evolution-container.contract.yaml`

## Webhook Inbound Contract
Inbound webhook payload normalized into internal shape:
- provider metadata (`provider`, `instance`, `event_type`)
- correlation fields (`tenant_id`, `trace_id`, `correlation_id`)
- envelope (`event_id`, `occurred_at`, `signature`, `payload`)

Machine-readable artifact:
- `libs/mod-02-whatsapp-crm/integration/evolution-webhook.schema.json`

## Outbound Queue Contract
Queue item for message dispatch includes:
- target (`lead_id`/`customer_id`, `phone_e164`)
- context (`campaign`, `followup`, `collection`, `manual`)
- message body (`text`, `audio`, `image`, `file`)
- retry policy and idempotency key

Machine-readable artifact:
- `libs/mod-02-whatsapp-crm/integration/outbound-queue.schema.json`

## Event Mapping (STD-001 alignment)
- Outbound send success -> `billing.collection.sent` (collection context) or module task completion events.
- Outbound send failure -> `billing.collection.failed` (collection context) or module task failure events.
- Inbound new lead-capable messages may produce `crm.lead.created` after qualification rules.

## Checklist
Operational integration checklist:
- `libs/mod-02-whatsapp-crm/integration/integration-checklist.md`
