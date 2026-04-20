const { v4: uuidv4 }       = require('uuid');
const supabase              = require('../db/supabase');
const { evaluateTool }      = require('./decision-engine');
const { generateBuildPlan } = require('./builder-agent');

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
    // BRANCH 1: idea → generate build plan
    // ────────────────────────────────────────────────────────────
    if (tool.status === 'idea') {
      // Check for an existing non-rejected plan to avoid duplicates
      const { data: existingPlan, error: planCheckErr } = await supabase
        .from('builder_plans')
        .select('id, status')
        .eq('tool_id', tool.id)
        .neq('status', 'rejected')
        .maybeSingle();

      if (planCheckErr) {
        throw new Error(`Plan check failed: ${planCheckErr.message}`);
      }

      if (existingPlan) {
        await logAction({
          tool_id:  tool.id, tool_name: tool.name,
          action:   'already_planned',
          notes:    `Plan already exists (plan_id=${existingPlan.id}, status=${existingPlan.status})`,
          is_auto_executed: false,
        });
        console.log(`[AUTONOMOUS AGENT] ${tool.name} → skipped (plan already exists)`);
        return { skipped: true, reason: 'already_planned' };
      }

      // Generate the plan — retried internally by builder-agent
      const result = await generateBuildPlan(tool.id);

      await logAction({
        tool_id:         tool.id,
        tool_name:       tool.name,
        action:          'plan_generated',
        status_before:   'idea',
        status_after:    'idea', // tool stays 'idea' until human approves the plan
        notes:           `Plan ${result.plan_id} created — pending human review`,
        is_auto_executed: true,
      });

      console.log(`[AUTONOMOUS AGENT] Decision: plan_generated → Action: plan awaiting review`);
      return { tool_id: tool.id, tool_name: tool.name, action_taken: 'plan_generated', plan_id: result.plan_id };
    }

    // ────────────────────────────────────────────────────────────
    // BRANCH 2: live → run decision engine
    // ────────────────────────────────────────────────────────────
    if (tool.status === 'live') {
      const decisionResult = await evaluateTool(tool.id);
      const { decision, reason, recommended_action } = decisionResult;

      console.log(`[AUTONOMOUS AGENT] Decision: ${decision} → Action: ${getActionLabel(decision)}`);

      if (decision === 'scale') {
        // AUTO-EXECUTE: scaling is a safe, positive action
        const { error: scaleErr } = await supabase
          .from('tools')
          .update({ status: 'scaling' })
          .eq('id', tool.id);

        if (scaleErr) {
          throw new Error(`Failed to update tool status to scaling: ${scaleErr.message}`);
        }

        await logAction({
          tool_id:          tool.id,
          tool_name:        tool.name,
          action:           'status_updated',
          decision:         'scale',
          status_before:    'live',
          status_after:     'scaling',
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
        // LOG ONLY — killing a tool is irreversible; ALWAYS requires human approval
        await logAction({
          tool_id:          tool.id,
          tool_name:        tool.name,
          action:           'kill_flagged',
          decision:         'kill',
          status_before:    tool.status,
          notes:            'Requires human approval before archiving. Reason: ' + reason,
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

  // ── Guard: daily run limit ────────────────────────────────────
  const runsToday = await getRunsToday();
  if (runsToday >= MAX_RUNS_PER_DAY) {
    const msg = `Daily run limit reached (${runsToday}/${MAX_RUNS_PER_DAY}) — aborting`;
    console.warn(`[AUTONOMOUS AGENT] ${msg}`);
    await logAction({ tool_id: null, tool_name: null, action: 'skipped', notes: msg });
    return { skipped: true, reason: 'daily_limit_reached' };
  }

  isRunning = true;
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
    // ── Fetch: live first (priority), then idea ───────────────────
    const { data: tools, error: fetchErr } = await supabase
      .from('tools')
      .select('id, name, status, updated_at')
      .in('status', ['live', 'idea'])
      .order('status',     { ascending: false }) // 'live' sorts before 'idea'
      .order('updated_at', { ascending: true  }) // oldest first within each group
      .limit(safeLimit);

    if (fetchErr) {
      const err = new Error(`Failed to fetch tools: ${fetchErr.message}`);
      console.error('[AUTONOMOUS AGENT]', err.message);
      throw err;
    }

    if (!tools || tools.length === 0) {
      console.log('[AUTONOMOUS AGENT] No actionable tools found (idea/live)');
    }

    // ── Process each tool with a safety gap ───────────────────────
    for (const tool of (tools || [])) {
      try {
        const result = await processOneTool(tool);

        if (result.skipped) {
          toolsSkipped++;
        } else {
          toolsProcessed++;

          // Accumulate action counters
          switch (result.action_taken) {
            case 'plan_generated':    actions.plans_generated++;   break;
            case 'status_updated':    actions.scaled++;            break;
            case 'improvement_suggested': actions.improve_suggested++; break;
            case 'kill_flagged':      actions.kill_flagged++;      break;
            case 'observation_logged': actions.observed++;         break;
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
