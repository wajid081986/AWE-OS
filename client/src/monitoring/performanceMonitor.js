/**
 * Performance monitoring orchestrator.
 * Call initMonitoring() once at app startup (main.jsx).
 * Idempotent — safe to call multiple times.
 */
import { initWebVitals } from '../utils/performance/webVitals'

let initialized = false

export function initMonitoring() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  if ('PerformanceObserver' in window) {
    initWebVitals()
  }
}
