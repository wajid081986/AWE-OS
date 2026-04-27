const supabase = require('../db/supabase');

/**
 * Log a successful payment and atomically update the tool's cumulative revenue.
 *
 * The increment_revenue RPC avoids the read-modify-write pattern that
 * would produce wrong totals under concurrent payments for the same tool.
 *
 * @param {string}  tool_id   - UUID of the tool that earned revenue
 * @param {string}  user_id   - UUID of the paying user
 * @param {number}  amount    - Amount in INR (must be > 0)
 * @param {string}  order_id  - Razorpay order ID
 * @param {object}  metadata  - Extra JSONB (payment_id, plan, etc.)
 * @returns {object} Saved revenue_log row
 */
async function logRevenue(tool_id, user_id, amount, order_id, metadata = {}) {
  if (!amount || Number(amount) <= 0) {
    const err = new Error('amount must be greater than 0');
    err.status = 400;
    throw err;
  }

  const { data: log, error: insertErr } = await supabase
    .from('revenue_logs')
    .insert({
      tool_id,
      user_id,
      amount: Number(amount),
      order_id:  order_id || null,
      metadata,
      status: 'success',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[revenue.service] insert failed:', insertErr.message);
    throw insertErr;
  }

  // Atomic revenue increment — safe under concurrent writes
  const { error: rpcErr } = await supabase.rpc('increment_revenue', {
    p_tool_id: tool_id,
    p_amount:  Number(amount),
  });

  if (rpcErr) {
    // Revenue log exists but tools.revenue is stale — log for reconciliation
    console.error('[revenue.service] increment_revenue RPC failed:', rpcErr.message,
      '| log_id:', log.id, '| amount:', amount);
  }

  console.log(JSON.stringify({
    level: 'info', event: 'revenue_logged',
    tool_id, amount, order_id, ts: new Date().toISOString(),
  }));

  return log;
}

/**
 * Return revenue analytics for a tool:
 * - All-time total
 * - Revenue in last 30 days
 * - Average order value
 * - Transaction count
 *
 * @param {string} tool_id
 * @returns {object} revenue summary
 */
async function getRevenueSummary(tool_id) {
  const { data: logs, error } = await supabase
    .from('revenue_logs')
    .select('amount, created_at')
    .eq('tool_id', tool_id)
    .eq('status', 'success');

  if (error) throw error;

  const safelogs      = logs ?? [];
  const total         = safelogs.reduce((sum, r) => sum + Number(r.amount), 0);
  const cutoff        = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const last30Total   = safelogs
    .filter(r => new Date(r.created_at) >= cutoff)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const avgOrderValue = safelogs.length > 0 ? total / safelogs.length : 0;

  return {
    tool_id,
    total_revenue:        Number(total.toFixed(2)),
    revenue_last_30_days: Number(last30Total.toFixed(2)),
    average_order_value:  Number(avgOrderValue.toFixed(2)),
    transaction_count:    safelogs.length,
  };
}

module.exports = { logRevenue, getRevenueSummary };
