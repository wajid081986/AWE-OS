'use strict';

/**
 * AWE-OS — MemoryProfiler                                      Phase 4F
 *
 * Monitors heap growth and alerts when memory exceeds thresholds.
 * Takes periodic snapshots and computes growth rate.
 * Sampling interval: every 30 seconds.
 */

const { createLogger } = require('./logger');

const log = createLogger('memory-profiler');

const SAMPLE_INTERVAL_MS = 30_000;
const MAX_SAMPLES        = 120;  // 1 hour of history at 30s intervals

const WARN_HEAP_MB  = Number(process.env.MEM_WARN_MB  || 500);
const CRIT_HEAP_MB  = Number(process.env.MEM_CRIT_MB  || 800);

class MemoryProfiler {
  constructor() {
    this._samples  = [];   // { ts, heapUsedMb, heapTotalMb, rssMb, externalMb }
    this._timer    = null;
    this._alertedWarn = false;
    this._alertedCrit = false;
  }

  start() {
    if (this._timer) return;
    this._capture(); // immediate first sample
    this._timer = setInterval(() => this._capture(), SAMPLE_INTERVAL_MS);
    this._timer.unref();
    log.info('MemoryProfiler started', { warnMb: WARN_HEAP_MB, critMb: CRIT_HEAP_MB });
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  /**
   * Latest memory snapshot.
   */
  current() {
    return this._samples.length ? this._samples[this._samples.length - 1] : this._snapshot();
  }

  /**
   * Growth rate in MB/min over last N samples (default: last 10 = 5 min).
   */
  growthRateMbPerMin(windowSamples = 10) {
    const samples = this._samples.slice(-windowSamples);
    if (samples.length < 2) return 0;

    const first = samples[0];
    const last  = samples[samples.length - 1];
    const deltaMb   = last.heapUsedMb - first.heapUsedMb;
    const deltaMin  = (last.ts - first.ts) / 60_000;
    if (deltaMin === 0) return 0;

    return Math.round((deltaMb / deltaMin) * 100) / 100;
  }

  /**
   * Return last N samples for charting.
   */
  history(limit = 60) {
    return this._samples.slice(-limit);
  }

  /**
   * Stats snapshot for diagnostics endpoint.
   */
  getStats() {
    const cur = this.current();
    return {
      current:       cur,
      growthMbPerMin: this.growthRateMbPerMin(),
      sampleCount:   this._samples.length,
      thresholds:    { warnMb: WARN_HEAP_MB, critMb: CRIT_HEAP_MB },
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _capture() {
    const snap = this._snapshot();
    this._samples.push(snap);
    if (this._samples.length > MAX_SAMPLES) this._samples.shift();

    const heap = snap.heapUsedMb;

    if (heap >= CRIT_HEAP_MB && !this._alertedCrit) {
      this._alertedCrit = true;
      log.error('CRITICAL: heap exceeds threshold', { heapMb: heap, thresholdMb: CRIT_HEAP_MB });
    } else if (heap < CRIT_HEAP_MB) {
      this._alertedCrit = false;
    }

    if (heap >= WARN_HEAP_MB && !this._alertedWarn) {
      this._alertedWarn = true;
      log.warn('Heap elevated', { heapMb: heap, thresholdMb: WARN_HEAP_MB });
    } else if (heap < WARN_HEAP_MB) {
      this._alertedWarn = false;
    }
  }

  _snapshot() {
    const m = process.memoryUsage();
    return {
      ts:          Date.now(),
      heapUsedMb:  Math.round(m.heapUsed  / 1_048_576),
      heapTotalMb: Math.round(m.heapTotal / 1_048_576),
      rssMb:       Math.round(m.rss       / 1_048_576),
      externalMb:  Math.round(m.external  / 1_048_576),
    };
  }
}

// Process-singleton
const memoryProfiler = new MemoryProfiler();

module.exports = { MemoryProfiler, memoryProfiler };
