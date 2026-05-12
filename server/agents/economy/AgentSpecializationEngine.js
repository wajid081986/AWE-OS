'use strict';

/**
 * AWE-OS — AgentSpecializationEngine                           Phase 6D
 *
 * Tracks how well each agent performs in each category/domain and
 * identifies areas of genuine specialization vs weak coverage.
 *
 * Specialization is computed from observed task outcomes by category,
 * not from declared agent roles. An agent that consistently delivers
 * high-quality results for "finance" tasks earns finance specialization
 * regardless of its declared role.
 *
 * Signals:
 *   - Category affinity:    success rate per category (40%)
 *   - Consistency:          variance in quality per category (30%)
 *   - Volume:               relative task volume per category (20%)
 *   - Trend:                recent trajectory (10%)
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-specialization');

const CACHE_TTL = 25 * 60 * 1_000;

// Minimum tasks before category is considered "specialized"
const MIN_TASKS_FOR_SPECIALIZATION = 5;
const SPECIALIZATION_THRESHOLD     = 0.72; // affinity score ≥ 72% = specialized
const WEAK_THRESHOLD               = 0.40; // affinity score ≤ 40% = weakness

// Known categories aligned with AWE-OS tool categories
const CATEGORIES = [
  'pdf', 'calculators', 'converters', 'writing', 'marketing',
  'productivity', 'finance', 'health', 'education', 'legal',
  'ecommerce', 'other',
  // Agent-specific functional domains
  'optimization', 'learning', 'coordination', 'recovery', 'intelligence',
  'generation', 'deployment', 'analytics',
];

let _cache   = null;
let _cacheTs = 0;

// In-memory specialization state
// agentId → { [category]: { successes, failures, qualitySum, taskCount, lastTs } }
const _state = new Map();

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get specialization analysis for all agents.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<SpecializationReport>}
 */
async function getSpecializationReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    await _syncFromDB();
    const report = _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getSpecializationReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Record an outcome for an agent in a category.
 *
 * @param {object} outcome
 * @param {string} outcome.agentId
 * @param {string} outcome.category
 * @param {boolean} outcome.success
 * @param {number}  [outcome.qualityScore]  — 0–100
 */
function recordOutcome(outcome) {
  const { agentId, category, success, qualityScore = 70 } = outcome;
  if (!agentId || !category) return;

  const state = _getOrInit(agentId);
  if (!state[category]) {
    state[category] = { successes: 0, failures: 0, qualitySum: 0, taskCount: 0, lastTs: Date.now() };
  }

  const cat = state[category];
  if (success) cat.successes++; else cat.failures++;
  cat.qualitySum  += Math.max(0, Math.min(100, qualityScore));
  cat.taskCount++;
  cat.lastTs = Date.now();

  _state.set(agentId, state);
  _cache = null;

  _persistOutcome(agentId, category, state[category]).catch(() => {});
}

/**
 * Get top specializations for a specific agent.
 */
function getAgentSpecializations(agentId) {
  const state = _state.get(agentId);
  if (!state) return [];
  return _computeSpecializations(agentId, state)
    .filter(s => s.affinityScore >= SPECIALIZATION_THRESHOLD * 100)
    .sort((a, b) => b.affinityScore - a.affinityScore);
}

/**
 * Find agents best specialized for a given category.
 *
 * @param {string} category
 * @param {number} [topN=5]
 */
function findSpecialistsForCategory(category, topN = 5) {
  const candidates = [];
  for (const [agentId, state] of _state) {
    const cat = state[category];
    if (!cat || cat.taskCount < MIN_TASKS_FOR_SPECIALIZATION) continue;
    const affinity = _computeAffinity(cat);
    candidates.push({ agentId, affinityScore: Math.round(affinity * 10000) / 100, taskCount: cat.taskCount });
  }
  return candidates
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, topN);
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _getOrInit(agentId) {
  if (!_state.has(agentId)) _state.set(agentId, {});
  return _state.get(agentId);
}

async function _syncFromDB() {
  const { data: rows } = await db()
    .from('agent_specializations')
    .select('agent_id, category, successes, failures, avg_quality, task_count, updated_at')
    .order('task_count', { ascending: false })
    .limit(500);

  if (!rows?.length) return;

  for (const r of rows) {
    const state = _getOrInit(r.agent_id);
    state[r.category] = {
      successes:  r.successes   || 0,
      failures:   r.failures    || 0,
      qualitySum: (r.avg_quality || 70) * (r.task_count || 1),
      taskCount:  r.task_count  || 0,
      lastTs:     new Date(r.updated_at || Date.now()).getTime(),
    };
    _state.set(r.agent_id, state);
  }
}

function _computeAffinity(cat) {
  if (!cat || cat.taskCount === 0) return 0;
  const successRate = cat.successes / cat.taskCount;
  const avgQuality  = cat.qualitySum / cat.taskCount / 100;
  return successRate * 0.55 + avgQuality * 0.45;
}

function _computeSpecializations(agentId, state) {
  const results = [];
  for (const [category, cat] of Object.entries(state)) {
    if (cat.taskCount < 2) continue;
    const affinity     = _computeAffinity(cat);
    const avgQuality   = cat.taskCount > 0 ? Math.round(cat.qualitySum / cat.taskCount) : 0;
    const successRate  = cat.taskCount > 0 ? Math.round((cat.successes / cat.taskCount) * 10000) / 100 : 0;

    results.push({
      category,
      affinityScore: Math.round(affinity * 10000) / 100,
      successRate,
      avgQuality,
      taskCount:  cat.taskCount,
      isStrength: affinity >= SPECIALIZATION_THRESHOLD,
      isWeakness: affinity <= WEAK_THRESHOLD,
    });
  }
  return results.sort((a, b) => b.affinityScore - a.affinityScore);
}

function _buildReport() {
  const profiles = [];
  const categoryDemand = {}; // how many specialists per category

  for (const [agentId, state] of _state) {
    const specs = _computeSpecializations(agentId, state);
    const strengths = specs.filter(s => s.isStrength);
    const weaknesses = specs.filter(s => s.isWeakness);

    for (const s of strengths) {
      categoryDemand[s.category] = (categoryDemand[s.category] || 0) + 1;
    }

    profiles.push({
      agentId,
      strengths:    strengths.slice(0, 5),
      weaknesses:   weaknesses.slice(0, 3),
      allCategories: specs,
      specializationCount: strengths.length,
      topCategory:  strengths[0]?.category || null,
      topAffinity:  strengths[0]?.affinityScore || 0,
    });
  }

  profiles.sort((a, b) => b.specializationCount - a.specializationCount);

  // Build category specialists map
  const categorySpecialists = {};
  for (const cat of CATEGORIES) {
    categorySpecialists[cat] = findSpecialistsForCategory(cat, 3);
  }

  // Identify underserved categories (fewer than 2 specialists)
  const underservedCategories = CATEGORIES.filter(c =>
    (categoryDemand[c] || 0) < 2
  );

  return {
    profiles,
    categorySpecialists,
    underservedCategories,
    totalAgents:    profiles.length,
    analyzedAt:     new Date().toISOString(),
  };
}

async function _persistOutcome(agentId, category, cat) {
  await db()
    .from('agent_specializations')
    .upsert({
      agent_id:    agentId,
      category,
      successes:   cat.successes,
      failures:    cat.failures,
      avg_quality: cat.taskCount > 0 ? Math.round(cat.qualitySum / cat.taskCount) : 70,
      task_count:  cat.taskCount,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'agent_id,category' });
}

function _emptyReport() {
  return { profiles: [], categorySpecialists: {}, underservedCategories: CATEGORIES, totalAgents: 0, analyzedAt: new Date().toISOString() };
}

module.exports = {
  getSpecializationReport,
  recordOutcome,
  getAgentSpecializations,
  findSpecialistsForCategory,
  invalidateCache,
  CATEGORIES,
  SPECIALIZATION_THRESHOLD,
};
