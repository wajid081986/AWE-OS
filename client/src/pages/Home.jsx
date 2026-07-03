import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TOOL_REGISTRY, CATEGORY_META } from '../data/toolRegistry'
import { SITE_URL } from '../utils/canonicalUrl'
import AdContainer from '../components/tool-engine/AdContainer'
import { useToolSearch } from '../hooks/useToolSearch'

// ── Static data ────────────────────────────────────────────────────────────

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')

const SECTION_CONFIG = [
  { key: 'pdf',          label: 'PDF Tools',              chipLabel: 'PDF Tools'    },
  { key: 'calculators',  label: 'Calculators',             chipLabel: 'Calculators'  },
  { key: 'converters',   label: 'Converters & Generators', chipLabel: 'Converters'   },
  { key: 'productivity', label: 'Productivity',            chipLabel: 'Productivity' },
  { key: 'ai',           label: 'AI Tools',                chipLabel: 'AI Tools'     },
]

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AWE-OS',
  url: SITE_URL,
  description: 'Free online tools — PDF, calculators, converters, AI tools. No signup required.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/tools?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AWE-OS',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
}

// ── Sub-components ─────────────────────────────────────────────────────────

function HomeSearch() {
  const { query, setQuery, results, isSearching } = useToolSearch()
  const [activeIdx, setActiveIdx] = useState(-1)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setOpen(isSearching && results.length > 0)
    setActiveIdx(-1)
  }, [results, isSearching])

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      const tool = results[activeIdx]
      window.location.href = tool.path || `/tools/${tool.slug}`
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center bg-white border-2 border-transparent rounded-xl shadow-md focus-within:border-blue-300 transition-colors">
        <svg
          className="ml-4 w-5 h-5 text-gray-400 shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => isSearching && results.length > 0 && setOpen(true)}
          placeholder="Search tools — PDF, calculator, currency..."
          className="flex-1 px-4 py-3.5 bg-transparent text-gray-900 placeholder-gray-400 outline-none text-base"
          aria-label="Search tools"
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
          aria-activedescendant={activeIdx >= 0 ? `search-result-${activeIdx}` : undefined}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className="mr-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
        >
          {results.map((tool, idx) => (
            <li
              key={tool.slug}
              id={`search-result-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
            >
              <Link
                to={tool.path || `/tools/${tool.slug}`}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setOpen(false)}
              >
                <span className="text-xl shrink-0">{tool.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{tool.name}</div>
                  <div className="text-xs text-gray-500 truncate">{tool.description}</div>
                </div>
                <span className="ml-auto text-xs text-gray-400 shrink-0">
                  {CATEGORY_META[tool.category]?.name || ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function HomeToolCard({ tool }) {
  return (
    <Link
      to={tool.path || `/tools/${tool.slug}`}
      className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <span className="text-2xl shrink-0 mt-0.5">{tool.icon}</span>
      <div className="min-w-0">
        <div className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors leading-snug">
          {tool.name}
        </div>
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</div>
      </div>
    </Link>
  )
}

function CategorySection({ section }) {
  const tools = ALL_TOOLS.filter(t => t.category === section.key)
  if (!tools.length) return null

  return (
    <section id={`section-${section.key}`} className="scroll-mt-20">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{section.label}</h2>
        <span className="text-sm text-gray-400">{tools.length} tools</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tools.map(tool => (
          <HomeToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const totalTools = ALL_TOOLS.length

  function scrollToSection(key) {
    const el = document.getElementById(`section-${key}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <Helmet>
        <title>AWE-OS — Free Online Tools. No Signup Required.</title>
        <meta name="description" content={`${totalTools}+ online tools — PDF, calculators, converters, and AI tools. Most need no account and work directly in your browser.`} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title"       content="AWE-OS — Free Online Tools. No Signup Required." />
        <meta property="og:description" content={`${totalTools}+ online tools — PDF, calculators, converters, and AI tools. Most need no account.`} />
        <meta property="og:url"         content={SITE_URL} />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content="AWE-OS — Free Online Tools. No Signup Required." />
        <meta name="twitter:description" content={`${totalTools}+ online tools. Most need no signup.`} />
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight leading-tight">
            {totalTools}+ Tools.<br className="hidden sm:block" /> No Signup for Most. Just Works.
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            PDF tools, calculators, converters, and AI tools — most are free and run right in your browser.
          </p>
          <HomeSearch />
          <Link
            to="/store"
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            🛍️ Visit Store
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-blue-900 text-blue-200 text-sm py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-1">
          <span>{totalTools}+ Tools</span>
          <span>·</span>
          <span>Mostly Free</span>
          <span>·</span>
          <span>No Signup for Most</span>
          <span>·</span>
          <span>Works in Browser</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-10">
          {SECTION_CONFIG.map(s => (
            <button
              key={s.key}
              onClick={() => scrollToSection(s.key)}
              className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {s.chipLabel}
            </button>
          ))}
        </div>

        {/* Top ad */}
        <AdContainer slot="top-banner" />

        {/* Category sections */}
        <div className="space-y-14 mt-8">
          {SECTION_CONFIG.map(s => (
            <CategorySection key={s.key} section={s} />
          ))}
        </div>

        {/* Inline ad */}
        <div className="my-10">
          <AdContainer slot="inline" />
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center py-10 border-t border-gray-100">
          <p className="text-gray-600 text-lg">
            Can't find what you need? We're adding new tools every week.
          </p>
          <Link
            to="/contact"
            className="inline-block mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Request a Tool
          </Link>
        </div>

      </div>
    </>
  )
}
