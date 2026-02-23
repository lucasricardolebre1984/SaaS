import { createHash } from 'node:crypto';

export const LOCAL_EMBEDDING_DIM = 24;

export function tokenizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .match(/[a-z0-9\u00c0-\u024f]+/g) ?? [];
}

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeEmbeddingVector(vector) {
  const source = Array.isArray(vector) ? vector : [];
  const values = source
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return [];
  }

  const norm = Math.sqrt(values.reduce((acc, value) => acc + (value * value), 0));
  if (!Number.isFinite(norm) || norm <= 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / norm);
}

export function localSemanticEmbeddingFromText(text, tags = [], dimension = LOCAL_EMBEDDING_DIM) {
  const vector = new Array(Math.max(4, Number(dimension) || LOCAL_EMBEDDING_DIM)).fill(0);
  const tokens = [
    ...tokenizeText(text),
    ...((Array.isArray(tags) ? tags : []).map((item) => String(item).toLowerCase()))
  ];

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const h = hashToken(token);
    const idx = h % vector.length;
    const sign = (h & 1) === 0 ? 1 : -1;
    vector[idx] += sign;
  }
  return normalizeEmbeddingVector(vector);
}

export function cosineSimilarity01(a, b) {
  const left = normalizeEmbeddingVector(a);
  const right = normalizeEmbeddingVector(b);
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const length = Math.min(left.length, right.length);
  let dot = 0;
  for (let i = 0; i < length; i += 1) {
    dot += (left[i] * right[i]);
  }

  const normalized = (dot + 1) / 2;
  if (normalized < 0) return 0;
  if (normalized > 1) return 1;
  return normalized;
}

export function buildLocalEmbeddingRef(text, tags = []) {
  const digest = createHash('sha1')
    .update(String(text ?? ''))
    .update('|')
    .update((Array.isArray(tags) ? tags : []).join(','))
    .digest('hex')
    .slice(0, 16);
  return `local:${digest}`;
}
