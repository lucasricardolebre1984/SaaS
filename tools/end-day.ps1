param(
  [switch]$LogWork,
  [string]$Feature,
  [string]$TaskId,
  [string]$Phase,
  [string]$StartTime,
  [string]$EndTime,
  [double]$DurationHours,
  [ValidateSet('done', 'in_progress', 'blocked', 'planned')]
  [string]$Status = 'done',
  [string]$Actor = 'pair',
  [string]$Notes = '',
  [switch]$LogCost,
  [string]$Provider,
  [string]$Service,
  [string]$Environment = 'local',
  [double]$AmountBRL = 0,
  [double]$AmountUSD = 0,
  [string]$Category,
  [string]$Reference,
  [switch]$ShowPending,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-StateValue {
  param(
    [string]$StatePath,
    [string]$Field
  )

  if (-not (Test-Path $StatePath)) {
    return ''
  }

  $raw = Get-Content $StatePath -Raw
  $m = [regex]::Match($raw, "(?m)^$([regex]::Escape($Field)):\s*(.+)$")
  if ($m.Success) {
    return $m.Groups[1].Value.Trim()
  }

  return ''
}

function Parse-TimeToday {
  param([string]$Time)
  return [datetime]::ParseExact(
    "$(Get-Date -Format 'yyyy-MM-dd') $Time",
    'yyyy-MM-dd HH:mm',
    $null
  )
}

function Get-PendingTasks {
  param([string]$TasksPath)

  if (-not (Test-Path $TasksPath)) {
    return @()
  }

  $lines = Get-Content $TasksPath
  $pending = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^##\s+') {
      $header = $lines[$i].Trim()
      $isPending = $false
      for ($j = $i + 1; $j -lt $lines.Count; $j++) {
        if ($lines[$j] -match '^##\s+') {
          break
        }
        if ($lines[$j] -match '^- Status:\s+pending') {
          $isPending = $true
          break
        }
      }
      if ($isPending) {
        $pending += $header
      }
    }
  }

  return $pending
}

Write-Step "End-day checkpoint"

$statePath = Join-Path $repoRoot '.specs/project/STATE.md'
$activeFeature = Get-StateValue -StatePath $statePath -Field 'Active feature'
$activePhase = Get-StateValue -StatePath $statePath -Field 'Active phase'

if ([string]::IsNullOrWhiteSpace($Feature)) {
  $Feature = $activeFeature
}
if ([string]::IsNullOrWhiteSpace($Phase)) {
  $Phase = $activePhase
}

if ($LogWork) {
  if ([string]::IsNullOrWhiteSpace($TaskId)) {
    throw 'TaskId is required when -LogWork is used.'
  }
  if ([string]::IsNullOrWhiteSpace($Feature)) {
    throw 'Feature is required (or Active feature in STATE.md) when -LogWork is used.'
  }
  if ([string]::IsNullOrWhiteSpace($Phase)) {
    throw 'Phase is required (or Active phase in STATE.md) when -LogWork is used.'
  }

  $endDt = $null
  $startDt = $null

  if (-not [string]::IsNullOrWhiteSpace($StartTime) -and -not [string]::IsNullOrWhiteSpace($EndTime)) {
    $startDt = Parse-TimeToday -Time $StartTime
    $endDt = Parse-TimeToday -Time $EndTime
    $DurationHours = [math]::Round(($endDt - $startDt).TotalHours, 2)
  } elseif ($DurationHours -gt 0) {
    $endDt = Get-Date
    $startDt = $endDt.AddHours(-1 * $DurationHours)
  } else {
    throw 'Provide StartTime+EndTime (HH:mm) or DurationHours when -LogWork is used.'
  }

  if ([string]::IsNullOrWhiteSpace($Notes)) {
    $Notes = 'End-day checkpoint entry'
  }

  $worklogPath = Join-Path $repoRoot '.specs/project/worklog.csv'
  $workEntry = [pscustomobject]@{
    date = (Get-Date -Format 'yyyy-MM-dd')
    start_time = $startDt.ToString('HH:mm')
    end_time = $endDt.ToString('HH:mm')
    duration_hours = ('{0:N2}' -f $DurationHours).Replace(',', '.')
    phase = $Phase
    feature = $Feature
    task_id = $TaskId
    actor = $Actor
    status = $Status
    notes = $Notes
  }

  Write-Step "Worklog entry"
  if ($DryRun) {
    $workEntry | Format-Table -AutoSize
  } else {
    ($workEntry | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1) | Add-Content $worklogPath
    Write-Host "Saved: $worklogPath"
  }
}

if ($LogCost) {
  if ([string]::IsNullOrWhiteSpace($Provider) -or
      [string]::IsNullOrWhiteSpace($Service) -or
      [string]::IsNullOrWhiteSpace($Category) -or
      [string]::IsNullOrWhiteSpace($Reference)) {
    throw 'Provider, Service, Category, and Reference are required when -LogCost is used.'
  }

  $costlogPath = Join-Path $repoRoot '.specs/project/costlog.csv'
  $costEntry = [pscustomobject]@{
    date = (Get-Date -Format 'yyyy-MM-dd')
    provider = $Provider
    service = $Service
    environment = $Environment
    amount_brl = ('{0:N2}' -f $AmountBRL).Replace(',', '.')
    amount_usd = ('{0:N2}' -f $AmountUSD).Replace(',', '.')
    category = $Category
    reference = $Reference
  }

  Write-Step "Costlog entry"
  if ($DryRun) {
    $costEntry | Format-Table -AutoSize
  } else {
    ($costEntry | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1) | Add-Content $costlogPath
    Write-Host "Saved: $costlogPath"
  }
}

Write-Step "Git status"
git status --short

if ($ShowPending -and -not [string]::IsNullOrWhiteSpace($activeFeature)) {
  $tasksPath = Join-Path $repoRoot ".specs/features/$activeFeature/tasks.md"
  $pending = Get-PendingTasks -TasksPath $tasksPath
  Write-Step "Pending tasks for active feature ($activeFeature)"
  if ($pending.Count -eq 0) {
    Write-Host "No pending tasks found or tasks file missing."
  } else {
    $pending | ForEach-Object { Write-Host "- $_" }
  }
}

Write-Step "Next-day command"
Write-Host "npm run init:day"
Write-Host "or (fast resume): npm run resume:day"
