import { useEffect } from 'react'
import { useAnalytics } from './useAnalytics'
import api from '../services/api.service'

const SESSION_PREFIX = 'awe_viewed_tool_'

// Module-level cache — GET /api/tools is fetched once per browser session
// (not per tool-page mount) and reused for every slug→UUID lookup.
// Deliberately NOT /api/tools/public/:slug — that endpoint already has its
// own unconditional, non-atomic usage_count increment on every call; using
// it here would add a second, uncoordinated bump on top of the real
// tool_viewed-driven one this hook fires.
let toolIdMapPromise = null

function getToolIdMap() {
  if (!toolIdMapPromise) {
    toolIdMapPromise = api.get('/api/tools')
      .then(res => {
        const map = new Map()
        for (const t of res.data?.tools || []) map.set(t.slug, t.id)
        return map
      })
      .catch(() => new Map())
  }
  return toolIdMapPromise
}

/**
 * Fires a 'tool_viewed' event once per browser session per tool slug.
 * Fire-and-forget — never throws, never blocks the tool page.
 */
export function useTrackToolView(slug) {
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    if (!slug) return

    const sessionKey = SESSION_PREFIX + slug
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, '1')

    getToolIdMap()
      .then(map => {
        const tool_id = map.get(slug)
        if (tool_id) trackEvent('tool_viewed', { tool_id })
      })
      .catch(() => {})
  }, [slug, trackEvent])
}
