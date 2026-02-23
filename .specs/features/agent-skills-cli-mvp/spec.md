# Spec - agent-skills-cli-mvp

Status: Draft
Date: 2026-02-22

## Objective
Define an MVP for project-specific agent skills and CLI workflow so every future session/agent executes with the same institutional pattern.

## Problem
Without packaged project skills, context quality depends too much on ad-hoc prompts and may drift.

## Scope
- Define minimal skills set for this project.
- Define trigger and sequencing rules.
- Define installation/usage workflow for local agent environments.

## Functional Requirements
1. Provide a `project-context-loader` skill for mandatory context loading.
2. Provide a `saas-standard-architect` skill for module 1..5 governance.
3. Provide a `contract-first-migrator` skill for legacy-safe migration.
4. Provide a `metrics-discipline` skill for worklog/cost tracking.
5. Document CLI installation flow for these skills.

## Out of Scope
- Full automation marketplace.
- Non-project generic skills already available globally.

## Acceptance Criteria
- MVP skill definitions documented.
- Usage guide documented.
- Skill order and triggers explicitly defined.
