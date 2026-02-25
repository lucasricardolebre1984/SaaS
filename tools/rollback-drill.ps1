param(
  [switch]$SkipPostgresSmoke,
  [switch]$SkipFileRuntimeTests
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $PSScriptRoot 'reports'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportsDir "rollback-drill-$timestamp.log"

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
  Write-Report ("Rollback drill at {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Report ("repo_root={0}" -f $repoRoot)

  if (-not $SkipFileRuntimeTests) {
    Invoke-Step -Name 'file-backend-runtime-tests' -Command @(
      'pwsh',
      '-NoProfile',
      '-Command',
      "`$env:ORCHESTRATION_STORE_BACKEND='file'; npx nx run app-platform-api:test"
    )
  } else {
    Write-Report 'SKIP file-backend-runtime-tests (SkipFileRuntimeTests=true)'
  }

  if (-not $SkipPostgresSmoke) {
    Invoke-Step -Name 'postgres-smoke' -Command @('npm', 'run', 'smoke:postgres')
  } else {
    Write-Report 'SKIP postgres-smoke (SkipPostgresSmoke=true)'
  }

  Write-Report ("[{0}] SUCCESS rollback drill completed" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Host 'Rollback drill passed.'
  Write-Host "Report: $reportPath"
} catch {
  Write-Report ("[{0}] ERROR {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $_.Exception.Message)
  Write-Host 'Rollback drill failed.'
  Write-Host "Report: $reportPath"
  throw
}
