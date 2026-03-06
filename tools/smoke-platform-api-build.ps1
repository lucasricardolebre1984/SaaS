param(
  [int]$Port = 4411
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$buildRoot = Join-Path $repoRoot 'dist/apps/platform-api'
$serverEntrypoint = Join-Path $buildRoot 'apps/platform-api/src/server.mjs'
$stdoutPath = Join-Path $repoRoot 'tools/reports/platform-api-build-smoke.out.log'
$stderrPath = Join-Path $repoRoot 'tools/reports/platform-api-build-smoke.err.log'
$proc = $null

if (-not (Test-Path $serverEntrypoint)) {
  throw "Build artifact entrypoint not found: $serverEntrypoint"
}

if (Test-Path $stdoutPath) { Remove-Item $stdoutPath -Force }
if (Test-Path $stderrPath) { Remove-Item $stderrPath -Force }

try {
  $proc = Start-Process -FilePath 'node' `
    -ArgumentList '.\apps\platform-api\src\server.mjs' `
    -WorkingDirectory $buildRoot `
    -PassThru `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -Environment @{
      PORT = "$Port"
      HOST = '127.0.0.1'
      SERVE_UNIFIED_UI = '1'
    }

  $health = $null
  for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
      break
    } catch {}
  }

  if (-not $health) {
    throw "Build artifact server did not become ready on port $Port."
  }

  $owner = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/owner/" -TimeoutSec 10
  $crm = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/crm/" -TimeoutSec 10

  if ($health.status -ne 'ok') {
    throw 'Expected /health status ok.'
  }
  if ($owner.StatusCode -ne 200) {
    throw "Expected /owner/ 200, got $($owner.StatusCode)."
  }
  if ($crm.StatusCode -ne 200) {
    throw "Expected /crm/ 200, got $($crm.StatusCode)."
  }

  Write-Host "Platform API build smoke passed. port=$Port owner=$($owner.StatusCode) crm=$($crm.StatusCode)" -ForegroundColor Green
} finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
