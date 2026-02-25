# AGENTS.md

This repository follows strict spec-driven execution to prevent scope drift and legacy contamination.

## Daily Commands (Mandatory)
Run from `C:\projetos\fabio`.

1. New day / clean bootstrap:
   - `npm run init:day`
2. Fast resume (same machine/session):
   - `npm run resume:day`
3. End checkpoint:
   - `npm run end:day`

Raw PowerShell equivalents:
- `.\tools\start-day.ps1 -Agent codex -ForceSkills`
- `.\tools\start-day.ps1 -Agent codex -SkipInstall`
- `.\tools\end-day.ps1 -ShowPending`

## Mandatory Load Order (Every Session)
1. `.specs/project/CONTEXT.md`
2. `.specs/project/PROJECT.md`
3. `.specs/project/ROADMAP.md`
4. `.specs/project/STATE.md`
5. Active feature docs:
   - `.specs/features/<feature>/spec.md`
   - `.specs/features/<feature>/design.md`
   - `.specs/features/<feature>/tasks.md`

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

## Project Skills MVP (Project-Only Policy)
Only project skills should remain active for this SaaS workflow:
1. `project-context-loader`
2. `saas-standard-architect`
3. `contract-first-migrator` (only when legacy behavior is involved)
4. `metrics-discipline` (task/phase close checkpoints)

Source path:
- `skills/(project)/`

Install command:
- `npm run skills:install`

Trigger matrix and installation runbook:
- `.specs/features/agent-skills-cli-mvp/TRIGGERS.md`
- `.specs/features/agent-skills-cli-mvp/RUNBOOK.md`

## Legacy Quarantine Rule (Critical)
- Source system: `C:\projetos\fabio2`
- Legacy code is behavior reference only.
- Direct copy/paste of mixed route/persona/context orchestration is forbidden.
- Migration must be contract-first and module-first.

## Metrics Discipline
Always update:
- `.specs/project/worklog.csv`
- `.specs/project/costlog.csv`

See formulas and targets in `.specs/project/METRICS.md`.

## Current Priority
- Active feature: `milestone-3-branch-protection-slice` (blocked)
- Active phase: `Implement blocked (external dependency)`
- Immediate checkpoint: unblock GitHub plan/visibility and rerun `npm run github:protect-main`.
