'use strict';

/**
 * AWE-OS — DuplicateDetectionEngine                           Phase 6A
 *
 * Detects duplicate and similar tools by:
 *  1. Querying existing published tools in the same category
 *  2. Computing Jaccard similarity on tokenized name/description
 *  3. Measuring category saturation
 *
 * Zero AI calls — pure DB + algorithmic.
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('duplicate-detection');

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// Stop words to ignore during tokenization
const STOP_WORDS = new Set(['a','an','the','and','or','for','to','in','of','with','that','this','tool','free','online','ai','powered','using','based','your','our','my']);

function tokenize(text) {
  return String(text || '').toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function jaccardSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union        = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Detect duplicates and measure category saturation.
 *
 * @param {string} prompt   - Tool idea / title to check against
 * @param {string} category - Tool category
 * @returns {Promise<object>} Duplicate detection result
 */
async function detect(prompt, category) {
  const inputTokens = tokenize(prompt);

  try {
    // Fetch existing tools in category (and globally for cross-category check)
    const [catResult, globalResult] = await Promise.all([
      db().from('saas_tools')
        .select('id, name, slug, description, category')
        .eq('is_published', true)
        .eq('category', category)
        .limit(80),
      db().from('saas_tools')
        .select('id, name, slug, description, category', { count: 'exact' })
        .eq('is_published', true)
        .limit(1),
    ]);

    const catTools    = catResult.data   || [];
    const globalCount = globalResult.count || 0;

    // Score each tool for similarity
    const scored = catTools.map(tool => {
      const nameScore = jaccardSimilarity(inputTokens, tokenize(tool.name));
      const descScore = jaccardSimilarity(inputTokens, tokenize(tool.description || ''));
      // Name similarity weighted higher than description
      const similarity = (nameScore * 0.65) + (descScore * 0.35);
      return { ...tool, similarity };
    })
    .filter(t => t.similarity > 0.12)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

    const topScore    = scored[0]?.similarity ?? 0;
    const isDuplicate = topScore >= 0.50;
    const isSimilar   = !isDuplicate && topScore >= 0.22;

    // Saturation: how crowded is this category
    const catCount        = catTools.length;
    const saturationLevel = catCount >= 20 ? 'high' : catCount >= 8 ? 'medium' : 'low';

    // Also check generated_tool_ideas for pending ideas (catch duplicates before they're built)
    let pendingDuplicate = null;
    try {
      const { data: pendingIdeas } = await db()
        .from('generated_tool_ideas')
        .select('id, title, category')
        .eq('category', category)
        .eq('approved', false)
        .limit(20);

      const ideaTokens = (pendingIdeas || []).map(i => ({
        ...i,
        similarity: jaccardSimilarity(inputTokens, tokenize(i.title)),
      })).filter(i => i.similarity > 0.30).sort((a, b) => b.similarity - a.similarity)[0];

      pendingDuplicate = ideaTokens || null;
    } catch (_) { /* table may not exist yet */ }

    return {
      isDuplicate,
      isSimilar,
      topSimilarityScore: Math.round(topScore * 100),
      similarTools: scored.map(t => ({
        id:         t.id,
        name:       t.name,
        slug:       t.slug,
        category:   t.category,
        similarity: Math.round(t.similarity * 100),
      })),
      existingToolsInCategory: catCount,
      totalPublishedTools:     globalCount,
      saturationLevel,
      pendingDuplicate: pendingDuplicate
        ? { id: pendingDuplicate.id, title: pendingDuplicate.title, similarity: Math.round(pendingDuplicate.similarity * 100) }
        : null,
      warning: isDuplicate
        ? `High overlap (${Math.round(topScore * 100)}%) with "${scored[0]?.name}" — strong differentiation required`
        : isSimilar
        ? `Similar tools exist — focus on a unique value proposition`
        : saturationLevel === 'high'
        ? `"${category}" category is saturated (${catCount} tools) — niche targeting recommended`
        : null,
    };
  } catch (err) {
    log.warn('detect failed', { error: err.message });
    return _emptyResult();
  }
}

function _emptyResult() {
  return {
    isDuplicate:              false,
    isSimilar:                false,
    topSimilarityScore:       0,
    similarTools:             [],
    existingToolsInCategory:  0,
    totalPublishedTools:      0,
    saturationLevel:          'unknown',
    pendingDuplicate:         null,
    warning:                  null,
  };
}

module.exports = { detect };
