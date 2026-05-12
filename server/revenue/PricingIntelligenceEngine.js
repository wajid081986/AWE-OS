'use strict';

/**
 * AWE-OS — PricingIntelligenceEngine                           Phase 6C
 *
 * Generates optimal pricing recommendations per tool.
 * Pure algorithmic — no AI calls.
 *
 * Analysis dimensions:
 *   Underpricing  — tool is priced below its quality + category floor
 *   Overpricing   — price is above market tolerance for the category
 *   Freemium gate — which features to put behind a paywall
 *   Tier design   — free / pro / team / enterprise thresholds
 *   Price elasticity — estimated demand sensitivity to price changes
 *   Upsell opportunities — add-ons that complement current offering
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('pricing-intelligence');

// ── Category market price anchors (USD/month for SaaS subscription) ───────────
const CATEGORY_PRICE_ANCHORS = {
  pdf:          { free: 0, starter: 9,  pro: 19,  team: 49,  enterprise: 149 },
  calculators:  { free: 0, starter: 5,  pro: 12,  team: 29,  enterprise: 99  },
  converters:   { free: 0, starter: 5,  pro: 10,  team: 24,  enterprise: 79  },
  writing:      { free: 0, starter: 12, pro: 25,  team: 59,  enterprise: 199 },
  marketing:    { free: 0, starter: 19, pro: 39,  team: 99,  enterprise: 299 },
  productivity: { free: 0, starter: 15, pro: 29,  team: 79,  enterprise: 249 },
  finance:      { free: 0, starter: 14, pro: 29,  team: 69,  enterprise: 249 },
  health:       { free: 0, starter: 9,  pro: 19,  team: 49,  enterprise: 149 },
  education:    { free: 0, starter: 7,  pro: 15,  team: 39,  enterprise: 129 },
  legal:        { free: 0, starter: 25, pro: 49,  team: 99,  enterprise: 399 },
  ecommerce:    { free: 0, starter: 19, pro: 39,  team: 89,  enterprise: 299 },
  other:        { free: 0, starter: 7,  pro: 15,  team: 35,  enterprise: 119 },
};

// ── Price elasticity estimates per category ────────────────────────────────────
// PED = % change in demand / % change in price (absolute value)
// > 1 = elastic (price-sensitive), < 1 = inelastic
const CATEGORY_ELASTICITY = {
  pdf: 1.3, calculators: 1.5, converters: 1.6, writing: 1.1,
  marketing: 0.8, productivity: 0.9, finance: 0.9, health: 1.2,
  education: 1.4, legal: 0.7, ecommerce: 0.8, other: 1.4,
};

// ── Freemium feature gate recommendations by category ─────────────────────────
const FREEMIUM_GATES = {
  pdf:         { free: 'Up to 3 files/day, max 5MB', pro: 'Unlimited files, OCR, batch processing' },
  calculators: { free: 'Basic calculation, no export', pro: 'History, PDF export, custom formulas' },
  converters:  { free: '5 conversions/day, max 2MB', pro: 'Unlimited, bulk convert, API access' },
  writing:     { free: '500 words/day, basic tone', pro: 'Unlimited, 20+ tones, plagiarism check' },
  marketing:   { free: '3 campaigns/month, basic analytics', pro: 'Unlimited, A/B testing, team access' },
  productivity: { free: '5 projects, no integrations', pro: 'Unlimited projects, integrations, API' },
  finance:     { free: 'Single scenario analysis', pro: 'Multi-scenario, export, collaboration' },
  health:      { free: 'Basic tracking, 7-day history', pro: 'Unlimited history, trends, recommendations' },
  education:   { free: '10 cards/quiz, no progress tracking', pro: 'Unlimited, progress, shared decks' },
  legal:       { free: '1 document/month, watermarked', pro: 'Unlimited, no watermark, e-sign' },
  ecommerce:   { free: '100 products, basic analytics', pro: 'Unlimited, advanced analytics, automation' },
  other:       { free: 'Basic usage, limited history', pro: 'Full access, export, API' },
};

// ── Upsell add-on recommendations by category ─────────────────────────────────
const UPSELL_ADDONS = {
  pdf:         ['API Access ($29/mo)', 'White-label ($79/mo)', 'Priority processing ($9/mo)'],
  calculators: ['Custom branding ($19/mo)', 'Embed widget ($14/mo)', 'Data export ($9/mo)'],
  converters:  ['API key ($19/mo)', 'Bulk queue ($12/mo)'],
  writing:     ['Brand voice ($19/mo)', 'Team glossary ($14/mo)', 'SEO integration ($12/mo)'],
  marketing:   ['CRM integration ($29/mo)', 'Analytics suite ($39/mo)', 'White-label ($99/mo)'],
  productivity: ['Automation rules ($19/mo)', 'Slack integration ($12/mo)', 'Advanced reporting ($15/mo)'],
  finance:     ['CPA mode ($29/mo)', 'Multi-currency ($14/mo)', 'Tax jurisdiction add-on ($19/mo)'],
  health:      ['Coach dashboard ($24/mo)', 'Wearable sync ($12/mo)', 'Nutrition database ($9/mo)'],
  education:   ['LMS export ($14/mo)', 'Student analytics ($19/mo)', 'Parent dashboard ($9/mo)'],
  legal:       ['E-signature ($29/mo)', 'Notarization prep ($19/mo)', 'State-specific templates ($14/mo)'],
  ecommerce:   ['SEO audit ($24/mo)', 'Competitor tracking ($29/mo)', 'Review management ($14/mo)'],
  other:       ['API access ($15/mo)', 'Team seats ($12/mo per seat)'],
};

/**
 * Generate pricing recommendations for a tool.
 *
 * @param {object} tool - Tool object from DB
 * @param {object} [prediction] - Revenue prediction output (optional, improves recommendations)
 * @returns {PricingRecommendation}
 */
function recommend(tool, prediction = null) {
  const cat       = CATEGORY_PRICE_ANCHORS[tool.category] ? tool.category : 'other';
  const anchors   = CATEGORY_PRICE_ANCHORS[cat];
  const elasticity = CATEGORY_ELASTICITY[cat] || 1.2;
  const quality   = tool.quality_score || 50;
  const usage     = tool.usage_count   || 0;
  const currentPrice = parseFloat(tool.price) || 0;
  const isFree    = tool.is_free !== false;

  // Quality-adjusted price recommendation
  const qualityMult = 0.7 + (quality / 100) * 0.8;  // 0.7x at q=0, 1.5x at q=100
  const recommendedStarter = Math.round(anchors.starter * qualityMult);
  const recommendedPro     = Math.round(anchors.pro     * qualityMult);
  const recommendedTeam    = Math.round(anchors.team    * qualityMult);
  const recommendedEnterprise = Math.round(anchors.enterprise * qualityMult);

  // ── Pricing diagnosis ────────────────────────────────────────────────────
  let diagnosis = 'optimal';
  let diagnosisDetail = 'Current pricing aligns with category benchmarks';

  if (!isFree && currentPrice > 0) {
    if (currentPrice < anchors.starter * 0.6 && quality >= 60) {
      diagnosis = 'underpriced';
      diagnosisDetail = `Price $${currentPrice}/mo is ${Math.round((1 - currentPrice / anchors.starter) * 100)}% below category floor for quality score ${quality}`;
    } else if (currentPrice > anchors.pro * 1.8 && quality < 70) {
      diagnosis = 'overpriced';
      diagnosisDetail = `Price $${currentPrice}/mo is above market tolerance for quality score ${quality} — risk of churn`;
    } else if (currentPrice >= anchors.starter && currentPrice <= anchors.pro) {
      diagnosis = 'optimal';
      diagnosisDetail = 'Price is within the ideal starter-to-pro range for this category';
    }
  } else if (isFree && usage > 500 && quality >= 65) {
    diagnosis = 'freemium_ready';
    diagnosisDetail = `${usage} monthly uses with quality ${quality} — strong freemium upsell opportunity`;
  }

  // ── Revenue impact of price change ────────────────────────────────────────
  // If elasticity < 1: 10% price increase → less than 10% demand loss → net revenue gain
  const priceIncreaseImpact = elasticity < 1
    ? `10% price increase → ~${Math.round((1 - elasticity * 0.1) * 100 - 100)}% net revenue gain`
    : `10% price increase → ~${Math.round(elasticity * 10)}% demand reduction`;

  // ── Freemium gate ────────────────────────────────────────────────────────
  const gate = FREEMIUM_GATES[cat] || FREEMIUM_GATES.other;

  // ── Upsell add-ons ───────────────────────────────────────────────────────
  const addons = UPSELL_ADDONS[cat] || UPSELL_ADDONS.other;

  // ── Annual discount recommendation ───────────────────────────────────────
  // Inelastic categories can afford smaller discounts; elastic need more
  const annualDiscountPct = elasticity > 1.3 ? 25 : elasticity > 1.0 ? 20 : 15;

  // ── Confidence ───────────────────────────────────────────────────────────
  const confidenceScore = Math.min(90,
    (quality > 60 ? 30 : 15) +
    (usage > 100  ? 25 : usage > 10 ? 15 : 5) +
    (CATEGORY_PRICE_ANCHORS[tool.category] ? 20 : 10) +
    (prediction?.confidenceScore ? Math.round(prediction.confidenceScore * 0.15) : 5)
  );

  log.debug('Pricing recommendation generated', { cat, diagnosis, quality, usage });

  return {
    category:              cat,
    diagnosis,
    diagnosisDetail,
    currentPrice,
    isFree,
    recommendedTiers: {
      free:       { price: 0,                   label: 'Free',        features: gate.free },
      starter:    { price: recommendedStarter,   label: 'Starter',     features: `${gate.pro} (core features)` },
      pro:        { price: recommendedPro,        label: 'Pro',         features: gate.pro },
      team:       { price: recommendedTeam,       label: 'Team',        features: `${gate.pro} + team collaboration` },
      enterprise: { price: recommendedEnterprise, label: 'Enterprise',  features: 'Custom limits, SLA, dedicated support' },
    },
    annualDiscount:        { pct: annualDiscountPct, note: `${annualDiscountPct}% off annual — ${elasticity > 1 ? 'higher discount needed (elastic market)' : 'moderate discount sufficient'}` },
    elasticity,
    priceIncreaseImpact,
    freemiumGate:          gate,
    upsellAddons:          addons.slice(0, 3),
    anchors,
    confidenceScore,
    recommendedAt:         new Date().toISOString(),
  };
}

/**
 * Score a batch of tools for pricing health.
 *
 * @param {object[]} tools
 * @returns {object[]}
 */
function assessBatch(tools) {
  return tools.map(tool => {
    const rec = recommend(tool);
    return {
      toolId:    tool.id,
      toolSlug:  tool.slug,
      toolName:  tool.name,
      category:  tool.category,
      diagnosis: rec.diagnosis,
      diagnosisDetail: rec.diagnosisDetail,
      currentPrice: rec.currentPrice,
      recommendedPro: rec.recommendedTiers.pro.price,
      revenueDelta:  rec.diagnosis === 'underpriced'
        ? `+$${Math.round((rec.recommendedTiers.starter.price - rec.currentPrice) * Math.max(1, tool.usage_count / 100))}/mo`
        : null,
      confidenceScore: rec.confidenceScore,
    };
  });
}

module.exports = { recommend, assessBatch };
