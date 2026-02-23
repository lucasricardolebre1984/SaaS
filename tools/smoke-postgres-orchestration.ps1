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

  $memoryCorrelation = [guid]::NewGuid().ToString()
  $memoryPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      session_id = $sessionId
      correlation_id = $memoryCorrelation
      memory = @{
        memory_id = [guid]::NewGuid().ToString()
        external_key = "smoke-memory-$([guid]::NewGuid().ToString())"
        source = 'user_message'
        content = 'Memoria de teste para promocao de contexto'
        tags = @('smoke', 'owner')
        salience_score = 0.85
      }
    }
  }
  Write-Host 'Creating owner memory entry...'
  $memoryCreate = Invoke-RestMethod -Uri "$apiBaseUrl/v1/owner-concierge/memory/entries" `
    -Method Post -ContentType 'application/json' -Body ($memoryPayload | ConvertTo-Json -Depth 8)
  if ($memoryCreate.response.status -notin @('created', 'idempotent')) {
    throw 'Owner memory create did not return created/idempotent.'
  }
  $memoryId = $memoryCreate.response.entry.memory_id

  $promotionPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      memory_id = $memoryId
      correlation_id = $memoryCorrelation
      action = 'promote'
      reason_code = 'SMOKE_PRIORITY'
    }
  }
  Write-Host 'Promoting owner memory entry...'
  $memoryPromote = Invoke-RestMethod -Uri "$apiBaseUrl/v1/owner-concierge/context/promotions" `
    -Method Post -ContentType 'application/json' -Body ($promotionPayload | ConvertTo-Json -Depth 8)
  if ($memoryPromote.response.status -ne 'updated') {
    throw 'Owner memory promotion was not accepted.'
  }
  if ($memoryPromote.response.entry.status -ne 'promoted') {
    throw 'Expected promoted status after context promotion.'
  }

  $retrievalPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      query = @{
        text = 'promocao de contexto memoria teste'
        session_id = $sessionId
        top_k = 5
      }
    }
  }
  Write-Host 'Retrieving owner context...'
  $retrieval = Invoke-RestMethod -Uri "$apiBaseUrl/v1/owner-concierge/context/retrieve" `
    -Method Post -ContentType 'application/json' -Body ($retrievalPayload | ConvertTo-Json -Depth 8)
  if ($retrieval.status -ne 'ok') {
    throw 'Owner context retrieval did not return ok status.'
  }
  if ($retrieval.retrieval.retrieved_count -lt 1) {
    throw 'Expected at least one retrieved context item.'
  }

  $schedulePayload = @{
    tenant_id = 'tenant_automania'
    interval_minutes = 60
    limit = 20
    mode = 'local'
    enabled = $true
    run_now = $true
  }
  Write-Host 'Configuring owner memory reembed schedule...'
  $scheduleUpsert = Invoke-RestMethod -Uri "$apiBaseUrl/internal/maintenance/owner-memory/reembed/schedules" `
    -Method Post -ContentType 'application/json' -Body ($schedulePayload | ConvertTo-Json -Depth 8)
  if (-not $scheduleUpsert.schedule.enabled) {
    throw 'Expected enabled owner memory reembed schedule.'
  }

  Write-Host 'Pausing owner memory reembed schedule...'
  $schedulePause = Invoke-RestMethod -Uri "$apiBaseUrl/internal/maintenance/owner-memory/reembed/schedules/pause" `
    -Method Post -ContentType 'application/json' -Body (@{ tenant_id = 'tenant_automania' } | ConvertTo-Json -Depth 5)
  if ($schedulePause.schedule.enabled) {
    throw 'Expected paused owner memory reembed schedule.'
  }

  Write-Host 'Resuming owner memory reembed schedule...'
  $scheduleResume = Invoke-RestMethod -Uri "$apiBaseUrl/internal/maintenance/owner-memory/reembed/schedules/resume" `
    -Method Post -ContentType 'application/json' -Body (@{ tenant_id = 'tenant_automania'; run_now = $true } | ConvertTo-Json -Depth 5)
  if (-not $scheduleResume.schedule.enabled) {
    throw 'Expected resumed owner memory reembed schedule.'
  }

  Write-Host 'Running owner memory due schedules...'
  $scheduleRunDue = Invoke-RestMethod -Uri "$apiBaseUrl/internal/maintenance/owner-memory/reembed/schedules/run-due" `
    -Method Post -ContentType 'application/json' -Body (@{ tenant_id = 'tenant_automania'; force = $true; max_concurrency = 1; lock_ttl_seconds = 120 } | ConvertTo-Json -Depth 8)
  if ($scheduleRunDue.executed_count -lt 1) {
    throw 'Expected owner memory schedule run-due to execute at least one schedule.'
  }

  Write-Host 'Fetching owner memory schedule run history...'
  $scheduleRuns = Invoke-RestMethod -Uri "$apiBaseUrl/internal/maintenance/owner-memory/reembed/runs?tenant_id=tenant_automania&limit=5" `
    -Method Get
  if ($scheduleRuns.count -lt 1) {
    throw 'Expected owner memory schedule run history entries.'
  }

  $leadPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      source_module = 'mod-02-whatsapp-crm'
      lead = @{
        lead_id = [guid]::NewGuid().ToString()
        external_key = "smoke-lead-$([guid]::NewGuid().ToString())"
        display_name = 'Lead Smoke'
        phone_e164 = '+5511993332211'
        source_channel = 'whatsapp'
        stage = 'new'
      }
    }
  }
  Write-Host 'Creating CRM lead...'
  $leadCreate = Invoke-RestMethod -Uri "$apiBaseUrl/v1/crm/leads" `
    -Method Post -ContentType 'application/json' -Body ($leadPayload | ConvertTo-Json -Depth 8)
  if ($leadCreate.response.status -notin @('created', 'idempotent')) {
    throw 'Lead create did not return created/idempotent.'
  }

  $campaignPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      source_module = 'mod-02-whatsapp-crm'
      campaign = @{
        campaign_id = [guid]::NewGuid().ToString()
        external_key = "smoke-campaign-$([guid]::NewGuid().ToString())"
        name = 'Campanha Smoke CRM'
        channel = 'whatsapp'
        state = 'scheduled'
      }
    }
  }
  Write-Host 'Creating CRM campaign...'
  $campaignCreate = Invoke-RestMethod -Uri "$apiBaseUrl/v1/crm/campaigns" `
    -Method Post -ContentType 'application/json' -Body ($campaignPayload | ConvertTo-Json -Depth 8)
  if ($campaignCreate.response.status -notin @('created', 'idempotent')) {
    throw 'Campaign create did not return created/idempotent.'
  }
  $campaignId = $campaignCreate.response.campaign.campaign_id

  $followupCorrelation = [guid]::NewGuid().ToString()
  $followupPayload = @{
    request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'tenant_automania'
      source_module = 'mod-02-whatsapp-crm'
      correlation_id = $followupCorrelation
      followup = @{
        followup_id = [guid]::NewGuid().ToString()
        campaign_id = $campaignId
        external_key = "smoke-followup-$([guid]::NewGuid().ToString())"
        phone_e164 = '+5511994445566'
        message = 'Follow-up de teste smoke postgres'
        schedule_at = '2025-01-01T12:00:00.000Z'
        channel = 'whatsapp'
        status = 'pending'
      }
    }
  }
  Write-Host 'Creating CRM follow-up...'
  $followupCreate = Invoke-RestMethod -Uri "$apiBaseUrl/v1/crm/followups" `
    -Method Post -ContentType 'application/json' -Body ($followupPayload | ConvertTo-Json -Depth 8)
  if ($followupCreate.response.status -notin @('created', 'idempotent')) {
    throw 'Follow-up create did not return created/idempotent.'
  }

  Write-Host 'Draining CRM follow-up worker...'
  $followupDrain = Invoke-RestMethod -Uri "$apiBaseUrl/internal/worker/crm-followups/drain" `
    -Method Post -ContentType 'application/json' -Body (@{ limit = 10 } | ConvertTo-Json)
  if ($followupDrain.processed_count -lt 1) {
    throw 'CRM follow-up worker did not process pending follow-ups.'
  }

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

  Write-Host 'Draining CRM collections worker...'
  $crmDrain = Invoke-RestMethod -Uri "$apiBaseUrl/internal/worker/crm-collections/drain" `
    -Method Post -ContentType 'application/json' -Body (@{ limit = 10 } | ConvertTo-Json)
  if ($crmDrain.processed_count -lt 1) {
    throw 'CRM collections worker did not process dispatch commands.'
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
  if (-not (($billingEventNames -contains 'billing.collection.sent') -or ($billingEventNames -contains 'billing.collection.failed'))) {
    throw 'Expected billing collection dispatch terminal event not found.'
  }
  if (-not ($billingEventNames -contains 'billing.payment.confirmed')) {
    throw 'Expected billing.payment.confirmed event not found.'
  }

  Write-Host 'Fetching owner memory promotion trace...'
  $memoryTrace = Invoke-RestMethod -Uri "$apiBaseUrl/internal/orchestration/trace?correlation_id=$memoryCorrelation" `
    -Method Get
  $memoryEventNames = @($memoryTrace.events | ForEach-Object { $_.name })
  if (-not ($memoryEventNames -contains 'owner.context.promoted')) {
    throw 'Expected owner.context.promoted event not found.'
  }

  Write-Host 'Fetching CRM follow-up trace...'
  $followupTrace = Invoke-RestMethod -Uri "$apiBaseUrl/internal/orchestration/trace?correlation_id=$followupCorrelation" `
    -Method Get
  $followupEventNames = @($followupTrace.events | ForEach-Object { $_.name })
  if (-not ($followupEventNames -contains 'crm.followup.scheduled')) {
    throw 'Expected crm.followup.scheduled event not found.'
  }
  if (-not (($followupEventNames -contains 'crm.followup.sent') -or ($followupEventNames -contains 'crm.followup.failed'))) {
    throw 'Expected crm.followup terminal event not found.'
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
  $crmLeadCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.crm_leads;"
  $crmCampaignCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.crm_campaigns;"
  $crmFollowupCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.crm_followups;"
  $ownerMemoryCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.owner_memory_entries;"
  $ownerPromotionCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.owner_context_promotions;"
  $ownerReembedScheduleCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.owner_memory_reembed_schedules;"
  $ownerReembedRunsCountRaw = & docker compose -p $composeProject -f $composeFile exec -T postgres `
    psql -U fabio -d fabio_dev -tAc "select count(*) from public.owner_memory_reembed_runs;"

  $commandCount = [int]($commandCountRaw | Select-Object -First 1).Trim()
  $eventCount = [int]($eventCountRaw | Select-Object -First 1).Trim()
  $queueCount = [int]($queueCountRaw | Select-Object -First 1).Trim()
  $billingChargeCount = [int]($billingChargeCountRaw | Select-Object -First 1).Trim()
  $billingPaymentCount = [int]($billingPaymentCountRaw | Select-Object -First 1).Trim()
  $crmLeadCount = [int]($crmLeadCountRaw | Select-Object -First 1).Trim()
  $crmCampaignCount = [int]($crmCampaignCountRaw | Select-Object -First 1).Trim()
  $crmFollowupCount = [int]($crmFollowupCountRaw | Select-Object -First 1).Trim()
  $ownerMemoryCount = [int]($ownerMemoryCountRaw | Select-Object -First 1).Trim()
  $ownerPromotionCount = [int]($ownerPromotionCountRaw | Select-Object -First 1).Trim()
  $ownerReembedScheduleCount = [int]($ownerReembedScheduleCountRaw | Select-Object -First 1).Trim()
  $ownerReembedRunsCount = [int]($ownerReembedRunsCountRaw | Select-Object -First 1).Trim()

  if ($commandCount -lt 3) { throw "Expected >=3 commands, got $commandCount." }
  if ($eventCount -lt 6) { throw "Expected >=6 events, got $eventCount." }
  if ($queueCount -lt 1) { throw "Expected >=1 queue row, got $queueCount." }
  if ($billingChargeCount -lt 1) { throw "Expected >=1 billing charge row, got $billingChargeCount." }
  if ($billingPaymentCount -lt 1) { throw "Expected >=1 billing payment row, got $billingPaymentCount." }
  if ($crmLeadCount -lt 1) { throw "Expected >=1 crm lead row, got $crmLeadCount." }
  if ($crmCampaignCount -lt 1) { throw "Expected >=1 crm campaign row, got $crmCampaignCount." }
  if ($crmFollowupCount -lt 1) { throw "Expected >=1 crm followup row, got $crmFollowupCount." }
  if ($ownerMemoryCount -lt 1) { throw "Expected >=1 owner memory row, got $ownerMemoryCount." }
  if ($ownerPromotionCount -lt 1) { throw "Expected >=1 owner promotion row, got $ownerPromotionCount." }
  if ($ownerReembedScheduleCount -lt 1) { throw "Expected >=1 owner memory reembed schedule row, got $ownerReembedScheduleCount." }
  if ($ownerReembedRunsCount -lt 1) { throw "Expected >=1 owner memory reembed run row, got $ownerReembedRunsCount." }

  Write-Host ''
  Write-Host 'Postgres smoke passed.' -ForegroundColor Green
  Write-Host "correlation_id=$correlationId"
  Write-Host "billing_correlation_id=$billingCorrelation"
  Write-Host "memory_correlation_id=$memoryCorrelation"
  Write-Host "followup_correlation_id=$followupCorrelation"
  Write-Host "rows: commands=$commandCount events=$eventCount queue=$queueCount billing_charges=$billingChargeCount billing_payments=$billingPaymentCount crm_leads=$crmLeadCount crm_campaigns=$crmCampaignCount crm_followups=$crmFollowupCount owner_memory=$ownerMemoryCount owner_promotions=$ownerPromotionCount owner_reembed_schedules=$ownerReembedScheduleCount owner_reembed_runs=$ownerReembedRunsCount"
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
