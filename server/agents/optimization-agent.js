const supabase         = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

const VALID_STATUSES = ['live', 'scaling'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── analyzeTool ─────────────────────────────────────────────────────────────

async function analyzeTool(tool_id) {
  try {
    console.log(`[OPT AGENT] analyzeTool started for tool_id: ${tool_id}`);

    // Fetch tool
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('id, name, description, status, usage_count, conversion_rate, revenue')
      .eq('id', tool_id)
      .single();

    if (toolErr || !tool) {
      const err = new Error(`Tool not found: ${tool_id}`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!VALID_STATUSES.includes(tool.status)) {
      const err = new Error(
        `Tool "${tool.name}" has status "${tool.status}". Only live/scaling tools can be analyzed.`
      );
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // Fetch event counts last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsErr } = await supabase
      .from('tool_events')
      .select('event_type')
      .eq('tool_id', tool_id)
      .gte('created_at', since);

    if (eventsErr) {
      console.error('[OPT AGENT] Failed to fetch events:', eventsErr.message);
    }

    const eventCounts = (events || []).reduce((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {});

    const tool_viewed   = eventCounts['tool_viewed']  || 0;
    const tool_used     = eventCounts['tool_used']    || 0;
    const conversion    = tool.conversion_rate         || 0;
    const revenue       = tool.revenue                 || 0;

    // Build prompt
    const prompt = `You are a SaaS Growth Expert.
Analyze this tool and give optimization suggestions.

Tool: ${tool.name}
Description: ${tool.description || 'N/A'}
Views (30d): ${tool_viewed}
Uses (30d): ${tool_used}
Conversion Rate: ${conversion}%
Revenue: ₹${revenue}

Return ONLY this JSON:
{
  "landing_page": {
    "current_problem": "one line",
    "suggestions": [
      {
        "title": "short title",
        "problem": "what is wrong",
        "suggestion": "exact fix",
        "priority": "high|medium|low",
        "estimated_impact": "+X% conversion"
      }
    ]
  },
  "seo": { "current_problem": "one line", "suggestions": [] },
  "copy": { "current_problem": "one line", "suggestions": [] },
  "cta": { "current_problem": "one line", "suggestions": [] },
  "ux_flow": { "current_problem": "one line", "suggestions": [] },
  "overall_priority": "landing_page",
  "quick_win": "single best action today"
}`;

    console.log(`[OPT AGENT] Calling OpenAI for tool: ${tool.name}`);
    const rawResponse = await callOpenAI(prompt, { temperature: 0.4 });
    const parsed      = parseJSONResponse(rawResponse);

    // Determine top priority section and estimated impact
    const overallPriority  = parsed.overall_priority || 'landing_page';
    const topSection       = parsed[overallPriority] || {};
    const topSuggestion    = (topSection.suggestions || [])[0] || {};
    const estimatedImpact  = topSuggestion.estimated_impact || 'unknown';

    // Save to optimization_suggestions
    const { data: saved, error: saveErr } = await supabase
      .from('optimization_suggestions')
      .insert({
        tool_id,
        tool_name:         tool.name,
        optimization_type: overallPriority,
        current_state: {
          views:           tool_viewed,
          uses:            tool_used,
          conversion_rate: conversion,
          revenue,
        },
        suggestions:       parsed,
        priority:          topSuggestion.priority || 'medium',
        estimated_impact:  estimatedImpact,
        status:            'pending',
      })
      .select()
      .single();

    if (saveErr) {
      console.error('[OPT AGENT] Failed to save suggestion:', saveErr.message);
      throw new Error('Failed to save optimization suggestion');
    }

    console.log(`[OPT AGENT] Analysis saved for tool: ${tool.name} (id: ${saved.id})`);

    return {
      suggestion_id:    saved.id,
      tool_id,
      tool_name:        tool.name,
      overall_priority: overallPriority,
      quick_win:        parsed.quick_win || null,
      estimated_impact: estimatedImpact,
    };
  } catch (err) {
    if (!err.code) {
      console.error('[OPT AGENT] analyzeTool unexpected error:', err.message);
    }
    throw err;
  }
}

// ─── getSuggestions ───────────────────────────────────────────────────────────

async function getSuggestions(tool_id, filters = {}) {
  try {
    console.log(`[OPT AGENT] getSuggestions for tool_id: ${tool_id}`, filters);

    let query = supabase
      .from('optimization_suggestions')
      .select('*')
      .eq('tool_id', tool_id)
      .order('priority', { ascending: true }); // high sorts before low alphabetically — use custom below

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.optimization_type) {
      query = query.eq('optimization_type', filters.optimization_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[OPT AGENT] getSuggestions error:', error.message);
      throw new Error('Failed to fetch optimization suggestions');
    }

    // Sort: high → medium → low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = (data || []).sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    );

    console.log(`[OPT AGENT] Returning ${sorted.length} suggestions for tool_id: ${tool_id}`);
    return sorted;
  } catch (err) {
    console.error('[OPT AGENT] getSuggestions unexpected error:', err.message);
    throw err;
  }
}

// ─── applySuggestion ──────────────────────────────────────────────────────────

async function applySuggestion(suggestion_id, notes) {
  try {
    console.log(`[OPT AGENT] applySuggestion id: ${suggestion_id}`);

    const updatePayload = { status: 'applied' };
    if (notes) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('optimization_suggestions')
      .update(updatePayload)
      .eq('id', suggestion_id)
      .select()
      .single();

    if (error) {
      console.error('[OPT AGENT] applySuggestion error:', error.message);
      throw new Error('Failed to apply suggestion');
    }

    console.log(`[OPT AGENT] Suggestion ${suggestion_id} marked as applied`);
    return data;
  } catch (err) {
    console.error('[OPT AGENT] applySuggestion unexpected error:', err.message);
    throw err;
  }
}

// ─── dismissSuggestion ────────────────────────────────────────────────────────

async function dismissSuggestion(suggestion_id, notes) {
  try {
    console.log(`[OPT AGENT] dismissSuggestion id: ${suggestion_id}`);

    const updatePayload = { status: 'dismissed' };
    if (notes) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('optimization_suggestions')
      .update(updatePayload)
      .eq('id', suggestion_id)
      .select()
      .single();

    if (error) {
      console.error('[OPT AGENT] dismissSuggestion error:', error.message);
      throw new Error('Failed to dismiss suggestion');
    }

    console.log(`[OPT AGENT] Suggestion ${suggestion_id} marked as dismissed`);
    return data;
  } catch (err) {
    console.error('[OPT AGENT] dismissSuggestion unexpected error:', err.message);
    throw err;
  }
}

// ─── analyzeAllLiveTools ──────────────────────────────────────────────────────

async function analyzeAllLiveTools() {
  try {
    console.log('[OPT AGENT] analyzeAllLiveTools started');

    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, name, status')
      .in('status', ['live', 'scaling']);

    if (error) {
      console.error('[OPT AGENT] Failed to fetch live tools:', error.message);
      throw new Error('Failed to fetch live tools');
    }

    console.log(`[OPT AGENT] Found ${tools.length} live/scaling tools`);

    const results   = [];
    const failures  = [];

    for (const tool of tools) {
      try {
        console.log(`[OPT AGENT] Analyzing tool: ${tool.name} (${tool.id})`);
        const summary = await analyzeTool(tool.id);
        results.push(summary);
      } catch (err) {
        console.error(`[OPT AGENT] Failed to analyze tool ${tool.id}:`, err.message);
        failures.push({ tool_id: tool.id, tool_name: tool.name, error: err.message });
      }

      await sleep(2000);
    }

    console.log(
      `[OPT AGENT] analyzeAllLiveTools complete. Success: ${results.length}, Failed: ${failures.length}`
    );

    return {
      total:    tools.length,
      analyzed: results.length,
      failed:   failures.length,
      results,
      failures,
    };
  } catch (err) {
    console.error('[OPT AGENT] analyzeAllLiveTools unexpected error:', err.message);
    throw err;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  analyzeTool,
  getSuggestions,
  applySuggestion,
  dismissSuggestion,
  analyzeAllLiveTools,
};
