# GitHub Branch Protection Baseline

Date: 2026-02-25  
Repository: `lucasricardolebre1984/fabio`  
Branch: `main`
Current state: `Blocked by GitHub plan (HTTP 403 on private repo without Pro)`

## Enforced Policy
1. Required status checks (strict):
   - `Preprod Validate`
2. Pull request required:
   - minimum approvals: `1`
   - dismiss stale reviews: `true`
3. Admins enforced:
   - `true`
4. Required conversation resolution:
   - `true`
5. Required linear history:
   - `true`
6. Force pushes:
   - `disabled`
7. Branch deletions:
   - `disabled`

## Operation Commands
Dry-run:
```powershell
powershell -ExecutionPolicy Bypass -File .\tools\enforce-branch-protection.ps1
```

Apply:
```powershell
npm run github:protect-main
```

## Blocker
- API responses for branch protection and rulesets return:
  - `Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)`

## Unblock Options
1. Upgrade account/org plan to GitHub Pro/Team.
2. Make repository public (if policy allows).
3. After unblocking, rerun:
   - `npm run github:protect-main`
