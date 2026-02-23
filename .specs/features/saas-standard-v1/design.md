# Design - saas-standard-v1

Status: Draft
Date: 2026-02-22

## Reference Architecture

UI Layer:
- app.owner-console (module 1 UI and command center)
- app.crm-console (module 2 operational UI)

Core Service Layer:
- mod-01-owner-concierge
- mod-02-whatsapp-crm
- mod-03-clientes
- mod-04-agenda
- mod-05-faturamento-cobranca

Shared Core:
- context-rag
- persona-registry
- orchestration-contracts
- event-bus
- audit-metrics

Infra:
- postgres
- redis
- evolution-api container
- provider adapters (openai and future)

## UX Baseline
Module 01 chat must include:
- text input
- audio record/upload
- image upload
- file upload
- continuous chat toggle
- avatar panel (render + config by tenant)

## Contract Model
- Commands from module 1 create tasks for downstream modules.
- Every task emits lifecycle events.
- Module 1 consumes events and updates owner context.

## CRM Completeness Standard
Module 02 must support:
- inbound lead capture
- qualification funnel stages
- conversion to customer (module 3)
- reminders and follow-up cadences
- campaign send and result tracking
- cobranca trigger and send tracking

## Data Domains
- conversations
- leads
- customers
- tasks
- events
- reminders
- charges
- payments
- memory documents/chunks/embeddings
- personas/policies
- audit and cost logs

## AI and RAG Governance
- Model config per tenant and per module.
- Retrieval pipeline with sources and confidence scoring.
- Learning pipeline: candidate -> review -> promotion -> active context.
- Full audit trail for memory changes and AI decisions.

## Safety and Quality
- Contract tests for each module interface.
- Integration tests for module 1 <-> module 2/3/4/5 flows.
- Anti-frankenstein static checks for forbidden cross-layer imports.
