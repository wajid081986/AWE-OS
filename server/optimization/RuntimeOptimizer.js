'use strict';

/**
 * AWE-OS — RuntimeOptimizer                                    Phase 5D
 *
 * Monitors the live runtime for bottlenecks, anomalies, and optimization signals.
 * Subscribes to EventBus pipeline events and tracks latencies, error bursts,
 * queue congestion, and memory growth in a rolling window.
 *
 * Detection capabilities:
 *   - slow_pipeline:     pipeline executions above latency threshold
 *   - slow_step:         individual step latency spikes
 *   - error_burst:       N+ failures in a short window
 *   - retry_spike:       unusually high retry rate
 *   - queue_congestion:  execution queue depth approaching limit
 *   - memory_growth:     heap growing faster than expected
 *
 * Each detected event is:
 *   1. Stored in optimization_events (DB, async)
 *   2. Emitted on EventBus for real-time subscriptions
 *   3. Fed to OptimizationRecommender for recommendation generation
 *
 * Does NOT modify any runtime config — detection only.
 */

const { createLogger } = require('../monitoring/logger');

const log = createLogger('runtime-optimizer');

// Detection thresholds
const THRESHOLDS = Object.freeze({
  SLOW_PIPELINE_MS:    120_000,   // pipelines > 2 minutes
  SLOW_STEP_MS:        60_000,    // steps > 1 minute
  ERROR_BURST_COUNT:   5,         // 5 failures in burst window
  ERROR_BURST_WINDOW:  5 * 60_000, // 5 minutes
  RETRY_SPIKE_RATE:    0.40,      // 40% retry rate
  QUEUE_CONGESTION_PCT: 75,       // queue ≥ 75% capacity
  MEMORY_GROWTH_MB_MIN: 5,        // heap growing >5 MB/min
  LATENCY_SPIKE_MULT:  3,         // 3× baseline = spike
});

const WINDOW_SIZE = 100;  // rolling window for stats

class RuntimeOptimizer {
  constructor() {
    this._bus = null;

    // Rolling metric windows (sliding, capped at WINDOW_SIZE)
    this._pipelineLatencies = [];   // { id, ms, ts }
    this._stepLatencies     = new Map();   // agentName → []
    this._recentErrors      = [];   // { agentName, ts }
    this._recentRetries     = [];   // { agentName, ts }

    // Baseline stats (computed from window)
    this._baselines = {};

    // Detected events (in-memory, capped at 200)
    this._events = [];

    this._initialized = false;
    this._ticker = null;
  }

  /**
   * Wire to EventBus. Called once at startup.
   */
  init(bus) {
    if (this._initialized) return;
    this._initialized = true;
    this._bus = bus;

    // Subscribe to pipeline lifecycle events
    bus.subscribe('pipeline.completed', p => this._onPipelineCompleted(p));
    bus.subscribe('pipeline.failed',    p => this._onPipelineFailed(p));
    bus.subscribe('step.completed',     p => this._onStepCompleted(p));
    bus.subscribe('step.failed',        p => this._onStepFailed(p));
    bus.subscribe('step.retrying',      p => this._onStepRetried(p));

    // Periodic analysis tick every 60 seconds
    this._ticker = setInterval(() => this._analyze(), 60_000);
    if (this._ticker.unref) this._ticker.unref();

    log.info('RuntimeOptimizer initialized');
  }

  shutdown() {
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
  }

  /**
   * Get current bottleneck summary.
   */
  getBottlenecks() {
    const now = Date.now();
    return this._events
      .filter(e => !e.resolved && (now - new Date(e.detectedAt).getTime()) < 30 * 60_000)
      .sort((a, b) => {
        const sev = { critical: 3, warning: 2, info: 1 };
        return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
      });
  }

  /**
   * Get recent optimization events (resolved + unresolved).
   */
  getEvents(limit = 50) {
    return this._events.slice(0, limit);
  }

  /**
   * Mark an event as resolved (called by AutonomousTuner after applying fix).
   */
  resolveEvent(eventId, resolution) {
    const ev = this._events.find(e => e.eventId === eventId);
    if (!ev) return;
    ev.resolved = true;
    ev.resolution = resolution;
    ev.resolvedAt = new Date().toISOString();
    this._updateEventInDB(ev).catch(() => {});
  }

  getStats() {
    const latencies = this._pipelineLatencies.map(e => e.ms);
    const avg = latencies.length
      ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
      : null;

    return {
      windowSize:         this._pipelineLatencies.length,
      avgPipelineMs:      avg,
      activeBottlenecks:  this.getBottlenecks().length,
      totalEventsDetected: this._events.length,
      thresholds: THRESHOLDS,
    };
  }

  // ── EventBus handlers ─────────────────────────────────────────────────────────

  _onPipelineCompleted(payload) {
    const ms = payload?.durationMs ?? 0;
    if (!ms) return;

    this._pipelineLatencies.push({ id: payload.executionId, ms, ts: Date.now() });
    if (this._pipelineLatencies.length > WINDOW_SIZE) this._pipelineLatencies.shift();

    if (ms > THRESHOLDS.SLOW_PIPELINE_MS) {
      this._detect({
        eventType:   'slow_pipeline',
        targetType:  'pipeline',
        targetId:    payload.pipelineId ?? payload.executionId,
        severity:    ms > THRESHOLDS.SLOW_PIPELINE_MS * 2 ? 'critical' : 'warning',
        value:       ms,
        threshold:   THRESHOLDS.SLOW_PIPELINE_MS,
        context:     { executionId: payload.executionId, pipelineId: payload.pipelineId, durationMs: ms },
      });
    }
  }

  _onPipelineFailed(payload) {
    const agentName = payload?.agentName ?? 'unknown';
    this._recentErrors.push({ agentName, ts: Date.now() });
    this._pruneWindow(this._recentErrors, THRESHOLDS.ERROR_BURST_WINDOW);

    const burstCount = this._recentErrors.filter(e => e.agentName === agentName).length;
    if (burstCount >= THRESHOLDS.ERROR_BURST_COUNT) {
      this._detect({
        eventType:  'error_burst',
        targetType: 'pipeline',
        targetId:   payload.pipelineId ?? payload.executionId,
        severity:   'critical',
        value:      burstCount,
        threshold:  THRESHOLDS.ERROR_BURST_COUNT,
        context:    { agentName, burstCount, window: '5min' },
      });
    }
  }

  _onStepCompleted(payload) {
    const agent = payload?.agentName;
    const ms    = payload?.durationMs;
    if (!agent || !ms) return;

    if (!this._stepLatencies.has(agent)) this._stepLatencies.set(agent, []);
    const window = this._stepLatencies.get(agent);
    window.push(ms);
    if (window.length > WINDOW_SIZE) window.shift();

    if (ms > THRESHOLDS.SLOW_STEP_MS) {
      const avg = window.reduce((s, v) => s + v, 0) / window.length;
      this._detect({
        eventType:  'slow_step',
        targetType: 'step',
        targetId:   agent,
        severity:   ms > THRESHOLDS.SLOW_STEP_MS * 3 ? 'critical' : 'warning',
        value:      ms,
        threshold:  THRESHOLDS.SLOW_STEP_MS,
        context:    { agentName: agent, durationMs: ms, avgMs: Math.round(avg) },
      });
    }
  }

  _onStepFailed(payload) {
    const agent = payload?.agentName ?? 'unknown';
    this._recentErrors.push({ agentName: agent, ts: Date.now() });
    this._pruneWindow(this._recentErrors, THRESHOLDS.ERROR_BURST_WINDOW);
  }

  _onStepRetried(payload) {
    const agent = payload?.agentName ?? 'unknown';
    this._recentRetries.push({ agentName: agent, ts: Date.now() });
    this._pruneWindow(this._recentRetries, THRESHOLDS.ERROR_BURST_WINDOW);

    const retryCount = this._recentRetries.filter(e => e.agentName === agent).length;
    const totalCount = this._recentErrors.filter(e => e.agentName === agent).length
                     + this._recentRetries.filter(e => e.agentName === agent).length;

    if (totalCount > 0 && (retryCount / totalCount) >= THRESHOLDS.RETRY_SPIKE_RATE) {
      this._detect({
        eventType:  'retry_spike',
        targetType: 'step',
        targetId:   agent,
        severity:   'warning',
        value:      Math.round((retryCount / totalCount) * 100),
        threshold:  THRESHOLDS.RETRY_SPIKE_RATE * 100,
        context:    { agentName: agent, retries: retryCount, total: totalCount },
      });
    }
  }

  // ── Periodic analysis ─────────────────────────────────────────────────────────

  _analyze() {
    this._checkQueueCongestion();
    this._checkMemoryGrowth();
  }

  _checkQueueCongestion() {
    try {
      const { executionQueue } = require('../runtime/ExecutionQueue');
      const m = executionQueue.getMetrics?.() ?? {};
      if ((m.utilizationPct ?? 0) >= THRESHOLDS.QUEUE_CONGESTION_PCT) {
        this._detect({
          eventType:  'queue_congestion',
          targetType: 'queue',
          targetId:   'execution_queue',
          severity:   m.utilizationPct >= 90 ? 'critical' : 'warning',
          value:      m.utilizationPct,
          threshold:  THRESHOLDS.QUEUE_CONGESTION_PCT,
          context:    m,
        });
      }
    } catch (_) {}
  }

  _checkMemoryGrowth() {
    try {
      const { memoryProfiler } = require('../monitoring/memoryProfiler');
      const s = memoryProfiler.getStats?.();
      if (s?.growthMbPerMin >= THRESHOLDS.MEMORY_GROWTH_MB_MIN) {
        this._detect({
          eventType:  'memory_growth',
          targetType: 'system',
          targetId:   'heap',
          severity:   s.growthMbPerMin >= THRESHOLDS.MEMORY_GROWTH_MB_MIN * 2 ? 'critical' : 'warning',
          value:      s.growthMbPerMin,
          threshold:  THRESHOLDS.MEMORY_GROWTH_MB_MIN,
          context:    s,
        });
      }
    } catch (_) {}
  }

  // ── Detection pipeline ────────────────────────────────────────────────────────

  _detect(event) {
    // Deduplicate: don't re-emit the same event type+target within 5 minutes
    const dedupKey = `${event.eventType}:${event.targetId}`;
    const recent   = this._events.find(e => !e.resolved
      && `${e.eventType}:${e.targetId}` === dedupKey
      && (Date.now() - new Date(e.detectedAt).getTime()) < 5 * 60_000
    );
    if (recent) return;

    const { v4: uuidv4 } = require('uuid');
    const fullEvent = {
      eventId:    uuidv4(),
      ...event,
      resolved:   false,
      detectedAt: new Date().toISOString(),
    };

    this._events.unshift(fullEvent);
    if (this._events.length > 200) this._events.pop();

    // Emit on EventBus for real-time subscriptions
    this._bus?.emit('optimization.bottleneck.detected', fullEvent, { source: 'runtime-optimizer', persist: false });

    log.info('Bottleneck detected', {
      type:     event.eventType,
      target:   event.targetId,
      severity: event.severity,
      value:    event.value,
    });

    // Persist asynchronously
    setImmediate(() => this._persistEvent(fullEvent).catch(() => {}));
  }

  _pruneWindow(arr, windowMs) {
    const cutoff = Date.now() - windowMs;
    while (arr.length > 0 && arr[0].ts < cutoff) arr.shift();
  }

  async _persistEvent(event) {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('optimization_events').insert({
        event_type:  event.eventType,
        target_type: event.targetType,
        target_id:   event.targetId ?? null,
        severity:    event.severity,
        value:       event.value    ?? null,
        threshold:   event.threshold ?? null,
        context:     event.context  ?? {},
        detected_at: event.detectedAt,
      });
    } catch (_) {}
  }

  async _updateEventInDB(event) {
    try {
      const supabase = require('../db/supabase');
      await supabase.from('optimization_events')
        .update({ resolved: true, resolved_at: event.resolvedAt, resolution: event.resolution })
        .eq('event_type', event.eventType)
        .eq('target_id', event.targetId ?? null)
        .eq('detected_at', event.detectedAt);
    } catch (_) {}
  }
}

const runtimeOptimizer = new RuntimeOptimizer();

module.exports = { RuntimeOptimizer, runtimeOptimizer, THRESHOLDS };
