'use strict';

/**
 * AWE-OS — SEOIntelligence                                    Phase 6A
 *
 * Builds a full SEO intelligence report from tool analysis data.
 * Pure algorithmic — no AI calls.
 *
 * Outputs:
 *   - Keyword clusters (core, category, long-tail, feature)
 *   - Search intent classification
 *   - SEO difficulty score
 *   - Monthly traffic estimate range
 *   - Content recommendations
 *   - Structured data schema recommendation
 *   - Meta title/description suggestions
 *   - Competitive gap analysis
 */

// Baseline SEO difficulty per category (0 = easy, 100 = very hard)
const CATEGORY_DIFFICULTY = {
  pdf:          72, calculators: 58, converters: 62, writing:     70,
  marketing:    76, productivity: 67, finance:    71, health:      64,
  education:    60, legal:        74, ecommerce:  72, other:       62,
};

// Monthly search volume range baseline (simple tools attract more casual traffic)
const COMPLEXITY_TRAFFIC = {
  simple:     { low: 4000,  high: 40000  },
  moderate:   { low: 1500,  high: 18000  },
  complex:    { low: 800,   high: 8000   },
  enterprise: { low: 200,   high: 2000   },
};

// Intent signals
const INTENT_SIGNALS = {
  transactional: /\b(free|download|get|generate|create|make|build|convert|merge|compress|edit)\b/i,
  commercial:    /\b(best|top|review|compare|vs|alternative|cheap|discount|tool)\b/i,
  informational: /\b(how|what|why|guide|tutorial|learn|tips|tricks|explained?)\b/i,
};

// Schema.org type recommendation per category
const SCHEMA_MAP = {
  pdf:          'WebApplication',
  calculators:  'WebApplication',
  converters:   'WebApplication',
  writing:      'SoftwareApplication',
  marketing:    'SoftwareApplication',
  productivity: 'SoftwareApplication',
  finance:      'FinancialProduct',
  health:       'WebApplication',
  education:    'LearningResource',
  legal:        'LegalService',
  ecommerce:    'SoftwareApplication',
  other:        'WebApplication',
};

/**
 * Build a full SEO intelligence report.
 *
 * @param {object} analysis - Output from ToolIdeaAnalyzer.analyze()
 * @returns {object} SEO intelligence report
 */
function buildReport(analysis) {
  const category   = analysis.detectedCategory || 'other';
  const primary    = analysis.primaryKeyword   || `free ${category} tool`;
  const secondary  = Array.isArray(analysis.secondaryKeywords) ? analysis.secondaryKeywords : [];
  const tags       = Array.isArray(analysis.tags) ? analysis.tags : [];
  const complexity = analysis.complexity || 'moderate';
  const seoPot     = analysis.seoPotential || 60;

  // Difficulty: baseline adjusted by tool's SEO potential score
  const baseDifficulty  = CATEGORY_DIFFICULTY[category] || 62;
  const potentialBonus  = (seoPot - 50) * 0.4;
  const difficultyScore = Math.round(Math.max(10, Math.min(95, baseDifficulty - potentialBonus)));

  // Traffic estimate
  const traffic   = COMPLEXITY_TRAFFIC[complexity] || COMPLEXITY_TRAFFIC.moderate;
  const modifier  = seoPot / 60;
  const trafficLow  = Math.round(traffic.low  * modifier);
  const trafficHigh = Math.round(traffic.high * modifier);

  // Search intent
  const allKeywords = [primary, ...secondary, ...tags].join(' ');
  let searchIntent  = 'informational';
  if (INTENT_SIGNALS.transactional.test(allKeywords)) searchIntent = 'transactional';
  else if (INTENT_SIGNALS.commercial.test(allKeywords)) searchIntent = 'commercial';

  // Keyword clusters
  const keywordClusters = [
    {
      cluster: 'Core',
      keywords: [primary, `free ${primary}`, `${primary} online`, `${primary} no signup`],
    },
    {
      cluster: 'Category',
      keywords: [`free ${category} tools`, `best ${category} tools`, `online ${category} tool`, `${category} generator`],
    },
    {
      cluster: 'Long-tail',
      keywords: [
        `how to ${primary.replace(/tool|generator/i, '').trim()}`,
        `${primary} for ${(analysis.targetAudience || 'professionals').split(' ').slice(0, 2).join(' ')}`,
        `${primary} without registration`,
        `${primary} step by step`,
      ],
    },
    {
      cluster: 'Feature',
      keywords: secondary.slice(0, 4).map(kw => `${kw} free online`),
    },
  ];

  // Content recommendations
  const contentRecs = [
    `How-to guide: "How to ${primary.replace(/tool|generator/i, '').trim()} in seconds"`,
    `FAQ article targeting "${primary} not working" and "${primary} alternatives"`,
    `Comparison: "Best ${category} tools in ${new Date().getFullYear()} (Free vs Paid)"`,
    `Tutorial: "Step-by-step guide to ${primary}"`,
    `Use-case roundup: "${primary} for ${analysis.targetAudience || 'small businesses'}"`,
  ];

  // Meta suggestions
  const toolName = _capitalizeWords(primary.replace(/free|online|tool/gi, '').trim());
  const metaTitle = `${toolName} — Free Online Tool | AWE-OS`;
  const metaDesc  = `${analysis.problemSolved || 'Process tasks instantly'}. Free, fast, and easy. No signup required. Works in your browser.`;

  // Competitive gap analysis
  let competitiveGap;
  if (difficultyScore < 45)       competitiveGap = 'Significant opportunity — low competition';
  else if (difficultyScore < 65)  competitiveGap = 'Moderate competition — quality content wins';
  else if (difficultyScore < 80)  competitiveGap = 'Competitive space — long-tail focus recommended';
  else                             competitiveGap = 'Highly competitive — requires strong backlink strategy';

  return {
    primaryKeyword:              primary,
    secondaryKeywords:           secondary.slice(0, 5),
    keywordClusters,
    searchIntent,
    difficultyScore,
    opportunityScore:            Math.round(100 - difficultyScore),
    trafficEstimate:             { monthlyLow: trafficLow, monthlyHigh: trafficHigh },
    contentRecommendations:      contentRecs,
    schemaType:                  SCHEMA_MAP[category] || 'WebApplication',
    metaTitleSuggestion:         metaTitle.slice(0, 60),
    metaDescriptionSuggestion:   metaDesc.slice(0, 155),
    longTailOpportunities: [
      `${primary} free no login`,
      `${primary} best ${new Date().getFullYear()}`,
      `how to use ${primary}`,
      `${primary} for beginners`,
    ],
    competitiveGap,
    timeToRankEstimate: difficultyScore < 50 ? '2–4 months' : difficultyScore < 70 ? '4–8 months' : '8–18 months',
  };
}

function _capitalizeWords(str) {
  return String(str).replace(/\b\w/g, c => c.toUpperCase()).trim();
}

module.exports = { buildReport };
