import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clone(value) {
  return structuredClone(value);
}

function readJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function safePreview(text) {
  const value = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return '';
  if (value.length <= 120) return value;
  return `${value.slice(0, 117)}...`;
}

function asConversation(item) {
  return {
    conversation_id: item.conversation_id,
    tenant_id: item.tenant_id,
    contact_e164: item.contact_e164,
    display_name: item.display_name ?? null,
    lead_id: item.lead_id ?? null,
    last_message_preview: item.last_message_preview ?? '',
    last_message_at: item.last_message_at ?? null,
    unread_count: Number(item.unread_count ?? 0),
    metadata: item.metadata ?? {},
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function asMessage(item) {
  return {
    message_row_id: item.message_row_id,
    tenant_id: item.tenant_id,
    conversation_id: item.conversation_id,
    provider: item.provider,
    provider_message_id: item.provider_message_id ?? null,
    direction: item.direction,
    message_type: item.message_type,
    text: item.text ?? '',
    delivery_state: item.delivery_state ?? 'unknown',
    occurred_at: item.occurred_at,
    metadata: item.metadata ?? {},
    created_at: item.created_at
  };
}

export function createFileCrmConversationStore(options = {}) {
  const storageDir = path.resolve(
    options.storageDir ?? path.join(process.cwd(), '.runtime-data', 'crm-conversations')
  );
  ensureDirectory(storageDir);
  const storageFilePath = path.join(storageDir, 'conversations.json');
  const state = readJsonFile(storageFilePath, { conversations: [], messages: [] });
  if (!Array.isArray(state.conversations)) state.conversations = [];
  if (!Array.isArray(state.messages)) state.messages = [];

  function persist() {
    writeJsonFile(storageFilePath, state);
  }

  function findConversationByContact(tenantId, contactE164) {
    return state.conversations.find(
      (item) => item.tenant_id === tenantId && item.contact_e164 === contactE164
    ) ?? null;
  }

  function findConversationById(tenantId, conversationId) {
    return state.conversations.find(
      (item) => item.tenant_id === tenantId && item.conversation_id === conversationId
    ) ?? null;
  }

  function findMessageByProviderMessageId(tenantId, providerMessageId) {
    if (!providerMessageId) return null;
    return state.messages.find(
      (item) => item.tenant_id === tenantId && item.provider_message_id === providerMessageId
    ) ?? null;
  }

  return {
    backend: 'file',
    storageDir,
    storageFilePath,
    async listConversations(tenantId, options = {}) {
      const limit = Number(options.limit ?? 100);
      const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
      return state.conversations
        .filter((item) => item.tenant_id === tenantId)
        .sort((a, b) => String(b.last_message_at ?? b.created_at).localeCompare(String(a.last_message_at ?? a.created_at)))
        .slice(0, safeLimit)
        .map((item) => clone(asConversation(item)));
    },
    async getConversationById(tenantId, conversationId) {
      const conversation = findConversationById(tenantId, conversationId);
      return conversation ? clone(asConversation(conversation)) : null;
    },
    async listMessages(tenantId, conversationId, options = {}) {
      const limit = Number(options.limit ?? 200);
      const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200;
      return state.messages
        .filter((item) => item.tenant_id === tenantId && item.conversation_id === conversationId)
        .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))
        .slice(-safeLimit)
        .map((item) => clone(asMessage(item)));
    },
    async markConversationRead(tenantId, conversationId) {
      const conversation = findConversationById(tenantId, conversationId);
      if (!conversation) return { ok: false, code: 'not_found' };
      conversation.unread_count = 0;
      conversation.updated_at = new Date().toISOString();
      persist();
      return { ok: true, conversation: clone(asConversation(conversation)) };
    },
    async upsertInboundMessage(input) {
      const tenantId = String(input.tenant_id ?? '').trim();
      const contactE164 = String(input.contact_e164 ?? '').trim();
      const providerMessageId = input.provider_message_id ? String(input.provider_message_id).trim() : null;
      if (!tenantId || !contactE164) {
        throw new Error('missing_tenant_or_contact');
      }

      if (providerMessageId) {
        const existingMessage = findMessageByProviderMessageId(tenantId, providerMessageId);
        if (existingMessage) {
          const existingConversation = findConversationById(tenantId, existingMessage.conversation_id);
          return {
            action: 'idempotent',
            conversation: existingConversation ? clone(asConversation(existingConversation)) : null,
            message: clone(asMessage(existingMessage))
          };
        }
      }

      const nowIso = new Date().toISOString();
      let conversation = findConversationByContact(tenantId, contactE164);
      if (!conversation) {
        conversation = {
          conversation_id: randomUUID(),
          tenant_id: tenantId,
          contact_e164: contactE164,
          display_name: String(input.display_name ?? '').trim() || null,
          lead_id: input.lead_id ?? null,
          last_message_preview: '',
          last_message_at: nowIso,
          unread_count: 0,
          metadata: input.conversation_metadata ?? {},
          created_at: nowIso,
          updated_at: nowIso
        };
        state.conversations.push(conversation);
      }

      if (input.display_name && !conversation.display_name) {
        conversation.display_name = String(input.display_name).trim();
      }
      if (input.lead_id) {
        conversation.lead_id = input.lead_id;
      }

      const message = {
        message_row_id: randomUUID(),
        tenant_id: tenantId,
        conversation_id: conversation.conversation_id,
        provider: String(input.provider ?? 'evolution-api').trim() || 'evolution-api',
        provider_message_id: providerMessageId,
        direction: 'inbound',
        message_type: String(input.message_type ?? 'text').trim() || 'text',
        text: String(input.text ?? '').trim(),
        delivery_state: String(input.delivery_state ?? 'received').trim() || 'received',
        occurred_at: String(input.occurred_at ?? nowIso),
        metadata: input.metadata ?? {},
        created_at: nowIso
      };
      state.messages.push(message);

      conversation.last_message_preview = safePreview(message.text);
      conversation.last_message_at = message.occurred_at;
      conversation.unread_count = Number(conversation.unread_count ?? 0) + 1;
      conversation.updated_at = nowIso;
      persist();

      return {
        action: 'created',
        conversation: clone(asConversation(conversation)),
        message: clone(asMessage(message))
      };
    },
    async appendOutboundMessage(input) {
      const tenantId = String(input.tenant_id ?? '').trim();
      const conversationId = String(input.conversation_id ?? '').trim();
      if (!tenantId || !conversationId) {
        throw new Error('missing_tenant_or_conversation');
      }

      const conversation = findConversationById(tenantId, conversationId);
      if (!conversation) {
        return { ok: false, code: 'conversation_not_found' };
      }

      const providerMessageId = input.provider_message_id ? String(input.provider_message_id).trim() : null;
      if (providerMessageId) {
        const existingMessage = findMessageByProviderMessageId(tenantId, providerMessageId);
        if (existingMessage) {
          return { ok: true, action: 'idempotent', message: clone(asMessage(existingMessage)), conversation: clone(asConversation(conversation)) };
        }
      }

      const nowIso = new Date().toISOString();
      const message = {
        message_row_id: randomUUID(),
        tenant_id: tenantId,
        conversation_id: conversationId,
        provider: String(input.provider ?? 'evolution-api').trim() || 'evolution-api',
        provider_message_id: providerMessageId,
        direction: 'outbound',
        message_type: String(input.message_type ?? 'text').trim() || 'text',
        text: String(input.text ?? '').trim(),
        delivery_state: String(input.delivery_state ?? 'sent').trim() || 'sent',
        occurred_at: String(input.occurred_at ?? nowIso),
        metadata: input.metadata ?? {},
        created_at: nowIso
      };
      state.messages.push(message);

      conversation.last_message_preview = safePreview(message.text);
      conversation.last_message_at = message.occurred_at;
      conversation.updated_at = nowIso;
      persist();
      return {
        ok: true,
        action: 'created',
        conversation: clone(asConversation(conversation)),
        message: clone(asMessage(message))
      };
    },
    async updateMessageDeliveryState(tenantId, providerMessageId, deliveryState) {
      const message = findMessageByProviderMessageId(tenantId, providerMessageId);
      if (!message) return { ok: false, code: 'not_found' };
      message.delivery_state = String(deliveryState ?? '').trim() || 'unknown';
      persist();
      return { ok: true, message: clone(asMessage(message)) };
    },
    async close() {}
  };
}
