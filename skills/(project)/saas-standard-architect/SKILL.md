---
name: saas-standard-architect
description: Enforces the SaaS Standard v1 architecture (modules 1-5, contracts, tenant personas) and prevents structural drift. Use for architecture and module design decisions.
---

# SaaS Standard Architect

## When to use
- Defining module boundaries.
- Reviewing architecture decisions.
- Creating new features that touch core modules.

## Source of truth
- `.specs/project/MODULES_STANDARD.md`
- `.specs/features/saas-standard-v1/spec.md`
- `.specs/features/saas-standard-v1/design.md`

## Process
1. Confirm request against fixed module menu (1..5).
2. Validate ownership:
- Module 1 orchestrates.
- Module 2 executes WhatsApp CRM workflows.
- Modules 3/4/5 own clientes/agenda/billing records.
3. Check if change requires contract update.
4. If contract update is needed, require explicit spec/design/tasks update first.

## Hard rules
- Keep core modules neutral.
- Put persona customization under tenant config only.
- No hardcoded company behavior in core runtime.
- All cross-module communication must be typed contract/event based.
