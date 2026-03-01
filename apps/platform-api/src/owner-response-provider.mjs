function asNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function resolveMode(inputMode) {
  const mode = String(inputMode ?? 'auto').toLowerCase();
  if (mode === 'auto' || mode === 'openai' || mode === 'local' || mode === 'off') {
    return mode;
  }
  return 'auto';
}

function normalizeAssistantContent(raw) {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text.length > 0 ? text : null;
  }

  if (!Array.isArray(raw)) {
    return null;
  }

  const parts = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim().length > 0) {
      parts.push(item.trim());
      continue;
    }

    if (!item || typeof item !== 'object') {
      continue;
    }

    if (typeof item.text === 'string' && item.text.trim().length > 0) {
      parts.push(item.text.trim());
      continue;
    }

    if (item.type === 'output_text' && typeof item.value === 'string' && item.value.trim().length > 0) {
      parts.push(item.value.trim());
    }
  }

  if (parts.length === 0) {
    return null;
  }
  return parts.join('\n');
}

function sanitizeAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];

  const supportedTypes = new Set(['audio', 'image', 'file']);
  const items = [];
  for (const rawItem of rawAttachments) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const type = asNonEmptyString(rawItem.type);
    if (!type || !supportedTypes.has(type)) continue;

    const attachment = {
      type,
      uri: asNonEmptyString(rawItem.uri) ?? 'upload://local/unknown'
    };

    const mimeType = asNonEmptyString(rawItem.mime_type);
    if (mimeType) attachment.mime_type = mimeType;

    const filename = asNonEmptyString(rawItem.filename);
    if (filename) attachment.filename = filename;

    const dataBase64 = asNonEmptyString(rawItem.data_base64);
    if (dataBase64) {
      attachment.data_base64 = dataBase64.replace(/\s+/g, '');
    }

    const textExcerpt = asNonEmptyString(rawItem.text_excerpt);
    if (textExcerpt) {
      attachment.text_excerpt = textExcerpt.slice(0, 20000);
    }

    items.push(attachment);
  }

  return items;
}

function buildAssistantAttachmentRefs(attachments) {
  return attachments.map((item, index) => ({
    type: item.type,
    attachment_ref: item.uri ?? item.filename ?? `attachment-${index + 1}`,
    ...(item.mime_type ? { mime_type: item.mime_type } : {})
  }));
}

function attachmentDataUrl(attachment) {
  const data = asNonEmptyString(attachment?.data_base64);
  if (!data) return null;
  const mime = asNonEmptyString(attachment?.mime_type) ?? 'application/octet-stream';
  return `data:${mime};base64,${data}`;
}

function buildUserTextWithAttachmentContext(payload, attachments) {
  const baseText = asNonEmptyString(payload?.text) ?? '';
  const notes = [];

  for (const attachment of attachments) {
    if (attachment.type === 'file') {
      if (attachment.text_excerpt) {
        notes.push(
          `Arquivo anexado (${attachment.filename ?? 'sem_nome'}):\n${attachment.text_excerpt}`
        );
      } else {
        notes.push(
          `Arquivo anexado (${attachment.filename ?? 'sem_nome'}) sem texto extraivel direto.`
        );
      }
      continue;
    }

    if (attachment.type === 'image' && !attachment.data_base64) {
      notes.push(
        `Imagem anexada (${attachment.filename ?? 'sem_nome'}) sem dados inline para analise.`
      );
    }
  }

  if (notes.length === 0) {
    return baseText;
  }

  return `${baseText}\n\nContexto de anexos:\n${notes.join('\n\n')}`.trim();
}

function buildResponsesInput(payload, attachments) {
  const textWithContext = buildUserTextWithAttachmentContext(payload, attachments);
  const content = [{
    type: 'input_text',
    text: textWithContext
  }];

  for (const attachment of attachments) {
    if (attachment.type !== 'image') continue;
    const imageDataUrl = attachmentDataUrl(attachment);
    if (!imageDataUrl) continue;
    content.push({
      type: 'input_image',
      image_url: imageDataUrl
    });
  }

  return [{
    role: 'user',
    content
  }];
}

function buildChatUserContent(payload, attachments) {
  const textWithContext = buildUserTextWithAttachmentContext(payload, attachments);
  const content = [{
    type: 'text',
    text: textWithContext
  }];

  for (const attachment of attachments) {
    if (attachment.type !== 'image') continue;
    const imageDataUrl = attachmentDataUrl(attachment);
    if (!imageDataUrl) continue;
    content.push({
      type: 'image_url',
      image_url: { url: imageDataUrl }
    });
  }

  return content;
}

function buildLocalReply(payload, fallbackReason = null) {
  const userText = asNonEmptyString(payload?.text) ?? '';
  const attachments = sanitizeAttachments(payload?.attachments);
  const base = 'Entendido. Solicitação recebida e task queued para execução.';
  const text = userText.length > 0 ? `${base} Input: ${userText}` : base;

  return {
    text,
    provider: 'local',
    model: 'deterministic-rule-v1',
    latency_ms: 0,
    ...(attachments.length > 0 ? { attachments: buildAssistantAttachmentRefs(attachments) } : {}),
    ...(fallbackReason ? { fallback_reason: fallbackReason } : {})
  };
}

async function requestOpenAiResponsesReply(options, payload) {
  const ownerPrompt = asNonEmptyString(payload?.persona_overrides?.owner_concierge_prompt);
  const whatsappPrompt = asNonEmptyString(payload?.persona_overrides?.whatsapp_agent_prompt);

  const instructionParts = [
    'You are the neutral Owner Concierge for a modular SaaS. Keep responses concise and operational.'
  ];
  if (ownerPrompt) {
    instructionParts.push(`Owner persona override:\n${ownerPrompt}`);
  }
  if (whatsappPrompt) {
    instructionParts.push(`WhatsApp agent guidance:\n${whatsappPrompt}`);
  }
  const operationalContext = typeof payload?.operational_context === 'string' && payload.operational_context.trim().length > 0
    ? payload.operational_context.trim()
    : null;
  if (operationalContext) {
    instructionParts.push(`Use the following live data from the system to answer accurately. Do not say you cannot access the system when this block is present:\n${operationalContext}`);
  }
  const retrievedContext = typeof payload?.retrieved_context === 'string' && payload.retrieved_context.trim().length > 0
    ? payload.retrieved_context.trim()
    : null;
  if (retrievedContext) {
    instructionParts.push(`Relevant long-term memory (use to ground your answer when applicable):\n${retrievedContext}`);
  }
  const episodeContext = typeof payload?.episode_context === 'string' && payload.episode_context.trim().length > 0
    ? payload.episode_context.trim()
    : null;
  if (episodeContext) {
    instructionParts.push(`Recent session milestones (for context):\n${episodeContext}`);
  }
  const shortMemory = Array.isArray(payload?.short_memory) ? payload.short_memory : [];
  if (shortMemory.length > 0) {
    const recent = shortMemory.map((t) => `${t?.role === 'assistant' ? 'Assistant' : 'User'}: ${(t?.content ?? '').slice(0, 500)}`).join('\n');
    if (recent) {
      instructionParts.push(`Recent conversation (for context only):\n${recent}`);
    }
  }

  const attachments = sanitizeAttachments(payload?.attachments);
  const startedAt = Date.now();
  const response = await fetch(`${options.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.2,
      instructions: instructionParts.join('\n\n'),
      input: buildResponsesInput(payload, attachments)
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`openai_responses_http_${response.status}:${raw.slice(0, 500)}`);
  }

  const body = await response.json();
  const outputText = asNonEmptyString(body?.output_text)
    ?? normalizeAssistantContent(body?.output?.[0]?.content)
    ?? normalizeAssistantContent(body?.output);
  if (!outputText) {
    throw new Error('openai_responses_invalid_payload');
  }

  return {
    text: outputText,
    provider: 'openai',
    model: asNonEmptyString(body?.model) ?? options.model,
    latency_ms: Math.max(0, Date.now() - startedAt),
    ...(attachments.length > 0 ? { attachments: buildAssistantAttachmentRefs(attachments) } : {})
  };
}

async function requestOpenAiChatCompletionsReply(options, payload) {
  const messages = [];
  messages.push({
    role: 'system',
    content: 'You are the neutral Owner Concierge for a modular SaaS. Keep responses concise and operational.'
  });

  const ownerPrompt = asNonEmptyString(payload?.persona_overrides?.owner_concierge_prompt);
  const whatsappPrompt = asNonEmptyString(payload?.persona_overrides?.whatsapp_agent_prompt);
  if (ownerPrompt) {
    messages.push({ role: 'system', content: `Owner persona override:\n${ownerPrompt}` });
  }
  if (whatsappPrompt) {
    messages.push({ role: 'system', content: `WhatsApp agent guidance:\n${whatsappPrompt}` });
  }
  const operationalContext = typeof payload?.operational_context === 'string' && payload.operational_context.trim().length > 0
    ? payload.operational_context.trim()
    : null;
  if (operationalContext) {
    messages.push({
      role: 'system',
      content: `Use the following live data from the system to answer accurately. Do not say you cannot access the system when this block is present:\n${operationalContext}`
    });
  }
  const retrievedContext = typeof payload?.retrieved_context === 'string' && payload.retrieved_context.trim().length > 0
    ? payload.retrieved_context.trim()
    : null;
  if (retrievedContext) {
    messages.push({
      role: 'system',
      content: `Relevant long-term memory (use to ground your answer when applicable):\n${retrievedContext}`
    });
  }
  const episodeContext = typeof payload?.episode_context === 'string' && payload.episode_context.trim().length > 0
    ? payload.episode_context.trim()
    : null;
  if (episodeContext) {
    messages.push({
      role: 'system',
      content: `Recent session milestones (for context):\n${episodeContext}`
    });
  }

  const shortMemory = Array.isArray(payload?.short_memory) ? payload.short_memory : [];
  for (const turn of shortMemory) {
    const role = turn?.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof turn?.content === 'string' ? turn.content : String(turn?.content ?? '');
    if (content.length > 0) {
      messages.push({ role, content });
    }
  }

  const attachments = sanitizeAttachments(payload?.attachments);
  messages.push({
    role: 'user',
    content: buildChatUserContent(payload, attachments)
  });

  const startedAt = Date.now();
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.2,
      messages
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`openai_response_http_${response.status}:${raw.slice(0, 500)}`);
  }

  const body = await response.json();
  const messageContent = body?.choices?.[0]?.message?.content;
  const text = normalizeAssistantContent(messageContent);
  if (!text) {
    throw new Error('openai_response_invalid_payload');
  }

  return {
    text,
    provider: 'openai',
    model: asNonEmptyString(body?.model) ?? options.model,
    latency_ms: Math.max(0, Date.now() - startedAt),
    ...(attachments.length > 0 ? { attachments: buildAssistantAttachmentRefs(attachments) } : {})
  };
}

async function requestOpenAiReply(options, payload) {
  try {
    return await requestOpenAiResponsesReply(options, payload);
  } catch (responsesError) {
    try {
      return await requestOpenAiChatCompletionsReply(options, payload);
    } catch (chatError) {
      throw new Error(
        `openai_all_endpoints_failed:${String(responsesError.message ?? responsesError)}|${String(chatError.message ?? chatError)}`
      );
    }
  }
}

export function createOwnerResponseProvider(options = {}) {
  const mode = resolveMode(options.mode ?? process.env.OWNER_RESPONSE_MODE);
  const apiKey = asNonEmptyString(options.openaiApiKey ?? process.env.OPENAI_API_KEY);
  const model = asNonEmptyString(options.openaiModel ?? process.env.OWNER_RESPONSE_MODEL) ?? 'gpt-5.1-mini';
  const baseUrl = (
    asNonEmptyString(options.openaiBaseUrl ?? process.env.OPENAI_BASE_URL)
    ?? 'https://api.openai.com/v1'
  ).replace(/\/+$/, '');
  const canUseOpenAi = Boolean(apiKey);

  return {
    mode,
    canUseOpenAi,
    async generateAssistantOutput(payload = {}) {
      if (mode === 'off') {
        return {
          text: 'Operation accepted.',
          provider: 'none',
          model: null,
          latency_ms: 0,
          fallback_reason: 'off_mode'
        };
      }

      if (mode === 'local') {
        return buildLocalReply(payload);
      }

      if (mode === 'openai') {
        if (!canUseOpenAi) {
          throw new Error('openai_api_key_missing');
        }
        return requestOpenAiReply({ apiKey, model, baseUrl }, payload);
      }

      // mode=auto
      if (!canUseOpenAi) {
        return buildLocalReply(payload, 'fallback:no_openai_key');
      }

      try {
        return await requestOpenAiReply({ apiKey, model, baseUrl }, payload);
      } catch (error) {
        return buildLocalReply(payload, `fallback:${String(error.message ?? error)}`);
      }
    }
  };
}
