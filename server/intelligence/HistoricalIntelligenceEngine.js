'use strict';

/**
 * AWE-OS — HistoricalIntelligenceEngine                       Phase 6A
 *
 * Extracts learning patterns from historical tool performance data.
 * Pure DB queries — no AI calls.
 *
 * Maintains an in-memory cache (30-min TTL) to avoid hammering the DB.
 * Cache is invalidated whenever a new tool is approved/built.
 */

const { createLogger } = require('../monitoring/logger');

const log      = createLogger('historical-intelligence');
const CACHE_TTL = 30 * 60 * 1_000; // 30 minutes

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

/**
 * Get historical intelligence patterns, optionally filtered by category.
 *
 * @param {string} [category] - Category to focus on ('all' or omit for global)
 * @returns {Promise<object>}  Pattern object with global + per-category data
 */
async function getPatterns(category) {
  try {
    const now = Date.now();
    if (!_cache || (now - _cacheTs) > CACHE_TTL) {
      await _refreshCache();
    }

    const global      = _cache?.global      || _emptyGlobal();
    const byCategory  = _cache?.byCategory  || {};
    const catData     = (category && category !== 'all')
      ? (byCategory[category] || _emptyCategory())
      : null;

    return {
      global,
      byCategory,
      forCategory:   catData,
      topCategories: _cache?.topCategories || [],
      insights:      _buildInsights(global, catData, category),
      cachedAt:      _cacheTs > 0 ? new Date(_cacheTs).toISOString() : null,
    };
  } catch (err) {
    log.warn('getPatterns failed', { error: err.message });
    return { global: _emptyGlobal(), byCategory: {}, forCategory: null, topCategories: [], insights: [], cachedAt: null };
  }
}

/**
 * Force cache invalidation — call after approving/rejecting a tool idea.
 */
function invalidateCache() {
  _cache   = null;
  _cacheTs = 0;
  log.info('Historical cache invalidated');
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _refreshCache() {
  const startMs = Date.now();

  // Top tools by usage count
  const { data: topTools } = await db()
    .from('tools')
    .select('id, name, category, quality_score, usage_count, is_free, price, created_at')
    .eq('approved', true)
    .order('usage_count', { ascending: false })
    .limit(200);

  const tools = topTools || [];

  // Aggregate global stats
  const totalTools   = tools.length;
  const avgQuality   = totalTools > 0 ? _avg(tools.map(t => t.quality_score || 0)) : 0;
  const avgUsage     = totalTools > 0 ? _avg(tools.map(t => t.usage_count   || 0)) : 0;
  const freeRatio    = totalTools > 0 ? tools.filter(t => t.is_free).length / totalTools : 0.8;

  // Per-category stats
  const byCategory = {};
  for (const tool of tools) {
    const cat = tool.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = { toolCount: 0, totalUsage: 0, totalQuality: 0, topUsageTool: null, freeCount: 0 };
    }
    const c = byCategory[cat];
    c.toolCount++;
    c.totalUsage   += (tool.usage_count  || 0);
    c.totalQuality += (tool.quality_score || 0);
    if (tool.is_free) c.freeCount++;
    if (!c.topUsageTool || (tool.usage_count || 0) > (c.topUsageTool.usage_count || 0)) {
      c.topUsageTool = { name: tool.name, usageCount: tool.usage_count || 0 };
    }
  }

  // Normalize category stats
  const normalizedCategories = {};
  for (const [cat, data] of Object.entries(byCategory)) {
    normalizedCategories[cat] = {
      toolCount:          data.toolCount,
      avgQualityScore:    Math.round(data.totalQuality / data.toolCount),
      avgUsageCount:      Math.round(data.totalUsage   / data.toolCount),
      topTool:            data.topUsageTool?.name || null,
      topToolUsage:       data.topUsageTool?.usageCount || 0,
      freeRatio:          Math.round((data.freeCount / data.toolCount) * 100),
      recommendation:     data.toolCount < 5 ? 'high' : data.toolCount < 15 ? 'medium' : 'low',
    };
  }

  // Top categories by average usage
  const topCategories = Object.entries(normalizedCategories)
    .sort((a, b) => b[1].avgUsageCount - a[1].avgUsageCount)
    .slice(0, 8)
    .map(([cat, data]) => ({ category: cat, avgUsage: data.avgUsageCount, toolCount: data.toolCount }));

  // Pull approved ideas if table exists
  let approvedIdeasStats = { count: 0, avgScore: 0, topCategory: null };
  try {
    const { data: approvedIdeas } = await db()
      .from('generated_tool_ideas')
      .select('category, overall_score')
      .eq('approved', true)
      .limit(100);

    if (approvedIdeas?.length) {
      const ideaCatCounts = {};
      for (const idea of approvedIdeas) {
        ideaCatCounts[idea.category] = (ideaCatCounts[idea.category] || 0) + 1;
      }
      approvedIdeasStats = {
        count:       approvedIdeas.length,
        avgScore:    Math.round(_avg(approvedIdeas.map(i => i.overall_score || 0))),
        topCategory: Object.entries(ideaCatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      };
    }
  } catch (_) { /* table not yet created */ }

  _cache = {
    global: {
      totalPublishedTools:  totalTools,
      avgQualityScore:      Math.round(avgQuality),
      avgUsageCount:        Math.round(avgUsage),
      freeToolRatio:        Math.round(freeRatio * 100),
      approvedIdeas:        approvedIdeasStats,
    },
    byCategory:    normalizedCategories,
    topCategories,
  };
  _cacheTs = Date.now();

  log.info('Historical cache refreshed', { totalTools, categoryCount: Object.keys(normalizedCategories).length, ms: Date.now() - startMs });
}

function _buildInsights(global, catData, category) {
  const insights = [];

  if (global.totalPublishedTools > 0) {
    insights.push(`${global.totalPublishedTools} tools live — avg quality score ${global.avgQualityScore}/100`);
  }

  if (catData) {
    if (catData.recommendation === 'high') {
      insights.push(`"${category}" is under-represented — high opportunity for new tools`);
    } else if (catData.recommendation === 'low') {
      insights.push(`"${category}" is crowded (${catData.toolCount} tools) — differentiation is critical`);
    }
    if (catData.topTool) {
      insights.push(`Top performer in this category: "${catData.topTool}" (${catData.topToolUsage?.toLocaleString() || 0} uses)`);
    }
  }

  if (global.approvedIdeas?.count > 0) {
    insights.push(`${global.approvedIdeas.count} intelligence-approved ideas in history — avg score ${global.approvedIdeas.avgScore}`);
  }

  return insights;
}

function _avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function _emptyGlobal() {
  return { totalPublishedTools: 0, avgQualityScore: 0, avgUsageCount: 0, freeToolRatio: 80, approvedIdeas: { count: 0, avgScore: 0, topCategory: null } };
}

function _emptyCategory() {
  return { toolCount: 0, avgQualityScore: 0, avgUsageCount: 0, topTool: null, topToolUsage: 0, freeRatio: 80, recommendation: 'medium' };
}

module.exports = { getPatterns, invalidateCache };
