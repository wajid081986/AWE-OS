'use strict';

/**
 * AWE-OS — Idea Duplicate Detector
 *
 * Prevents duplicate tool ideas before inserting into the pipeline.
 * Three-tier check:
 *   1. Exact name match  (case-insensitive)
 *   2. High similarity   (>80% character overlap via Dice coefficient)
 *   3. Same category + near-identical description (>75% similarity)
 */

const supabase = require('../db/supabase');

const DEDUP_WINDOW_DAYS      = 30;   // only check ideas from the last N days
const NAME_SIMILARITY_THRESH = 0.80; // 80% — flags as likely duplicate
const DESC_SIMILARITY_THRESH = 0.75; // 75% for same-category description match

// ── Dice coefficient (bigram similarity) ──────────────────────────────────────
function bigrams(str) {
  const s = str.toLowerCase().replace(/\s+/g, ' ').trim();
  const pairs = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    pairs.add(s.slice(i, i + 2));
  }
  return pairs;
}

function diceSimilarity(a, b) {
  if (!a || !b) return 0;
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

// ── Fetch recent candidates from DB ───────────────────────────────────────────
async function fetchRecentIdeas(category = null) {
  const since = new Date(Date.now() - DEDUP_WINDOW_DAYS * 86_400_000).toISOString();
  let query = supabase
    .from('tools')
    .select('id, name, description, category, status')
    .gte('created_at', since)
    .eq('status', 'idea');

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    console.warn('[DEDUP] fetch failed — skipping dedup check:', error.message);
    return [];
  }
  return data || [];
}

// ── Core duplicate check ──────────────────────────────────────────────────────
/**
 * Returns null if no duplicate, or { type, matchId, similarity } if duplicate found.
 *
 * @param {{ name: string, description?: string, category?: string }} candidate
 * @param {Array}  [existingIdeas]  — pass to avoid re-fetching inside a batch loop
 */
async function isDuplicate(candidate, existingIdeas = null) {
  const ideas = existingIdeas ?? await fetchRecentIdeas(candidate.category);
  const candidateName = (candidate.name || '').toLowerCase().trim();
  const candidateDesc = (candidate.description || '').toLowerCase().trim();

  for (const idea of ideas) {
    const existingName = (idea.name || '').toLowerCase().trim();

    // Tier 1: exact name match
    if (existingName === candidateName) {
      return { type: 'exact_name', matchId: idea.id, similarity: 1.0 };
    }

    // Tier 2: high name similarity
    const nameSim = diceSimilarity(candidateName, existingName);
    if (nameSim >= NAME_SIMILARITY_THRESH) {
      return { type: 'similar_name', matchId: idea.id, similarity: nameSim };
    }

    // Tier 3: same category + similar description
    if (
      candidate.category &&
      idea.category === candidate.category &&
      candidateDesc.length > 20
    ) {
      const descSim = diceSimilarity(candidateDesc, (idea.description || '').toLowerCase());
      if (descSim >= DESC_SIMILARITY_THRESH) {
        return { type: 'similar_description', matchId: idea.id, similarity: descSim };
      }
    }
  }

  return null;
}

// ── Batch dedup for arrays of candidates ──────────────────────────────────────
/**
 * @param {Array<{name, description, category}>} candidates
 * @returns {{ unique: Array, duplicates: Array<{candidate, match}> }}
 */
async function filterDuplicates(candidates, category = null) {
  if (!candidates || candidates.length === 0) return { unique: [], duplicates: [] };

  const existingIdeas = await fetchRecentIdeas(category);
  const unique     = [];
  const duplicates = [];

  // Track names we've already accepted this batch to avoid intra-batch dupes
  const acceptedThisBatch = [];

  for (const candidate of candidates) {
    const match = await isDuplicate(candidate, [...existingIdeas, ...acceptedThisBatch]);
    if (match) {
      duplicates.push({ candidate, match });
    } else {
      unique.push(candidate);
      acceptedThisBatch.push({ ...candidate, id: `batch-${unique.length}` });
    }
  }

  return { unique, duplicates };
}

module.exports = {
  isDuplicate,
  filterDuplicates,
  diceSimilarity,
  NAME_SIMILARITY_THRESH,
  DESC_SIMILARITY_THRESH,
};
