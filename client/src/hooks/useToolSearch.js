import { useState, useEffect, useMemo } from 'react'
import { TOOL_REGISTRY, CATEGORY_META } from '../data/toolRegistry'

const SEARCHABLE = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')

export function useToolSearch() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    if (!query.trim()) { setDebounced(''); return }
    const timer = setTimeout(() => setDebounced(query.trim()), 150)
    return () => clearTimeout(timer)
  }, [query])

  const results = useMemo(() => {
    const q = debounced.toLowerCase()
    if (!q) return []
    return SEARCHABLE
      .map(t => {
        const name    = t.name.toLowerCase()
        const desc    = (t.description || '').toLowerCase()
        const tags    = (t.tags || []).join(' ').toLowerCase()
        const catName = (CATEGORY_META[t.category]?.name || '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q) && !tags.includes(q) && !catName.includes(q)) return null
        let score = 0
        if (name.startsWith(q))          score = 4
        else if (name.includes(` ${q}`)) score = 3
        else if (name.includes(q))       score = 2
        else if (tags.includes(q))       score = 1
        return { ...t, _score: score }
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8)
  }, [debounced])

  return { query, setQuery, results, isSearching: debounced.length > 0 }
}
