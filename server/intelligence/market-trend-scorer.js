'use strict';

/**
 * AWE-OS — Market Trend Scorer                                Phase 4
 *
 * Scores a candidate idea/category/product_type combination against the
 * manually curated demand signals in market-trend-catalog.js. Pure
 * algorithmic — no AI calls. Kept separate from the 5 modules orchestrated
 * by intelligence/index.js (not part of runIntelligencePipeline) since this
 * is a standalone, informational lookup per the AI Factory Advancement SDD
 * §7 — it never blocks or is consulted by tool generation.
 */

const { TREND_CATALOG } = require('./market-trend-catalog');

const DEFAULT_PRODUCT_TYPE = 'prompt-tool';

/**
 * Score a candidate idea against the curated trend catalog.
 *
 * @param {object} candidate
 * @param {string} [candidate.idea]         - Free-text idea description
 * @param {string} candidate.category       - Tool category
 * @param {string} [candidate.product_type] - Product type (default 'prompt-tool')
 * @returns {{ demand: string, reasoning: string, matchType: 'exact'|'keyword'|'none', matchedEntry: {category: string, product_type: string} | null }}
 */
function scoreIdea({ idea, category, product_type } = {}) {
  const productType = product_type || DEFAULT_PRODUCT_TYPE;
  const ideaText = String(idea || '').toLowerCase();

  // 1. Exact match on {category, product_type}
  const exactMatch = TREND_CATALOG.find(
    entry => entry.category === category && entry.product_type === productType,
  );
  if (exactMatch) {
    return {
      demand:       exactMatch.demand,
      reasoning:    exactMatch.reasoning,
      matchType:    'exact',
      matchedEntry: { category: exactMatch.category, product_type: exactMatch.product_type },
    };
  }

  // 2. Keyword match within the same category (any product_type)
  if (ideaText) {
    const keywordMatch = TREND_CATALOG.find(
      entry => entry.category === category
        && Array.isArray(entry.keywords)
        && entry.keywords.some(kw => ideaText.includes(kw)),
    );
    if (keywordMatch) {
      return {
        demand:       keywordMatch.demand,
        reasoning:    keywordMatch.reasoning,
        matchType:    'keyword',
        matchedEntry: { category: keywordMatch.category, product_type: keywordMatch.product_type },
      };
    }
  }

  // 3. No curated data — honest fallback, not a guess
  return {
    demand:       'unrated',
    reasoning:    'No curated trend data yet for this category/product-type combination.',
    matchType:    'none',
    matchedEntry: null,
  };
}

module.exports = { scoreIdea };
