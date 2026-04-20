const {
  analyzeTool,
  getSuggestions,
  applySuggestion: applyS,
  dismissSuggestion: dismissS,
  analyzeAllLiveTools,
} = require('../agents/optimization-agent');

/**
 * POST /api/optimize/analyze/:tool_id
 * Run AI optimization analysis for a tool
 */
const analyzeToolCtrl = async (req, res) => {
  try {
    const { tool_id } = req.params;
    if (!tool_id) {
      return res.status(400).json({
        success: false,
        error: 'tool_id is required'
      });
    }
    const result = await analyzeTool(tool_id);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[OPT CONTROLLER] analyzeTool error:', err.message);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: err.message,
        code: 'NOT_FOUND'
      });
    }
    if (err.code === 'INVALID_STATUS') {
      return res.status(422).json({
        success: false,
        error: err.message,
        code: 'INVALID_STATUS'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Optimization analysis failed',
      code: 'ANALYSIS_FAILED'
    });
  }
};

/**
 * GET /api/optimize/suggestions/:tool_id
 * Fetch optimization suggestions for a tool
 */
const getSuggestionsCtrl = async (req, res) => {
  try {
    const { tool_id } = req.params;
    const { status, type } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (type)   filters.optimization_type = type;
    const result = await getSuggestions(tool_id, filters);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[OPT CONTROLLER] getSuggestions error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestions'
    });
  }
};

/**
 * PATCH /api/optimize/suggestion/:id/apply
 * Mark suggestion as applied
 */
const applySuggestionCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const result = await applyS(id, notes);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[OPT CONTROLLER] applySuggestion error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to apply suggestion'
    });
  }
};

/**
 * PATCH /api/optimize/suggestion/:id/dismiss
 * Dismiss a suggestion
 */
const dismissSuggestionCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const result = await dismissS(id, notes);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[OPT CONTROLLER] dismissSuggestion error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to dismiss suggestion'
    });
  }
};

/**
 * POST /api/optimize/run-all
 * Run optimization analysis for all live tools
 */
const runAll = async (req, res) => {
  try {
    const result = await analyzeAllLiveTools();
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[OPT CONTROLLER] runAll error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to run optimization scan'
    });
  }
};

module.exports = {
  analyzeTool:       analyzeToolCtrl,
  getSuggestions:    getSuggestionsCtrl,
  applySuggestion:   applySuggestionCtrl,
  dismissSuggestion: dismissSuggestionCtrl,
  runAll,
};
