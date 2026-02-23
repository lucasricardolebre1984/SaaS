import {
  cosineSimilarity01,
  localSemanticEmbeddingFromText,
  tokenizeText
} from './semantic-embedding.mjs';

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

function unique(values) {
  return [...new Set(values)];
}

function intersect(listA, listB) {
  const setB = new Set(listB);
  return listA.filter((item) => setB.has(item));
}

function parseTopK(value) {
  const n = Number(value ?? 5);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(Math.floor(n), 20));
}

export function scoreMemoryEntry(entry, query = {}, strategy = 'lexical-salience-v1') {
  const queryTokens = unique(tokenizeText(query.text));
  const entryTokens = unique(tokenizeText(entry.content));
  const matchedTerms = queryTokens.length > 0
    ? intersect(queryTokens, entryTokens)
    : [];
  const termOverlap = queryTokens.length > 0 ? matchedTerms.length / queryTokens.length : 0;

  const queryTags = unique((query.tags ?? []).map((item) => String(item).toLowerCase()));
  const entryTags = unique((entry.tags ?? []).map((item) => String(item).toLowerCase()));
  const matchedTags = queryTags.length > 0
    ? intersect(queryTags, entryTags)
    : [];
  const tagOverlap = queryTags.length > 0 ? matchedTags.length / queryTags.length : 0;

  const salience = clamp01(entry.salience_score);
  let lexicalScore = (termOverlap * 0.55) + (tagOverlap * 0.25) + (salience * 0.2);
  if (entry.status === 'promoted') {
    lexicalScore += 0.05;
  }
  lexicalScore = clamp01(lexicalScore);

  const wantsHybrid = strategy === 'hybrid-lexical-vector-v1';
  const queryVector = Array.isArray(query.query_embedding)
    ? query.query_embedding
    : localSemanticEmbeddingFromText(query.text, query.tags ?? []);
  const entryVector = Array.isArray(entry.embedding_vector)
    ? entry.embedding_vector
    : localSemanticEmbeddingFromText(entry.content, entry.tags ?? []);
  const vectorScore = wantsHybrid ? cosineSimilarity01(queryVector, entryVector) : 0;

  const score = wantsHybrid
    ? clamp01((lexicalScore * 0.75) + (vectorScore * 0.25))
    : lexicalScore;

  return {
    score,
    lexical_score: lexicalScore,
    vector_score: vectorScore,
    matched_terms: matchedTerms,
    matched_tags: matchedTags,
    term_overlap: termOverlap,
    tag_overlap: tagOverlap
  };
}

export function retrieveContextByScoring(entries, query = {}) {
  const requestedStrategy = String(query.strategy ?? 'lexical-salience-v1');
  const strategy = requestedStrategy === 'vector-ready' || requestedStrategy === 'hybrid-lexical-vector-v1'
    ? 'hybrid-lexical-vector-v1'
    : 'lexical-salience-v1';
  const topK = parseTopK(query.top_k);
  const minScore = clamp01(query.min_score ?? 0);
  const includeCandidates = query.include_candidates === true;
  const includeArchived = query.include_archived === true;

  const filtered = entries
    .filter((entry) => (query.session_id ? entry.session_id === query.session_id : true))
    .filter((entry) => (includeArchived ? true : entry.status !== 'archived'))
    .filter((entry) => (
      includeCandidates
        ? entry.status === 'promoted' || entry.status === 'candidate'
        : entry.status === 'promoted'
    ))
    .map((entry) => {
      const score = scoreMemoryEntry(entry, query, strategy);
      return {
        entry,
        ...score
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.entry.updated_at).localeCompare(String(a.entry.updated_at));
    })
    .slice(0, topK);

  return {
    strategy,
    vector_ready: true,
    top_k: topK,
    retrieved_count: filtered.length,
    items: filtered.map((item) => ({
      memory_id: item.entry.memory_id,
      session_id: item.entry.session_id,
      source: item.entry.source,
      status: item.entry.status,
      salience_score: item.entry.salience_score,
      lexical_score: item.lexical_score,
      vector_score: item.vector_score,
      score: item.score,
      matched_terms: item.matched_terms,
      matched_tags: item.matched_tags,
      embedding_ref: item.entry.embedding_ref ?? null,
      content: item.entry.content
    }))
  };
}
