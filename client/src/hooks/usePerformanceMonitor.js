/**
 * AWE-OS — Performance Monitoring                               Phase 5E
 *
 * Lightweight render timing + Web Vitals tracking.
 *
 * Usage:
 *   // Track slow renders of a component:
 *   useRenderTimer('ToolsPage')
 *
 *   // Observe Web Vitals once at app root:
 *   useWebVitals()
 *
 *   // Inspect at runtime:
 *   window.__awe_perf?.getReport()
 */

import { useEffect, useRef } from 'react'

const IS_DEV = import.meta.env.DEV

// ── Central metrics store ─────────────────────────────────────────────────────

const _renderTimes = {}   // componentName → number[]
const _apiTimes    = {}   // endpoint → { calls, totalMs, errors }
const _webVitals   = {}   // metric name → value

export const PerformanceMonitor = {
  trackRender(name, ms) {
    if (!_renderTimes[name]) _renderTimes[name] = []
    _renderTimes[name].push(ms)
    if (_renderTimes[name].length > 50) _renderTimes[name].shift()
  },

  trackApiCall(endpoint, ms, ok) {
    const m = _apiTimes[endpoint] ??= { calls: 0, totalMs: 0, errors: 0 }
    m.calls++
    m.totalMs += ms
    if (!ok) m.errors++
  },

  recordWebVital(name, value) {
    _webVitals[name] = value
  },

  getReport() {
    const renderSummary = {}
    for (const [k, times] of Object.entries(_renderTimes)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      renderSummary[k] = {
        avg:   parseFloat(avg.toFixed(2)),
        max:   parseFloat(Math.max(...times).toFixed(2)),
        count: times.length,
      }
    }
    const apiSummary = {}
    for (const [ep, m] of Object.entries(_apiTimes)) {
      apiSummary[ep] = {
        calls:   m.calls,
        avgMs:   parseFloat((m.totalMs / m.calls).toFixed(2)),
        errors:  m.errors,
      }
    }
    return { renders: renderSummary, api: apiSummary, webVitals: { ..._webVitals } }
  },

  expose() {
    if (typeof window !== 'undefined') window.__awe_perf = this
  },
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

const SLOW_RENDER_THRESHOLD_MS = 16  // one frame at 60fps

/**
 * Tracks how long each render of a component takes.
 * Logs to console in dev mode when over threshold.
 * No-op in production.
 */
export function useRenderTimer(componentName) {
  const startRef = useRef(0)
  startRef.current = performance.now()  // runs every render

  useEffect(() => {
    const ms = performance.now() - startRef.current
    PerformanceMonitor.trackRender(componentName, ms)
    if (IS_DEV && ms > SLOW_RENDER_THRESHOLD_MS) {
      console.debug(`[Perf] <${componentName}> render: ${ms.toFixed(1)}ms`)
    }
  })
}

/**
 * Observes browser Web Vitals (FCP, LCP, CLS) via PerformanceObserver.
 * Call once in the app root (e.g., providers.jsx).
 */
export function useWebVitals() {
  useEffect(() => {
    PerformanceMonitor.expose()
    if (!('PerformanceObserver' in window)) return

    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const value = entry.startTime ?? entry.processingStart ?? entry.duration
        PerformanceMonitor.recordWebVital(entry.name ?? entry.entryType, value)
        if (IS_DEV) {
          console.debug(`[Vitals] ${entry.name ?? entry.entryType}: ${value.toFixed(1)}ms`)
        }
      }
    })

    try {
      obs.observe({ type: 'paint',                    buffered: true })
      obs.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (_) {}

    return () => obs.disconnect()
  }, [])
}
