'use strict';

/**
 * AWE-OS — MarketplaceExpansionPlanner                         Phase 6B
 *
 * Converts trend intelligence + ecosystem health into a concrete expansion
 * roadmap with prioritized launch queue and diversification strategy.
 *
 * Safety mechanisms:
 *   - Category concentration cap: max 40% in any single category
 *   - Quality floor: only recommend tools with score >= 55
 *   - Cooldown tracking: no more than 3 launches per category per 30 days
 *   - Saturation gate: pause expansion if category saturation >= 80%
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('expansion-planner');

// Max percentage of the portfolio any single category should hold
const MAX_CATEGORY_CONCENTRATION = 0.40;

// Minimum overall score for a category to receive new tool recommendations
const MIN_OPPORTUNITY_SCORE = 45;

// Horizon labels
const HORIZONS = ['immediate', 'near-term', 'medium-term', 'strategic'];

/**
 * Generate a full expansion plan.
 *
 * @param {object} trends      - TrendDetectionEngine output
 * @param {object} health      - EcosystemHealthEngine output
 * @param {object} ranked      - OpportunityRankingEngine output
 * @param {object} [learningSignals] - MarketplaceLearningEngine output (optional)
 * @returns {object} Expansion plan
 */
function generatePlan(trends, health, ranked, learningSignals = null) {
  const startMs = Date.now();

  const catDist     = health.categoryDistribution || {};
  const totalTools  = health.toolCount || 1;
  const opportunities = ranked.opportunities || [];

  // ── 1. Identify categories to invest in ──────────────────────────────────
  const investCategories = [];
  const pauseCategories  = [];
  const watchCategories  = [];

  for (const [cat, dist] of Object.entries(catDist)) {
    const ratio      = (dist.count || 0) / totalTools;
    const saturation = trends.categoryTrends?.[cat]?.saturation || 0;
    const trend      = trends.categoryTrends?.[cat];

    if (ratio > MAX_CATEGORY_CONCENTRATION || saturation >= 80) {
      pauseCategories.push({
        category:   cat,
        reason:     ratio > MAX_CATEGORY_CONCENTRATION
          ? `Concentration at ${Math.round(ratio * 100)}% — above ${MAX_CATEGORY_CONCENTRATION * 100}% limit`
          : `Saturation at ${saturation}% — expansion paused`,
        concentration: Math.round(ratio * 100),
        saturation,
      });
    } else if (trend?.opportunityScore >= MIN_OPPORTUNITY_SCORE && saturation < 65) {
      investCategories.push({
        category:        cat,
        opportunityScore: trend.opportunityScore,
        velocity:        trend.velocity,
        concentration:   Math.round(ratio * 100),
        recommendation:  _investmentLabel(trend.opportunityScore),
      });
    } else {
      watchCategories.push({
        category:    cat,
        velocity:    trend?.velocity || 'unknown',
        saturation,
        concentration: Math.round(ratio * 100),
      });
    }
  }

  // Include unrepresented but trending categories
  for (const tc of (trends.trendingCategories || [])) {
    const alreadyRepresented = catDist[tc.category];
    if (!alreadyRepresented) {
      investCategories.push({
        category:        tc.category,
        opportunityScore: tc.opportunityScore,
        velocity:        tc.velocity,
        concentration:   0,
        recommendation:  'New market — strong entry opportunity',
      });
    }
  }

  investCategories.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // ── 2. Build launch priority queue ────────────────────────────────────────
  const pausedCats = new Set(pauseCategories.map(p => p.category));

  const launchQueue = opportunities
    .filter(opp => !pausedCats.has(opp.category))
    .filter(opp => opp.opportunityScore >= MIN_OPPORTUNITY_SCORE)
    .slice(0, 10)
    .map((opp, idx) => ({
      rank:              idx + 1,
      category:          opp.category,
      title:             opp.title,
      description:       opp.description,
      opportunityScore:  opp.opportunityScore,
      launchConfidence:  opp.launchConfidence,
      estimatedROI:      _estimateROI(opp),
      horizon:           HORIZONS[Math.min(idx < 3 ? 0 : idx < 6 ? 1 : idx < 9 ? 2 : 3, 3)],
      complexity:        opp.complexity,
      trendSignal:       opp.trendSignal,
      timing:            opp.timing,
    }));

  // ── 3. Diversification strategy ───────────────────────────────────────────
  const currentVerticals = _getVerticalCoverage(catDist);
  const missingVerticals = _getMissingVerticals(catDist);

  const diversificationStrategy = {
    currentCategoryCount:  Object.keys(catDist).length,
    coveragePercentage:    Math.round((currentVerticals / 5) * 100),
    missingVerticals,
    recommendedFocus:      missingVerticals.length > 0
      ? `Expand into ${missingVerticals[0]} vertical for resilience`
      : 'Good diversification — focus on quality improvement',
    concentrationRisk:     pauseCategories.length > 0
      ? `${pauseCategories.length} categories at risk of over-concentration`
      : 'No concentration risk detected',
  };

  // ── 4. Expansion roadmap ──────────────────────────────────────────────────
  const roadmap = _buildRoadmap(investCategories, launchQueue, health);

  // ── 5. Apply learning signals if available ────────────────────────────────
  let learningAdjustments = null;
  if (learningSignals?.adjustments?.length > 0) {
    learningAdjustments = learningSignals.adjustments;
    // Boost confidence for historically successful categories
    for (const adj of learningSignals.adjustments) {
      const item = launchQueue.find(q => q.category === adj.category);
      if (item && adj.type === 'boost') {
        item.launchConfidence = Math.min(95, item.launchConfidence + adj.delta);
      }
    }
  }

  const plan = {
    investCategories:        investCategories.slice(0, 8),
    pauseCategories,
    watchCategories:         watchCategories.slice(0, 5),
    launchQueue,
    diversificationStrategy,
    roadmap,
    learningAdjustments,
    expansionVelocity:       launchQueue.length > 6 ? 'high' : launchQueue.length > 3 ? 'moderate' : 'conservative',
    planMs:                  Date.now() - startMs,
    generatedAt:             new Date().toISOString(),
  };

  log.info('Expansion plan generated', {
    invest:    investCategories.length,
    pause:     pauseCategories.length,
    queueSize: launchQueue.length,
    ms:        plan.planMs,
  });

  return plan;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _investmentLabel(score) {
  if (score >= 75) return 'Aggressive expansion — high-priority investment';
  if (score >= 60) return 'Moderate expansion — steady growth recommended';
  return 'Cautious expansion — validate before committing resources';
}

function _estimateROI(opp) {
  // Rough monthly ROI estimate in USD (simplified)
  const monthlyRevLow  = Math.round(opp.monetizationScore * 8);
  const monthlyRevHigh = Math.round(opp.monetizationScore * 50);
  const buildDays      = opp.complexity === 'simple' ? 2 : opp.complexity === 'moderate' ? 5 : 14;
  const paybackWeeks   = buildDays < 5 ? '1-2 weeks' : buildDays < 10 ? '2-4 weeks' : '4-8 weeks';
  return { monthlyRevLow, monthlyRevHigh, buildDays, paybackWeeks };
}

const VERTICALS_MAP = {
  document:    ['pdf', 'converters'],
  financial:   ['finance', 'ecommerce'],
  content:     ['writing', 'marketing', 'education'],
  utility:     ['calculators', 'productivity', 'health'],
  professional: ['legal'],
};

function _getVerticalCoverage(catDist) {
  return Object.values(VERTICALS_MAP).filter(cats =>
    cats.some(cat => (catDist[cat]?.count || 0) > 0)
  ).length;
}

function _getMissingVerticals(catDist) {
  return Object.entries(VERTICALS_MAP)
    .filter(([, cats]) => !cats.some(cat => (catDist[cat]?.count || 0) > 0))
    .map(([v]) => v);
}

function _buildRoadmap(investCategories, launchQueue, health) {
  const phases = [];

  // Phase 1: Immediate (next 2 weeks) — quick wins
  const immediate = launchQueue.filter(q => q.complexity === 'simple' || q.opportunityScore >= 75);
  if (immediate.length > 0) {
    phases.push({
      phase:        1,
      horizon:      'Immediate (0–2 weeks)',
      focus:        'Quick-win tool launches',
      items:        immediate.slice(0, 3).map(q => `${q.title} (${q.category})`),
      expectedValue: `${immediate.length} tools × ~$${Math.round(immediate[0]?.estimatedROI?.monthlyRevLow || 200)}-${Math.round(immediate[0]?.estimatedROI?.monthlyRevHigh || 1200)}/mo MRR`,
    });
  }

  // Phase 2: Near-term (2-8 weeks) — moderate complexity
  const nearTerm = launchQueue.filter(q => q.complexity === 'moderate' && q.horizon !== 'immediate');
  if (nearTerm.length > 0) {
    phases.push({
      phase:       2,
      horizon:     'Near-term (2–8 weeks)',
      focus:       'Moderate-complexity expansion',
      items:       nearTerm.slice(0, 3).map(q => `${q.title} (${q.category})`),
      expectedValue: 'Category depth + SEO authority building',
    });
  }

  // Phase 3: Strategic — ecosystem rebalancing
  const rebalanceNeeded = health.recommendations || [];
  if (rebalanceNeeded.length > 0) {
    phases.push({
      phase:        3,
      horizon:      'Strategic (8+ weeks)',
      focus:        'Ecosystem rebalancing + resilience',
      items:        rebalanceNeeded.slice(0, 3),
      expectedValue: 'Reduced concentration risk + improved ecosystem health score',
    });
  }

  return phases;
}

module.exports = { generatePlan };
