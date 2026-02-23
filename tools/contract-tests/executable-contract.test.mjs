import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

test('lead funnel transitions reference valid states', () => {
  const funnel = readJson('libs/mod-02-whatsapp-crm/domain/lead-funnel.transitions.json');
  const states = new Set(funnel.states);

  for (const t of funnel.transitions) {
    assert.ok(states.has(t.from), `Invalid from state: ${t.from}`);
    assert.ok(states.has(t.to), `Invalid to state: ${t.to}`);
    assert.ok(typeof t.trigger === 'string' && t.trigger.length > 0, 'Missing trigger');
  }
});

test('lead funnel terminal states do not have normal outbound transitions', () => {
  const funnel = readJson('libs/mod-02-whatsapp-crm/domain/lead-funnel.transitions.json');
  const terminals = new Set(funnel.terminal_states);

  for (const t of funnel.transitions) {
    if (!terminals.has(t.from)) continue;
    assert.ok(
      t.requires_reason_code === true,
      `Terminal state ${t.from} has outbound transition without explicit override`
    );
  }
});

test('orchestration events include mandatory core events', () => {
  const events = readJson('libs/core/orchestration-contracts/schemas/events.schema.json');
  const eventNames = new Set(events.properties.name.enum);

  const mandatory = [
    'owner.command.created',
    'module.task.created',
    'module.task.accepted',
    'module.task.completed',
    'module.task.failed',
    'crm.lead.created',
    'crm.lead.converted',
    'customer.created',
    'customer.updated',
    'billing.collection.requested',
    'billing.collection.sent',
    'billing.collection.failed',
    'agenda.reminder.scheduled',
    'agenda.reminder.sent',
    'agenda.reminder.failed',
    'agenda.reminder.canceled'
  ];

  for (const item of mandatory) {
    assert.ok(eventNames.has(item), `Missing mandatory event: ${item}`);
  }
});

test('orchestration commands include mandatory owner and module commands', () => {
  const commands = readJson('libs/core/orchestration-contracts/schemas/commands.schema.json');
  const commandNames = new Set(commands.properties.name.enum);

  const mandatory = [
    'owner.command.create',
    'module.task.create',
    'crm.whatsapp.send',
    'agenda.reminder.schedule',
    'agenda.reminder.dispatch.request',
    'billing.collection.request',
    'customer.record.upsert'
  ];

  for (const item of mandatory) {
    assert.ok(commandNames.has(item), `Missing mandatory command: ${item}`);
  }
});

test('evolution webhook contract supports required delivery lifecycle event types', () => {
  const webhook = readJson('libs/mod-02-whatsapp-crm/integration/evolution-webhook.schema.json');
  const eventTypes = new Set(webhook.properties.event_type.enum);
  const required = ['message.inbound', 'message.delivery_update', 'message.read_update', 'message.failed'];

  for (const item of required) {
    assert.ok(eventTypes.has(item), `Missing webhook event_type: ${item}`);
  }
});
