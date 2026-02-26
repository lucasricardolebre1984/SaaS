# Spec - milestone-4-mod-01-avatar-fullscreen-slice

Status: Approved
Date: 2026-02-25

## Objective
Adopt the final avatar video asset and deliver a premium full-screen continuous mode with minimal UI noise.

## Scope
- Replace Module 01 avatar media with the approved `AvatarSaaS.mov` render converted for web.
- Continuous mode must occupy the full viewport.
- While continuous mode is active, show only a transparent `Voltar` action.
- Keep standard module layout unchanged outside continuous mode.

## Functional Requirements
1. Avatar video source must use project-local assets derived from `AvatarSaaS.mov`.
2. Continuous mode hides non-essential chrome (sidebar/topbar/chat/meta) and renders fullscreen avatar stage.
3. User must be able to exit continuous mode via explicit `Voltar` action.
4. Video source selection should fallback for browser compatibility (`webm` preferred, `mp4` fallback).

## Acceptance Criteria
- `/owner/` continuous mode visually shows full-screen avatar with only a visible `Voltar` control.
- Exiting continuous mode restores standard Module 01 layout.
- Avatar plays with movement in both idle/speaking states using the approved asset.
