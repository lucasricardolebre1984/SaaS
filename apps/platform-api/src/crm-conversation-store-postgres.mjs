import pg from 'pg';
import { randomUUID } from 'node:crypto';

function assertValidIdentifier(value, fieldName) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier for ${fieldName}`);
  }
}

function tableName(schema, table) {
  return `"${schema}"."${table}"`;
}

function safePreview(text) {
  const value = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return '';
  if (value.length <= 120) return value;
  return `${value.slice(0, 117)}...`;
}

function asConversation(row) {
  return {
    conversation_id: row.conversation_id,
    tenant_id: row.tenant_id,
    contact_e164: row.contact_e164,
    display_name: row.display_name ?? null,
    lead_id: row.lead_id ?? null,
    last_message_preview: row.last_message_preview ?? '',
    last_message_at: row.last_message_at?.toISOString?.() ?? row.last_message_at ?? null,
    unread_count: Number(row.unread_count ?? 0),
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

function asMessage(row) {
  return {
    message_row_id: row.message_row_id,
    tenant_id: row.tenant_id,
    conversation_id: row.conversation_id,
    provider: row.provider,
    provider_message_id: row.provider_message_id ?? null,
    direction: row.direction,
    message_type: row.message_type,
    text: row.text ?? '',
    delivery_state: row.delivery_state ?? 'unknown',
    occurred_at: row.occurred_at?.toISOString?.() ?? row.occurred_at,
    metadata: row.metadata_json ?? {},
    created_at: row.created_at?.toISOString?.() ?? row.created_at
  };
}

export function createPostgresCrmConversationStore(options = {}) {
  const schema = options.pgSchema ?? process.env.ORCHESTRATION_PG_SCHEMA ?? 'public';
  const connectionString =
    options.pgConnectionString ??
    process.env.ORCHESTRATION_PG_DSN ??
    process.env.DATABASE_URL;

  assertValidIdentifier(schema, 'pgSchema');
  if (!connectionString) {
    throw new Error('Missing Postgres DSN. Set ORCHESTRATION_PG_DSN or pass pgConnectionString.');
  }

  const client = new pg.Client({ connectionString });
  const conversationsTable = tableName(schema, 'crm_conversations');
  const messagesTable = tableName(schema, 'crm_messages');
  const autoMigrate = options.pgAutoMigrate !== false;

  async function ensureSchema() {
    if (!autoMigrate) return;
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${conversationsTable} (
        conversation_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        contact_e164 TEXT NOT NULL,
        display_name TEXT NULL,
        lead_id UUID NULL,
        last_message_preview TEXT NULL,
        last_message_at TIMESTAMPTZ NULL,
        unread_count INTEGER NOT NULL DEFAULT 0,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_conversations_tenant_contact_ux
      ON ${conversationsTable} (tenant_id, contact_e164)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_conversations_tenant_last_message_idx
      ON ${conversationsTable} (tenant_id, last_message_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${messagesTable} (
        message_row_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        conversation_id UUID NOT NULL REFERENCES ${conversationsTable}(conversation_id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_message_id TEXT NULL,
        direction TEXT NOT NULL,
        message_type TEXT NOT NULL,
        text TEXT NULL,
        delivery_state TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS crm_messages_tenant_provider_message_ux
      ON ${messagesTable} (tenant_id, provider_message_id)
      WHERE provider_message_id IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS crm_messages_tenant_conversation_occurred_idx
      ON ${messagesTable} (tenant_id, conversation_id, occurred_at ASC)
    `);
  }

  const ready = (async () => {
    await client.connect();
    await ensureSchema();
  })();

  async function query(sql, params = []) {
    await ready;
    return client.query(sql, params);
  }

  async function findConversationByContact(tenantId, contactE164) {
    const result = await query(
      `SELECT *
       FROM ${conversationsTable}
       WHERE tenant_id = $1 AND contact_e164 = $2
       LIMIT 1`,
      [tenantId, contactE164]
    );
    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  return {
    backend: 'postgres',
    storageDir: null,
    storageFilePath: null,
    async listConversations(tenantId, options = {}) {
      const limit = Number(options.limit ?? 100);
      const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
      const result = await query(
        `SELECT *
         FROM ${conversationsTable}
         WHERE tenant_id = $1
         ORDER BY COALESCE(last_message_at, created_at) DESC
         LIMIT $2`,
        [tenantId, safeLimit]
      );
      return result.rows.map(asConversation);
    },
    async getConversationById(tenantId, conversationId) {
      const result = await query(
        `SELECT *
         FROM ${conversationsTable}
         WHERE tenant_id = $1 AND conversation_id = $2
         LIMIT 1`,
        [tenantId, conversationId]
      );
      if (result.rowCount === 0) return null;
      return asConversation(result.rows[0]);
    },
    async listMessages(tenantId, conversationId, options = {}) {
      const limit = Number(options.limit ?? 200);
      const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200;
      const result = await query(
        `SELECT *
         FROM ${messagesTable}
         WHERE tenant_id = $1 AND conversation_id = $2
         ORDER BY occurred_at ASC
         LIMIT $3`,
        [tenantId, conversationId, safeLimit]
      );
      return result.rows.map(asMessage);
    },
    async markConversationRead(tenantId, conversationId) {
      const result = await query(
        `UPDATE ${conversationsTable}
         SET unread_count = 0,
             updated_at = $3
         WHERE tenant_id = $1 AND conversation_id = $2
         RETURNING *`,
        [tenantId, conversationId, new Date().toISOString()]
      );
      if (result.rowCount === 0) return { ok: false, code: 'not_found' };
      return { ok: true, conversation: asConversation(result.rows[0]) };
    },
    async upsertInboundMessage(input) {
      const tenantId = String(input.tenant_id ?? '').trim();
      const contactE164 = String(input.contact_e164 ?? '').trim();
      const providerMessageId = input.provider_message_id ? String(input.provider_message_id).trim() : null;
      if (!tenantId || !contactE164) {
        throw new Error('missing_tenant_or_contact');
      }

      if (providerMessageId) {
        const existing = await query(
          `SELECT *
           FROM ${messagesTable}
           WHERE tenant_id = $1 AND provider_message_id = $2
           LIMIT 1`,
          [tenantId, providerMessageId]
        );
        if (existing.rowCount > 0) {
          const existingMessage = existing.rows[0];
          const existingConversation = await this.getConversationById(tenantId, existingMessage.conversation_id);
          return {
            action: 'idempotent',
            conversation: existingConversation,
            message: asMessage(existingMessage)
          };
        }
      }

      const nowIso = new Date().toISOString();
      let conversationRow = await findConversationByContact(tenantId, contactE164);
      if (!conversationRow) {
        const insertedConversation = await query(
          `INSERT INTO ${conversationsTable}
            (conversation_id, tenant_id, contact_e164, display_name, lead_id, last_message_preview, last_message_at, unread_count, metadata_json, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, '', $6, 0, $7::jsonb, $6, $6)
           RETURNING *`,
          [
            randomUUID(),
            tenantId,
            contactE164,
            String(input.display_name ?? '').trim() || null,
            input.lead_id ?? null,
            nowIso,
            JSON.stringify(input.conversation_metadata ?? {})
          ]
        );
        conversationRow = insertedConversation.rows[0];
      }

      const occurredAt = String(input.occurred_at ?? nowIso);
      const text = String(input.text ?? '').trim();
      const insertedMessage = await query(
        `INSERT INTO ${messagesTable}
          (message_row_id, tenant_id, conversation_id, provider, provider_message_id, direction, message_type, text, delivery_state, occurred_at, metadata_json, created_at)
         VALUES ($1, $2, $3, $4, $5, 'inbound', $6, $7, $8, $9, $10::jsonb, $11)
         RETURNING *`,
        [
          randomUUID(),
          tenantId,
          conversationRow.conversation_id,
          String(input.provider ?? 'evolution-api').trim() || 'evolution-api',
          providerMessageId,
          String(input.message_type ?? 'text').trim() || 'text',
          text,
          String(input.delivery_state ?? 'received').trim() || 'received',
          occurredAt,
          JSON.stringify(input.metadata ?? {}),
          nowIso
        ]
      );

      const updatedConversation = await query(
        `UPDATE ${conversationsTable}
         SET display_name = COALESCE($3, display_name),
             lead_id = COALESCE($4, lead_id),
             last_message_preview = $5,
             last_message_at = $6,
             unread_count = unread_count + 1,
             updated_at = $7
         WHERE tenant_id = $1 AND conversation_id = $2
         RETURNING *`,
        [
          tenantId,
          conversationRow.conversation_id,
          String(input.display_name ?? '').trim() || null,
          input.lead_id ?? null,
          safePreview(text),
          occurredAt,
          nowIso
        ]
      );

      return {
        action: 'created',
        conversation: asConversation(updatedConversation.rows[0]),
        message: asMessage(insertedMessage.rows[0])
      };
    },
    async appendOutboundMessage(input) {
      const tenantId = String(input.tenant_id ?? '').trim();
      const conversationId = String(input.conversation_id ?? '').trim();
      if (!tenantId || !conversationId) {
        throw new Error('missing_tenant_or_conversation');
      }

      const conversation = await this.getConversationById(tenantId, conversationId);
      if (!conversation) {
        return { ok: false, code: 'conversation_not_found' };
      }

      const providerMessageId = input.provider_message_id ? String(input.provider_message_id).trim() : null;
      if (providerMessageId) {
        const existing = await query(
          `SELECT *
           FROM ${messagesTable}
           WHERE tenant_id = $1 AND provider_message_id = $2
           LIMIT 1`,
          [tenantId, providerMessageId]
        );
        if (existing.rowCount > 0) {
          return { ok: true, action: 'idempotent', message: asMessage(existing.rows[0]), conversation };
        }
      }

      const nowIso = new Date().toISOString();
      const occurredAt = String(input.occurred_at ?? nowIso);
      const text = String(input.text ?? '').trim();
      const insertedMessage = await query(
        `INSERT INTO ${messagesTable}
          (message_row_id, tenant_id, conversation_id, provider, provider_message_id, direction, message_type, text, delivery_state, occurred_at, metadata_json, created_at)
         VALUES ($1, $2, $3, $4, $5, 'outbound', $6, $7, $8, $9, $10::jsonb, $11)
         RETURNING *`,
        [
          randomUUID(),
          tenantId,
          conversationId,
          String(input.provider ?? 'evolution-api').trim() || 'evolution-api',
          providerMessageId,
          String(input.message_type ?? 'text').trim() || 'text',
          text,
          String(input.delivery_state ?? 'sent').trim() || 'sent',
          occurredAt,
          JSON.stringify(input.metadata ?? {}),
          nowIso
        ]
      );
      const updatedConversation = await query(
        `UPDATE ${conversationsTable}
         SET last_message_preview = $3,
             last_message_at = $4,
             updated_at = $5
         WHERE tenant_id = $1 AND conversation_id = $2
         RETURNING *`,
        [tenantId, conversationId, safePreview(text), occurredAt, nowIso]
      );

      return {
        ok: true,
        action: 'created',
        conversation: asConversation(updatedConversation.rows[0]),
        message: asMessage(insertedMessage.rows[0])
      };
    },
    async updateMessageDeliveryState(tenantId, providerMessageId, deliveryState) {
      const result = await query(
        `UPDATE ${messagesTable}
         SET delivery_state = $3
         WHERE tenant_id = $1 AND provider_message_id = $2
         RETURNING *`,
        [tenantId, providerMessageId, String(deliveryState ?? '').trim() || 'unknown']
      );
      if (result.rowCount === 0) return { ok: false, code: 'not_found' };
      return { ok: true, message: asMessage(result.rows[0]) };
    },
    async close() {
      await ready;
      await client.end();
    }
  };
}
