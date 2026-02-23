# QUALITY GATES

Date: 2026-02-23  
Status: Draft-active

## Local Gates (minimum)
1. Contract integrity:
   - `nx run contract-tests:contract-checks`
2. Executable contract tests:
   - `nx run contract-tests:test`
3. Tenant pack validation:
   - `npm run tenant:validate`
4. Workspace visibility:
   - `nx show projects`

## Failure Policy
- Any failed contract check blocks phase/task closure.
- Any pending status in `saas-standard-v1/tasks.md` blocks "foundation complete" claim.
- Runtime implementation cannot begin without passing contract checks.

## CI Draft (minimal)
```yaml
name: ci-foundation
on:
  pull_request:
  push:
    branches: [main]

jobs:
  contract-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx nx run contract-tests:contract-checks
```

## Next Quality Expansion
- Add lint/typecheck targets when runtime code is introduced.
- Add affected-based strategy:
  - `nx affected -t contract-checks`
