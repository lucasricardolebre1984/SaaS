# Spec - milestone-4-mod-01-openai-strict-provider-slice

Status: Approved
Date: 2026-02-25

## Objective
Remove silent fallback ambiguity in Module 01 when tenant OpenAI is configured, and expose the actual assistant provider used in each interaction.

## Scope
- Owner runtime:
  - if tenant runtime config has `openai.api_key`, response mode must be strict `openai` (no auto local fallback).
  - provider errors must be explicit (`owner_response_provider_error`) when OpenAI fails.
- Owner Console:
  - show a persistent provider status pill in topbar (`provider: openai|local|none|error`).
  - update status from actual `assistant_output.provider` after each interaction.
  - include provider/model/fallback reason in chat trace for operational debugging.

## Functional Requirements
1. Tenant runtime with API key must force strict OpenAI path.
2. Runtime must not silently degrade to local when key exists and provider call fails.
3. UI must show last provider used and allow quick diagnosis.
4. Existing behavior with no tenant key remains local fallback.

## Non-Functional Requirements
- No contract break in owner interaction response schema.
- Preserve existing tests and add coverage for strict tenant behavior.

## Acceptance Criteria
- Interaction with tenant key + failing provider returns `502 owner_response_provider_error`.
- Interaction with tenant key + valid provider returns `assistant_output.provider=openai`.
- Owner UI topbar reflects provider state and errors deterministically.
