# Trigger Matrix - agent-skills-cli-mvp

Date: 2026-02-22

## Skills and triggers

1) `project-context-loader`
- Triggers:
  - "start session"
  - "load context"
  - "resume work"
  - any new task after long pause

2) `saas-standard-architect`
- Triggers:
  - "module design"
  - "architecture"
  - "boundary"
  - "new module"

3) `contract-first-migrator`
- Triggers:
  - "migrate from fabio2"
  - "legacy"
  - "port behavior"
  - "rewrite module"

4) `metrics-discipline`
- Triggers:
  - "close task"
  - "worklog"
  - "cost"
  - "metrics review"

## Activation order
1. project-context-loader
2. saas-standard-architect
3. contract-first-migrator (when legacy behavior involved)
4. metrics-discipline (at completion checkpoints)
