$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

$checks = @(
  @{
    Name = 'owner persona'
    Json = Join-Path $repoRoot 'tenants/sample-tenant-001/personas/owner.json'
    Schema = Join-Path $repoRoot 'libs/core/persona-registry/schemas/owner-persona.schema.json'
  },
  @{
    Name = 'whatsapp persona'
    Json = Join-Path $repoRoot 'tenants/sample-tenant-001/personas/whatsapp.json'
    Schema = Join-Path $repoRoot 'libs/core/persona-registry/schemas/whatsapp-persona.schema.json'
  },
  @{
    Name = 'tenant policy'
    Json = Join-Path $repoRoot 'tenants/sample-tenant-001/policies/default.json'
    Schema = Join-Path $repoRoot 'libs/core/persona-registry/schemas/tenant-policy.schema.json'
  }
)

foreach ($c in $checks) {
  if (-not (Test-Path $c.Json)) { throw "Missing JSON file: $($c.Json)" }
  if (-not (Test-Path $c.Schema)) { throw "Missing schema file: $($c.Schema)" }

  $json = Get-Content $c.Json -Raw
  $ok = Test-Json -Json $json -SchemaFile $c.Schema
  if (-not $ok) {
    throw "Validation failed for $($c.Name)"
  }
  Write-Host "OK: $($c.Name)"
}

Write-Host "Sample tenant pack validation passed."
