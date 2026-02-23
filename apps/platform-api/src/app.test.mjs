import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('GET /health returns ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('POST /v1/owner-concierge/interaction accepts valid request', async () => {
  const res = await fetch(`${baseUrl}/v1/owner-concierge/interaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validOwnerRequest())
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.response.status, 'accepted');
  assert.equal(body.response.owner_command.name, 'owner.command.create');
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
