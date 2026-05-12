'use strict';

/**
 * AWE-OS — MonetizationIntelligence                           Phase 6A
 *
 * Estimates monetization potential across 5 revenue models.
 * Pure algorithmic — no AI calls.
 *
 * Models evaluated:
 *   adsense      — display advertising revenue
 *   subscription — SaaS recurring revenue
 *   affiliate    — affiliate marketing commissions
 *   leadGen      — lead generation / email capture
 *   enterprise   — B2B enterprise licensing
 */

// Category → per-model weight multipliers (0.0–1.0)
// Higher = stronger fit for that model in that category
const CATEGORY_WEIGHTS = {
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

const MODEL_META = {
  adsense:      { label: 'Display Advertising',   description: 'AdSense/programmatic ads on tool pages' },
  subscription: { label: 'SaaS Subscription',     description: 'Monthly/yearly premium tier' },
  affiliate:    { label: 'Affiliate Marketing',    description: 'Referral commissions from partner services' },
  leadGen:      { label: 'Lead Generation',        description: 'Email capture and B2B lead nurturing' },
  enterprise:   { label: 'Enterprise Licensing',   description: 'Custom contracts for teams and orgs' },
};

// Complexity modifier: more complex tools tend to monetize better via subscription/enterprise
const COMPLEXITY_BOOSTS = {
  simple:     { subscription: 0,  enterprise: 0  },
  moderate:   { subscription: 8,  enterprise: 5  },
  complex:    { subscription: 15, enterprise: 15 },
  enterprise: { subscription: 20, enterprise: 25 },
};

/**
 * Estimate monetization potential from a tool analysis.
 *
 * @param {object} analysis - Output from ToolIdeaAnalyzer.analyze()
 * @returns {object} Monetization intelligence object
 */
function estimate(analysis) {
  const category       = analysis.detectedCategory || analysis.inputCategory || 'other';
  const weights        = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS.other;
  const basePotential  = (analysis.monetizationPotential || 55) / 100;
  const complexity     = analysis.complexity || 'moderate';
  const boosts         = COMPLEXITY_BOOSTS[complexity] || COMPLEXITY_BOOSTS.moderate;
  const requiresAI     = analysis.requiresAI ? 5 : 0;  // AI tools command premium
  const uniqueness     = (analysis.uniquenessScore || 50) / 100;

  // Compute per-model scores
  const breakdown = {};
  for (const [model, weight] of Object.entries(weights)) {
    const base  = weight * basePotential * 100;
    const boost = (boosts[model] || 0) + requiresAI + (uniqueness * 10);
    const score = Math.round(Math.min(99, Math.max(5, base + boost)));
    breakdown[model] = {
      score,
      label:       MODEL_META[model].label,
      description: MODEL_META[model].description,
      viable:      score >= 45,
    };
  }

  // Rank models by score
  const ranked  = Object.entries(breakdown).sort((a, b) => b[1].score - a[1].score);
  const primary = ranked[0]?.[0] || 'adsense';
  const secondary = ranked[1]?.[0] || 'subscription';

  // Composite monetization score (weighted average of top 3)
  const monetizationScore = Math.round(
    ranked.slice(0, 3).reduce((s, [, v]) => s + v.score, 0) / 3
  );

  // Revenue estimate (monthly, USD)
  const trafficBase = analysis.seoPotential || 60;
  const conversionMod = monetizationScore / 100;
  const lowMRR  = Math.round(trafficBase * 80  * conversionMod);
  const highMRR = Math.round(trafficBase * 500 * conversionMod);

  // Payback period estimate (months to recoup build cost)
  const buildHours  = analysis.estimatedBuildTimeHours || 16;
  const devCostUSD  = buildHours * 50; // $50/hr baseline
  const avgMRR      = (lowMRR + highMRR) / 2;
  const paybackMonths = avgMRR > 0 ? Math.ceil(devCostUSD / avgMRR) : 99;

  return {
    monetizationScore,
    primaryModel:   MODEL_META[primary]?.label   || 'Display Advertising',
    secondaryModel: MODEL_META[secondary]?.label || 'SaaS Subscription',
    breakdown,
    estimatedMonthlyRevenue: { low: lowMRR, high: highMRR, currency: 'USD' },
    paybackPeriodMonths: Math.min(paybackMonths, 99),
    recommendation: monetizationScore >= 70
      ? 'High monetization potential — prioritize launch and promotion'
      : monetizationScore >= 50
      ? 'Moderate potential — viable with content marketing and premium tier'
      : 'Lower direct revenue — strong value as SEO driver or lead magnet',
    viableModels: ranked.filter(([, v]) => v.viable).map(([, v]) => v.label),
  };
}

module.exports = { estimate };
