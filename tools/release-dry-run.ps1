param(
  [switch]$SkipPreprodValidate,
  [switch]$SkipSmokePostgres,
  [switch]$SkipBranchProtectionCheck,
  [switch]$RequireCleanTree,
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $PSScriptRoot 'reports'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportsDir "release-dry-run-$timestamp.log"

New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
New-Item -ItemType File -Path $reportPath -Force | Out-Null

function Write-Report {
  param([string]$Line)
  Add-Content -Path $reportPath -Value $Line
}

function Invoke-Step {
  param(
    [string]$Name,
    [string[]]$Command
  )

  $display = $Command -join ' '
  $startedAt = Get-Date
  Write-Host "[step:start] $Name -> $display"
  Write-Report ("[{0}] START {1} :: {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Name, $display)

  if ($Command.Count -eq 1) {
    & $Command[0]
  } else {
    & $Command[0] $Command[1..($Command.Count - 1)]
  }

  $exitCode = $LASTEXITCODE
  $duration = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
  if ($exitCode -ne 0) {
    Write-Report ("[{0}] FAIL {1} (exit={2}, duration_s={3})" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Name, $exitCode, $duration)
    throw "Step failed: $Name (exit=$exitCode)"
  }

  Write-Report ("[{0}] PASS {1} (duration_s={2})" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Name, $duration)
  Write-Host "[step:pass] $Name (${duration}s)"
}

try {
  Set-Location $repoRoot

  $branch = (git branch --show-current).Trim()
  $head = (git rev-parse HEAD).Trim()
  $dirtyFiles = git status --porcelain
  $dirtyCount = @($dirtyFiles).Count

  Write-Report ("Release dry-run at {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Report ("repo_root={0}" -f $repoRoot)
  Write-Report ("branch={0}" -f $branch)
  Write-Report ("head={0}" -f $head)
  Write-Report ("dirty_count={0}" -f $dirtyCount)

  if ($dirtyCount -gt 0) {
    Write-Report 'dirty_files_start'
    $dirtyFiles | ForEach-Object { Write-Report $_ }
    Write-Report 'dirty_files_end'
    if ($RequireCleanTree) {
      throw 'Working tree is dirty and RequireCleanTree=true.'
    }
  }

  if (-not $SkipPreprodValidate) {
    $preprodCommand = @('npm', 'run', 'preprod:validate', '--', '-SkipOperationalDrills')
    if ($SkipSmokePostgres) {
      $preprodCommand += '-SkipSmokePostgres'
    }
    Invoke-Step -Name 'preprod-validate' -Command $preprodCommand
  } else {
    Write-Report 'SKIP preprod-validate (SkipPreprodValidate=true)'
  }

  if (-not $SkipBranchProtectionCheck) {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
      throw 'gh CLI not found. Use -SkipBranchProtectionCheck to bypass.'
    }

    Invoke-Step -Name 'gh-auth' -Command @('gh', 'auth', 'status')

    $origin = (git config --get remote.origin.url).Trim()
    $repoMatch = [regex]::Match($origin, 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)')
    if (-not $repoMatch.Success) {
      throw "Cannot parse owner/repo from origin: $origin"
    }

    $owner = $repoMatch.Groups['owner'].Value
    $repo = $repoMatch.Groups['repo'].Value
    $payloadRaw = gh api "repos/$owner/$repo/branches/$Branch/protection"
    if ($LASTEXITCODE -ne 0) {
      throw 'Failed to read branch protection via gh api.'
    }

    $protection = $payloadRaw | ConvertFrom-Json
    if (-not $protection.required_status_checks.strict) {
      throw 'Branch protection strict status checks is disabled.'
    }

    $contexts = @($protection.required_status_checks.contexts)
    if (-not ($contexts -contains 'Preprod Validate')) {
      throw 'Branch protection missing required context: Preprod Validate.'
    }

    $approvals = [int]$protection.required_pull_request_reviews.required_approving_review_count
    if ($approvals -lt 1) {
      throw 'Branch protection requires less than one approval.'
    }

    if (-not $protection.enforce_admins.enabled) {
      throw 'Branch protection does not enforce admins.'
    }

    Write-Report ("branch_protection_ok owner={0} repo={1} branch={2} approvals={3}" -f $owner, $repo, $Branch, $approvals)
    Write-Host "[step:pass] branch-protection-check"
  } else {
    Write-Report 'SKIP branch-protection-check (SkipBranchProtectionCheck=true)'
  }

  Write-Report ("[{0}] SUCCESS release dry-run completed" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Host 'Release dry-run passed.'
  Write-Host "Report: $reportPath"
} catch {
  Write-Report ("[{0}] ERROR {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $_.Exception.Message)
  Write-Host 'Release dry-run failed.'
  Write-Host "Report: $reportPath"
  throw
}
