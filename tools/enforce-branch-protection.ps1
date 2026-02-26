param(
  [string]$Branch = 'main',
  [switch]$Apply,
  [string]$Owner,
  [string]$Repo,
  [string[]]$RequiredChecks = @('Preprod Validate'),
  [int]$RequiredApprovals = 1
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoFromOrigin {
  $origin = (& git remote get-url origin).Trim()
  if (-not $origin) {
    throw 'Could not resolve git origin url.'
  }

  $pattern = '(?:github\.com[/:])(?<owner>[^/]+)/(?<repo>[^/.]+)(?:\.git)?$'
  $match = [regex]::Match($origin, $pattern)
  if (-not $match.Success) {
    throw "Could not parse owner/repo from origin: $origin"
  }

  return @{
    owner = $match.Groups['owner'].Value
    repo = $match.Groups['repo'].Value
  }
}

if (-not $Owner -or -not $Repo) {
  $resolved = Resolve-RepoFromOrigin
  if (-not $Owner) { $Owner = $resolved.owner }
  if (-not $Repo) { $Repo = $resolved.repo }
}

$payload = @{
  required_status_checks = @{
    strict = $true
    contexts = $RequiredChecks
  }
  enforce_admins = $true
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $false
    required_approving_review_count = $RequiredApprovals
  }
  restrictions = $null
}

$target = "repos/$Owner/$Repo/branches/$Branch/protection"
Write-Host "Target: $target"
Write-Host "Mode: $([string]::Join('', @($(if ($Apply) {'apply'} else {'dry-run'}))))"
Write-Host ('Required checks: {0}' -f ($RequiredChecks -join ', '))

$json = $payload | ConvertTo-Json -Depth 10

if (-not $Apply) {
  Write-Host 'Dry-run payload:'
  Write-Host $json
  exit 0
}

$tmp = [System.IO.Path]::GetTempFileName()
try {
  Set-Content -Path $tmp -Value $json -Encoding ascii

  & gh api `
    --method PUT `
    -H 'Accept: application/vnd.github+json' `
    -H 'X-GitHub-Api-Version: 2022-11-28' `
    $target `
    --input $tmp | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to apply branch protection.'
  }

  Write-Host 'Branch protection applied. Reading back summary...'
  $current = & gh api `
    -H 'Accept: application/vnd.github+json' `
    -H 'X-GitHub-Api-Version: 2022-11-28' `
    $target | ConvertFrom-Json

  $contexts = @($current.required_status_checks.contexts)
  $approvals = $current.required_pull_request_reviews.required_approving_review_count
  Write-Host ("Applied: strict={0} contexts={1} approvals={2} enforce_admins={3}" -f `
    $current.required_status_checks.strict, `
    ($contexts -join ','), `
    $approvals, `
    $current.enforce_admins.enabled)
} finally {
  Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
}
