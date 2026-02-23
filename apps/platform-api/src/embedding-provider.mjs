import {
  buildLocalEmbeddingRef,
  localSemanticEmbeddingFromText,
  normalizeEmbeddingVector
} from './semantic-embedding.mjs';

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

async function requestOpenAiEmbedding(options, inputText) {
  const response = await fetch(`${options.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      input: inputText
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`openai_embedding_http_${response.status}:${raw.slice(0, 500)}`);
  }

  const body = await response.json();
  const embedding = body?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length < 4) {
    throw new Error('openai_embedding_invalid_payload');
  }
  return normalizeEmbeddingVector(embedding);
}

export function createEmbeddingProvider(options = {}) {
  const mode = resolveMode(options.mode ?? process.env.OWNER_MEMORY_EMBEDDING_MODE);
  const apiKey = asNonEmptyString(options.openaiApiKey ?? process.env.OPENAI_API_KEY);
  const model = asNonEmptyString(options.openaiModel ?? process.env.OWNER_MEMORY_EMBEDDING_MODEL)
    ?? 'text-embedding-3-small';
  const baseUrl = (
    asNonEmptyString(options.openaiBaseUrl ?? process.env.OPENAI_BASE_URL)
    ?? 'https://api.openai.com/v1'
  ).replace(/\/+$/, '');

  const canUseOpenAi = Boolean(apiKey);

  async function fromLocal(payload, reason = 'local') {
    const vector = localSemanticEmbeddingFromText(payload.content, payload.tags);
    return {
      provider: 'local',
      model: 'deterministic-hash-v1',
      strategy: reason,
      embedding_ref: payload.embedding_ref ?? buildLocalEmbeddingRef(payload.content, payload.tags),
      embedding_vector: vector
    };
  }

  async function fromOpenAi(payload) {
    if (!canUseOpenAi) {
      throw new Error('openai_api_key_missing');
    }

    const combinedText = `${payload.content}\n\nTags: ${(payload.tags ?? []).join(', ')}`;
    const vector = await requestOpenAiEmbedding({ apiKey, model, baseUrl }, combinedText);
    return {
      provider: 'openai',
      model,
      strategy: 'provider',
      embedding_ref: payload.embedding_ref ?? `openai:${model}`,
      embedding_vector: vector
    };
  }

  return {
    mode,
    async resolveMemoryEmbedding(payload = {}) {
      if (mode === 'off') {
        return {
          provider: 'none',
          model: null,
          strategy: 'off',
          embedding_ref: payload.embedding_ref ?? null,
          embedding_vector: null
        };
      }

      if (mode === 'local') {
        return fromLocal(payload, 'local');
      }

      if (mode === 'openai') {
        return fromOpenAi(payload);
      }

      // mode=auto
      if (canUseOpenAi) {
        try {
          return await fromOpenAi(payload);
        } catch (error) {
          return fromLocal(payload, `fallback:${String(error.message ?? error)}`);
        }
      }
      return fromLocal(payload, 'fallback:no_openai_key');
    }
  };
}
