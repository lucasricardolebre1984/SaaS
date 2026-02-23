# AGENTS.md

This repository follows a strict spec-driven workflow to avoid scope drift and legacy anti-pattern migration.

## Mandatory Load Order (every session)
1. .specs/project/CONTEXT.md
2. .specs/project/PROJECT.md
3. .specs/project/ROADMAP.md
4. .specs/project/STATE.md
5. Active feature docs:
   - .specs/features/<feature>/spec.md
   - .specs/features/<feature>/design.md
   - .specs/features/<feature>/tasks.md

## Workflow Gate
Phases are mandatory and sequential:
1. Specify
2. Design
3. Tasks
4. Implement + Validate

Do not implement before tasks are approved.

## Anti-Pollution Protocol
- `FOCO`: continue only active phase/task.
- `ESTACIONAR: <idea>`: move idea to roadmap/state parking lot.
- `MUDANCA CRITICA: <change>`: evaluate impact before changing scope.
- `TROCAR FASE`: allowed only after phase exit criteria is met.

## Project Skills MVP
Use project-specific skills from `skills/(project)/` with this activation order:
1. `project-context-loader`
2. `saas-standard-architect`
3. `contract-first-migrator` (only when legacy behavior is involved)
4. `metrics-discipline` (task/phase close checkpoints)

Trigger matrix and installation runbook:
- `.specs/features/agent-skills-cli-mvp/TRIGGERS.md`
- `.specs/features/agent-skills-cli-mvp/RUNBOOK.md`

## Legacy Quarantine Rule (critical)
- Source system: C:\projetos\fabio2
- Legacy code is behavior reference only.
- Direct copy/paste of mixed route/persona/context orchestration is forbidden.
- Migration must be contract-first and module-first.

## Metrics Discipline
Always update:
- .specs/project/worklog.csv
- .specs/project/costlog.csv

See formulas and targets in .specs/project/METRICS.md.

## Current Priority
Execute feature: runtime-dual-concierge-slice.
Secondary stream: deepen app-platform-api orchestration flow (task dispatch/event simulation).
No deployment actions until runtime slice tests and contract gates remain stable.

