'use strict';

/**
 * AWE-OS — ToolScoringEngine                                  Phase 6A
 *
 * Aggregates all intelligence signals into a composite quality score.
 * Pure algorithmic — no AI calls.
 *
 * Scoring weights:
 *   30% viability     (market need + feasibility)
 *   20% uniqueness    (differentiation from existing tools)
 *   25% monetization  (revenue potential)
 *   25% SEO           (organic traffic potential, inversely proportional to difficulty)
 *
 * Penalties:
 *   -25 points for confirmed duplicate (similarity >= 50%)
 *   -10 points for similar tool detected
 *   -5  points for high category saturation
 */

const GRADE_THRESHOLDS = [
  { min: 88, grade: 'A+', label: 'Exceptional — Launch immediately'  },
  { min: 78, grade: 'A',  label: 'Excellent — Strong go-to-market'   },
  { min: 68, grade: 'B+', label: 'Very Good — Refine and launch'      },
  { min: 58, grade: 'B',  label: 'Good — Needs differentiation'       },
  { min: 48, grade: 'C',  label: 'Average — Reconsider positioning'   },
  { min: 0,  grade: 'D',  label: 'Below Average — Significant rework' },
];

/**
 * Score a tool idea from all intelligence signals.
 *
 * @param {object} opts
 * @param {object} opts.analysis        - ToolIdeaAnalyzer output
 * @param {object} opts.monetization    - MonetizationIntelligence output
 * @param {object} opts.seo             - SEOIntelligence output
 * @param {object} opts.duplicateCheck  - DuplicateDetectionEngine output
 * @returns {object} Scoring result
 */
function score({ analysis, monetization, seo, duplicateCheck }) {
  const viabilityScore    = analysis.viabilityScore         || 60;
  const uniquenessScore   = analysis.uniquenessScore        || 50;
  const monetizationScore = monetization.monetizationScore  || 55;

  // SEO score: higher opportunity (lower difficulty) = higher SEO score
  const seoOpportunity    = seo.opportunityScore || (100 - (seo.difficultyScore || 62));

  // Weighted composite before penalties
  const rawScore = (
    viabilityScore    * 0.30 +
    uniquenessScore   * 0.20 +
    monetizationScore * 0.25 +
    seoOpportunity    * 0.25
  );

  // Penalties
  let penalty = 0;
  if (duplicateCheck.isDuplicate)                              penalty += 25;
  else if (duplicateCheck.isSimilar)                           penalty += 10;
  if (duplicateCheck.saturationLevel === 'high')               penalty +=  5;
  if (analysis.competitorDensity      === 'high')              penalty +=  5;
  if (analysis.complexity             === 'enterprise')        penalty +=  8; // very high build cost

  // Bonuses
  let bonus = 0;
  if (analysis.requiresAI && analysis.uniquenessScore > 65)   bonus  +=  8; // novel AI application
  if (duplicateCheck.saturationLevel  === 'low')               bonus  +=  5; // blue ocean
  if (analysis.confidence             >= 80)                   bonus  +=  3; // high AI confidence

  const overallScore = Math.max(5, Math.min(100, Math.round(rawScore - penalty + bonus)));

  // Grade lookup
  const gradeEntry = GRADE_THRESHOLDS.find(g => overallScore >= g.min) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];

  // Maintenance complexity
  const complexityScore   = analysis.complexityScore || 45;
  const maintenanceLabel  = complexityScore >= 75 ? 'High' : complexityScore >= 45 ? 'Medium' : 'Low';

  // Scalability rating (1–5 stars)
  const scalabilityRating = complexityScore <= 30 ? 5 : complexityScore <= 50 ? 4 : complexityScore <= 70 ? 3 : 2;

  // Profitability tier
  const monthlyHigh       = monetization.estimatedMonthlyRevenue?.high || 0;
  const profitability     = monthlyHigh >= 2500 ? 'High' : monthlyHigh >= 600 ? 'Medium' : 'Low';

  // Launch recommendation
  const launchRecommendation = overallScore >= 60 && !duplicateCheck.isDuplicate;

  return {
    overallScore,
    grade:               gradeEntry.grade,
    gradeLabel:          gradeEntry.label,
    launchRecommendation,
    profitabilityPrediction:  profitability,
    maintenanceComplexity:    maintenanceLabel,
    scalabilityRating,
    breakdown: {
      viability:        Math.round(viabilityScore),
      uniqueness:       Math.round(uniquenessScore),
      monetization:     Math.round(monetizationScore),
      seoOpportunity:   Math.round(seoOpportunity),
      penalty,
      bonus,
    },
    reasoning: _buildReasoning(overallScore, analysis, monetizationScore, seoOpportunity, duplicateCheck),
    scoredAt:  new Date().toISOString(),
  };
}

function _buildReasoning(score, analysis, monetizationScore, seoScore, duplicateCheck) {
  const points = [];

  if (duplicateCheck.isDuplicate) {
    points.push({ icon: '🚫', text: `High overlap (${duplicateCheck.topSimilarityScore}%) with existing tools — strong differentiation required` });
  } else if (duplicateCheck.isSimilar) {
    points.push({ icon: '⚠️', text: 'Similar tools detected — clearly define your unique value proposition' });
  } else {
    points.push({ icon: '✅', text: 'Low duplicate risk — clear market opportunity identified' });
  }

  if (monetizationScore >= 70) {
    points.push({ icon: '💰', text: 'Strong monetization potential across multiple revenue models' });
  } else if (monetizationScore >= 50) {
    points.push({ icon: '🔸', text: 'Moderate monetization — consider premium tier or affiliate integration' });
  } else {
    points.push({ icon: '📉', text: 'Lower direct revenue — position as SEO driver or lead generation tool' });
  }

  if (seoScore >= 60) {
    points.push({ icon: '📈', text: 'Good SEO opportunity — low-to-medium keyword competition' });
  } else if (seoScore >= 40) {
    points.push({ icon: '🔍', text: 'Competitive SEO landscape — focus on long-tail and feature keywords' });
  } else {
    points.push({ icon: '🏔️', text: 'Highly competitive SEO — requires strong content strategy and backlinks' });
  }

  if (analysis.complexity === 'simple') {
    points.push({ icon: '⚡', text: 'Simple to build — fast time-to-market, low maintenance overhead' });
  } else if (analysis.complexity === 'complex' || analysis.complexity === 'enterprise') {
    points.push({ icon: '🔧', text: 'Complex build — consider phased development with MVP first' });
  }

  if (duplicateCheck.saturationLevel === 'low') {
    points.push({ icon: '🌊', text: 'Blue ocean opportunity — very few tools in this category segment' });
  } else if (duplicateCheck.saturationLevel === 'high') {
    points.push({ icon: '🌊', text: 'Saturated category — requires clear niche differentiation to stand out' });
  }

  return points;
}

module.exports = { score };
