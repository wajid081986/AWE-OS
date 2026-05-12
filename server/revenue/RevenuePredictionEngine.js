'use strict';

/**
 * AWE-OS — RevenuePredictionEngine                             Phase 6C
 *
 * Predicts per-tool and per-category revenue signals.
 * Pure algorithmic — no AI calls.
 *
 * Prediction signals:
 *   RPM   — Revenue Per Mille (per 1,000 page views)
 *   CTR   — Click-Through Rate (ad/affiliate clicks)
 *   MRR   — Monthly Recurring Revenue estimate
 *   LTV   — Lifetime Value estimate per converting user
 *   Confidence — data richness × category certainty
 *
 * Calibration philosophy:
 *   Baselines are set conservatively. Multipliers compound upwards when
 *   quality, usage, and engagement signals align. This prevents over-optimism
 *   on low-data tools while rewarding proven performers.
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('revenue-prediction');

// ── Category baseline RPM (USD per 1,000 page views) ─────────────────────────
// Based on industry benchmarks for ad-supported SaaS tools:
// High-intent categories (finance, legal) command premium CPMs.
const CATEGORY_RPM = {
  pdf:          { low: 1.20, mid: 2.80, high: 5.50 },
  calculators:  { low: 1.60, mid: 3.40, high: 7.00 },
  converters:   { low: 0.80, mid: 1.90, high: 3.80 },
  writing:      { low: 1.40, mid: 3.10, high: 6.20 },
  marketing:    { low: 2.20, mid: 4.80, high: 9.50 },
  productivity: { low: 1.80, mid: 3.90, high: 7.80 },
  finance:      { low: 2.80, mid: 5.60, high: 11.0 },
  health:       { low: 1.60, mid: 3.50, high: 6.80 },
  education:    { low: 1.20, mid: 2.60, high: 5.20 },
  legal:        { low: 3.20, mid: 6.40, high: 12.5 },
  ecommerce:    { low: 2.00, mid: 4.20, high: 8.40 },
  other:        { low: 0.90, mid: 2.10, high: 4.20 },
};

// ── Category baseline CTR ─────────────────────────────────────────────────────
// Fraction of page views that click an ad or affiliate link (0–1)
const CATEGORY_CTR = {
  pdf:          { low: 0.008, mid: 0.018, high: 0.035 },
  calculators:  { low: 0.012, mid: 0.025, high: 0.048 },
  converters:   { low: 0.006, mid: 0.015, high: 0.030 },
  writing:      { low: 0.010, mid: 0.022, high: 0.044 },
  marketing:    { low: 0.015, mid: 0.032, high: 0.065 },
  productivity: { low: 0.012, mid: 0.028, high: 0.055 },
  finance:      { low: 0.018, mid: 0.038, high: 0.075 },
  health:       { low: 0.010, mid: 0.022, high: 0.045 },
  education:    { low: 0.008, mid: 0.018, high: 0.036 },
  legal:        { low: 0.020, mid: 0.042, high: 0.080 },
  ecommerce:    { low: 0.016, mid: 0.034, high: 0.068 },
  other:        { low: 0.006, mid: 0.014, high: 0.028 },
};

// ── Avg monthly page views per usage_count unit ───────────────────────────────
// usage_count is a proxy; each unit ≈ 4 page views (tool page + 3 sub-pages)
const VIEWS_PER_USAGE = 4;

// ── Subscription revenue per paying user (MRR) ────────────────────────────────
const CATEGORY_SUB_MRR = {
  pdf: 12, calculators: 8, converters: 6, writing: 18,
  marketing: 25, productivity: 22, finance: 20, health: 14,
  education: 12, legal: 30, ecommerce: 20, other: 10,
};

// ── Affiliate commission per click ────────────────────────────────────────────
const CATEGORY_AFFILIATE_CPC = {
  pdf: 0.45, calculators: 0.60, converters: 0.30, writing: 0.55,
  marketing: 0.90, productivity: 0.70, finance: 1.20, health: 0.65,
  education: 0.40, legal: 1.80, ecommerce: 0.80, other: 0.35,
};

// ── Avg retention months by category (for LTV) ───────────────────────────────
const CATEGORY_RETENTION = {
  pdf: 8, calculators: 4, converters: 3, writing: 10,
  marketing: 12, productivity: 14, finance: 11, health: 9,
  education: 7, legal: 15, ecommerce: 10, other: 5,
};

// ── Conversion rate baselines (visitors → paying subscribers) ─────────────────
const CATEGORY_CONV_RATE = {
  pdf: 0.020, calculators: 0.012, converters: 0.010, writing: 0.030,
  marketing: 0.040, productivity: 0.035, finance: 0.028, health: 0.022,
  education: 0.018, legal: 0.045, ecommerce: 0.032, other: 0.015,
};

/**
 * Predict revenue metrics for a single tool.
 *
 * @param {object} inputs
 * @param {string} inputs.category
 * @param {number} inputs.qualityScore    (0–100)
 * @param {number} inputs.usageCount      (raw usage_count from DB)
 * @param {number} inputs.seoScore        (0–100, optional)
 * @param {number} inputs.engagementScore (0–100, optional)
 * @param {string} inputs.monetizationType ('adsense'|'subscription'|'affiliate'|'hybrid')
 * @param {boolean} inputs.isFree
 * @param {number}  inputs.price          (USD, if not free)
 * @returns {PredictionResult}
 */
function predict(inputs) {
  const {
    category         = 'other',
    qualityScore     = 50,
    usageCount       = 0,
    seoScore         = 50,
    engagementScore  = 50,
    monetizationType = 'adsense',
    isFree           = true,
    price            = 0,
  } = inputs;

  const cat         = CATEGORY_RPM[category] ? category : 'other';
  const rpm         = CATEGORY_RPM[cat];
  const ctrBase     = CATEGORY_CTR[cat];
  const subMRR      = CATEGORY_SUB_MRR[cat]    || 10;
  const affCPC      = CATEGORY_AFFILIATE_CPC[cat] || 0.40;
  const retention   = CATEGORY_RETENTION[cat]   || 6;
  const convRate    = CATEGORY_CONV_RATE[cat]    || 0.015;

  // Quality multiplier (0.6 at q=0, 1.0 at q=50, 1.6 at q=100)
  const qualMult    = 0.60 + (qualityScore / 100) * 1.0;

  // Engagement multiplier (0.7 at e=0, 1.0 at e=50, 1.5 at e=100)
  const engMult     = 0.70 + (engagementScore / 100) * 0.8;

  // SEO multiplier — high SEO means more organic traffic converts better
  const seoMult     = 0.80 + (seoScore / 100) * 0.5;

  // Estimated monthly page views from usage_count
  const monthlyViews = Math.max(1, usageCount * VIEWS_PER_USAGE);

  // ── RPM prediction ────────────────────────────────────────────────────────
  const rpmRaw    = rpm.mid * qualMult * seoMult;
  const rpmCapped = Math.min(rpm.high * 1.1, Math.max(rpm.low * 0.8, rpmRaw));
  const rpmPrediction = Math.round(rpmCapped * 100) / 100;

  // ── CTR prediction ────────────────────────────────────────────────────────
  const ctrRaw    = ctrBase.mid * engMult * seoMult;
  const ctrCapped = Math.min(ctrBase.high * 1.1, Math.max(ctrBase.low * 0.8, ctrRaw));
  const ctrPrediction = Math.round(ctrCapped * 10000) / 10000;

  // ── Monthly revenue by model ──────────────────────────────────────────────

  // AdSense: RPM × views / 1000
  const adsenseRevenue = (rpmPrediction * monthlyViews) / 1000;

  // Affiliate: CTR × views × CPC
  const affiliatePotential = ctrPrediction * monthlyViews * affCPC;

  // Subscription: conversion_rate × monthly visitors × MRR per user
  const effectiveConvRate    = convRate * qualMult * engMult;
  const subscriptionPotential = effectiveConvRate * (monthlyViews / 4) * subMRR;

  // Lead gen: 0.5× subscription (email capture at half the conversion cost)
  const leadGenPotential = subscriptionPotential * 0.5;

  // Revenue by selected model
  const modelRevenue = {
    adsense:      adsenseRevenue,
    affiliate:    affiliatePotential,
    subscription: subscriptionPotential,
    leadgen:      leadGenPotential,
    hybrid:       (adsenseRevenue * 0.4 + affiliatePotential * 0.3 + subscriptionPotential * 0.3),
  };

  const selectedRevenue = modelRevenue[monetizationType] || adsenseRevenue;

  // If tool has existing paid price, use it as floor for subscription estimate
  const adjustedRevenue = (!isFree && price > 0)
    ? Math.max(selectedRevenue, price * Math.max(1, Math.round(monthlyViews / 500)))
    : selectedRevenue;

  // ── LTV prediction ────────────────────────────────────────────────────────
  // LTV = MRR per user × avg retention months × quality adjustment
  const ltvPrediction = subMRR * retention * qualMult;

  // ── Confidence score ──────────────────────────────────────────────────────
  // Higher confidence when we have real usage data + quality score
  const dataRichness  = usageCount > 100 ? 30 : usageCount > 10 ? 20 : usageCount > 0 ? 10 : 0;
  const qualityData   = qualityScore > 60 ? 25 : qualityScore > 40 ? 15 : 5;
  const categoryConf  = CATEGORY_RPM[category] ? 20 : 10;  // known vs unknown category
  const modelConf     = monetizationType !== 'other' ? 15 : 8;
  const engagementConf = engagementScore > 50 ? 10 : 5;
  const confidenceScore = Math.min(95, dataRichness + qualityData + categoryConf + modelConf + engagementConf);

  log.debug('Revenue prediction computed', {
    category: cat,
    usageCount,
    rpmPrediction,
    ctrPrediction,
    monthlyRevenue: Math.round(adjustedRevenue),
    confidenceScore,
  });

  return {
    estimatedMonthlyRevenue: Math.round(adjustedRevenue * 100) / 100,
    rpmPrediction,
    ctrPrediction,
    subscriptionPotential:  Math.round(subscriptionPotential * 100) / 100,
    affiliatePotential:     Math.round(affiliatePotential * 100) / 100,
    leadGenPotential:       Math.round(leadGenPotential * 100) / 100,
    adsensePotential:       Math.round(adsenseRevenue * 100) / 100,
    ltvPrediction:          Math.round(ltvPrediction * 100) / 100,
    conversionRate:         Math.round(effectiveConvRate * 10000) / 10000,
    monthlyPageViews:       monthlyViews,
    confidenceScore,
    modelBreakdown:         Object.fromEntries(
      Object.entries(modelRevenue).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    predictedAt:            new Date().toISOString(),
  };
}

/**
 * Predict revenue for a batch of tools.
 *
 * @param {object[]} tools  - Array of tool objects from DB
 * @returns {object[]} Array of predictions keyed by tool_id
 */
function predictBatch(tools) {
  return tools.map(tool => ({
    toolId:   tool.id,
    toolSlug: tool.slug,
    category: tool.category,
    ...predict({
      category:        tool.category,
      qualityScore:    tool.quality_score  || 50,
      usageCount:      tool.usage_count    || 0,
      seoScore:        tool.seo_score      || 50,
      engagementScore: tool.engagement_score || 50,
      monetizationType: tool.monetization_type || 'adsense',
      isFree:          tool.is_free !== false,
      price:           tool.price || 0,
    }),
  }));
}

/**
 * Get category-level aggregate revenue projections.
 *
 * @param {object} categoryStats - { cat: { toolCount, avgQuality, avgUsage } }
 * @returns {object} Per-category revenue projections
 */
function projectByCategory(categoryStats) {
  const result = {};
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const sample = predict({
      category:      cat,
      qualityScore:  stats.avgQuality || 50,
      usageCount:    stats.avgUsage   || 0,
      seoScore:      55,
      engagementScore: 50,
      monetizationType: 'hybrid',
      isFree: true,
    });
    result[cat] = {
      toolCount:           stats.toolCount,
      avgMonthlyRevenue:   sample.estimatedMonthlyRevenue,
      totalCategoryMRR:    Math.round(sample.estimatedMonthlyRevenue * stats.toolCount * 100) / 100,
      avgRPM:              sample.rpmPrediction,
      avgCTR:              sample.ctrPrediction,
      avgLTV:              sample.ltvPrediction,
      confidenceScore:     sample.confidenceScore,
    };
  }
  return result;
}

module.exports = { predict, predictBatch, projectByCategory };
