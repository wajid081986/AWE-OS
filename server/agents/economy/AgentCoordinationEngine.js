'use strict';

/**
 * AWE-OS — AgentCoordinationEngine                             Phase 6D
 *
 * Multi-agent coordination layer. Tracks delegation chains, workload
 * balancing, collaborative execution quality, and distributed consensus.
 *
 * Coordination signals derived from:
 *   - collaboration_sessions table (Phase 5C)
 *   - consensus_votes table (Phase 5C)
 *   - In-memory delegation chain tracking
 *
 * Outputs:
 *   - Per-agent coordination score (0–100)
 *   - Session quality analysis
 *   - Workload balance index
 *   - Leader election simulation (algorithmic best-fit)
 *   - Fallback chain recommendations
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-coordination');

const CACHE_TTL = 15 * 60 * 1_000;

// Coordination score weights
const COORD_WEIGHTS = {
  sessionSuccess:   0.40,  // completed sessions / total sessions
  delegationQuality: 0.25, // quality of tasks successfully delegated
  consensusRate:    0.20,  // consensus reached / total votes
  workloadBalance:  0.15,  // how evenly work is distributed (lower variance = higher score)
};

// Max coordination chains per agent in memory
const MAX_CHAIN_DEPTH = 10;
const MAX_QUEUE_WAIT_MS = 5 * 60_000; // 5 min max before flagging coordination debt

let _cache   = null;
let _cacheTs = 0;

// Delegation chain tracking (in-memory)
const _chains = new Map(); // sessionId → DelegationChain
const _agentQueues = new Map(); // agentId → queue depth

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get full coordination analysis.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<CoordinationReport>}
 */
async function getCoordinationReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    const report = await _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getCoordinationReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Track a delegation event.
 *
 * @param {object} event
 * @param {string} event.sessionId
 * @param {string} event.fromAgentId
 * @param {string} event.toAgentId
 * @param {string} event.taskType
 * @param {boolean} [event.accepted]
 */
function trackDelegation(event) {
  const { sessionId, fromAgentId, toAgentId, taskType, accepted = true } = event;

  let chain = _chains.get(sessionId) || {
    sessionId,
    links:    [],
    startedAt: Date.now(),
    depth:    0,
  };

  if (chain.depth < MAX_CHAIN_DEPTH) {
    chain.links.push({ from: fromAgentId, to: toAgentId, taskType, accepted, ts: Date.now() });
    chain.depth++;
  }

  _chains.set(sessionId, chain);

  // Track queue depth
  if (accepted) {
    _agentQueues.set(toAgentId, (_agentQueues.get(toAgentId) || 0) + 1);
  }

  _cache = null;
}

/**
 * Mark a delegation chain as completed.
 *
 * @param {string} sessionId
 * @param {boolean} success
 */
function completeChain(sessionId, success) {
  const chain = _chains.get(sessionId);
  if (!chain) return;

  // Decrement queue depths for all agents in chain
  for (const link of chain.links) {
    const current = _agentQueues.get(link.to) || 0;
    if (current > 0) _agentQueues.set(link.to, current - 1);
  }

  chain.completedAt = Date.now();
  chain.success     = success;
  _chains.set(sessionId, chain);
  _cache = null;
}

/**
 * Get the recommended leader agent for a new session.
 * Based on lowest workload + highest coordination score.
 *
 * @param {object[]} candidates - [{ agentId, coordinationScore, workload }]
 * @returns {string|null}
 */
function electLeader(candidates) {
  if (!candidates?.length) return null;

  const scored = candidates.map(c => ({
    agentId: c.agentId,
    score: (c.coordinationScore || 50) * 0.6 + (100 - (c.workload || 50)) * 0.4,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.agentId || null;
}

/**
 * Get current workload queue depths.
 */
function getQueueDepths() {
  return Object.fromEntries(_agentQueues);
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildReport() {
  const cutoff30d = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // Load collaboration sessions
  const { data: sessions } = await db()
    .from('collaboration_sessions')
    .select('id, participants, status, outcome_quality, started_at, ended_at')
    .gte('started_at', cutoff30d)
    .order('started_at', { ascending: false })
    .limit(500);

  // Load consensus votes
  const { data: votes } = await db()
    .from('consensus_votes')
    .select('session_id, voter_id, vote, weight, reached_consensus, created_at')
    .gte('created_at', cutoff30d)
    .limit(1000);

  const sess  = sessions || [];
  const vots  = votes    || [];

  // Per-agent coordination metrics
  const agentMetrics = {};

  const ensureAgent = (id) => {
    if (!agentMetrics[id]) {
      agentMetrics[id] = {
        sessions: 0, sessionSuccesses: 0,
        delegations: 0, delegationSuccesses: 0,
        votes: 0, consensusVotes: 0,
        qualitySum: 0,
      };
    }
    return agentMetrics[id];
  };

  // Process sessions
  for (const s of sess) {
    const participants = s.participants || [];
    for (const pid of participants) {
      const m = ensureAgent(pid);
      m.sessions++;
      if (s.status === 'completed' || s.outcome_quality >= 70) m.sessionSuccesses++;
      m.qualitySum += s.outcome_quality || 0;
    }
  }

  // Process votes
  for (const v of vots) {
    const m = ensureAgent(v.voter_id);
    m.votes++;
    if (v.reached_consensus) m.consensusVotes++;
  }

  // Process delegation chains (in-memory)
  for (const [, chain] of _chains) {
    for (const link of chain.links) {
      const m = ensureAgent(link.from);
      m.delegations++;
      if (link.accepted && chain.success !== false) m.delegationSuccesses++;
    }
  }

  // Compute per-agent coordination scores
  const profiles = Object.entries(agentMetrics).map(([agentId, m]) => {
    const sessionSuccessRate  = m.sessions  > 0 ? m.sessionSuccesses  / m.sessions  : 0.70;
    const delegationQuality   = m.delegations > 0 ? m.delegationSuccesses / m.delegations : 0.70;
    const consensusRate       = m.votes > 0 ? m.consensusVotes / m.votes : 0.70;
    const avgQuality          = m.sessions > 0 ? m.qualitySum / m.sessions : 70;
    const workload            = Math.min(1, (_agentQueues.get(agentId) || 0) / 10); // normalize 0–10 tasks
    const workloadBalance     = 1 - workload;

    const coordScore = (
      sessionSuccessRate  * COORD_WEIGHTS.sessionSuccess   +
      delegationQuality   * COORD_WEIGHTS.delegationQuality +
      consensusRate       * COORD_WEIGHTS.consensusRate     +
      workloadBalance     * COORD_WEIGHTS.workloadBalance
    ) * 100;

    return {
      agentId,
      coordinationScore:  Math.round(coordScore  * 100) / 100,
      sessionSuccessRate: Math.round(sessionSuccessRate * 10000) / 100,
      delegationQuality:  Math.round(delegationQuality * 10000) / 100,
      consensusRate:      Math.round(consensusRate  * 10000) / 100,
      avgSessionQuality:  Math.round(avgQuality),
      workload:           Math.round(workload * 10000) / 100,
      queueDepth:         _agentQueues.get(agentId) || 0,
      totalSessions:      m.sessions,
      totalVotes:         m.votes,
    };
  });

  profiles.sort((a, b) => b.coordinationScore - a.coordinationScore);

  // Workload imbalance detection
  const workloads     = profiles.map(p => p.workload);
  const avgWorkload   = workloads.length ? workloads.reduce((s, v) => s + v, 0) / workloads.length : 0;
  const maxWorkload   = Math.max(...workloads, 0);
  const imbalanced    = profiles.filter(p => p.workload > avgWorkload * 1.8);

  // Active delegation chains
  const activeChains  = [..._chains.values()]
    .filter(c => !c.completedAt && (Date.now() - c.startedAt) < 30 * 60_000)
    .map(c => ({
      sessionId: c.sessionId,
      depth:     c.depth,
      ageDs:     Math.round((Date.now() - c.startedAt) / 1000),
      links:     c.links.slice(-3),
    }));

  return {
    profiles,
    topCoordinators:    profiles.slice(0, 5),
    imbalancedAgents:   imbalanced,
    activeChains:       activeChains.slice(0, 10),
    summary: {
      totalAgents:         profiles.length,
      avgCoordinationScore: profiles.length
        ? Math.round(profiles.reduce((s, p) => s + p.coordinationScore, 0) / profiles.length * 100) / 100
        : 0,
      avgWorkload:          Math.round(avgWorkload * 10000) / 100,
      maxWorkload:          Math.round(maxWorkload * 10000) / 100,
      activeSessions:       sess.filter(s => s.status === 'running').length,
    },
    analyzedAt: new Date().toISOString(),
  };
}

function _emptyReport() {
  return {
    profiles: [], topCoordinators: [], imbalancedAgents: [], activeChains: [],
    summary: { totalAgents: 0, avgCoordinationScore: 0, avgWorkload: 0, maxWorkload: 0, activeSessions: 0 },
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = {
  getCoordinationReport,
  trackDelegation,
  completeChain,
  electLeader,
  getQueueDepths,
  invalidateCache,
};
