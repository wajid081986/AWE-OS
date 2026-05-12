'use strict';

/**
 * AWE-OS — AgentContributionTracker                            Phase 6D
 *
 * Tracks measurable contributions from all agents across all value dimensions.
 * Each contribution is timestamped, attributed, scored, and persisted.
 *
 * Contribution types:
 *   optimization     — reduced latency, CPU, or memory
 *   revenue_impact   — tool launch, monetization improvement
 *   successful_launch — factory tool deployed successfully
 *   memory_improvement — long-term memory quality increase
 *   runtime_recovery  — self-healing action that restored stability
 *   self_heal_assist  — support during healing sequence
 *   bug_prevention    — caught anomaly before it became an incident
 *   performance_win   — measurable benchmark improvement
 *   collaboration     — quality contribution in multi-agent session
 *   learning          — contributed to intelligence pool
 *
 * Rolling windows:
 *   7d  — current performance
 *   30d — recent trend
 *   90d — baseline
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-contribution');

const CACHE_TTL       = 15 * 60 * 1_000;
const MAX_IN_MEMORY   = 500; // max contributions per agent in memory

// Point values per contribution type (used for rankings)
const CONTRIBUTION_POINTS = {
  optimization:      10,
  revenue_impact:    20,
  successful_launch: 25,
  memory_improvement: 8,
  runtime_recovery:  30,
  self_heal_assist:  15,
  bug_prevention:    20,
  performance_win:   12,
  collaboration:      8,
  learning:           6,
};

let _cache   = null;
let _cacheTs = 0;

// agentId → Contribution[]
const _store = new Map();

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a contribution.
 *
 * @param {object} contribution
 * @param {string} contribution.agentId
 * @param {string} contribution.type          — key from CONTRIBUTION_POINTS
 * @param {number} [contribution.value]       — numeric magnitude (e.g., $revenue, ms latency)
 * @param {number} [contribution.qualityScore] — 0–100 quality of this contribution
 * @param {string} [contribution.description]
 * @param {string} [contribution.toolId]
 * @param {string} [contribution.sessionId]
 * @param {object} [contribution.metadata]
 */
function record(contribution) {
  const {
    agentId, type, value = 0, qualityScore = 70,
    description = '', toolId = null, sessionId = null, metadata = {}
  } = contribution;

  if (!agentId || !type) return;

  const basePoints = CONTRIBUTION_POINTS[type] || 5;
  const qualMult   = 0.5 + (qualityScore / 100) * 1.0; // 0.5–1.5x based on quality
  const points     = Math.round(basePoints * qualMult * 100) / 100;

  const entry = {
    agentId,
    type,
    points,
    value:         Math.round(value * 100) / 100,
    qualityScore,
    description,
    toolId,
    sessionId,
    metadata,
    recordedAt:    new Date().toISOString(),
    ts:            Date.now(),
  };

  if (!_store.has(agentId)) _store.set(agentId, []);
  const list = _store.get(agentId);
  list.unshift(entry);
  if (list.length > MAX_IN_MEMORY) list.pop();

  _cache = null;
  _persistContribution(entry).catch(() => {});
}

/**
 * Get contribution summary for all agents.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<ContributionReport>}
 */
async function getContributionReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    await _loadRecentFromDB();
    const report = _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getContributionReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Get contribution history for a specific agent.
 *
 * @param {string} agentId
 * @param {number} [limit=50]
 */
function getAgentContributions(agentId, limit = 50) {
  return (_store.get(agentId) || []).slice(0, limit);
}

/**
 * Get total points for an agent in a time window.
 *
 * @param {string} agentId
 * @param {number} [days=30]
 */
function getAgentPoints(agentId, days = 30) {
  const cutoff = Date.now() - days * 86_400_000;
  return (_store.get(agentId) || [])
    .filter(c => c.ts >= cutoff)
    .reduce((s, c) => s + c.points, 0);
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _loadRecentFromDB() {
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const { data: rows } = await db()
    .from('agent_contributions')
    .select('agent_id, type, points, value, quality_score, description, tool_id, session_id, metadata, recorded_at')
    .gte('recorded_at', cutoff)
    .order('recorded_at', { ascending: false })
    .limit(1000);

  if (!rows?.length) return;

  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.agent_id]) grouped[r.agent_id] = [];
    grouped[r.agent_id].push({
      agentId:      r.agent_id,
      type:         r.type,
      points:       r.points || 0,
      value:        r.value  || 0,
      qualityScore: r.quality_score || 70,
      description:  r.description   || '',
      toolId:       r.tool_id,
      sessionId:    r.session_id,
      metadata:     r.metadata || {},
      recordedAt:   r.recorded_at,
      ts:           new Date(r.recorded_at).getTime(),
    });
  }

  for (const [agentId, contribs] of Object.entries(grouped)) {
    // Merge with in-memory (in-memory takes priority as it's more recent)
    const existing = new Set((_store.get(agentId) || []).map(c => c.recordedAt));
    const merged   = [
      ...(_store.get(agentId) || []),
      ...contribs.filter(c => !existing.has(c.recordedAt)),
    ].sort((a, b) => b.ts - a.ts).slice(0, MAX_IN_MEMORY);
    _store.set(agentId, merged);
  }
}

function _buildReport() {
  const now     = Date.now();
  const cut7d   = now - 7  * 86_400_000;
  const cut30d  = now - 30 * 86_400_000;

  const rankings = [];

  for (const [agentId, contribs] of _store) {
    const win7d  = contribs.filter(c => c.ts >= cut7d);
    const win30d = contribs.filter(c => c.ts >= cut30d);

    const byType = {};
    for (const c of win30d) {
      if (!byType[c.type]) byType[c.type] = { count: 0, totalPoints: 0, totalValue: 0 };
      byType[c.type].count++;
      byType[c.type].totalPoints += c.points;
      byType[c.type].totalValue  += c.value;
    }

    const points7d  = win7d.reduce((s, c) => s + c.points, 0);
    const points30d = win30d.reduce((s, c) => s + c.points, 0);
    const topType   = Object.entries(byType).sort((a, b) => b[1].totalPoints - a[1].totalPoints)[0];
    const revImpact = (byType.revenue_impact?.totalValue || 0) + (byType.successful_launch?.totalValue || 0);

    rankings.push({
      agentId,
      points7d:      Math.round(points7d  * 100) / 100,
      points30d:     Math.round(points30d * 100) / 100,
      totalContribs: contribs.length,
      topContribType: topType?.[0] || null,
      revenueImpact:  Math.round(revImpact * 100) / 100,
      byType,
      trend:          points30d > 0 ? (points7d / (points30d / 30 * 7) - 1) : 0,
    });
  }

  rankings.sort((a, b) => b.points30d - a.points30d);

  // Category aggregates
  const typeAgg = {};
  for (const r of rankings) {
    for (const [type, data] of Object.entries(r.byType)) {
      if (!typeAgg[type]) typeAgg[type] = { count: 0, totalPoints: 0, agentCount: 0 };
      typeAgg[type].count      += data.count;
      typeAgg[type].totalPoints += data.totalPoints;
      typeAgg[type].agentCount++;
    }
  }

  return {
    rankings,
    typeBreakdown:   typeAgg,
    topContributors: rankings.slice(0, 10),
    analyzedAt:      new Date().toISOString(),
  };
}

async function _persistContribution(entry) {
  await db()
    .from('agent_contributions')
    .insert({
      agent_id:      entry.agentId,
      type:          entry.type,
      points:        entry.points,
      value:         entry.value,
      quality_score: entry.qualityScore,
      description:   entry.description,
      tool_id:       entry.toolId,
      session_id:    entry.sessionId,
      metadata:      entry.metadata || {},
      recorded_at:   entry.recordedAt,
    });
}

function _emptyReport() {
  return { rankings: [], typeBreakdown: {}, topContributors: [], analyzedAt: new Date().toISOString() };
}

module.exports = {
  record,
  getContributionReport,
  getAgentContributions,
  getAgentPoints,
  invalidateCache,
  CONTRIBUTION_POINTS,
};
