# Design - agent-skills-cli-mvp

Status: Draft
Date: 2026-02-22

## MVP Skill Set
1. project-context-loader
- Loads: CONTEXT.md, PROJECT.md, ROADMAP.md, STATE.md, active feature docs.

2. saas-standard-architect
- Enforces module 1..5 standard and cross-module contracts.

3. contract-first-migrator
- Enforces clean-room migration from fabio2 behavior references.

4. metrics-discipline
- Updates worklog/costlog and validates KPI definitions.

## Sequencing
- Always run project-context-loader first.
- Then saas-standard-architect for design decisions.
- Use contract-first-migrator only when touching legacy behavior.
- Use metrics-discipline at task completion checkpoints.

## CLI Workflow
- Install local project skills into agent-specific paths.
- Start new sessions with explicit mention of active feature.
- Validate skill activation via trigger phrases.

## Storage
- Project skill docs can live under `skills/(project)/...` when implementation begins.
- During MVP, spec docs in `.specs/features/agent-skills-cli-mvp/` are the source of truth.
