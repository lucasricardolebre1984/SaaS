---
name: metrics-discipline
description: Enforces work and cost tracking for each phase/task. Use when completing tasks, updating execution status, or reviewing project performance.
---

# Metrics Discipline

## When to use
- At task completion.
- During weekly review.
- Before phase change.

## Source of truth
- `.specs/project/METRICS.md`
- `.specs/project/worklog.csv`
- `.specs/project/costlog.csv`

## Process
1. Record work effort in `worklog.csv`.
2. Record relevant costs in `costlog.csv`.
3. Validate linkage between completed tasks and metric categories.
4. Flag missing data for next checkpoint.

## Minimum logging standard
- date, duration, phase, feature, task_id, actor, status.
- provider/service/environment/amount for cost entries.

## Guardrails
- No phase close without logs updated.
- No financial claims without source references.
- Keep metric formulas unchanged unless explicitly re-approved.
