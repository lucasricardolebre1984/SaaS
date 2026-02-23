# Design - mod-05-faturamento-cobranca-slice

Status: Draft
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- New endpoints:
  - `POST /v1/billing/charges`
  - `PATCH /v1/billing/charges/:id`
  - `POST /v1/billing/charges/:id/collection-request`
  - `POST /v1/billing/payments`
  - `GET /v1/billing/charges?tenant_id=...`

## Contracts
- Module 05 contract package:
  - `libs/mod-05-faturamento-cobranca/contracts/charge-create.schema.json`
  - `libs/mod-05-faturamento-cobranca/contracts/charge-update.schema.json`
  - `libs/mod-05-faturamento-cobranca/contracts/payment-create.schema.json`
  - `libs/mod-05-faturamento-cobranca/contracts/charge-list.schema.json`
  - `libs/mod-05-faturamento-cobranca/contracts/billing-events.schema.json`
- Core orchestration extension:
  - command for explicit collection request
  - billing lifecycle event payload refinement where needed

## Data Model Baseline
- `charge`:
  - `charge_id`, `tenant_id`, `customer_id`, `amount`, `currency`, `due_date`, `status`, `external_key`, `metadata`, `created_at`, `updated_at`
- `payment`:
  - `payment_id`, `charge_id`, `tenant_id`, `amount`, `currency`, `paid_at`, `status`, `external_key`, `metadata`, `created_at`, `updated_at`
- charge status lifecycle:
  - `draft` -> `open` -> `collection_requested` -> `paid` | `canceled` | `failed`

## Persistence Adapters
- File adapter:
  - `.runtime-data/billing/charges.json`
  - `.runtime-data/billing/payments.json`
- Postgres adapter:
  - `public.billing_charges`
  - `public.billing_payments`
  - unique `(tenant_id, external_key)` for idempotency

## Orchestration Integration
- collection request emits command to `mod-02-whatsapp-crm`.
- billing lifecycle emits events (`billing.charge.created`, `billing.collection.requested`, optional `billing.payment.confirmed`).
- no external provider side effects in this slice.

## Testing Strategy
- Contract tests:
  - parse + required fields for module 05 schemas
- Runtime tests:
  - create/update/list charges
  - collection-request flow emits orchestration command/event
  - payment creation updates charge status
  - idempotency with external key
  - validation errors for amount/currency/status edge cases
