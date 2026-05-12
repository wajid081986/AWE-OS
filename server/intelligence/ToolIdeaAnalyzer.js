'use strict';

/**
 * AWE-OS — ToolIdeaAnalyzer                                   Phase 6A
 *
 * Analyzes a tool idea prompt and extracts structured strategic intelligence
 * using a single Claude Haiku call (~800ms). Falls back to keyword-based
 * heuristics if the AI call fails.
 */

const { callClaude, parseJSONResponse } = require('../services/ai.service');
const { createLogger }                  = require('../monitoring/logger');

const log = createLogger('tool-idea-analyzer');

const SYSTEM_PROMPT = `You are an expert SaaS product strategist for AWE-OS.
Analyze tool ideas and extract precise strategic intelligence.
Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation.
Start your response with { and end with }.`;

// Fallback keyword map for local category detection
const CATEGORY_KEYWORDS = {
  pdf:          ['pdf', 'document', 'convert', 'merge', 'split', 'compress', 'watermark'],
  calculators:  ['calculator', 'calculate', 'compute', 'bmi', 'loan', 'gpa', 'percentage'],
  converters:   ['convert', 'transform', 'unit', 'format', 'encode', 'decode', 'parser'],
  writing:      ['write', 'content', 'blog', 'copy', 'article', 'essay', 'paraphrase'],
  marketing:    ['marketing', 'seo', 'email', 'social', 'campaign', 'hashtag', 'ad'],
  productivity: ['productivity', 'workflow', 'automation', 'schedule', 'task', 'planner'],
  finance:      ['finance', 'invoice', 'budget', 'expense', 'payment', 'tax', 'crypto'],
  health:       ['health', 'fitness', 'diet', 'nutrition', 'medical', 'calories', 'workout'],
  education:    ['education', 'quiz', 'study', 'course', 'tutor', 'flashcard', 'learn'],
  legal:        ['legal', 'contract', 'compliance', 'law', 'agreement', 'nda', 'gdpr'],
  ecommerce:    ['ecommerce', 'store', 'product', 'inventory', 'shipping', 'price', 'shop'],
};

/**
 * Analyze a tool idea and return structured intelligence.
 *
 * @param {string} prompt   - Tool idea description
 * @param {string} category - Hint category
 * @returns {Promise<object>} Structured analysis object
 */
async function analyze(prompt, category) {
  const safePrompt   = String(prompt   || '').replace(/[`\\]/g, '').slice(0, 400);
  const safeCategory = String(category || 'other').slice(0, 50);

  const userPrompt = `Analyze this SaaS tool idea for a free online tools platform:
Category hint: "${safeCategory}"
Tool idea: "${safePrompt || 'AI-powered tool for ' + safeCategory}"

Return ONLY this exact JSON structure:
{
  "detectedCategory": "pdf|calculators|converters|writing|marketing|productivity|finance|health|education|legal|ecommerce|other",
  "complexity": "simple|moderate|complex|enterprise",
  "complexityScore": 10,
  "tags": ["tag1","tag2","tag3","tag4"],
  "targetAudience": "precise audience description (1 sentence)",
  "problemSolved": "core problem this tool solves (1 sentence)",
  "coreFeatures": ["feature1","feature2","feature3"],
  "monetizationPotential": 65,
  "seoPotential": 70,
  "estimatedBuildTimeHours": 16,
  "requiredModules": ["ai-service","form-handler"],
  "recommendedStack": {
    "frontend": ["React","Tailwind"],
    "backend": ["Node.js","Express"],
    "database": ["PostgreSQL"]
  },
  "requiresAI": true,
  "requiresExternalAPI": false,
  "primaryKeyword": "main search keyword phrase",
  "secondaryKeywords": ["keyword2","keyword3","keyword4"],
  "competitorDensity": "low|medium|high",
  "uniquenessScore": 55,
  "viabilityScore": 65,
  "confidence": 80
}

Use real numbers for scores (integers 0-100). Be accurate and pragmatic.`;

  try {
    const raw    = await callClaude(userPrompt, {
      model:        'claude-haiku-4-5-20251001',
      max_tokens:   1024,
      systemPrompt: SYSTEM_PROMPT,
    });

    const result = parseJSONResponse(raw);

    // Validate and clamp all numeric fields
    const validated = {
      detectedCategory:       result.detectedCategory      || safeCategory,
      complexity:             result.complexity             || 'moderate',
      complexityScore:        _clamp(result.complexityScore,        0, 100) || 45,
      tags:                   Array.isArray(result.tags)           ? result.tags.slice(0, 6)   : [safeCategory],
      targetAudience:         result.targetAudience         || 'Business professionals',
      problemSolved:          result.problemSolved          || 'Automates repetitive tasks',
      coreFeatures:           Array.isArray(result.coreFeatures)   ? result.coreFeatures.slice(0, 5) : [],
      monetizationPotential:  _clamp(result.monetizationPotential, 0, 100) || 55,
      seoPotential:           _clamp(result.seoPotential,          0, 100) || 60,
      estimatedBuildTimeHours:Math.max(1, Number(result.estimatedBuildTimeHours) || 16),
      requiredModules:        Array.isArray(result.requiredModules) ? result.requiredModules : [],
      recommendedStack:       result.recommendedStack       || { frontend: ['React'], backend: ['Node.js'], database: ['PostgreSQL'] },
      requiresAI:             result.requiresAI             !== false,
      requiresExternalAPI:    !!result.requiresExternalAPI,
      primaryKeyword:         result.primaryKeyword         || `free ${safeCategory} tool`,
      secondaryKeywords:      Array.isArray(result.secondaryKeywords) ? result.secondaryKeywords.slice(0, 5) : [],
      competitorDensity:      result.competitorDensity      || 'medium',
      uniquenessScore:        _clamp(result.uniquenessScore,        0, 100) || 50,
      viabilityScore:         _clamp(result.viabilityScore,         0, 100) || 60,
      confidence:             _clamp(result.confidence,             0, 100) || 70,
    };

    log.info('Idea analyzed', {
      category: validated.detectedCategory,
      complexity: validated.complexity,
      viability: validated.viabilityScore,
      confidence: validated.confidence,
    });

    return {
      ...validated,
      inputPrompt:   safePrompt,
      inputCategory: safeCategory,
      analyzedAt:    new Date().toISOString(),
    };
  } catch (err) {
    log.warn('analyze AI call failed, using fallback', { error: err.message });
    return _fallbackAnalysis(safePrompt, safeCategory);
  }
}

// ── Fallback: keyword heuristics ──────────────────────────────────────────────

function _fallbackAnalysis(prompt, category) {
  const text = (prompt + ' ' + category).toLowerCase();

  let detectedCategory = category;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) { detectedCategory = cat; break; }
  }

  const complexIndicators = ['api', 'real-time', 'payment', 'enterprise', 'integration', 'database', 'auth'];
  const modIndicators     = ['user', 'dashboard', 'report', 'export', 'history', 'account'];
  const complexCount      = complexIndicators.filter(kw => text.includes(kw)).length;
  const modCount          = modIndicators.filter(kw => text.includes(kw)).length;

  const complexity      = complexCount >= 2 ? 'complex' : modCount >= 1 || complexCount >= 1 ? 'moderate' : 'simple';
  const complexityScore = complexity === 'complex' ? 72 : complexity === 'moderate' ? 45 : 22;

  return {
    detectedCategory,
    complexity,
    complexityScore,
    tags:                   [detectedCategory, 'saas', 'ai-tool', 'free-tool'],
    targetAudience:         'Business professionals and freelancers',
    problemSolved:          'Automates repetitive tasks using AI-powered processing',
    coreFeatures:           ['AI-powered processing', 'Instant results', 'No account required'],
    monetizationPotential:  55,
    seoPotential:           60,
    estimatedBuildTimeHours: complexity === 'complex' ? 48 : complexity === 'moderate' ? 20 : 8,
    requiredModules:        ['ai-service', 'ui-form', 'result-display'],
    recommendedStack:       { frontend: ['React', 'Tailwind'], backend: ['Node.js'], database: ['PostgreSQL'] },
    requiresAI:             true,
    requiresExternalAPI:    false,
    primaryKeyword:         `free ${detectedCategory} tool`,
    secondaryKeywords:      [`online ${detectedCategory}`, `ai ${detectedCategory} generator`, `${detectedCategory} tool free`],
    competitorDensity:      'medium',
    uniquenessScore:        50,
    viabilityScore:         60,
    confidence:             35,
    inputPrompt:            prompt,
    inputCategory:          category,
    analyzedAt:             new Date().toISOString(),
    _fallback:              true,
  };
}

function _clamp(val, min, max) {
  const n = Number(val);
  return isNaN(n) ? null : Math.min(max, Math.max(min, Math.round(n)));
}

module.exports = { analyze };
