import { Fragment, useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ToolCard               from '../components/ToolCard'
import AdContainer            from '../components/tool-engine/AdContainer'
import LoadingSkeleton        from '../components/LoadingSkeleton'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'
import { TOOL_CATALOGUE }     from '../data/toolCatalogue'
import { useInfiniteTools }   from '../hooks/useInfiniteTools'
import { useDebounce }        from '../hooks/useDebounce'
import { SITE_URL }           from '../utils/canonicalUrl'
import { generateWebsiteSchema, generateOrganizationSchema, generateBreadcrumbSchema } from '../utils/schema'

const WEBSITE_SCHEMA = generateWebsiteSchema()
const ORG_SCHEMA = generateOrganizationSchema()
const BREADCRUMB_SCHEMA = generateBreadcrumbSchema([
  { name: 'Home', url: SITE_URL },
  { name: 'Tools', url: `${SITE_URL}/tools` },
])

const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular' },
  { id: 'new',     label: 'Newest'  },
  { id: 'az',      label: 'A–Z'     },
]

// ── Static tool card — memoized so category tabs never re-render needlessly ──
const StaticToolCard = memo(function StaticToolCard({ icon, label, to, comingSoon }) {
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
})

// ── Catalogue section — memoized; rerenders only when catData identity changes ─
const CatalogueView = memo(function CatalogueView({ catData }) {
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
})

// ── Main page ────────────────────────────────────────────────────────────────
const TAB_KEYS = ['all', 'pdf', 'calculators', 'converters', 'ai']

const TAB_META = {
  all:         { label: 'All Tools',   icon: '🔧' },
  pdf:         { label: 'PDF Tools',   icon: '📄', catKey: 'pdf'         },
  calculators: { label: 'Calculators', icon: '🧮', catKey: 'calculators' },
  converters:  { label: 'Converters',  icon: '🔄', catKey: 'converters'  },
  ai:          { label: 'AI Tools',    icon: '🤖', catKey: 'ai'          },
}

// Maps frontend sort values to backend sort param values
const SORT_MAP = { popular: 'popular', new: 'created_at', az: 'az' }

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const cat  = searchParams.get('cat')  || 'all'
  const q    = searchParams.get('q')    || ''
  const sort = searchParams.get('sort') || 'popular'

  // Local controlled input — updates instantly for responsive feel
  const [searchInput, setSearchInput] = useState(q)
  // Debounced value — API call only fires after 300ms of idle typing
  const debouncedSearch = useDebounce(searchInput, 300)
  // Skip the first-mount effect to avoid stomping URL state on load
  const didMount = useRef(false)

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      if (!debouncedSearch) p.delete('q')
      else p.set('q', debouncedSearch)
      return p
    }, { replace: true })
  }, [debouncedSearch, setSearchParams])

  // Normalize old category keys to tab keys
  const activeTab = (() => {
    if (cat === 'pdf')         return 'pdf'
    if (cat === 'calculators') return 'calculators'
    if (cat === 'converters')  return 'converters'
    if (cat === 'ai_tools')    return 'ai'
    return 'all'
  })()

  const setFilter = useCallback((key, val) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      if (!val || val === 'all') p.delete(key)
      else p.set(key, val)
      return p
    })
  }, [setSearchParams])

  const switchTab = useCallback((tab) => {
    const p = new URLSearchParams()
    if (tab !== 'all') {
      p.set('cat', tab === 'ai' ? 'ai_tools' : tab)
    }
    setSearchParams(p)
    setSearchInput('')
  }, [setSearchParams])

  // Infinite-scroll hook — only active on the "all" tab
  const serverSort = SORT_MAP[sort] || 'created_at'
  const { tools, loading, loadMore, loadingMore, hasMore, total } = useInfiniteTools({
    search:  debouncedSearch,
    sort:    serverSort,
    enabled: activeTab === 'all',
  })

  const tabCatData = activeTab !== 'all' ? TOOL_CATALOGUE[TAB_META[activeTab]?.catKey] : null
  const pageTitle  = TAB_META[activeTab]?.label || 'All Tools'
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${pageTitle} — AWE-OS Free Online Tools`,
    description: `Browse ${pageTitle} on AWE-OS. Free, fast and easy-to-use online tools for everyone.`,
    url: `${SITE_URL}/tools`,
    author: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle} — AWE-OS Free Online Tools</title>
        <meta name="description"         content={`Browse ${pageTitle} on AWE-OS. Free, fast and easy-to-use online tools for everyone.`} />
        <link rel="canonical"            href="https://www.awe-os.com/tools" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content={`${pageTitle} — AWE-OS Free Online Tools`} />
        <meta property="og:description"  content={`Browse ${pageTitle} on AWE-OS. Free, fast and easy-to-use online tools for everyone.`} />
        <meta property="og:url"          content="https://www.awe-os.com/tools" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://www.awe-os.com/og-image.png" />
        <meta property="og:image:type"   content="image/png" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content={`${pageTitle} — AWE-OS Free Online Tools`} />
        <meta name="twitter:description" content={`Browse ${pageTitle} on AWE-OS. Free, fast and easy-to-use online tools for everyone.`} />
        <meta name="twitter:image"       content="https://www.awe-os.com/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(BREADCRUMB_SCHEMA)}</script>
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
      </Helmet>

      {/* Page hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{pageTitle}</h1>
          <p className="text-gray-500 text-sm">
            {tabCatData
              ? tabCatData.description
              : loading
                ? 'Loading…'
                : `${total} tool${total !== 1 ? 's' : ''} available`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Intro — shown on All tab for SEO */}
        {activeTab === 'all' && !q && (
          <div className="mb-8 p-6 bg-white rounded-2xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-2">49+ Free Online Tools — No Sign Up Required</h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-2">
              <p>AWE-OS provides free online tools for Indian students, professionals, and small businesses — covering everything from PDF manipulation to financial calculations, format conversion, and AI-powered productivity. Every tool runs entirely in your browser with no software download, no registration, and no fees — ever. Because every tool processes data locally in your browser, your files and personal inputs are never uploaded to a server — everything stays on your device.</p>
              <p>Our <Link to="/tools/pdf" className="text-blue-600 hover:underline">PDF tools</Link> handle merging, splitting, compressing, rotating, and converting documents for the workflows Indian government portals, universities, and corporates require. The <Link to="/tools/calculators" className="text-blue-600 hover:underline">financial calculators</Link> use Indian standards — ₹ format, lakh/crore notation, SEBI SIP formulas, FY 2025-26 income tax slabs, RBI PPF rates, and ICMR BMI thresholds — making them accurate for Indian users.</p>
              <p>The <Link to="/tools/converters" className="text-blue-600 hover:underline">converter and utility tools</Link> handle unit conversion (including Indian land units like bigha and marla), live INR currency rates, QR code generation, secure password creation, JSON formatting, and word counting. <Link to="/tools/ai" className="text-blue-600 hover:underline">AI tools</Link> powered by GPT models generate professional resumes and content drafts in seconds. <Link to="/tools/free" className="text-blue-600 hover:underline">Browse all free tools →</Link></p>
            </div>
          </div>
        )}

        {/* ── Category tabs + search/sort row ──────────────── */}
        <div className="mb-8 pb-4 border-b border-gray-100 space-y-3">
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
                  type="search"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
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

          {tabCatData ? (
            <CatalogueView catData={tabCatData} />
          ) : loading ? (
            <LoadingSkeleton count={6} type="tool" />
          ) : tools.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4" aria-hidden="true">🔍</p>
              <h3 className="text-gray-700 font-semibold text-lg mb-2">No tools found</h3>
              <p className="text-gray-400 text-sm">Try a different keyword.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool, idx) => (
                  <Fragment key={tool.id || tool.slug}>
                    <ToolCard tool={tool} />
                    {(idx + 1) % 8 === 0 && idx < tools.length - 1 && (
                      <div className="col-span-full flex justify-center">
                        <AdContainer slot="inline" />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {hasMore && (
                <InfiniteScrollSentinel onIntersect={loadMore} loading={loadingMore} />
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
