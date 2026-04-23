'use strict';

const supabase = require('../db/supabase');
const {
  getRevenueDashboard,
  calculateDailySnapshot,
  getRevenueHistory,
  findUpsellOpportunities,
  trackFailedPayments,
  acknowledgeAlert,
} = require('../agents/revenue-agent');

// GET /api/revenue-agent/dashboard
async function getDashboard(req, res) {
  try {
    const data = await getRevenueDashboard();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[REVENUE CTRL] getDashboard error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load revenue dashboard', detail: err.message });
  }
}

// POST /api/revenue-agent/snapshot
async function runSnapshot(req, res) {
  try {
    const snapshot = await calculateDailySnapshot();
    return res.status(201).json({ success: true, data: snapshot });
  } catch (err) {
    console.error('[REVENUE CTRL] runSnapshot error:', err.message);
    return res.status(500).json({ success: false, error: 'Snapshot calculation failed', detail: err.message });
  }
}

// GET /api/revenue-agent/history
async function getHistory(req, res) {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
  try {
    const data = await getRevenueHistory(days);
    return res.status(200).json({ success: true, data, count: data.length });
  } catch (err) {
    console.error('[REVENUE CTRL] getHistory error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch revenue history', detail: err.message });
  }
}

// GET /api/revenue-agent/upsells
async function getUpsells(req, res) {
  const { status = 'identified', limit = 20 } = req.query;
  const validStatuses = ['identified', 'contacted', 'converted', 'dismissed'];

  try {
    let query = supabase
      .from('upsell_opportunities')
      .select('*')
      .order('score', { ascending: false })
      .limit(Math.min(parseInt(limit, 10) || 20, 100));

    if (status && validStatuses.includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[REVENUE CTRL] getUpsells error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch upsell opportunities', detail: err.message });
  }
}

// POST /api/revenue-agent/upsells/find
async function findUpsells(req, res) {
  try {
    const result = await findUpsellOpportunities();
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[REVENUE CTRL] findUpsells error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to find upsell opportunities', detail: err.message });
  }
}

// GET /api/revenue-agent/failed-payments
async function getFailedPayments(req, res) {
  const resolved = req.query.resolved === 'true' ? true
    : req.query.resolved === 'false' ? false
    : false;

  try {
    const { data, error } = await supabase
      .from('failed_payments')
      .select('*')
      .eq('resolved', resolved)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[REVENUE CTRL] getFailedPayments error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch failed payments', detail: err.message });
  }
}

// PATCH /api/revenue-agent/failed-payments/:id/resolve
async function resolveFailedPayment(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, error: 'Payment id is required' });

  try {
    const { data, error } = await supabase
      .from('failed_payments')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[REVENUE CTRL] resolveFailedPayment error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to resolve payment', detail: err.message });
  }
}

// GET /api/revenue-agent/alerts
async function getAlerts(req, res) {
  const acknowledged = req.query.acknowledged === 'true' ? true
    : req.query.acknowledged === 'false' ? false
    : false;

  try {
    const { data, error } = await supabase
      .from('revenue_alerts')
      .select('*')
      .eq('acknowledged', acknowledged)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data: data || [], count: (data || []).length });
  } catch (err) {
    console.error('[REVENUE CTRL] getAlerts error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch alerts', detail: err.message });
  }
}

// PATCH /api/revenue-agent/alerts/:id/acknowledge
async function acknowledgeAlertCtrl(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, error: 'Alert id is required' });

  try {
    const data = await acknowledgeAlert(id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[REVENUE CTRL] acknowledgeAlert error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to acknowledge alert', detail: err.message });
  }
}

// PATCH /api/revenue-agent/upsells/:id/status
async function updateUpsellStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['identified', 'contacted', 'converted', 'dismissed'];

  if (!id) return res.status(400).json({ success: false, error: 'Upsell id is required' });
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const { data, error } = await supabase
      .from('upsell_opportunities')
      .update({ status, actioned_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[REVENUE CTRL] updateUpsellStatus error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update upsell status', detail: err.message });
  }
}

module.exports = {
  getDashboard,
  runSnapshot,
  getHistory,
  getUpsells,
  findUpsells,
  getFailedPayments,
  resolveFailedPayment,
  getAlerts,
  acknowledgeAlertCtrl,
  updateUpsellStatus,
};
