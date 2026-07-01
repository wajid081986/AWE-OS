const express  = require('express');
const supabase = require('../db/supabase');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { store: executionStore, EXECUTION_STATUS } = require('../runtime/ExecutionStore');
const { listPipelines } = require('../runtime/PipelineDefinitions');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [usersResult, toolsResult, subsResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('tools').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers:          usersResult.count  ?? 0,
        totalTools:          toolsResult.count  ?? 0,
        activeSubscriptions: subsResult.count   ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, permissions, subscription_status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, users: users ?? [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Role must be "user" or "admin"' });
  }
  try {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id/permissions
router.put('/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: 'permissions must be an array' });
  }
  try {
    const { error } = await supabase
      .from('users')
      .update({ permissions })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/pipeline-metrics
// Returns 24h aggregated pipeline health for the observability dashboard.
router.get('/pipeline-metrics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [metricsRes, failedRes] = await Promise.all([
      supabase
        .from('pipeline_metrics')
        .select('cron_name, status, duration_ms, records_processed')
        .gte('run_at', since),
      supabase
        .from('failed_jobs')
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null),
    ]);

    const rows = metricsRes.data || [];
    const total   = rows.length;
    const errors  = rows.filter(r => r.status === 'error').length;
    const success = rows.filter(r => r.status === 'success').length;

    const durations = rows.map(r => r.duration_ms).filter(Boolean);
    const avg_duration_ms = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const total_records_processed = rows.reduce((s, r) => s + (r.records_processed || 0), 0);

    // Per-cron breakdown
    const byCron = {};
    for (const row of rows) {
      if (!byCron[row.cron_name]) byCron[row.cron_name] = { cron_name: row.cron_name, total: 0, errors: 0 };
      byCron[row.cron_name].total++;
      if (row.status === 'error') byCron[row.cron_name].errors++;
    }

    res.json({
      success: true,
      data: {
        total_runs:               total,
        success_rate:             total > 0 ? success / total : 0,
        failure_rate:             total > 0 ? errors  / total : 0,
        avg_duration_ms,
        total_records_processed,
        failed_jobs_count:        failedRes.count ?? 0,
        by_cron:                  Object.values(byCron),
        window_hours:             24,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/queue-stats
router.get('/queue-stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { getQueueStats } = require('../services/queue.service');
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/retention/trigger
router.post('/retention/trigger', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { executeRetention } = require('../jobs/retention.cron');
    // Fire-and-forget — returns immediately, job runs in background
    executeRetention().catch(e => console.error('[RETENTION] manual trigger error:', e?.message));
    res.json({ success: true, message: 'Retention job triggered' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Agent monitoring endpoints ───────────────────────────────────────────────

// GET /api/admin/agents/metrics — 24h summary across all agents
router.get('/agents/metrics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from('agent_logs')
      .select('agent_name, level, created_at')
      .gte('created_at', since);

    const rows         = logs || [];
    const totalRuns24h = rows.filter(r => r.level === 'info' && r.agent_name).length;
    const errorCount   = rows.filter(r => r.level === 'error').length;
    const successCount = totalRuns24h - errorCount;
    const successRate  = totalRuns24h > 0 ? successCount / totalRuns24h : 0;

    const counts = {};
    for (const r of rows) {
      counts[r.agent_name] = (counts[r.agent_name] || 0) + 1;
    }
    const mostActive = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({ success: true, totalRuns24h, successRate, errorCount, mostActive });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/agents/status — per-agent status from recent agent_logs
router.get('/agents/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from('agent_logs')
      .select('agent_name, level, message, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    // Also pull autonomous_runs for the autonomous agent
    const { data: autoRuns } = await supabase
      .from('autonomous_runs')
      .select('started_at, completed_at, errors')
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(20);

    const rows = logs || [];
    const agentNames = ['autonomous', 'auto-debug', 'builder', 'testing', 'learning', 'idea-pipeline',
                        'decision', 'revenue', 'deployment', 'marketing', 'support', 'optimization'];

    const agents = {};
    for (const name of agentNames) {
      const agentRows   = rows.filter(r => r.agent_name === name);
      const errorRows   = agentRows.filter(r => r.level === 'error');
      const lastEntry   = agentRows[0] || null;
      const totalRuns   = agentRows.filter(r => {
        const msg = r.message?.toLowerCase() || '';
        return msg.includes('complet') || msg.includes('start');
      }).length;
      const successRate = totalRuns > 0 ? Math.max(0, (totalRuns - errorRows.length) / totalRuns) : 0;

      agents[name] = {
        status:       lastEntry?.level === 'error' ? 'error' : lastEntry ? 'idle' : 'idle',
        lastRun:      lastEntry?.created_at || null,
        totalRuns24h: name === 'autonomous' ? (autoRuns?.length || 0) : totalRuns,
        successRate,
      };
    }

    res.json({ success: true, agents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/agents/logs/:agentName — last 20 log entries for one agent
router.get('/agents/logs/:agentName', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { agentName } = req.params;
    const { data: logs, error } = await supabase
      .from('agent_logs')
      .select('id, agent_name, level, message, metadata, created_at')
      .eq('agent_name', agentName)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, logs: logs || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/agents/trigger/:agentName — fire an agent manually
router.post('/agents/trigger/:agentName', requireAuth, requireAdmin, async (req, res) => {
  const { agentName } = req.params;

  const TRIGGERS = {
    'autonomous': () => require('../agents/autonomous-agent').runAutonomousLoop({ triggered_by: 'admin' }),
    'auto-debug': () => require('../agents/auto-debug-agent').runAutoDebugAgent(),
    'testing':    () => require('../agents/testing-agent.core').runTestingAgent(),
  };

  const trigger = TRIGGERS[agentName];
  if (!trigger) {
    return res.status(404).json({ success: false, error: `Unknown agent: ${agentName}` });
  }

  // Fire-and-forget — respond immediately
  trigger().catch(e => console.error(`[ADMIN TRIGGER] ${agentName} error:`, e?.message));
  res.json({ success: true, message: `Agent "${agentName}" triggered` });
});

// ── Pipeline runtime endpoints ──────────────────────────────────────────────

// GET /api/admin/runtime/status — current runtime health snapshot
router.get('/runtime/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [activeExecutions, pipelineMetrics] = await Promise.allSettled([
      executionStore.getActiveExecutions(),
      executionStore.getPipelineMetrics(24),
    ]);

    const active  = activeExecutions.status  === 'fulfilled' ? activeExecutions.value  : [];
    const metrics = pipelineMetrics.status   === 'fulfilled' ? pipelineMetrics.value   : null;

    res.json({
      success: true,
      data: {
        pipelines:          listPipelines().map(p => ({ id: p.id, name: p.name, stepCount: p.stepCount, hasApproval: p.hasApproval })),
        activeExecutions:   active.length,
        activeDetails:      active,
        metrics24h:         metrics,
        timestamp:          new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/runtime/executions/pending-approval — executions waiting for human approval
router.get('/runtime/executions/pending-approval', requireAuth, requireAdmin, async (req, res) => {
  try {
    const executions = await executionStore.getActiveExecutions();
    const pending    = executions.filter(e => e.status === EXECUTION_STATUS.PAUSED);
    res.json({ success: true, data: pending, count: pending.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/runtime/stalled-steps — steps with missed heartbeats (potential hangs)
router.get('/runtime/stalled-steps', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stalled = await executionStore.getStalledSteps(5 * 60_000); // 5min threshold
    res.json({ success: true, data: stalled, count: stalled.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
