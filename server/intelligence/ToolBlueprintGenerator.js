'use strict';

/**
 * AWE-OS — ToolBlueprintGenerator                             Phase 6A
 *
 * Generates a full implementation blueprint for a tool idea using gpt-4o.
 * Returns frontend structure, backend design, DB requirements, API plan,
 * scaling notes, security considerations, and phased build plan.
 *
 * Uses gpt-4o (more capable) — this is a heavier call (~5–10s).
 * Called via a dedicated endpoint, not inline with the fast analysis pipeline.
 */

const { callOpenAI, parseJSONResponse } = require('../services/ai.service');
const { createLogger }                  = require('../monitoring/logger');

const log = createLogger('blueprint-generator');

const SYSTEM_PROMPT = `You are a senior full-stack architect building AWE-OS SaaS tools.
Generate complete, production-grade implementation blueprints.
Be specific, practical, and technically accurate.
Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation.
Start your response with { and end with }.`;

/**
 * Generate a full implementation blueprint.
 *
 * @param {object} analysis - Output from ToolIdeaAnalyzer.analyze()
 * @param {string} prompt   - Original tool idea
 * @param {string} category - Tool category
 * @returns {Promise<object>} Blueprint object
 */
async function generate(analysis, prompt, category) {
  const safePrompt   = String(prompt   || '').slice(0, 400);
  const safeCategory = String(category || 'other').slice(0, 50);
  const features     = (analysis.coreFeatures || []).slice(0, 5).join(', ');
  const audience     = analysis.targetAudience || 'general users';
  const complexity   = analysis.complexity || 'moderate';
  const stack        = analysis.recommendedStack || {};

  const userPrompt = `Generate a complete implementation blueprint for this AWE-OS SaaS tool:

Tool concept: "${safePrompt || 'AI tool for ' + safeCategory}"
Category: ${safeCategory}
Complexity: ${complexity}
Core features: ${features || 'AI processing, instant results, no signup'}
Target audience: ${audience}
Requires AI: ${analysis.requiresAI ? 'yes (Claude API)' : 'no'}
Requires external API: ${analysis.requiresExternalAPI ? 'yes' : 'no'}
Frontend: ${(stack.frontend || ['React', 'Tailwind']).join(', ')}
Backend: ${(stack.backend || ['Node.js', 'Express']).join(', ')}

Return ONLY this JSON:
{
  "frontendStructure": {
    "pages": ["ToolPage.jsx — main tool interface", "ResultPage.jsx — output display"],
    "components": ["InputForm.jsx", "ResultDisplay.jsx", "LoadingState.jsx"],
    "uiPattern": "single-page-tool",
    "stateManagement": "useState+useReducer",
    "responsiveNotes": "Mobile-first, Tailwind breakpoints sm/md/lg"
  },
  "backendStructure": {
    "endpoints": [
      { "method": "POST", "path": "/api/tools/${safeCategory}/process", "purpose": "Process user input via AI" }
    ],
    "services": ["ai.service.js", "validation.service.js"],
    "middleware": ["rateLimit", "inputSanitization", "responseCache"],
    "aiIntegration": "claude-haiku",
    "aiPromptStrategy": "Template prompt with {{fieldName}} substitution, 500 token response limit"
  },
  "databaseRequirements": {
    "newTablesNeeded": false,
    "tables": [],
    "caching": "in-memory TTL 5min",
    "indexes": "none required for simple tool"
  },
  "componentPlan": [
    "InputForm: validates user input, shows field errors, submits to API",
    "ResultDisplay: renders AI output with copy/download actions",
    "LoadingState: spinner with estimated time message"
  ],
  "apiRequirements": {
    "external": [],
    "internal": ["POST /api/tools/process — main processing endpoint"]
  },
  "scalingNotes": "Stateless handler — horizontal scaling via PM2 cluster or serverless",
  "securityConsiderations": [
    "Sanitize all input fields before AI prompt injection",
    "Rate limit: 10 requests/minute per IP",
    "Validate output before rendering (XSS prevention)",
    "Never expose API keys to frontend"
  ],
  "estimatedLinesOfCode": 450,
  "estimatedBuildTimeHours": 12,
  "mvpScope": "Single-input form, AI processing, result display with copy button",
  "phases": [
    {
      "phase": 1,
      "name": "MVP",
      "tasks": ["Input form + validation", "AI endpoint", "Result display", "Mobile styling"],
      "hours": 8
    },
    {
      "phase": 2,
      "name": "Enhancement",
      "tasks": ["History/saved results", "Premium tier", "SEO optimization", "Analytics"],
      "hours": 6
    }
  ],
  "reusableModules": ["PDFDropZone (if file input needed)", "ResultCard", "CopyButton"],
  "testingStrategy": "Unit tests for validation, integration test for AI endpoint, E2E for happy path"
}`;

  const startMs = Date.now();

  try {
    const raw       = await callOpenAI(userPrompt, {
      model:        'gpt-4o',
      max_tokens:   2048,
      systemPrompt: SYSTEM_PROMPT,
    });

    const blueprint    = parseJSONResponse(raw);
    const generationMs = Date.now() - startMs;

    log.info('Blueprint generated', { category: safeCategory, complexity, ms: generationMs });

    return {
      ...blueprint,
      generatedAt:   new Date().toISOString(),
      generationMs,
      toolPrompt:    safePrompt,
      category:      safeCategory,
    };
  } catch (err) {
    log.warn('Blueprint AI call failed, using structural fallback', { error: err.message });
    return _fallbackBlueprint(analysis, safePrompt, safeCategory);
  }
}

function _fallbackBlueprint(analysis, prompt, category) {
  const buildHours = analysis.estimatedBuildTimeHours || 16;

  return {
    frontendStructure: {
      pages:           [`${_pascalCase(category)}ToolPage.jsx`, 'ResultPage.jsx'],
      components:      ['InputForm.jsx', 'ResultDisplay.jsx', 'LoadingState.jsx', 'ErrorBoundary.jsx'],
      uiPattern:       'single-page-tool',
      stateManagement: 'useState + useCallback',
      responsiveNotes: 'Mobile-first with Tailwind responsive breakpoints',
    },
    backendStructure: {
      endpoints: [
        { method: 'POST', path: `/api/tools/${category}/process`, purpose: 'Process user input and return AI result' },
      ],
      services:         ['ai.service.js', 'tools.controller.js'],
      middleware:        ['rateLimit', 'inputSanitization'],
      aiIntegration:     analysis.requiresAI ? 'claude-haiku' : 'none',
      aiPromptStrategy:  'Template-based prompt with {{fieldName}} substitution from input_fields config',
    },
    databaseRequirements: {
      newTablesNeeded: false,
      tables:          [],
      caching:         'In-memory queryCache (5-min TTL)',
      indexes:         'usage_count index on tools (existing)',
    },
    componentPlan: [
      'InputForm: handles user input, field validation, submit to API',
      'ResultDisplay: renders AI output with copy/download actions',
      'LoadingState: animated spinner with progress message',
    ],
    apiRequirements: {
      external:  analysis.requiresExternalAPI ? ['External API: required for data processing'] : [],
      internal:  ['POST /api/tools/process — via DynamicToolPage engine'],
    },
    scalingNotes:           'Stateless tool handler — scales horizontally. AI calls are the bottleneck; mitigate with response caching.',
    securityConsiderations: [
      'Sanitize all input fields before AI prompt construction',
      'Rate limit: 10 requests/minute per IP (existing globalLimiter)',
      'Validate and escape AI output before rendering (XSS)',
      'Never expose ANTHROPIC_API_KEY to frontend',
    ],
    estimatedLinesOfCode:    analysis.complexityScore > 70 ? 2200 : analysis.complexityScore > 40 ? 900 : 420,
    estimatedBuildTimeHours: buildHours,
    mvpScope:                `Single-form AI tool that processes ${category} tasks — works within existing DynamicToolPage engine`,
    phases: [
      { phase: 1, name: 'MVP',         tasks: ['Input form', 'AI prompt config', 'Result display', 'Mobile styling'],              hours: Math.ceil(buildHours * 0.60) },
      { phase: 2, name: 'Enhancement', tasks: ['Analytics', 'Premium features', 'SEO metadata', 'Share/export functionality'],     hours: Math.ceil(buildHours * 0.40) },
    ],
    reusableModules:   ['ToolCard', 'InfiniteScrollSentinel', 'LoadingSkeleton'],
    testingStrategy:   'Input validation unit tests + API integration test + browser smoke test',
    generatedAt:       new Date().toISOString(),
    generationMs:      Date.now() - (Date.now()),
    toolPrompt:        prompt,
    category,
    _fallback:         true,
  };
}

function _pascalCase(str) {
  return String(str).replace(/(^\w|-\w)/g, c => c.replace('-', '').toUpperCase());
}

module.exports = { generate };
