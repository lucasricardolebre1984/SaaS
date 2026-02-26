param(
  [switch]$SkipSmokePostgres,
  [switch]$SkipOperationalDrills
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $PSScriptRoot 'reports'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportsDir "preprod-validate-$timestamp.log"

New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
New-Item -ItemType File -Path $reportPath -Force | Out-Null

function Write-Report {
  param([string]$Line)
  Add-Content -Path $reportPath -Value $Line
}

function Invoke-Gate {
  param(
    [string]$Name,
    [string[]]$Command
  )

  $display = $Command -join ' '
  $startedAt = Get-Date
  Write-Host "[gate:start] $Name -> $display"
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
    throw "Gate failed: $Name (exit=$exitCode)"
  }

  Write-Report ("[{0}] PASS {1} (duration_s={2})" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Name, $duration)
  Write-Host "[gate:pass] $Name (${duration}s)"
}

try {
  Set-Location $repoRoot

  Write-Report ("Preprod validate run at {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Report ("Repo root: {0}" -f $repoRoot)
  Write-Report ("SkipSmokePostgres: {0}" -f [bool]$SkipSmokePostgres)
  Write-Report ("SkipOperationalDrills: {0}" -f [bool]$SkipOperationalDrills)

  $gates = @(
    @{ Name = 'runtime-tests'; Command = @('npx', 'nx', 'run', 'app-platform-api:test') },
    @{ Name = 'contract-checks'; Command = @('npx', 'nx', 'run', 'contract-tests:contract-checks') },
    @{ Name = 'tenant-validate'; Command = @('npm', 'run', 'tenant:validate') },
    @{ Name = 'owner-console-build'; Command = @('npx', 'nx', 'run', 'app-owner-console:build') },
    @{ Name = 'crm-console-build'; Command = @('npx', 'nx', 'run', 'app-crm-console:build') }
  )

  if (-not $SkipSmokePostgres) {
    $gates += @{ Name = 'smoke-postgres'; Command = @('npm', 'run', 'smoke:postgres') }
  }

  if (-not $SkipOperationalDrills) {
    $releaseDryRunCommand = @(
      'npm',
      'run',
      'release:dry-run',
      '--',
      '-SkipPreprodValidate',
      '-SkipBranchProtectionCheck'
    )
    if ($SkipSmokePostgres) {
      $releaseDryRunCommand += '-SkipSmokePostgres'
    }

    $gates += @{ Name = 'release-dry-run'; Command = $releaseDryRunCommand }
    $gates += @{
      Name = 'rollback-drill'
      Command = @(
        'npm',
        'run',
        'rollback:drill',
        '--',
        '-SkipPostgresSmoke'
      )
    }
  }

  foreach ($gate in $gates) {
    Invoke-Gate -Name $gate.Name -Command $gate.Command
  }

  Write-Report ("[{0}] SUCCESS all gates passed" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Host "Preprod validation passed."
  Write-Host "Report: $reportPath"
} catch {
  Write-Report ("[{0}] ERROR {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $_.Exception.Message)
  Write-Host "Preprod validation failed."
  Write-Host "Report: $reportPath"
  throw
}
