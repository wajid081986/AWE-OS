const supabase                    = require('../db/supabase');
const { runAutonomousLoop, getIsRunning } = require('../agents/autonomous-agent');

// ── POST /api/autonomous/run ──────────────────────────────────

async function triggerRun(req, res) {
  try {
    if (getIsRunning()) {
      return res.status(409).json({
        success: false,
        error:   'Autonomous loop is already running — try again shortly',
        code:    'ALREADY_RUNNING',
      });
    }

    const summary = await runAutonomousLoop({ limit: 10, triggered_by: 'manual' });

    if (summary.skipped) {
      return res.status(429).json({
        success: false,
        error:   `Run skipped: ${summary.reason}`,
        code:    summary.reason?.toUpperCase() || 'SKIPPED',
      });
    }

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    console.error('[AUTONOMOUS CONTROLLER] triggerRun error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error', code: 'RUN_FAILED' });
  }
}

// ── GET /api/autonomous/logs ──────────────────────────────────

async function getLogs(req, res) {
  try {
    const limit   = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const tool_id = req.query.tool_id || null;

    let query = supabase
      .from('autonomous_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tool_id) {
      // Basic UUID format check before hitting the DB
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(tool_id)) {
        return res.status(400).json({ success: false, error: 'Invalid tool_id format', code: 'INVALID_INPUT' });
      }
      query = query.eq('tool_id', tool_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AUTONOMOUS CONTROLLER] getLogs error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch logs', code: 'DB_ERROR' });
    }

    return res.status(200).json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[AUTONOMOUS CONTROLLER] getLogs unexpected error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error', code: 'LOGS_FAILED' });
  }
}

// ── GET /api/autonomous/last-run ──────────────────────────────

async function getLastRun(req, res) {
  try {
    // Pull the 10 most recent runs from autonomous_runs
    const { data: runs, error: runsErr } = await supabase
      .from('autonomous_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1);

    if (runsErr) {
      console.error('[AUTONOMOUS CONTROLLER] getLastRun runs error:', runsErr.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch run history', code: 'DB_ERROR' });
    }

    const lastRun = (runs && runs.length > 0) ? runs[0] : null;

    // Also fetch the last 10 log entries for the most recent run window
    let recentLogs = [];
    if (lastRun) {
      const { data: logs } = await supabase
        .from('autonomous_logs')
        .select('*')
        .gte('created_at', lastRun.started_at)
        .order('created_at', { ascending: false })
        .limit(50);

      recentLogs = logs || [];
    }

    // Count runs in last 24 hours for daily limit display
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: runsToday } = await supabase
      .from('autonomous_runs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', since);

    return res.status(200).json({
      success: true,
      data: {
        last_run:       lastRun,
        recent_logs:    recentLogs,
        runs_today:     runsToday ?? 0,
        daily_limit:    10,
        is_running:     getIsRunning(),
      },
    });
  } catch (err) {
    console.error('[AUTONOMOUS CONTROLLER] getLastRun unexpected error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error', code: 'LAST_RUN_FAILED' });
  }
}

module.exports = { triggerRun, getLogs, getLastRun };
