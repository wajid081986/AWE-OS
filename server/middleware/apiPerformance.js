'use strict';

// Per-route metrics store: path → { count, totalMs, maxMs, slowCount }
const _metrics = new Map();

/**
 * Express middleware that:
 *  - Adds X-Response-Time header to every response
 *  - Tracks per-route latency metrics in memory
 *  - Warns to console when a request exceeds 500ms
 */
function apiPerformance(req, res, next) {
  const start = process.hrtime.bigint();

  const _end = res.end.bind(res);
  res.end = function (...args) {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;

    if (!res.headersSent) {
      try { res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`); } catch (_) {}
    }

    const key   = `${req.method} ${req.route?.path || req.path}`;
    const entry = _metrics.get(key) || { count: 0, totalMs: 0, maxMs: 0, slowCount: 0 };
    entry.count++;
    entry.totalMs += ms;
    if (ms > entry.maxMs) entry.maxMs = ms;
    if (ms > 500) {
      entry.slowCount++;
      console.warn(`[perf] SLOW ${key} — ${ms.toFixed(1)}ms (${res.statusCode})`);
    }
    _metrics.set(key, entry);

    return _end(...args);
  };

  next();
}

function getMetrics() {
  const out = {};
  for (const [key, v] of _metrics) {
    out[key] = {
      count:     v.count,
      avgMs:     +(v.totalMs / v.count).toFixed(1),
      maxMs:     +v.maxMs.toFixed(1),
      slowCount: v.slowCount,
    };
  }
  return out;
}

module.exports = { apiPerformance, getMetrics };
