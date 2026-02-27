param(
  [string]$Branch = "main",
  [string]$Host = "54.233.196.148",
  [string]$User = "ubuntu",
  [string]$KeyPath = "C:\Users\Lucas\Documents\jarviskey.pem",
  [string]$RemotePath = "/srv/SaaS",
  [string]$ServiceName = "saas.service",
  [string]$PublicHealthUrl = "https://dev.automaniaai.com.br/api/health",
  [int]$RemotePort = 4001,
  [switch]$RunPreprod,
  [switch]$SkipNpmCi
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Remote {
  param([string]$Command)
  $sshArgs = @(
    "-i", $KeyPath,
    "-o", "StrictHostKeyChecking=accept-new",
    "$User@$Host",
    $Command
  )
  & ssh @sshArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Remote command failed: $Command"
  }
}

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

Write-Step "Deploy dev bootstrap"
Write-Host "Repo: $repoRoot"
Write-Host "Branch: $Branch"
Write-Host "Remote: $User@$Host:$RemotePath"
Write-Host "Service: $ServiceName"

Write-Step "Local checks"
git rev-parse --is-inside-work-tree | Out-Null
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
  throw "Current branch is '$currentBranch'. Switch to '$Branch' before deploy."
}

git fetch --all --prune
git pull --ff-only origin $Branch

if ($RunPreprod) {
  Write-Step "Running preprod gate (local)"
  npm run preprod:validate
}

Write-Step "Pushing local branch"
git push origin $Branch

Write-Step "Remote update"
Invoke-Remote "cd $RemotePath && git fetch --all --prune && git checkout $Branch && git pull --ff-only origin $Branch"

if (-not $SkipNpmCi) {
  Write-Step "Remote npm ci"
  Invoke-Remote "cd $RemotePath && npm ci"
}

Write-Step "Restarting service"
Invoke-Remote "sudo systemctl daemon-reload && sudo systemctl restart $ServiceName"
Invoke-Remote "sudo systemctl is-active $ServiceName"
Invoke-Remote "curl -fsS http://127.0.0.1:$RemotePort/api/health"

if (-not [string]::IsNullOrWhiteSpace($PublicHealthUrl)) {
  Write-Step "Public health check"
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $PublicHealthUrl -TimeoutSec 20 | Out-Null
    Write-Host "Public health OK: $PublicHealthUrl" -ForegroundColor Green
  } catch {
    Write-Warning "Public health check failed: $PublicHealthUrl"
  }
}

Write-Step "Deploy done"
Write-Host "Branch '$Branch' pushed and deployed to $Host."

