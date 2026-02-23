param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('codex','claude','cursor','custom')]
  [string]$Agent,

  [string]$CustomPath,
  [switch]$Force
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceBase = Join-Path $repoRoot 'skills\(project)'

if(-not (Test-Path $sourceBase)) {
  throw "Source skills path not found: $sourceBase"
}

$targetPath = switch ($Agent) {
  'codex' { Join-Path $env:USERPROFILE '.codex\skills' }
  'claude' { Join-Path $env:USERPROFILE '.claude\skills' }
  'cursor' { Join-Path $env:USERPROFILE '.cursor\skills' }
  'custom' {
    if([string]::IsNullOrWhiteSpace($CustomPath)) {
      throw 'CustomPath is required when Agent=custom'
    }
    $CustomPath
  }
}

New-Item -ItemType Directory -Force -Path $targetPath | Out-Null

$skillDirs = Get-ChildItem -Directory -Path $sourceBase
foreach($dir in $skillDirs) {
  $destination = Join-Path $targetPath $dir.Name
  if(Test-Path $destination) {
    if(-not $Force) {
      Write-Host "Skipping existing skill (use -Force to overwrite): $($dir.Name)"
      continue
    }
    Remove-Item -Recurse -Force -Path $destination
  }
  Copy-Item -Recurse -Force -Path $dir.FullName -Destination $destination
  Write-Host "Installed: $($dir.Name) -> $destination"
}

Write-Host "Done. Target: $targetPath"
