# STD-004 - Module 01 Multimodal UX Contract

Status: Completed  
Date: 2026-02-23

## Objective
Define the UX/API contract for Module 01 owner concierge:
- text/audio/image/file interactions
- continuous chat state handling
- avatar configuration and runtime state
- request/response examples

## Scope
- Contract only (no runtime implementation yet).
- Must remain aligned with `owner.command.create` from STD-001.

## API Surface (contract)
- `POST /v1/owner-concierge/interaction`
  - operation `send_message`: multimodal message input
  - operation `toggle_continuous_mode`: session mode state update
  - operation `avatar_config_upsert`: avatar config and behavior update
- Response always returns:
  - accepted command envelope summary
  - current session mode
  - avatar runtime status
  - downstream task hints (if emitted)

## Continuous Chat State Model
- Session states:
  - `idle`
  - `active_one_shot`
  - `active_continuous`
  - `awaiting_user`
  - `paused`
- Allowed transitions documented in:
  - `libs/mod-01-owner-concierge/contracts/continuous-chat-avatar.state-machine.json`

## Avatar State Model
- Avatar states:
  - `disabled`
  - `ready`
  - `speaking`
  - `listening`
  - `error`
- Config ownership:
  - tenant path: `tenants/<tenant_id>/avatars/owner/`
  - profile path: `tenants/<tenant_id>/personas/owner.yaml`

## Artifacts
- API schema:
  - `libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json`
- State machine:
  - `libs/mod-01-owner-concierge/contracts/continuous-chat-avatar.state-machine.json`
- Request/response examples:
  - `libs/mod-01-owner-concierge/contracts/request-response-examples.md`

## Contract Safety Rules
- No hidden writes to active prompt context.
- Attachment processing must produce explicit references (`attachment_ref`).
- Continuous mode changes must be auditable via command id/correlation id.
