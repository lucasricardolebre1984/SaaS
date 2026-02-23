param(
  [ValidateSet('all', 'contracts', 'mod01', 'mod02', 'persona', 'metrics', 'data-model')]
  [string]$Scope = 'all'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Get-FilesByScope {
  param([string]$TargetScope)

  switch ($TargetScope) {
    'contracts' {
      return @(
        'libs/core/orchestration-contracts/schemas/*.json'
      )
    }
    'mod01' {
      return @(
        'libs/mod-01-owner-concierge/contracts/*.json'
      )
    }
    'mod02' {
      return @(
        'libs/mod-02-whatsapp-crm/domain/*.json',
        'libs/mod-02-whatsapp-crm/integration/*.json',
        'libs/mod-02-whatsapp-crm/tests/*.json'
      )
    }
    'persona' {
      return @(
        'libs/core/persona-registry/schemas/*.json',
        'tenants/sample-tenant-001/personas/*.json',
        'tenants/sample-tenant-001/policies/*.json'
      )
    }
    'metrics' {
      return @(
        'libs/core/audit-metrics/*.json'
      )
    }
    'data-model' {
      return @(
        'libs/core/data-model/*.json'
      )
    }
    default {
      return @(
        'libs/core/orchestration-contracts/schemas/*.json',
        'libs/mod-01-owner-concierge/contracts/*.json',
        'libs/mod-02-whatsapp-crm/domain/*.json',
        'libs/mod-02-whatsapp-crm/integration/*.json',
        'libs/mod-02-whatsapp-crm/tests/*.json',
        'libs/core/persona-registry/schemas/*.json',
        'tenants/sample-tenant-001/personas/*.json',
        'tenants/sample-tenant-001/policies/*.json',
        'libs/core/audit-metrics/*.json',
        'libs/core/data-model/*.json'
      )
    }
  }
}

function Assert-JsonFilesParse {
  param([string[]]$Patterns)

  $failures = @()
  $files = @()
  foreach ($pattern in $Patterns) {
    $files += Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue
  }

  $files = $files | Sort-Object FullName -Unique
  if ($files.Count -eq 0) {
    throw "No files found for selected scope: $Scope"
  }

  foreach ($file in $files) {
    try {
      Get-Content $file.FullName -Raw | ConvertFrom-Json | Out-Null
      Write-Host "OK JSON: $($file.FullName)"
    } catch {
      $failures += $file.FullName
      Write-Host "FAIL JSON: $($file.FullName)" -ForegroundColor Red
      Write-Host "  -> $($_.Exception.Message)" -ForegroundColor Red
    }
  }

  if ($failures.Count -gt 0) {
    throw "JSON parse failures detected."
  }
}

Write-Host "Running contract checks (scope=$Scope)..."

$patterns = Get-FilesByScope -TargetScope $Scope
Assert-JsonFilesParse -Patterns $patterns

if ($Scope -eq 'all' -or $Scope -eq 'persona') {
  Write-Host "Running sample tenant pack schema validation..."
  & "$repoRoot/tools/validate-sample-tenant-pack.ps1"
}

if ($Scope -eq 'all') {
  Write-Host "Running executable contract tests..."
  node --test "$repoRoot/tools/contract-tests/*.test.mjs"
  if ($LASTEXITCODE -ne 0) {
    throw "Executable contract tests failed."
  }

  $tasksPath = "$repoRoot/.specs/features/saas-standard-v1/tasks.md"
  if (-not (Test-Path $tasksPath)) {
    throw "Missing tasks file: $tasksPath"
  }
  $tasksContent = Get-Content $tasksPath -Raw
  if ($tasksContent -match '(?m)^- Status:\s+pending') {
    throw "Found pending status entries in saas-standard-v1/tasks.md"
  }
  Write-Host "OK tasks status: no pending entries in saas-standard-v1/tasks.md"
}

Write-Host "Contract checks passed (scope=$Scope)."
