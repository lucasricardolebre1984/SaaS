# Tasks - agent-skills-cli-mvp

Status: Completed (MVP)
Date: 2026-02-22

## SKL-001 - Define skill contracts and triggers
- Status: done
- Output:
  - `.specs/features/agent-skills-cli-mvp/TRIGGERS.md`
- Verification:
  - Trigger matrix created for 4 project skills and ordered activation flow.

## SKL-002 - Create skill templates
- Status: done
- Output:
  - `skills/(project)/project-context-loader/SKILL.md`
  - `skills/(project)/saas-standard-architect/SKILL.md`
  - `skills/(project)/contract-first-migrator/SKILL.md`
  - `skills/(project)/metrics-discipline/SKILL.md`
- Verification:
  - All skill files contain frontmatter + actionable body.

## SKL-003 - Define CLI installation runbook
- Status: done
- Output:
  - `.specs/features/agent-skills-cli-mvp/RUNBOOK.md`
  - `tools/install-project-skills.ps1`
- Verification:
  - Installer executed successfully in test target:
    - `C:\\projetos\\fabio\\.tmp\\codex-skills`

## SKL-004 - Integrate with AGENTS.md load order
- Status: done
- Output:
  - `AGENTS.md` updated with project skills section, ordering, and references.
- Verification:
  - New session bootstrap sequence now includes skills MVP references.

## SKL-005 - Add start-of-day bootstrap script
- Status: done
- Output:
  - `tools/start-day.ps1`
  - `.specs/features/agent-skills-cli-mvp/RUNBOOK.md` updated with Option D
- Verification:
  - Script installs skills (optional), loads mandatory context, loads active feature docs, and prints kickoff prompt.

## SKL-006 - Add end-of-day checkpoint script
- Status: done
- Output:
  - `tools/end-day.ps1`
  - `.specs/features/agent-skills-cli-mvp/RUNBOOK.md` updated with Option E
- Verification:
  - Script supports worklog/costlog updates, pending-task summary, and next-day command output.
