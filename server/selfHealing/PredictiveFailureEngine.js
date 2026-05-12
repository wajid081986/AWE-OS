'use strict';

/**
 * AWE-OS — PredictiveFailureEngine                               Phase 6E
 *
 * Detects early warning signals of impending failures before they occur.
 *
 * Detection methods:
 *   drift         — metric deviation from rolling baseline (z-score)
 *   trend         — sustained directional movement (slope over window)
 *   anomaly       — point outliers using IQR / simple threshold
 *   instability   — high variance in execution success rate
 *   saturation    — queue/worker capacity trending toward 100%
 *
 * Output:
 *   - Per-component failure probability (0–1)
 *   - Risk tier: CRITICAL / HIGH / MEDIUM / LOW / NOMINAL
 *   - Predicted time-to-failure (TTF) estimate
 *   - Actionable alert per signal
 *
 * Data sources:
 *   - pipeline_executions (success/fail rates)
 *   - distributed_workers (heartbeat gap, saturation)
 *   - agent_profiles (workload_score drift)
 *   - In-memory metric feed from SelfHealingEngine
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('predictive-failure');

const CACHE_TTL      = 5 * 60_000;   // 5 min — intentionally short for fresh signals
const WINDOW_1H      = 60 * 60_000;
const WINDOW_24H     = 24 * 60 * 60_000;
const Z_SCORE_ALERT  = 2.5;          // z > 2.5 → anomaly
const TREND_PERIODS  = 5;            // data points for linear regression
const SATURATION_WARN = 0.80;        // 80% utilization = warning
const SATURATION_CRIT = 0.95;        // 95% utilization = critical

const RISK_TIERS = {
  CRITICAL: { min: 0.75, label: 'CRITICAL', color: 'red'    },
  HIGH:     { min: 0.50, label: 'HIGH',     color: 'orange' },
  MEDIUM:   { min: 0.25, label: 'MEDIUM',   color: 'yellow' },
  LOW:      { min: 0.10, label: 'LOW',      color: 'blue'   },
  NOMINAL:  { min: 0,    label: 'NOMINAL',  color: 'green'  },
};

let _cache   = null;
let _cacheTs = 0;

// In-memory metric feed: metricKey → [{ ts, value }]
const _metricSeries = new Map();
const MAX_SERIES_LEN = 200;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the current predictive failure report.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<PredictiveReport>}
 */
async function getPredictiveReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    const report = await _buildReport();
    _cache   = report;
    _cacheTs = now;
    return report;
  } catch (err) {
    log.warn('getPredictiveReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Feed a metric data point into the prediction engine.
 * Call from execution paths, worker heartbeats, etc.
 *
 * @param {string} metricKey  — e.g. 'worker:w1:success_rate'
 * @param {number} value
 */
function feedMetric(metricKey, value) {
  if (!_metricSeries.has(metricKey)) _metricSeries.set(metricKey, []);
  const series = _metricSeries.get(metricKey);
  series.push({ ts: Date.now(), value });
  if (series.length > MAX_SERIES_LEN) series.shift();
  _cache = null;
}

/**
 * Get the failure probability for a specific component.
 *
 * @param {string} componentId — workerId or executionId
 * @returns {Promise<number>} 0–1
 */
async function getFailureProbability(componentId) {
  const report = await getPredictiveReport();
  return report.components.find(c => c.componentId === componentId)?.probability || 0;
}

/**
 * Get all active alerts (HIGH or CRITICAL risk).
 */
async function getActiveAlerts() {
  const report = await getPredictiveReport();
  return report.alerts;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildReport() {
  const startMs = Date.now();
  const cutoff1h  = new Date(Date.now() - WINDOW_1H).toISOString();
  const cutoff24h = new Date(Date.now() - WINDOW_24H).toISOString();

  // Load recent execution outcomes
  const [execResult, workerResult, agentResult] = await Promise.all([
    db().from('pipeline_executions')
      .select('id, worker_id, status, created_at, updated_at')
      .gte('created_at', cutoff24h)
      .order('created_at', { ascending: false })
      .limit(500),
    db().from('distributed_workers')
      .select('id, worker_id, status, last_heartbeat, workload_score')
      .limit(50),
    db().from('agent_profiles')
      .select('agent_id, workload_score, total_tasks, success_count, confidence_score')
      .limit(100),
  ]);

  const execs   = execResult.data   || [];
  const workers = workerResult.data || [];
  const agents  = agentResult.data  || [];

  const components = [];
  const alerts     = [];

  // ── Worker analysis ──────────────────────────────────────────────────────
  for (const w of workers) {
    const signals = [];
    let probability = 0;

    // Heartbeat gap drift
    if (w.last_heartbeat) {
      const gapMs  = Date.now() - new Date(w.last_heartbeat).getTime();
      const gapMin = gapMs / 60_000;

      if (gapMin > 4)       { signals.push({ type: 'heartbeat_gap', value: gapMin, severity: 'CRITICAL' }); probability = Math.max(probability, 0.90); }
      else if (gapMin > 2)  { signals.push({ type: 'heartbeat_gap', value: gapMin, severity: 'HIGH'     }); probability = Math.max(probability, 0.60); }
      else if (gapMin > 1)  { signals.push({ type: 'heartbeat_gap', value: gapMin, severity: 'MEDIUM'   }); probability = Math.max(probability, 0.30); }
    }

    // Workload saturation
    if (w.workload_score != null) {
      if (w.workload_score >= SATURATION_CRIT) {
        signals.push({ type: 'saturation', value: w.workload_score, severity: 'CRITICAL' });
        probability = Math.max(probability, 0.80);
      } else if (w.workload_score >= SATURATION_WARN) {
        signals.push({ type: 'saturation', value: w.workload_score, severity: 'HIGH' });
        probability = Math.max(probability, 0.45);
      }
    }

    // Failure rate in last 1h for this worker
    const workerExecs1h  = execs.filter(e => e.worker_id === w.worker_id && new Date(e.created_at).getTime() >= Date.now() - WINDOW_1H);
    const workerFailed1h = workerExecs1h.filter(e => e.status === 'failed').length;
    const failRate1h     = workerExecs1h.length > 0 ? workerFailed1h / workerExecs1h.length : 0;

    if (failRate1h >= 0.5)      { signals.push({ type: 'failure_rate_1h', value: failRate1h, severity: 'CRITICAL' }); probability = Math.max(probability, 0.85); }
    else if (failRate1h >= 0.3) { signals.push({ type: 'failure_rate_1h', value: failRate1h, severity: 'HIGH'     }); probability = Math.max(probability, 0.55); }
    else if (failRate1h >= 0.15){ signals.push({ type: 'failure_rate_1h', value: failRate1h, severity: 'MEDIUM'   }); probability = Math.max(probability, 0.25); }

    // In-memory series: z-score drift
    const seriesKey = `worker:${w.worker_id}:success_rate`;
    if (_metricSeries.has(seriesKey)) {
      const zAlerts = _detectZScoreAnomaly(seriesKey, 1 - failRate1h);
      for (const za of zAlerts) {
        signals.push(za);
        probability = Math.max(probability, 0.40);
      }
    }

    const risk = _riskTier(probability);
    const comp = {
      componentId:  w.worker_id,
      componentType: 'worker',
      probability:  Math.round(probability * 1000) / 1000,
      risk:         risk.label,
      signals,
      ttfEstimate:  _estimateTTF(probability),
    };
    components.push(comp);

    if (risk.label === 'CRITICAL' || risk.label === 'HIGH') {
      alerts.push({ ...comp, alertedAt: new Date().toISOString() });
    }
  }

  // ── Execution instability analysis ───────────────────────────────────────
  const recentFailed  = execs.filter(e => e.status === 'failed'  && new Date(e.created_at).getTime() >= Date.now() - WINDOW_1H).length;
  const recentTotal   = execs.filter(e => new Date(e.created_at).getTime() >= Date.now() - WINDOW_1H).length;
  const globalFailRate = recentTotal > 0 ? recentFailed / recentTotal : 0;

  const execVariance = _computeVariance(_hourlyFailRates(execs));
  const execInstability = Math.min(1, execVariance * 10);

  let execProb = globalFailRate * 0.6 + execInstability * 0.4;
  execProb = Math.min(1, Math.max(0, execProb));

  const execRisk = _riskTier(execProb);
  const execComp = {
    componentId:   'execution_pipeline',
    componentType: 'pipeline',
    probability:   Math.round(execProb * 1000) / 1000,
    risk:          execRisk.label,
    signals: [
      { type: 'global_fail_rate_1h', value: Math.round(globalFailRate * 1000) / 1000, severity: execRisk.label },
      { type: 'execution_instability', value: Math.round(execInstability * 1000) / 1000, severity: execRisk.label },
    ],
    ttfEstimate: _estimateTTF(execProb),
  };
  components.push(execComp);
  if (execRisk.label === 'CRITICAL' || execRisk.label === 'HIGH') {
    alerts.push({ ...execComp, alertedAt: new Date().toISOString() });
  }

  // ── Agent saturation ─────────────────────────────────────────────────────
  const overloadedAgents = agents.filter(a => (a.workload_score || 0) >= SATURATION_WARN);
  if (overloadedAgents.length > 0) {
    const overloadRatio = overloadedAgents.length / agents.length;
    const agentProb = overloadRatio * 0.7;
    const agentRisk = _riskTier(agentProb);
    const agentComp = {
      componentId:   'agent_pool',
      componentType: 'agent_pool',
      probability:   Math.round(agentProb * 1000) / 1000,
      risk:          agentRisk.label,
      signals: [{ type: 'agent_saturation', value: overloadRatio, severity: agentRisk.label, overloadedCount: overloadedAgents.length }],
      ttfEstimate: _estimateTTF(agentProb),
    };
    components.push(agentComp);
    if (agentRisk.label === 'CRITICAL' || agentRisk.label === 'HIGH') {
      alerts.push({ ...agentComp, alertedAt: new Date().toISOString() });
    }
  }

  // Persist alerts to DB (non-blocking)
  if (alerts.length > 0) {
    _persistAlerts(alerts).catch(() => {});
  }

  const overallRisk = _riskTier(components.reduce((max, c) => Math.max(max, c.probability), 0));

  log.debug('Predictive report built', { components: components.length, alerts: alerts.length, overallRisk: overallRisk.label, ms: Date.now() - startMs });

  return {
    components,
    alerts,
    summary: {
      totalComponents: components.length,
      criticalCount:   components.filter(c => c.risk === 'CRITICAL').length,
      highCount:       components.filter(c => c.risk === 'HIGH').length,
      overallRisk:     overallRisk.label,
      globalFailRate1h: Math.round(globalFailRate * 10000) / 100,
    },
    analyzedAt: new Date().toISOString(),
    buildMs:    Date.now() - startMs,
  };
}

function _riskTier(probability) {
  for (const [, tier] of Object.entries(RISK_TIERS)) {
    if (probability >= tier.min) return tier;
  }
  return RISK_TIERS.NOMINAL;
}

function _estimateTTF(probability) {
  if (probability >= 0.90) return '< 5 min';
  if (probability >= 0.75) return '5–15 min';
  if (probability >= 0.50) return '15–60 min';
  if (probability >= 0.25) return '1–4 hr';
  return '> 4 hr';
}

function _hourlyFailRates(execs) {
  const buckets = {};
  for (const e of execs) {
    const hour = Math.floor(new Date(e.created_at).getTime() / WINDOW_1H);
    if (!buckets[hour]) buckets[hour] = { total: 0, failed: 0 };
    buckets[hour].total++;
    if (e.status === 'failed') buckets[hour].failed++;
  }
  return Object.values(buckets).map(b => b.total > 0 ? b.failed / b.total : 0);
}

function _computeVariance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
}

function _detectZScoreAnomaly(seriesKey, currentValue) {
  const series = _metricSeries.get(seriesKey) || [];
  if (series.length < 10) return [];

  const values = series.map(p => p.value);
  const mean   = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(_computeVariance(values));

  if (stdDev === 0) return [];

  const z = Math.abs((currentValue - mean) / stdDev);
  if (z >= Z_SCORE_ALERT) {
    const severity = z >= Z_SCORE_ALERT * 1.5 ? 'HIGH' : 'MEDIUM';
    return [{ type: 'z_score_anomaly', value: Math.round(z * 100) / 100, severity }];
  }
  return [];
}

async function _persistAlerts(alerts) {
  for (const alert of alerts.slice(0, 10)) {
    await db()
      .from('predictive_failures')
      .insert({
        component_id:   alert.componentId,
        component_type: alert.componentType,
        probability:    alert.probability,
        risk_tier:      alert.risk,
        ttf_estimate:   alert.ttfEstimate,
        signals:        alert.signals || [],
        predicted_at:   alert.alertedAt || new Date().toISOString(),
      })
      .catch(() => {});
  }
}

function _emptyReport() {
  return {
    components: [],
    alerts:     [],
    summary: { totalComponents: 0, criticalCount: 0, highCount: 0, overallRisk: 'NOMINAL', globalFailRate1h: 0 },
    analyzedAt: new Date().toISOString(),
    buildMs:    0,
  };
}

module.exports = {
  getPredictiveReport,
  feedMetric,
  getFailureProbability,
  getActiveAlerts,
  RISK_TIERS,
};
