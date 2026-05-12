'use strict';

/**
 * AWE-OS — OpportunityRankingEngine                            Phase 6B
 *
 * Converts trend data + category intelligence into a ranked list of
 * actionable marketplace opportunities.
 *
 * Scoring dimensions:
 *   30% — Market opportunity (demand – supply gap)
 *   25% — Monetization potential (category model fit)
 *   20% — SEO potential (traffic opportunity vs difficulty)
 *   15% — Implementation feasibility (low = fast ROI)
 *   10% — Market timing (seasonal signal)
 *
 * Each opportunity gets: ROI score, launch confidence, maintenance burden.
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('opportunity-ranking');

// Expected monetization potential per category (from MonetizationIntelligence baselines)
const CATEGORY_MONETIZATION = {
  pdf: 68, calculators: 62, converters: 55, writing: 74,
  marketing: 80, productivity: 77, finance: 72, health: 68,
  education: 64, legal: 75, ecommerce: 78, other: 58,
};

// SEO difficulty baselines (from SEOIntelligence)
const CATEGORY_SEO_DIFFICULTY = {
  pdf: 72, calculators: 58, converters: 62, writing: 70,
  marketing: 76, productivity: 67, finance: 71, health: 64,
  education: 60, legal: 74, ecommerce: 72, other: 62,
};

// Implementation complexity per category (lower = easier = better feasibility score)
const CATEGORY_IMPL_DIFFICULTY = {
  calculators: 20, converters: 25, pdf: 45, writing: 35,
  marketing: 50, productivity: 55, finance: 45, health: 40,
  education: 35, legal: 60, ecommerce: 55, other: 40,
};

// Confidence floor per velocity direction
const VELOCITY_CONFIDENCE = {
  rising: 0.90, stable: 0.70, declining: 0.40, dormant: 0.25,
};

// Tool type ideas per category — what to recommend specifically
const OPPORTUNITY_TEMPLATES = {
  pdf: [
    { title: 'PDF AI Assistant', desc: 'Chat with PDF content using AI', complexity: 'complex' },
    { title: 'PDF Form Builder',  desc: 'Create and fill interactive PDF forms', complexity: 'moderate' },
    { title: 'PDF Batch Processor', desc: 'Process multiple PDFs simultaneously', complexity: 'moderate' },
  ],
  calculators: [
    { title: 'Retirement Planner',   desc: 'Comprehensive retirement savings calculator', complexity: 'moderate' },
    { title: 'Tax Bracket Calculator', desc: 'Multi-jurisdiction income tax estimator', complexity: 'simple' },
    { title: 'ROI Calculator',       desc: 'Business return on investment analyzer', complexity: 'simple' },
  ],
  writing: [
    { title: 'AI Blog Outline Generator', desc: 'SEO-optimized blog structure builder', complexity: 'moderate' },
    { title: 'Email Subject Line Tester', desc: 'Preview and score email subject lines', complexity: 'simple' },
    { title: 'Readability Analyzer',      desc: 'Grade reading level and improve clarity', complexity: 'simple' },
  ],
  marketing: [
    { title: 'Ad Copy Generator',    desc: 'AI-powered ad copy for Google/Meta ads', complexity: 'moderate' },
    { title: 'Headline Analyzer',    desc: 'Score and optimize marketing headlines', complexity: 'simple' },
    { title: 'Campaign ROI Tracker', desc: 'Multi-channel marketing ROI dashboard', complexity: 'complex' },
  ],
  finance: [
    { title: 'Invoice Generator',    desc: 'Professional invoice creator with PDF export', complexity: 'moderate' },
    { title: 'Budget Planner Pro',   desc: 'Monthly budget tracker with spending insights', complexity: 'moderate' },
    { title: 'Currency Converter Pro', desc: 'Real-time multi-currency conversion tool', complexity: 'simple' },
  ],
  productivity: [
    { title: 'Meeting Summarizer',   desc: 'AI-powered meeting notes and action items', complexity: 'complex' },
    { title: 'Time Zone Planner',    desc: 'Global team meeting time finder', complexity: 'simple' },
    { title: 'Priority Matrix',      desc: 'Eisenhower matrix task prioritizer', complexity: 'simple' },
  ],
  health: [
    { title: 'Macro Calculator',     desc: 'Personalized macronutrient daily targets', complexity: 'simple' },
    { title: 'Workout Planner',      desc: 'AI-generated weekly workout schedules', complexity: 'moderate' },
    { title: 'Sleep Quality Scorer', desc: 'Analyze sleep patterns and get recommendations', complexity: 'moderate' },
  ],
  education: [
    { title: 'Flashcard Generator',  desc: 'AI-powered study flashcards from any text', complexity: 'moderate' },
    { title: 'Quiz Creator',         desc: 'Generate multiple-choice quizzes from notes', complexity: 'moderate' },
    { title: 'Citation Generator',   desc: 'Auto-format academic citations (APA/MLA/Chicago)', complexity: 'simple' },
  ],
  legal: [
    { title: 'NDA Generator',        desc: 'Customizable non-disclosure agreement builder', complexity: 'moderate' },
    { title: 'Terms Generator',      desc: 'Privacy policy and terms of service generator', complexity: 'moderate' },
    { title: 'Lease Agreement Builder', desc: 'Residential/commercial lease document creator', complexity: 'complex' },
  ],
  ecommerce: [
    { title: 'Product Description Writer', desc: 'AI product copy optimized for conversions', complexity: 'moderate' },
    { title: 'Profit Margin Calculator',   desc: 'E-commerce pricing and margin optimizer', complexity: 'simple' },
    { title: 'Shipping Calculator',        desc: 'Multi-carrier shipping rate comparison', complexity: 'moderate' },
  ],
  converters: [
    { title: 'JSON Formatter Pro',   desc: 'Format, validate and convert JSON data', complexity: 'simple' },
    { title: 'Image Format Converter', desc: 'Batch convert between image formats', complexity: 'simple' },
    { title: 'Markdown to HTML',     desc: 'Real-time Markdown preview and converter', complexity: 'simple' },
  ],
  other: [
    { title: 'Random Generator',     desc: 'Customizable random name/ID/string generator', complexity: 'simple' },
    { title: 'Countdown Timer',      desc: 'Event countdown with shareable link', complexity: 'simple' },
  ],
};

/**
 * Generate ranked opportunities from trend data + category intelligence.
 *
 * @param {object} trends  - Output from TrendDetectionEngine.detectTrends()
 * @param {object} [opts]
 * @param {number} [opts.maxPerCategory=2] - Max opportunities per category
 * @param {number} [opts.minScore=40]      - Minimum overall score to include
 * @returns {object}  { opportunities, topOpportunity, totalRanked, rankedAt }
 */
function rankOpportunities(trends, { maxPerCategory = 2, minScore = 40 } = {}) {
  const startMs = Date.now();
  const catTrends = trends.categoryTrends || {};

  const opportunities = [];
  const catCounts     = {};

  // Build scored opportunities for every category
  for (const [cat, trend] of Object.entries(catTrends)) {
    const templates   = OPPORTUNITY_TEMPLATES[cat] || OPPORTUNITY_TEMPLATES.other;
    const countForCat = catCounts[cat] || 0;
    if (countForCat >= maxPerCategory) continue;

    const monetization  = CATEGORY_MONETIZATION[cat]    || 60;
    const seoDifficulty = CATEGORY_SEO_DIFFICULTY[cat]  || 65;
    const implDifficulty = CATEGORY_IMPL_DIFFICULTY[cat] || 40;
    const seoOpportunity = Math.round(100 - seoDifficulty + (trend.avgUsage > 500 ? 8 : 0));
    const feasibility   = Math.round(100 - implDifficulty);
    const timing        = Math.round((trend.seasonalBoost - 1) * 100 + 50); // 50 neutral

    // Market opportunity score (demand gap)
    const marketOpportunity = trend.opportunityScore || 50;

    // Composite score
    const rawScore = (
      marketOpportunity * 0.30 +
      monetization      * 0.25 +
      seoOpportunity    * 0.20 +
      feasibility       * 0.15 +
      timing            * 0.10
    );

    // Saturation penalty
    const satPenalty = trend.saturation >= 80 ? 15 : trend.saturation >= 60 ? 7 : 0;

    const overallScore  = Math.round(Math.min(100, Math.max(5, rawScore - satPenalty)));
    if (overallScore < minScore) continue;

    const velocityConf  = VELOCITY_CONFIDENCE[trend.velocity] || 0.6;
    const launchConf    = Math.round(overallScore * velocityConf);
    const maintenanceBurden = implDifficulty >= 55 ? 'high' : implDifficulty >= 35 ? 'medium' : 'low';

    // ROI score: monetization × feasibility / saturation risk
    const roiScore = Math.round(
      (monetization * 0.5 + feasibility * 0.5) * (1 - trend.saturation / 200)
    );

    // Pick best template for this category
    const templateIdx  = opportunities.filter(o => o.category === cat).length % templates.length;
    const template     = templates[templateIdx] || templates[0];

    opportunities.push({
      category:            cat,
      title:               template.title,
      description:         template.desc,
      opportunityScore:    overallScore,
      seoScore:            seoOpportunity,
      monetizationScore:   monetization,
      implementationScore: feasibility,
      roiScore,
      launchPriority:      overallScore,
      launchConfidence:    Math.min(95, launchConf),
      saturationRisk:      trend.saturation,
      trendSignal:         trend.velocity,
      maintenanceBurden,
      complexity:          template.complexity,
      marketOpportunity,
      timing:              timing > 60 ? 'peak' : timing > 40 ? 'good' : 'off-peak',
    });

    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  // Sort by overall opportunity score
  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  log.info('Opportunities ranked', {
    total:    opportunities.length,
    topScore: opportunities[0]?.opportunityScore || 0,
    ms:       Date.now() - startMs,
  });

  return {
    opportunities:  opportunities.slice(0, 20),
    topOpportunity: opportunities[0] || null,
    totalRanked:    opportunities.length,
    rankedAt:       new Date().toISOString(),
  };
}

module.exports = { rankOpportunities };
