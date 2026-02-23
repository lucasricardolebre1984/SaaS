# orchestration-contracts

Contract-first package for cross-module commands/events in the SaaS Standard v1.

## Scope

- Freeze canonical command/event envelopes for modules 01..05.
- Keep core neutral (no tenant persona hardcoding).
- Provide machine-readable JSON Schemas and language stubs.

## Files

- `schemas/base.schema.json`: shared envelope and enums.
- `schemas/commands.schema.json`: canonical commands.
- `schemas/events.schema.json`: canonical events.
- `ts/contracts.ts`: TypeScript contract stubs.
- `python/contracts.py`: Python contract stubs.

## Canonical Commands

- `owner.command.create`
- `module.task.create`
- `crm.whatsapp.send`
- `agenda.reminder.schedule`
- `billing.collection.request`
- `customer.record.upsert`

## Canonical Events

- `owner.command.created`
- `module.task.created`
- `module.task.accepted`
- `module.task.completed`
- `module.task.failed`
- `crm.lead.created`
- `crm.lead.converted`
- `agenda.reminder.scheduled`
- `billing.charge.created`
- `billing.collection.requested`
- `billing.collection.sent`
- `billing.collection.failed`

## Versioning Rules

- Backward-compatible fields: minor version change.
- Breaking changes in required fields/semantics: major version change.
- Every event/command must include `tenant_id` and correlation fields.
