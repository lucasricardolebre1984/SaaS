# Spec - mod-02-campaign-followup-slice

Status: Implemented
Date: 2026-02-23

## Objective
Implement the advanced CRM slice for Module 02 with campaign lifecycle and follow-up automation execution.

## Scope
- Campaign aggregate (`crm_campaign`) create/list/state transition.
- Follow-up aggregate (`crm_followup`) create/list and worker dispatch execution.
- Outbound validation integration using existing module 02 outbound queue contract.

## Functional Requirements
1. Runtime must accept campaign create/state update payloads validated by JSON schema.
2. Runtime must accept follow-up create payload validated by JSON schema.
3. Runtime must persist campaigns and follow-ups in pluggable backend:
   - `file` local baseline
   - `postgres` relational baseline
4. Runtime must expose:
   - `POST /v1/crm/campaigns`
   - `PATCH /v1/crm/campaigns/:id/state`
   - `GET /v1/crm/campaigns`
   - `POST /v1/crm/followups`
   - `GET /v1/crm/followups`
   - `POST /internal/worker/crm-followups/drain`
5. Campaign state transitions must follow module workflow transition matrix.
6. Follow-up worker must validate outbound payload and mark sent/failed deterministically.

## Non-Functional Requirements
- Deterministic validation and transition errors (`400` + details).
- Contract checks and runtime tests executable in Nx.
- Backward compatibility with existing module 01/03/04/05 slices and postgres smoke flow.

## Out Of Scope
- Full campaign audience segmentation engine.
- Real provider retry scheduler and exponential retry orchestration.
- Inbound NLP intent classification.

## Acceptance Criteria
- Campaign/follow-up contracts published and validated.
- Runtime endpoints and worker implemented with tests for success and failure paths.
- `contract-checks`, `app-platform-api:test`, and `smoke:postgres` remain green.
