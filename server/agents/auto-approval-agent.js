'use strict';

const supabase = require('../db/supabase');
const { generateToolConfig } = require('../services/ai-factory.service');

function getComplexity(inputFields) {
  const count = Array.isArray(inputFields) ? inputFields.length : 0;
  if (count <= 2) return { level: 'low', score: 90 };
  if (count <= 4) return { level: 'medium', score: 70 };
  return { level: 'high', score: 50 };
}

function slugify(value, fallbackId) {
  const base = String(value || 'tool')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${base || 'tool'}-${String(fallbackId).slice(0, 8)}`;
}

function approvalStatusFor(decision) {
  if (decision === 'auto_live') return 'auto_live';
  if (decision === 'review') return 'review';
  return 'rejected';
}

function pipelineStatusFor(decision) {
  if (decision === 'auto_live') return 'live';
  if (decision === 'review') return 'building';
  return 'killed';
}

async function fetchPipelineTool(toolId) {
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, description, status, idea_score, quality_score, saas_tool_id, idea_metadata')
    .eq('id', toolId)
    .maybeSingle();

  if (error) throw new Error(`tools lookup failed: ${error.message}`);
  return data || null;
}

async function fetchSaasTool(saasToolId) {
  if (!saasToolId) return null;

  const { data, error } = await supabase
    .from('saas_tools')
    .select('id, name, slug, description, input_fields, ai_prompt, category, price, is_free, is_published')
    .eq('id', saasToolId)
    .maybeSingle();

  if (error) throw new Error(`saas_tools lookup failed: ${error.message}`);
  return data || null;
}

async function fetchPipelineToolBySaasId(saasToolId) {
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, description, status, idea_score, quality_score, saas_tool_id, idea_metadata')
    .eq('saas_tool_id', saasToolId)
    .maybeSingle();

  if (error) throw new Error(`tools link lookup failed: ${error.message}`);
  return data || null;
}

async function createSaasToolForPipelineTool(tool) {
  const metadata = tool.idea_metadata || {};
  const category = metadata.category || metadata.target_audience || 'productivity';
  const idea = [
    tool.name,
    tool.description,
    metadata.problem_solved,
  ].filter(Boolean).join(': ');

  const generated = await generateToolConfig(category, idea || tool.name);
  const row = {
    name: generated.name || tool.name,
    slug: slugify(generated.slug || generated.name || tool.name, tool.id),
    description: generated.description || tool.description || '',
    category: generated.category || category,
    price: Number(generated.price || 0),
    is_free: generated.is_free ?? true,
    input_fields: Array.isArray(generated.input_fields) ? generated.input_fields : [],
    ai_prompt: generated.ai_prompt || '',
    is_published: false,
  };

  const { data, error } = await supabase
    .from('saas_tools')
    .insert(row)
    .select('id, name, slug, description, input_fields, ai_prompt, category, price, is_free, is_published')
    .single();

  if (error) throw new Error(`failed to create saas_tools row: ${error.message}`);
  return data;
}

async function ensureSaasToolLink(tool, existingSaasTool = null) {
  if (!tool) {
    return { pipelineTool: null, saasTool: existingSaasTool };
  }

  let saasTool = existingSaasTool;

  if (!saasTool && tool.saas_tool_id) {
    saasTool = await fetchSaasTool(tool.saas_tool_id);
  }

  if (!saasTool) {
    console.log('[AUTO APPROVAL] Linking tool -> saas_tool_id');
    saasTool = await createSaasToolForPipelineTool(tool);
  }

  if (tool.saas_tool_id !== saasTool.id) {
    console.log('[AUTO APPROVAL] Linking tool -> saas_tool_id');
    const { error } = await supabase
      .from('tools')
      .update({ saas_tool_id: saasTool.id })
      .eq('id', tool.id);

    if (error) throw new Error(`failed to store tools.saas_tool_id: ${error.message}`);
    tool.saas_tool_id = saasTool.id;
  }

  return { pipelineTool: tool, saasTool };
}

async function resolveToolRecords(toolId) {
  const pipelineTool = await fetchPipelineTool(toolId);
  if (pipelineTool) {
    return ensureSaasToolLink(pipelineTool);
  }

  const saasTool = await fetchSaasTool(toolId);
  if (!saasTool) {
    throw new Error(`Tool not found in tools or saas_tools: ${toolId}`);
  }

  const linkedPipelineTool = await fetchPipelineToolBySaasId(saasTool.id);
  return ensureSaasToolLink(linkedPipelineTool, saasTool);
}

async function publishLinkedTool(pipelineTool, saasTool, qualityScore) {
  if (!pipelineTool) {
    throw new Error('Cannot publish saas_tools without a linked tools row');
  }

  const { error: saasErr } = await supabase
    .from('saas_tools')
    .update({
      quality_score: qualityScore,
      approval_status: 'auto_live',
      is_published: true,
    })
    .eq('id', saasTool.id);

  if (saasErr) throw new Error(`failed to publish saas_tools row: ${saasErr.message}`);

  const { error: toolErr } = await supabase
    .from('tools')
    .update({
      saas_tool_id: saasTool.id,
      quality_score: qualityScore,
      approval_status: 'auto_live',
      status: 'live',
    })
    .eq('id', pipelineTool.id)
    .not('saas_tool_id', 'is', null);

  if (toolErr) throw new Error(`failed to publish tools row: ${toolErr.message}`);
  console.log('[AUTO APPROVAL] Tool published successfully');
}

async function updateNonLiveDecision(pipelineTool, saasTool, decision, qualityScore) {
  const approvalStatus = approvalStatusFor(decision);

  if (saasTool) {
    const { error } = await supabase
      .from('saas_tools')
      .update({
        quality_score: qualityScore,
        approval_status: approvalStatus,
        is_published: false,
      })
      .eq('id', saasTool.id);

    if (error) {
      console.error(`[AUTO APPROVAL] saas_tools update failed for ${saasTool.id}: ${error.message}`);
    }
  }

  if (pipelineTool) {
    const { error } = await supabase
      .from('tools')
      .update({
        quality_score: qualityScore,
        approval_status: approvalStatus,
        status: pipelineStatusFor(decision),
      })
      .eq('id', pipelineTool.id);

    if (error) {
      console.error(`[AUTO APPROVAL] tools update failed for ${pipelineTool.id}: ${error.message}`);
    }
  }
}

/**
 * Evaluate a tool's quality and keep tools.saas_tool_id as the only bridge.
 *
 * The input ID may be either tools.id or an already-created saas_tools.id.
 * Publishing is only allowed after a concrete tools -> saas_tools ID link exists.
 */
async function evaluateTool(toolId, testScore) {
  try {
    const { pipelineTool, saasTool } = await resolveToolRecords(toolId);
    const scoringTool = saasTool || pipelineTool;

    if (!scoringTool) throw new Error(`Tool not found: ${toolId}`);

    const { level: complexity, score: complexityScore } = getComplexity(scoringTool.input_fields);
    const ideaScore = pipelineTool && pipelineTool.idea_score != null
      ? Number(pipelineTool.idea_score)
      : null;

    const qualityScore = ideaScore != null
      ? Math.round((ideaScore + testScore + complexityScore) / 3)
      : Math.round((testScore + complexityScore) / 2);

    let decision;
    if (qualityScore >= 80 && complexity === 'low') {
      decision = 'auto_live';
    } else if (qualityScore >= 60) {
      decision = 'review';
    } else {
      decision = 'rejected';
    }

    console.log(
      `[AUTO APPROVAL] Tool: ${scoringTool.name} | Complexity: ${complexity}` +
      ` | Score: ${qualityScore} | Decision: ${decision}`
    );

    if (decision === 'auto_live') {
      await publishLinkedTool(pipelineTool, saasTool, qualityScore);
    } else {
      await updateNonLiveDecision(pipelineTool, saasTool, decision, qualityScore);
    }

    return {
      tool_id: pipelineTool?.id || toolId,
      saas_tool_id: saasTool?.id || null,
      tool_name: scoringTool.name,
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

module.exports = {
  evaluateTool,
  ensureSaasToolLink,
};
