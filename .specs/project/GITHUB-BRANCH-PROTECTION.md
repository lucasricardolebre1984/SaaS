# GitHub Branch Protection Baseline

Date: 2026-02-25  
Repository: `lucasricardolebre1984/fabio`  
Branch: `main`
Current state: `Applied`

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

## Verification Snapshot
- `strict`: `true`
- `contexts`: `Preprod Validate`
- `required_approving_review_count`: `1`
- `enforce_admins.enabled`: `true`

## Operation Commands
Dry-run:
```powershell
powershell -ExecutionPolicy Bypass -File .\tools\enforce-branch-protection.ps1
```

Apply:
```powershell
npm run github:protect-main
```
