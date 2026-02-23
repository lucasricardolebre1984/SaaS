# Tasks - saas-standard-v1

Status: Completed
Date: 2026-02-22

## STD-001 - Freeze module contracts (1..5)
- Status: completed
- Output:
  - command/event schema package
- Verification:
  - JSON schema and TypeScript/Python contract stubs available
- Evidence:
  - libs/core/orchestration-contracts/schemas/base.schema.json
  - libs/core/orchestration-contracts/schemas/commands.schema.json
  - libs/core/orchestration-contracts/schemas/events.schema.json
  - libs/core/orchestration-contracts/ts/contracts.ts
  - libs/core/orchestration-contracts/python/contracts.py

## STD-002 - Define CRM domain model (high-level complete)
- Status: completed
- Output:
  - lead funnel states and transitions
  - campaign and cobranca workflows
- Verification:
  - state table and transition tests drafted
- Evidence:
  - .specs/features/saas-standard-v1/STD-002-CRM-DOMAIN.md
  - libs/mod-02-whatsapp-crm/domain/lead-funnel.transitions.json
  - libs/mod-02-whatsapp-crm/domain/workflows.json
  - libs/mod-02-whatsapp-crm/tests/transition-cases.draft.json

## STD-003 - Define data model baseline
- Status: completed
- Output:
  - initial table map for conversations, leads, customers, agenda, billing, memory, personas, metrics
- Verification:
  - ER draft documented with ownership per module
- Evidence:
  - .specs/features/saas-standard-v1/STD-003-DATA-MODEL.md
  - libs/core/data-model/table-map.json
  - libs/core/data-model/er-baseline.mmd

## STD-004 - Define module 01 multimodal UX contract
- Status: completed
- Output:
  - API contracts for text/audio/image/file
  - continuous chat + avatar state model
- Verification:
  - request/response examples documented
- Evidence:
  - .specs/features/saas-standard-v1/STD-004-MOD01-MULTIMODAL-UX.md
  - libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json
  - libs/mod-01-owner-concierge/contracts/continuous-chat-avatar.state-machine.json
  - libs/mod-01-owner-concierge/contracts/request-response-examples.md

## STD-005 - Evolution integration baseline for module 02
- Status: completed
- Output:
  - container contract
  - webhook and outbound queue contract
- Verification:
  - integration checklist drafted
- Evidence:
  - .specs/features/saas-standard-v1/STD-005-EVOLUTION-INTEGRATION.md
  - libs/mod-02-whatsapp-crm/integration/evolution-container.contract.yaml
  - libs/mod-02-whatsapp-crm/integration/evolution-webhook.schema.json
  - libs/mod-02-whatsapp-crm/integration/outbound-queue.schema.json
  - libs/mod-02-whatsapp-crm/integration/integration-checklist.md

## STD-006 - Tenant persona packaging baseline
- Status: completed
- Output:
  - owner persona template
  - whatsapp persona template
  - tenant policy template
- Verification:
  - sample tenant pack validates against schema
- Evidence:
  - .specs/features/saas-standard-v1/STD-006-TENANT-PERSONA-PACKAGING.md
  - libs/core/persona-registry/schemas/owner-persona.schema.json
  - libs/core/persona-registry/schemas/whatsapp-persona.schema.json
  - libs/core/persona-registry/schemas/tenant-policy.schema.json
  - libs/core/persona-registry/templates/owner.template.yaml
  - libs/core/persona-registry/templates/whatsapp.template.yaml
  - libs/core/persona-registry/templates/tenant-policy.template.yaml
  - tenants/sample-tenant-001/personas/owner.yaml
  - tenants/sample-tenant-001/personas/whatsapp.yaml
  - tenants/sample-tenant-001/policies/default.yaml
  - tools/validate-sample-tenant-pack.ps1

## STD-007 - Observability and financial metrics wiring plan
- Status: completed
- Output:
  - per-module KPI map
  - AI/provider cost map
- Verification:
  - all metrics linked to METRICS.md formulas
- Evidence:
  - .specs/features/saas-standard-v1/STD-007-OBSERVABILITY-FINOPS.md
  - libs/core/audit-metrics/kpi-map.json
  - libs/core/audit-metrics/ai-provider-cost-map.json
