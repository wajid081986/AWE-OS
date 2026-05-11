/**
 * Hover-triggered prefetch hook.
 * Returns event handlers that trigger a preload function on first hover/focus.
 * Safe to call multiple times — preload fires only once per instance.
 *
 * Usage:
 *   const prefetch = usePrefetch(() => import('../pages/PricingPage'))
 *   <Link to="/pricing" {...prefetch}>Pricing</Link>
 */
import { useCallback, useRef } from 'react'

export function usePrefetch(preloadFn) {
  const prefetched = useRef(false)

  const trigger = useCallback(() => {
    if (prefetched.current) return
    prefetched.current = true
    try {
      preloadFn()
    } catch {
      // Prefetch failure is not fatal — ignore
    }
  }, [preloadFn])

  return {
    onMouseEnter: trigger,
    onFocus:      trigger,
    onTouchStart: trigger,
  }
}
