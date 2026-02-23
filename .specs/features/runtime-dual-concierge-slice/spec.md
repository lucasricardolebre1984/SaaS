# Spec - runtime-dual-concierge-slice

Status: In Progress
Date: 2026-02-23

## Objective
Implement the first executable runtime slice for dual concierge flow:
- Module 01 interaction entrypoint
- Module 02 Evolution webhook entrypoint
- outbound queue payload validation endpoint

## Scope
- `app-platform-api` receives and validates requests using existing contracts.
- No database persistence yet.
- No external provider calls yet.

## Functional Requirements
1. `POST /v1/owner-concierge/interaction` validates mod-01 multimodal request contract.
2. `POST /provider/evolution/webhook` validates Evolution webhook contract.
3. `POST /provider/evolution/outbound/validate` validates outbound queue contract.
4. `GET /health` returns runtime health.
5. Contract-driven tests must run in Nx.

## Non-Functional Requirements
- JSON schema validation via Ajv.
- Deterministic HTTP error responses for invalid payloads.
- Tests executable in local Windows environment.

## Acceptance Criteria
- Endpoints respond as expected for valid and invalid requests.
- `nx run app-platform-api:test` passes.
- `nx run contract-tests:contract-checks` remains passing.
