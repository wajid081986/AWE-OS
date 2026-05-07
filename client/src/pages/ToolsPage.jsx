import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ToolCard        from '../components/ToolCard'
import AdBanner        from '../components/AdBanner'
import Pagination      from '../components/Pagination'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { MOCK_TOOLS }  from './mockTools'
import api from '../services/api.service'

const CATEGORIES = [
  { id: 'all',         label: 'All Tools'   },
  { id: 'ai_tools',    label: 'AI Tools'    },
  { id: 'converters',  label: 'Converters'  },
  { id: 'calculators', label: 'Calculators' },
  { id: 'products',    label: 'Products'    },
]
const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular'  },
  { id: 'new',     label: 'Newest'   },
  { id: 'az',      label: 'A–Z'      },
]
const PER_PAGE = 12

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tools, setTools]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)

  const cat  = searchParams.get('cat')  || 'all'
  const q    = searchParams.get('q')    || ''
  const sort = searchParams.get('sort') || 'popular'

  useEffect(() => {
    api.get('/api/tools/public')
      .then(r => setTools(r.data?.data || r.data?.tools || []))
      .catch(() => setTools(MOCK_TOOLS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = tools.length ? tools : MOCK_TOOLS
    if (cat !== 'all') list = list.filter(t => t.category === cat)
    if (q) list = list.filter(t =>
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(q.toLowerCase()),
    )
    if (sort === 'new')     list = [...list].sort((a, b) => b.id - a.id)
    else if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else                    list = [...list].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    return list
  }, [tools, cat, q, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageTools  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val === 'all' || !val) p.delete(key)
    else p.set(key, val)
    setSearchParams(p)
    setPage(1)
  }

  const catLabel = CATEGORIES.find(c => c.id === cat)?.label || 'All Tools'

  return (
    <>
      <Helmet>
        <title>{catLabel} — AWE-OS Free Online Tools</title>
        <meta name="description" content={`Browse ${catLabel} on AWE-OS. Free, fast and easy-to-use online tools for everyone.`} />
        <link rel="canonical" href="https://awe-os.com/tools" />
      </Helmet>

      {/* Page header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">All Tools</h1>
          <p className="text-gray-500 text-sm">
            {loading ? 'Loading…' : `${filtered.length} tool${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter + search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setFilter('cat', c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  cat === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Sort + search — push right on desktop */}
          <div className="flex gap-2 sm:ml-auto">
            <input
              type="text"
              value={q}
              onChange={e => setFilter('q', e.target.value)}
              placeholder="Search tools..."
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            <select
              value={sort}
              onChange={e => setFilter('sort', e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Tools grid with ad injection */}
        {loading ? (
          <LoadingSkeleton count={PER_PAGE} type="tool" />
        ) : pageTools.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <h3 className="text-gray-700 font-semibold text-lg mb-2">No tools found</h3>
            <p className="text-gray-400 text-sm">Try a different keyword or category.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageTools.map((tool, idx) => (
                <>
                  <ToolCard key={tool.id || tool.slug} tool={tool} />
                  {/* Ad after every 8 tools */}
                  {(idx + 1) % 8 === 0 && idx < pageTools.length - 1 && (
                    <div key={`ad-${idx}`} className="col-span-full flex justify-center">
                      <AdBanner size="leaderboard" />
                    </div>
                  )}
                </>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); window.scrollTo(0,0) }} />
          </>
        )}
      </div>
    </>
  )
}
