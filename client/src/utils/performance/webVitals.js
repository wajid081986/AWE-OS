/**
 * Core Web Vitals tracking via native PerformanceObserver.
 * No external SDK. Logs to console in dev only — regressions are
 * caught by the CI-enforced Lighthouse gate, not runtime reporting.
 * Tracks: LCP, FID, CLS, FCP, TTFB.
 */

// Good / needs-improvement / poor thresholds (Google definitions)
const THRESHOLDS = {
  LCP:  [2500, 4000],
  FID:  [100,  300 ],
  INP:  [200,  500 ],
  CLS:  [0.1,  0.25],
  FCP:  [1800, 3000],
  TTFB: [800,  1800],
}

function getRating(name, value) {
  const [good, poor] = THRESHOLDS[name] || [Infinity, Infinity]
  return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor'
}

function send(name, value) {
  const rating = getRating(name, value)
  if (import.meta.env.DEV) {
    const color = rating === 'good' ? '#22c55e' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444'
    console.log(`%c[WebVital] ${name}`, `color:${color};font-weight:bold`, Math.round(value), `(${rating})`)
  }
}

function observe(type, callback, buffered = true) {
  try {
    new PerformanceObserver((list) => callback(list.getEntries()))
      .observe({ type, buffered })
  } catch {
    // Browser doesn't support this entry type — skip silently
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  // Largest Contentful Paint — report final entry
  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1]
    if (last) send('LCP', last.startTime)
  })

  // First Input Delay — report processing delay
  observe('first-input', (entries) => {
    const entry = entries[0]
    if (entry) send('FID', entry.processingStart - entry.startTime)
  })

  // Cumulative Layout Shift — accumulate sessions
  let clsValue = 0
  observe('layout-shift', (entries) => {
    for (const entry of entries) {
      if (!entry.hadRecentInput) clsValue += entry.value
    }
    send('CLS', clsValue)
  })

  // First Contentful Paint
  observe('paint', (entries) => {
    const fcp = entries.find(e => e.name === 'first-contentful-paint')
    if (fcp) send('FCP', fcp.startTime)
  })

  // Time to First Byte — from navigation entry
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav?.responseStart) send('TTFB', nav.responseStart)
  } catch {
    // Ignore
  }
}
