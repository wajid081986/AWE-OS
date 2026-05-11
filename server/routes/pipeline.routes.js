'use strict';

/**
 * AWE-OS — Pipeline Routes                                   Phase 4B
 *
 * All endpoints require admin authentication.
 *
 * Pipeline definitions:
 *   GET  /api/pipelines                           — list all definitions
 *   GET  /api/pipelines/:pipelineId               — definition detail
 *
 * Execution management:
 *   POST /api/pipelines/:pipelineId/execute       — start a pipeline run (async)
 *   GET  /api/pipelines/executions                — list recent executions
 *   GET  /api/pipelines/executions/active         — currently running executions
 *   GET  /api/pipelines/executions/:executionId   — execution + steps detail
 *   POST /api/pipelines/executions/:id/approve    — approve a paused step
 *   POST /api/pipelines/executions/:id/cancel     — cancel a running pipeline
 *
 * IMPORTANT: Route ordering matters.
 * /executions/* routes are registered BEFORE /:pipelineId so Express matches
 * them correctly. A request to /api/pipelines/executions must NOT match /:pipelineId.
 */

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { orchestrator }    = require('../runtime/PipelineOrchestrator');
const { store }           = require('../runtime/ExecutionStore');
const { listPipelines, getPipeline } = require('../runtime/PipelineDefinitions');
const { validatePipeline } = require('../runtime/PipelineValidator');

const router = express.Router();

// Max 30 pipeline operations per hour per user
const pipelineLimiter = rateLimit({
  windowMs:     60 * 60 * 1000,
  max:          30,
  keyGenerator: req => req.user?.userId || req.ip,
  message:      { success: false, error: 'Too many pipeline requests. Limit: 30/hour.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Execution sub-routes (MUST be registered before /:pipelineId) ─────────────

// GET /api/pipelines/executions — list recent executions (across all pipelines)
router.get('/executions', requireAuth, requireAdmin, async (req, res) => {
  const { pipelineId, limit = '20', status } = req.query;
  try {
    let executions = await store.getExecutionHistory(pipelineId || null, Number(limit));
    if (status) executions = executions.filter(e => e.status === status);
    res.json({ success: true, data: executions, count: executions.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pipelines/executions/active — currently non-terminal executions
router.get('/executions/active', requireAuth, requireAdmin, async (req, res) => {
  try {
    const executions = await store.getActiveExecutions();
    res.json({ success: true, data: executions, count: executions.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pipelines/executions/metrics — aggregate pipeline metrics (24h)
router.get('/executions/metrics', requireAuth, requireAdmin, async (req, res) => {
  const windowHours = Math.min(Number(req.query.hours) || 24, 168); // max 7 days
  try {
    const metrics = await store.getPipelineMetrics(windowHours);
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pipelines/executions/:executionId — execution + steps detail
router.get('/executions/:executionId', requireAuth, requireAdmin, async (req, res) => {
  const { executionId } = req.params;
  try {
    const [execution, steps] = await Promise.all([
      store.getExecution(executionId),
      store.getStepExecutions(executionId),
    ]);
    res.json({ success: true, data: { ...execution, steps } });
  } catch (err) {
    const is404 = err.message.includes('not found') || err.message.includes('not found');
    res.status(is404 ? 404 : 500).json({ success: false, error: err.message });
  }
});

// POST /api/pipelines/executions/:executionId/approve — approve a paused step
router.post('/executions/:executionId/approve', requireAuth, requireAdmin, async (req, res) => {
  const { executionId } = req.params;
  const { stepName }    = req.body;

  if (!stepName || typeof stepName !== 'string') {
    return res.status(400).json({ success: false, error: 'stepName (string) is required in request body' });
  }

  try {
    await orchestrator.approve(executionId, stepName, req.user?.userId || 'admin');
    res.json({
      success:     true,
      executionId,
      message:     `Step "${stepName}" approved — pipeline is resuming asynchronously.`,
      statusUrl:   `/api/pipelines/executions/${executionId}`,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/pipelines/executions/:executionId/cancel — cancel a running pipeline
router.post('/executions/:executionId/cancel', requireAuth, requireAdmin, async (req, res) => {
  const { executionId } = req.params;
  try {
    await orchestrator.cancel(executionId);
    res.json({ success: true, executionId, message: 'Pipeline cancellation requested.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Pipeline definition routes (registered AFTER /executions* routes) ─────────

// GET /api/pipelines — list all pipeline definitions
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const pipelines = listPipelines();
    res.json({ success: true, data: pipelines, count: pipelines.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pipelines/:pipelineId — pipeline definition detail
router.get('/:pipelineId', requireAuth, requireAdmin, (req, res) => {
  const pipeline = getPipeline(req.params.pipelineId);
  if (!pipeline) {
    return res.status(404).json({ success: false, error: `Pipeline not found: "${req.params.pipelineId}"` });
  }

  // Strip fn and autoApproveCondition references — not serializable / not for HTTP
  const safe = {
    ...pipeline,
    steps: pipeline.steps.map(({ fn: _fn, autoApproveCondition: _a, ...rest }) => rest),
  };

  res.json({ success: true, data: safe });
});

// POST /api/pipelines/:pipelineId/execute — start a pipeline execution
router.post('/:pipelineId/execute', requireAuth, requireAdmin, pipelineLimiter, async (req, res) => {
  const { pipelineId }  = req.params;
  const { context = {} } = req.body;

  const pipeline = getPipeline(pipelineId);
  if (!pipeline) {
    return res.status(404).json({ success: false, error: `Pipeline not found: "${pipelineId}"` });
  }

  const { valid, errors } = validatePipeline(pipeline);
  if (!valid) {
    return res.status(400).json({ success: false, error: 'Invalid pipeline definition', details: errors });
  }

  if (typeof context !== 'object' || Array.isArray(context)) {
    return res.status(400).json({ success: false, error: 'context must be a plain object' });
  }

  try {
    const executionId = await orchestrator.execute(
      pipelineId,
      req.user?.userId || 'admin',
      context
    );

    res.status(202).json({
      success:     true,
      executionId,
      pipelineId,
      status:      'queued',
      message:     'Pipeline execution started. The pipeline runs asynchronously — poll the status URL.',
      statusUrl:   `/api/pipelines/executions/${executionId}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
