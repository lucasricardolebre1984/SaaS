param(
  [ValidateSet('codex','claude','cursor','custom')]
  [string]$Agent = 'codex',

  [string]$CustomPath,
  [switch]$ForceSkills,
  [switch]$SkipInstall,
  [switch]$ShowFullContext
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Show-ContextFile {
  param([string]$RelativePath)

  $fullPath = Join-Path $repoRoot $RelativePath
  Write-Host ""
  Write-Host "----- $RelativePath -----" -ForegroundColor Yellow

  if (-not (Test-Path $fullPath)) {
    Write-Host "MISSING: $RelativePath" -ForegroundColor Red
    return
  }

  if ($ShowFullContext) {
    Get-Content $fullPath
  } else {
    Get-Content $fullPath -TotalCount 120
  }
}

Write-Step "Start-day bootstrap for $Agent"

if (-not $SkipInstall) {
  $installScript = Join-Path $repoRoot 'tools/install-project-skills.ps1'
  if (-not (Test-Path $installScript)) {
    throw "Installer not found: $installScript"
  }

  $installParams = @{ Agent = $Agent }
  if ($ForceSkills) {
    $installParams['Force'] = $true
  }
  if ($Agent -eq 'custom') {
    if ([string]::IsNullOrWhiteSpace($CustomPath)) {
      throw "CustomPath is required when Agent=custom"
    }
    $installParams['CustomPath'] = $CustomPath
  }

  Write-Step "Installing project skills"
  & $installScript @installParams
} else {
  Write-Step "Skipping skills install (-SkipInstall)"
}

Write-Step "Git status"
git status --short

$activeFeature = ''
$activePhase = ''
$statePath = Join-Path $repoRoot '.specs/project/STATE.md'
if (Test-Path $statePath) {
  $stateRaw = Get-Content $statePath -Raw
  $featureMatch = [regex]::Match($stateRaw, '(?m)^Active feature:\s*(.+)$')
  if ($featureMatch.Success) {
    $activeFeature = $featureMatch.Groups[1].Value.Trim()
  }
  $phaseMatch = [regex]::Match($stateRaw, '(?m)^Active phase:\s*(.+)$')
  if ($phaseMatch.Success) {
    $activePhase = $phaseMatch.Groups[1].Value.Trim()
  }
}

Write-Step "Loading mandatory project context"
$mandatoryFiles = @(
  '.specs/project/CONTEXT.md',
  '.specs/project/PROJECT.md',
  '.specs/project/ROADMAP.md',
  '.specs/project/STATE.md'
)
foreach ($file in $mandatoryFiles) {
  Show-ContextFile -RelativePath $file
}

if (-not [string]::IsNullOrWhiteSpace($activeFeature)) {
  Write-Step "Loading active feature docs: $activeFeature"
  $featureFiles = @(
    ".specs/features/$activeFeature/spec.md",
    ".specs/features/$activeFeature/design.md",
    ".specs/features/$activeFeature/tasks.md"
  )
  foreach ($file in $featureFiles) {
    Show-ContextFile -RelativePath $file
  }
} else {
  Write-Step "Active feature not found in STATE.md"
}

Write-Step "Session kickoff prompt"
if ([string]::IsNullOrWhiteSpace($activeFeature)) {
  Write-Host "Use this prompt in the next message:"
  Write-Host "Retomar do ultimo checkpoint em .specs/project/STATE.md e seguir pelo task ativo."
} else {
  Write-Host "Use this prompt in the next message:"
  Write-Host "Retomar feature $activeFeature na fase '$activePhase' e continuar do proximo task pendente."
}
