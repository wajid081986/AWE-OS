'use strict';

/**
 * AWE-OS — AgentMarketplace                                    Phase 6D
 *
 * Internal autonomous marketplace where tasks are matched to agents
 * based on specialization, availability, reputation, and cost efficiency.
 *
 * The "marketplace" operates as an algorithmic matching and routing layer:
 *   1. Task arrives with category + requirements
 *   2. Engine scores all eligible agents
 *   3. Returns routing recommendation with confidence
 *   4. Tracks demand patterns for heatmap analytics
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-marketplace');

const CACHE_TTL = 10 * 60 * 1_000; // 10 min

// Routing score weights
const ROUTING_WEIGHTS = {
  specialization:  0.35, // category affinity
  reputation:      0.30, // trust score
  availability:    0.20, // workload headroom (1 - workload_score)
  creditEfficiency: 0.15, // credits earned / spent ratio
};

// Demand history window (for heatmaps)
const DEMAND_WINDOW_MS  = 24 * 60 * 60_000; // 24h
const MAX_DEMAND_EVENTS = 1000;

let _cache       = null;
let _cacheTs     = 0;
const _demand    = []; // { category, agentId, ts, routed }
const _capIndex  = {}; // capability index: capability → [agentId, ...]

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the full marketplace state: routing table, heatmaps, indexes.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<MarketplaceState>}
 */
async function getMarketplaceState(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    await _buildCapabilityIndex();
    const state = await _buildState();
    _cache   = state;
    _cacheTs = now;
    return state;
  } catch (err) {
    log.warn('getMarketplaceState failed', { error: err.message });
    return _emptyState();
  }
}

/**
 * Route a task to the best available agent.
 *
 * @param {object} task
 * @param {string} task.category        — tool/domain category
 * @param {string} [task.capability]    — specific capability needed
 * @param {string} [task.priority]      — low|normal|high|critical
 * @param {object} [context]            — { reputationMap, creditMap, availabilityMap, specializationMap }
 * @returns {RoutingDecision}
 */
function routeTask(task, context = {}) {
  const { category = 'other', capability = null, priority = 'normal' } = task;
  const {
    reputationMap     = {},
    creditMap         = {},
    availabilityMap   = {},
    specializationMap = {},
  } = context;

  // Candidate agents from capability index or all registered
  const candidates = capability && _capIndex[capability]
    ? _capIndex[capability]
    : Object.keys({ ...reputationMap, ...availabilityMap });

  if (candidates.length === 0) {
    return { routed: false, reason: 'no_candidates', category, capability };
  }

  const scored = candidates.map(agentId => {
    const reputation  = (reputationMap[agentId]     || 0.65) * 100;
    const workload    = availabilityMap[agentId]     || 0.5;
    const availability = (1 - workload) * 100;
    const specAffinity = (specializationMap[agentId]?.[category] || 50);
    const efficiency  = Math.min(100, creditMap[agentId]?.efficiency || 50);

    const score = (
      specAffinity  * ROUTING_WEIGHTS.specialization  +
      reputation    * ROUTING_WEIGHTS.reputation       +
      availability  * ROUTING_WEIGHTS.availability     +
      efficiency    * ROUTING_WEIGHTS.creditEfficiency
    );

    return { agentId, score: Math.round(score * 100) / 100, reputation, availability, specAffinity, efficiency };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alt  = scored[1] || null;

  // Record demand event
  _demand.push({ category, agentId: best.agentId, ts: Date.now(), routed: true });
  if (_demand.length > MAX_DEMAND_EVENTS) _demand.shift();

  _cache = null;

  // Non-blocking audit
  _persistRouting(task, best, priority).catch(() => {});

  log.debug('Task routed', { category, agentId: best.agentId, score: best.score });

  return {
    routed:         true,
    primaryAgent:   best.agentId,
    primaryScore:   best.score,
    fallbackAgent:  alt?.agentId || null,
    fallbackScore:  alt?.score   || null,
    allCandidates:  scored.slice(0, 5),
    category,
    priority,
    routedAt:       new Date().toISOString(),
  };
}

/**
 * Index a capability for an agent.
 *
 * @param {string} agentId
 * @param {string[]} capabilities
 */
function indexCapabilities(agentId, capabilities) {
  for (const cap of capabilities) {
    if (!_capIndex[cap]) _capIndex[cap] = [];
    if (!_capIndex[cap].includes(agentId)) _capIndex[cap].push(agentId);
  }
}

/**
 * Record a demand signal without routing.
 */
function recordDemand(category, agentId = null) {
  _demand.push({ category, agentId, ts: Date.now(), routed: false });
  if (_demand.length > MAX_DEMAND_EVENTS) _demand.shift();
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildCapabilityIndex() {
  const { data: caps } = await db()
    .from('agent_capabilities')
    .select('agent_id, capabilities')
    .limit(200);

  if (!caps?.length) return;
  for (const r of caps) {
    if (r.capabilities) indexCapabilities(r.agent_id, r.capabilities);
  }
}

async function _buildState() {
  const cutoff24h = Date.now() - DEMAND_WINDOW_MS;
  const recent    = _demand.filter(d => d.ts >= cutoff24h);

  // Demand heatmap
  const demandHeatmap = {};
  for (const d of recent) {
    demandHeatmap[d.category] = (demandHeatmap[d.category] || 0) + 1;
  }

  // Per-agent demand
  const agentDemand = {};
  for (const d of recent.filter(d => d.agentId)) {
    agentDemand[d.agentId] = (agentDemand[d.agentId] || 0) + 1;
  }

  // Routing matrix: category → most-routed agent
  const routingMatrix = {};
  const routedEvents  = recent.filter(d => d.routed && d.agentId);
  for (const d of routedEvents) {
    if (!routingMatrix[d.category]) routingMatrix[d.category] = {};
    routingMatrix[d.category][d.agentId] = (routingMatrix[d.category][d.agentId] || 0) + 1;
  }

  // Capability catalog
  const capCatalog = {};
  for (const [cap, agents] of Object.entries(_capIndex)) {
    capCatalog[cap] = { agentCount: agents.length, agents: agents.slice(0, 5) };
  }

  // Marketplace health
  const totalCapabilities   = Object.keys(_capIndex).length;
  const totalDemandEvents   = recent.length;
  const coverageGaps        = Object.entries(demandHeatmap)
    .filter(([cat]) => !_capIndex[cat] || _capIndex[cat].length < 2)
    .map(([cat, count]) => ({ category: cat, demandCount: count }))
    .sort((a, b) => b.demandCount - a.demandCount);

  return {
    demandHeatmap,
    agentDemand,
    routingMatrix,
    capCatalog,
    coverageGaps,
    marketplaceHealth: {
      totalCapabilities,
      totalDemandEvents,
      routingRate: totalDemandEvents > 0
        ? Math.round((routedEvents.length / totalDemandEvents) * 10000) / 100
        : 0,
      coverageScore: Object.keys(demandHeatmap).length > 0
        ? Math.round(((Object.keys(demandHeatmap).length - coverageGaps.length) / Object.keys(demandHeatmap).length) * 10000) / 100
        : 100,
    },
    analyzedAt: new Date().toISOString(),
  };
}

async function _persistRouting(task, decision, priority) {
  await db()
    .from('agent_marketplace')
    .insert({
      category:     task.category,
      capability:   task.capability || null,
      priority,
      agent_id:     decision.agentId,
      routing_score: decision.score,
      routed_at:    new Date().toISOString(),
      metadata:     { category: task.category, score: decision.score },
    });
}

function _emptyState() {
  return {
    demandHeatmap: {}, agentDemand: {}, routingMatrix: {}, capCatalog: {},
    coverageGaps: [], marketplaceHealth: { totalCapabilities: 0, totalDemandEvents: 0, routingRate: 0, coverageScore: 100 },
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = {
  getMarketplaceState,
  routeTask,
  indexCapabilities,
  recordDemand,
  invalidateCache,
  ROUTING_WEIGHTS,
};
