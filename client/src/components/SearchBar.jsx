import { useState, useRef, useEffect, useId } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar({ tools = [], placeholder = 'Search tools...', className = '' }) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const navigate              = useNavigate()
  const wrapRef               = useRef(null)
  const inputId               = useId()
  const listboxId             = useId()

  const filtered = query.trim().length < 1 ? [] : tools
    .filter(t =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 8)

  const isOpen = open && filtered.length > 0

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = (slug) => {
    setQuery('')
    setOpen(false)
    navigate(`/tools/${slug}`)
  }

  const submit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setOpen(false)
      navigate(`/tools?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <label htmlFor={inputId} className="sr-only">Search tools</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" aria-hidden="true">🔍</span>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setOpen(false) }}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors w-6 h-6 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {filtered.map(t => (
            <li key={t.id || t.slug} role="option" aria-selected="false">
              <button
                onClick={() => go(t.slug)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
              >
                <span className="text-xl shrink-0" aria-hidden="true">{t.icon || '🛠️'}</span>
                <div className="min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{t.name}</p>
                  <p className="text-gray-500 text-xs truncate">{t.description}</p>
                </div>
              </button>
            </li>
          ))}
          <li role="option" aria-selected="false">
            <button
              onClick={submit}
              className="w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100 text-left font-medium transition-colors"
            >
              See all results for &ldquo;{query}&rdquo; →
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
