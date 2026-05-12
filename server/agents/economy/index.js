'use strict';

/**
 * AWE-OS — Agent Economy Orchestrator                          Phase 6D
 *
 * Single entry point for all agent economy operations.
 * Exposes a clean API surface for route handlers.
 */

const AgentEconomyEngine        = require('./AgentEconomyEngine');
const AgentReputationEngine     = require('./AgentReputationEngine');
const AgentCreditSystem         = require('./AgentCreditSystem');
const AgentMarketplace          = require('./AgentMarketplace');
const AgentSpecializationEngine = require('./AgentSpecializationEngine');
const AgentContributionTracker  = require('./AgentContributionTracker');
const AgentCoordinationEngine   = require('./AgentCoordinationEngine');

const { createLogger } = require('../../monitoring/logger');
const log = createLogger('agent-economy-index');

/**
 * Get the full economy overview.
 * Suitable for the main dashboard endpoint.
 */
async function getOverview(forceRefresh = false) {
  const [economy, reputation, marketplace] = await Promise.all([
    AgentEconomyEngine.getEconomyReport(forceRefresh),
    AgentReputationEngine.getReputationReport(forceRefresh),
    AgentMarketplace.getMarketplaceState(forceRefresh),
  ]);
  return { economy, reputation, marketplace, generatedAt: new Date().toISOString() };
}

/**
 * Get leaderboard (economy rankings only — fast).
 */
async function getLeaderboard() {
  const report = await AgentEconomyEngine.getEconomyReport();
  return {
    leaderboard:  report.leaderboard,
    eliteAgents:  report.eliteAgents,
    failingAgents: report.failingAgents,
    economyHealth: report.economyHealth,
    generatedAt:  new Date().toISOString(),
  };
}

/**
 * Get specialization analysis.
 */
async function getSpecializations() {
  return AgentSpecializationEngine.getSpecializationReport();
}

/**
 * Get contribution rankings.
 */
async function getContributions() {
  return AgentContributionTracker.getContributionReport();
}

/**
 * Get coordination analysis.
 */
async function getCoordination() {
  return AgentCoordinationEngine.getCoordinationReport();
}

/**
 * Get marketplace state.
 */
async function getMarketplace() {
  return AgentMarketplace.getMarketplaceState();
}

/**
 * Get economy health summary for status checks.
 */
async function getHealth() {
  try {
    const report = await AgentEconomyEngine.getEconomyReport();
    return {
      status:        report.economyHealth.economyGrade === 'F' ? 'degraded' : 'healthy',
      grade:         report.economyHealth.economyGrade,
      avgScore:      report.economyHealth.avgScore,
      totalAgents:   report.economyHealth.totalAgents,
      eliteCount:    report.economyHealth.eliteCount,
      failingCount:  report.economyHealth.failingCount,
      totalCredits:  report.economyHealth.totalCredits,
      analyzedAt:    report.analyzedAt,
    };
  } catch (err) {
    log.warn('getHealth failed', { error: err.message });
    return { status: 'unknown', grade: 'C', avgScore: 0, totalAgents: 0, eliteCount: 0, failingCount: 0, totalCredits: 0 };
  }
}

/**
 * Route a task to the optimal agent.
 *
 * @param {object} task — { category, capability, priority }
 */
async function routeTask(task) {
  return AgentEconomyEngine.getRoutingRecommendation(task);
}

/**
 * Record a contribution (called from agent execution paths).
 */
function recordContribution(contribution) {
  AgentContributionTracker.record(contribution);
}

/**
 * Credit / debit an agent (called from agent execution paths).
 */
function creditAgent(tx) {
  AgentCreditSystem.credit(tx);
}

/**
 * Record a reputation event.
 */
async function recordReputationEvent(event) {
  await AgentReputationEngine.recordEvent(event);
}

/**
 * Record a specialization outcome.
 */
function recordSpecializationOutcome(outcome) {
  AgentSpecializationEngine.recordOutcome(outcome);
}

/**
 * Force-refresh all economy caches.
 */
async function refreshAll() {
  AgentEconomyEngine.invalidateAllCaches();
  const [economy, reputation] = await Promise.all([
    AgentEconomyEngine.getEconomyReport(true),
    AgentReputationEngine.getReputationReport(true),
  ]);
  return { economy, reputation, refreshedAt: new Date().toISOString() };
}

module.exports = {
  // API surface
  getOverview,
  getLeaderboard,
  getSpecializations,
  getContributions,
  getCoordination,
  getMarketplace,
  getHealth,
  routeTask,

  // Event recording (called from agents)
  recordContribution,
  creditAgent,
  recordReputationEvent,
  recordSpecializationOutcome,

  // Cache management
  refreshAll,

  // Direct engine access
  AgentEconomyEngine,
  AgentReputationEngine,
  AgentCreditSystem,
  AgentMarketplace,
  AgentSpecializationEngine,
  AgentContributionTracker,
  AgentCoordinationEngine,
};
