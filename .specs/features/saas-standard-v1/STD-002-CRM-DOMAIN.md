# STD-002 - CRM Domain Model

Status: Completed  
Date: 2026-02-23

## Objective
Define a high-level complete CRM domain model for Module 02 (WhatsApp CRM), including:
- lead funnel states and transitions
- campaign workflow
- cobranca workflow
- transition test draft cases

## Bounded Ownership
- `mod-02-whatsapp-crm` owns:
  - lead lifecycle (capture, qualification, conversion trigger)
  - campaign orchestration and delivery results
  - cobranca message dispatch lifecycle on WhatsApp channel
- `mod-03-clientes` owns:
  - customer golden record after lead conversion
- `mod-05-faturamento-cobranca` owns:
  - charge status, payment state, collection strategy policy

## Lead Funnel State Table
| State | Meaning | Exit Policy |
|---|---|---|
| `new` | lead captured but not worked | must leave within SLA |
| `contacted` | first interaction attempted/succeeded | qualify, nurture, or close |
| `qualified` | intent + profile fit confirmed | move to proposal |
| `proposal` | commercial proposal sent | negotiate, win, or lose |
| `negotiation` | objections/terms being handled | win, lose, or nurture |
| `won` | converted customer | terminal (lead side) |
| `lost` | opportunity closed lost | can reopen only via explicit reopen path |
| `nurturing` | long-tail follow-up cadence | can return to contacted |
| `disqualified` | out of profile/compliance | terminal by default |

## Lead Funnel Transitions
- `new` -> `contacted`, `lost`, `disqualified`
- `contacted` -> `qualified`, `nurturing`, `lost`, `disqualified`
- `qualified` -> `proposal`, `lost`, `disqualified`
- `proposal` -> `negotiation`, `won`, `lost`
- `negotiation` -> `won`, `lost`, `nurturing`
- `nurturing` -> `contacted`, `lost`, `disqualified`
- `lost` -> `nurturing` (reopen only with reason code)
- `disqualified` -> `nurturing` (manual override with compliance reason)
- `won` -> no transitions

## Campaign Workflow
States:
- `draft` -> `scheduled` -> `running` -> `completed`
- `scheduled` -> `canceled`
- `running` -> `paused` -> `running`
- `running` -> `failed`
- `paused` -> `canceled`

Mandatory controls:
- idempotent send key per contact and campaign batch
- send window and rate policy by tenant
- delivery/read/failure result capture

## Cobranca Workflow (Module 02 side)
States:
- `requested` -> `queued` -> `sent` -> `delivered` -> `read`
- `read` -> `promise_to_pay` -> `paid` (confirmation from module 5)
- `read` -> `overdue_followup`
- `sent` -> `failed` (retry policy)
- `failed` -> `queued` (retry allowed)

Rules:
- `billing.collection.requested` event is the mandatory entry point from module 05.
- Module 02 emits:
  - `billing.collection.sent`
  - `billing.collection.failed`
- Payment final truth remains in module 05; module 02 mirrors communication status only.

## Event Mapping (STD-001 alignment)
- lead creation: `crm.lead.created`
- lead conversion: `crm.lead.converted`
- collection request: `billing.collection.requested`
- collection send result: `billing.collection.sent` / `billing.collection.failed`

## Test Draft Scope
Transition test draft is stored in:
- `libs/mod-02-whatsapp-crm/tests/transition-cases.draft.json`

Contract compatibility artifacts:
- `libs/mod-02-whatsapp-crm/domain/lead-funnel.transitions.json`
- `libs/mod-02-whatsapp-crm/domain/workflows.json`
