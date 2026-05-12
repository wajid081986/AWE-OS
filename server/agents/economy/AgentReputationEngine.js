'use strict';

/**
 * AWE-OS — AgentReputationEngine                               Phase 6D
 *
 * Dynamic reputation system for all registered agents.
 * Builds trust scores from historical performance, penalizes inconsistency,
 * applies decay for inactivity, and resists gaming via capped single-event gains.
 *
 * Reputation dimensions:
 *   execution     — task success rate and latency consistency
 *   learning      — quality of intelligence contributions
 *   optimization  — measurable performance improvements
 *   coordination  — collaboration session outcomes
 *   recovery      — self-healing assistance quality
 *
 * Anti-gaming protections:
 *   - Single-event gain capped at +MAX_SINGLE_GAIN per dimension
 *   - Rapid-gain dampening (>3 events in 1h → 50% gain reduction)
 *   - Minimum trust floor per agent class (prevents spam accounts)
 *   - Volatility tracking (high volatility = lower confidence weight)
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-reputation');

const CACHE_TTL      = 20 * 60 * 1_000;  // 20 min
const DECAY_PER_WEEK = 0.02;             // 2% trust decay per week of inactivity
const MIN_TRUST      = 0.10;             // floor — no agent drops below 10%
const MAX_TRUST      = 1.00;
const MAX_SINGLE_GAIN = 0.05;            // 5% max reputation gain per event
const RAPID_GAIN_WINDOW_MS = 60 * 60_000; // 1 hour
const RAPID_GAIN_THRESHOLD = 3;           // >3 gains in 1h = dampened
const WINDOW_DAYS    = 30;               // rolling window for reputation analysis

// Dimension weights for composite trust score
const DIMENSION_WEIGHTS = {
  execution:    0.35,
  learning:     0.20,
  optimization: 0.20,
  coordination: 0.15,
  recovery:     0.10,
};

let _cache   = null;
let _cacheTs = 0;

// In-memory reputation state — seeded from DB, updated on events
const _state = new Map(); // agentId → ReputationRecord

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get full reputation report for all agents.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<ReputationReport>}
 */
async function getReputationReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    await _syncFromDB();
    const report = _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getReputationReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Record a reputation event for an agent.
 *
 * @param {object} event
 * @param {string} event.agentId
 * @param {string} event.dimension  — execution|learning|optimization|coordination|recovery
 * @param {number} event.delta      — raw change (-1 to +1)
 * @param {string} [event.reason]
 * @param {object} [event.metadata]
 */
async function recordEvent(event) {
  try {
    const { agentId, dimension, delta, reason = '', metadata = {} } = event;
    if (!agentId || !dimension || delta == null) return;

    let rec = _state.get(agentId) || _initRecord(agentId);

    // Anti-gaming: cap single-event gain
    const cappedDelta = Math.max(-0.20, Math.min(MAX_SINGLE_GAIN, delta));

    // Rapid-gain dampening
    const recentGains = rec.recentGains.filter(t => (Date.now() - t) < RAPID_GAIN_WINDOW_MS);
    const dampen = cappedDelta > 0 && recentGains.length >= RAPID_GAIN_THRESHOLD ? 0.5 : 1.0;
    const finalDelta = cappedDelta * dampen;

    if (cappedDelta > 0) rec.recentGains.push(Date.now());
    rec.recentGains = rec.recentGains.filter(t => (Date.now() - t) < RAPID_GAIN_WINDOW_MS);

    // Apply to dimension
    const prev = rec.dimensions[dimension] ?? 0.70;
    rec.dimensions[dimension] = Math.min(MAX_TRUST, Math.max(MIN_TRUST, prev + finalDelta));
    rec.lastEventAt = new Date().toISOString();
    rec.eventCount++;

    // Volatility tracking (std dev of recent deltas)
    rec.recentDeltas.push(finalDelta);
    if (rec.recentDeltas.length > 20) rec.recentDeltas.shift();
    rec.volatility = _stdDev(rec.recentDeltas);

    _state.set(agentId, rec);
    _cache = null; // invalidate

    // Non-blocking persist
    _persistEvent(agentId, dimension, finalDelta, reason, metadata).catch(() => {});
  } catch (err) {
    log.warn('recordEvent failed', { error: err.message });
  }
}

/**
 * Apply time-based trust decay for inactive agents.
 * Called periodically (e.g., hourly via cron).
 */
function applyDecay() {
  const now = Date.now();
  for (const [agentId, rec] of _state) {
    const msSinceLast = now - new Date(rec.lastEventAt).getTime();
    const weeksSinceLast = msSinceLast / (7 * 86_400_000);
    if (weeksSinceLast > 1) {
      const decayFactor = 1 - DECAY_PER_WEEK * Math.min(weeksSinceLast, 8); // cap at 8 weeks
      for (const dim of Object.keys(rec.dimensions)) {
        rec.dimensions[dim] = Math.max(MIN_TRUST, rec.dimensions[dim] * decayFactor);
      }
      _state.set(agentId, rec);
    }
  }
  _cache = null;
}

function invalidateCache() {
  _cache = null; _cacheTs = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _initRecord(agentId) {
  return {
    agentId,
    dimensions: {
      execution:    0.70,
      learning:     0.65,
      optimization: 0.65,
      coordination: 0.70,
      recovery:     0.60,
    },
    recentGains:  [],
    recentDeltas: [],
    volatility:   0,
    eventCount:   0,
    lastEventAt:  new Date().toISOString(),
    syncedAt:     null,
  };
}

async function _syncFromDB() {
  const { data: rows } = await db()
    .from('agent_reputation')
    .select('agent_id, dimension, score, event_count, last_event_at')
    .order('last_event_at', { ascending: false });

  if (!rows?.length) return;

  // Group by agentId
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.agent_id]) grouped[r.agent_id] = { eventCount: 0, dimensions: {} };
    grouped[r.agent_id].dimensions[r.dimension] = r.score;
    grouped[r.agent_id].eventCount = Math.max(grouped[r.agent_id].eventCount, r.event_count || 0);
    grouped[r.agent_id].lastEventAt = r.last_event_at;
  }

  for (const [agentId, data] of Object.entries(grouped)) {
    const existing = _state.get(agentId) || _initRecord(agentId);
    for (const [dim, score] of Object.entries(data.dimensions)) {
      existing.dimensions[dim] = score;
    }
    existing.eventCount  = data.eventCount;
    existing.lastEventAt = data.lastEventAt || existing.lastEventAt;
    existing.syncedAt    = new Date().toISOString();
    _state.set(agentId, existing);
  }
}

function _buildReport() {
  const profiles = [];
  for (const [agentId, rec] of _state) {
    const trustScore = _computeTrust(rec);
    profiles.push({
      agentId,
      trustScore:      Math.round(trustScore * 10000) / 100,
      dimensions:      Object.fromEntries(
        Object.entries(rec.dimensions).map(([k, v]) => [k, Math.round(v * 10000) / 100])
      ),
      volatility:      Math.round(rec.volatility * 10000) / 100,
      eventCount:      rec.eventCount,
      lastEventAt:     rec.lastEventAt,
      grade:           trustScore >= 0.85 ? 'S' : trustScore >= 0.75 ? 'A' : trustScore >= 0.60 ? 'B' : trustScore >= 0.45 ? 'C' : 'D',
      anomalyFlag:     rec.volatility > 0.15,
      confidenceWeight: Math.max(0.3, 1 - rec.volatility * 2),
    });
  }

  profiles.sort((a, b) => b.trustScore - a.trustScore);

  return {
    profiles,
    topTrusted:    profiles.slice(0, 5),
    anomalies:     profiles.filter(p => p.anomalyFlag),
    avgTrustScore: profiles.length
      ? Math.round(profiles.reduce((s, p) => s + p.trustScore, 0) / profiles.length * 100) / 100
      : 0,
    analyzedAt:    new Date().toISOString(),
  };
}

function _computeTrust(rec) {
  let score = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    score += (rec.dimensions[dim] ?? 0.65) * weight;
  }
  return Math.min(MAX_TRUST, Math.max(MIN_TRUST, score));
}

function _stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

async function _persistEvent(agentId, dimension, delta, reason, metadata) {
  await db()
    .from('agent_reputation')
    .upsert({
      agent_id:      agentId,
      dimension,
      score:         _state.get(agentId)?.dimensions[dimension] ?? 0.65,
      event_count:   _state.get(agentId)?.eventCount ?? 1,
      last_event_at: new Date().toISOString(),
      last_delta:    delta,
      last_reason:   reason,
      metadata:      metadata || {},
    }, { onConflict: 'agent_id,dimension' });
}

function _emptyReport() {
  return { profiles: [], topTrusted: [], anomalies: [], avgTrustScore: 0, analyzedAt: new Date().toISOString() };
}

module.exports = {
  getReputationReport,
  recordEvent,
  applyDecay,
  invalidateCache,
  DIMENSION_WEIGHTS,
  // Direct state access for economy engine
  getAgentRecord: (agentId) => _state.get(agentId) || _initRecord(agentId),
  computeTrust:   (agentId) => {
    const rec = _state.get(agentId) || _initRecord(agentId);
    return _computeTrust(rec);
  },
};
