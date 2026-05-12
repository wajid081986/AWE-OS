'use strict';

/**
 * AWE-OS — MonetizationRoutingEngine                           Phase 6C
 *
 * Determines the optimal monetization model and configuration for each tool.
 * Pure algorithmic — no AI calls.
 *
 * Routing decisions:
 *   Primary model   — best single monetization channel
 *   Secondary model — complement the primary
 *   Hybrid mix      — weighted combination with allocation percentages
 *   Ad density      — safe ad placement density without UX degradation
 *   Premium gates   — where to insert upgrade prompts in the UX flow
 *
 * Safety rules (UX protection):
 *   Max ad density: 3 ad units per page (never exceed)
 *   Interstitial: only after tool completion, never mid-use
 *   No pop-overs on first visit or first 30 seconds of session
 *   Subscription gate: only after demonstrating value (>2 uses)
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('monetization-routing');

// ── Model score weights by category ──────────────────────────────────────────
// Mirrors MonetizationIntelligence CATEGORY_WEIGHTS but adapted for routing
const ROUTING_WEIGHTS = {
  pdf:          { adsense: 0.85, subscription: 0.55, affiliate: 0.30, leadGen: 0.40, enterprise: 0.50 },
  calculators:  { adsense: 0.90, subscription: 0.30, affiliate: 0.55, leadGen: 0.65, enterprise: 0.35 },
  converters:   { adsense: 0.80, subscription: 0.40, affiliate: 0.30, leadGen: 0.35, enterprise: 0.30 },
  writing:      { adsense: 0.60, subscription: 0.85, affiliate: 0.45, leadGen: 0.75, enterprise: 0.70 },
  marketing:    { adsense: 0.50, subscription: 0.90, affiliate: 0.75, leadGen: 0.90, enterprise: 0.80 },
  productivity: { adsense: 0.40, subscription: 0.90, affiliate: 0.50, leadGen: 0.70, enterprise: 0.90 },
  finance:      { adsense: 0.70, subscription: 0.70, affiliate: 0.85, leadGen: 0.90, enterprise: 0.80 },
  health:       { adsense: 0.75, subscription: 0.80, affiliate: 0.70, leadGen: 0.65, enterprise: 0.40 },
  education:    { adsense: 0.60, subscription: 0.80, affiliate: 0.55, leadGen: 0.55, enterprise: 0.60 },
  legal:        { adsense: 0.50, subscription: 0.70, affiliate: 0.45, leadGen: 0.90, enterprise: 0.90 },
  ecommerce:    { adsense: 0.55, subscription: 0.80, affiliate: 0.90, leadGen: 0.80, enterprise: 0.70 },
  other:        { adsense: 0.60, subscription: 0.60, affiliate: 0.45, leadGen: 0.55, enterprise: 0.50 },
};

// ── Safe ad density thresholds ────────────────────────────────────────────────
// Based on session length and tool complexity
const AD_DENSITY_BY_COMPLEXITY = {
  simple:     { maxUnits: 2, placementStrategy: 'sidebar + below-fold' },
  moderate:   { maxUnits: 2, placementStrategy: 'sidebar + post-result' },
  complex:    { maxUnits: 1, placementStrategy: 'post-result only' },
  enterprise: { maxUnits: 0, placementStrategy: 'none — enterprise context only' },
};

// ── Premium gate placement recommendations ────────────────────────────────────
const GATE_PLACEMENT = {
  adsense:      ['sidebar', 'below-result', 'footer'],
  subscription: ['after-use-limit', 'export-gate', 'feature-lock'],
  affiliate:    ['resource-sidebar', 'recommendation-card', 'exit-banner'],
  leadGen:      ['download-gate', 'report-gate', 'email-before-result'],
  enterprise:   ['contact-form', 'demo-cta', 'team-upgrade-banner'],
};

// ── UX safety score thresholds ────────────────────────────────────────────────
// If predicted aggressiveness would push UX score below threshold, downgrade model
const MIN_UX_SCORE = 55; // 0–100; below this = harm to retention

/**
 * Route a tool to its optimal monetization configuration.
 *
 * @param {object} tool          - Tool record from DB
 * @param {object} prediction    - RevenuePredictionEngine output
 * @param {object} [opts]
 * @param {boolean} [opts.allowEnterprise=false] - Enable enterprise gating
 * @returns {RoutingDecision}
 */
function route(tool, prediction, { allowEnterprise = false } = {}) {
  const cat      = ROUTING_WEIGHTS[tool.category] ? tool.category : 'other';
  const weights  = ROUTING_WEIGHTS[cat];
  const quality  = tool.quality_score  || 50;
  const usage    = tool.usage_count    || 0;
  const isFree   = tool.is_free !== false;

  // Complexity heuristic: if no explicit field, derive from usage patterns
  const complexity = tool.complexity ||
    (usage > 1000 ? 'complex' : usage > 200 ? 'moderate' : 'simple');

  // Score all models
  const scores = {};
  for (const [model, weight] of Object.entries(weights)) {
    if (model === 'enterprise' && !allowEnterprise) { scores[model] = 0; continue; }
    const qualMod   = (quality / 100) * 0.3;
    const usageMod  = Math.min(0.2, (Math.log10(Math.max(1, usage)) / 5) * 0.2);
    scores[model]   = Math.min(1, weight + qualMod + usageMod);
  }

  const ranked  = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0][0];
  const secondary = ranked[1][0];

  // ── Hybrid allocation ────────────────────────────────────────────────────
  const primaryShare   = Math.round(scores[primary]   / (scores[primary] + scores[secondary]) * 100);
  const secondaryShare = 100 - primaryShare;

  // ── Ad density recommendation ─────────────────────────────────────────────
  const adConfig = AD_DENSITY_BY_COMPLEXITY[complexity] || AD_DENSITY_BY_COMPLEXITY.moderate;

  // UX score reduction for ad-heavy configurations
  const baseUXScore = 100;
  const adPenalty   = primary === 'adsense' ? adConfig.maxUnits * 12 : adConfig.maxUnits * 6;
  const gatePenalty = primary === 'subscription' && usage < 50 ? 15 : 0; // gating before value = UX hit
  const uxScore     = Math.max(0, baseUXScore - adPenalty - gatePenalty);

  // If UX too degraded, fall back to lighter model
  let finalPrimary   = primary;
  let finalSecondary = secondary;
  if (uxScore < MIN_UX_SCORE) {
    // Find safest model above UX threshold
    const safe = ranked.find(([m]) => {
      const adj = m === 'adsense' ? adConfig.maxUnits * 12 : 6;
      return (100 - adj) >= MIN_UX_SCORE;
    });
    if (safe) finalPrimary = safe[0];
    if (ranked[ranked.indexOf(safe) + 1]) finalSecondary = ranked[ranked.indexOf(safe) + 1][0];
    log.debug('Monetization downgraded for UX protection', { toolId: tool.id, from: primary, to: finalPrimary });
  }

  // ── Premium gate recommendations ──────────────────────────────────────────
  const gatePlacements = GATE_PLACEMENT[finalPrimary] || GATE_PLACEMENT.adsense;

  // ── Hybrid mix recommendation ─────────────────────────────────────────────
  const hybridMix = {
    [finalPrimary]:   primaryShare,
    [finalSecondary]: secondaryShare,
  };

  // ── Revenue efficiency score ──────────────────────────────────────────────
  // How efficiently is this tool converting usage to revenue?
  const estimatedRevenue = prediction?.estimatedMonthlyRevenue || 0;
  const revenuePerUse    = usage > 0 ? estimatedRevenue / usage : 0;
  const efficiencyScore  = Math.min(100, Math.round(revenuePerUse * 100));

  // ── Monthly revenue by routing ────────────────────────────────────────────
  const routedRevenue = prediction
    ? (prediction.modelBreakdown?.[finalPrimary] || prediction.estimatedMonthlyRevenue) * (primaryShare / 100) +
      (prediction.modelBreakdown?.[finalSecondary] || 0) * (secondaryShare / 100)
    : 0;

  return {
    category:          cat,
    primaryModel:      finalPrimary,
    secondaryModel:    finalSecondary,
    hybridMix,
    routedRevenue:     Math.round(routedRevenue * 100) / 100,
    adDensity:         adConfig,
    uxScore:           Math.max(0, 100 - adPenalty - gatePenalty),
    uxSafe:            uxScore >= MIN_UX_SCORE,
    gatePlacements,
    efficiencyScore,
    modelScores:       Object.fromEntries(ranked.map(([m, s]) => [m, Math.round(s * 100)])),
    recommendations:   _buildRecommendations(finalPrimary, finalSecondary, uxScore, usage, quality, isFree),
    routedAt:          new Date().toISOString(),
  };
}

/**
 * Route a batch of tools.
 *
 * @param {object[]} tools
 * @param {object[]} predictions - Matched by index to tools array
 * @returns {object[]}
 */
function routeBatch(tools, predictions = []) {
  return tools.map((tool, idx) => ({
    toolId:   tool.id,
    toolSlug: tool.slug,
    ...route(tool, predictions[idx] || null),
  }));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _buildRecommendations(primary, secondary, uxScore, usage, quality, isFree) {
  const recs = [];

  if (primary === 'adsense' && uxScore < 70) {
    recs.push('Reduce ad unit count — UX score suggests ads may be harming retention');
  }
  if (primary === 'subscription' && usage < 30) {
    recs.push('Build usage base before gating — consider freemium first to reach 100+ monthly uses');
  }
  if (secondary === 'affiliate' && quality >= 70) {
    recs.push('High quality tool — prioritize affiliate links to relevant services for passive revenue');
  }
  if (isFree && usage > 200 && quality >= 65) {
    recs.push('Ready for freemium transition — usage volume supports premium tier introduction');
  }
  if (primary === 'leadGen') {
    recs.push('Lead gen works best with a clear value exchange — offer downloadable resource or detailed report');
  }
  if (uxScore >= 85) {
    recs.push('UX-safe configuration — current monetization mix protects user experience');
  }

  return recs.slice(0, 3);
}

module.exports = { route, routeBatch };
