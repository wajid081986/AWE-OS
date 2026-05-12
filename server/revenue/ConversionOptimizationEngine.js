'use strict';

/**
 * AWE-OS — ConversionOptimizationEngine                        Phase 6C
 *
 * Analyzes conversion funnels and generates CRO recommendations.
 * Pure algorithmic — no AI calls.
 *
 * Funnel stages analyzed:
 *   Awareness      → Landing (tool page visit)
 *   Engagement     → Tool use (actually using the tool)
 *   Interest       → Click (CTA / affiliate / upgrade click)
 *   Intent         → Signup / Checkout start
 *   Conversion     → Payment / Subscription confirmed
 *   Retention      → Return visit within 7 days
 *
 * Outputs per tool:
 *   Funnel leakage points
 *   CTA placement recommendations
 *   Bounce reduction opportunities
 *   Monetization bottleneck analysis
 *   UI optimization suggestions
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('conversion-optimization');

// ── Category baseline funnel conversion rates ─────────────────────────────────
// Each stage rate = P(advance | reach this stage)
const FUNNEL_BASELINES = {
  pdf:          { engagement: 0.65, click: 0.025, signup: 0.040, payment: 0.55, retention: 0.38 },
  calculators:  { engagement: 0.80, click: 0.035, signup: 0.025, payment: 0.45, retention: 0.42 },
  converters:   { engagement: 0.72, click: 0.018, signup: 0.018, payment: 0.40, retention: 0.28 },
  writing:      { engagement: 0.60, click: 0.030, signup: 0.055, payment: 0.60, retention: 0.55 },
  marketing:    { engagement: 0.55, click: 0.040, signup: 0.070, payment: 0.65, retention: 0.60 },
  productivity: { engagement: 0.58, click: 0.032, signup: 0.060, payment: 0.62, retention: 0.65 },
  finance:      { engagement: 0.70, click: 0.042, signup: 0.050, payment: 0.60, retention: 0.50 },
  health:       { engagement: 0.62, click: 0.028, signup: 0.045, payment: 0.52, retention: 0.48 },
  education:    { engagement: 0.68, click: 0.022, signup: 0.035, payment: 0.48, retention: 0.52 },
  legal:        { engagement: 0.50, click: 0.050, signup: 0.080, payment: 0.70, retention: 0.55 },
  ecommerce:    { engagement: 0.60, click: 0.045, signup: 0.062, payment: 0.58, retention: 0.50 },
  other:        { engagement: 0.55, click: 0.020, signup: 0.030, payment: 0.45, retention: 0.35 },
};

// ── CTA placement effectiveness by model ──────────────────────────────────────
const CTA_PLACEMENTS = {
  subscription: [
    { placement: 'post-tool-result',     liftPct: 22, note: 'User has just experienced value — highest intent' },
    { placement: 'usage-limit-prompt',   liftPct: 35, note: 'Freemium gate creates urgency without disruption' },
    { placement: 'feature-discovery',    liftPct: 18, note: 'Inline upsell while exploring premium features' },
    { placement: 'exit-intent-overlay',  liftPct: 8,  note: 'Last-chance capture — use sparingly' },
  ],
  adsense: [
    { placement: 'sidebar-right',        liftPct: 12, note: 'Non-intrusive, visible during tool use' },
    { placement: 'below-result',         liftPct: 28, note: 'High-attention zone after task completion' },
    { placement: 'between-steps',        liftPct: 18, note: 'Natural break point in multi-step tools' },
    { placement: 'page-footer',          liftPct: 6,  note: 'Low distraction, low engagement' },
  ],
  affiliate: [
    { placement: 'contextual-recommendation', liftPct: 32, note: 'Inline product recommendation matching tool output' },
    { placement: 'resource-sidebar',     liftPct: 20, note: 'Related tools and services panel' },
    { placement: 'post-result-card',     liftPct: 25, note: 'Recommended next step after tool use' },
    { placement: 'email-followup',       liftPct: 15, note: 'Warm affiliate offer after email capture' },
  ],
  leadGen: [
    { placement: 'download-gate',        liftPct: 45, note: 'Offer enhanced result as downloadable PDF' },
    { placement: 'before-result',        liftPct: 30, note: 'Email capture for result delivery (high-value tools only)' },
    { placement: 'newsletter-inline',    liftPct: 12, note: 'Low-friction capture during tool use' },
    { placement: 'exit-modal',           liftPct: 10, note: 'Last-attempt lead capture' },
  ],
};

// ── Bounce reduction tactics ──────────────────────────────────────────────────
const BOUNCE_TACTICS = {
  highBounce: [
    'Add related tool recommendations in sidebar',
    'Improve page load time — each 100ms delay increases bounce ~1%',
    'Add tool usage preview above the fold',
    'Implement breadcrumb navigation for SEO + UX',
  ],
  lowEngagement: [
    'Add step-by-step guided mode for new users',
    'Add real example inputs pre-filled in tool',
    'Add "how it works" tooltip on first visit',
    'Add success confirmation with shareable result',
  ],
  lowRetention: [
    'Add email notification for saved results',
    'Implement bookmarking / history feature',
    'Send usage digest email (weekly summary)',
    'Add onboarding sequence for new registered users',
  ],
};

/**
 * Analyze conversion optimization opportunities for a tool.
 *
 * @param {object} tool
 * @param {object} prediction   - RevenuePredictionEngine output
 * @param {object} routing      - MonetizationRoutingEngine output
 * @returns {ConversionReport}
 */
function analyze(tool, prediction, routing) {
  const cat      = FUNNEL_BASELINES[tool.category] ? tool.category : 'other';
  const baseline = FUNNEL_BASELINES[cat];
  const usage    = tool.usage_count   || 0;
  const quality  = tool.quality_score || 50;

  // ── Estimate current funnel rates (quality-adjusted baseline) ─────────────
  const qualMult = 0.7 + (quality / 100) * 0.6;
  const funnel = {
    engagement: Math.min(0.95, baseline.engagement * qualMult),
    click:      Math.min(0.20, baseline.click       * qualMult),
    signup:     Math.min(0.15, baseline.signup      * qualMult),
    payment:    Math.min(0.85, baseline.payment     * qualMult),
    retention:  Math.min(0.85, baseline.retention   * qualMult),
  };

  // ── Identify weakest funnel stage ─────────────────────────────────────────
  const funnelRatios = Object.entries(funnel).map(([stage, rate]) => ({
    stage,
    rate,
    baseline: baseline[stage],
    gap:      baseline[stage] - rate,
    gapPct:   Math.round(((baseline[stage] - rate) / baseline[stage]) * 100),
  })).sort((a, b) => b.gap - a.gap);

  const bottleneck = funnelRatios[0];

  // ── Monthly revenue impact of fixing bottleneck ───────────────────────────
  const baseRevenue = prediction?.estimatedMonthlyRevenue || 0;
  const fixedRate   = Math.min(bottleneck.baseline * 1.1, bottleneck.baseline);
  const improvement = fixedRate > bottleneck.rate ? (fixedRate / bottleneck.rate - 1) : 0;
  const revenueImpact = Math.round(baseRevenue * improvement * 100) / 100;

  // ── CTA recommendations for primary monetization model ────────────────────
  const model = routing?.primaryModel || 'adsense';
  const ctaPlacements = (CTA_PLACEMENTS[model] || CTA_PLACEMENTS.adsense).slice(0, 3);

  // ── Bounce reduction suggestions ─────────────────────────────────────────
  const bounceTactics = [];
  if (funnel.engagement < 0.55)  bounceTactics.push(...BOUNCE_TACTICS.lowEngagement.slice(0, 2));
  if (funnel.retention  < 0.35)  bounceTactics.push(...BOUNCE_TACTICS.lowRetention.slice(0, 2));
  if (usage < 50 && quality > 60) bounceTactics.push(...BOUNCE_TACTICS.highBounce.slice(0, 2));

  // ── Monetization bottleneck analysis ─────────────────────────────────────
  const monetizationBottleneck = _identifyMonetizationBottleneck(funnel, model, tool);

  // ── Conversion score (100 = perfectly optimized) ─────────────────────────
  const conversionScore = Math.round(
    funnel.engagement * 30 +
    funnel.click      * 25 * 100 +  // CTR is small, amplify
    funnel.signup     * 25 * 100 +
    funnel.retention  * 20
  );
  const normalizedScore = Math.min(100, Math.round(
    (funnel.engagement / baseline.engagement) * 25 +
    (funnel.click      / baseline.click)      * 25 +
    (funnel.signup     / baseline.signup)     * 25 +
    (funnel.retention  / baseline.retention)  * 25
  ));

  return {
    category:              cat,
    funnelRates:           funnel,
    funnelBaselines:       baseline,
    bottleneck:            {
      stage:       bottleneck.stage,
      currentRate: Math.round(bottleneck.rate * 10000) / 10000,
      baseline:    bottleneck.baseline,
      gapPct:      bottleneck.gapPct,
    },
    revenueImpactOfFix:    revenueImpact,
    conversionScore:       normalizedScore,
    ctaPlacements,
    bounceTactics:         bounceTactics.slice(0, 4),
    monetizationBottleneck,
    uiRecommendations:     _buildUIRecommendations(quality, usage, funnel, model),
    analyzedAt:            new Date().toISOString(),
  };
}

/**
 * Analyze conversion for a batch of tools.
 *
 * @param {object[]} tools
 * @param {object[]} predictions
 * @param {object[]} routings
 * @returns {object[]}
 */
function analyzeBatch(tools, predictions = [], routings = []) {
  return tools.map((tool, idx) => ({
    toolId:   tool.id,
    toolSlug: tool.slug,
    ...analyze(tool, predictions[idx] || null, routings[idx] || null),
  }));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _identifyMonetizationBottleneck(funnel, model, tool) {
  if (model === 'subscription' && funnel.signup < 0.03) {
    return { bottleneck: 'signup', detail: 'Low signup rate — freemium value demonstration insufficient. Add usage counter showing approaching limit.' };
  }
  if (model === 'subscription' && funnel.payment < 0.45) {
    return { bottleneck: 'payment', detail: 'High drop between signup and payment — pricing may be too aggressive. Test lower entry price.' };
  }
  if (model === 'adsense' && funnel.click < 0.01) {
    return { bottleneck: 'click', detail: 'Ad CTR below threshold — ad placement or relevance needs improvement. Try contextual ads matching tool output.' };
  }
  if (model === 'affiliate' && funnel.click < 0.015) {
    return { bottleneck: 'click', detail: 'Affiliate CTR low — recommendations may not be contextually relevant. Match affiliate products to tool output type.' };
  }
  if (funnel.engagement < 0.50) {
    return { bottleneck: 'engagement', detail: 'Low engagement rate — users landing but not using the tool. Improve above-fold UX and reduce friction to first use.' };
  }
  if (funnel.retention < 0.30) {
    return { bottleneck: 'retention', detail: 'Poor return visit rate — one-shot usage pattern. Introduce result saving, history, or email follow-up to drive return.' };
  }
  return { bottleneck: 'none', detail: 'No critical bottleneck detected — focus on volume growth to scale current conversion rates.' };
}

function _buildUIRecommendations(quality, usage, funnel, model) {
  const recs = [];
  if (quality >= 70 && funnel.engagement < 0.60) recs.push('Add animated demo or GIF above fold — quality tool needs better first impression');
  if (usage > 50 && funnel.retention < 0.40)     recs.push('Implement "My Results" history panel to create return habit');
  if (model === 'subscription')                   recs.push('Show usage counter prominently — "You have X free uses remaining" creates natural urgency');
  if (funnel.click < 0.015 && model === 'adsense') recs.push('Test native ad formats instead of display banners — higher relevance = higher CTR');
  if (quality < 50)                               recs.push('Quality score below 50 — UI polish (loading states, error messages) directly improves perceived value');
  return recs.slice(0, 4);
}

module.exports = { analyze, analyzeBatch };
