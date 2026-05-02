'use strict';

const supabase = require('../db/supabase');

/**
 * Test a saas_tools config for completeness and prompt quality.
 *
 * TEST 1 — Config Completeness (api_ok):
 *   name, slug, ai_prompt, input_fields (array >0), category — all required
 *
 * TEST 2 — Prompt Quality (ui_ok):
 *   ai_prompt.length > 50, has {{variable}} pattern,
 *   every input_fields[].name appears as {{name}} in the prompt
 *
 * SCORING: api_ok → +50, ui_ok → +50  (0-100)
 * STATUS:  >=80 → pass | >=50 → partial | <50 → fail
 *
 * Saves result to tool_tests and updates saas_tools.quality_score.
 * Never throws — returns { test_score: 0, status: 'fail' } on any error.
 */
async function testTool(toolId) {
  try {
    const { data: tool, error: fetchErr } = await supabase
      .from('saas_tools')
      .select('id, name, slug, ai_prompt, input_fields, category')
      .eq('id', toolId)
      .single();

    if (fetchErr || !tool) {
      throw new Error(fetchErr ? fetchErr.message : `Tool not found: ${toolId}`);
    }

    // ── TEST 1: Config completeness ───────────────────────────
    const hasName        = typeof tool.name === 'string' && tool.name.trim().length > 0;
    const hasSlug        = typeof tool.slug === 'string' && tool.slug.trim().length > 0;
    const hasPrompt      = typeof tool.ai_prompt === 'string' && tool.ai_prompt.trim().length > 0;
    const hasInputFields = Array.isArray(tool.input_fields) && tool.input_fields.length > 0;
    const hasCategory    = typeof tool.category === 'string' && tool.category.trim().length > 0;
    const api_ok         = hasName && hasSlug && hasPrompt && hasInputFields && hasCategory;

    // ── TEST 2: Prompt quality ────────────────────────────────
    let promptLong        = false;
    let hasVarPattern     = false;
    let allFieldsInPrompt = false;

    if (hasPrompt && hasInputFields) {
      promptLong        = tool.ai_prompt.length > 50;
      hasVarPattern     = /\{\{[^}]+\}\}/.test(tool.ai_prompt);
      allFieldsInPrompt = tool.input_fields.every(
        field => field.name && tool.ai_prompt.includes(`{{${field.name}}}`)
      );
    }
    const ui_ok = promptLong && hasVarPattern && allFieldsInPrompt;

    // ── Scoring ───────────────────────────────────────────────
    let test_score = 0;
    if (api_ok) test_score += 50;
    if (ui_ok)  test_score += 50;

    const status = test_score >= 80 ? 'pass'
                 : test_score >= 50 ? 'partial'
                 : 'fail';

    const result = {
      api_ok,
      ui_ok,
      details: {
        hasName,
        hasSlug,
        hasPrompt,
        hasInputFields,
        hasCategory,
        promptLength:   tool.ai_prompt ? tool.ai_prompt.length : 0,
        hasVarPattern,
        allFieldsInPrompt,
      },
    };

    // ── Persist to tool_tests ─────────────────────────────────
    const { error: insertErr } = await supabase.from('tool_tests').insert({
      tool_id: toolId,
      api_ok,
      ui_ok,
      test_score,
      status,
      result,
    });

    if (insertErr) {
      console.error(`[TESTING AGENT] Failed to save test result for ${toolId}: ${insertErr.message}`);
    }

    // ── Update saas_tools.quality_score ───────────────────────
    const { error: updateErr } = await supabase
      .from('saas_tools')
      .update({ quality_score: test_score })
      .eq('id', toolId);

    if (updateErr) {
      console.error(`[TESTING AGENT] Failed to update quality_score for ${toolId}: ${updateErr.message}`);
    }

    console.log(`[TESTING AGENT] Tool: ${tool.name} | Score: ${test_score} | Status: ${status}`);

    return { tool_id: toolId, tool_name: tool.name, api_ok, ui_ok, test_score, status, result };

  } catch (err) {
    console.error(`[TESTING AGENT] Error testing tool ${toolId}:`, err.message);
    return { tool_id: toolId, test_score: 0, status: 'fail', error: err.message };
  }
}

module.exports = { testTool };
