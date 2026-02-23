function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .match(/[a-z0-9\u00c0-\u024f]+/g) ?? [];
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

export function scoreMemoryEntry(entry, query = {}) {
  const queryTokens = unique(tokenize(query.text));
  const entryTokens = unique(tokenize(entry.content));
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
  let score = (termOverlap * 0.55) + (tagOverlap * 0.25) + (salience * 0.2);
  if (entry.status === 'promoted') {
    score += 0.05;
  }
  score = clamp01(score);

  return {
    score,
    matched_terms: matchedTerms,
    matched_tags: matchedTags,
    term_overlap: termOverlap,
    tag_overlap: tagOverlap
  };
}

export function retrieveContextByScoring(entries, query = {}) {
  const strategy = 'lexical-salience-v1';
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
      const score = scoreMemoryEntry(entry, query);
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
      score: item.score,
      matched_terms: item.matched_terms,
      matched_tags: item.matched_tags,
      embedding_ref: item.entry.embedding_ref ?? null,
      content: item.entry.content
    }))
  };
}
