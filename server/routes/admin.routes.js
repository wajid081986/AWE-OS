const express  = require('express');
const supabase = require('../db/supabase');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [usersResult, toolsResult, subsResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('saas_tools').select('*', { count: 'exact', head: true }),
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

module.exports = router;
