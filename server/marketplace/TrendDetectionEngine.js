'use strict';

/**
 * AWE-OS — TrendDetectionEngine                                Phase 6B
 *
 * Detects market trends from historical tool performance data.
 * Pure DB + algorithmic — no AI calls.
 *
 * Techniques:
 *   - Weighted moving average over idea creation timestamps
 *   - Recency-weighted category scoring (last 7d / 30d / 90d windows)
 *   - Seasonal demand multipliers by month/quarter
 *   - Saturation detection via tool density vs usage ratio
 *   - Underserved niche detection via demand-supply gap
 */

const { createLogger } = require('../monitoring/logger');

const log       = createLogger('trend-detection');
const CACHE_TTL = 15 * 60 * 1_000; // 15-minute cache

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// Seasonal demand multipliers — certain categories spike predictably
const SEASONAL_WEIGHTS = {
  // [month 0-11]: multiplier per category
  finance:      [0.9, 0.9, 1.1, 1.4, 0.9, 0.8, 0.9, 0.9, 1.0, 0.9, 1.1, 1.5], // Q1 tax, year-end
  education:    [1.3, 1.0, 1.0, 0.8, 0.8, 0.7, 0.7, 1.4, 1.3, 1.0, 1.0, 0.8], // school calendar
  ecommerce:    [0.8, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 1.5, 1.8], // holiday season
  health:       [1.4, 1.2, 1.1, 1.0, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 0.9, 1.1], // New Year resolutions
  marketing:    [1.0, 1.0, 1.1, 1.1, 1.1, 1.0, 0.9, 0.9, 1.2, 1.2, 1.3, 0.9], // B2B planning cycles
  productivity: [1.3, 1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 1.2, 1.1, 1.0, 0.9], // Jan reset, Sep return
};

// Demand signal weight: idea volume per time window
const WINDOW_WEIGHTS = { d7: 0.50, d30: 0.30, d90: 0.20 };

// Category baseline capacity — how many tools can a category healthily support
const CATEGORY_CAPACITY = {
  pdf: 25, calculators: 20, converters: 18, writing: 22,
  marketing: 20, productivity: 18, finance: 20, health: 16,
  education: 18, legal: 14, ecommerce: 20, other: 30,
};

/**
 * Run full trend analysis. Results are cached for 15 minutes.
 *
 * @returns {Promise<TrendReport>}
 */
async function detectTrends() {
  try {
    const now = Date.now();
    if (_cache && (now - _cacheTs) < CACHE_TTL) return _cache;

    const report = await _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('detectTrends failed, returning empty report', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Invalidate cache — call after a new tool is launched or approved.
 */
function invalidateCache() {
  _cache   = null;
  _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildReport() {
  const startMs  = Date.now();
  const monthIdx = new Date().getMonth(); // 0-11

  // ── 1. Published tool distribution ────────────────────────────────────────
  const { data: publishedTools } = await db()
    .from('tools')
    .select('category, usage_count, quality_score, created_at, approved')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(500);

  const tools = publishedTools || [];

  // Category tool counts + total usage
  const catStats = {};
  for (const t of tools) {
    const cat = t.category || 'other';
    if (!catStats[cat]) catStats[cat] = { count: 0, totalUsage: 0, totalQuality: 0 };
    catStats[cat].count++;
    catStats[cat].totalUsage   += t.usage_count  || 0;
    catStats[cat].totalQuality += t.quality_score || 0;
  }

  // ── 2. Idea demand signals (recency-weighted) ──────────────────────────────
  const ideaDemand = {};
  try {
    const now = new Date();
    const d7  = new Date(now - 7  * 86_400_000).toISOString();
    const d30 = new Date(now - 30 * 86_400_000).toISOString();
    const d90 = new Date(now - 90 * 86_400_000).toISOString();

    const [r7, r30, r90] = await Promise.all([
      db().from('generated_tool_ideas').select('category').gte('created_at', d7),
      db().from('generated_tool_ideas').select('category').gte('created_at', d30).lt('created_at', d7),
      db().from('generated_tool_ideas').select('category').gte('created_at', d90).lt('created_at', d30),
    ]);

    const tally = (rows, window) => {
      for (const row of (rows.data || [])) {
        const cat = row.category || 'other';
        if (!ideaDemand[cat]) ideaDemand[cat] = { d7: 0, d30: 0, d90: 0 };
        ideaDemand[cat][window]++;
      }
    };
    tally(r7, 'd7'); tally(r30, 'd30'); tally(r90, 'd90');
  } catch (_) { /* generated_tool_ideas may not exist yet */ }

  // ── 3. Compute per-category trend scores ──────────────────────────────────
  const allCategories = new Set([
    ...Object.keys(catStats),
    ...Object.keys(ideaDemand),
    ...Object.keys(CATEGORY_CAPACITY),
  ]);

  const categoryTrends = {};
  for (const cat of allCategories) {
    const stats    = catStats[cat]     || { count: 0, totalUsage: 0, totalQuality: 0 };
    const demand   = ideaDemand[cat]   || { d7: 0, d30: 0, d90: 0 };
    const capacity = CATEGORY_CAPACITY[cat] || 20;
    const seasonal = (SEASONAL_WEIGHTS[cat]?.[monthIdx] || 1.0);

    // Weighted demand signal
    const demandSignal = Math.min(100,
      (demand.d7  * WINDOW_WEIGHTS.d7  +
       demand.d30 * WINDOW_WEIGHTS.d30 +
       demand.d90 * WINDOW_WEIGHTS.d90) * 25
    );

    // Saturation = current tools / capacity (0-100)
    const saturation = Math.min(100, Math.round((stats.count / capacity) * 100));

    // Average quality
    const avgQuality = stats.count > 0 ? Math.round(stats.totalQuality / stats.count) : 50;

    // Average usage per tool
    const avgUsage = stats.count > 0 ? Math.round(stats.totalUsage / stats.count) : 0;

    // Trend velocity: change in demand weighted by recency
    const velocity = demand.d7 > demand.d30
      ? 'rising'
      : demand.d7 === 0 && demand.d30 === 0 && demand.d90 === 0
      ? 'dormant'
      : demand.d7 < demand.d30 / 2
      ? 'declining'
      : 'stable';

    // Opportunity score: high demand + low saturation + seasonal boost
    const opportunityScore = Math.round(Math.min(100, Math.max(5,
      (demandSignal * 0.35) +
      ((100 - saturation) * 0.35) +
      (avgQuality * 0.15) +
      (seasonal * 15 * 0.15)
    )));

    categoryTrends[cat] = {
      toolCount:        stats.count,
      capacity,
      saturation,
      avgQuality,
      avgUsage,
      demandSignal:     Math.round(demandSignal),
      velocity,
      seasonalBoost:    seasonal,
      opportunityScore,
      ideaDemand:       demand,
    };
  }

  // ── 4. Rank output lists ───────────────────────────────────────────────────
  const ranked = Object.entries(categoryTrends)
    .sort((a, b) => b[1].opportunityScore - a[1].opportunityScore);

  const trendingCategories = ranked
    .filter(([, d]) => d.velocity === 'rising' || d.opportunityScore >= 60)
    .slice(0, 6)
    .map(([cat, d]) => ({
      category:         cat,
      opportunityScore: d.opportunityScore,
      velocity:         d.velocity,
      saturation:       d.saturation,
      toolCount:        d.toolCount,
      seasonalBoost:    d.seasonalBoost > 1.1 ? 'high' : d.seasonalBoost > 1.0 ? 'moderate' : 'normal',
    }));

  const underservedMarkets = ranked
    .filter(([, d]) => d.saturation < 35 && d.toolCount < d.capacity * 0.4)
    .slice(0, 5)
    .map(([cat, d]) => ({
      category:    cat,
      toolGap:     d.capacity - d.toolCount,
      saturation:  d.saturation,
      opportunity: d.opportunityScore,
    }));

  const saturationRisk = Object.entries(categoryTrends)
    .filter(([, d]) => d.saturation >= 70)
    .sort((a, b) => b[1].saturation - a[1].saturation)
    .slice(0, 4)
    .map(([cat, d]) => ({
      category:   cat,
      saturation: d.saturation,
      toolCount:  d.toolCount,
      capacity:   d.capacity,
      risk:       d.saturation >= 90 ? 'critical' : d.saturation >= 75 ? 'high' : 'moderate',
    }));

  // Rising keywords: extracted from top-demand categories
  const risingKeywords = _extractRisingKeywords(categoryTrends, monthIdx);

  // Overall market opportunity score
  const opportunityScore = Math.round(
    ranked.slice(0, 5).reduce((s, [, d]) => s + d.opportunityScore, 0) /
    Math.min(5, ranked.length || 1)
  );

  const report = {
    trendingCategories,
    underservedMarkets,
    saturationRisk,
    risingKeywords,
    categoryTrends,
    opportunityScore,
    analysisMs:  Date.now() - startMs,
    analyzedAt:  new Date().toISOString(),
  };

  log.info('Trend analysis complete', {
    trending:   trendingCategories.length,
    underserved: underservedMarkets.length,
    saturated:   saturationRisk.length,
    ms:          report.analysisMs,
  });

  return report;
}

function _extractRisingKeywords(categoryTrends, monthIdx) {
  const KEYWORD_MAP = {
    finance:      ['tax calculator', 'budget planner', 'invoice generator', 'expense tracker'],
    education:    ['quiz maker', 'flashcard generator', 'study planner', 'grade calculator'],
    marketing:    ['email subject generator', 'ad copy writer', 'headline analyzer', 'CTR optimizer'],
    productivity: ['task prioritizer', 'time tracker', 'meeting summarizer', 'workflow builder'],
    health:       ['calorie calculator', 'macro tracker', 'workout planner', 'BMI analyzer'],
    pdf:          ['PDF editor', 'form filler', 'digital signature', 'PDF annotator'],
    writing:      ['blog outline generator', 'paraphrase tool', 'grammar checker', 'title generator'],
    ecommerce:    ['product description writer', 'pricing calculator', 'profit margin tool'],
    legal:        ['contract generator', 'NDA creator', 'terms generator', 'disclaimer builder'],
  };

  const SEASONAL_KEYWORD_BOOSTS = {
    finance:   [1, 2, 3, 11], // Jan-Mar + Dec
    education: [7, 8, 0],     // Aug + Sep + Jan
    ecommerce: [9, 10, 11],   // Oct-Dec
    health:    [0, 1],        // Jan-Feb
  };

  const risingKeywords = [];
  for (const [cat, trends] of Object.entries(categoryTrends)) {
    if (trends.velocity === 'rising' || trends.opportunityScore >= 55) {
      const keywords = KEYWORD_MAP[cat] || [];
      const seasonalBoost = SEASONAL_KEYWORD_BOOSTS[cat]?.includes(monthIdx) ? 1.3 : 1.0;
      for (const kw of keywords.slice(0, 2)) {
        risingKeywords.push({
          keyword:    kw,
          category:   cat,
          confidence: Math.round(Math.min(95, trends.opportunityScore * seasonalBoost)),
          velocity:   trends.velocity,
        });
      }
    }
  }

  return risingKeywords.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
}

function _emptyReport() {
  return {
    trendingCategories: [],
    underservedMarkets: [],
    saturationRisk:     [],
    risingKeywords:     [],
    categoryTrends:     {},
    opportunityScore:   50,
    analysisMs:         0,
    analyzedAt:         new Date().toISOString(),
  };
}

module.exports = { detectTrends, invalidateCache };
