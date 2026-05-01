const express  = require('express');
const router   = express.Router();
const supabase = require('../db/supabase');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { getAdminAnalytics, getUserAnalytics } = require('../services/analytics.service');

// GET /api/analytics/admin?days=30
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getAdminAnalytics(days);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[analytics/admin]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/user
router.get('/user', requireAuth, async (req, res) => {
  try {
    const data = await getUserAnalytics(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[analytics/user]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/revenue?days=30
router.get('/revenue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('revenue_logs')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[analytics/revenue]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/tools
router.get('/tools', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tool_usage_events')
      .select('tool_slug');

    if (error) throw error;

    const toolUsage = {};
    data?.forEach(e => {
      toolUsage[e.tool_slug] = (toolUsage[e.tool_slug] || 0) + 1;
    });

    const sorted = Object.entries(toolUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({ slug, count }));

    res.json({ success: true, data: sorted });
  } catch (err) {
    console.error('[analytics/tools]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, subscription_status, created_at, isPremium');

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[analytics/users]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
