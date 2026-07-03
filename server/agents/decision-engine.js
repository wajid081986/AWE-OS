const supabase = require('../db/supabase');

// ── Thresholds ────────────────────────────────────────────────
// Kept as named constants so a future config layer can override them
// without hunting through logic branches.
const SCALE_REVENUE_THRESHOLD   = 10000;  // ₹10,000 total revenue
const KILL_USAGE_THRESHOLD      = 50;     // fewer than 50 uses → no demand
const IMPROVE_CONVERSION_MAX    = 2.0;    // < 2% conversion with decent traffic
const BATCH_LIMIT_MAX           = 50;     // safety cap for evaluateAllTools

// Statuses eligible for evaluation — others are pre-decision states
const EVALUABLE_STATUSES = new Set(['live', 'scaling']);

/**
 * Apply the four-rule decision tree to a set of metrics.
 * Pure function — no I/O, fully testable in isolation.
 *
 * Priority order matters:
 *   1. SCALE  — revenue is the strongest positive signal
 *   2. KILL   — low usage means the market rejected the tool
 *   3. IMPROVE — traffic exists but funnel is leaking
 *   4. OBSERVE — not enough data yet, keep watching
 *
 * @param {{ usage_count: number, conversion_rate: number, revenue: number }} metrics
 * @returns {{ decision, reason, recommended_action, status_update }}
 */
function applyRules(metrics) {
  const usage          = metrics.usage_count    ?? 0;
  const conversionRate = metrics.conversion_rate ?? 0;
  const revenue        = metrics.revenue         ?? 0;

  // RULE 1 — SCALE: revenue dominates all other signals.
  // A profitable tool should scale regardless of conversion rate
  // because revenue proves real willingness-to-pay.
  if (revenue > SCALE_REVENUE_THRESHOLD) {
    return {
      decision:           'scale',
      reason:             'High revenue — profitable tool',
      recommended_action: 'Increase marketing budget, add premium features, optimize for retention',
      status_update:      'scaling',
    };
  }

  // RULE 2 — KILL: critically low usage means no product-market fit.
  // 50 uses is the minimum signal threshold; below it, any metric
  // (conversion rate, revenue) is statistically meaningless.
  if (usage < KILL_USAGE_THRESHOLD) {
    return {
      decision:           'kill',
      reason:             'Critically low usage — no market demand',
      recommended_action: 'Archive tool, redirect traffic to better tools, analyze why it failed',
      status_update:      'killed',
    };
  }

  // RULE 3 — IMPROVE: healthy traffic but the funnel is broken.
  // usage >= 50 means people are finding the tool; conversion < 2%
  // means they aren't completing the core action. UX/pricing issue.
  if (usage >= KILL_USAGE_THRESHOLD && conversionRate < IMPROVE_CONVERSION_MAX) {
    return {
      decision:           'improve',
      reason:             'Good traffic but users not converting',
      recommended_action: 'A/B test landing page, review pricing, improve UX flow, add social proof',
      status_update:      null,  // no status change needed for improve
    };
  }

  // RULE 4 — OBSERVE: all thresholds met but not enough signal
  // to act decisively. Give it 7–14 days of continued monitoring.
  return {
    decision:           'observe',
    reason:             'Insufficient data to make decision',
    recommended_action: 'Continue monitoring for 7-14 days, focus on user acquisition',
    status_update:      null,
  };
}

/**
 * Evaluate a single tool and return a structured decision.
 *
 * Idempotent: tools.status is only written when the new value differs
 * from the current value, preventing unnecessary DB churn.
 *
 * @param {string}  tool_id         - UUID of the tool to evaluate
 * @param {object}  [options]
 * @param {boolean} [options.dry_run=false] - Skip all DB writes when true
 * @returns {Promise<DecisionResult>}
 * @throws {{ status: 404, code: 'TOOL_NOT_FOUND' }} if tool doesn't exist
 * @throws {{ status: 422, code: 'INVALID_STATUS' }} if tool not evaluable
 * @throws {{ status: 423, code: 'MANUAL_OVERRIDE' }} if override is set
 */
async function evaluateTool(tool_id, { dry_run = false } = {}) {
  // ── Fetch tool ───────────────────────────────────────────────
  const { data: tool, error: fetchErr } = await supabase
    .from('tools')
    .select('id, name, status, usage_count, conversion_rate, revenue, manual_override')
    .eq('id', tool_id)
    .maybeSingle();

  if (fetchErr) {
    console.error(`[DECISION ENGINE] DB fetch error | tool_id=${tool_id}:`, fetchErr.message);
    const err = new Error('Database error while fetching tool');
    err.status = 500;
    err.code   = 'EVALUATION_FAILED';
    throw err;
  }

  if (!tool) {
    const err = new Error(`Tool not found: ${tool_id}`);
    err.status = 404;
    err.code   = 'TOOL_NOT_FOUND';
    throw err;
  }

  // ── Guard: manual override ───────────────────────────────────
  // A human has flagged this tool — the engine must not touch it.
  if (tool.manual_override === true) {
    const err = new Error(`Tool "${tool.name}" has manual_override=true — skipping`);
    err.status = 423;  // 423 Locked is semantically appropriate here
    err.code   = 'MANUAL_OVERRIDE';
    throw err;
  }

  // ── Guard: non-evaluable status ──────────────────────────────
  // idea/building tools are pre-launch; killed tools are already decided.
  if (!EVALUABLE_STATUSES.has(tool.status)) {
    const err = new Error(`Tool "${tool.name}" has status="${tool.status}" — only live/scaling tools are evaluated`);
    err.status = 422;
    err.code   = 'INVALID_STATUS';
    throw err;
  }

  // ── Evaluate ─────────────────────────────────────────────────
  const metrics = {
    usage_count:    tool.usage_count    ?? 0,
    conversion_rate: tool.conversion_rate ?? 0,
    revenue:         tool.revenue         ?? 0,
  };

  const { decision, reason, recommended_action, status_update } = applyRules(metrics);
  const evaluated_at = new Date().toISOString();

  // ── Idempotent status update ─────────────────────────────────
  if (!dry_run && status_update && status_update !== tool.status) {
    const { error: updateErr } = await supabase
      .from('tools')
      .update({ status: status_update })
      .eq('id', tool_id);

    if (updateErr) {
      // Log but don't fail the evaluation — the decision is still valid
      console.error(`[DECISION ENGINE] Status update failed | tool=${tool.name}:`, updateErr.message);
    }
  }

  // ── Persist decision history ─────────────────────────────────
  // Written even in dry_run (with dry_run=true flag) so operators
  // can audit what the engine *would have* done.
  const { error: logErr } = await supabase
    .from('decision_logs')
    .insert({
      tool_id,
      decision,
      reason,
      recommended_action,
      metrics_snapshot: metrics,
      dry_run,
    });

  if (logErr) {
    console.error(`[DECISION ENGINE] Failed to write decision_log | tool=${tool.name}:`, logErr.message);
  }

  // ── Structured log ───────────────────────────────────────────
  console.log(
    `[DECISION ENGINE] ${evaluated_at} | ${tool.name} | ${decision.toUpperCase()} | ${reason}` +
    (dry_run ? ' [DRY RUN]' : '')
  );

  return {
    tool_id,
    tool_name:  tool.name,
    metrics,
    decision,
    reason,
    recommended_action,
    dry_run,
    evaluated_at,
  };
}

/**
 * Evaluate all live/scaling tools in one batch.
 *
 * Partial-failure safe: one broken tool does not abort the batch.
 * Each failure is captured in the errors array and logged.
 *
 * @param {object}  [options]
 * @param {boolean} [options.dry_run=false]
 * @param {number}  [options.limit=50]  - Max tools to evaluate (capped at BATCH_LIMIT_MAX)
 * @returns {Promise<BatchResult>}
 */
async function evaluateAllTools({ dry_run = false, limit = BATCH_LIMIT_MAX } = {}) {
  const safeLimit    = Math.min(Number(limit) || BATCH_LIMIT_MAX, BATCH_LIMIT_MAX);
  const executed_at  = new Date().toISOString();

  const { data: tools, error: fetchErr } = await supabase
    .from('tools')
    .select('id, name, manual_override')
    .in('status', ['live', 'scaling'])
    .eq('manual_override', false)  // exclude manual overrides at query level
    .limit(safeLimit);

  if (fetchErr) {
    console.error('[DECISION ENGINE] evaluateAllTools fetch failed:', fetchErr.message);
    const err = new Error('Failed to fetch tools for evaluation');
    err.status = 500;
    err.code   = 'EVALUATION_FAILED';
    throw err;
  }

  const summary = { scale: 0, kill: 0, improve: 0, observe: 0 };
  const results = [];
  const errors  = [];

  for (const tool of tools) {
    try {
      const result = await evaluateTool(tool.id, { dry_run });
      summary[result.decision]++;
      results.push(result);
    } catch (err) {
      // MANUAL_OVERRIDE and INVALID_STATUS are expected — don't count as errors
      if (err.code === 'MANUAL_OVERRIDE' || err.code === 'INVALID_STATUS') continue;

      console.error(`[DECISION ENGINE] evaluateTool failed | tool_id=${tool.id}:`, err.message);
      errors.push({ tool_id: tool.id, tool_name: tool.name, error: err.message });
    }
  }

  console.log(
    `[DECISION ENGINE] Batch complete | evaluated=${results.length} | ` +
    `scale=${summary.scale} kill=${summary.kill} improve=${summary.improve} observe=${summary.observe}` +
    (dry_run ? ' [DRY RUN]' : '')
  );

  return {
    total_evaluated: results.length,
    summary,
    results,
    errors,
    dry_run,
    executed_at,
  };
}

// A tool needs at least this many days of live traffic before the engine
// trusts its usage/revenue signal enough to auto-hide it — protects
// brand-new launches from being killed before anyone has found them.
const MIN_AGE_DAYS_FOR_AUTO_HIDE = 30;

/**
 * Batch-evaluate all published tools using tool_usage_events + revenue_logs.
 * Called by decision.cron.js every 24 hours.
 * Does NOT use the 'tools' internal pipeline table.
 *
 * Unlike evaluateAllTools (the idea-pipeline's internal table), a 'kill'
 * verdict here is not purely advisory: once a tool has had
 * MIN_AGE_DAYS_FOR_AUTO_HIDE days to gather real traffic and still shows
 * critically low usage, it is automatically unpublished (approved: false)
 * so it stops eating SEO/crawl budget and confusing users — reversible by
 * flipping approved back to true, and skipped entirely for any tool with
 * manual_override set.
 *
 * @param {object}  [options]
 * @param {boolean} [options.dry_run=false]
 * @returns {Promise<{ total_evaluated, results, errors, executed_at }>}
 */
async function evaluateAllSaasTools({ dry_run = false } = {}) {
  const executed_at = new Date().toISOString();

  const { data: tools, error: fetchErr } = await supabase
    .from('tools')
    .select('id, name, slug, approved, manual_override, approved_at, created_at')
    .eq('approved', true)
    .limit(BATCH_LIMIT_MAX);

  if (fetchErr) {
    console.error('[DECISION ENGINE] evaluateAllSaasTools fetch failed:', fetchErr.message);
    const err = new Error('Failed to fetch tools for evaluation');
    err.status = 500; err.code = 'EVALUATION_FAILED'; throw err;
  }

  const summary = { scale: 0, kill: 0, improve: 0, observe: 0 };
  const results = [];
  const errors  = [];

  for (const tool of tools || []) {
    try {
      // Gather metrics from event tables
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

      const usage_count = usageRes.count || 0;
      const revenue     = (revenueRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const metrics     = { usage_count, conversion_rate: 0, revenue };

      const { decision, reason, recommended_action } = applyRules(metrics);

      // ── Real action: auto-hide confidently-dead tools ────────────
      const goLiveAt = tool.approved_at || tool.created_at;
      const ageDays  = goLiveAt ? (Date.now() - new Date(goLiveAt).getTime()) / 86400000 : null;
      const eligibleForAutoHide = decision === 'kill'
        && !tool.manual_override
        && ageDays !== null && ageDays >= MIN_AGE_DAYS_FOR_AUTO_HIDE;

      let action_taken = 'logged_only';
      if (eligibleForAutoHide && !dry_run) {
        const { error: hideErr } = await supabase
          .from('tools')
          .update({ approved: false })
          .eq('id', tool.id);
        if (hideErr) {
          console.error(`[DECISION ENGINE] auto-hide failed for ${tool.name}:`, hideErr.message);
        } else {
          action_taken = 'auto_hidden';
          console.warn(`[DECISION ENGINE] AUTO-HIDDEN — ${tool.name} | age=${Math.round(ageDays)}d | ${reason}`);
        }
      }

      // Persist decision log
      if (!dry_run) {
        const { error: logErr } = await supabase.from('decision_logs').insert({
          tool_id:          tool.id,
          decision,
          reason,
          recommended_action,
          metrics_snapshot: { ...metrics, action_taken, age_days: ageDays !== null ? Math.round(ageDays) : null },
          dry_run:          false,
        });
        if (logErr) {
          console.error(`[DECISION ENGINE] decision_log write failed for ${tool.name}:`, logErr.message);
        }
      }

      console.log(`[DECISION ENGINE] ${tool.name} | ${decision.toUpperCase()} | ${reason}${dry_run ? ' [DRY RUN]' : ''}`);
      summary[decision]++;
      results.push({ tool_id: tool.id, tool_name: tool.name, decision, reason, metrics, action_taken });

    } catch (err) {
      console.error(`[DECISION ENGINE] evaluateSaasTool failed | tool=${tool.name}:`, err.message);
      errors.push({ tool_id: tool.id, tool_name: tool.name, error: err.message });
    }
  }

  const auto_hidden = results.filter(r => r.action_taken === 'auto_hidden').length;

  console.log(
    `[DECISION ENGINE] tools batch complete | evaluated=${results.length} | ` +
    `scale=${summary.scale} kill=${summary.kill} improve=${summary.improve} observe=${summary.observe} | ` +
    `auto_hidden=${auto_hidden}` +
    (dry_run ? ' [DRY RUN]' : '')
  );

  return { total_evaluated: results.length, summary, results, errors, auto_hidden, dry_run, executed_at };
}

module.exports = { evaluateTool, evaluateAllTools, evaluateAllSaasTools, applyRules };
