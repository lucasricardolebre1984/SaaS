# STATE

Last update: 2026-02-23
Active phase: Implement (module 01 openai embedding success test slice)
Active feature: mod-01-openai-embedding-success-test-slice

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
- Runtime store now supports pluggable backend (`file` default, `postgres` adapter) with SQL baseline for relational persistence.
- Runtime Postgres checkpoint validated with real local DB via `npm run smoke:postgres` and persisted row assertions.
- Postgres smoke stack is explicitly isolated in Docker project `fabio-postgres-smoke` (no shared container/volume with `fabio2`).
- Backend switch operational runbook finalized with explicit rollback path (`file` backend toggle).
- Runtime CI workflow published with two-stage gate: contracts/runtime tests + Postgres smoke.
- Started feature `mod-03-clientes-slice` with draft spec/design/tasks for first domain migration beyond runtime foundation.
- Module 03 contracts published (`customer-create`, `customer-list`, `customer-events`) and integrated into contract checks.
- Module 03 runtime implemented with customer store abstraction (file + postgres) and endpoints `POST/GET /v1/customers`.
- Lead conversion mapper (`mod-02 -> mod-03`) implemented with origin/source validation guards.
- Orchestration events expanded with `customer.created` and `customer.updated`, preserving correlation trace flow.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-01-rag-retrieval-slice` with contract-first context retrieval over promoted owner memory.
- Module 01 retrieval contracts published (`context-retrieval-request`, `context-retrieval-response`) and integrated into contract checks.
- Runtime retrieval endpoint implemented:
  - `POST /v1/owner-concierge/context/retrieve`
- Retrieval strategy baseline added as vector-ready lexical scorer:
  - strategy `lexical-salience-v1`
  - combines term overlap, tag overlap, and salience score
  - returns `embedding_ref` and ranking evidence (`matched_terms`, `matched_tags`, `score`)
- Postgres smoke flow expanded to cover retrieval checkpoint after memory promotion.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-01-owner-memory-slice` with contract-first owner memory/context runtime.
- Module 01 memory contracts published (`memory-entry-create`, `memory-entry-list`, `context-promotion`, `context-summary`) and integrated into contract checks.
- Module 01 runtime implemented with pluggable owner memory store (`file` + `postgres`) and endpoints:
  - `POST /v1/owner-concierge/memory/entries`
  - `GET /v1/owner-concierge/memory/entries`
  - `POST /v1/owner-concierge/context/promotions`
  - `GET /v1/owner-concierge/context/summary`
- Orchestration events expanded with `owner.context.promoted` for auditable context-learning flow.
- Postgres smoke flow expanded to cover owner memory create/promote and persisted row assertions in `owner_memory_entries` and `owner_context_promotions`.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-02-whatsapp-crm-slice` with contract-first lead runtime and collection worker dispatch.
- Module 02 lead contracts published (`lead-create`, `lead-stage-update`, `lead-list`) and integrated into contract checks.
- Module 02 runtime implemented with pluggable lead store (`file` + `postgres`) and endpoints:
  - `POST /v1/crm/leads`
  - `PATCH /v1/crm/leads/:id/stage`
  - `GET /v1/crm/leads`
  - `POST /internal/worker/crm-collections/drain`
- CRM collection worker now consumes `billing.collection.dispatch.request` commands and emits:
  - `billing.collection.sent`
  - `billing.collection.failed`
- Postgres smoke flow expanded to cover crm lead creation and crm collection worker dispatch.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened `mod-04-agenda-slice` with draft `spec/design/tasks` for contract-first agenda migration.
- Module 04 contracts published (`appointment`, `reminder`, `reminder-events`) and integrated into contract checks.
- Module 04 runtime implemented with pluggable agenda store (`file` + `postgres`) and endpoints:
  - `POST /v1/agenda/appointments`
  - `PATCH /v1/agenda/appointments/:id`
  - `POST /v1/agenda/reminders`
  - `GET /v1/agenda/reminders`
- Reminder orchestration flow now emits:
  - `agenda.reminder.scheduled`
  - `agenda.reminder.sent`
  - command `agenda.reminder.dispatch.request` for whatsapp dispatch intent.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened `mod-05-faturamento-cobranca-slice` with draft `spec/design/tasks` for contract-first billing migration.
- Module 05 contracts published (`charge-create`, `charge-update`, `charge-list`, `payment-create`, `billing-events`) and integrated into contract checks.
- Module 05 runtime implemented with pluggable billing store (`file` + `postgres`) and endpoints:
  - `POST /v1/billing/charges`
  - `PATCH /v1/billing/charges/:id`
  - `POST /v1/billing/charges/:id/collection-request`
  - `POST /v1/billing/payments`
  - `GET /v1/billing/charges`
- Billing orchestration flow now emits:
  - command `billing.collection.dispatch.request`
  - events `billing.charge.created`, `billing.collection.requested`, `billing.payment.confirmed`
- Postgres smoke flow expanded to cover billing create/collection/payment with persisted row assertions in `billing_charges` and `billing_payments`.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-02-campaign-followup-slice` with contract-first campaign lifecycle and follow-up automation runtime.
- Module 02 advanced contracts published (`campaign-create`, `campaign-state-update`, `campaign-list`, `followup-create`, `followup-list`) and integrated into contract checks.
- Module 02 advanced runtime implemented with pluggable CRM automation store (`file` + `postgres`) and endpoints:
  - `POST /v1/crm/campaigns`
  - `PATCH /v1/crm/campaigns/:id/state`
  - `GET /v1/crm/campaigns`
  - `POST /v1/crm/followups`
  - `GET /v1/crm/followups`
  - `POST /internal/worker/crm-followups/drain`
- Orchestration events expanded with:
  - `crm.campaign.created`
  - `crm.campaign.state.changed`
  - `crm.followup.scheduled`
  - `crm.followup.sent`
  - `crm.followup.failed`
- Postgres smoke flow expanded to cover crm campaign/follow-up creation, follow-up worker dispatch, and persisted row assertions in `crm_campaigns` and `crm_followups`.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-01-rag-vector-ready-slice` with deterministic hybrid lexical+vector retrieval strategy.
- Module 01 retrieval contracts updated to support vector-ready query hints and hybrid response scoring fields (`lexical_score`, `vector_score`).
- Retrieval strategy now supports:
  - `lexical-salience-v1` (compatibility path)
  - `hybrid-lexical-vector-v1` (requested by `vector-ready`/hybrid strategy flag)
- Runtime retrieval tests expanded with:
  - vector-ready hybrid retrieval path
  - malformed query embedding validation path
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-01-rag-provider-embeddings-slice` with provider-backed embedding resolution and local deterministic fallback.
- Added runtime embedding provider modes:
  - `auto` (OpenAI when available, fallback local)
  - `openai` (strict provider mode)
  - `local`
  - `off`
- Owner memory create flow now resolves embeddings before persistence and returns deterministic `embedding_error` on strict provider failures.
- Owner memory storage upgraded with internal vector persistence:
  - file adapter stores `embedding_vector` in entry records
  - postgres adapter stores `embedding_vector_json` in `owner_memory_entries`
- Retrieval pipeline now reuses shared semantic utility and consumes persisted vectors when present.
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Opened and implemented `mod-01-openai-embedding-success-test-slice` to validate strict OpenAI embedding success path with isolated local mock provider.
- Runtime tests now include:
  - strict openai mode failure without key (`embedding_error`)
  - strict openai mode success with local mock `/embeddings` server and auth check
- Runtime and contract gates validated:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`

## Next Checkpoint
Open next prioritized migration slice after module 01 openai success-path validation closure.

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
