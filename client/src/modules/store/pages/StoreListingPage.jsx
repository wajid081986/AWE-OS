import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import api from '../../../services/api.service'

const PRIMARY_SORTS = [
  { value: 'newest',  label: 'Browse New' },
  { value: 'popular', label: 'Browse Bestsellers' },
]

const SECONDARY_SORTS = [
  { value: 'rating',     label: 'Top Rated' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

// Keyword → emoji lookup for category cards. Falls back to a generic box
// for anything unmatched (e.g. the default 'General' category) — purely
// presentational, no icon library dependency.
const ICON_RULES = [
  [/template/i,          '📄'],
  [/kit/i,                '🧩'],
  [/bundle|pack/i,        '🧰'],
  [/extension|plugin/i,   '🧷'],
  [/agent|bot/i,          '🤖'],
  [/api/i,                '🔌'],
  [/mobile|app/i,         '📱'],
]

function categoryIcon(name) {
  const rule = ICON_RULES.find(([re]) => re.test(String(name || '')))
  return rule ? rule[1] : '📦'
}

function titleCase(str) {
  return String(str || '').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ProductCard({ product }) {
  return (
    <Link
      to={`/store/${product.slug}`}
      className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-colors block"
    >
      {product.thumbnail_url ? (
        <img src={product.thumbnail_url} alt={product.title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
          <span className="text-4xl">📦</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">{product.title}</h3>
          <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full shrink-0">
            {product.category}
          </span>
        </div>
        {product.store_sellers?.display_name && (
          <p className="text-gray-500 text-xs mb-2">by {product.store_sellers.display_name}</p>
        )}
        {product.rating_count > 0 && (
          <p className="text-yellow-400 text-xs mb-2">★ {product.rating_avg} ({product.rating_count})</p>
        )}
        <p className="text-gray-400 text-xs line-clamp-2 mb-4">{product.description}</p>
        <span className="text-xl font-bold text-indigo-400">
          {product.price === 0 ? 'Free' : `₹${product.price}`}
        </span>
      </div>
    </Link>
  )
}

function CategoryCard({ category, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col items-center gap-3 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/10 hover:border-teal-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="w-14 h-14 rounded-xl bg-teal-500/10 text-teal-400 grid place-items-center text-2xl">
        {categoryIcon(category)}
      </span>
      <span className="text-white font-semibold text-sm">{titleCase(category)}</span>
      <span className="text-xs font-medium bg-teal-900/40 text-teal-300 px-2.5 py-0.5 rounded-full">
        {count} item{count === 1 ? '' : 's'}
      </span>
    </button>
  )
}

export default function StoreListingPage() {
  const [view, setView]             = useState('categories') // 'categories' | 'products'
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [q, setQ]                   = useState('')
  const [category, setCategory]     = useState('')
  const [sort, setSort]             = useState('newest')
  const [isLoading, setLoading]     = useState(true)

  const limit = 24

  const load = useCallback(async () => {
    if (view !== 'products') return
    setLoading(true)
    try {
      const params = { page, limit, sort }
      if (q) params.q = q
      if (category) params.category = category
      const res = await api.get('/api/store/products', { params })
      setProducts(res.data.products || [])
      setTotal(res.data.total || 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [view, page, sort, q, category])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/api/store/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [])

  // Empty catalog (no categories yet) — skip straight to the flat product
  // list instead of showing an empty category grid.
  useEffect(() => {
    if (!categoriesLoading && categories.length === 0 && view === 'categories') {
      setView('products')
    }
  }, [categoriesLoading, categories, view])

  const openCategory = (cat) => {
    setCategory(cat)
    setPage(1)
    setView('products')
  }

  const openAllProducts = () => {
    setCategory('')
    setPage(1)
    setView('products')
  }

  const backToCategories = () => {
    setView('categories')
    setCategory('')
    setQ('')
    setPage(1)
  }

  const handleLandingSearch = (e) => {
    const val = e.target.value
    setQ(val)
    setPage(1)
    if (val) setView('products')
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const secondarySortValue = SECONDARY_SORTS.some(s => s.value === sort) ? sort : ''
  const totalProducts = categories.reduce((sum, c) => sum + (c.count || 0), 0)
  const categoryCount = categories.length

  return (
    <div className="min-h-screen bg-gray-900">
      <Helmet>
        <title>Digital Tools Store | AWE-OS Marketplace</title>
        <meta name="description" content="Browse and buy digital templates, tools, and resources from verified creators on AWE-OS." />
      </Helmet>

      <div className="border-b border-gray-800 bg-gray-900 px-6 pt-8 pb-6">
        <div className="max-w-6xl mx-auto">
          {view === 'categories' ? (
            <div className="text-center max-w-2xl mx-auto py-6">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/30 rounded-full py-1.5 px-3.5 mb-4">
                ✓ Verified sellers · Instant download
              </span>

              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
                Digital products, ready to use.
              </h1>
              <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto mb-8">
                Templates, UI kits, and tools from verified sellers — download instantly, no subscriptions.
              </p>

              <div className="relative max-w-xl mx-auto mb-6 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors pointer-events-none">
                  <SearchIcon />
                </span>
                <input
                  value={q}
                  onChange={handleLandingSearch}
                  placeholder={`Try "UI kit", "Notion template", "bundle"…`}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-5 py-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {totalProducts >= 6 && (
                <p className="text-gray-500 text-sm">
                  <span className="text-teal-400 font-semibold">{totalProducts}</span> products ·{' '}
                  <span className="text-teal-400 font-semibold">{categoryCount}</span> categories
                </p>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={backToCategories}
                className="text-teal-400 hover:text-teal-300 text-sm font-medium mb-4 transition-colors"
              >
                ← All Categories
              </button>
              <h1 className="text-3xl font-bold text-white mb-1">
                {category ? titleCase(category) : 'All Products'}
              </h1>
              <p className="text-gray-400 text-sm mb-6">{total} product{total === 1 ? '' : 's'}</p>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  value={q}
                  onChange={e => { setPage(1); setQ(e.target.value) }}
                  placeholder={category ? `Search ${titleCase(category)}...` : 'Search products...'}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <select
                  value={secondarySortValue}
                  onChange={e => { if (e.target.value) { setPage(1); setSort(e.target.value) } }}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="" disabled>Sort: More ▾</option>
                  {SECONDARY_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                {PRIMARY_SORTS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setPage(1); setSort(s.value) }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      sort === s.value
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {view === 'categories' ? (
          categoriesLoading ? (
            <div className="py-24"><Spinner /></div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-4">Browse by Category</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {categories.map(c => (
                  <CategoryCard
                    key={c.category}
                    category={c.category}
                    count={c.count}
                    onClick={() => openCategory(c.category)}
                  />
                ))}
              </div>
              <div className="text-center mt-8">
                <button
                  onClick={openAllProducts}
                  className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
                >
                  View all products →
                </button>
              </div>
            </>
          )
        ) : isLoading ? (
          <div className="py-24"><Spinner /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">📦</p>
            <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
            <p className="text-gray-400 text-sm">Try a different search or category.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:border-teal-500 transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:border-teal-500 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
