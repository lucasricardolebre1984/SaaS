---
name: project-context-loader
description: Loads mandatory project context from .specs before any work. Use when starting a new session, switching tasks, or when context drift is suspected.
---

# Project Context Loader

## When to use
- Session start.
- Before changing phase.
- After long pauses.
- When outputs look inconsistent with current project decisions.

## Mandatory load order
1. `.specs/project/CONTEXT.md`
2. `.specs/project/PROJECT.md`
3. `.specs/project/ROADMAP.md`
4. `.specs/project/STATE.md`
5. Active feature docs:
- `spec.md`
- `design.md`
- `tasks.md`

## Process
1. Read files in order.
2. Confirm active phase and active feature from `STATE.md`.
3. Summarize current objective and constraints in 5 lines max.
4. If request is out of scope, apply anti-pollution protocol:
- `ESTACIONAR` for backlog
- `MUDANCA CRITICA` for scope change decision

## Guardrails
- Do not implement before approved tasks.
- Do not load unrelated feature specs together.
- Do not bypass legacy quarantine rules.
