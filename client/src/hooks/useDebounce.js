/**
 * AWE-OS — useDebounce                                          Phase 5E
 *
 * Delays updating the returned value until `delay` ms after the last change.
 * Used to prevent triggering expensive operations (URL updates, API calls,
 * useMemo recalculations) on every keystroke.
 */

import { useState, useEffect } from 'react'

/**
 * @param {any}    value - value to debounce
 * @param {number} delay - delay in ms (default 300)
 * @returns debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
