'use strict';

/**
 * AWE-OS — Marketplace Expansion Layer Bootstrap               Phase 6B
 *
 * Orchestrates the autonomous marketplace expansion pipeline.
 *
 * Fast pipeline (~1-3s):
 *   trends + health + learning (parallel DB queries) → opportunities → plan
 *
 * Usage:
 *   const mp = require('./marketplace');
 *   const report = await mp.runExpansionPipeline();
 *   const health = await mp.getEcosystemHealth();
 */

const TrendDetectionEngine        = require('./TrendDetectionEngine');
const EcosystemHealthEngine       = require('./EcosystemHealthEngine');
const OpportunityRankingEngine    = require('./OpportunityRankingEngine');
const MarketplaceExpansionPlanner = require('./MarketplaceExpansionPlanner');
const MarketplaceLearningEngine   = require('./MarketplaceLearningEngine');
const ToolLaunchCoordinator       = require('./ToolLaunchCoordinator');
const { createLogger }            = require('../monitoring/logger');

const log = createLogger('marketplace');

/**
 * Run the full marketplace intelligence pipeline.
 * Returns a comprehensive expansion report.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.forceRefresh=false] - Bypass all caches
 * @returns {Promise<MarketplaceReport>}
 */
async function runExpansionPipeline({ forceRefresh = false } = {}) {
  const start = Date.now();
  log.info('Marketplace expansion pipeline started');

  // ── Stage 1: Parallel data collection ────────────────────────────────────
  const [trends, health, learning] = await Promise.all([
    TrendDetectionEngine.detectTrends(),
    EcosystemHealthEngine.getHealthReport(forceRefresh),
    MarketplaceLearningEngine.getLearningSignals(forceRefresh),
  ]);

  // ── Stage 2: Rank opportunities from trend data ───────────────────────────
  const ranked = OpportunityRankingEngine.rankOpportunities(trends, {
    maxPerCategory: 2,
    minScore:       learning.adaptiveThresholds?.recommendedMinScore || 45,
  });

  // ── Stage 3: Generate expansion plan ──────────────────────────────────────
  const plan = MarketplaceExpansionPlanner.generatePlan(trends, health, ranked, learning);

  // ── Stage 4: Persist health snapshot (non-blocking) ──────────────────────
  _persistHealthSnapshot(health, plan).catch(err =>
    log.warn('Health snapshot persist failed', { error: err.message })
  );

  const pipelineMs = Date.now() - start;
  log.info('Marketplace expansion pipeline complete', {
    opportunities: ranked.opportunities.length,
    queueSize:     plan.launchQueue.length,
    healthScore:   health.ecosystemScore,
    ms:            pipelineMs,
  });

  return {
    trends,
    health,
    opportunities: ranked,
    plan,
    learning,
    pipelineMs,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get only ecosystem health (fast, cached).
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<HealthReport>}
 */
async function getEcosystemHealth(forceRefresh = false) {
  return EcosystemHealthEngine.getHealthReport(forceRefresh);
}

/**
 * Get only marketplace trends (fast, cached).
 *
 * @returns {Promise<TrendReport>}
 */
async function getTrends() {
  return TrendDetectionEngine.detectTrends();
}

/**
 * Get ranked opportunities based on current trends.
 *
 * @param {object} [opts]
 * @returns {Promise<RankedOpportunities>}
 */
async function getOpportunities(opts = {}) {
  const trends  = await TrendDetectionEngine.detectTrends();
  return OpportunityRankingEngine.rankOpportunities(trends, opts);
}

/**
 * Get the current launch queue (pending + in-progress).
 *
 * @returns {Promise<object[]>}
 */
async function getLaunchQueue() {
  return ToolLaunchCoordinator.getLaunchQueue();
}

/**
 * Queue an opportunity for launch (with safety gates).
 *
 * @param {object} opportunity
 * @param {string} [actorId]
 */
async function queueOpportunity(opportunity, actorId = 'system') {
  const result = await ToolLaunchCoordinator.queueForLaunch(opportunity, actorId);
  if (result.success) {
    // Invalidate caches so next pipeline run reflects the new queue entry
    TrendDetectionEngine.invalidateCache();
    MarketplaceLearningEngine.invalidateCache();
  }
  return result;
}

/**
 * Approve a queued opportunity and start building.
 *
 * @param {string} opportunityId
 * @param {string} [actorId]
 */
async function approveLaunch(opportunityId, actorId = 'system') {
  const result = await ToolLaunchCoordinator.approveLaunch(opportunityId, actorId);
  if (result.success) {
    EcosystemHealthEngine.invalidateCache();
    MarketplaceLearningEngine.invalidateCache();
  }
  return result;
}

/**
 * Reject a queued opportunity.
 *
 * @param {string} opportunityId
 * @param {string} [reason]
 * @param {string} [actorId]
 */
async function rejectLaunch(opportunityId, reason = '', actorId = 'system') {
  return ToolLaunchCoordinator.rejectLaunch(opportunityId, reason, actorId);
}

/**
 * Get marketplace learning signals for adaptive ranking.
 *
 * @param {boolean} [forceRefresh=false]
 */
async function getLearningSignals(forceRefresh = false) {
  return MarketplaceLearningEngine.getLearningSignals(forceRefresh);
}

/**
 * Invalidate all marketplace caches — call after major state changes.
 */
function invalidateAllCaches() {
  TrendDetectionEngine.invalidateCache();
  EcosystemHealthEngine.invalidateCache();
  MarketplaceLearningEngine.invalidateCache();
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _persistHealthSnapshot(health, plan) {
  try {
    const db = require('../db/supabase');
    await db.from('marketplace_health_snapshots').insert({
      ecosystem_score:         health.ecosystemScore,
      category_distribution:   health.categoryDistribution,
      revenue_balance_score:   health.revenueDiversityScore,
      traffic_diversity_score: health.trafficDiversityScore,
      quality_trend_score:     health.qualityTrendScore,
      tool_count:              health.toolCount,
      active_tool_count:       health.activeToolCount,
      inactive_tool_count:     health.inactiveToolCount,
      risk_flags:              health.riskFlags,
      recommendations:         health.recommendations,
      snapshot_metadata:       {
        expansionVelocity: plan.expansionVelocity,
        pausedCategories:  plan.pauseCategories?.map(p => p.category),
        launchQueueSize:   plan.launchQueue?.length,
      },
    });
  } catch (err) {
    // non-fatal: table may not exist yet in dev
    log.warn('_persistHealthSnapshot failed (non-fatal)', { error: err.message });
  }
}

module.exports = {
  // Pipeline orchestration
  runExpansionPipeline,
  getEcosystemHealth,
  getTrends,
  getOpportunities,
  getLaunchQueue,
  queueOpportunity,
  approveLaunch,
  rejectLaunch,
  getLearningSignals,
  invalidateAllCaches,

  // Individual modules (for direct import if needed)
  TrendDetectionEngine,
  EcosystemHealthEngine,
  OpportunityRankingEngine,
  MarketplaceExpansionPlanner,
  MarketplaceLearningEngine,
  ToolLaunchCoordinator,
};
