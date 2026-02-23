param(
  [switch]$KeepDocker,
  [int]$Port = 4310
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repoRoot 'tools/postgres-smoke/docker-compose.yml'
$composeProject = 'fabio-postgres-smoke'
$apiHealthUrl = "http://127.0.0.1:$Port/health"
$apiBaseUrl = "http://127.0.0.1:$Port"
$dsn = 'postgres://fabio:fabio@127.0.0.1:55432/fabio_dev'

$apiStdout = Join-Path $repoRoot 'tools/postgres-smoke/api-stdout.log'
$apiStderr = Join-Path $repoRoot 'tools/postgres-smoke/api-stderr.log'
$apiProcess = $null

function Wait-ForPostgres {
  param([int]$MaxAttempts = 40)
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    & docker compose -p $composeProject -f $composeFile exec -T postgres pg_isready -U fabio -d fabio_dev *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Postgres ready after $i attempt(s)."
      return
    }
    Start-Sleep -Milliseconds 1500
  }
  throw "Postgres did not become ready in time."
}

function Wait-ForApi {
  param([int]$MaxAttempts = 40)
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      $health = Invoke-RestMethod -Uri $apiHealthUrl -Method Get -TimeoutSec 3
      if ($health.status -eq 'ok') {
        Write-Host "API ready after $i attempt(s)."
        return
      }
    } catch {}
    Start-Sleep -Milliseconds 1000
  }
  throw "API did not become ready in time."
}

try {
  Set-Location $repoRoot
  Write-Host 'Starting Postgres container...'
  & docker compose -p $composeProject -f $composeFile up -d
  if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed.' }

  Wait-ForPostgres

  Write-Host 'Starting app-platform-api with postgres backend...'
  if (Test-Path $apiStdout) { Remove-Item -Force $apiStdout }
  if (Test-Path $apiStderr) { Remove-Item -Force $apiStderr }

  $cmd = @(
    "`$env:ORCHESTRATION_STORE_BACKEND='postgres'",
    "`$env:ORCHESTRATION_PG_DSN='$dsn'",
    "`$env:PORT='$Port'",
    "`$env:HOST='127.0.0.1'",
    "node apps/platform-api/src/server.mjs"
  ) -join '; '

  $apiProcess = Start-Process -FilePath 'pwsh' -ArgumentList @('-NoProfile', '-Command', $cmd) `
    -WorkingDirectory $repoRoot -PassThru `
    -RedirectStandardOutput $apiStdout -RedirectStandardError $apiStderr

  Wait-ForApi

  $requestId = [guid]::NewGuid().ToString()
  $sessionId = [guid]::NewGuid().ToString()
  $payload = @{
    request = @{
      request_id = $requestId
      tenant_id = 'tenant_automania'
      session_id = $sessionId
      operation = 'send_message'
      channel = 'ui-chat'
      payload = @{
        text = 'agendar reuniao e enviar lembrete'
      }
    }
  }

  Write-Host 'Posting owner interaction...'
  $interaction = Invoke-RestMethod -Uri "$apiBaseUrl/v1/owner-concierge/interaction" `
    -Method Post -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 8)

  if ($interaction.response.status -ne 'accepted') {
    throw 'Interaction was not accepted.'
  }
  $correlationId = $interaction.response.owner_command.correlation_id

  Write-Host 'Draining worker queue...'
  $drain = Invoke-RestMethod -Uri "$apiBaseUrl/internal/worker/module-tasks/drain" `
    -Method Post -ContentType 'application/json' -Body (@{ limit = 10 } | ConvertTo-Json)

  if ($drain.processed_count -lt 1) {
    throw 'Worker did not process any queued task.'
  }

  Write-Host 'Fetching trace...'
  $trace = Invoke-RestMethod -Uri "$apiBaseUrl/internal/orchestration/trace?correlation_id=$correlationId" `
    -Method Get
  $eventNames = @($trace.events | ForEach-Object { $_.name })
  if (-not ($eventNames -contains 'module.task.accepted')) {
    throw 'Expected module.task.accepted event not found.'
  }
  if (-not (($eventNames -contains 'module.task.completed') -or ($eventNames -contains 'module.task.failed'))) {
    throw 'Expected terminal module.task event not found.'
  }

  Write-Host 'Validating persisted rows in Postgres...'
  $commandCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.orchestration_commands;"
  $eventCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.orchestration_events;"
  $queueCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.orchestration_module_task_queue;"

  $commandCount = [int]($commandCountRaw | Select-Object -First 1).Trim()
  $eventCount = [int]($eventCountRaw | Select-Object -First 1).Trim()
  $queueCount = [int]($queueCountRaw | Select-Object -First 1).Trim()

  if ($commandCount -lt 2) { throw "Expected >=2 commands, got $commandCount." }
  if ($eventCount -lt 4) { throw "Expected >=4 events, got $eventCount." }
  if ($queueCount -lt 1) { throw "Expected >=1 queue row, got $queueCount." }

  Write-Host ''
  Write-Host 'Postgres smoke passed.' -ForegroundColor Green
  Write-Host "correlation_id=$correlationId"
  Write-Host "rows: commands=$commandCount events=$eventCount queue=$queueCount"
}
finally {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force
  }

  if (-not $KeepDocker) {
    Write-Host 'Stopping Postgres container...'
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      & docker compose -p $composeProject -f $composeFile down -v *> $null
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "docker compose down returned exit code $LASTEXITCODE."
      }
    }
    finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
  } else {
    Write-Host 'Keeping Postgres container running (KeepDocker=true).'
  }
}
