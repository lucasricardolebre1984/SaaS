param(
  [ValidateSet('codex','claude','cursor','custom')]
  [string]$Agent = 'codex',
  [string]$CustomPath,
  [switch]$FailOnMissingProject,
  [switch]$JsonOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Resolve-AgentSkillsPath {
  param(
    [string]$AgentName,
    [string]$CustomSkillsPath
  )

  switch ($AgentName) {
    'codex' { return Join-Path $env:USERPROFILE '.codex\skills' }
    'claude' { return Join-Path $env:USERPROFILE '.claude\skills' }
    'cursor' { return Join-Path $env:USERPROFILE '.cursor\skills' }
    'custom' {
      if ([string]::IsNullOrWhiteSpace($CustomSkillsPath)) {
        throw 'CustomPath is required when Agent=custom'
      }
      return $CustomSkillsPath
    }
  }
}

function Normalize-SkillName {
  param([string]$Name)
  return ([string]($Name ?? '')).Trim().ToLower()
}

function Canonicalize-SkillName {
  param(
    [string]$Name,
    [hashtable]$AliasMap
  )

  $normalized = Normalize-SkillName $Name
  if ($AliasMap.ContainsKey($normalized)) {
    return Normalize-SkillName $AliasMap[$normalized]
  }
  return $normalized
}

$manifestPath = Join-Path $repoRoot 'tools\skills.json'
if (-not (Test-Path $manifestPath)) {
  throw "Missing skills manifest: $manifestPath"
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json -Depth 20
$targetPath = Resolve-AgentSkillsPath -AgentName $Agent -CustomSkillsPath $CustomPath
$installedRaw = @()
if (Test-Path $targetPath) {
  $installedRaw = Get-ChildItem -Directory -Path $targetPath | Select-Object -ExpandProperty Name
}

$aliasMap = @{}
if ($manifest.aliases) {
  $manifest.aliases.PSObject.Properties | ForEach-Object {
    $aliasMap[(Normalize-SkillName $_.Name)] = $_.Value
  }
}

$installedCanonical = @(
  $installedRaw | ForEach-Object { Canonicalize-SkillName -Name $_ -AliasMap $aliasMap }
) | Sort-Object -Unique

$projectSkills = @($manifest.project_skills | ForEach-Object { Normalize-SkillName $_ })
$globalSkills = @($manifest.global_skills_expected | ForEach-Object { Normalize-SkillName $_ })
$missingProject = @($projectSkills | Where-Object { $_ -notin $installedCanonical })
$missingGlobal = @($globalSkills | Where-Object { $_ -notin $installedCanonical })

$result = [ordered]@{
  timestamp = (Get-Date).ToString('o')
  agent = $Agent
  target_path = $targetPath
  manifest_path = $manifestPath
  project_skills_required = $projectSkills.Count
  project_skills_missing = $missingProject
  global_skills_expected = $globalSkills.Count
  global_skills_minimum = [int]$manifest.global_skills_minimum
  global_skills_missing = $missingGlobal
  installed_skills_count = $installedCanonical.Count
  installed_skills = $installedCanonical
  meets_global_minimum = ($installedCanonical.Count -ge [int]$manifest.global_skills_minimum)
  announcement_policy = [ordered]@{
    required = [bool]$manifest.announcement_policy.require_skill_announcement
    rule = [string]$manifest.announcement_policy.rule
  }
}

if ($JsonOnly) {
  $result | ConvertTo-Json -Depth 8
} else {
  Write-Host ""
  Write-Host "==> Skills audit ($Agent)" -ForegroundColor Cyan
  Write-Host "Target path: $targetPath"
  Write-Host "Installed skills: $($installedCanonical.Count)"
  Write-Host "Project skills required: $($projectSkills.Count)"
  if ($missingProject.Count -eq 0) {
    Write-Host "Project skills: OK" -ForegroundColor Green
  } else {
    Write-Host "Project skills missing: $($missingProject -join ', ')" -ForegroundColor Red
  }

  Write-Host "Global expected: $($globalSkills.Count) | minimum: $($manifest.global_skills_minimum)"
  if ($missingGlobal.Count -eq 0) {
    Write-Host "Global skills set: complete" -ForegroundColor Green
  } else {
    Write-Host "Global skills missing (expected set): $($missingGlobal.Count)" -ForegroundColor Yellow
    Write-Host ($missingGlobal -join ', ')
  }

  if ($result.meets_global_minimum) {
    Write-Host "Minimum global skills threshold: OK" -ForegroundColor Green
  } else {
    Write-Host "Minimum global skills threshold: FAIL" -ForegroundColor Red
  }

  Write-Host "Announcement policy: $($result.announcement_policy.rule)"
}

$reportDir = Join-Path $repoRoot 'tools\reports'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$reportPath = Join-Path $reportDir ("skills-audit-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$result | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath -Encoding UTF8
if (-not $JsonOnly) {
  Write-Host "Report: $reportPath"
}

if ($FailOnMissingProject -and $missingProject.Count -gt 0) {
  exit 2
}
