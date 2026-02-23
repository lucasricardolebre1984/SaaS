# Runbook - agent-skills-cli-mvp

Date: 2026-02-22

## Goal
Install and operate project skills consistently across local agent environments.

## Source skills location
- `skills/(project)/project-context-loader/SKILL.md`
- `skills/(project)/saas-standard-architect/SKILL.md`
- `skills/(project)/contract-first-migrator/SKILL.md`
- `skills/(project)/metrics-discipline/SKILL.md`

## Option A - Manual copy (recommended MVP)

### Codex
Copy each skill folder into:
- `%USERPROFILE%\.codex\skills\`

### Claude Code
Copy each skill folder into:
- `%USERPROFILE%\.claude\skills\`

### Cursor
Copy each skill folder into:
- `%USERPROFILE%\.cursor\skills\`

## Option B - CLI-assisted install
If using the agent-skills CLI in future iterations:
1. package these skills under a publishable catalog
2. install by skill name per agent target

## Option C - Project installer script
Use:
- `tools/install-project-skills.ps1`

Examples:
```powershell
# install to Codex global path
.\tools\install-project-skills.ps1 -Agent codex -Force

# install to custom path (safe test)
.\tools\install-project-skills.ps1 -Agent custom -CustomPath C:\tmp\skills-test -Force
```

## Option D - Start-of-day bootstrap script
Use:
- `tools/start-day.ps1`

Examples:
```powershell
# standard daily start for Codex
.\tools\start-day.ps1 -Agent codex -ForceSkills

# skip skill reinstall and only load context + status
.\tools\start-day.ps1 -SkipInstall

# show full context files (not truncated)
.\tools\start-day.ps1 -SkipInstall -ShowFullContext
```

## Option E - End-of-day checkpoint script
Use:
- `tools/end-day.ps1`

Examples:
```powershell
# close day with worklog entry (duration based)
.\tools\end-day.ps1 -LogWork -TaskId STD-002 -DurationHours 1.25 -Status in_progress -Notes "CRM model draft and review" -ShowPending

# close day with explicit start/end time
.\tools\end-day.ps1 -LogWork -TaskId STD-002 -StartTime 18:30 -EndTime 20:00 -Notes "State machine and transitions"

# add cost entry in same run
.\tools\end-day.ps1 -LogCost -Provider internal -Service engineering-time -Category implementation -Reference "STD-002 modeling" -AmountBRL 0 -AmountUSD 0

# dry-run preview only (no file writes)
.\tools\end-day.ps1 -LogWork -TaskId TEST-001 -DurationHours 0.25 -DryRun
```

## Validation checklist
1. Start a new session.
2. Ask to "load context" and verify `project-context-loader` behavior.
3. Ask an architecture question and verify `saas-standard-architect` behavior.
4. Ask migration from fabio2 and verify `contract-first-migrator` behavior.
5. Close a task and verify `metrics-discipline` prompts for worklog/costlog updates.

## Update flow
- Modify source skills in `skills/(project)/...`.
- Re-copy to agent directories.
- Validate trigger behavior in a fresh session.

## Validation evidence (MVP)
- Script tested in safe custom target:
  - `C:\projetos\fabio\.tmp\codex-skills`
- Installed skills validated:
  - project-context-loader
  - saas-standard-architect
  - contract-first-migrator
  - metrics-discipline
