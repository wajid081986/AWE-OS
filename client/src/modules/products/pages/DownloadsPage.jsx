import { useState, useEffect } from 'react'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

export default function DownloadsPage() {
  const [purchases, setPurchases] = useState([])
  const [isLoading, setLoading]   = useState(true)
  const [downloading, setDl]      = useState(null)

  useEffect(() => {
    api.get('/api/products/my-purchases')
      .then(res => setPurchases(res.data.purchases || []))
      .catch(() => setPurchases([]))
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async (productId, productName) => {
    setDl(productId)
    try {
      const res = await api.get(`/api/products/${productId}/download`)
      const a = document.createElement('a')
      a.href = res.data.url
      a.download = productName
      a.rel = 'noopener noreferrer'
      a.click()
    } catch (err) {
      alert(err.response?.data?.error || 'Download failed')
    } finally {
      setDl(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">My Downloads</h1>
        <p className="text-gray-400 text-sm mb-8">Your purchased digital products</p>

        {purchases.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📥</p>
            <h3 className="text-xl font-bold text-white mb-2">No purchases yet</h3>
            <p className="text-gray-400 text-sm">
              Head to the{' '}
              <a href="/dashboard/marketplace" className="text-indigo-400 hover:underline">
                Marketplace
              </a>{' '}
              to find digital products.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map(p => {
              const product = p.digital_products
              if (!product) return null
              return (
                <div
                  key={p.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4"
                >
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{product.name}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {product.category} · Purchased {new Date(p.purchased_at).toLocaleDateString()}
                    </p>
                    {product.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-1">{product.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDownload(product.id, product.name)}
                    disabled={downloading === product.id}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {downloading === product.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>⬇ Download</>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
