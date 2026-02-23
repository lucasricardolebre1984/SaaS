# Design - mod-03-clientes-slice

Status: Draft
Date: 2026-02-23

## Runtime Surface
- App: `app-platform-api`
- New customer endpoints:
  - `POST /v1/customers`
  - `GET /v1/customers`
  - `GET /v1/customers/:id`
- Internal orchestration compatibility:
  - command envelope emission for customer create
  - event envelope emission for customer lifecycle

## Contracts
- New module contract folder:
  - `libs/mod-03-clientes/contracts/customer-create.schema.json`
  - `libs/mod-03-clientes/contracts/customer-list.schema.json`
  - `libs/mod-03-clientes/contracts/customer-events.schema.json`
- Orchestration core compatibility:
  - existing `commands.schema.json` / `events.schema.json` remain source of truth for envelope shape
  - module-specific payload validated prior to envelope emission

## Data Model Baseline
- Canonical fields:
  - `customer_id` (uuid)
  - `tenant_id`
  - `display_name`
  - `primary_phone`
  - `primary_email`
  - `origin` (`manual_owner` | `lead_conversion`)
  - `status` (`active` | `inactive`)
  - `created_at`
  - `updated_at`
- Idempotency key:
  - `external_key` unique per tenant for conversion/manual retries

## Persistence Adapters
- File adapter:
  - JSON store in `.runtime-data/customers/`
- Postgres adapter:
  - table `public.customers`
  - unique index `(tenant_id, external_key)` for idempotency
- Store abstraction follows the same backend factory strategy used by orchestration store.

## Integration With Module 02
- Conversion event/command input from Module 02 normalized to customer create payload.
- Minimal mapper implemented in API boundary layer.
- No direct import of legacy code from `fabio2`.

## Testing Strategy
- Contract tests:
  - schema validity and required fields
- Runtime tests:
  - create customer manual origin
  - create customer lead conversion origin
  - idempotent retry path
  - list/get endpoints with tenant filter
  - correlation id propagation in trace events
