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

  $chargePayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      source_module = 'mod-01-owner-concierge'
      charge = @{
        charge_id = [guid]::NewGuid().ToString()
        customer_id = [guid]::NewGuid().ToString()
        external_key = "smoke-charge-$([guid]::NewGuid().ToString())"
        amount = 99.90
        currency = 'BRL'
        due_date = '2026-03-30'
        status = 'open'
      }
    }
  }
  Write-Host 'Creating billing charge...'
  $chargeCreate = Invoke-RestMethod -Uri "$apiBaseUrl/v1/billing/charges" `
    -Method Post -ContentType 'application/json' -Body ($chargePayload | ConvertTo-Json -Depth 8)
  if ($chargeCreate.response.status -notin @('created', 'idempotent')) {
    throw 'Charge create did not return created/idempotent.'
  }
  $chargeId = $chargeCreate.response.charge.charge_id

  $billingCorrelation = [guid]::NewGuid().ToString()
  $collectionPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      source_module = 'mod-01-owner-concierge'
      correlation_id = $billingCorrelation
      collection = @{
        recipient = @{
          phone_e164 = '+5511991112233'
        }
        message = 'Cobranca de teste smoke postgres'
      }
    }
  }
  Write-Host 'Requesting billing collection dispatch...'
  $collectionRequest = Invoke-RestMethod -Uri "$apiBaseUrl/v1/billing/charges/$chargeId/collection-request" `
    -Method Post -ContentType 'application/json' -Body ($collectionPayload | ConvertTo-Json -Depth 8)
  if ($collectionRequest.response.status -ne 'collection_requested') {
    throw 'Collection request was not accepted.'
  }

  $paymentPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      source_module = 'mod-05-faturamento-cobranca'
      correlation_id = $billingCorrelation
      payment = @{
        payment_id = [guid]::NewGuid().ToString()
        charge_id = $chargeId
        external_key = "smoke-payment-$([guid]::NewGuid().ToString())"
        amount = 99.90
        currency = 'BRL'
        paid_at = '2026-03-30T12:00:00.000Z'
        status = 'confirmed'
      }
    }
  }
  Write-Host 'Creating billing payment...'
  $paymentCreate = Invoke-RestMethod -Uri "$apiBaseUrl/v1/billing/payments" `
    -Method Post -ContentType 'application/json' -Body ($paymentPayload | ConvertTo-Json -Depth 8)
  if ($paymentCreate.response.status -notin @('created', 'idempotent')) {
    throw 'Payment create did not return created/idempotent.'
  }
  if ($paymentCreate.response.charge.status -ne 'paid') {
    throw 'Expected paid charge status after payment confirmation.'
  }

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

  Write-Host 'Fetching billing trace...'
  $billingTrace = Invoke-RestMethod -Uri "$apiBaseUrl/internal/orchestration/trace?correlation_id=$billingCorrelation" `
    -Method Get
  $billingEventNames = @($billingTrace.events | ForEach-Object { $_.name })
  if (-not ($billingEventNames -contains 'billing.collection.requested')) {
    throw 'Expected billing.collection.requested event not found.'
  }
  if (-not ($billingEventNames -contains 'billing.payment.confirmed')) {
    throw 'Expected billing.payment.confirmed event not found.'
  }

  Write-Host 'Validating persisted rows in Postgres...'
  $commandCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.orchestration_commands;"
  $eventCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.orchestration_events;"
  $queueCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.orchestration_module_task_queue;"
  $billingChargeCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.billing_charges;"
  $billingPaymentCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.billing_payments;"

  $commandCount = [int]($commandCountRaw | Select-Object -First 1).Trim()
  $eventCount = [int]($eventCountRaw | Select-Object -First 1).Trim()
  $queueCount = [int]($queueCountRaw | Select-Object -First 1).Trim()
  $billingChargeCount = [int]($billingChargeCountRaw | Select-Object -First 1).Trim()
  $billingPaymentCount = [int]($billingPaymentCountRaw | Select-Object -First 1).Trim()

  if ($commandCount -lt 3) { throw "Expected >=3 commands, got $commandCount." }
  if ($eventCount -lt 6) { throw "Expected >=6 events, got $eventCount." }
  if ($queueCount -lt 1) { throw "Expected >=1 queue row, got $queueCount." }
  if ($billingChargeCount -lt 1) { throw "Expected >=1 billing charge row, got $billingChargeCount." }
  if ($billingPaymentCount -lt 1) { throw "Expected >=1 billing payment row, got $billingPaymentCount." }

  Write-Host ''
  Write-Host 'Postgres smoke passed.' -ForegroundColor Green
  Write-Host "correlation_id=$correlationId"
  Write-Host "billing_correlation_id=$billingCorrelation"
  Write-Host "rows: commands=$commandCount events=$eventCount queue=$queueCount billing_charges=$billingChargeCount billing_payments=$billingPaymentCount"
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
