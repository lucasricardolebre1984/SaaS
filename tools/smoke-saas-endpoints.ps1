param(
  [string]$BaseUrl = 'https://dev.automaniaai.com.br/api',
  [string]$TenantId = 'tenant_automania',
  [string]$OutputPath = '',
  [switch]$SkipMutations,
  [switch]$SkipOwnerInteraction,
  [switch]$SkipAi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $OutputPath = "tools/reports/saas-endpoint-smoke-$stamp.json"
}

$reportDir = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($reportDir) -and -not (Test-Path $reportDir)) {
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

function New-Id { [guid]::NewGuid().ToString() }

function Read-ErrorResponseContent {
  param([System.Exception]$Exception)
  if ($null -eq $Exception.Response) { return '' }
  try {
    $stream = $Exception.Response.GetResponseStream()
    if ($null -eq $stream) { return '' }
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    $reader.Close()
    return $text
  } catch {
    return ''
  }
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "$BaseUrl$Path"
  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 30 -Compress
      $resp = Invoke-WebRequest -Method $Method -Uri $uri -UseBasicParsing -ContentType 'application/json' -Body $json
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $uri -UseBasicParsing
    }

    $parsed = $null
    try {
      $parsed = $resp.Content | ConvertFrom-Json -Depth 40
    } catch {
      try { $parsed = $resp.Content | ConvertFrom-Json } catch {}
    }

    return [pscustomobject]@{
      ok = $true
      status = [int]$resp.StatusCode
      uri = $uri
      path = $Path
      method = $Method
      body = $parsed
      raw = $resp.Content
      error = ''
    }
  } catch {
    $status = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    }
    $raw = Read-ErrorResponseContent -Exception $_.Exception
    $parsed = $null
    try {
      if ($raw) { $parsed = $raw | ConvertFrom-Json -Depth 40 }
    } catch {
      try { if ($raw) { $parsed = $raw | ConvertFrom-Json } } catch {}
    }

    return [pscustomobject]@{
      ok = $false
      status = $status
      uri = $uri
      path = $Path
      method = $Method
      body = $parsed
      raw = $raw
      error = $_.Exception.Message
    }
  }
}

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Step,
    [string]$Outcome,
    [object]$Response,
    [string]$Note = ''
  )

  $results.Add([pscustomobject]@{
    step = $Step
    outcome = $Outcome
    method = $Response.method
    path = $Response.path
    status = $Response.status
    note = $Note
    timestamp = (Get-Date).ToString('s')
  }) | Out-Null
}

function Require-Status {
  param(
    [string]$Step,
    [object]$Response,
    [int[]]$Expected,
    [string]$PassNote = 'ok'
  )

  if ($Expected -contains [int]$Response.status) {
    Add-Result -Step $Step -Outcome 'PASS' -Response $Response -Note $PassNote
    return $true
  }

  $note = if ($Response.body -and $Response.body.error) { [string]$Response.body.error } elseif ($Response.error) { $Response.error } else { 'unexpected_status' }
  Add-Result -Step $Step -Outcome 'FAIL' -Response $Response -Note $note
  return $false
}

function Status-Line {
  param([string]$Text)
  Write-Host "[smoke] $Text"
}

function As-Array {
  param([object]$Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return $Value }
  return @($Value)
}

Status-Line "BaseUrl=$BaseUrl TenantId=$TenantId"

$health = Invoke-Api -Method 'GET' -Path '/health'
[void](Require-Status -Step 'health' -Response $health -Expected @(200))

$runtimeConfig = Invoke-Api -Method 'GET' -Path ("/v1/owner-concierge/runtime-config?tenant_id={0}" -f [uri]::EscapeDataString($TenantId))
[void](Require-Status -Step 'runtime-config:get' -Response $runtimeConfig -Expected @(200))

$createdCustomerId = $null
$createdAppointmentId = $null
$createdChargeId = $null
$createdLeadId = $null
$conversationId = $null
$webhookPhoneE164 = $null

if (-not $SkipOwnerInteraction) {
  $interactionPayload = @{
    request = @{
      request_id = (New-Id)
      tenant_id = $TenantId
      session_id = (New-Id)
      operation = 'send_message'
      channel = 'ui-chat'
      payload = @{ text = 'smoke endpoint audit: nao execute mudancas reais' }
    }
  }
  $interaction = Invoke-Api -Method 'POST' -Path '/v1/owner-concierge/interaction' -Body $interactionPayload
  if (Require-Status -Step 'owner:interaction' -Response $interaction -Expected @(200)) {
    $receipts = @()
    try { $receipts = As-Array $interaction.body.response.execution_receipts } catch {}
    $hasReceipts = $receipts.Count -gt 0
    if ($hasReceipts) {
      Add-Result -Step 'owner:interaction:receipts' -Outcome 'PASS' -Response $interaction -Note 'execution_receipts_present'
    } else {
      Add-Result -Step 'owner:interaction:receipts' -Outcome 'FAIL' -Response $interaction -Note 'execution_receipts_missing'
    }
  }
}

if (-not $SkipMutations) {
  $customerId = New-Id
  $customerPayload = @{
    request = @{
      request_id = (New-Id)
      tenant_id = $TenantId
      origin = 'manual_owner'
      source_module = 'mod-01-owner-concierge'
      customer = @{
        customer_id = $customerId
        external_key = "smoke-customer-$customerId"
        display_name = 'Smoke Customer'
        primary_phone = '+5516999999999'
        status = 'active'
      }
    }
  }
  $customerCreate = Invoke-Api -Method 'POST' -Path '/v1/customers' -Body $customerPayload
  if (Require-Status -Step 'customers:create' -Response $customerCreate -Expected @(200, 201)) {
    $createdCustomerId = [string]$customerId
  }

  $customersList = Invoke-Api -Method 'GET' -Path ("/v1/customers?tenant_id={0}" -f [uri]::EscapeDataString($TenantId))
  [void](Require-Status -Step 'customers:list' -Response $customersList -Expected @(200))

  if ($createdCustomerId) {
    $customerDetail = Invoke-Api -Method 'GET' -Path ("/v1/customers/{0}?tenant_id={1}" -f [uri]::EscapeDataString($createdCustomerId), [uri]::EscapeDataString($TenantId))
    [void](Require-Status -Step 'customers:detail' -Response $customerDetail -Expected @(200))
  }

  $appointmentId = New-Id
  $startAt = (Get-Date).AddHours(1).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.000Z')
  $endAt = (Get-Date).AddHours(2).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.000Z')
  $appointmentPayload = @{
    request = @{
      request_id = (New-Id)
      tenant_id = $TenantId
      source_module = 'mod-01-owner-concierge'
      appointment = @{
        appointment_id = $appointmentId
        external_key = "smoke-appointment-$appointmentId"
        title = 'Smoke Appointment'
        description = 'Endpoint smoke test'
        start_at = $startAt
        end_at = $endAt
        timezone = 'America/Sao_Paulo'
        status = 'scheduled'
      }
    }
  }
  $appointmentCreate = Invoke-Api -Method 'POST' -Path '/v1/agenda/appointments' -Body $appointmentPayload
  if (Require-Status -Step 'agenda:appointments:create' -Response $appointmentCreate -Expected @(200, 201)) {
    $createdAppointmentId = [string]$appointmentId
  }

  if ($createdAppointmentId) {
    $reminderPayload = @{
      request = @{
        request_id = (New-Id)
        tenant_id = $TenantId
        source_module = 'mod-01-owner-concierge'
        reminder = @{
          reminder_id = (New-Id)
          appointment_id = $createdAppointmentId
          external_key = "smoke-reminder-$createdAppointmentId"
          schedule_at = (Get-Date).AddMinutes(20).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.000Z')
          channel = 'whatsapp'
          message = 'Smoke reminder'
          recipient = @{ phone_e164 = '+5516999999999' }
        }
      }
    }
    $reminderCreate = Invoke-Api -Method 'POST' -Path '/v1/agenda/reminders' -Body $reminderPayload
    [void](Require-Status -Step 'agenda:reminders:create' -Response $reminderCreate -Expected @(200, 201))
  }

  $remindersList = Invoke-Api -Method 'GET' -Path ("/v1/agenda/reminders?tenant_id={0}" -f [uri]::EscapeDataString($TenantId))
  [void](Require-Status -Step 'agenda:reminders:list' -Response $remindersList -Expected @(200))

  if ($createdCustomerId) {
    $chargeId = New-Id
    $chargePayload = @{
      request = @{
        request_id = (New-Id)
        tenant_id = $TenantId
        source_module = 'mod-01-owner-concierge'
        charge = @{
          charge_id = $chargeId
          customer_id = $createdCustomerId
          external_key = "smoke-charge-$chargeId"
          amount = 99.90
          currency = 'BRL'
          due_date = (Get-Date).AddDays(5).ToString('yyyy-MM-dd')
          status = 'open'
        }
      }
    }
    $chargeCreate = Invoke-Api -Method 'POST' -Path '/v1/billing/charges' -Body $chargePayload
    if (Require-Status -Step 'billing:charges:create' -Response $chargeCreate -Expected @(200, 201)) {
      $createdChargeId = [string]$chargeId
    }
  }

  if ($createdChargeId) {
    $paymentPayload = @{
      request = @{
        request_id = (New-Id)
        tenant_id = $TenantId
        source_module = 'mod-05-faturamento-cobranca'
        payment = @{
          payment_id = (New-Id)
          charge_id = $createdChargeId
          external_key = "smoke-payment-$createdChargeId"
          amount = 99.90
          currency = 'BRL'
          paid_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.000Z')
          status = 'confirmed'
        }
      }
    }
    $paymentCreate = Invoke-Api -Method 'POST' -Path '/v1/billing/payments' -Body $paymentPayload
    [void](Require-Status -Step 'billing:payments:create' -Response $paymentCreate -Expected @(200, 201))
  }

  $chargesList = Invoke-Api -Method 'GET' -Path ("/v1/billing/charges?tenant_id={0}" -f [uri]::EscapeDataString($TenantId))
  [void](Require-Status -Step 'billing:charges:list' -Response $chargesList -Expected @(200))

  $leadId = New-Id
  $leadPhoneDigits = "5516$((Get-Random -Minimum 900000000 -Maximum 999999999))"
  $leadPayload = @{
    request = @{
      request_id = (New-Id)
      tenant_id = $TenantId
      source_module = 'mod-02-whatsapp-crm'
      lead = @{
        lead_id = $leadId
        external_key = "smoke-lead-$leadId"
        display_name = 'Smoke Lead'
        phone_e164 = "+$leadPhoneDigits"
        source_channel = 'whatsapp'
        stage = 'new'
      }
    }
  }
  $leadCreate = Invoke-Api -Method 'POST' -Path '/v1/crm/leads' -Body $leadPayload
  if (Require-Status -Step 'crm:leads:create' -Response $leadCreate -Expected @(200, 201)) {
    $createdLeadId = [string]$leadId
  }

  if ($createdLeadId) {
    $stagePayload = @{
      request = @{
        request_id = (New-Id)
        tenant_id = $TenantId
        source_module = 'mod-02-whatsapp-crm'
        changes = @{
          to_stage = 'contacted'
          trigger = 'first_contact_attempt'
          reason_code = 'smoke_transition'
        }
      }
    }
    $leadStagePatch = Invoke-Api -Method 'PATCH' -Path ("/v1/crm/leads/{0}/stage" -f [uri]::EscapeDataString($createdLeadId)) -Body $stagePayload
    [void](Require-Status -Step 'crm:leads:stage' -Response $leadStagePatch -Expected @(200))
  }

  $leadsList = Invoke-Api -Method 'GET' -Path ("/v1/crm/leads?tenant_id={0}" -f [uri]::EscapeDataString($TenantId))
  [void](Require-Status -Step 'crm:leads:list' -Response $leadsList -Expected @(200))

  $webhookPhoneDigits = "5516$((Get-Random -Minimum 900000000 -Maximum 999999999))"
  $webhookPhoneE164 = "+$webhookPhoneDigits"
  $webhookPayload = @{
    event = 'MESSAGES_UPSERT'
    instance = $TenantId
    data = @{
      key = @{
        id = "smoke-msg-$((New-Id).Substring(0,8))"
        remoteJid = "$webhookPhoneDigits@s.whatsapp.net"
        fromMe = $false
      }
      pushName = 'Smoke Inbound'
      message = @{ conversation = 'Mensagem inbound de smoke' }
    }
    date_time = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.000Z')
  }
  $webhook = Invoke-Api -Method 'POST' -Path '/provider/evolution/webhook' -Body $webhookPayload
  [void](Require-Status -Step 'provider:evolution:webhook' -Response $webhook -Expected @(200))
}

$conversations = Invoke-Api -Method 'GET' -Path ("/v1/crm/conversations?tenant_id={0}&limit=200" -f [uri]::EscapeDataString($TenantId))
if (Require-Status -Step 'crm:conversations:list' -Response $conversations -Expected @(200)) {
  $conversationItems = @()
  try {
    $conversationItems = As-Array $conversations.body.items
    if ($conversationItems.Count -eq 0) {
      $conversationItems = As-Array $conversations.body.conversations
    }
  } catch {}

  if ($webhookPhoneE164 -and $conversationItems.Count -gt 0) {
    foreach ($item in $conversationItems) {
      if ([string]$item.contact_e164 -eq $webhookPhoneE164) {
        $conversationId = [string]$item.conversation_id
        break
      }
    }
  }
  if (-not $conversationId -and $conversationItems.Count -gt 0) {
    $conversationId = [string]$conversationItems[0].conversation_id
    Add-Result -Step 'crm:conversation:select' -Outcome 'PASS' -Response $conversations -Note 'fallback_first_conversation'
  }
}

if ($conversationId) {
  $messages = Invoke-Api -Method 'GET' -Path ("/v1/crm/conversations/{0}/messages?tenant_id={1}&limit=50" -f [uri]::EscapeDataString($conversationId), [uri]::EscapeDataString($TenantId))
  [void](Require-Status -Step 'crm:messages:list' -Response $messages -Expected @(200))

  $read = Invoke-Api -Method 'POST' -Path ("/v1/crm/conversations/{0}/read?tenant_id={1}" -f [uri]::EscapeDataString($conversationId), [uri]::EscapeDataString($TenantId))
  [void](Require-Status -Step 'crm:conversations:read' -Response $read -Expected @(200))

  $sendPayload = @{
    request = @{
      tenant_id = $TenantId
      text = 'Smoke send test'
    }
  }
  $send = Invoke-Api -Method 'POST' -Path ("/v1/crm/conversations/{0}/send" -f [uri]::EscapeDataString($conversationId)) -Body $sendPayload
  if (([int]$send.status -eq 200) -or ([int]$send.status -eq 502)) {
    $outcome = if ([int]$send.status -eq 200) { 'PASS' } else { 'WARN' }
    $note = if ([int]$send.status -eq 200) { 'provider_sent' } else { 'provider_send_error_but_endpoint_persisted' }
    Add-Result -Step 'crm:conversations:send' -Outcome $outcome -Response $send -Note $note
  } else {
    Add-Result -Step 'crm:conversations:send' -Outcome 'FAIL' -Response $send -Note 'unexpected_status'
  }

  if (-not $SkipAi) {
    $aiSuggestPayload = @{ request = @{ request_id = (New-Id); tenant_id = $TenantId; tone = 'consultivo' } }
    $aiSuggest = Invoke-Api -Method 'POST' -Path ("/v1/crm/conversations/{0}/ai/suggest-reply" -f [uri]::EscapeDataString($conversationId)) -Body $aiSuggestPayload
    [void](Require-Status -Step 'crm:ai:suggest-reply' -Response $aiSuggest -Expected @(200))

    $aiQualifyPayload = @{ request = @{ request_id = (New-Id); tenant_id = $TenantId } }
    $aiQualify = Invoke-Api -Method 'POST' -Path ("/v1/crm/conversations/{0}/ai/qualify" -f [uri]::EscapeDataString($conversationId)) -Body $aiQualifyPayload
    [void](Require-Status -Step 'crm:ai:qualify' -Response $aiQualify -Expected @(200))

    $aiExecutePayload = @{
      request = @{
        request_id = (New-Id)
        tenant_id = $TenantId
        action = 'update_stage'
        client_request_id = "smoke-ai-exec-$((New-Id).Substring(0,8))"
        payload = @{
          to_stage = 'contacted'
          trigger = 'first_contact_attempt'
          reason_code = 'ai_stage_update'
        }
      }
    }
    $aiExecute = Invoke-Api -Method 'POST' -Path ("/v1/crm/conversations/{0}/ai/execute" -f [uri]::EscapeDataString($conversationId)) -Body $aiExecutePayload
    [void](Require-Status -Step 'crm:ai:execute-update-stage' -Response $aiExecute -Expected @(200))
  }
} else {
  $fallbackResponse = [pscustomobject]@{ method = 'GET'; path = '/v1/crm/conversations'; status = 0 }
  Add-Result -Step 'crm:messages:list' -Outcome 'FAIL' -Response $fallbackResponse -Note 'conversation_not_found_for_smoke'
}

$qr = Invoke-Api -Method 'GET' -Path ("/v1/whatsapp/evolution/qr?tenant_id={0}" -f [uri]::EscapeDataString($TenantId))
if (([int]$qr.status -eq 200) -or ([int]$qr.status -eq 202)) {
  Add-Result -Step 'whatsapp:evolution:qr' -Outcome 'PASS' -Response $qr -Note 'qr_or_connected_state'
} else {
  Add-Result -Step 'whatsapp:evolution:qr' -Outcome 'FAIL' -Response $qr -Note 'qr_endpoint_unavailable'
}

$outboundValidatePayload = @{
  queue_item_id = (New-Id)
  tenant_id = $TenantId
  trace_id = "trace-$((New-Id).Substring(0,8))"
  idempotency_key = "idem-$((New-Id).Substring(0,8))"
  context = @{ type = 'manual'; context_id = 'ctx-smoke'; module_source = 'mod-02-whatsapp-crm' }
  recipient = @{ phone_e164 = '+5511999999999' }
  message = @{ type = 'text'; text = 'hello smoke' }
  retry_policy = @{ max_attempts = 3; backoff_ms = 500 }
  created_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.000Z')
}
$outboundValidate = Invoke-Api -Method 'POST' -Path '/provider/evolution/outbound/validate' -Body $outboundValidatePayload
[void](Require-Status -Step 'provider:evolution:outbound:validate' -Response $outboundValidate -Expected @(200))

$passCount = @($results | Where-Object { $_.outcome -eq 'PASS' }).Count
$warnCount = @($results | Where-Object { $_.outcome -eq 'WARN' }).Count
$failCount = @($results | Where-Object { $_.outcome -eq 'FAIL' }).Count

$summary = [pscustomobject]@{
  run_at = (Get-Date).ToString('s')
  base_url = $BaseUrl
  tenant_id = $TenantId
  pass = $passCount
  warn = $warnCount
  fail = $failCount
  total = $results.Count
}

$report = [pscustomobject]@{
  summary = $summary
  results = $results
}

$report | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $OutputPath

Status-Line ("PASS=$passCount WARN=$warnCount FAIL=$failCount TOTAL=$($results.Count)")
Status-Line ("Report: $OutputPath")

$results | Format-Table -AutoSize

if ($failCount -gt 0) {
  exit 1
}
