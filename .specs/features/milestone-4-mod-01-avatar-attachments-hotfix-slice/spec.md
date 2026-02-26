# Spec - milestone-4-mod-01-avatar-attachments-hotfix-slice

Status: Approved
Date: 2026-02-25

## Objective
Fix two critical runtime regressions in Module 01:
1. Avatar panel rendering black in standard/continuous mode.
2. Image/file attachments not being read by the OpenAI provider.

## Scope
- Avatar playback hardening:
  - enforce robust source selection and fallback behavior
  - guarantee playback start after source assignment
- Attachment pipeline hardening:
  - send real inline attachment payload (base64/text excerpt), not placeholder-only URI
  - forward attachments to owner response provider in interaction runtime
  - include image/file context in OpenAI payload for analysis

## Functional Requirements
1. Owner avatar must render moving video in normal and continuous modes.
2. Image attachments with inline data must be forwarded to OpenAI multimodal input.
3. Text files must be forwarded with bounded excerpt for direct reading.
4. Existing interaction contracts must remain valid under contract checks.

## Acceptance Criteria
- Avatar no longer appears black under local unified runtime.
- Owner can ask AI to read attached image/text file and receive contextual response.
- API and contract gates remain green.
