import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TOOL_REGISTRY, CATEGORY_META } from '../../../data/toolRegistry'
import { useToolSearch } from '../../../hooks/useToolSearch'
import { Chip, Ledger, Container, Button } from '../../../components/primitives'

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')

function HeroSearch() {
  const navigate = useNavigate()
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
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function goToResult(tool) {
    setOpen(false)
    navigate(tool.path || `/tools/${tool.slug}`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (activeIdx >= 0 && results[activeIdx]) {
      goToResult(results[activeIdx])
      return
    }
    const q = query.trim()
    if (q) navigate(`/tools?q=${encodeURIComponent(q)}`)
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative mb-6">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex items-center bg-card border-[1.5px] border-line rounded-callout shadow-card p-1 pl-[length:var(--searchbar-padding-left)]"
        style={{ maxWidth: 'var(--searchbar-max-width)' }}
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="shrink-0 text-ink-soft" aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => isSearching && results.length > 0 && setOpen(true)}
          placeholder={`Try "merge pdf", "GST", "SIP", "resume"…`}
          aria-label={`Search ${ALL_TOOLS.length} tools`}
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
          aria-activedescendant={activeIdx >= 0 ? `hero-search-result-${activeIdx}` : undefined}
          className="flex-1 min-w-0 border-none outline-none bg-transparent text-ink py-3 px-3"
        />
        <Button type="submit" size="compact">Search</Button>
      </form>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-line rounded-m shadow-float z-modal max-h-80 overflow-y-auto"
          style={{ maxWidth: 'var(--searchbar-max-width)' }}
        >
          {results.map((tool, idx) => (
            <li key={tool.slug} id={`hero-search-result-${idx}`} role="option" aria-selected={idx === activeIdx}>
              <button
                type="button"
                onClick={() => goToResult(tool)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-micro ${idx === activeIdx ? 'bg-cobalt-tint' : 'hover:bg-paper'}`}
              >
                <span className="text-xl shrink-0" aria-hidden="true">{tool.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink text-sm">{tool.name}</span>
                  <span className="block text-xs text-ink-soft truncate">{tool.description}</span>
                </span>
                <span className="ml-auto text-xs text-ink-soft shrink-0">
                  {CATEGORY_META[tool.category]?.name || ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BrowserFrame({ totalTools }) {
  return (
    <div
      className="bg-card border-[1.5px] border-line rounded-2xl shadow-[var(--shadow-browser)] overflow-hidden"
      aria-label="How AWE-OS processes your files locally"
    >
      <div className="flex items-center gap-2 py-3 px-4 border-b border-line bg-[color:var(--browser-bar-bg)]">
        <span className="w-2.5 h-2.5 rounded-full bg-line" aria-hidden="true" />
        <span className="w-2.5 h-2.5 rounded-full bg-line" aria-hidden="true" />
        <span className="w-2.5 h-2.5 rounded-full bg-line" aria-hidden="true" />
        <span
          className="flex-1 flex items-center rounded-md bg-paper text-ink-soft text-[length:var(--text-browser-url)] py-[length:var(--browser-url-padding-y)] px-3"
          style={{ gap: 'var(--browser-url-gap)' }}
        >
          <span className="text-mint" aria-hidden="true">🔒</span>
          awe-os.com/tools/merge-pdf — running locally
        </span>
      </div>

      <div className="pt-[length:var(--browser-body-padding-top)] px-6 pb-6">
        <div className="flex items-center justify-between gap-1.5 mb-6">
          <div className="text-center flex-1">
            <div
              className="ds-flow-node ds-flow-node--1 grid place-items-center mx-auto mb-[length:var(--flow-icon-margin-bottom)] rounded-[length:var(--radius-flow-icon)] bg-cobalt-tint text-cobalt text-[length:var(--text-flow-icon)]"
              style={{ width: 'var(--flow-icon-size)', height: 'var(--flow-icon-size)' }}
              aria-hidden="true"
            >
              📄
            </div>
            <div className="font-semibold text-[length:var(--text-flow-label)] text-ink">Your file</div>
            <div className="text-[length:var(--text-flow-sub)] text-ink-soft">opens on your device</div>
          </div>

          <div className="flex-none pb-[length:var(--flow-arrow-padding-bottom)] text-line text-[length:var(--text-flow-arrow)]" aria-hidden="true">→</div>

          <div className="text-center flex-1">
            <div
              className="ds-flow-node ds-flow-node--2 grid place-items-center mx-auto mb-[length:var(--flow-icon-margin-bottom)] rounded-[length:var(--radius-flow-icon)] bg-marigold-tint text-marigold text-[length:var(--text-flow-icon)]"
              style={{ width: 'var(--flow-icon-size)', height: 'var(--flow-icon-size)' }}
              aria-hidden="true"
            >
              ⚙️
            </div>
            <div className="font-semibold text-[length:var(--text-flow-label)] text-ink">Processed in-browser</div>
            <div className="text-[length:var(--text-flow-sub)] text-ink-soft">JavaScript, on your CPU</div>
          </div>

          <div className="flex-none pb-[length:var(--flow-arrow-padding-bottom)] text-line text-[length:var(--text-flow-arrow)]" aria-hidden="true">→</div>

          <div className="text-center flex-1">
            <div
              className="ds-flow-node ds-flow-node--3 grid place-items-center mx-auto mb-[length:var(--flow-icon-margin-bottom)] rounded-[length:var(--radius-flow-icon)] bg-mint-tint text-mint text-[length:var(--text-flow-icon)]"
              style={{ width: 'var(--flow-icon-size)', height: 'var(--flow-icon-size)' }}
              aria-hidden="true"
            >
              ⬇️
            </div>
            <div className="font-semibold text-[length:var(--text-flow-label)] text-ink">Instant download</div>
            <div className="text-[length:var(--text-flow-sub)] text-ink-soft">never touched a server</div>
          </div>
        </div>

        <Ledger
          rows={[
            { label: 'Tools available', value: String(totalTools) },
            { label: 'Signup required (most tools)', value: 'NO', highlight: true },
            { label: 'Your files stored on our servers', value: '0 — ever', highlight: true },
          ]}
        />
      </div>
    </div>
  )
}

export default function Hero() {
  const totalTools = ALL_TOOLS.length

  return (
    <section className="pt-[length:var(--hero-padding-top)] pb-16 relative overflow-hidden">
      <Container className="grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-8 md:gap-14 items-center">
        <div>
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            Free · No signup for most · Made for India
          </span>

          <h1 className="ds-h1 text-ink mb-5">
            Online tools that{' '}
            <span className="[box-shadow:inset_0_var(--hero-underline-offset)_0_var(--marigold-tint)] [border-bottom:var(--hero-underline-width)_solid_var(--marigold)]">
              never upload
            </span>{' '}
            your files.
          </h1>

          <p className="text-[length:var(--text-hero-sub)] text-ink-soft max-w-[length:var(--hero-sub-max-width)] mb-7">
            {totalTools}+ free utilities for PDFs, Indian taxes and investments, images, and documents — all processed directly in your browser. Your files stay on your device, always.
          </p>

          <HeroSearch />

          <div className="flex flex-wrap gap-2.5">
            <Chip icon="✓">100% browser-based</Chip>
            <Chip icon="✓">No file uploads</Chip>
            <Chip icon="✓">India-first calculators</Chip>
            <Chip icon="✓">Works offline*</Chip>
          </div>
        </div>

        <BrowserFrame totalTools={totalTools} />
      </Container>
    </section>
  )
}
