import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedFetch } from '../lib/queryCache'
import api from '../services/api.service'

const DEFAULT_LIMIT = 20
const CACHE_TTL     = 2 * 60 * 1_000 // 2 min for paginated results

async function fetchToolPage({ search, sort, page }) {
  const params = new URLSearchParams()
  params.set('page',  page)
  params.set('limit', DEFAULT_LIMIT)
  if (search) params.set('search', search)
  if (sort)   params.set('sort',   sort)

  const cacheKey = `tools-page:${params.toString()}`
  return cachedFetch(cacheKey, async () => {
    const res = await api.get(`/api/tools/public?${params}`)
    return res.data
  }, CACHE_TTL)
}

/**
 * Server-side paginated + searchable tools hook with infinite-scroll support.
 *
 * @param {object} opts
 * @param {string}  opts.search   - Search term (debounced before passing in)
 * @param {string}  opts.sort     - 'popular' | 'created_at' | 'az'
 * @param {boolean} opts.enabled  - Set false to skip fetching (e.g. on category tabs)
 *
 * @returns {{ tools, loading, loadMore, loadingMore, hasMore, total }}
 */
export function useInfiniteTools({ search = '', sort = 'created_at', enabled = true } = {}) {
  const [pages,      setPages]      = useState([])
  const [loading,    setLoading]    = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pagination, setPagination] = useState(null)

  const paramsRef = useRef({ search, sort })
  const pageRef   = useRef(1)
  const mounted   = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Re-fetch from page 1 whenever search/sort/enabled changes
  useEffect(() => {
    if (!enabled) {
      setPages([])
      setPagination(null)
      setLoading(false)
      return
    }

    paramsRef.current = { search, sort }
    pageRef.current   = 1
    setPages([])
    setPagination(null)
    setLoading(true)

    fetchToolPage({ search, sort, page: 1 })
      .then(result => {
        if (!mounted.current) return
        setPages([result.data || []])
        setPagination(result.pagination || null)
        setLoading(false)
      })
      .catch(() => {
        if (!mounted.current) return
        setPages([[]])
        setLoading(false)
      })
  }, [search, sort, enabled])

  const loadMore = useCallback(async () => {
    if (!pagination || pageRef.current >= pagination.totalPages) return
    if (loadingMore) return

    const nextPage = pageRef.current + 1
    setLoadingMore(true)
    try {
      const result = await fetchToolPage({ ...paramsRef.current, page: nextPage })
      if (!mounted.current) return
      pageRef.current = nextPage
      setPages(prev => [...prev, result.data || []])
      setPagination(result.pagination || null)
    } catch (_) {}
    if (mounted.current) setLoadingMore(false)
  }, [pagination, loadingMore])

  return {
    tools:       pages.flat(),
    loading,
    loadMore,
    loadingMore,
    hasMore:     pagination ? pageRef.current < pagination.totalPages : false,
    total:       pagination?.total ?? 0,
  }
}
