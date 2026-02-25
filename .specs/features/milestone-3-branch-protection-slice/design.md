# Design - milestone-3-branch-protection-slice

Status: Approved
Date: 2026-02-25

## Approach
Criar utilitário PowerShell para aplicar proteção de branch via `gh api`.

## Script
- `tools/enforce-branch-protection.ps1`

Capabilities:
1. Resolver `owner/repo` automaticamente a partir do `origin`.
2. Montar payload padrão de proteção.
3. Suportar modo `dry-run` (padrão) e `-Apply` para escrita real.
4. Ler proteção aplicada para confirmação.

## Protection Baseline
- `required_status_checks.strict = true`
- `required_status_checks.contexts = ["Preprod Validate"]`
- `required_pull_request_reviews.required_approving_review_count = 1`
- `dismiss_stale_reviews = true`
- `require_code_owner_reviews = false`
- `enforce_admins = true`
- `required_linear_history = true`
- `allow_force_pushes = false`
- `allow_deletions = false`
- `required_conversation_resolution = true`

## Validation
1. `pwsh ./tools/enforce-branch-protection.ps1` (dry-run)
2. `pwsh ./tools/enforce-branch-protection.ps1 -Apply`
3. `gh api repos/<owner>/<repo>/branches/main/protection`
