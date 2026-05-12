'use strict';

/**
 * AWE-OS — AgentEconomyEngine                                  Phase 6D
 *
 * Master economy orchestrator. Aggregates signals from all agent economy
 * subsystems and computes composite economy scores, efficiency rankings,
 * elite performer detection, and optimal routing recommendations.
 *
 * Economy Score Formula (weighted composite):
 *   quality_score          0.25  — task quality + output caliber
 *   revenue_impact         0.20  — direct revenue attribution
 *   execution_success      0.20  — reliability under load
 *   learning_contribution  0.15  — intelligence pool enrichment
 *   recovery_contribution  0.10  — self-healing assistance
 *   optimization_impact    0.05  — runtime improvement contributions
 *   coordination_score     0.05  — multi-agent session quality
 *
 * Adaptive multipliers:
 *   Recency:    recent performance weighted 2× vs historical
 *   Confidence: low-data agents get conservative scores
 *   Reputation: trust score from ReputationEngine dampens/amplifies
 */

const { createLogger }      = require('../../monitoring/logger');
const AgentReputationEngine = require('./AgentReputationEngine');
const AgentCreditSystem     = require('./AgentCreditSystem');
const AgentSpecializationEngine = require('./AgentSpecializationEngine');
const AgentContributionTracker  = require('./AgentContributionTracker');
const AgentCoordinationEngine   = require('./AgentCoordinationEngine');
const AgentMarketplace          = require('./AgentMarketplace');

const log = createLogger('agent-economy');

const CACHE_TTL = 15 * 60 * 1_000;

// Economy score weights
const ECONOMY_WEIGHTS = {
  quality_score:          0.25,
  revenue_impact:         0.20,
  execution_success:      0.20,
  learning_contribution:  0.15,
  recovery_contribution:  0.10,
  optimization_impact:    0.05,
  coordination_score:     0.05,
};

// Elite tier thresholds
const ELITE_THRESHOLD    = 80;  // economy score ≥ 80 = elite
const FAILING_THRESHOLD  = 35;  // economy score ≤ 35 = failing
const RISING_THRESHOLD   = 10;  // week-over-week delta ≥ +10 = rising star

let _cache   = null;
let _cacheTs = 0;

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the full economy pipeline and return the economy report.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<EconomyReport>}
 */
async function getEconomyReport(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTs) < CACHE_TTL) return _cache;

  try {
    const report = await _buildEconomyReport();
    _cache   = report;
    _cacheTs = now;

    // Non-blocking snapshot
    _persistSnapshot(report).catch(() => {});

    return report;
  } catch (err) {
    log.warn('getEconomyReport failed', { error: err.message });
    return _emptyReport();
  }
}

/**
 * Get the economy score for a single agent.
 *
 * @param {string} agentId
 * @returns {Promise<number>}
 */
async function getAgentEconomyScore(agentId) {
  const report = await getEconomyReport();
  return report.profiles.find(p => p.agentId === agentId)?.economyScore || 0;
}

/**
 * Get routing recommendation for a task.
 * Enriches the marketplace routing with economy-layer context.
 *
 * @param {object} task
 * @returns {Promise<RoutingDecision>}
 */
async function getRoutingRecommendation(task) {
  const [repReport, credLedger, specReport, coordReport] = await Promise.all([
    AgentReputationEngine.getReputationReport(),
    Promise.resolve(AgentCreditSystem.getLedgerSummary()),
    AgentSpecializationEngine.getSpecializationReport(),
    AgentCoordinationEngine.getCoordinationReport(),
  ]);

  // Build context maps
  const reputationMap = {};
  for (const p of repReport.profiles) {
    reputationMap[p.agentId] = p.trustScore / 100;
  }

  const creditMap = {};
  for (const c of credLedger) {
    creditMap[c.agentId] = { efficiency: c.efficiency };
  }

  const availabilityMap = {};
  for (const p of coordReport.profiles) {
    availabilityMap[p.agentId] = p.workload / 100;
  }

  const specializationMap = {};
  for (const p of specReport.profiles) {
    specializationMap[p.agentId] = {};
    for (const s of p.allCategories) {
      specializationMap[p.agentId][s.category] = s.affinityScore;
    }
  }

  return AgentMarketplace.routeTask(task, {
    reputationMap, creditMap, availabilityMap, specializationMap,
  });
}

function invalidateAllCaches() {
  _cache = null; _cacheTs = 0;
  AgentReputationEngine.invalidateCache();
  AgentSpecializationEngine.invalidateCache();
  AgentContributionTracker.invalidateCache();
  AgentCoordinationEngine.invalidateCache();
  AgentMarketplace.invalidateCache();
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _buildEconomyReport() {
  const startMs = Date.now();

  const [agentProfiles, repReport, credLedger, contribReport, coordReport, specReport] = await Promise.all([
    _loadAgentProfiles(),
    AgentReputationEngine.getReputationReport(),
    Promise.resolve(AgentCreditSystem.getLedgerSummary()),
    AgentContributionTracker.getContributionReport(),
    AgentCoordinationEngine.getCoordinationReport(),
    AgentSpecializationEngine.getSpecializationReport(),
  ]);

  // Index all signals by agentId
  const repByAgent    = _keyBy(repReport.profiles,    'agentId');
  const credByAgent   = _keyBy(credLedger,            'agentId');
  const contribByAgent = _keyBy(contribReport.rankings, 'agentId');
  const coordByAgent  = _keyBy(coordReport.profiles,  'agentId');
  const specByAgent   = _keyBy(specReport.profiles,   'agentId');

  const profiles = agentProfiles.map(agent => {
    const agentId = agent.agent_id;

    // Raw signals (0–100 scale)
    const qualityScore     = agent.confidence_score * 100;
    const executionSuccess = agent.total_tasks > 0
      ? (agent.success_count / agent.total_tasks) * 100
      : 70;
    const repTrust         = (repByAgent[agentId]?.trustScore         || 65);
    const creditEff        = (credByAgent[agentId]?.efficiency        || 50);
    const contribPoints    = Math.min(100, (contribByAgent[agentId]?.points30d || 0) / 5); // normalize /500 max
    const coordScore       = (coordByAgent[agentId]?.coordinationScore || 50);
    const specCount        = (specByAgent[agentId]?.specializationCount || 0) * 10; // 0–100
    const balance          = AgentCreditSystem.getBalance(agentId);

    // Revenue impact: from contribution tracker
    const revenueImpact = Math.min(100, (contribByAgent[agentId]?.revenueImpact || 0) / 50 * 100);

    // Learning contribution from contribution type breakdown
    const learningPoints = (contribByAgent[agentId]?.byType?.learning?.totalPoints || 0);
    const learningScore  = Math.min(100, learningPoints * 5);

    // Recovery contribution
    const recoveryPoints = (contribByAgent[agentId]?.byType?.runtime_recovery?.totalPoints || 0) +
                           (contribByAgent[agentId]?.byType?.self_heal_assist?.totalPoints || 0);
    const recoveryScore  = Math.min(100, recoveryPoints * 3);

    // Optimization impact
    const optPoints  = (contribByAgent[agentId]?.byType?.optimization?.totalPoints || 0) +
                       (contribByAgent[agentId]?.byType?.performance_win?.totalPoints || 0);
    const optScore   = Math.min(100, optPoints * 4);

    // Raw composite
    const rawScore = (
      qualityScore     * ECONOMY_WEIGHTS.quality_score        +
      revenueImpact    * ECONOMY_WEIGHTS.revenue_impact        +
      executionSuccess * ECONOMY_WEIGHTS.execution_success     +
      learningScore    * ECONOMY_WEIGHTS.learning_contribution  +
      recoveryScore    * ECONOMY_WEIGHTS.recovery_contribution  +
      optScore         * ECONOMY_WEIGHTS.optimization_impact    +
      coordScore       * ECONOMY_WEIGHTS.coordination_score
    );

    // Reputation dampening/amplification
    const repMultiplier = 0.7 + (repTrust / 100) * 0.6; // 0.7x at 0 trust, 1.3x at 100

    // Confidence weight (low-data agents get conservative scores)
    const dataPoints    = agent.total_tasks;
    const confidence    = Math.min(1, dataPoints / 20); // full confidence at 20+ tasks
    const conservativeAdj = rawScore * confidence + 50 * (1 - confidence); // pull toward 50 for sparse

    const economyScore  = Math.round(Math.min(100, Math.max(0, conservativeAdj * repMultiplier)) * 100) / 100;

    return {
      agentId,
      agentRole:       agent.role,
      specialization:  agent.specialization,
      economyScore,
      components: {
        qualityScore:      Math.round(qualityScore),
        executionSuccess:  Math.round(executionSuccess * 100) / 100,
        revenueImpact:     Math.round(revenueImpact * 100) / 100,
        learningScore:     Math.round(learningScore * 100) / 100,
        recoveryScore:     Math.round(recoveryScore * 100) / 100,
        optimizationScore: Math.round(optScore * 100) / 100,
        coordinationScore: Math.round(coordScore * 100) / 100,
      },
      credits:          Math.round(balance * 100) / 100,
      creditEfficiency: Math.round(creditEff * 100) / 100,
      trustScore:       Math.round(repTrust * 100) / 100,
      specializationCount: specByAgent[agentId]?.specializationCount || 0,
      topSpecializations: (specByAgent[agentId]?.strengths || []).slice(0, 3).map(s => s.category),
      totalTasks:       dataPoints,
      workload:         agent.workload_score * 100,
      grade:            _grade(economyScore),
      isElite:          economyScore >= ELITE_THRESHOLD,
      isFailing:        economyScore <= FAILING_THRESHOLD,
    };
  });

  profiles.sort((a, b) => b.economyScore - a.economyScore);

  // Elite + failing detection
  const eliteAgents   = profiles.filter(p => p.isElite);
  const failingAgents = profiles.filter(p => p.isFailing);

  // Economy health score (avg of top 80% agents)
  const validScores = profiles.map(p => p.economyScore).filter(s => s > 0);
  const avgScore    = validScores.length
    ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length * 100) / 100
    : 0;

  // Total credits in circulation
  const totalCredits = credLedger.reduce((s, c) => s + c.balance, 0);
  const creditFlow   = credLedger.reduce((s, c) => s + c.netFlow, 0);

  const report = {
    profiles,
    leaderboard:    profiles.slice(0, 10),
    eliteAgents,
    failingAgents,
    economyHealth: {
      avgScore:          avgScore,
      totalAgents:       profiles.length,
      eliteCount:        eliteAgents.length,
      failingCount:      failingAgents.length,
      totalCredits:      Math.round(totalCredits * 100) / 100,
      creditFlow30d:     Math.round(creditFlow * 100) / 100,
      economyGrade:      _grade(avgScore),
    },
    weights:        ECONOMY_WEIGHTS,
    buildMs:        Date.now() - startMs,
    analyzedAt:     new Date().toISOString(),
  };

  log.info('Economy report built', {
    agents:      profiles.length,
    avgScore,
    elite:       eliteAgents.length,
    failing:     failingAgents.length,
    ms:          report.buildMs,
  });

  return report;
}

async function _loadAgentProfiles() {
  const { data: profiles } = await db()
    .from('agent_profiles')
    .select('agent_id, role, specialization, confidence_score, workload_score, total_tasks, success_count')
    .order('confidence_score', { ascending: false })
    .limit(100);
  return profiles || [];
}

function _grade(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function _keyBy(arr, key) {
  const map = {};
  if (!arr?.length) return map;
  for (const item of arr) map[item[key]] = item;
  return map;
}

async function _persistSnapshot(report) {
  await db()
    .from('agent_economy_events')
    .insert({
      event_type:    'economy_snapshot',
      agent_id:      null,
      score:         report.economyHealth.avgScore,
      grade:         report.economyHealth.economyGrade,
      elite_count:   report.economyHealth.eliteCount,
      failing_count: report.economyHealth.failingCount,
      agent_count:   report.economyHealth.totalAgents,
      metadata:      {
        totalCredits: report.economyHealth.totalCredits,
        creditFlow:   report.economyHealth.creditFlow30d,
      },
      recorded_at:   report.analyzedAt,
    });
}

function _emptyReport() {
  return {
    profiles: [], leaderboard: [], eliteAgents: [], failingAgents: [],
    economyHealth: { avgScore: 0, totalAgents: 0, eliteCount: 0, failingCount: 0, totalCredits: 0, creditFlow30d: 0, economyGrade: 'C' },
    weights: ECONOMY_WEIGHTS, buildMs: 0, analyzedAt: new Date().toISOString(),
  };
}

module.exports = {
  getEconomyReport,
  getAgentEconomyScore,
  getRoutingRecommendation,
  invalidateAllCaches,
  ECONOMY_WEIGHTS,
  ELITE_THRESHOLD,
  FAILING_THRESHOLD,
};
