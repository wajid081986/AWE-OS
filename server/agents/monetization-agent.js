const supabase                        = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// ── Constants ─────────────────────────────────────────────────
const VALID_TOOL_STATUSES  = new Set(['live', 'scaling']);
const VALID_STRATEGY_TYPES = new Set(['pricing', 'freemium', 'upsell', 'trial', 'bundle']);
const VALID_STATUSES       = ['suggested', 'testing', 'implemented', 'rejected'];

const STATUS_TRANSITIONS = {
  suggested:    new Set(['testing', 'rejected']),
  testing:      new Set(['implemented', 'rejected']),
  implemented:  new Set([]),
  rejected:     new Set([]),
};

// ── Helpers ───────────────────────────────────────────────────

function safeNum(val, fallback = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function buildPrompt(tool, revenueData) {
  const totalRevenue  = safeNum(revenueData.total_revenue);
  const totalTx       = parseInt(revenueData.total_transactions || 0, 10);
  const avgOrder      = safeNum(revenueData.avg_order_value);
  const revenuePerUser = tool.usage_count > 0
    ? (totalRevenue / tool.usage_count).toFixed(2)
    : '0';

  return `You are a SaaS Monetization Expert and Pricing Strategist.
Analyze this tool's monetization data and provide specific, actionable strategies to increase revenue.

Tool: ${tool.name}
Description: ${tool.description || 'Not provided'}

Current Monetization Data:
- Total Revenue: ₹${totalRevenue.toFixed(2)}
- Total Transactions: ${totalTx}
- Average Order Value: ₹${avgOrder.toFixed(2)}
- Highest Single Payment: ₹${safeNum(revenueData.highest_payment).toFixed(2)}
- Usage Count: ${tool.usage_count || 0}
- Conversion Rate: ${tool.conversion_rate || 0}%
- Revenue per User: ₹${revenuePerUser}

Return ONLY this exact JSON object — no explanation, no markdown:
{
  "current_model_assessment": "One line diagnosis of current monetization state",
  "revenue_score": 65,
  "strategies": {
    "pricing": {
      "current_issue": "Specific problem with current pricing",
      "recommendation": {
        "model": "subscription|one-time|freemium|tiered",
        "suggested_price": 999,
        "currency": "INR",
        "rationale": "Why this specific price point works",
        "tiers": [
          { "name": "Free", "price": 0, "features": ["feature1", "feature2"] },
          { "name": "Pro", "price": 999, "features": ["feature1", "feature2", "feature3"] }
        ]
      },
      "potential_impact": "+X% revenue in 30 days",
      "confidence": 80,
      "steps": ["Specific step 1", "Specific step 2", "Specific step 3"]
    },
    "freemium": {
      "current_issue": "Problem with free/paid boundary",
      "recommendation": {
        "free_features": ["feature list"],
        "paid_features": ["premium feature list"],
        "conversion_trigger": "What specific moment converts free users to paid"
      },
      "potential_impact": "Expected impact description",
      "confidence": 75,
      "steps": ["Step 1", "Step 2"]
    },
    "upsell": {
      "current_issue": "Missed upsell opportunity",
      "recommendation": {
        "upsell_offer": "What to offer existing paying users",
        "trigger_point": "When to present this offer in the user journey",
        "suggested_price": 499
      },
      "potential_impact": "Expected impact description",
      "confidence": 70,
      "steps": ["Step 1", "Step 2"]
    },
    "trial": {
      "current_issue": "Acquisition funnel problem",
      "recommendation": {
        "trial_days": 14,
        "trial_features": ["features available in trial"],
        "conversion_email_day": 7
      },
      "potential_impact": "Expected impact description",
      "confidence": 65,
      "steps": ["Step 1", "Step 2"]
    }
  },
  "top_priority": "pricing",
  "quick_revenue_win": "Single most impactful action for fastest revenue increase"
}`;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Run AI monetization analysis for a live/scaling tool.
 * Generates strategy recommendations and saves them to DB.
 *
 * @param {string} tool_id
 * @returns {Promise<AnalysisResult>}
 */
async function analyzeMonetization(tool_id) {
  // ── 1. Fetch tool ──────────────────────────────────────────
  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('id, name, description, status, usage_count, conversion_rate, revenue')
    .eq('id', tool_id)
    .maybeSingle();

  if (toolErr) {
    const err = new Error('Database error fetching tool');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }
  if (!tool) {
    const err = new Error(`Tool not found: ${tool_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }
  if (!VALID_TOOL_STATUSES.has(tool.status)) {
    const err = new Error(
      `Tool "${tool.name}" has status="${tool.status}". Only 'live' or 'scaling' tools can be analyzed.`
    );
    err.code = 'INVALID_STATUS'; err.status = 422; throw err;
  }

  // ── 2. Fetch revenue summary ────────────────────────────────
  const { data: revRows, error: revErr } = await supabase
    .rpc('get_revenue_summary', { p_tool_id: tool_id })
    .maybeSingle();

  // Fallback: direct query if RPC not available
  let revenueData = {
    total_transactions: 0,
    total_revenue:      tool.revenue || 0,
    avg_order_value:    0,
    highest_payment:    0,
    lowest_payment:     0,
  };

  if (!revErr && revRows) {
    revenueData = revRows;
  } else {
    // Try direct select aggregate
    const { data: aggData } = await supabase
      .from('revenue_logs')
      .select('amount')
      .eq('tool_id', tool_id)
      .eq('status', 'success');

    if (aggData && aggData.length > 0) {
      const amounts = aggData.map(r => safeNum(r.amount));
      revenueData = {
        total_transactions: amounts.length,
        total_revenue:      amounts.reduce((s, v) => s + v, 0),
        avg_order_value:    amounts.reduce((s, v) => s + v, 0) / amounts.length,
        highest_payment:    Math.max(...amounts),
        lowest_payment:     Math.min(...amounts),
      };
    }
  }

  // ── 3. Call AI ─────────────────────────────────────────────
  console.log(`[MONETIZATION] Analyzing: ${tool.name}`);
  const prompt = buildPrompt(tool, revenueData);

  const raw    = await callOpenAI(prompt, { temperature: 0.3, max_tokens: 2000 });
  const result = parseJSONResponse(raw);

  // ── 4. Save each strategy to DB ────────────────────────────
  const strategiesToSave = Object.entries(result.strategies || {})
    .filter(([type]) => VALID_STRATEGY_TYPES.has(type));

  let strategiesSaved = 0;

  for (const [strategyType, strategyData] of strategiesToSave) {
    const { error: insertErr } = await supabase
      .from('monetization_strategies')
      .insert({
        tool_id,
        tool_name:            tool.name,
        strategy_type:        strategyType,
        current_revenue:      safeNum(revenueData.total_revenue),
        current_model:        result.current_model_assessment || null,
        recommendation:       strategyData.recommendation || {},
        potential_impact:     strategyData.potential_impact || null,
        confidence_score:     parseInt(strategyData.confidence || 0, 10),
        implementation_steps: strategyData.steps || [],
        status:               'suggested',
      });

    if (insertErr) {
      console.warn(`[MONETIZATION] Failed to save strategy "${strategyType}": ${insertErr.message}`);
    } else {
      strategiesSaved++;
    }
  }

  console.log(`[MONETIZATION] Saved ${strategiesSaved} strategies for ${tool.name}`);

  return {
    success:          true,
    tool_id,
    tool_name:        tool.name,
    revenue_score:    result.revenue_score || 0,
    top_priority:     result.top_priority || null,
    quick_revenue_win: result.quick_revenue_win || null,
    strategies_saved: strategiesSaved,
    current_revenue:  safeNum(revenueData.total_revenue),
    avg_order_value:  safeNum(revenueData.avg_order_value),
    assessment:       result.current_model_assessment || null,
  };
}

/**
 * Create a new A/B pricing experiment for a tool.
 * @param {string} tool_id
 * @param {{ experiment_name, variant_a_price, variant_b_price, variant_a_label?, variant_b_label? }} data
 */
async function createPricingExperiment(tool_id, data) {
  const { experiment_name, variant_a_price, variant_b_price, variant_a_label, variant_b_label } = data;

  if (!experiment_name || typeof experiment_name !== 'string') {
    const err = new Error('experiment_name is required');
    err.code = 'VALIDATION_ERROR'; err.status = 400; throw err;
  }
  if (!(parseFloat(variant_a_price) > 0) || !(parseFloat(variant_b_price) > 0)) {
    const err = new Error('Both prices must be greater than 0');
    err.code = 'VALIDATION_ERROR'; err.status = 400; throw err;
  }

  // Guard: only one running experiment per tool
  const { data: running } = await supabase
    .from('pricing_experiments')
    .select('id, experiment_name')
    .eq('tool_id', tool_id)
    .eq('status', 'running')
    .maybeSingle();

  if (running) {
    const err = new Error(
      `Tool already has a running experiment: "${running.experiment_name}". Conclude it first.`
    );
    err.code = 'EXPERIMENT_RUNNING'; err.status = 409; throw err;
  }

  const { data: created, error } = await supabase
    .from('pricing_experiments')
    .insert({
      tool_id,
      experiment_name:  experiment_name.trim(),
      variant_a_price:  parseFloat(variant_a_price),
      variant_b_price:  parseFloat(variant_b_price),
      variant_a_label:  variant_a_label || 'Control',
      variant_b_label:  variant_b_label || 'Test',
      status:           'running',
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Failed to create experiment');
    err.code = 'DB_ERROR'; err.status = 500; throw err;
  }

  console.log(`[MONETIZATION] Experiment created: ${experiment_name} | tool_id: ${tool_id}`);
  return created;
}

/**
 * Record a page view for a pricing experiment variant.
 * @param {string} experiment_id
 * @param {'A'|'B'} variant
 */
async function recordExperimentView(experiment_id, variant) {
  if (variant !== 'A' && variant !== 'B') {
    const err = new Error('variant must be "A" or "B"');
    err.code = 'VALIDATION_ERROR'; err.status = 400; throw err;
  }

  const column = variant === 'A' ? 'variant_a_views' : 'variant_b_views';

  const { data: current, error: fetchErr } = await supabase
    .from('pricing_experiments')
    .select('id, variant_a_views, variant_b_views')
    .eq('id', experiment_id)
    .maybeSingle();

  if (fetchErr || !current) {
    const err = new Error(`Experiment not found: ${experiment_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }

  const newCount = (current[column] || 0) + 1;

  const { error: updateErr } = await supabase
    .from('pricing_experiments')
    .update({ [column]: newCount })
    .eq('id', experiment_id);

  if (updateErr) throw updateErr;

  return {
    variant_a_views: variant === 'A' ? newCount : current.variant_a_views,
    variant_b_views: variant === 'B' ? newCount : current.variant_b_views,
  };
}

/**
 * Record a conversion for a pricing experiment variant.
 * @param {string} experiment_id
 * @param {'A'|'B'} variant
 */
async function recordExperimentConversion(experiment_id, variant) {
  if (variant !== 'A' && variant !== 'B') {
    const err = new Error('variant must be "A" or "B"');
    err.code = 'VALIDATION_ERROR'; err.status = 400; throw err;
  }

  const column = variant === 'A' ? 'variant_a_conversions' : 'variant_b_conversions';

  const { data: current, error: fetchErr } = await supabase
    .from('pricing_experiments')
    .select('id, variant_a_conversions, variant_b_conversions')
    .eq('id', experiment_id)
    .maybeSingle();

  if (fetchErr || !current) {
    const err = new Error(`Experiment not found: ${experiment_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }

  const newCount = (current[column] || 0) + 1;

  const { error: updateErr } = await supabase
    .from('pricing_experiments')
    .update({ [column]: newCount })
    .eq('id', experiment_id);

  if (updateErr) throw updateErr;

  return {
    variant_a_conversions: variant === 'A' ? newCount : current.variant_a_conversions,
    variant_b_conversions: variant === 'B' ? newCount : current.variant_b_conversions,
  };
}

/**
 * Conclude an A/B experiment, compute winner, and return recommendation.
 * Winner threshold: 5 percentage-point lift to avoid noise.
 * @param {string} experiment_id
 */
async function concludeExperiment(experiment_id) {
  const { data: exp, error: fetchErr } = await supabase
    .from('pricing_experiments')
    .select('*')
    .eq('id', experiment_id)
    .maybeSingle();

  if (fetchErr || !exp) {
    const err = new Error(`Experiment not found: ${experiment_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }
  if (exp.status !== 'running') {
    const err = new Error(`Experiment is already ${exp.status}`);
    err.code = 'INVALID_STATUS'; err.status = 422; throw err;
  }

  const rateA = exp.variant_a_views > 0
    ? (exp.variant_a_conversions / exp.variant_a_views) * 100
    : 0;
  const rateB = exp.variant_b_views > 0
    ? (exp.variant_b_conversions / exp.variant_b_views) * 100
    : 0;

  let winner;
  if (rateB > rateA + 5)  winner = 'B';
  else if (rateA > rateB + 5) winner = 'A';
  else winner = 'tie';

  const { data: updated, error: updateErr } = await supabase
    .from('pricing_experiments')
    .update({ status: 'completed', winner, ended_at: new Date().toISOString() })
    .eq('id', experiment_id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  const winnerLabel = winner === 'A'
    ? exp.variant_a_label
    : winner === 'B'
      ? exp.variant_b_label
      : 'tie';

  const recommendation = winner === 'tie'
    ? 'Results are inconclusive. Gather more data or test a bigger price difference.'
    : `Variant ${winner} (${winnerLabel} — ₹${winner === 'A' ? exp.variant_a_price : exp.variant_b_price}) wins with ${winner === 'A' ? rateA.toFixed(1) : rateB.toFixed(1)}% conversion vs ${winner === 'A' ? rateB.toFixed(1) : rateA.toFixed(1)}%. Implement this price.`;

  console.log(`[MONETIZATION] Experiment concluded: ${exp.experiment_name} → winner=${winner}`);

  return {
    ...updated,
    rate_a:         parseFloat(rateA.toFixed(2)),
    rate_b:         parseFloat(rateB.toFixed(2)),
    winner,
    recommendation,
  };
}

/**
 * Fetch all monetization strategies for a tool, optionally filtered.
 * @param {string} tool_id
 * @param {{ status?: string, strategy_type?: string }} filters
 */
async function getStrategies(tool_id, filters = {}) {
  let query = supabase
    .from('monetization_strategies')
    .select('*')
    .eq('tool_id', tool_id)
    .order('confidence_score', { ascending: false });

  if (filters.status && VALID_STATUSES.includes(filters.status)) {
    query = query.eq('status', filters.status);
  }
  if (filters.strategy_type && VALID_STRATEGY_TYPES.has(filters.strategy_type)) {
    query = query.eq('strategy_type', filters.strategy_type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Update the status of a monetization strategy.
 * Enforces valid status transitions.
 * @param {string} strategy_id
 * @param {string} newStatus
 * @param {string} [notes]
 */
async function updateStrategyStatus(strategy_id, newStatus, notes = null) {
  const { data: strategy, error: fetchErr } = await supabase
    .from('monetization_strategies')
    .select('id, status, tool_name')
    .eq('id', strategy_id)
    .maybeSingle();

  if (fetchErr || !strategy) {
    const err = new Error(`Strategy not found: ${strategy_id}`);
    err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }

  const allowed = STATUS_TRANSITIONS[strategy.status];
  if (!allowed || !allowed.has(newStatus)) {
    const err = new Error(
      `Invalid transition: ${strategy.status} → ${newStatus}. Allowed: ${[...(allowed || [])].join(', ') || 'none'}`
    );
    err.code = 'INVALID_TRANSITION'; err.status = 422; throw err;
  }

  const updates = {
    status:       newStatus,
    result_notes: notes || null,
  };
  if (newStatus === 'testing')     updates.tested_at      = new Date().toISOString();
  if (newStatus === 'implemented') updates.implemented_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from('monetization_strategies')
    .update(updates)
    .eq('id', strategy_id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  console.log(`[MONETIZATION] Strategy ${strategy_id} → ${newStatus}`);
  return updated;
}

/**
 * Fetch all pricing experiments for a tool.
 * @param {string} tool_id
 */
async function getExperiments(tool_id) {
  const { data, error } = await supabase
    .from('pricing_experiments')
    .select('*')
    .eq('tool_id', tool_id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = {
  analyzeMonetization,
  createPricingExperiment,
  recordExperimentView,
  recordExperimentConversion,
  concludeExperiment,
  getStrategies,
  updateStrategyStatus,
  getExperiments,
};
