import { Fragment, useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ToolCard        from '../components/ToolCard'
import AdContainer     from '../components/tool-engine/AdContainer'
import Pagination      from '../components/Pagination'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { MOCK_TOOLS }  from './mockTools'
import { TOOL_CATALOGUE } from '../data/toolCatalogue'
import api from '../services/api.service'

const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular' },
  { id: 'new',     label: 'Newest'  },
  { id: 'az',      label: 'A–Z'     },
]
const PER_PAGE = 12

// ── Static tool card for catalogue sections ─────────────────────────────────
function StaticToolCard({ icon, label, to, comingSoon }) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-not-allowed select-none">
        <span className="text-2xl shrink-0 opacity-50" aria-hidden="true">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-400 truncate">{label}</p>
          <p className="text-xs text-gray-300">Coming soon</p>
        </div>
      </div>
    )
  }
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/40 transition-all group"
    >
      <span className="text-2xl shrink-0" aria-hidden="true">{icon}</span>
      <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">{label}</p>
    </Link>
  )
}

// ── Catalogue view for a single category ────────────────────────────────────
function CatalogueView({ catData }) {
  return (
    <div className="space-y-10">
      {catData.sections.map(section => (
        <div key={section.title}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-bold text-gray-900 whitespace-nowrap">{section.title}</h2>
            <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {section.items.map(item => (
              <StaticToolCard key={item.label} {...item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
const TAB_KEYS = ['all', 'pdf', 'calculators', 'converters', 'ai']

const TAB_META = {
  all:         { label: 'All Tools',   icon: '🔧' },
  pdf:         { label: 'PDF Tools',   icon: '📄', catKey: 'pdf'         },
  calculators: { label: 'Calculators', icon: '🧮', catKey: 'calculators' },
  converters:  { label: 'Converters',  icon: '🔄', catKey: 'converters'  },
  ai:          { label: 'AI Tools',    icon: '🤖', catKey: 'ai'          },
}

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tools, setTools]     = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)

  const cat  = searchParams.get('cat')  || 'all'
  const q    = searchParams.get('q')    || ''
  const sort = searchParams.get('sort') || 'popular'

  // Normalize old category keys to new tab keys
  const activeTab = (() => {
    if (cat === 'pdf')         return 'pdf'
    if (cat === 'calculators') return 'calculators'
    if (cat === 'converters')  return 'converters'
    if (cat === 'ai_tools')    return 'ai'
    return 'all'
  })()

  useEffect(() => {
    api.get('/api/tools/public')
      .then(r => setTools(r.data?.data || r.data?.tools || []))
      .catch(() => setTools(MOCK_TOOLS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = tools.length ? tools : MOCK_TOOLS
    if (q) list = list.filter(t =>
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(q.toLowerCase()),
    )
    if (sort === 'new')     list = [...list].sort((a, b) => b.id - a.id)
    else if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else                    list = [...list].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    return list
  }, [tools, q, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageTools  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (!val || val === 'all') p.delete(key)
    else p.set(key, val)
    setSearchParams(p)
    setPage(1)
  }

  const switchTab = (tab) => {
    const p = new URLSearchParams()
    if (tab !== 'all') {
      const catVal = tab === 'ai' ? 'ai_tools' : tab
      p.set('cat', catVal)
    }
    setSearchParams(p)
    setPage(1)
  }

  const tabCatData = activeTab !== 'all' ? TOOL_CATALOGUE[TAB_META[activeTab]?.catKey] : null
  const pageTitle  = TAB_META[activeTab]?.label || 'All Tools'

  return (
    <>
      <Helmet>
        <title>{pageTitle} — AWE-OS Free Online Tools</title>
        <meta name="description" content={`Browse ${pageTitle} on AWE-OS. Free, fast and easy-to-use online tools for everyone.`} />
        <link rel="canonical" href="https://awe-os.com/tools" />
      </Helmet>

      {/* Page hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{pageTitle}</h1>
          <p className="text-gray-500 text-sm">
            {tabCatData
              ? tabCatData.description
              : loading ? 'Loading…' : `${filtered.length} tool${filtered.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Category tabs + search/sort row ──────────────── */}
        <div className="mb-8 pb-4 border-b border-gray-100 space-y-3">
          {/* Tab buttons */}
          <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Tool categories">
            {TAB_KEYS.map(tab => {
              const meta = TAB_META[tab]
              return (
                <button
                  key={tab}
                  role="tab"
                  onClick={() => switchTab(tab)}
                  aria-selected={activeTab === tab}
                  aria-controls="tools-panel"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.label}
                </button>
              )
            })}
          </div>

          {/* Search + sort — only shown for All tab */}
          {activeTab === 'all' && (
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <label htmlFor="tools-search" className="sr-only">Search tools</label>
                <input
                  id="tools-search"
                  type="search" value={q}
                  onChange={e => setFilter('q', e.target.value)}
                  placeholder="Search tools..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="shrink-0">
                <label htmlFor="tools-sort" className="sr-only">Sort tools</label>
                <select
                  id="tools-sort"
                  value={sort}
                  onChange={e => setFilter('sort', e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-full text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Tab panel ─────────────────────────────────────── */}
        <div id="tools-panel" role="tabpanel">

          {/* ── Catalogue view (category tabs) ──────────────── */}
          {tabCatData ? (
            <CatalogueView catData={tabCatData} />
          ) : (
            /* ── All tools API grid ──────────────────────────── */
            loading ? (
              <LoadingSkeleton count={PER_PAGE} type="tool" />
            ) : pageTools.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4" aria-hidden="true">🔍</p>
                <h3 className="text-gray-700 font-semibold text-lg mb-2">No tools found</h3>
                <p className="text-gray-400 text-sm">Try a different keyword.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pageTools.map((tool, idx) => (
                    <Fragment key={tool.id || tool.slug}>
                      <ToolCard tool={tool} />
                      {(idx + 1) % 8 === 0 && idx < pageTools.length - 1 && (
                        <div className="col-span-full flex justify-center">
                          <AdContainer slot="inline" />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
              </>
            )
          )}
        </div>
      </div>
    </>
  )
}
