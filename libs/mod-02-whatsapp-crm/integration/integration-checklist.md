# Evolution Integration Checklist (STD-005)

## A) Container and networking
- [ ] Evolution service reachable only from private app network.
- [ ] Health endpoint wired in readiness/liveness probes.
- [ ] API key loaded from secret manager (no plaintext in repo).
- [ ] Timeout and retry env vars configured.

## B) Security and validation
- [ ] Webhook signature validation implemented and tested.
- [ ] Replay protection enabled (event_id dedup window).
- [ ] Payload schema validation active (`evolution-webhook.schema.json`).
- [ ] PII masking in logs verified.

## C) Outbound queue behavior
- [ ] Queue item schema validation active (`outbound-queue.schema.json`).
- [ ] Idempotency key enforced per recipient/context.
- [ ] Retry policy and DLQ configured.
- [ ] Delivery state persisted (`queued/sent/delivered/read/failed`).

## D) Event-bus mapping
- [ ] Collection send success emits `billing.collection.sent`.
- [ ] Collection send failure emits `billing.collection.failed`.
- [ ] Lead-capable inbound messages can emit `crm.lead.created` after rules.
- [ ] Correlation fields (`tenant_id`, `trace_id`, `correlation_id`) preserved end-to-end.

## E) Observability and operations
- [ ] Dashboards include outbound success/failure rates.
- [ ] Alerts for provider outage and webhook failure bursts.
- [ ] Traceability from queue item -> provider message id -> domain event.
- [ ] Runbook includes rollback/disable-provider switch.

## F) Validation gate before runtime go-live
- [ ] Contract tests pass for webhook and outbound queue.
- [ ] Sandbox integration test with provider passes.
- [ ] Failure injection test (provider 5xx/timeout) passes.
- [ ] Business-critical flow test (cobranca send + ack) passes.
