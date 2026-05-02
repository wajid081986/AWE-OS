'use strict';

const supabase = require('../db/supabase');

// ── Complexity thresholds ─────────────────────────────────────
// Based on number of input_fields — more fields = harder to maintain = lower base score.
function getComplexity(inputFields) {
  const count = Array.isArray(inputFields) ? inputFields.length : 0;
  if (count <= 2) return { level: 'low',    score: 90 };
  if (count <= 4) return { level: 'medium', score: 70 };
  return               { level: 'high',   score: 50 };
}

/**
 * Evaluate a tool's quality and apply the approval decision to BOTH tables.
 *
 * QUALITY SCORE:
 *   If tools.idea_score exists → avg(idea_score, test_score, complexity_score)
 *   Otherwise                  → avg(test_score, complexity_score)
 *
 * DECISION:
 *   quality >= 80 AND complexity == 'low' → auto_live  (publish immediately)
 *   quality >= 60                         → review     (human review needed)
 *   else                                  → rejected
 *
 * Updates saas_tools AND tools (pipeline) on every decision.
 * Never throws — returns { decision: 'review' } on any error.
 *
 * @param {string} toolId  — saas_tools.id
 * @param {number} testScore — 0-100 from testing-agent
 */
async function evaluateTool(toolId, testScore) {
  try {
    // ── Fetch saas_tools record ───────────────────────────────
    const { data: saas, error: saasErr } = await supabase
      .from('saas_tools')
      .select('id, name, slug, input_fields, category')
      .eq('id', toolId)
      .single();

    if (saasErr || !saas) {
      throw new Error(saasErr ? saasErr.message : `saas_tools not found: ${toolId}`);
    }

    // ── Fetch matching pipeline tools record (by name) ────────
    const { data: pipelineTool } = await supabase
      .from('tools')
      .select('id, name, idea_score, quality_score')
      .ilike('name', saas.name)
      .maybeSingle();

    // ── Complexity ────────────────────────────────────────────
    const { level: complexity, score: complexityScore } = getComplexity(saas.input_fields);

    // ── Quality score ─────────────────────────────────────────
    const ideaScore = pipelineTool && pipelineTool.idea_score != null
      ? Number(pipelineTool.idea_score)
      : null;

    const qualityScore = ideaScore != null
      ? Math.round((ideaScore + testScore + complexityScore) / 3)
      : Math.round((testScore + complexityScore) / 2);

    // ── Decision ──────────────────────────────────────────────
    let decision;
    if (qualityScore >= 80 && complexity === 'low') {
      decision = 'auto_live';
    } else if (qualityScore >= 60) {
      decision = 'review';
    } else {
      decision = 'rejected';
    }

    console.log(
      `[AUTO APPROVAL] Tool: ${saas.name} | Complexity: ${complexity}` +
      ` | Score: ${qualityScore} | Decision: ${decision}`
    );

    // ── Update saas_tools ─────────────────────────────────────
    const saasUpdate = {
      quality_score:   qualityScore,
      approval_status: decision === 'auto_live' ? 'auto_live'
                     : decision === 'review'    ? 'review'
                     : 'rejected',
      is_published: decision === 'auto_live',
    };

    const { error: saasUpdateErr } = await supabase
      .from('saas_tools')
      .update(saasUpdate)
      .eq('id', toolId);

    if (saasUpdateErr) {
      console.error(`[AUTO APPROVAL] saas_tools update failed for ${toolId}: ${saasUpdateErr.message}`);
    }

    // ── Update tools (pipeline) ───────────────────────────────
    if (pipelineTool) {
      const toolsUpdate = {
        quality_score:   qualityScore,
        approval_status: decision === 'auto_live' ? 'auto_live'
                       : decision === 'review'    ? 'review'
                       : 'rejected',
        status: decision === 'auto_live' ? 'live'
              : decision === 'review'    ? 'building'
              : 'killed',
      };

      const { error: toolsUpdateErr } = await supabase
        .from('tools')
        .update(toolsUpdate)
        .eq('id', pipelineTool.id);

      if (toolsUpdateErr) {
        console.error(`[AUTO APPROVAL] tools update failed for ${pipelineTool.id}: ${toolsUpdateErr.message}`);
      }
    } else {
      console.log(`[AUTO APPROVAL] No pipeline tools record found for "${saas.name}" — skipping tools table update`);
    }

    return {
      tool_id:      toolId,
      tool_name:    saas.name,
      complexity,
      complexityScore,
      ideaScore,
      testScore,
      qualityScore,
      decision,
    };

  } catch (err) {
    console.error(`[AUTO APPROVAL] Error evaluating tool ${toolId}:`, err.message);
    return { tool_id: toolId, decision: 'review', error: err.message };
  }
}

module.exports = { evaluateTool };
