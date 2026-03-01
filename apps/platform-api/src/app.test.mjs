import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './app.mjs';

function validOwnerRequest() {
  return {
    request: {
      request_id: '4fee0174-1f86-4be2-9293-a2ea58023dd3',
      tenant_id: 'tenant_automania',
      session_id: '67c28929-5ff7-48ef-bdcc-6f7f4dc6580b',
      operation: 'send_message',
      channel: 'ui-chat',
      payload: {
        text: 'Oi'
      }
    }
  };
}

function validInteractionConfirmationActionRequest(confirmationId, decision = 'approve') {
  return {
    request: {
      request_id: '4fee0174-1f86-4be2-9293-a2ea58023dd4',
      tenant_id: 'tenant_automania',
      session_id: '67c28929-5ff7-48ef-bdcc-6f7f4dc6580b',
      confirmation_id: confirmationId,
      decision
    }
  };
}

function validRuntimeConfigUpsertRequest(overrides = {}) {
  return {
    request: {
      request_id: '3d7ad25d-0501-4292-a227-2d2f1f37ff2c',
      tenant_id: 'tenant_automania',
      config: {
        openai: {
          api_key: 'tenant-openai-key',
          model: 'gpt-5.1-mini',
          vision_enabled: true,
          voice_enabled: true,
          image_generation_enabled: true,
          image_read_enabled: true
        },
        personas: {
          owner_concierge_prompt: 'Seja objetivo e execute ordens do proprietario.',
          whatsapp_agent_prompt: 'Atenda com clareza e registre intencao.'
        },
        execution: {
          confirmations_enabled: false
        }
      },
      ...overrides
    }
  };
}

function validOwnerAudioTranscriptionRequest(overrides = {}) {
  return {
    request: {
      request_id: '5a6ac2d4-5f2a-4f86-a5e7-3da35c33377d',
      tenant_id: 'tenant_automania',
      session_id: '67c28929-5ff7-48ef-bdcc-6f7f4dc6580b',
      audio_base64: Buffer.from('fake-audio-bytes').toString('base64'),
      mime_type: 'audio/webm',
      filename: 'audio.webm',
      language: 'pt',
      ...overrides
    }
  };
}

function validOwnerAudioSpeechRequest(overrides = {}) {
  return {
    request: {
      request_id: 'f18e976d-87f5-4fa1-b398-0885176f1772',
      tenant_id: 'tenant_automania',
      session_id: '67c28929-5ff7-48ef-bdcc-6f7f4dc6580b',
      text: 'Teste de voz continua.',
      voice: 'shimmer',
      model: 'gpt-4o-mini-tts',
      speed: 1.12,
      response_format: 'mp3',
      ...overrides
    }
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRoutingPolicyWithSingleRule(rule) {
  return {
    version: '1.0.0',
    default_route: {
      target_module: 'mod-02-whatsapp-crm',
      task_type: 'crm.followup.send',
      priority: 'normal',
      simulate_failure: false
    },
    rules: [rule]
  };
}

function buildExecutionPolicy(rules = []) {
  return {
    version: '1.0.0',
    default_decision: {
      decision: 'allow',
      requires_confirmation: false,
      reason_code: 'default_allow'
    },
    rules
  };
}

function validWebhookRequest() {
  return {
    event_id: '402893a1-14c1-4ad7-abf2-f83f7dce4c3f',
    tenant_id: 'tenant_automania',
    provider: 'evolution-api',
    instance_id: 'instance-001',
    event_type: 'message.inbound',
    occurred_at: '2026-02-23T12:00:00.000Z',
    trace_id: 'trace-12345678',
    signature: 'sig-12345678',
    payload: {
      message_id: 'provider-msg-1',
      message_type: 'text',
      raw: {}
    }
  };
}

function validCustomerCreateManualRequest() {
  return {
    request: {
      request_id: 'fcece7b7-f855-4d2f-876f-4908f4cf7de5',
      tenant_id: 'tenant_automania',
      origin: 'manual_owner',
      source_module: 'mod-01-owner-concierge',
      customer: {
        customer_id: '6a317f2d-9334-4f2f-9246-b71f264f4a83',
        external_key: 'manual-owner-001',
        display_name: 'Joao Cliente',
        primary_phone: '+5511988887777',
        primary_email: 'joao@example.com',
        status: 'active',
        metadata: {
          notes: 'manual seed'
        }
      }
    }
  };
}

function validCustomerCreateLeadRequest() {
  return {
    request: {
      request_id: 'f5550d0a-85c8-4539-84d8-51bd90fca925',
      tenant_id: 'tenant_automania',
      origin: 'lead_conversion',
      source_module: 'mod-02-whatsapp-crm',
      customer: {
        customer_id: '35c84f2c-b6be-4aa0-9342-1e77e0de02da',
        external_key: 'lead-conv-001',
        display_name: 'Maria Lead',
        primary_phone: '+5511977776666',
        status: 'active'
      },
      lead: {
        lead_id: '9dc658ba-9108-4879-a7ef-d0dc3066e9d2',
        stage: 'won'
      }
    }
  };
}

function validAppointmentCreateRequest() {
  return {
    request: {
      request_id: '0f9c83dc-fcc8-4a3e-ab0c-79f5ec311654',
      tenant_id: 'tenant_automania',
      source_module: 'mod-01-owner-concierge',
      appointment: {
        appointment_id: 'f47d5f66-bbbf-4ad2-9189-57f7da8e7a07',
        external_key: 'appt-001',
        title: 'Reuniao com cliente VIP',
        description: 'Discussao proposta comercial',
        start_at: '2026-03-01T14:00:00.000Z',
        end_at: '2026-03-01T15:00:00.000Z',
        timezone: 'America/Sao_Paulo',
        status: 'scheduled'
      }
    }
  };
}

function validReminderCreateRequest() {
  return {
    request: {
      request_id: 'fb8b710e-9bf0-40c0-987d-f4a2444998ec',
      tenant_id: 'tenant_automania',
      source_module: 'mod-01-owner-concierge',
      reminder: {
        reminder_id: 'ac01f70b-d860-43d3-81f1-5a65b5fb1b84',
        appointment_id: 'f47d5f66-bbbf-4ad2-9189-57f7da8e7a07',
        external_key: 'rem-001',
        schedule_at: '2026-03-01T13:30:00.000Z',
        channel: 'whatsapp',
        message: 'Lembrete da reuniao em 30 minutos',
        recipient: {
          phone_e164: '+5511991234567'
        }
      }
    }
  };
}

function validChargeCreateRequest(overrides = {}) {
  return {
    request: {
      request_id: 'a9f3e0e2-f341-471e-9f7d-2f6bc53a73d2',
      tenant_id: 'tenant_automania',
      source_module: 'mod-01-owner-concierge',
      correlation_id: 'd7c30858-896f-426a-8dbf-77ca208164af',
      charge: {
        charge_id: 'd6b12368-4fba-42e2-8d49-6f18b057f799',
        customer_id: '6a317f2d-9334-4f2f-9246-b71f264f4a83',
        external_key: 'charge-ext-001',
        amount: 129.9,
        currency: 'BRL',
        due_date: '2026-03-10',
        status: 'open',
        metadata: {
          source: 'tests'
        }
      },
      ...overrides
    }
  };
}

function validPaymentCreateRequest(chargeId, overrides = {}) {
  return {
    request: {
      request_id: '48fbd5db-5790-4c15-94dd-f2f8f1b146f0',
      tenant_id: 'tenant_automania',
      source_module: 'mod-05-faturamento-cobranca',
      correlation_id: 'f50291a7-ff47-4aba-aa7a-56a9b9a39d87',
      payment: {
        payment_id: '12f44352-ec96-4f73-a7a4-82ea4497f762',
        charge_id: chargeId,
        external_key: 'payment-ext-001',
        amount: 129.9,
        currency: 'BRL',
        paid_at: '2026-03-10T13:00:00.000Z',
        status: 'confirmed'
      },
      ...overrides
    }
  };
}

function validLeadCreateRequest(overrides = {}) {
  return {
    request: {
      request_id: '4f65d057-b5e8-4f65-8ccf-42a9b44e0f92',
      tenant_id: 'tenant_automania',
      source_module: 'mod-02-whatsapp-crm',
      lead: {
        lead_id: '96de31ad-4604-4bb4-b1f1-7a91058f7670',
        external_key: 'lead-ext-001',
        display_name: 'Lead Principal',
        phone_e164: '+5511988877665',
        source_channel: 'whatsapp',
        stage: 'new'
      },
      ...overrides
    }
  };
}

function validCampaignCreateRequest(overrides = {}) {
  return {
    request: {
      request_id: '9f5f2ff8-eeca-4f3e-9cd2-4ec50f2519d3',
      tenant_id: 'tenant_automania',
      source_module: 'mod-02-whatsapp-crm',
      campaign: {
        campaign_id: '58b43d83-bb4d-4ad9-bfe2-e14f2f78e31b',
        external_key: 'campaign-ext-001',
        name: 'Campanha Follow-up VIP',
        channel: 'whatsapp',
        audience_segment: 'vip',
        state: 'draft'
      },
      ...overrides
    }
  };
}

function validFollowupCreateRequest(overrides = {}) {
  return {
    request: {
      request_id: '9454f302-3218-4ca8-814f-eb8ecb5514f6',
      tenant_id: 'tenant_automania',
      source_module: 'mod-02-whatsapp-crm',
      followup: {
        followup_id: 'f89b34ad-1158-4fd1-8c7c-a273a049fb2d',
        campaign_id: '58b43d83-bb4d-4ad9-bfe2-e14f2f78e31b',
        external_key: 'followup-ext-001',
        phone_e164: '+5511966677788',
        message: 'Lembrete follow-up automatizado',
        schedule_at: '2026-03-01T13:00:00.000Z',
        channel: 'whatsapp',
        status: 'pending'
      },
      ...overrides
    }
  };
}

function validOwnerMemoryCreateRequest(overrides = {}) {
  return {
    request: {
      request_id: 'd54f038f-e91b-48da-a8eb-fcd417e3e4fa',
      tenant_id: 'tenant_automania',
      session_id: '67c28929-5ff7-48ef-bdcc-6f7f4dc6580b',
      correlation_id: 'ec87c6d5-5cc7-4ba8-9c79-95acba46bc30',
      memory: {
        memory_id: '79d2a77f-dd0f-4f5e-a09f-51eeccef4de6',
        external_key: 'memory-ext-001',
        source: 'user_message',
        content: 'Lembrar de ligar para cliente premium',
        tags: ['followup', 'premium'],
        salience_score: 0.82
      },
      ...overrides
    }
  };
}

function validOutboundQueueRequest() {
  return {
    queue_item_id: '4b95088b-0868-444f-b5f8-97dabbdad6d1',
    tenant_id: 'tenant_automania',
    trace_id: 'trace-abcdefgh',
    idempotency_key: 'idem-key-123456',
    context: {
      type: 'manual',
      context_id: 'ctx-001',
      module_source: 'mod-02-whatsapp-crm'
    },
    recipient: {
      phone_e164: '+5511999999999'
    },
    message: {
      type: 'text',
      text: 'hello'
    },
    retry_policy: {
      max_attempts: 3,
      backoff_ms: 500
    },
    created_at: '2026-02-23T12:00:00.000Z'
  };
}

async function drainWorker(baseUrl, limit = 10) {
  const res = await fetch(`${baseUrl}/internal/worker/module-tasks/drain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ limit })
  });
  assert.equal(res.status, 200);
  return res.json();
}

async function drainCrmCollections(baseUrl, limit = 10) {
  const res = await fetch(`${baseUrl}/internal/worker/crm-collections/drain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ limit })
  });
  assert.equal(res.status, 200);
  return res.json();
}

async function drainCrmFollowups(baseUrl, limit = 10, forceFailure = false) {
  const res = await fetch(`${baseUrl}/internal/worker/crm-followups/drain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ limit, force_failure: forceFailure })
  });
  assert.equal(res.status, 200);
  return res.json();
}

let server;
let baseUrl;
let storageDir;
let customerStorageDir;
let agendaStorageDir;
let billingStorageDir;
let leadStorageDir;
let crmAutomationStorageDir;
let ownerMemoryStorageDir;

test.before(async () => {
  storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-orch-'));
  customerStorageDir = path.join(storageDir, 'customers');
  agendaStorageDir = path.join(storageDir, 'agenda');
  billingStorageDir = path.join(storageDir, 'billing');
  leadStorageDir = path.join(storageDir, 'crm');
  crmAutomationStorageDir = path.join(storageDir, 'crm-automation');
  ownerMemoryStorageDir = path.join(storageDir, 'owner-memory');
  server = http.createServer(
    createApp({
      orchestrationStorageDir: storageDir,
      customerStorageDir,
      agendaStorageDir,
      billingStorageDir,
      leadStorageDir,
      crmAutomationStorageDir,
      ownerMemoryStorageDir
    })
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await fs.rm(storageDir, { recursive: true, force: true });
});

test('GET /health returns runtime metadata', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'app-platform-api');
  assert.equal(body.orchestration.backend, 'file');
  assert.ok(typeof body.orchestration.storage_dir === 'string');
  assert.ok(typeof body.orchestration.policy_path === 'string');
  assert.ok(typeof body.orchestration.queue_file === 'string');
  assert.equal(body.customers.backend, 'file');
  assert.ok(typeof body.customers.storage_dir === 'string');
  assert.equal(body.agenda.backend, 'file');
  assert.ok(typeof body.agenda.storage_dir === 'string');
  assert.equal(body.billing.backend, 'file');
  assert.ok(typeof body.billing.storage_dir === 'string');
  assert.equal(body.crm_leads.backend, 'file');
  assert.ok(typeof body.crm_leads.storage_dir === 'string');
  assert.equal(body.crm_automation.backend, 'file');
  assert.ok(typeof body.crm_automation.storage_dir === 'string');
  assert.equal(body.owner_memory.backend, 'file');
  assert.ok(typeof body.owner_memory.storage_dir === 'string');
  assert.ok(typeof body.owner_memory.embedding_mode === 'string');
  assert.ok(typeof body.owner_confirmation.max_pending_per_tenant === 'number');
  assert.ok(typeof body.owner_confirmation.ttl_seconds === 'number');
});

test('owner memory endpoints create/list/promote and emit promotion trace event', async () => {
  const createRes = await fetch(`${baseUrl}/v1/owner-concierge/memory/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validOwnerMemoryCreateRequest())
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.entry.status, 'candidate');
  assert.ok(
    createBody.response.entry.embedding_ref === null ||
    String(createBody.response.entry.embedding_ref).startsWith('local:')
  );

  const sessionId = createBody.response.entry.session_id;
  const listRes = await fetch(
    `${baseUrl}/v1/owner-concierge/memory/entries?tenant_id=tenant_automania&session_id=${sessionId}`
  );
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some((item) => item.memory_id === createBody.response.entry.memory_id));

  const promoteRes = await fetch(`${baseUrl}/v1/owner-concierge/context/promotions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: '0624ef21-2f4c-46fb-b42f-7b47783afe1c',
        tenant_id: 'tenant_automania',
        memory_id: createBody.response.entry.memory_id,
        correlation_id: 'ec87c6d5-5cc7-4ba8-9c79-95acba46bc30',
        action: 'promote',
        reason_code: 'HIGH_PRIORITY'
      }
    })
  });
  assert.equal(promoteRes.status, 200);
  const promoteBody = await promoteRes.json();
  assert.equal(promoteBody.response.entry.status, 'promoted');
  assert.equal(promoteBody.response.orchestration.lifecycle_event_name, 'owner.context.promoted');

  const summaryRes = await fetch(`${baseUrl}/v1/owner-concierge/context/summary?tenant_id=tenant_automania`);
  assert.equal(summaryRes.status, 200);
  const summaryBody = await summaryRes.json();
  assert.ok(summaryBody.promoted_count >= 1);

  const retrievalRes = await fetch(`${baseUrl}/v1/owner-concierge/context/retrieve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: 'f5743fb6-7c99-44cf-a4ef-6da105f7b89e',
        tenant_id: 'tenant_automania',
        query: {
          text: 'ligar cliente premium',
          session_id: sessionId,
          top_k: 5
        }
      }
    })
  });
  assert.equal(retrievalRes.status, 200);
  const retrievalBody = await retrievalRes.json();
  assert.equal(retrievalBody.status, 'ok');
  assert.ok(retrievalBody.retrieval.retrieved_count >= 1);
  assert.ok(retrievalBody.retrieval.items.some((item) => item.memory_id === createBody.response.entry.memory_id));

  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${promoteBody.response.orchestration.correlation_id}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();
  assert.ok(traceBody.events.some((item) => item.name === 'owner.context.promoted'));
});

test('owner memory create returns embedding_error in strict openai mode without key', async () => {
  const strictStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-embed-strict-'));
  const strictOwnerMemoryStorageDir = path.join(strictStorageDir, 'owner-memory');
  const strictServer = http.createServer(
    createApp({
      orchestrationStorageDir: strictStorageDir,
      ownerMemoryStorageDir: strictOwnerMemoryStorageDir,
      ownerEmbeddingMode: 'openai',
      openaiApiKey: ''
    })
  );
  await new Promise((resolve) => strictServer.listen(0, '127.0.0.1', resolve));
  const strictAddress = strictServer.address();
  const strictBaseUrl = `http://127.0.0.1:${strictAddress.port}`;

  try {
    const res = await fetch(`${strictBaseUrl}/v1/owner-concierge/memory/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerMemoryCreateRequest({
        request_id: '60471f2b-4925-416d-bf6c-b63335bb8b2e',
        memory: {
          memory_id: 'a13f72b9-619b-4b6a-b4dd-d63ea0b4f30d',
          external_key: 'strict-openai-no-key',
          source: 'user_message',
          content: 'teste strict openai sem chave',
          salience_score: 0.5
        }
      }))
    });
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'embedding_error');
  } finally {
    await new Promise((resolve, reject) => strictServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(strictStorageDir, { recursive: true, force: true });
  }
});

test('owner memory create succeeds in strict openai mode with local mock provider', async () => {
  let providerCalled = false;
  const mockProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/embeddings') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalled = true;
    const authHeader = req.headers.authorization ?? '';
    if (!String(authHeader).startsWith('Bearer test-key')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(body.model, 'text-embedding-3-small');
    assert.ok(typeof body.input === 'string' && body.input.length > 0);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      data: [{
        embedding: [0.12, -0.23, 0.41, 0.07, -0.19, 0.31]
      }]
    }));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const strictStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-embed-openai-ok-'));
  const strictOwnerMemoryStorageDir = path.join(strictStorageDir, 'owner-memory');
  const strictServer = http.createServer(
    createApp({
      orchestrationStorageDir: strictStorageDir,
      ownerMemoryStorageDir: strictOwnerMemoryStorageDir,
      ownerEmbeddingMode: 'openai',
      openaiApiKey: 'test-key',
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => strictServer.listen(0, '127.0.0.1', resolve));
  const strictAddress = strictServer.address();
  const strictBaseUrl = `http://127.0.0.1:${strictAddress.port}`;

  try {
    const res = await fetch(`${strictBaseUrl}/v1/owner-concierge/memory/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerMemoryCreateRequest({
        request_id: '9f8e0f6a-f1ec-4690-bd8e-0253d86c1d1d',
        memory: {
          memory_id: 'f16e17a6-a3b2-4ac2-a98d-b994110ad2de',
          external_key: 'strict-openai-success',
          source: 'user_message',
          content: 'teste openai mock sucesso',
          tags: ['mock', 'openai'],
          salience_score: 0.7
        }
      }))
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response.status, 'created');
    assert.ok(String(body.response.entry.embedding_ref).startsWith('openai:'));
    assert.equal(providerCalled, true);
  } finally {
    await new Promise((resolve, reject) => strictServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(strictStorageDir, { recursive: true, force: true });
  }
});

test('owner memory maintenance reembed supports dry-run and execute by tenant', async () => {
  const maintenanceStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-embed-backfill-'));
  const maintenanceOwnerMemoryStorageDir = path.join(maintenanceStorageDir, 'owner-memory');
  const maintenanceServer = http.createServer(
    createApp({
      orchestrationStorageDir: maintenanceStorageDir,
      ownerMemoryStorageDir: maintenanceOwnerMemoryStorageDir,
      ownerEmbeddingMode: 'off'
    })
  );
  await new Promise((resolve) => maintenanceServer.listen(0, '127.0.0.1', resolve));
  const maintenanceAddress = maintenanceServer.address();
  const maintenanceBaseUrl = `http://127.0.0.1:${maintenanceAddress.port}`;

  try {
    const createRes = await fetch(`${maintenanceBaseUrl}/v1/owner-concierge/memory/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerMemoryCreateRequest({
        request_id: '4e8d26e6-703f-4659-8319-6692757ca646',
        memory: {
          memory_id: '3512fcb4-5659-4545-a86a-94e3927d3f03',
          external_key: 'backfill-target-001',
          source: 'user_message',
          content: 'entrada antiga sem embedding para backfill',
          tags: ['legacy'],
          salience_score: 0.6
        }
      }))
    });
    assert.equal(createRes.status, 200);
    const createBody = await createRes.json();
    assert.equal(createBody.response.entry.embedding_ref, null);

    const dryRunRes = await fetch(`${maintenanceBaseUrl}/internal/maintenance/owner-memory/reembed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant_automania',
        limit: 20,
        dry_run: true,
        mode: 'local'
      })
    });
    assert.equal(dryRunRes.status, 200);
    const dryRunBody = await dryRunRes.json();
    assert.equal(dryRunBody.scanned_count, 1);
    assert.equal(dryRunBody.updated_count, 0);
    assert.equal(dryRunBody.processed[0].status, 'dry_run');

    const executeRes = await fetch(`${maintenanceBaseUrl}/internal/maintenance/owner-memory/reembed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant_automania',
        limit: 20,
        dry_run: false,
        mode: 'local'
      })
    });
    assert.equal(executeRes.status, 200);
    const executeBody = await executeRes.json();
    assert.equal(executeBody.scanned_count, 1);
    assert.equal(executeBody.updated_count, 1);
    assert.equal(executeBody.processed[0].status, 'updated');
    assert.ok(String(executeBody.processed[0].embedding_ref).startsWith('local:'));

    const listRes = await fetch(
      `${maintenanceBaseUrl}/v1/owner-concierge/memory/entries?tenant_id=tenant_automania&session_id=67c28929-5ff7-48ef-bdcc-6f7f4dc6580b`
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    const targetEntry = listBody.items.find((item) => item.memory_id === createBody.response.entry.memory_id);
    assert.ok(targetEntry);
    assert.ok(String(targetEntry.embedding_ref).startsWith('local:'));
  } finally {
    await new Promise((resolve, reject) => maintenanceServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(maintenanceStorageDir, { recursive: true, force: true });
  }
});

test('owner memory reembed scheduler supports upsert, list, and run-due', async () => {
  const schedulerStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-embed-scheduler-'));
  const schedulerOwnerMemoryStorageDir = path.join(schedulerStorageDir, 'owner-memory');
  const schedulerMaintenanceStorageDir = path.join(schedulerStorageDir, 'owner-memory-maintenance');
  const schedulerServer = http.createServer(
    createApp({
      orchestrationStorageDir: schedulerStorageDir,
      ownerMemoryStorageDir: schedulerOwnerMemoryStorageDir,
      ownerMemoryMaintenanceStorageDir: schedulerMaintenanceStorageDir,
      ownerEmbeddingMode: 'off'
    })
  );
  await new Promise((resolve) => schedulerServer.listen(0, '127.0.0.1', resolve));
  const schedulerAddress = schedulerServer.address();
  const schedulerBaseUrl = `http://127.0.0.1:${schedulerAddress.port}`;

  try {
    const createRes = await fetch(`${schedulerBaseUrl}/v1/owner-concierge/memory/entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerMemoryCreateRequest({
        request_id: '0f37ee0a-6af7-4d4e-8a6d-4b03e6799baf',
        memory: {
          memory_id: '434e08a0-9d11-4064-a9e7-5f19f3809f30',
          external_key: 'scheduler-target-001',
          source: 'user_message',
          content: 'entrada antiga para scheduler',
          tags: ['scheduler'],
          salience_score: 0.55
        }
      }))
    });
    assert.equal(createRes.status, 200);

    const upsertRes = await fetch(`${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant_automania',
        interval_minutes: 60,
        limit: 10,
        mode: 'local',
        enabled: true,
        run_now: true
      })
    });
    assert.equal(upsertRes.status, 200);
    const upsertBody = await upsertRes.json();
    assert.equal(upsertBody.schedule.tenant_id, 'tenant_automania');
    assert.equal(upsertBody.schedule.interval_minutes, 60);
    assert.equal(upsertBody.schedule.mode, 'local');
    assert.equal(upsertBody.schedule.enabled, true);
    assert.ok(upsertBody.schedule.next_run_at);

    const listRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules?tenant_id=tenant_automania`
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.count, 1);

    const pauseRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/pause`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania'
        })
      }
    );
    assert.equal(pauseRes.status, 200);
    const pauseBody = await pauseRes.json();
    assert.equal(pauseBody.schedule.enabled, false);
    assert.equal(pauseBody.schedule.next_run_at, null);

    const resumeRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/resume`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania',
          run_now: true
        })
      }
    );
    assert.equal(resumeRes.status, 200);
    const resumeBody = await resumeRes.json();
    assert.equal(resumeBody.schedule.enabled, true);
    assert.ok(resumeBody.schedule.next_run_at);

    const dryRunRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/run-due`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania',
          force: true,
          dry_run: true,
          max_concurrency: 1
        })
      }
    );
    assert.equal(dryRunRes.status, 200);
    const dryRunBody = await dryRunRes.json();
    assert.equal(dryRunBody.max_concurrency, 1);
    assert.equal(dryRunBody.executed_count, 1);
    assert.equal(dryRunBody.failed_count, 0);
    assert.equal(dryRunBody.skipped_locked_count, 0);
    assert.equal(dryRunBody.runs[0].updated_count, 0);
    assert.equal(dryRunBody.runs[0].processed[0].status, 'dry_run');

    const executeRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/run-due`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania',
          force: true,
          max_concurrency: 2
        })
      }
    );
    assert.equal(executeRes.status, 200);
    const executeBody = await executeRes.json();
    assert.equal(executeBody.max_concurrency, 2);
    assert.equal(executeBody.executed_count, 1);
    assert.equal(executeBody.failed_count, 0);
    assert.equal(executeBody.skipped_locked_count, 0);
    assert.equal(executeBody.runs[0].updated_count, 1);
    assert.ok(String(executeBody.runs[0].processed[0].embedding_ref).startsWith('local:'));
    assert.ok(executeBody.runs[0].run_id);

    const maintenanceTraceRes = await fetch(
      `${schedulerBaseUrl}/internal/orchestration/trace?correlation_id=${executeBody.runs[0].run_id}`
    );
    assert.equal(maintenanceTraceRes.status, 200);
    const maintenanceTraceBody = await maintenanceTraceRes.json();
    const maintenanceEventNames = maintenanceTraceBody.events.map((item) => item.name);
    assert.ok(maintenanceEventNames.includes('owner.memory.reembed.started'));
    assert.ok(maintenanceEventNames.includes('owner.memory.reembed.completed'));

    const scheduleAfterRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules?tenant_id=tenant_automania`
    );
    assert.equal(scheduleAfterRes.status, 200);
    const scheduleAfterBody = await scheduleAfterRes.json();
    assert.equal(scheduleAfterBody.items[0].last_result.updated_count, 1);
    assert.ok(scheduleAfterBody.items[0].last_run_at);
    assert.ok(scheduleAfterBody.items[0].next_run_at);
    assert.equal(scheduleAfterBody.items[0].run_lock, undefined);

    const runsRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/runs?tenant_id=tenant_automania&limit=5`
    );
    assert.equal(runsRes.status, 200);
    const runsBody = await runsRes.json();
    assert.ok(runsBody.count >= 2);
    assert.equal(runsBody.items[0].tenant_id, 'tenant_automania');
  } finally {
    await new Promise((resolve, reject) => schedulerServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(schedulerStorageDir, { recursive: true, force: true });
  }
});

test('owner memory reembed scheduler skips tenant when lock is active', async () => {
  const schedulerStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-embed-scheduler-lock-'));
  const schedulerApp = createApp({
    orchestrationStorageDir: schedulerStorageDir,
    ownerMemoryStorageDir: path.join(schedulerStorageDir, 'owner-memory'),
    ownerMemoryMaintenanceStorageDir: path.join(schedulerStorageDir, 'owner-memory-maintenance'),
    ownerEmbeddingMode: 'off'
  });
  const schedulerServer = http.createServer(schedulerApp);
  await new Promise((resolve) => schedulerServer.listen(0, '127.0.0.1', resolve));
  const schedulerAddress = schedulerServer.address();
  const schedulerBaseUrl = `http://127.0.0.1:${schedulerAddress.port}`;

  try {
    const upsertRes = await fetch(`${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_id: 'tenant_automania',
        interval_minutes: 60,
        limit: 10,
        mode: 'local',
        enabled: true,
        run_now: true
      })
    });
    assert.equal(upsertRes.status, 200);

    const lockResult = await schedulerApp.ownerMemoryMaintenanceStore.acquireRunLock('tenant_automania', {
      run_id: 'e9889f31-1f5f-4de2-94d8-7a89aa4b3931',
      owner: 'test-lock',
      lock_ttl_seconds: 180
    });
    assert.equal(lockResult.ok, true);

    const runDueRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/run-due`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania',
          force: true,
          dry_run: true,
          max_concurrency: 1
        })
      }
    );
    assert.equal(runDueRes.status, 200);
    const runDueBody = await runDueRes.json();
    assert.equal(runDueBody.executed_count, 0);
    assert.equal(runDueBody.failed_count, 0);
    assert.equal(runDueBody.skipped_locked_count, 1);
    assert.equal(runDueBody.runs[0].status, 'skipped_locked');
  } finally {
    await new Promise((resolve, reject) => schedulerServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(schedulerStorageDir, { recursive: true, force: true });
  }
});

test('owner memory reembed scheduler validates upsert payload', async () => {
  const schedulerStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-embed-scheduler-val-'));
  const schedulerServer = http.createServer(
    createApp({
      orchestrationStorageDir: schedulerStorageDir,
      ownerMemoryStorageDir: path.join(schedulerStorageDir, 'owner-memory'),
      ownerMemoryMaintenanceStorageDir: path.join(schedulerStorageDir, 'owner-memory-maintenance'),
      ownerEmbeddingMode: 'off'
    })
  );
  await new Promise((resolve) => schedulerServer.listen(0, '127.0.0.1', resolve));
  const schedulerAddress = schedulerServer.address();
  const schedulerBaseUrl = `http://127.0.0.1:${schedulerAddress.port}`;

  try {
    const missingTenantRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          interval_minutes: 60
        })
      }
    );
    assert.equal(missingTenantRes.status, 400);
    const missingTenantBody = await missingTenantRes.json();
    assert.equal(missingTenantBody.error, 'missing_tenant_id');

    const invalidIntervalRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania',
          interval_minutes: 0
        })
      }
    );
    assert.equal(invalidIntervalRes.status, 400);
    const invalidIntervalBody = await invalidIntervalRes.json();
    assert.equal(invalidIntervalBody.error, 'invalid_interval_minutes');

    const invalidModeRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'tenant_automania',
          interval_minutes: 60,
          mode: 'bad-mode'
        })
      }
    );
    assert.equal(invalidModeRes.status, 400);
    const invalidModeBody = await invalidModeRes.json();
    assert.equal(invalidModeBody.error, 'invalid_mode');

    const invalidMaxConcurrencyRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/run-due`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          force: true,
          max_concurrency: 0
        })
      }
    );
    assert.equal(invalidMaxConcurrencyRes.status, 400);
    const invalidMaxConcurrencyBody = await invalidMaxConcurrencyRes.json();
    assert.equal(invalidMaxConcurrencyBody.error, 'invalid_max_concurrency');

    const invalidLockTtlRes = await fetch(
      `${schedulerBaseUrl}/internal/maintenance/owner-memory/reembed/schedules/run-due`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          force: true,
          lock_ttl_seconds: 10
        })
      }
    );
    assert.equal(invalidLockTtlRes.status, 400);
    const invalidLockTtlBody = await invalidLockTtlRes.json();
    assert.equal(invalidLockTtlBody.error, 'invalid_lock_ttl_seconds');
  } finally {
    await new Promise((resolve, reject) => schedulerServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(schedulerStorageDir, { recursive: true, force: true });
  }
});

test('owner context retrieval validates malformed request', async () => {
  const res = await fetch(`${baseUrl}/v1/owner-concierge/context/retrieve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: '4a946824-32ba-41db-a2f7-a451bbeb5462',
        tenant_id: 'tenant_automania',
        query: {}
      }
    })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_error');
});

test('owner context retrieval supports vector-ready hybrid strategy', async () => {
  const createRes = await fetch(`${baseUrl}/v1/owner-concierge/memory/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validOwnerMemoryCreateRequest({
      request_id: '31a88cf0-eb45-4dcb-9ad5-b4388de6b489',
      memory: {
        memory_id: 'a5bb1964-dbf5-4e4e-af4f-be87696f500e',
        external_key: 'memory-ext-vector-001',
        source: 'user_message',
        content: 'Cliente premium pediu proposta detalhada',
        tags: ['premium', 'proposta'],
        salience_score: 0.9
      }
    }))
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();

  const promoteRes = await fetch(`${baseUrl}/v1/owner-concierge/context/promotions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: '704d1ed6-43a4-45a0-9115-f97a6e4f0de5',
        tenant_id: 'tenant_automania',
        memory_id: createBody.response.entry.memory_id,
        action: 'promote'
      }
    })
  });
  assert.equal(promoteRes.status, 200);

  const retrievalRes = await fetch(`${baseUrl}/v1/owner-concierge/context/retrieve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: '32056d11-579a-4fdd-9d94-0d1f8f085dcf',
        tenant_id: 'tenant_automania',
        query: {
          text: 'proposta cliente vip',
          strategy: 'vector-ready',
          top_k: 3
        }
      }
    })
  });
  assert.equal(retrievalRes.status, 200);
  const retrievalBody = await retrievalRes.json();
  assert.equal(retrievalBody.retrieval.strategy, 'hybrid-lexical-vector-v1');
  assert.ok(retrievalBody.retrieval.items.length >= 1);
  assert.ok(typeof retrievalBody.retrieval.items[0].lexical_score === 'number');
  assert.ok(typeof retrievalBody.retrieval.items[0].vector_score === 'number');
});

test('owner context retrieval rejects invalid query_embedding vector', async () => {
  const res = await fetch(`${baseUrl}/v1/owner-concierge/context/retrieve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: '6316c69b-5da9-4f93-b6d2-977fdbec3888',
        tenant_id: 'tenant_automania',
        query: {
          text: 'teste embedding curto',
          query_embedding: [0.1, 0.2]
        }
      }
    })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_error');
});

test('owner memory promotion rejects invalid transition', async () => {
  const createRes = await fetch(`${baseUrl}/v1/owner-concierge/memory/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validOwnerMemoryCreateRequest({
      request_id: '1e72af75-bca2-4d22-af8a-211f95ddaf4b',
      memory: {
        memory_id: '8d7a59c6-1d5f-484e-a0bf-71a39cc4f8cd',
        external_key: 'memory-ext-002',
        source: 'system_note',
        content: 'Memoria para teste de transicao',
        salience_score: 0.4
      }
    }))
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();

  const promotePayload = {
    request: {
      request_id: 'fcd8f947-33af-4f11-b42a-264268f6838d',
      tenant_id: 'tenant_automania',
      memory_id: createBody.response.entry.memory_id,
      action: 'promote'
    }
  };
  const first = await fetch(`${baseUrl}/v1/owner-concierge/context/promotions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(promotePayload)
  });
  assert.equal(first.status, 200);

  const second = await fetch(`${baseUrl}/v1/owner-concierge/context/promotions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        ...promotePayload.request,
        request_id: '9a8fe00d-a876-429f-ab6e-611297fcf8ca'
      }
    })
  });
  assert.equal(second.status, 400);
  const secondBody = await second.json();
  assert.equal(secondBody.error, 'transition_error');
});

test('POST/PATCH/GET /v1/crm/leads creates, transitions, and lists leads', async () => {
  const createRes = await fetch(`${baseUrl}/v1/crm/leads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validLeadCreateRequest())
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.lead.stage, 'new');
  assert.equal(createBody.response.orchestration.lifecycle_event_name, 'crm.lead.created');

  const leadId = createBody.response.lead.lead_id;
  const patchRes = await fetch(`${baseUrl}/v1/crm/leads/${leadId}/stage`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: 'a4118875-c275-46d8-af7a-5dca2b5d5b1d',
        tenant_id: 'tenant_automania',
        source_module: 'mod-02-whatsapp-crm',
        changes: {
          to_stage: 'contacted',
          trigger: 'first_contact_attempt'
        }
      }
    })
  });
  assert.equal(patchRes.status, 200);
  const patchBody = await patchRes.json();
  assert.equal(patchBody.response.status, 'updated');
  assert.equal(patchBody.response.lead.stage, 'contacted');

  const invalidPatch = await fetch(`${baseUrl}/v1/crm/leads/${leadId}/stage`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: 'b6d2fc7d-a31d-47f0-96d5-94f9ef7ca3c1',
        tenant_id: 'tenant_automania',
        source_module: 'mod-02-whatsapp-crm',
        changes: {
          to_stage: 'won',
          trigger: 'invalid_skip'
        }
      }
    })
  });
  assert.equal(invalidPatch.status, 400);
  const invalidBody = await invalidPatch.json();
  assert.equal(invalidBody.error, 'transition_error');

  const listRes = await fetch(`${baseUrl}/v1/crm/leads?tenant_id=tenant_automania`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some((item) => item.lead_id === leadId));
});

test('POST/PATCH/GET /v1/crm/campaigns creates, transitions, and lists campaigns', async () => {
  const createRes = await fetch(`${baseUrl}/v1/crm/campaigns`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validCampaignCreateRequest())
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.campaign.state, 'draft');
  assert.equal(createBody.response.orchestration.lifecycle_event_name, 'crm.campaign.created');

  const campaignId = createBody.response.campaign.campaign_id;
  const patchRes = await fetch(`${baseUrl}/v1/crm/campaigns/${campaignId}/state`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: 'a78d2f03-68a5-48e4-8de3-14f4f74693cc',
        tenant_id: 'tenant_automania',
        source_module: 'mod-02-whatsapp-crm',
        changes: {
          to_state: 'scheduled',
          trigger: 'schedule_campaign'
        }
      }
    })
  });
  assert.equal(patchRes.status, 200);
  const patchBody = await patchRes.json();
  assert.equal(patchBody.response.status, 'updated');
  assert.equal(patchBody.response.campaign.state, 'scheduled');
  assert.equal(patchBody.response.orchestration.lifecycle_event_name, 'crm.campaign.state.changed');

  const invalidPatch = await fetch(`${baseUrl}/v1/crm/campaigns/${campaignId}/state`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: '9f2d8b16-2d45-4714-bfc9-ed8f13b66adb',
        tenant_id: 'tenant_automania',
        source_module: 'mod-02-whatsapp-crm',
        changes: {
          to_state: 'completed',
          trigger: 'invalid_direct_close'
        }
      }
    })
  });
  assert.equal(invalidPatch.status, 400);
  const invalidBody = await invalidPatch.json();
  assert.equal(invalidBody.error, 'transition_error');

  const listRes = await fetch(`${baseUrl}/v1/crm/campaigns?tenant_id=tenant_automania`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some((item) => item.campaign_id === campaignId));
});

test('POST/GET /v1/crm/followups + worker drain success path', async () => {
  const campaignRes = await fetch(`${baseUrl}/v1/crm/campaigns`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validCampaignCreateRequest({
      request_id: 'a86fa107-c24b-42f4-8309-a2a7f283eb73',
      campaign: {
        campaign_id: 'ead88931-5f6f-46f8-a7dd-429f48ece8d4',
        external_key: 'campaign-ext-002',
        name: 'Campanha Follow-up Success',
        channel: 'whatsapp',
        state: 'scheduled'
      }
    }))
  });
  assert.equal(campaignRes.status, 200);

  const createRes = await fetch(`${baseUrl}/v1/crm/followups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validFollowupCreateRequest({
      request_id: 'cbf8a73a-1069-4f53-90f7-cf6796ab2dbe',
      correlation_id: 'f85b7308-a7af-451d-8370-e50f7de39f6a',
      followup: {
        followup_id: '2ff4c0fc-cf06-4d8a-86d7-26b95f2fa3a7',
        campaign_id: 'ead88931-5f6f-46f8-a7dd-429f48ece8d4',
        external_key: 'followup-ext-002',
        phone_e164: '+5511944443333',
        message: 'Follow-up success dispatch',
        schedule_at: '2025-01-01T09:00:00.000Z',
        channel: 'whatsapp',
        status: 'pending'
      }
    }))
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.orchestration.lifecycle_event_name, 'crm.followup.scheduled');

  const drain = await drainCrmFollowups(baseUrl, 10, false);
  assert.ok(drain.processed_count >= 1);
  assert.ok(drain.processed.some((item) => item.followup_id === createBody.response.followup.followup_id));

  const listRes = await fetch(`${baseUrl}/v1/crm/followups?tenant_id=tenant_automania`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  const followup = listBody.items.find((item) => item.followup_id === createBody.response.followup.followup_id);
  assert.ok(followup);
  assert.equal(followup.status, 'sent');

  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${createBody.response.orchestration.correlation_id}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();
  assert.ok(traceBody.events.some((item) => item.name === 'crm.followup.scheduled'));
  assert.ok(traceBody.events.some((item) => item.name === 'crm.followup.sent'));
});

test('POST /internal/worker/crm-followups/drain marks failed followup on provider failure', async () => {
  const createRes = await fetch(`${baseUrl}/v1/crm/followups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validFollowupCreateRequest({
      request_id: '16e9a560-a6c7-4141-9710-b4f83663f243',
      correlation_id: '1aa7b13d-90f9-4eac-af57-71ec95e67e70',
      followup: {
        followup_id: '6113d975-cded-4f22-b31e-c7f23ad9e707',
        campaign_id: null,
        external_key: 'followup-ext-003',
        phone_e164: '+5511933322211',
        message: 'please fail this dispatch',
        schedule_at: '2025-01-01T08:00:00.000Z',
        channel: 'whatsapp',
        status: 'pending'
      }
    }))
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  const correlationId = createBody.response.orchestration.correlation_id;

  const drain = await drainCrmFollowups(baseUrl, 10, false);
  assert.ok(drain.processed.some((item) => item.followup_id === createBody.response.followup.followup_id));
  assert.ok(drain.failed_count >= 1);

  const failedListRes = await fetch(`${baseUrl}/v1/crm/followups?tenant_id=tenant_automania&status=failed`);
  assert.equal(failedListRes.status, 200);
  const failedList = await failedListRes.json();
  assert.ok(failedList.items.some((item) => item.followup_id === createBody.response.followup.followup_id));

  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();
  assert.ok(traceBody.events.some((item) => item.name === 'crm.followup.failed'));
});

test('POST/GET /v1/billing/charges creates and lists charges', async () => {
  const createPayload = validChargeCreateRequest({
    request_id: 'a0b39a4d-c0e7-4923-a7bb-f5c6398a1a9a',
    charge: {
      charge_id: 'db62cb67-4d48-4b03-b14e-549857256eb9',
      customer_id: '35c84f2c-b6be-4aa0-9342-1e77e0de02da',
      external_key: 'charge-ext-101',
      amount: 249.5,
      currency: 'BRL',
      due_date: '2026-03-20',
      status: 'open'
    }
  });

  const createRes = await fetch(`${baseUrl}/v1/billing/charges`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.charge.external_key, 'charge-ext-101');
  assert.equal(createBody.response.orchestration.lifecycle_event_name, 'billing.charge.created');

  const listRes = await fetch(`${baseUrl}/v1/billing/charges?tenant_id=tenant_automania`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some((item) => item.charge_id === createBody.response.charge.charge_id));
});

test('collection-request + payment confirmation emit billing trace and update status', async () => {
  const chargePayload = validChargeCreateRequest({
    request_id: '79e381f5-c48d-4258-b3b9-156eb0c2e713',
    charge: {
      charge_id: 'f47c19d0-cb67-4669-89b0-f4812dcf4ee8',
      customer_id: '6a317f2d-9334-4f2f-9246-b71f264f4a83',
      external_key: 'charge-ext-202',
      amount: 399.9,
      currency: 'BRL',
      due_date: '2026-03-25',
      status: 'open'
    }
  });

  const chargeRes = await fetch(`${baseUrl}/v1/billing/charges`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(chargePayload)
  });
  assert.equal(chargeRes.status, 200);
  const chargeBody = await chargeRes.json();
  const chargeId = chargeBody.response.charge.charge_id;

  const collectionRes = await fetch(
    `${baseUrl}/v1/billing/charges/${chargeId}/collection-request`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: '252819ce-d5f0-4f48-84d7-b7b95dd5e6b6',
          tenant_id: 'tenant_automania',
          source_module: 'mod-01-owner-concierge',
          correlation_id: '36ba0f41-dfbb-44ec-94fc-c20576e2206d',
          collection: {
            recipient: {
              phone_e164: '+5511991112233'
            },
            message: 'Cobranca amigavel: favor confirmar pagamento.'
          }
        }
      })
    }
  );
  assert.equal(collectionRes.status, 200);
  const collectionBody = await collectionRes.json();
  assert.equal(collectionBody.response.status, 'collection_requested');
  assert.equal(collectionBody.response.charge.status, 'collection_requested');
  assert.equal(collectionBody.response.orchestration.lifecycle_event_name, 'billing.collection.requested');
  assert.ok(collectionBody.response.orchestration.command_id);

  const crmDrain = await drainCrmCollections(baseUrl, 10);
  assert.ok(crmDrain.processed_count >= 1);

  const paymentRes = await fetch(`${baseUrl}/v1/billing/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validPaymentCreateRequest(chargeId, {
      request_id: 'b5c788a7-1000-4210-b8c6-73f8f5de7380',
      correlation_id: collectionBody.response.orchestration.correlation_id,
      payment: {
        payment_id: 'ac260c62-6a4b-4f5b-a9e1-05c4d99f9fd0',
        charge_id: chargeId,
        external_key: 'payment-ext-202',
        amount: 399.9,
        currency: 'BRL',
        paid_at: '2026-03-25T15:30:00.000Z',
        status: 'confirmed'
      }
    }))
  });
  assert.equal(paymentRes.status, 200);
  const paymentBody = await paymentRes.json();
  assert.equal(paymentBody.response.status, 'created');
  assert.equal(paymentBody.response.charge.status, 'paid');
  assert.equal(paymentBody.response.orchestration.lifecycle_event_name, 'billing.payment.confirmed');

  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${collectionBody.response.orchestration.correlation_id}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();
  assert.ok(traceBody.commands.some((item) => item.name === 'billing.collection.dispatch.request'));
  assert.ok(traceBody.events.some((item) => item.name === 'billing.collection.requested'));
  assert.ok(
    traceBody.events.some(
      (item) => item.name === 'billing.collection.sent' || item.name === 'billing.collection.failed'
    )
  );
  assert.ok(traceBody.events.some((item) => item.name === 'billing.payment.confirmed'));
});

test('billing endpoints validate malformed payloads', async () => {
  const invalidCharge = validChargeCreateRequest({
    request_id: 'ec97f09b-dab2-48bd-ab15-62c4ecf505df',
    charge: {
      charge_id: '3a71cf0d-18d3-4a05-8df4-67aeab8c4cd7',
      customer_id: '35c84f2c-b6be-4aa0-9342-1e77e0de02da',
      external_key: 'charge-ext-invalid',
      amount: 0,
      currency: 'BRL'
    }
  });

  const invalidChargeRes = await fetch(`${baseUrl}/v1/billing/charges`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(invalidCharge)
  });
  assert.equal(invalidChargeRes.status, 400);

  const validChargeRes = await fetch(`${baseUrl}/v1/billing/charges`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validChargeCreateRequest({
      request_id: 'f53b8dcb-7c88-46f4-918a-f6ead0f6dba4',
      charge: {
        charge_id: '9483b112-2cea-4d38-b730-1ae4140a22a8',
        customer_id: '35c84f2c-b6be-4aa0-9342-1e77e0de02da',
        external_key: 'charge-ext-303',
        amount: 199.9,
        currency: 'BRL',
        status: 'open'
      }
    }))
  });
  assert.equal(validChargeRes.status, 200);
  const validChargeBody = await validChargeRes.json();

  const invalidCollectionRes = await fetch(
    `${baseUrl}/v1/billing/charges/${validChargeBody.response.charge.charge_id}/collection-request`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: '0704ab9d-c3f7-4017-abcf-f41995ff5227',
          tenant_id: 'tenant_automania',
          collection: {
            recipient: {}
          }
        }
      })
    }
  );
  assert.equal(invalidCollectionRes.status, 400);
});

test('POST/PATCH /v1/agenda/appointments creates and updates appointment', async () => {
  const createRes = await fetch(`${baseUrl}/v1/agenda/appointments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validAppointmentCreateRequest())
  });
  assert.equal(createRes.status, 200);
  const createBody = await createRes.json();
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.appointment.title, 'Reuniao com cliente VIP');

  const updateRes = await fetch(
    `${baseUrl}/v1/agenda/appointments/${createBody.response.appointment.appointment_id}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: 'de2460c2-7f5a-46dc-8964-c9451eeff2ca',
          tenant_id: 'tenant_automania',
          source_module: 'mod-01-owner-concierge',
          changes: {
            status: 'confirmed'
          }
        }
      })
    }
  );
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.response.status, 'updated');
  assert.equal(updateBody.response.appointment.status, 'confirmed');
});

test('POST /v1/agenda/reminders emits scheduling trace and dispatch command', async () => {
  const reminderRes = await fetch(`${baseUrl}/v1/agenda/reminders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validReminderCreateRequest())
  });
  assert.equal(reminderRes.status, 200);
  const reminderBody = await reminderRes.json();
  assert.equal(reminderBody.response.status, 'created');
  assert.equal(reminderBody.response.reminder.status, 'sent');
  assert.ok(reminderBody.response.orchestration.dispatch_command_id);
  assert.ok(reminderBody.response.orchestration.lifecycle_events.includes('agenda.reminder.scheduled'));
  assert.ok(reminderBody.response.orchestration.lifecycle_events.includes('agenda.reminder.sent'));

  const listRes = await fetch(`${baseUrl}/v1/agenda/reminders?tenant_id=tenant_automania`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some((item) => item.reminder_id === reminderBody.response.reminder.reminder_id));

  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${reminderBody.response.orchestration.correlation_id}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();
  assert.ok(traceBody.commands.some((item) => item.name === 'agenda.reminder.dispatch.request'));
  assert.ok(traceBody.events.some((item) => item.name === 'agenda.reminder.scheduled'));
  assert.ok(traceBody.events.some((item) => item.name === 'agenda.reminder.sent'));
});

test('POST /v1/agenda/reminders is idempotent by tenant+external_key', async () => {
  const payload = validReminderCreateRequest();
  payload.request.request_id = 'd0f8a790-64dd-4a34-a894-5ba933cc101c';

  const first = await fetch(`${baseUrl}/v1/agenda/reminders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.response.status, 'idempotent');
});

test('POST /v1/agenda/reminders rejects whatsapp reminder without e164 recipient', async () => {
  const payload = validReminderCreateRequest();
  payload.request.request_id = 'f895f3e2-f2a2-4da5-a627-f53636fae3f4';
  delete payload.request.reminder.recipient.phone_e164;

  const res = await fetch(`${baseUrl}/v1/agenda/reminders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_error');
});

test('POST /v1/customers creates customer and emits lifecycle event', async () => {
  const createRes = await fetch(`${baseUrl}/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validCustomerCreateManualRequest())
  });
  const createBody = await createRes.json();
  if (createRes.status !== 200) {
    throw new Error(`customer-create-failure: ${JSON.stringify(createBody)}`);
  }
  assert.equal(createBody.response.status, 'created');
  assert.equal(createBody.response.customer.display_name, 'Joao Cliente');
  assert.equal(createBody.response.orchestration.lifecycle_event_name, 'customer.created');

  const listRes = await fetch(`${baseUrl}/v1/customers?tenant_id=tenant_automania`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.count >= 1);
  assert.ok(listBody.items.some((item) => item.customer_id === createBody.response.customer.customer_id));

  const getRes = await fetch(
    `${baseUrl}/v1/customers/${createBody.response.customer.customer_id}?tenant_id=tenant_automania`
  );
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.customer.display_name, 'Joao Cliente');

  const correlationId = createBody.response.orchestration.correlation_id;
  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();
  assert.ok(traceBody.commands.some((item) => item.name === 'customer.record.upsert'));
  assert.ok(traceBody.events.some((item) => item.name === 'customer.created'));
});

test('POST /v1/customers is idempotent by tenant+external_key', async () => {
  const payload = validCustomerCreateManualRequest();
  payload.request.request_id = '86f0fd95-7f07-4933-a5e4-a0ff04920ce9';

  const first = await fetch(`${baseUrl}/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.response.status, 'idempotent');
  assert.equal(firstBody.response.orchestration.lifecycle_event_name, null);

  const secondPayload = validCustomerCreateManualRequest();
  secondPayload.request.request_id = '3db8de6b-f673-43a8-b57d-ab37ca8b453f';
  secondPayload.request.customer.display_name = 'Nome Ignorado Por Idempotencia';
  const second = await fetch(`${baseUrl}/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(secondPayload)
  });
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.response.status, 'idempotent');
  assert.equal(secondBody.response.customer.customer_id, firstBody.response.customer.customer_id);
  assert.equal(secondBody.response.customer.display_name, firstBody.response.customer.display_name);
});

test('POST /v1/customers accepts lead conversion origin from module 02', async () => {
  const res = await fetch(`${baseUrl}/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validCustomerCreateLeadRequest())
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.response.status, 'created');
  assert.equal(body.response.customer.origin, 'lead_conversion');
  assert.equal(body.response.orchestration.lifecycle_event_name, 'customer.created');
});

test('POST /v1/customers rejects invalid origin/source mapping', async () => {
  const payload = validCustomerCreateLeadRequest();
  payload.request.source_module = 'mod-01-owner-concierge';

  const res = await fetch(`${baseUrl}/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_error');
});

test('POST /v1/owner-concierge/interaction queues module task and trace is preserved', async () => {
  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validOwnerRequest())
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.response.status, 'accepted');
  assert.equal(body.response.owner_command.name, 'owner.command.create');
  assert.equal(body.response.downstream_tasks.length, 1);
  assert.equal(body.response.downstream_tasks[0].status, 'queued');
  assert.equal(body.response.policy_decision.execution_decision, 'allow');
  assert.equal(body.response.policy_decision.requires_confirmation, false);
  assert.equal(body.response.assistant_output.provider, 'local');
  assert.equal(body.response.assistant_output.model, 'deterministic-rule-v1');
  assert.equal(typeof body.response.assistant_output.latency_ms, 'number');
  assert.match(body.response.assistant_output.text, /queued/i);
  assert.equal(body.response.assistant_output.fallback_reason, 'fallback:no_openai_key');

  const correlationId = body.response.owner_command.correlation_id;
  const traceBeforeRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
  );
  assert.equal(traceBeforeRes.status, 200);
  const traceBefore = await traceBeforeRes.json();

  const eventNamesBefore = traceBefore.events.map((item) => item.name);
  assert.ok(eventNamesBefore.includes('owner.command.created'));
  assert.ok(eventNamesBefore.includes('module.task.created'));
  assert.ok(!eventNamesBefore.includes('module.task.accepted'));
  assert.ok(!eventNamesBefore.includes('module.task.completed'));

  const queueRes = await fetch(`${baseUrl}/internal/orchestration/module-task-queue`);
  assert.equal(queueRes.status, 200);
  const queueBody = await queueRes.json();
  assert.ok(queueBody.pending_count >= 1);

  const drainBody = await drainWorker(baseUrl, 10);
  assert.ok(drainBody.processed_count >= 1);

  const traceAfterRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
  );
  assert.equal(traceAfterRes.status, 200);
  const traceAfter = await traceAfterRes.json();
  const eventNamesAfter = traceAfter.events.map((item) => item.name);
  assert.ok(eventNamesAfter.includes('module.task.accepted'));
  assert.ok(eventNamesAfter.includes('module.task.completed'));

  const commandsRaw = await fs.readFile(path.join(storageDir, 'commands.ndjson'), 'utf8');
  const eventsRaw = await fs.readFile(path.join(storageDir, 'events.ndjson'), 'utf8');
  const queueRaw = await fs.readFile(path.join(storageDir, 'module-task-queue.json'), 'utf8');
  assert.match(commandsRaw, /owner\.command\.create/);
  assert.match(eventsRaw, /module\.task\.completed/);
  assert.match(queueRaw, /"history"/);
});

test('POST /v1/owner-concierge/interaction blocks task creation when policy decision is deny', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-policy-deny-'));
  const routingPolicyPath = path.join(policyDir, 'task-routing.policy.json');
  const executionPolicyPath = path.join(policyDir, 'owner-tool-execution-policy.json');

  await fs.writeFile(
    routingPolicyPath,
    JSON.stringify(
      buildRoutingPolicyWithSingleRule({
        id: 'customer_delete_route',
        keywords: ['excluir'],
        route: {
          target_module: 'mod-03-clientes',
          task_type: 'customer.delete.request',
          priority: 'high',
          simulate_failure: false
        }
      }),
      null,
      2
    )
  );
  await fs.writeFile(
    executionPolicyPath,
    JSON.stringify(
      buildExecutionPolicy([{
        rule_id: 'deny_customer_delete',
        task_type: 'customer.delete.request',
        target_module: 'mod-03-clientes',
        decision: 'deny',
        requires_confirmation: false,
        reason_code: 'sensitive_customer_delete'
      }]),
      null,
      2
    )
  );

  const denyServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      taskRoutingPolicyPath: routingPolicyPath,
      taskExecutionPolicyPath: executionPolicyPath
    })
  );
  await new Promise((resolve) => denyServer.listen(0, '127.0.0.1', resolve));
  const denyAddress = denyServer.address();
  const denyBaseUrl = `http://127.0.0.1:${denyAddress.port}`;

  try {
    const payload = validOwnerRequest();
    payload.request.payload.text = 'excluir cliente agora';

    const res = await fetch(`${denyBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response.status, 'accepted');
    assert.equal(body.response.policy_decision.execution_decision, 'deny');
    assert.equal(body.response.policy_decision.requires_confirmation, false);
    assert.equal(body.response.policy_decision.reason_code, 'sensitive_customer_delete');
    assert.equal(body.response.downstream_tasks, undefined);

    const correlationId = body.response.owner_command.correlation_id;
    const traceRes = await fetch(
      `${denyBaseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
    );
    assert.equal(traceRes.status, 200);
    const traceBody = await traceRes.json();
    const eventNames = traceBody.events.map((item) => item.name);
    assert.ok(eventNames.includes('owner.command.created'));
    assert.ok(!eventNames.includes('module.task.created'));
    assert.equal(traceBody.commands.some((item) => item.name === 'module.task.create'), false);
  } finally {
    await new Promise((resolve, reject) => denyServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction creates pending confirmation and approval enqueues task', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-policy-confirm-'));
  const routingPolicyPath = path.join(policyDir, 'task-routing.policy.json');
  const executionPolicyPath = path.join(policyDir, 'owner-tool-execution-policy.json');

  await fs.writeFile(
    routingPolicyPath,
    JSON.stringify(
      buildRoutingPolicyWithSingleRule({
        id: 'billing_writeoff_route',
        keywords: ['perdoar'],
        route: {
          target_module: 'mod-05-faturamento-cobranca',
          task_type: 'billing.writeoff.request',
          priority: 'high',
          simulate_failure: false
        }
      }),
      null,
      2
    )
  );
  await fs.writeFile(
    executionPolicyPath,
    JSON.stringify(
      buildExecutionPolicy([{
        rule_id: 'confirm_billing_writeoff',
        task_type: 'billing.writeoff.request',
        target_module: 'mod-05-faturamento-cobranca',
        decision: 'confirm_required',
        requires_confirmation: true,
        reason_code: 'financial_writeoff'
      }]),
      null,
      2
    )
  );

  const confirmServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      taskRoutingPolicyPath: routingPolicyPath,
      taskExecutionPolicyPath: executionPolicyPath
    })
  );
  await new Promise((resolve) => confirmServer.listen(0, '127.0.0.1', resolve));
  const confirmAddress = confirmServer.address();
  const confirmBaseUrl = `http://127.0.0.1:${confirmAddress.port}`;

  try {
    const payload = validOwnerRequest();
    payload.request.payload.text = 'perdoar cobranca vencida';

    const res = await fetch(`${confirmBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response.status, 'accepted');
    assert.equal(body.response.policy_decision.execution_decision, 'confirm_required');
    assert.equal(body.response.policy_decision.requires_confirmation, true);
    assert.equal(body.response.policy_decision.reason_code, 'financial_writeoff');
    assert.equal(body.response.downstream_tasks, undefined);
    assert.ok(typeof body.response.confirmation.confirmation_id === 'string');
    assert.equal(body.response.confirmation.status, 'pending');
    assert.equal(body.response.confirmation.task_type, 'billing.writeoff.request');
    assert.equal(body.response.confirmation.target_module, 'mod-05-faturamento-cobranca');

    const correlationId = body.response.owner_command.correlation_id;
    const traceRes = await fetch(
      `${confirmBaseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
    );
    assert.equal(traceRes.status, 200);
    const traceBody = await traceRes.json();
    const eventNames = traceBody.events.map((item) => item.name);
    assert.ok(eventNames.includes('owner.command.created'));
    assert.ok(eventNames.includes('owner.confirmation.requested'));
    assert.ok(!eventNames.includes('module.task.created'));
    assert.equal(traceBody.commands.some((item) => item.name === 'module.task.create'), false);

    const approvalPayload = validInteractionConfirmationActionRequest(
      body.response.confirmation.confirmation_id,
      'approve'
    );
    const approvalRes = await fetch(`${confirmBaseUrl}/v1/owner-concierge/interaction-confirmations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(approvalPayload)
    });
    assert.equal(approvalRes.status, 200);
    const approvalBody = await approvalRes.json();
    assert.equal(approvalBody.response.status, 'accepted');
    assert.equal(approvalBody.response.confirmation.status, 'approved');
    assert.equal(approvalBody.response.downstream_task.status, 'queued');

    const traceAfterApprovalRes = await fetch(
      `${confirmBaseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
    );
    assert.equal(traceAfterApprovalRes.status, 200);
    const traceAfterApproval = await traceAfterApprovalRes.json();
    const eventNamesAfterApproval = traceAfterApproval.events.map((item) => item.name);
    assert.ok(eventNamesAfterApproval.includes('module.task.created'));
    assert.ok(eventNamesAfterApproval.includes('owner.confirmation.approved'));
    assert.equal(
      traceAfterApproval.commands.some((item) => item.name === 'module.task.create'),
      true
    );

    const queueRes = await fetch(`${confirmBaseUrl}/internal/orchestration/module-task-queue`);
    assert.equal(queueRes.status, 200);
    const queueBody = await queueRes.json();
    assert.ok(queueBody.pending_count >= 1);

    const secondApprovalRes = await fetch(`${confirmBaseUrl}/v1/owner-concierge/interaction-confirmations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(approvalPayload)
    });
    assert.equal(secondApprovalRes.status, 409);
    const secondApprovalBody = await secondApprovalRes.json();
    assert.equal(secondApprovalBody.error, 'confirmation_not_pending');
  } finally {
    await new Promise((resolve, reject) => confirmServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction-confirmations rejects confirmation without enqueuing task', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-policy-confirm-reject-'));
  const routingPolicyPath = path.join(policyDir, 'task-routing.policy.json');
  const executionPolicyPath = path.join(policyDir, 'owner-tool-execution-policy.json');

  await fs.writeFile(
    routingPolicyPath,
    JSON.stringify(
      buildRoutingPolicyWithSingleRule({
        id: 'billing_writeoff_route',
        keywords: ['perdoar'],
        route: {
          target_module: 'mod-05-faturamento-cobranca',
          task_type: 'billing.writeoff.request',
          priority: 'high',
          simulate_failure: false
        }
      }),
      null,
      2
    )
  );
  await fs.writeFile(
    executionPolicyPath,
    JSON.stringify(
      buildExecutionPolicy([{
        rule_id: 'confirm_billing_writeoff',
        task_type: 'billing.writeoff.request',
        target_module: 'mod-05-faturamento-cobranca',
        decision: 'confirm_required',
        requires_confirmation: true,
        reason_code: 'financial_writeoff'
      }]),
      null,
      2
    )
  );

  const rejectServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      taskRoutingPolicyPath: routingPolicyPath,
      taskExecutionPolicyPath: executionPolicyPath
    })
  );
  await new Promise((resolve) => rejectServer.listen(0, '127.0.0.1', resolve));
  const rejectAddress = rejectServer.address();
  const rejectBaseUrl = `http://127.0.0.1:${rejectAddress.port}`;

  try {
    const payload = validOwnerRequest();
    payload.request.payload.text = 'perdoar cobranca vencida';

    const res = await fetch(`${rejectBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const confirmationId = body.response.confirmation.confirmation_id;
    const correlationId = body.response.owner_command.correlation_id;

    const rejectPayload = validInteractionConfirmationActionRequest(confirmationId, 'reject');
    const rejectRes = await fetch(`${rejectBaseUrl}/v1/owner-concierge/interaction-confirmations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rejectPayload)
    });
    assert.equal(rejectRes.status, 200);
    const rejectBody = await rejectRes.json();
    assert.equal(rejectBody.response.status, 'accepted');
    assert.equal(rejectBody.response.confirmation.status, 'rejected');
    assert.equal(rejectBody.response.downstream_task, undefined);

    const traceRes = await fetch(
      `${rejectBaseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
    );
    assert.equal(traceRes.status, 200);
    const traceBody = await traceRes.json();
    const eventNames = traceBody.events.map((item) => item.name);
    assert.ok(eventNames.includes('owner.confirmation.requested'));
    assert.ok(eventNames.includes('owner.confirmation.rejected'));
    assert.ok(!eventNames.includes('module.task.created'));
    assert.equal(traceBody.commands.some((item) => item.name === 'module.task.create'), false);

    const queueRes = await fetch(`${rejectBaseUrl}/internal/orchestration/module-task-queue`);
    assert.equal(queueRes.status, 200);
    const queueBody = await queueRes.json();
    assert.equal(queueBody.pending_count, 0);
  } finally {
    await new Promise((resolve, reject) => rejectServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('GET /v1/owner-concierge/interaction-confirmations lists queue and per-tenant max pending limit is enforced', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-policy-confirm-list-limit-'));
  const routingPolicyPath = path.join(policyDir, 'task-routing.policy.json');
  const executionPolicyPath = path.join(policyDir, 'owner-tool-execution-policy.json');

  await fs.writeFile(
    routingPolicyPath,
    JSON.stringify(
      buildRoutingPolicyWithSingleRule({
        id: 'billing_writeoff_route',
        keywords: ['perdoar'],
        route: {
          target_module: 'mod-05-faturamento-cobranca',
          task_type: 'billing.writeoff.request',
          priority: 'high',
          simulate_failure: false
        }
      }),
      null,
      2
    )
  );
  await fs.writeFile(
    executionPolicyPath,
    JSON.stringify(
      buildExecutionPolicy([{
        rule_id: 'confirm_billing_writeoff',
        task_type: 'billing.writeoff.request',
        target_module: 'mod-05-faturamento-cobranca',
        decision: 'confirm_required',
        requires_confirmation: true,
        reason_code: 'financial_writeoff'
      }]),
      null,
      2
    )
  );

  const limitServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      taskRoutingPolicyPath: routingPolicyPath,
      taskExecutionPolicyPath: executionPolicyPath,
      ownerConfirmationMaxPendingPerTenant: 1
    })
  );
  await new Promise((resolve) => limitServer.listen(0, '127.0.0.1', resolve));
  const limitAddress = limitServer.address();
  const limitBaseUrl = `http://127.0.0.1:${limitAddress.port}`;

  try {
    const firstPayload = validOwnerRequest();
    firstPayload.request.payload.text = 'perdoar cobranca vencida';

    const firstRes = await fetch(`${limitBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(firstPayload)
    });
    assert.equal(firstRes.status, 200);
    const firstBody = await firstRes.json();
    assert.equal(firstBody.response.confirmation.status, 'pending');

    const listRes = await fetch(
      `${limitBaseUrl}/v1/owner-concierge/interaction-confirmations?tenant_id=tenant_automania&status=pending`
    );
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.tenant_id, 'tenant_automania');
    assert.equal(listBody.status_filter, 'pending');
    assert.equal(listBody.count, 1);
    assert.equal(listBody.items[0].status, 'pending');

    const secondPayload = validOwnerRequest();
    secondPayload.request.request_id = '5618bf8a-9c17-49e2-8b07-c2bd7838f7ac';
    secondPayload.request.payload.text = 'perdoar cobranca vencida novamente';

    const secondRes = await fetch(`${limitBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(secondPayload)
    });
    assert.equal(secondRes.status, 429);
    const secondBody = await secondRes.json();
    assert.equal(secondBody.error, 'confirmation_queue_limit_reached');
    assert.equal(secondBody.details.max_pending_per_tenant, 1);
  } finally {
    await new Promise((resolve, reject) => limitServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction-confirmations blocks expired confirmation by ttl', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-policy-confirm-ttl-'));
  const routingPolicyPath = path.join(policyDir, 'task-routing.policy.json');
  const executionPolicyPath = path.join(policyDir, 'owner-tool-execution-policy.json');

  await fs.writeFile(
    routingPolicyPath,
    JSON.stringify(
      buildRoutingPolicyWithSingleRule({
        id: 'billing_writeoff_route',
        keywords: ['perdoar'],
        route: {
          target_module: 'mod-05-faturamento-cobranca',
          task_type: 'billing.writeoff.request',
          priority: 'high',
          simulate_failure: false
        }
      }),
      null,
      2
    )
  );
  await fs.writeFile(
    executionPolicyPath,
    JSON.stringify(
      buildExecutionPolicy([{
        rule_id: 'confirm_billing_writeoff',
        task_type: 'billing.writeoff.request',
        target_module: 'mod-05-faturamento-cobranca',
        decision: 'confirm_required',
        requires_confirmation: true,
        reason_code: 'financial_writeoff'
      }]),
      null,
      2
    )
  );

  const ttlServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      taskRoutingPolicyPath: routingPolicyPath,
      taskExecutionPolicyPath: executionPolicyPath,
      ownerConfirmationTtlSeconds: 1
    })
  );
  await new Promise((resolve) => ttlServer.listen(0, '127.0.0.1', resolve));
  const ttlAddress = ttlServer.address();
  const ttlBaseUrl = `http://127.0.0.1:${ttlAddress.port}`;

  try {
    const payload = validOwnerRequest();
    payload.request.payload.text = 'perdoar cobranca vencida';
    const interactionRes = await fetch(`${ttlBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(interactionRes.status, 200);
    const interactionBody = await interactionRes.json();
    const confirmationId = interactionBody.response.confirmation.confirmation_id;
    const correlationId = interactionBody.response.owner_command.correlation_id;

    await sleep(1200);

    const approveRes = await fetch(`${ttlBaseUrl}/v1/owner-concierge/interaction-confirmations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validInteractionConfirmationActionRequest(confirmationId, 'approve'))
    });
    assert.equal(approveRes.status, 409);
    const approveBody = await approveRes.json();
    assert.equal(approveBody.error, 'confirmation_expired');
    assert.equal(approveBody.confirmation.status, 'rejected');

    const traceRes = await fetch(
      `${ttlBaseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
    );
    assert.equal(traceRes.status, 200);
    const traceBody = await traceRes.json();
    const eventNames = traceBody.events.map((item) => item.name);
    assert.ok(eventNames.includes('owner.confirmation.rejected'));
    assert.ok(!eventNames.includes('module.task.created'));
  } finally {
    await new Promise((resolve, reject) => ttlServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction returns provider error in strict openai mode without key', async () => {
  const strictStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-owner-openai-strict-'));
  const strictServer = http.createServer(
    createApp({
      orchestrationStorageDir: strictStorageDir,
      ownerResponseMode: 'openai',
      openaiApiKey: ''
    })
  );
  await new Promise((resolve) => strictServer.listen(0, '127.0.0.1', resolve));
  const strictAddress = strictServer.address();
  const strictBaseUrl = `http://127.0.0.1:${strictAddress.port}`;

  try {
    const res = await fetch(`${strictBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerRequest())
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, 'owner_response_provider_error');
  } finally {
    await new Promise((resolve, reject) => strictServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(strictStorageDir, { recursive: true, force: true });
  }
});

test('POST/GET /v1/owner-concierge/runtime-config persists tenant runtime settings', async () => {
  const runtimeStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-runtime-config-'));
  const runtimeServer = http.createServer(
    createApp({
      orchestrationStorageDir: runtimeStorageDir,
      tenantRuntimeConfigStorageDir: runtimeStorageDir
    })
  );
  await new Promise((resolve) => runtimeServer.listen(0, '127.0.0.1', resolve));
  const runtimeAddress = runtimeServer.address();
  const runtimeBaseUrl = `http://127.0.0.1:${runtimeAddress.port}`;

  try {
    const upsertRes = await fetch(`${runtimeBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRuntimeConfigUpsertRequest())
    });
    assert.equal(upsertRes.status, 200);
    const upsertBody = await upsertRes.json();
    assert.equal(upsertBody.response.status, 'accepted');
    assert.equal(upsertBody.response.runtime.owner_response_mode, 'openai');
    assert.equal(upsertBody.response.openai.api_key_configured, true);
    assert.equal(upsertBody.response.execution.confirmations_enabled, false);

    const getRes = await fetch(
      `${runtimeBaseUrl}/v1/owner-concierge/runtime-config?tenant_id=tenant_automania`
    );
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.status, 'ok');
    assert.equal(getBody.runtime.owner_response_mode, 'openai');
    assert.equal(getBody.openai.api_key_configured, true);
    assert.equal(getBody.personas.owner_concierge_prompt.length > 0, true);
  } finally {
    await new Promise((resolve, reject) => runtimeServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(runtimeStorageDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/runtime-config preserves secret keys when omitted in follow-up update', async () => {
  const runtimeStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-runtime-config-preserve-secrets-'));
  const runtimeServer = http.createServer(
    createApp({
      orchestrationStorageDir: runtimeStorageDir,
      tenantRuntimeConfigStorageDir: runtimeStorageDir
    })
  );
  await new Promise((resolve) => runtimeServer.listen(0, '127.0.0.1', resolve));
  const runtimeAddress = runtimeServer.address();
  const runtimeBaseUrl = `http://127.0.0.1:${runtimeAddress.port}`;

  try {
    const firstUpsertRes = await fetch(`${runtimeBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: 'preserve-secrets-upsert-1',
          tenant_id: 'tenant_automania',
          config: {
            openai: {
              api_key: 'tenant-openai-key',
              model: 'gpt-5.1-mini',
              vision_enabled: true,
              voice_enabled: true,
              image_generation_enabled: true,
              image_read_enabled: true
            },
            integrations: {
              crm_evolution: {
                base_url: 'http://127.0.0.1:8080',
                api_key: 'tenant-evolution-key',
                instance_id: 'tenant_automania'
              }
            }
          }
        }
      })
    });
    assert.equal(firstUpsertRes.status, 200);

    const secondUpsertRes = await fetch(`${runtimeBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: 'preserve-secrets-upsert-2',
          tenant_id: 'tenant_automania',
          config: {
            openai: {
              model: 'gpt-5.1'
            },
            integrations: {
              crm_evolution: {
                base_url: 'http://127.0.0.1:8080',
                instance_id: 'tenant_automania'
              }
            }
          }
        }
      })
    });
    assert.equal(secondUpsertRes.status, 200);

    const getRes = await fetch(
      `${runtimeBaseUrl}/v1/owner-concierge/runtime-config?tenant_id=tenant_automania`
    );
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.openai.api_key_configured, true);
    assert.equal(getBody.runtime.model, 'gpt-5.1');
    assert.equal(getBody.integrations.crm_evolution.api_key, '(configured)');
    assert.equal(getBody.integrations.crm_evolution.instance_id, 'tenant_automania');
  } finally {
    await new Promise((resolve, reject) => runtimeServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(runtimeStorageDir, { recursive: true, force: true });
  }
});

test('tenant runtime config applies OpenAI response and disables confirmation workflow', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-runtime-tenant-openai-'));
  const routingPolicyPath = path.join(policyDir, 'task-routing.policy.json');
  const executionPolicyPath = path.join(policyDir, 'owner-tool-execution-policy.json');

  await fs.writeFile(
    routingPolicyPath,
    JSON.stringify(
      buildRoutingPolicyWithSingleRule({
        id: 'billing_writeoff_route',
        keywords: ['perdoar'],
        route: {
          target_module: 'mod-05-faturamento-cobranca',
          task_type: 'billing.writeoff.request',
          priority: 'high',
          simulate_failure: false
        }
      }),
      null,
      2
    )
  );
  await fs.writeFile(
    executionPolicyPath,
    JSON.stringify(
      buildExecutionPolicy([{
        rule_id: 'confirm_billing_writeoff',
        task_type: 'billing.writeoff.request',
        target_module: 'mod-05-faturamento-cobranca',
        decision: 'confirm_required',
        requires_confirmation: true,
        reason_code: 'financial_writeoff'
      }]),
      null,
      2
    )
  );

  let providerCalled = false;
  const mockProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/chat/completions') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalled = true;
    const authHeader = String(req.headers.authorization ?? '');
    if (!authHeader.startsWith('Bearer tenant-openai-key')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: 'gpt-5.1-mini',
      choices: [{
        message: {
          content: 'Resposta tenant runtime OpenAI'
        }
      }]
    }));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      tenantRuntimeConfigStorageDir: policyDir,
      taskRoutingPolicyPath: routingPolicyPath,
      taskExecutionPolicyPath: executionPolicyPath,
      ownerResponseMode: 'auto',
      openaiApiKey: '',
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const configRes = await fetch(`${appBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRuntimeConfigUpsertRequest())
    });
    assert.equal(configRes.status, 200);

    const payload = validOwnerRequest();
    payload.request.payload.text = 'perdoar cobranca vencida';

    const interactionRes = await fetch(`${appBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(interactionRes.status, 200);
    const interactionBody = await interactionRes.json();
    assert.equal(interactionBody.response.assistant_output.provider, 'openai');
    assert.equal(interactionBody.response.assistant_output.text, 'Resposta tenant runtime OpenAI');
    assert.equal(interactionBody.response.policy_decision.execution_decision, 'allow');
    assert.equal(interactionBody.response.policy_decision.requires_confirmation, false);
    assert.equal(interactionBody.response.confirmation, undefined);
    assert.ok(Array.isArray(interactionBody.response.downstream_tasks));
    assert.equal(interactionBody.response.downstream_tasks.length, 1);
    assert.equal(providerCalled, true);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('tenant runtime config enforces strict OpenAI and returns provider error on upstream failure', async () => {
  const policyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-runtime-tenant-openai-strict-'));
  let providerCalledCount = 0;
  const failingProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalledCount += 1;
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream_failure' }));
  });
  await new Promise((resolve) => failingProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = failingProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: policyDir,
      tenantRuntimeConfigStorageDir: policyDir,
      ownerResponseMode: 'auto',
      openaiApiKey: '',
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const configRes = await fetch(`${appBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRuntimeConfigUpsertRequest())
    });
    assert.equal(configRes.status, 200);

    const interactionRes = await fetch(`${appBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerRequest())
    });
    assert.equal(interactionRes.status, 502);
    const interactionBody = await interactionRes.json();
    assert.equal(interactionBody.error, 'owner_response_provider_error');
    assert.match(String(interactionBody.details ?? ''), /openai_all_endpoints_failed/i);
    assert.ok(providerCalledCount >= 1);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => failingProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(policyDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/audio/transcribe uses tenant OpenAI runtime config', async () => {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-owner-audio-transcribe-'));
  let providerCalled = false;
  const mockProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/audio/transcriptions') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalled = true;
    const authHeader = String(req.headers.authorization ?? '');
    if (!authHeader.startsWith('Bearer tenant-openai-key')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      text: 'transcricao teste viva',
      model: 'whisper-1'
    }));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: storageRoot,
      tenantRuntimeConfigStorageDir: storageRoot,
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const configRes = await fetch(`${appBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRuntimeConfigUpsertRequest())
    });
    assert.equal(configRes.status, 200);

    const transcribeRes = await fetch(`${appBaseUrl}/v1/owner-concierge/audio/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerAudioTranscriptionRequest())
    });
    assert.equal(transcribeRes.status, 200);
    const transcribeBody = await transcribeRes.json();
    assert.equal(transcribeBody.response.status, 'accepted');
    assert.equal(transcribeBody.response.transcription.provider, 'openai');
    assert.equal(transcribeBody.response.transcription.text, 'transcricao teste viva');
    assert.equal(providerCalled, true);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(storageRoot, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/audio/speech streams OpenAI TTS audio with tenant key', async () => {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-owner-audio-speech-'));
  let providerCalled = false;
  const mockProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/audio/speech') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalled = true;
    const authHeader = String(req.headers.authorization ?? '');
    if (!authHeader.startsWith('Bearer tenant-openai-key')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(body.model, 'gpt-4o-mini-tts');
    assert.equal(body.voice, 'shimmer');
    assert.equal(body.response_format, 'mp3');
    assert.equal(body.speed, 1.12);
    assert.equal(body.input, 'Teste de voz continua.');

    res.writeHead(200, { 'content-type': 'audio/mpeg' });
    res.end(Buffer.from('fake-mp3-binary'));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: storageRoot,
      tenantRuntimeConfigStorageDir: storageRoot,
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const configRes = await fetch(`${appBaseUrl}/v1/owner-concierge/runtime-config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRuntimeConfigUpsertRequest())
    });
    assert.equal(configRes.status, 200);

    const speechRes = await fetch(`${appBaseUrl}/v1/owner-concierge/audio/speech`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerAudioSpeechRequest())
    });
    assert.equal(speechRes.status, 200);
    assert.equal(speechRes.headers.get('content-type'), 'audio/mpeg');
    assert.equal(speechRes.headers.get('x-owner-speech-provider'), 'openai');
    assert.equal(speechRes.headers.get('x-owner-speech-model'), 'gpt-4o-mini-tts');
    assert.equal(speechRes.headers.get('x-owner-speech-voice'), 'shimmer');
    assert.equal(speechRes.headers.get('x-owner-speech-request-id'), 'f18e976d-87f5-4fa1-b398-0885176f1772');
    const audioBytes = Buffer.from(await speechRes.arrayBuffer());
    assert.equal(audioBytes.toString('utf8'), 'fake-mp3-binary');
    assert.equal(providerCalled, true);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(storageRoot, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/audio/* uses global OpenAI key fallback when tenant key is missing', async () => {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-owner-audio-fallback-'));
  let transcribeCalled = false;
  let speechCalled = false;

  const mockProviderServer = http.createServer(async (req, res) => {
    const authHeader = String(req.headers.authorization ?? '');
    if (!authHeader.startsWith('Bearer global-openai-key')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/audio/transcriptions') {
      transcribeCalled = true;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        text: 'transcricao via fallback global',
        model: 'whisper-1'
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/audio/speech') {
      speechCalled = true;
      res.writeHead(200, { 'content-type': 'audio/mpeg' });
      res.end(Buffer.from('fallback-global-mp3'));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: storageRoot,
      tenantRuntimeConfigStorageDir: storageRoot,
      openaiApiKey: 'global-openai-key',
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const transcribeRes = await fetch(`${appBaseUrl}/v1/owner-concierge/audio/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerAudioTranscriptionRequest())
    });
    assert.equal(transcribeRes.status, 200);
    const transcribeBody = await transcribeRes.json();
    assert.equal(transcribeBody.response.transcription.text, 'transcricao via fallback global');
    assert.equal(transcribeCalled, true);

    const speechRes = await fetch(`${appBaseUrl}/v1/owner-concierge/audio/speech`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validOwnerAudioSpeechRequest())
    });
    assert.equal(speechRes.status, 200);
    assert.equal(speechRes.headers.get('x-owner-speech-provider'), 'openai');
    const speechBytes = Buffer.from(await speechRes.arrayBuffer());
    assert.equal(speechBytes.toString('utf8'), 'fallback-global-mp3');
    assert.equal(speechCalled, true);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(storageRoot, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction uses openai response provider in strict mode with mock', async () => {
  let providerCalled = false;
  const mockProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/chat/completions') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalled = true;
    const authHeader = req.headers.authorization ?? '';
    if (!String(authHeader).startsWith('Bearer test-key')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(body.model, 'gpt-5.1-mini');
    assert.ok(Array.isArray(body.messages));
    assert.ok(body.messages.length >= 2);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: 'gpt-5.1-mini',
      choices: [{
        message: {
          content: 'Resposta mock da OpenAI para owner concierge'
        }
      }]
    }));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const strictStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-owner-openai-ok-'));
  const strictServer = http.createServer(
    createApp({
      orchestrationStorageDir: strictStorageDir,
      ownerResponseMode: 'openai',
      ownerResponseModel: 'gpt-5.1-mini',
      openaiApiKey: 'test-key',
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => strictServer.listen(0, '127.0.0.1', resolve));
  const strictAddress = strictServer.address();
  const strictBaseUrl = `http://127.0.0.1:${strictAddress.port}`;

  try {
    const payload = validOwnerRequest();
    payload.request.payload.text = 'Gerar resposta curta para teste';

    const res = await fetch(`${strictBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response.status, 'accepted');
    assert.equal(body.response.assistant_output.provider, 'openai');
    assert.equal(body.response.assistant_output.model, 'gpt-5.1-mini');
    assert.ok(body.response.assistant_output.latency_ms >= 0);
    assert.equal(body.response.assistant_output.text, 'Resposta mock da OpenAI para owner concierge');
    assert.equal(providerCalled, true);
  } finally {
    await new Promise((resolve, reject) => strictServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(strictStorageDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction forwards inline image and file excerpt to OpenAI payload', async () => {
  let providerCalled = false;
  const mockProviderServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    if (req.url === '/responses') {
      // Force fallback to chat/completions to validate payload shape there.
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'responses_not_available' }));
      return;
    }

    if (req.url !== '/chat/completions') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    providerCalled = true;
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    assert.equal(body.model, 'gpt-5.1-mini');
    assert.ok(Array.isArray(body.messages));
    const userMessage = body.messages.find((item) => item.role === 'user');
    assert.ok(userMessage);
    assert.ok(Array.isArray(userMessage.content));
    const imagePart = userMessage.content.find((item) => item.type === 'image_url');
    assert.ok(imagePart);
    assert.ok(String(imagePart.image_url?.url ?? '').startsWith('data:image/png;base64,'));
    const textPart = userMessage.content.find((item) => item.type === 'text');
    assert.ok(textPart);
    assert.match(String(textPart.text ?? ''), /EXCERTO DO ARQUIVO/i);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: 'gpt-5.1-mini',
      choices: [{
        message: { content: 'Anexos processados com sucesso' }
      }]
    }));
  });
  await new Promise((resolve) => mockProviderServer.listen(0, '127.0.0.1', resolve));
  const providerAddress = mockProviderServer.address();
  const providerBaseUrl = `http://127.0.0.1:${providerAddress.port}`;

  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-owner-openai-attachment-'));
  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: storageDir,
      ownerResponseMode: 'openai',
      ownerResponseModel: 'gpt-5.1-mini',
      openaiApiKey: 'test-key',
      openaiBaseUrl: providerBaseUrl
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const payload = validOwnerRequest();
    payload.request.payload = {
      text: 'Analise os anexos enviados',
      attachments: [
        {
          type: 'image',
          uri: 'upload://local/logo',
          mime_type: 'image/png',
          filename: 'logo.png',
          data_base64: Buffer.from('fake-png-bytes').toString('base64')
        },
        {
          type: 'file',
          uri: 'upload://local/texto',
          mime_type: 'text/plain',
          filename: 'contexto.txt',
          text_excerpt: 'EXCERTO DO ARQUIVO: detalhes importantes para analise'
        }
      ]
    };

    const res = await fetch(`${appBaseUrl}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.response.assistant_output.provider, 'openai');
    assert.equal(body.response.assistant_output.text, 'Anexos processados com sucesso');
    assert.ok(Array.isArray(body.response.assistant_output.attachments));
    assert.equal(body.response.assistant_output.attachments.length, 2);
    assert.equal(providerCalled, true);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockProviderServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(storageDir, { recursive: true, force: true });
  }
});

test('POST /v1/owner-concierge/interaction accepts persona overrides and propagates to task input', async () => {
  const payload = validOwnerRequest();
  payload.request.request_id = '858fcf19-1d4a-4cc5-8a05-6da723b5bb9f';
  payload.request.payload = {
    text: 'Enviar follow-up para lead quente',
    persona_overrides: {
      owner_concierge_prompt: 'Papel: concierge do proprietario. Tom: executivo.',
      whatsapp_agent_prompt: 'Papel: agente whatsapp. Tom: cordial.'
    }
  };

  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.response.status, 'accepted');

  const correlationId = body.response.owner_command.correlation_id;
  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();

  const ownerCommand = traceBody.commands.find((item) => item.name === 'owner.command.create');
  const taskCommand = traceBody.commands.find((item) => item.name === 'module.task.create');
  assert.ok(ownerCommand);
  assert.ok(taskCommand);

  assert.equal(
    ownerCommand.payload.persona_overrides.owner_concierge_prompt,
    payload.request.payload.persona_overrides.owner_concierge_prompt
  );
  assert.equal(
    ownerCommand.payload.persona_overrides.whatsapp_agent_prompt,
    payload.request.payload.persona_overrides.whatsapp_agent_prompt
  );
  assert.equal(
    taskCommand.payload.input.persona_overrides.owner_concierge_prompt,
    payload.request.payload.persona_overrides.owner_concierge_prompt
  );
  assert.equal(
    taskCommand.payload.input.persona_overrides.whatsapp_agent_prompt,
    payload.request.payload.persona_overrides.whatsapp_agent_prompt
  );
});

test('POST /v1/owner-concierge/interaction rejects empty persona_overrides object', async () => {
  const payload = validOwnerRequest();
  payload.request.payload = {
    text: 'Oi',
    persona_overrides: {}
  };

  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_error');
});

test('POST /v1/owner-concierge/interaction rejects invalid request', async () => {
  const payload = validOwnerRequest();
  delete payload.request.payload.text;

  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation_error');
});

test('worker emits module.task.failed for failure route', async () => {
  const payload = validOwnerRequest();
  payload.request.payload.text = 'forcar fail no modulo 2';

  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.response.assistant_output.text, /queued/i);

  await drainWorker(baseUrl, 10);
  const correlationId = body.response.owner_command.correlation_id;
  const traceRes = await fetch(
    `${baseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
  );
  assert.equal(traceRes.status, 200);
  const traceBody = await traceRes.json();

  const eventNames = traceBody.events.map((item) => item.name);
  assert.ok(eventNames.includes('module.task.failed'));
  assert.ok(!eventNames.includes('module.task.completed'));
});

test('routing policy and queued state survive app restart', async () => {
  const payload = validOwnerRequest();
  payload.request.payload.text = 'preciso fazer cobranca vencida';

  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.response.downstream_tasks[0].target_module, 'mod-05-faturamento-cobranca');
  assert.equal(body.response.downstream_tasks[0].task_type, 'billing.collection.request');

  const correlationId = body.response.owner_command.correlation_id;

  const rehydratedServer = http.createServer(
    createApp({
      orchestrationStorageDir: storageDir,
      customerStorageDir,
      agendaStorageDir,
      billingStorageDir,
      leadStorageDir,
      ownerMemoryStorageDir
    })
  );
  await new Promise((resolve) => rehydratedServer.listen(0, '127.0.0.1', resolve));
  const rehydratedPort = rehydratedServer.address().port;
  const rehydratedBaseUrl = `http://127.0.0.1:${rehydratedPort}`;

  try {
    const queueRes = await fetch(`${rehydratedBaseUrl}/internal/orchestration/module-task-queue`);
    assert.equal(queueRes.status, 200);
    const queueBody = await queueRes.json();
    assert.ok(queueBody.pending_count >= 1);

    const drainBody = await drainWorker(rehydratedBaseUrl, 10);
    assert.ok(drainBody.processed_count >= 1);

    const traceRes = await fetch(
      `${rehydratedBaseUrl}/internal/orchestration/trace?correlation_id=${correlationId}`
    );
    assert.equal(traceRes.status, 200);
    const traceBody = await traceRes.json();
    const eventNames = traceBody.events.map((item) => item.name);
    assert.ok(eventNames.includes('module.task.accepted'));
    assert.ok(eventNames.includes('module.task.completed'));
  } finally {
    await new Promise((resolve, reject) => {
      rehydratedServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('GET /internal/orchestration/trace requires correlation_id', async () => {
  const res = await fetch(`${baseUrl}/internal/orchestration/trace`);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'missing_correlation_id');
});

test('POST /provider/evolution/webhook accepts valid request', async () => {
  const res = await fetch(`${baseUrl}/provider/evolution/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validWebhookRequest())
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'accepted');
});

test('POST /provider/evolution/webhook maps raw MESSAGES_UPSERT inbound into CRM lead', async () => {
  const rawWebhookPayload = {
    event: 'MESSAGES_UPSERT',
    instance: 'tenant_automania',
    data: {
      key: {
        id: 'evo-msg-raw-001',
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false
      },
      pushName: 'Cliente Inbox',
      message: {
        conversation: 'Ola, gostaria de atendimento.'
      }
    },
    date_time: '2026-03-01T09:00:00.000Z'
  };

  const webhookRes = await fetch(`${baseUrl}/provider/evolution/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(rawWebhookPayload)
  });
  assert.equal(webhookRes.status, 200);
  const webhookBody = await webhookRes.json();
  assert.equal(webhookBody.status, 'accepted');
  assert.equal(webhookBody.normalized.tenant_id, 'tenant_automania');
  assert.equal(webhookBody.normalized.event_type, 'message.inbound');
  assert.equal(webhookBody.inbound.status, 'created');

  const leadsRes = await fetch(`${baseUrl}/v1/crm/leads?tenant_id=tenant_automania`);
  assert.equal(leadsRes.status, 200);
  const leadsBody = await leadsRes.json();
  const created = leadsBody.items.find((item) => item.external_key === 'wa:+5511999999999');
  assert.ok(created);
  assert.equal(created.phone_e164, '+5511999999999');
  assert.equal(created.source_channel, 'whatsapp');
});

test('POST /provider/evolution/webhook rejects invalid request', async () => {
  const payload = validWebhookRequest();
  delete payload.signature;

  const res = await fetch(`${baseUrl}/provider/evolution/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 400);
});

test('POST /provider/evolution/outbound/validate accepts valid queue item', async () => {
  const res = await fetch(`${baseUrl}/provider/evolution/outbound/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validOutboundQueueRequest())
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'valid');
});

test('POST /provider/evolution/outbound/validate rejects invalid queue item', async () => {
  const payload = validOutboundQueueRequest();
  delete payload.idempotency_key;

  const res = await fetch(`${baseUrl}/provider/evolution/outbound/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 400);
});

test('GET /v1/whatsapp/evolution/qr returns 503 when Evolution not configured', async () => {
  const res = await fetch(`${baseUrl}/v1/whatsapp/evolution/qr`, { method: 'GET' });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error, 'evolution_not_configured');
});

test('GET /v1/whatsapp/evolution/qr returns pending state when provider has no QR yet', async () => {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-evolution-qr-pending-'));
  let connectCalls = 0;
  let createCalls = 0;
  const mockEvolutionServer = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/instance/connect/fabio') {
      connectCalls += 1;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        code: null,
        pairingCode: null,
        count: 0,
        state: 'close'
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/instance/create') {
      createCalls += 1;
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ instance: { instanceName: 'fabio' } }));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise((resolve) => mockEvolutionServer.listen(0, '127.0.0.1', resolve));
  const evolutionAddress = mockEvolutionServer.address();
  const evolutionBaseUrl = `http://127.0.0.1:${evolutionAddress.port}`;

  const appServer = http.createServer(
    createApp({
      orchestrationStorageDir: storageRoot,
      evolutionHttpBaseUrl: evolutionBaseUrl,
      evolutionApiKey: 'evo-key',
      evolutionInstanceId: 'fabio'
    })
  );
  await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
  const appAddress = appServer.address();
  const appBaseUrl = `http://127.0.0.1:${appAddress.port}`;

  try {
    const res = await fetch(`${appBaseUrl}/v1/whatsapp/evolution/qr`, { method: 'GET' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'pending_qr');
    assert.equal(body.code, null);
    assert.equal(body.pairingCode, null);
    assert.equal(body.instanceId, 'fabio');
    assert.equal(createCalls, 0);
    assert.equal(connectCalls >= 2, true);
  } finally {
    await new Promise((resolve, reject) => appServer.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => mockEvolutionServer.close((err) => (err ? reject(err) : resolve())));
    await fs.rm(storageRoot, { recursive: true, force: true });
  }
});
