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

function buildLocalReply(payload, fallbackReason = null) {
  const userText = asNonEmptyString(payload?.text) ?? '';
  const base = 'Entendido. Solicitação recebida e task queued para execução.';
  const text = userText.length > 0 ? `${base} Input: ${userText}` : base;

  return {
    text,
    provider: 'local',
    model: 'deterministic-rule-v1',
    latency_ms: 0,
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
      input: asNonEmptyString(payload?.text) ?? ''
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
    latency_ms: Math.max(0, Date.now() - startedAt)
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

  messages.push({
    role: 'user',
    content: asNonEmptyString(payload?.text) ?? ''
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
    latency_ms: Math.max(0, Date.now() - startedAt)
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
