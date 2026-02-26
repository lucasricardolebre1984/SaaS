param(
  [string]$EnvFile = '.env.aws.example',
  [string]$Domain = 'dev.automaniaai.com',
  [switch]$SkipPreprod,
  [switch]$SkipSmokePostgres,
  [switch]$SkipDnsResolve
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $PSScriptRoot 'reports'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportsDir "deploy-aws-readiness-$timestamp.log"

New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
New-Item -ItemType File -Path $reportPath -Force | Out-Null

function Write-Report {
  param([string]$Line)
  Add-Content -Path $reportPath -Value $Line
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  $startedAt = Get-Date
  Write-Host "[deploy-gate:start] $Name"
  Write-Report ("[{0}] START {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Name)

  & $Action

  $duration = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
  Write-Host "[deploy-gate:pass] $Name (${duration}s)"
  Write-Report ("[{0}] PASS {1} (duration_s={2})" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Name, $duration)
}

function Read-EnvFile {
  param([string]$FilePath)

  if (-not (Test-Path $FilePath)) {
    throw "Env file not found: $FilePath"
  }

  $result = @{}
  Get-Content $FilePath | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $result[$key] = $value
  }
  return $result
}

function Assert-RequiredKeys {
  param(
    [hashtable]$EnvMap,
    [string[]]$Required
  )

  $missing = @()
  foreach ($key in $Required) {
    if (-not $EnvMap.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$EnvMap[$key])) {
      $missing += $key
    }
  }

  if ($missing.Count -gt 0) {
    throw "Missing required keys in env file: $($missing -join ', ')"
  }
}

try {
  Set-Location $repoRoot

  Write-Report ("AWS deploy readiness run at {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Report ("Repo root: {0}" -f $repoRoot)
  Write-Report ("EnvFile: {0}" -f $EnvFile)
  Write-Report ("Domain: {0}" -f $Domain)
  Write-Report ("SkipPreprod: {0}" -f [bool]$SkipPreprod)
  Write-Report ("SkipSmokePostgres: {0}" -f [bool]$SkipSmokePostgres)
  Write-Report ("SkipDnsResolve: {0}" -f [bool]$SkipDnsResolve)

  if (-not $SkipPreprod) {
    Invoke-Step -Name 'preprod-validate' -Action {
      $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $repoRoot 'tools/preprod-validate.ps1'), '-SkipOperationalDrills')
      if ($SkipSmokePostgres) {
        $args += '-SkipSmokePostgres'
      }
      & pwsh @args
      if ($LASTEXITCODE -ne 0) {
        throw "preprod-validate failed (exit=$LASTEXITCODE)"
      }
    }
  }

  $envPath = Join-Path $repoRoot $EnvFile
  $envMap = $null

  Invoke-Step -Name 'env-file-structure' -Action {
    $script:envMap = Read-EnvFile -FilePath $envPath
    $required = @(
      'APP_ENV',
      'HOST',
      'PORT',
      'ORCHESTRATION_STORE_BACKEND',
      'ORCHESTRATION_PG_DSN',
      'OPENAI_API_KEY',
      'EVOLUTION_HTTP_BASE_URL',
      'EVOLUTION_API_KEY',
      'EVOLUTION_INSTANCE_ID',
      'CORS_ALLOW_ORIGINS'
    )
    Assert-RequiredKeys -EnvMap $script:envMap -Required $required

    if ([string]$script:envMap['ORCHESTRATION_STORE_BACKEND'] -ne 'postgres') {
      throw 'ORCHESTRATION_STORE_BACKEND must be postgres for AWS deployment baseline.'
    }
  }

  if (-not $SkipDnsResolve) {
    Invoke-Step -Name 'dns-resolution' -Action {
      $dns = Resolve-DnsName -Name $Domain -ErrorAction Stop
      $ipRecords = $dns | Where-Object { $_.Type -eq 'A' }
      if (-not $ipRecords) {
        throw "No A record found for $Domain"
      }
      Write-Report ("Resolved A records for {0}: {1}" -f $Domain, (($ipRecords | ForEach-Object { $_.IPAddress }) -join ', '))
    }
  }

  Write-Report ("[{0}] SUCCESS aws deploy readiness passed" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
  Write-Host 'AWS deploy readiness passed.'
  Write-Host "Report: $reportPath"
} catch {
  Write-Report ("[{0}] ERROR {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $_.Exception.Message)
  Write-Host 'AWS deploy readiness failed.'
  Write-Host "Report: $reportPath"
  throw
}
