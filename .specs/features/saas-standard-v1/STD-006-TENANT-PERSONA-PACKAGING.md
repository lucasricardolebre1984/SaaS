# STD-006 - Tenant Persona Packaging Baseline

Status: Completed  
Date: 2026-02-23

## Objective
Define baseline packaging for tenant-specific persona customization:
- owner persona template
- whatsapp persona template
- tenant policy template
- sample tenant pack validated against schemas

## Baseline Structure
- `tenants/<tenant_id>/personas/owner.yaml`
- `tenants/<tenant_id>/personas/whatsapp.yaml`
- `tenants/<tenant_id>/policies/default.yaml`

Schema and template sources:
- `libs/core/persona-registry/schemas/*.schema.json`
- `libs/core/persona-registry/templates/*.template.yaml`

## Validation Strategy
- Canonical validation uses JSON schemas.
- Sample tenant pack provides JSON equivalents to validate contracts.
- Validation command:
  - `.\tools\validate-sample-tenant-pack.ps1`

## Artifacts
- Schemas:
  - `libs/core/persona-registry/schemas/owner-persona.schema.json`
  - `libs/core/persona-registry/schemas/whatsapp-persona.schema.json`
  - `libs/core/persona-registry/schemas/tenant-policy.schema.json`
- Templates:
  - `libs/core/persona-registry/templates/owner.template.yaml`
  - `libs/core/persona-registry/templates/whatsapp.template.yaml`
  - `libs/core/persona-registry/templates/tenant-policy.template.yaml`
- Sample tenant pack:
  - `tenants/sample-tenant-001/personas/owner.yaml`
  - `tenants/sample-tenant-001/personas/whatsapp.yaml`
  - `tenants/sample-tenant-001/policies/default.yaml`
  - JSON validation copies under same folders.
