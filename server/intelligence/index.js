'use strict';

/**
 * AWE-OS — Intelligence Layer Bootstrap                       Phase 6A
 *
 * Orchestrates the full tool intelligence pipeline.
 *
 * Fast pipeline (~2-4s): analyze + duplicate check + monetization + SEO + score
 * Heavy blueprint (~5-10s): separate call using Claude Sonnet
 *
 * Usage:
 *   const { runIntelligencePipeline, generateBlueprint } = require('./intelligence');
 *   const report    = await runIntelligencePipeline('social media caption writer', 'writing', userId);
 *   const blueprint = await generateBlueprint('social media caption writer', 'writing', report.analysis);
 */

const ToolIdeaAnalyzer           = require('./ToolIdeaAnalyzer');
const ToolBlueprintGenerator     = require('./ToolBlueprintGenerator');
const MonetizationIntelligence   = require('./MonetizationIntelligence');
const SEOIntelligence            = require('./SEOIntelligence');
const DuplicateDetectionEngine   = require('./DuplicateDetectionEngine');
const ToolScoringEngine          = require('./ToolScoringEngine');
const HistoricalIntelligenceEngine = require('./HistoricalIntelligenceEngine');
const { createLogger }           = require('../monitoring/logger');

const log = createLogger('intelligence');

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../db/supabase');
  return _supabase;
}

/**
 * Run the full intelligence pipeline for a tool idea.
 *
 * Steps:
 *   1. Analyze idea   + detect duplicates   (parallel — 1 AI call + 1 DB query)
 *   2. Build monetization + SEO + historical (parallel — all algorithmic/DB)
 *   3. Score all signals                     (algorithmic)
 *   4. Persist result to DB                  (fire-and-forget)
 *
 * @param {string}  prompt   - Tool idea description
 * @param {string}  category - Tool category
 * @param {string}  [userId] - Optional user ID for attribution
 * @returns {Promise<{analysis, monetization, seo, score, duplicateCheck, historical, pipelineMs, ideaId}>}
 */
async function runIntelligencePipeline(prompt, category, userId = null) {
  const start = Date.now();
  log.info('Intelligence pipeline started', { category, promptLen: (prompt || '').length });

  // Step 1 — AI analysis + DB duplicate check (parallel)
  const [analysis, duplicateCheck] = await Promise.all([
    ToolIdeaAnalyzer.analyze(prompt, category),
    DuplicateDetectionEngine.detect(prompt, category),
  ]);

  // Step 2 — Derived intelligence (all fast, no AI calls)
  const [monetization, seo, historical] = await Promise.all([
    Promise.resolve(MonetizationIntelligence.estimate(analysis)),
    Promise.resolve(SEOIntelligence.buildReport(analysis)),
    HistoricalIntelligenceEngine.getPatterns(category),
  ]);

  // Step 3 — Composite score
  const scoring = ToolScoringEngine.score({ analysis, monetization, seo, duplicateCheck });

  const pipelineMs = Date.now() - start;
  log.info('Intelligence pipeline complete', {
    score:        scoring.overallScore,
    grade:        scoring.grade,
    launchRec:    scoring.launchRecommendation,
    ms:           pipelineMs,
  });

  // Step 4 — Persist (non-blocking, don't await)
  let ideaIdPromise = null;
  try {
    ideaIdPromise = _persistIntelligence({ prompt, category, analysis, monetization, seo, scoring, duplicateCheck, userId, pipelineMs });
  } catch (_) {}

  // Resolve ideaId without blocking the response
  let ideaId = null;
  if (ideaIdPromise) {
    ideaIdPromise
      .then(id => { ideaId = id; })
      .catch(err => log.warn('Persist failed (non-fatal)', { error: err.message }));
  }

  return { analysis, monetization, seo, score: scoring, duplicateCheck, historical, pipelineMs };
}

/**
 * Generate a full implementation blueprint (heavier call — separate endpoint).
 *
 * @param {string}  prompt    - Tool idea description
 * @param {string}  category  - Tool category
 * @param {object}  [analysis]- Optional pre-computed analysis
 * @param {string}  [ideaId]  - Optional idea ID to update with blueprint
 * @returns {Promise<object>} Blueprint object
 */
async function generateBlueprint(prompt, category, analysis = null, ideaId = null) {
  const resolvedAnalysis = analysis || await ToolIdeaAnalyzer.analyze(prompt, category);
  const blueprint        = await ToolBlueprintGenerator.generate(resolvedAnalysis, prompt, category);

  // Attach blueprint to the idea record if we have its ID
  if (ideaId) {
    db().from('generated_tool_ideas')
      .update({ blueprint_json: blueprint, updated_at: new Date().toISOString() })
      .eq('id', ideaId)
      .then(() => {})
      .catch(err => log.warn('Blueprint attach failed', { error: err.message }));
  }

  return blueprint;
}

/**
 * Get historical category intelligence patterns.
 *
 * @param {string} [category]
 * @returns {Promise<object>}
 */
async function getHistoricalPatterns(category) {
  return HistoricalIntelligenceEngine.getPatterns(category || 'all');
}

/**
 * Record user feedback on a generated idea (approved / rejected).
 * Updates the intelligence history and invalidates the historical cache.
 *
 * @param {string} ideaId
 * @param {object} feedback  - { approved, toolBuilt, outcome, notes }
 */
async function recordFeedback(ideaId, feedback) {
  try {
    const { approved, toolBuilt, outcome, notes } = feedback || {};

    await db().from('tool_intelligence_history').insert({
      idea_id:            ideaId,
      event_type:         approved ? (toolBuilt ? 'built' : 'approved') : 'rejected',
      outcome:            outcome  || (approved ? 'success' : 'rejected'),
      metadata:           { notes, toolBuilt, approvedAt: new Date().toISOString() },
    });

    await db().from('generated_tool_ideas')
      .update({ approved: !!approved, updated_at: new Date().toISOString() })
      .eq('id', ideaId);

    HistoricalIntelligenceEngine.invalidateCache();
    log.info('Feedback recorded', { ideaId, approved });
  } catch (err) {
    log.warn('recordFeedback failed', { error: err.message });
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _persistIntelligence({ prompt, category, analysis, monetization, seo, scoring, duplicateCheck, userId, pipelineMs }) {
  try {
    const { data: idea, error } = await db().from('generated_tool_ideas').insert({
      title:                analysis.primaryKeyword || String(prompt || category).slice(0, 100),
      prompt:               String(prompt || '').slice(0, 500),
      category:             analysis.detectedCategory || category,
      seo_score:            seo.opportunityScore    || 0,
      monetization_score:   monetization.monetizationScore || 0,
      complexity_score:     analysis.complexityScore    || 0,
      overall_score:        scoring.overallScore         || 0,
      blueprint_json:       null,
      analysis_json:        { analysis, monetization, seo, duplicateCheck },
      launch_recommendation: scoring.launchRecommendation,
      approved:             false,
      created_by:           userId || null,
    }).select('id').single();

    if (error) throw new Error(error.message);

    // Log to intelligence history
    await db().from('tool_intelligence_history').insert({
      idea_id:            idea.id,
      event_type:         'analyzed',
      category:           analysis.detectedCategory || category,
      complexity:         analysis.complexity,
      seo_score:          seo.opportunityScore      || 0,
      monetization_score: monetization.monetizationScore || 0,
      outcome:            'pending',
      metadata:           { pipelineMs, confidence: analysis.confidence, grade: scoring.grade },
    });

    return idea.id;
  } catch (err) {
    // non-fatal — table may not exist yet in dev environment
    log.warn('_persistIntelligence failed (non-fatal)', { error: err.message });
    return null;
  }
}

module.exports = {
  // Pipeline orchestration
  runIntelligencePipeline,
  generateBlueprint,
  getHistoricalPatterns,
  recordFeedback,

  // Individual modules (for direct import if needed)
  ToolIdeaAnalyzer,
  ToolBlueprintGenerator,
  MonetizationIntelligence,
  SEOIntelligence,
  DuplicateDetectionEngine,
  ToolScoringEngine,
  HistoricalIntelligenceEngine,
};
