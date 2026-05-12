'use strict';

/**
 * AWE-OS — Runtime Observability Routes                      Phase 4D
 *
 * Real-time monitoring and diagnostics endpoints.
 * All require admin authentication.
 *
 *   GET /api/runtime/metrics    — live in-memory runtime metrics snapshot
 *   GET /api/runtime/active     — currently running/queued/paused executions
 *   GET /api/runtime/stalled    — executions in stalled state
 *   GET /api/runtime/failures   — recent failed executions (24h)
 *   GET /api/runtime/queue      — queue depth and concurrency stats
 *   GET /api/runtime/audit/:id  — audit trail for a specific execution
 */

const express  = require('express');
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware');
const { store }          = require('../runtime/ExecutionStore');
const { metrics }        = require('../monitoring/runtimeMetrics');
const { stallDetector }  = require('../runtime/StallDetector');
const { executionQueue } = require('../runtime/ExecutionQueue');
const { auditTrail }     = require('../monitoring/auditTrail');
const { healthEngine }   = require('../runtime/reliability/HealthEngine');
const { getAllStats: getAllCircuitStats } = require('../runtime/reliability/CircuitBreaker');
const { backpressureManager } = require('../runtime/reliability/BackpressureManager');
const dlq                = require('../runtime/reliability/DeadLetterQueue');
const { collectWarnings } = require('../monitoring/diagnostics');
const { memoryProfiler }  = require('../monitoring/memoryProfiler');
const { executionProfiler } = require('../monitoring/executionProfiler');
const supabase           = require('../db/supabase');

const router = express.Router();

// ── GET /api/runtime/metrics ──────────────────────────────────────────────────
router.get('/metrics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [snapshot, dbMetrics] = await Promise.allSettled([
      Promise.resolve(metrics.getSnapshot()),
      store.getPipelineMetrics(24),
    ]);

    res.json({
      success: true,
      data: {
        live:     snapshot.status === 'fulfilled' ? snapshot.value : null,
        db24h:    dbMetrics.status === 'fulfilled' ? dbMetrics.value : null,
        queue:    executionQueue.getMetrics(),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/active ───────────────────────────────────────────────────
router.get('/active', requireAuth, requireAdmin, async (req, res) => {
  try {
    const executions = await store.getActiveExecutions();
    res.json({
      success: true,
      data:    executions,
      count:   executions.length,
      queue:   executionQueue.getQueuedItems(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/stalled ──────────────────────────────────────────────────
router.get('/stalled', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stalledExecs  = await stallDetector.getStalledExecutions();
    const stalledSteps  = await store.getStalledSteps(5 * 60_000);

    res.json({
      success: true,
      data: {
        executions: stalledExecs,
        steps:      stalledSteps,
      },
      counts: {
        executions: stalledExecs.length,
        steps:      stalledSteps.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/failures ─────────────────────────────────────────────────
router.get('/failures', requireAuth, requireAdmin, async (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 24, 168);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  try {
    const since = new Date(Date.now() - hours * 60 * 60_000).toISOString();

    const { data, error } = await supabase
      .from('pipeline_executions')
      .select('id, pipeline_id, status, error_message, started_at, completed_at, triggered_by')
      .in('status', ['failed', 'timed_out', 'stalled'])
      .gte('created_at', since)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      success: true,
      data:    data ?? [],
      count:   (data ?? []).length,
      windowHours: hours,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/queue ────────────────────────────────────────────────────
router.get('/queue', requireAuth, requireAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        ...executionQueue.getMetrics(),
        items: executionQueue.getQueuedItems(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/audit/:executionId ───────────────────────────────────────
router.get('/audit/:executionId', requireAuth, requireAdmin, async (req, res) => {
  const { executionId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const entries = await auditTrail.getAuditLog(executionId, limit);
    res.json({ success: true, data: entries, count: entries.length, executionId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/health ───────────────────────────────────────────────────
router.get('/health', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [health, warnings] = await Promise.all([
      healthEngine.assess(),
      collectWarnings(),
    ]);
    res.json({ success: true, data: { ...health, warnings } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/diagnostics ─────────────────────────────────────────────
router.get('/diagnostics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [warnings, memStats, execStats, cbStats, bpStats] = await Promise.allSettled([
      collectWarnings(),
      Promise.resolve(memoryProfiler.getStats()),
      Promise.resolve(executionProfiler.getStats()),
      Promise.resolve(getAllCircuitStats()),
      Promise.resolve(backpressureManager.getStats()),
    ]);

    res.json({
      success: true,
      data: {
        warnings:       warnings.status === 'fulfilled' ? warnings.value : [],
        memory:         memStats.status  === 'fulfilled' ? memStats.value : null,
        executions:     execStats.status === 'fulfilled' ? execStats.value : null,
        circuitBreakers: cbStats.status  === 'fulfilled' ? cbStats.value  : [],
        backpressure:   bpStats.status   === 'fulfilled' ? bpStats.value  : null,
        generatedAt:    new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/runtime/dlq ──────────────────────────────────────────────────────
router.get('/dlq', requireAuth, requireAdmin, async (req, res) => {
  const limit     = Math.min(Number(req.query.limit) || 50, 200);
  const status    = req.query.status || 'dead';
  const pipelineId = req.query.pipelineId || null;

  try {
    const [entries, summary] = await Promise.all([
      dlq.list({ limit, status, pipelineId }),
      dlq.getSummary(),
    ]);
    res.json({ success: true, data: entries, summary, count: entries.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/runtime/dlq/:id/replay ─────────────────────────────────────────
router.post('/dlq/:id/replay', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const actorId = req.user?.id || 'admin';

  try {
    const result = await dlq.replay(id, actorId);
    const status = result.success ? 200 : 400;
    res.status(status).json({ success: result.success, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/runtime/dlq/:id ───────────────────────────────────────────────
router.delete('/dlq/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await dlq.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
