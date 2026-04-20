const {
  analyzeMonetization,
  createPricingExperiment,
  recordExperimentView,
  recordExperimentConversion,
  concludeExperiment,
  getStrategies:        getStrategiesAgent,
  updateStrategyStatus: updateStrategyStatusAgent,
  getExperiments:       getExperimentsAgent,
} = require('../agents/monetization-agent');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STATUSES       = new Set(['suggested', 'testing', 'implemented', 'rejected']);
const VALID_STRATEGY_TYPES = new Set(['pricing', 'freemium', 'upsell', 'trial', 'bundle']);

const HTTP_STATUS = {
  NOT_FOUND:           404,
  INVALID_STATUS:      422,
  INVALID_TRANSITION:  422,
  VALIDATION_ERROR:    400,
  EXPERIMENT_RUNNING:  409,
  AI_UNAVAILABLE:      503,
  AI_TIMEOUT:          503,
  DB_ERROR:            500,
};

function httpFor(err) {
  return HTTP_STATUS[err.code] || (err.status >= 400 && err.status < 600 ? err.status : 500);
}
function isSafe4xx(err) { const s = httpFor(err); return s >= 400 && s < 500; }

// ── Controllers ───────────────────────────────────────────────

/**
 * POST /api/monetize/analyze/:tool_id
 */
async function analyze(req, res) {
  const { tool_id } = req.params;
  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_ID' });
  }
  try {
    const result = await analyzeMonetization(tool_id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[monetization.controller] analyze:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Monetization analysis failed — check server logs',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * GET /api/monetize/strategies/:tool_id
 * Query: ?status=suggested&type=pricing
 */
async function getStrategies(req, res) {
  const { tool_id } = req.params;
  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_ID' });
  }

  const { status, type } = req.query;
  if (status && !VALID_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      error:   `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}`,
      code:    'INVALID_STATUS',
    });
  }
  if (type && !VALID_STRATEGY_TYPES.has(type)) {
    return res.status(400).json({
      success: false,
      error:   `Invalid type. Must be one of: ${[...VALID_STRATEGY_TYPES].join(', ')}`,
      code:    'INVALID_TYPE',
    });
  }

  try {
    const strategies = await getStrategiesAgent(tool_id, { status, strategy_type: type });
    return res.json({ success: true, data: strategies, count: strategies.length });
  } catch (err) {
    console.error('[monetization.controller] getStrategies:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch strategies', code: 'UNKNOWN' });
  }
}

/**
 * PATCH /api/monetize/strategy/:id/status
 * Body: { status, notes? }
 */
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body || {};

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ success: false, error: 'id must be a valid UUID v4', code: 'INVALID_ID' });
  }
  if (!status) {
    return res.status(400).json({ success: false, error: 'status is required', code: 'MISSING_STATUS' });
  }
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      error:   `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}`,
      code:    'INVALID_STATUS',
    });
  }

  try {
    const updated = await updateStrategyStatusAgent(id, status, notes || null);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[monetization.controller] updateStatus:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to update strategy status',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * POST /api/monetize/experiment
 * Body: { tool_id, experiment_name, variant_a_price, variant_b_price, variant_a_label?, variant_b_label? }
 */
async function createExperiment(req, res) {
  const { tool_id, experiment_name, variant_a_price, variant_b_price, variant_a_label, variant_b_label } = req.body || {};

  if (!tool_id || !UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_ID' });
  }
  if (!experiment_name) {
    return res.status(400).json({ success: false, error: 'experiment_name is required', code: 'MISSING_FIELD' });
  }
  if (!variant_a_price || !variant_b_price) {
    return res.status(400).json({ success: false, error: 'Both variant prices are required', code: 'MISSING_FIELD' });
  }

  try {
    const experiment = await createPricingExperiment(tool_id, {
      experiment_name, variant_a_price, variant_b_price, variant_a_label, variant_b_label,
    });
    return res.status(201).json({ success: true, data: experiment });
  } catch (err) {
    console.error('[monetization.controller] createExperiment:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to create experiment',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * POST /api/monetize/experiment/:id/view
 * Body: { variant }
 */
async function recordView(req, res) {
  const { id }      = req.params;
  const { variant } = req.body || {};

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ success: false, error: 'id must be a valid UUID v4', code: 'INVALID_ID' });
  }
  if (variant !== 'A' && variant !== 'B') {
    return res.status(400).json({ success: false, error: 'variant must be "A" or "B"', code: 'INVALID_VARIANT' });
  }

  try {
    const counts = await recordExperimentView(id, variant);
    return res.json({ success: true, data: counts });
  } catch (err) {
    console.error('[monetization.controller] recordView:', err.message);
    return res.status(httpFor(err)).json({
      success: false, error: isSafe4xx(err) ? err.message : 'Failed to record view', code: err.code || 'UNKNOWN',
    });
  }
}

/**
 * POST /api/monetize/experiment/:id/convert
 * Body: { variant }
 */
async function recordConversion(req, res) {
  const { id }      = req.params;
  const { variant } = req.body || {};

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ success: false, error: 'id must be a valid UUID v4', code: 'INVALID_ID' });
  }
  if (variant !== 'A' && variant !== 'B') {
    return res.status(400).json({ success: false, error: 'variant must be "A" or "B"', code: 'INVALID_VARIANT' });
  }

  try {
    const counts = await recordExperimentConversion(id, variant);
    return res.json({ success: true, data: counts });
  } catch (err) {
    console.error('[monetization.controller] recordConversion:', err.message);
    return res.status(httpFor(err)).json({
      success: false, error: isSafe4xx(err) ? err.message : 'Failed to record conversion', code: err.code || 'UNKNOWN',
    });
  }
}

/**
 * POST /api/monetize/experiment/:id/conclude
 */
async function concludeExp(req, res) {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ success: false, error: 'id must be a valid UUID v4', code: 'INVALID_ID' });
  }

  try {
    const result = await concludeExperiment(id);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[monetization.controller] concludeExp:', err.message);
    return res.status(httpFor(err)).json({
      success: false,
      error:   isSafe4xx(err) ? err.message : 'Failed to conclude experiment',
      code:    err.code || 'UNKNOWN',
    });
  }
}

/**
 * GET /api/monetize/experiments/:tool_id
 */
async function getExperiments(req, res) {
  const { tool_id } = req.params;

  if (!UUID_REGEX.test(tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4', code: 'INVALID_ID' });
  }

  try {
    const experiments = await getExperimentsAgent(tool_id);
    return res.json({ success: true, data: experiments, count: experiments.length });
  } catch (err) {
    console.error('[monetization.controller] getExperiments:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch experiments', code: 'UNKNOWN' });
  }
}

module.exports = {
  analyze, getStrategies, updateStatus,
  createExperiment, recordView, recordConversion,
  concludeExp, getExperiments,
};
