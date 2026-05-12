'use strict';

/**
 * AWE-OS — AgentCreditSystem                                   Phase 6D
 *
 * Virtual internal economy — agents earn and spend credits based on
 * the value they create and the resources they consume.
 *
 * Credit accounting:
 *   Earn: successful executions, optimizations, learning contributions,
 *         revenue-generating actions, recovery assistance
 *   Spend: failed executions, resource waste, queue pressure, latency violations
 *
 * Resource factors applied to all transactions:
 *   CPU intensity  — high CPU usage = higher cost
 *   Memory usage   — memory pressure = higher cost
 *   Queue pressure — submitting to overloaded queue costs more
 *   Execution latency — slow executions earn fewer credits
 */

const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-credit');

// Starting balance for new agents
const INITIAL_BALANCE  = 1000;
const MIN_BALANCE      = 0;
const MAX_BALANCE      = 100_000;

// Credit rates
const CREDIT_RATES = {
  // Earnings
  execution_success:       15,    // successful task completion
  optimization_applied:    25,    // measurable performance improvement
  learning_contribution:   20,    // quality intelligence contribution
  revenue_impact_unit:      5,    // per $1 estimated revenue generated
  recovery_assist:         30,    // helped recover a failing system
  coordination_success:    12,    // collaborative session success
  marketplace_match:        8,    // successful task routing
  memory_contribution:     10,    // valuable long-term memory entry

  // Costs (negative)
  execution_failure:      -20,    // task failed
  resource_waste:         -10,    // unnecessarily high resource consumption
  queue_pressure:          -5,    // submitted to critically loaded queue
  latency_violation:      -8,     // exceeded latency SLA
  orphan_creation:        -15,    // created orphaned state
  recovery_needed:        -25,    // triggered a self-healing response
};

// Resource multipliers
const RESOURCE_MULTIPLIERS = {
  cpu: {
    low:      1.0,   // < 30% CPU
    moderate: 0.9,   // 30–60%
    high:     0.75,  // 60–80%
    critical: 0.50,  // > 80%
  },
  memory: {
    healthy:  1.0,
    elevated: 0.90,
    high:     0.75,
    critical: 0.55,
  },
};

// In-memory ledger — persisted to DB asynchronously
const _ledger  = new Map(); // agentId → { balance, transactions[] }
const _pending = [];        // batch for DB writes

let _supabase = null;
function db() {
  if (!_supabase) _supabase = require('../../db/supabase');
  return _supabase;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get current credit balance for an agent.
 *
 * @param {string} agentId
 * @returns {number}
 */
function getBalance(agentId) {
  return _getOrInit(agentId).balance;
}

/**
 * Credit an agent account.
 *
 * @param {object} tx
 * @param {string} tx.agentId
 * @param {string} tx.type        — key from CREDIT_RATES
 * @param {object} [tx.context]   — { revenueImpact, cpuLevel, memoryLevel }
 * @param {string} [tx.reason]
 * @returns {number} new balance
 */
function credit(tx) {
  const { agentId, type, context = {}, reason = '' } = tx;
  const base = CREDIT_RATES[type] || 0;
  if (base === 0) return getBalance(agentId);

  const resourceMult = _resourceMultiplier(context);

  let amount;
  if (base > 0) {
    // Earnings — adjusted for resource efficiency
    amount = base * resourceMult;
    if (type === 'revenue_impact_unit' && context.revenueImpact) {
      amount = base * Math.min(context.revenueImpact, 100) * resourceMult;
    }
  } else {
    // Costs — not affected by resource multiplier (penalty is fixed)
    amount = base;
  }

  amount = Math.round(amount * 100) / 100;
  const account = _getOrInit(agentId);
  const prev = account.balance;
  account.balance = Math.min(MAX_BALANCE, Math.max(MIN_BALANCE, account.balance + amount));

  const txRecord = {
    agentId,
    type,
    amount,
    balanceBefore: prev,
    balanceAfter:  account.balance,
    resourceMult,
    reason,
    context,
    ts:            new Date().toISOString(),
  };

  account.transactions.unshift(txRecord);
  if (account.transactions.length > 100) account.transactions.pop(); // keep last 100 in memory

  _pending.push(txRecord);
  if (_pending.length >= 20) _flushPending().catch(() => {});

  log.debug('Credit transaction', { agentId, type, amount, balance: account.balance });
  return account.balance;
}

/**
 * Get a summary of all agent credit positions.
 *
 * @returns {object[]}
 */
function getLedgerSummary() {
  const summary = [];
  for (const [agentId, account] of _ledger) {
    const earned = account.transactions
      .filter(t => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    const spent = account.transactions
      .filter(t => t.amount < 0)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    summary.push({
      agentId,
      balance:      Math.round(account.balance * 100) / 100,
      totalEarned:  Math.round(earned * 100) / 100,
      totalSpent:   Math.round(spent * 100) / 100,
      netFlow:      Math.round((earned - spent) * 100) / 100,
      txCount:      account.transactions.length,
      efficiency:   spent > 0 ? Math.round((earned / (earned + spent)) * 10000) / 100 : 100,
      lastTxAt:     account.transactions[0]?.ts || null,
    });
  }
  return summary.sort((a, b) => b.balance - a.balance);
}

/**
 * Get recent transactions for an agent.
 *
 * @param {string} agentId
 * @param {number} [limit=20]
 */
function getTransactions(agentId, limit = 20) {
  return (_getOrInit(agentId).transactions || []).slice(0, limit);
}

/**
 * Load balances from DB on startup.
 */
async function loadFromDB() {
  try {
    const { data: rows } = await db()
      .from('agent_credits')
      .select('agent_id, balance, total_earned, total_spent')
      .order('balance', { ascending: false })
      .limit(200);

    if (!rows?.length) return;
    for (const r of rows) {
      const account = _getOrInit(r.agent_id);
      account.balance = r.balance ?? INITIAL_BALANCE;
    }
    log.info('Credit balances loaded from DB', { agents: rows.length });
  } catch (err) {
    log.warn('loadFromDB failed', { error: err.message });
  }
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _getOrInit(agentId) {
  if (!_ledger.has(agentId)) {
    _ledger.set(agentId, { balance: INITIAL_BALANCE, transactions: [] });
  }
  return _ledger.get(agentId);
}

function _resourceMultiplier(context) {
  const cpuMult = RESOURCE_MULTIPLIERS.cpu[context.cpuLevel || 'low'];
  const memMult = RESOURCE_MULTIPLIERS.memory[context.memoryLevel || 'healthy'];
  return (cpuMult + memMult) / 2;
}

async function _flushPending() {
  if (_pending.length === 0) return;
  const batch = _pending.splice(0, 50);

  // Aggregate by agentId for upsert
  const byAgent = {};
  for (const tx of batch) {
    if (!byAgent[tx.agentId]) byAgent[tx.agentId] = { earned: 0, spent: 0 };
    if (tx.amount > 0) byAgent[tx.agentId].earned += tx.amount;
    else                byAgent[tx.agentId].spent  += Math.abs(tx.amount);
  }

  for (const [agentId, agg] of Object.entries(byAgent)) {
    await db()
      .from('agent_credits')
      .upsert({
        agent_id:    agentId,
        balance:     _getOrInit(agentId).balance,
        total_earned: agg.earned,
        total_spent:  agg.spent,
        updated_at:  new Date().toISOString(),
      }, { onConflict: 'agent_id' })
      .catch(() => {});
  }
}

module.exports = {
  getBalance,
  credit,
  getLedgerSummary,
  getTransactions,
  loadFromDB,
  CREDIT_RATES,
  // Flush any remaining pending transactions
  flush: () => _flushPending().catch(() => {}),
};
