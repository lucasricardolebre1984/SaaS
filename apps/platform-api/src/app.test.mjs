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

let server;
let baseUrl;
let storageDir;
let customerStorageDir;

test.before(async () => {
  storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fabio-orch-'));
  customerStorageDir = path.join(storageDir, 'customers');
  server = http.createServer(
    createApp({
      orchestrationStorageDir: storageDir,
      customerStorageDir
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
      customerStorageDir
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
