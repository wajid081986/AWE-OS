/**
 * AWE-OS — usePublicTools hook                                  Phase 5E
 *
 * Shared hook for the public tools list. Both Home and ToolsPage use this —
 * the query cache ensures only ONE network request fires regardless of how
 * many components call it concurrently or sequentially.
 *
 * On second visit the cache provides data synchronously, so the component
 * initializes with tools already in state and skips the skeleton entirely.
 */

import { useState, useEffect, useRef } from 'react'
import { cachedFetch, getSync } from '../lib/queryCache'
import api from '../services/api.service'
import { MOCK_TOOLS } from '../pages/mockTools'

const TOOLS_CACHE_KEY = 'public-tools'
const TOOLS_TTL = 5 * 60 * 1000  // 5 minutes

function fetchTools() {
  return cachedFetch(
    TOOLS_CACHE_KEY,
    () => api.get('/api/tools/public').then(r => {
      const data = r.data?.data || r.data?.tools || []
      return data.length ? data : MOCK_TOOLS
    }),
    TOOLS_TTL
  )
}

export function usePublicTools() {
  // Synchronous cache read — initializes state without a loading flash on repeat visits
  const cached = getSync(TOOLS_CACHE_KEY)
  const [tools, setTools]     = useState(cached)
  const [loading, setLoading] = useState(!cached)
  const mounted               = useRef(true)

  useEffect(() => {
    mounted.current = true
    fetchTools()
      .then(data => { if (mounted.current) { setTools(data); setLoading(false) } })
      .catch(()   => { if (mounted.current) { setTools(MOCK_TOOLS); setLoading(false) } })
    return () => { mounted.current = false }
  }, [])

  return { tools: tools ?? MOCK_TOOLS, loading }
}
