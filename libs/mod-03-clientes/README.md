# mod-03-clientes

Module 03: customer registry (neutral core).

This module owns customer master records and normalization from multiple origins:
- manual owner registration
- CRM lead conversion
- upsert/update lifecycle for downstream modules

Reference artifacts:
- `contracts/customer-create.schema.json`
- `contracts/customer-list.schema.json`
- `contracts/customer-events.schema.json`
