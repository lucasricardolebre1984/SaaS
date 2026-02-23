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
