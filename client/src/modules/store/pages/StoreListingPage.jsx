import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import api from '../../../services/api.service'

const SORTS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Popular' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
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

export default function StoreListingPage() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [q, setQ]                   = useState('')
  const [category, setCategory]     = useState('')
  const [sort, setSort]             = useState('newest')
  const [isLoading, setLoading]     = useState(true)

  const limit = 24

  const load = useCallback(async () => {
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
  }, [page, sort, q, category])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get('/api/store/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {})
  }, [])

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  return (
    <div className="min-h-screen bg-gray-900">
      <Helmet>
        <title>Digital Tools Store | AWE-OS Marketplace</title>
        <meta name="description" content="Browse and buy digital templates, tools, and resources from verified creators on AWE-OS." />
      </Helmet>

      <div className="border-b border-gray-800 bg-gray-900 px-6 pt-8 pb-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Digital Tools Store</h1>
          <p className="text-gray-400 text-sm mb-6">Templates, resources &amp; tools from verified sellers</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={q}
              onChange={e => { setPage(1); setQ(e.target.value) }}
              placeholder="Search products..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={category}
              onChange={e => { setPage(1); setCategory(e.target.value) }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={e => { setPage(1); setSort(e.target.value) }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
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
                  className="bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:border-indigo-500 transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="bg-gray-800 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:border-indigo-500 transition-colors"
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
