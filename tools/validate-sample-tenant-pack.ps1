$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $repoRoot 'tools/validate-sample-tenant-pack.mjs'

if (-not (Test-Path $validator)) {
  throw "Missing validator script: $validator"
}

node $validator
if ($LASTEXITCODE -ne 0) {
  throw "Sample tenant pack validation failed."
}
