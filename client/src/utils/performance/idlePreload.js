/**
 * Idle-time route preloading.
 * Uses requestIdleCallback (Chrome/Edge) with setTimeout fallback.
 * Preloads the chunks users are most likely to visit next,
 * without competing with user interactions.
 */
import { preloadToolsPage, preloadCategoryPage } from './preloadRoutes'

const IDLE_TIMEOUT_MS = 2000

export function scheduleIdlePreload(callback) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS })
  } else {
    setTimeout(callback, 1)
  }
}

/**
 * Preload the most-visited routes after the current page is idle.
 * Call this once on the Homepage — the most common entry point.
 */
export function preloadCommonRoutes() {
  scheduleIdlePreload(() => {
    preloadToolsPage().catch(() => {})
    preloadCategoryPage().catch(() => {})
  })
}
