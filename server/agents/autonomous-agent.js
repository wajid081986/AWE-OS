const { v4: uuidv4 }         = require('uuid');
const supabase               = require('../db/supabase');
const { applyRules }         = require('./decision-engine');
const { generateToolConfig } = require('../services/ai-factory.service');

// ── Safety constants ──────────────────────────────────────────
const MAX_TOOLS_PER_RUN  = 10;   // hard cap — never process more than this
const TOOL_DELAY_MS      = 1000; // 1s between tools — avoid OpenAI rate limits
const MAX_RUNS_PER_DAY   = 10;   // combined cron + manual limit

// ── In-process run lock ───────────────────────────────────────
// Prevents overlapping executions if a cron fires while a run is still active.
// Reset unconditionally in finally{} — no path can leave this true permanently.
let isRunning = false;

// ── Per-tool processing lock ──────────────────────────────────
// Prevents two concurrent calls from picking up the same tool.
const processingTools = new Set();

// ── Helpers ───────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Insert one row into autonomous_logs.
 * Never throws — a logging failure must never abort the agent loop.
 */
async function logAction({
  tool_id, tool_name, action,
  decision    = null,
  status_before = null,
  status_after  = null,
  notes         = null,
  is_auto_executed = false,
}) {
  try {
    const { error } = await supabase.from('autonomous_logs').insert({
      tool_id, tool_name, action,
      decision, status_before, status_after,
      notes, is_auto_executed,
    });
    if (error) console.error('[AUTONOMOUS AGENT] logAction DB error:', error.message);
  } catch (err) {
    console.error('[AUTONOMOUS AGENT] logAction unexpected error:', err.message);
  }
}

/**
 * Insert one row into factory_jobs.
 * Never throws — a logging failure must never abort the agent loop.
 */
async function logFactoryJob({ status, category, input_prompt, generated_tool_id, error_message }) {
  try {
    await supabase.from('factory_jobs').insert({
      status,
      category:          category          || null,
      input_prompt:      input_prompt      || null,
      generated_tool_id: generated_tool_id || null,
      error_message:     error_message     || null,
      completed_at:      new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AUTONOMOUS AGENT] logFactoryJob error:', err.message);
  }
}

/**
 * Count how many autonomous runs have completed in the last 24 hours.
 * Returns a number; returns MAX_RUNS_PER_DAY on DB error (fail-safe).
 */
async function getRunsToday() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('autonomous_runs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', since);

    if (error) {
      console.error('[AUTONOMOUS AGENT] getRunsToday error:', error.message);
      return MAX_RUNS_PER_DAY; // fail-safe: deny run
    }
    return count ?? 0;
  } catch (err) {
    console.error('[AUTONOMOUS AGENT] getRunsToday unexpected error:', err.message);
    return MAX_RUNS_PER_DAY;
  }
}

/**
 * Persist a run record and return its id.
 * Returns a placeholder id on failure so the run can continue.
 */
async function createRunRecord(triggered_by = 'cron') {
  try {
    const { data, error } = await supabase
      .from('autonomous_runs')
      .insert({ triggered_by, started_at: new Date().toISOString() })
      .select('id')
      .single();
    if (error) {
      console.error('[AUTONOMOUS AGENT] createRunRecord error:', error.message);
      return uuidv4(); // use an in-memory id — non-fatal
    }
    return data.id;
  } catch (err) {
    console.error('[AUTONOMOUS AGENT] createRunRecord unexpected error:', err.message);
    return uuidv4();
  }
}

/**
 * Update run record with final counters once the loop finishes.
 */
async function finaliseRunRecord(run_id, summary) {
  try {
    const { error } = await supabase
      .from('autonomous_runs')
      .update({
        tools_processed:   summary.tools_processed,
        tools_skipped:     summary.tools_skipped,
        plans_generated:   summary.actions_taken.plans_generated,
        scaled:            summary.actions_taken.scaled,
        improve_suggested: summary.actions_taken.improve_suggested,
        kill_flagged:      summary.actions_taken.kill_flagged,
        observed:          summary.actions_taken.observed,
        errors:            summary.actions_taken.errors,
        duration_ms:       summary.duration_ms,
        completed_at:      summary.completed_at,
      })
      .eq('id', run_id);

    if (error) console.error('[AUTONOMOUS AGENT] finaliseRunRecord error:', error.message);
  } catch (err) {
    console.error('[AUTONOMOUS AGENT] finaliseRunRecord unexpected error:', err.message);
  }
}

// ── Core: process one tool ────────────────────────────────────

/**
 * Evaluate a single tool and take the appropriate safe action.
 *
 * Safety rules:
 *   - SCALE  → auto-update status to 'scaling' (safe: promotes revenue)
 *   - IMPROVE → log only, NO status change (requires human review)
 *   - KILL   → log only, NEVER auto-kill (requires human approval)
 *   - OBSERVE → log only, no change
 *
 * @param {{ id, name, status, updated_at }} tool
 * @returns {Promise<ProcessResult>}
 */
async function processOneTool(tool) {
  // ── Per-tool lock ─────────────────────────────────────────────
  if (processingTools.has(tool.id)) {
    return { skipped: true, reason: 'already_processing' };
  }
  processingTools.add(tool.id);

  console.log(`[AUTONOMOUS AGENT] Processing: ${tool.name} (status=${tool.status})`);

  try {
    // ────────────────────────────────────────────────────────────
    // BRANCH 1: idea → generate tool config via AI Factory
    // ────────────────────────────────────────────────────────────
    if (tool.status === 'idea') {
      // Tool already has a config — only check auto-publish eligibility
      if (tool.ai_prompt && tool.input_fields) {
        const shouldAutoPublish =
          tool.is_free === true ||
          Number(tool.price) === 0 ||
          tool.category === 'productivity';

        if (shouldAutoPublish) {
          const { error: publishErr } = await supabase
            .from('saas_tools')
            .update({ is_published: true })
            .eq('id', tool.id);

          if (publishErr) throw new Error(`Auto-publish failed: ${publishErr.message}`);

          await logAction({
            tool_id: tool.id, tool_name: tool.name,
            action:        'auto_published',
            status_before: 'idea',
            status_after:  'live',
            notes:         `Auto-published (is_free=${tool.is_free}, price=${tool.price}, category=${tool.category})`,
            is_auto_executed: true,
          });
          await supabase
            .from('factory_jobs')
            .insert({
              status:            'completed',
              category:          tool.category || 'general',
              input_prompt:      tool.description || tool.name,
              generated_tool_id: tool.id,
              ai_response:       { name: tool.name, slug: tool.slug, action: 'auto_published' },
              created_by:        null,
              completed_at:      new Date(),
            })
            .select()
            .single();
          console.log(`[AUTONOMOUS AGENT] Auto-published: ${tool.name}`);
          return { tool_id: tool.id, tool_name: tool.name, action_taken: 'auto_published' };
        }

        // Config exists but not eligible for auto-publish — wait for human review
        await logAction({
          tool_id: tool.id, tool_name: tool.name,
          action:  'awaiting_review',
          notes:   'Tool config ready — pending manual review before publish',
          is_auto_executed: false,
        });
        console.log(`[AUTONOMOUS AGENT] ${tool.name} → awaiting manual review`);
        return { skipped: true, reason: 'awaiting_review' };
      }

      // No config yet — generate via AI Factory
      let config;
      try {
        config = await generateToolConfig(
          tool.category    || 'productivity',
          tool.description || tool.name,
        );
      } catch (configErr) {
        await logFactoryJob({
          status:            'failed',
          category:          tool.category,
          input_prompt:      tool.description,
          generated_tool_id: tool.id,
          error_message:     configErr.message,
        });
        throw new Error(`generateToolConfig failed: ${configErr.message}`);
      }

      // Persist the generated config back into the saas_tool record
      const { error: updateErr } = await supabase
        .from('saas_tools')
        .update({
          ai_prompt:    config.ai_prompt,
          input_fields: config.input_fields,
          description:  config.description || tool.description,
        })
        .eq('id', tool.id);

      if (updateErr) {
        await logFactoryJob({ status: 'failed', category: tool.category, input_prompt: tool.description, generated_tool_id: tool.id, error_message: updateErr.message });
        throw new Error(`Failed to save tool config: ${updateErr.message}`);
      }

      await logAction({
        tool_id: tool.id, tool_name: tool.name,
        action:        'config_generated',
        status_before: 'idea',
        status_after:  'idea',
        notes:         'Tool config generated via AI Factory — pending auto-publish check on next run',
        is_auto_executed: true,
      });
      await logFactoryJob({ status: 'completed', category: tool.category, input_prompt: tool.description, generated_tool_id: tool.id });
      console.log(`[AUTONOMOUS AGENT] Tool config generated: ${tool.name}`);
      return { tool_id: tool.id, tool_name: tool.name, action_taken: 'config_generated' };
    }

    // ────────────────────────────────────────────────────────────
    // BRANCH 2: live → evaluate performance metrics + decide
    // Metrics pulled from tool_usage_events + revenue_logs directly
    // (decision-engine.evaluateTool reads from 'tools' table, not saas_tools)
    // ────────────────────────────────────────────────────────────
    if (tool.status === 'live') {
      // Gather performance data in parallel
      const [usageRes, revenueRes] = await Promise.all([
        supabase
          .from('tool_usage_events')
          .select('*', { count: 'exact', head: true })
          .eq('tool_slug', tool.slug),
        supabase
          .from('revenue_logs')
          .select('amount')
          .eq('tool_slug', tool.slug),
      ]);

      const usageCount = usageRes.count || 0;
      const revenue    = (revenueRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0);

      const metrics  = { usage_count: usageCount, conversion_rate: 0, revenue };
      const { decision, reason, recommended_action } = applyRules(metrics);

      console.log(`[AUTONOMOUS AGENT] Decision: ${decision} → Action: ${getActionLabel(decision)}`);

      // Persist decision log (non-blocking)
      supabase.from('decision_logs').insert({
        tool_id:          tool.id,
        decision,
        reason,
        recommended_action,
        metrics_snapshot: metrics,
        dry_run:          false,
      }).then(({ error }) => {
        if (error) console.error('[AUTONOMOUS AGENT] decision_log write error:', error.message);
      });

      if (decision === 'scale') {
        // High-revenue tool — log as confirmed high performer (already live, no status change needed)
        await logAction({
          tool_id:          tool.id,
          tool_name:        tool.name,
          action:           'status_updated',
          decision:         'scale',
          status_before:    'live',
          status_after:     'live',
          notes:            reason,
          is_auto_executed: true,
        });
        return { tool_id: tool.id, decision: 'scale', action_taken: 'status_updated' };
      }

      if (decision === 'improve') {
        // LOG ONLY — human must review and implement improvements
        await logAction({
          tool_id:          tool.id,
          tool_name:        tool.name,
          action:           'improvement_suggested',
          decision:         'improve',
          status_before:    tool.status,
          notes:            recommended_action,
          is_auto_executed: false,
        });
        return { tool_id: tool.id, decision: 'improve', action_taken: 'improvement_suggested' };
      }

      if (decision === 'kill') {
        // LOG ONLY — killing a tool requires human approval
        await logAction({
          tool_id:          tool.id,
          tool_name:        tool.name,
          action:           'kill_flagged',
          decision:         'kill',
          status_before:    tool.status,
          notes:            'Requires human approval before unpublishing. Reason: ' + reason,
          is_auto_executed: false,
        });
        return { tool_id: tool.id, decision: 'kill', action_taken: 'kill_flagged' };
      }

      // decision === 'observe' (default)
      await logAction({
        tool_id:          tool.id,
        tool_name:        tool.name,
        action:           'observation_logged',
        decision:         'observe',
        status_before:    tool.status,
        notes:            reason,
        is_auto_executed: false,
      });
      return { tool_id: tool.id, decision: 'observe', action_taken: 'observation_logged' };
    }

    // ────────────────────────────────────────────────────────────
    // BRANCH 3: any other status (building / scaling / killed)
    // → silent skip, no log entry to avoid noise
    // ────────────────────────────────────────────────────────────
    return { skipped: true, reason: `status=${tool.status}` };

  } finally {
    processingTools.delete(tool.id);
  }
}

function getActionLabel(decision) {
  const map = {
    scale:   'auto-update status → scaling',
    improve: 'log suggestion (human review required)',
    kill:    'flag for human approval (no auto-kill)',
    observe: 'log observation (no change)',
  };
  return map[decision] || 'unknown';
}

// ── Core: run the full autonomous loop ───────────────────────

/**
 * Run the autonomous agent across all actionable tools.
 *
 * Priority order: live tools are processed before idea tools
 * so revenue-generating tools get evaluated first.
 *
 * @param {{ limit?: number, triggered_by?: string }} options
 * @returns {Promise<LoopSummary>}
 */
async function runAutonomousLoop({ limit = MAX_TOOLS_PER_RUN, triggered_by = 'cron' } = {}) {
  // ── Guard: overlap lock ───────────────────────────────────────
  if (isRunning) {
    const msg = 'runAutonomousLoop called while already running — aborting';
    console.warn(`[AUTONOMOUS AGENT] ${msg}`);
    await logAction({ tool_id: null, tool_name: null, action: 'skipped', notes: msg });
    return { skipped: true, reason: 'already_running' };
  }

  // Set lock IMMEDIATELY before any await to prevent race condition
  isRunning = true;

  // ── Guard: daily run limit ────────────────────────────────────
  const runsToday = await getRunsToday();
  if (runsToday >= MAX_RUNS_PER_DAY) {
    const msg = `Daily run limit reached (${runsToday}/${MAX_RUNS_PER_DAY}) — aborting`;
    console.warn(`[AUTONOMOUS AGENT] ${msg}`);
    await logAction({ tool_id: null, tool_name: null, action: 'skipped', notes: msg });
    isRunning = false;
    return { skipped: true, reason: 'daily_limit_reached' };
  }
  const safeLimit  = Math.min(Number(limit) || MAX_TOOLS_PER_RUN, MAX_TOOLS_PER_RUN);
  const startedAt  = new Date();
  const runId      = await createRunRecord(triggered_by);

  console.log(`[AUTONOMOUS AGENT] Loop starting | run_id=${runId} | limit=${safeLimit}`);

  const actions = {
    plans_generated:   0,
    scaled:            0,
    improve_suggested: 0,
    kill_flagged:      0,
    observed:          0,
    errors:            0,
  };
  let toolsProcessed = 0;
  let toolsSkipped   = 0;

  try {
    // ── Fetch: published (live) first, then unpublished (idea) ──────
    const { data: rawTools, error: fetchErr } = await supabase
      .from('saas_tools')
      .select('id, name, slug, is_published, updated_at, ai_prompt, input_fields, category, description, is_free, price')
      .order('is_published', { ascending: false }) // true (published/live) first
      .order('updated_at',   { ascending: true  }) // oldest first within each group
      .limit(safeLimit);

    if (fetchErr) {
      const err = new Error(`Failed to fetch tools: ${fetchErr.message}`);
      console.error('[AUTONOMOUS AGENT]', err.message);
      throw err;
    }

    // Normalize to internal status format: is_published=true → 'live', false → 'idea'
    const tools = (rawTools || []).map(t => ({
      ...t,
      status: t.is_published ? 'live' : 'idea',
    }));

    if (tools.length === 0) {
      console.log('[AUTONOMOUS AGENT] No tools found in saas_tools');
    }

    // ── Process each tool with a safety gap ───────────────────────
    for (const tool of tools) {
      try {
        const result = await processOneTool(tool);

        if (result.skipped) {
          toolsSkipped++;
        } else {
          toolsProcessed++;

          // Accumulate action counters
          switch (result.action_taken) {
            case 'config_generated':      actions.plans_generated++;    break;
            case 'auto_published':        actions.scaled++;             break;
            case 'plan_generated':        actions.plans_generated++;    break;
            case 'status_updated':        actions.scaled++;             break;
            case 'improvement_suggested': actions.improve_suggested++;  break;
            case 'kill_flagged':          actions.kill_flagged++;       break;
            case 'observation_logged':    actions.observed++;           break;
          }
        }
      } catch (toolErr) {
        // One tool failure must never abort the rest
        console.error(`[AUTONOMOUS AGENT] Error processing "${tool.name}":`, toolErr.message);
        actions.errors++;
        toolsProcessed++;

        await logAction({
          tool_id:   tool.id,
          tool_name: tool.name,
          action:    'error',
          notes:     toolErr.message,
          is_auto_executed: false,
        });
      }

      // 1-second gap between tools to avoid hammering OpenAI
      await sleep(TOOL_DELAY_MS);
    }

    const completedAt = new Date();
    const summary = {
      run_id:          runId,
      started_at:      startedAt.toISOString(),
      completed_at:    completedAt.toISOString(),
      tools_processed: toolsProcessed,
      tools_skipped:   toolsSkipped,
      actions_taken:   actions,
      duration_ms:     completedAt - startedAt,
    };

    await finaliseRunRecord(runId, summary);

    console.log(
      `[AUTONOMOUS AGENT] Loop complete: ${toolsProcessed} tools in ${summary.duration_ms}ms` +
      ` | plans=${actions.plans_generated} scaled=${actions.scaled}` +
      ` | improve=${actions.improve_suggested} kill_flagged=${actions.kill_flagged}` +
      ` | observed=${actions.observed} errors=${actions.errors}`
    );

    return summary;

  } finally {
    // ── ALWAYS release the lock — no exception can bypass this ────
    isRunning = false;
  }
}

// ── Expose isRunning for health checks (read-only) ────────────
function getIsRunning() { return isRunning; }

module.exports = { runAutonomousLoop, processOneTool, logAction, getIsRunning };
