import { randomUUID } from 'node:crypto';
import {
  evolutionWebhookValid,
  outboundQueueValid,
  ownerInteractionValid
} from './schemas.mjs';

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ownerSessionStateFromRequest(request) {
  if (request.operation === 'toggle_continuous_mode') {
    if (request.payload?.enabled) {
      return { mode: 'continuous', state: 'active_continuous' };
    }
    return { mode: 'one-shot', state: 'paused' };
  }

  if (request.operation === 'send_message') {
    return { mode: 'one-shot', state: 'awaiting_user' };
  }

  return { mode: 'one-shot', state: 'idle' };
}

function avatarStateFromRequest(request) {
  if (request.operation === 'avatar_config_upsert') {
    if (request.payload?.enabled) {
      return {
        enabled: true,
        state: 'ready',
        voice_profile: request.payload.voice_profile ?? 'owner-default'
      };
    }
    return { enabled: false, state: 'disabled' };
  }

  if (request.operation === 'toggle_continuous_mode' && request.payload?.enabled) {
    return { enabled: true, state: 'ready', voice_profile: 'owner-default' };
  }

  return { enabled: false, state: 'disabled' };
}

export function createApp() {
  return async function app(req, res) {
    const { method, url } = req;

    if (method === 'GET' && url === '/health') {
      return json(res, 200, { status: 'ok', service: 'app-platform-api' });
    }

    if (method === 'POST' && url === '/v1/owner-concierge/interaction') {
      const body = await readJsonBody(req);
      if (body === null) {
        return json(res, 400, { error: 'invalid_json' });
      }

      const validation = ownerInteractionValid(body);
      if (!validation.ok) {
        return json(res, 400, {
          error: 'validation_error',
          details: validation.errors
        });
      }

      const request = body.request;
      const session_state = ownerSessionStateFromRequest(request);
      const avatar_state = avatarStateFromRequest(request);

      return json(res, 200, {
        response: {
          request_id: request.request_id,
          status: 'accepted',
          owner_command: {
            command_id: randomUUID(),
            correlation_id: randomUUID(),
            name: 'owner.command.create'
          },
          session_state,
          avatar_state,
          assistant_output: {
            text: request.operation === 'send_message'
              ? 'Interaction accepted for orchestration.'
              : 'Operation accepted.'
          }
        }
      });
    }

    if (method === 'POST' && url === '/provider/evolution/webhook') {
      const body = await readJsonBody(req);
      if (body === null) {
        return json(res, 400, { error: 'invalid_json' });
      }

      const validation = evolutionWebhookValid(body);
      if (!validation.ok) {
        return json(res, 400, {
          error: 'validation_error',
          details: validation.errors
        });
      }

      return json(res, 200, {
        status: 'accepted',
        normalized: {
          tenant_id: body.tenant_id,
          event_type: body.event_type,
          message_id: body.payload.message_id,
          delivery_state: body.payload.delivery_state ?? 'unknown'
        }
      });
    }

    if (method === 'POST' && url === '/provider/evolution/outbound/validate') {
      const body = await readJsonBody(req);
      if (body === null) {
        return json(res, 400, { error: 'invalid_json' });
      }

      const validation = outboundQueueValid(body);
      if (!validation.ok) {
        return json(res, 400, {
          error: 'validation_error',
          details: validation.errors
        });
      }

      return json(res, 200, {
        status: 'valid',
        queue_item_id: body.queue_item_id
      });
    }

    return json(res, 404, { error: 'not_found' });
  };
}
