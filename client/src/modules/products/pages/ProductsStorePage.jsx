import { useState, useEffect } from 'react'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

function Toast({ message, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

export default function ProductsStorePage() {
  const [products, setProducts]   = useState([])
  const [isLoading, setLoading]   = useState(true)
  const [buying, setBuying]       = useState(null)
  const [paying, setPaying]       = useState(false)
  const [purchases, setPurchases] = useState(new Set())
  const [toast, setToast]         = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) return
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/api/products'),
      api.get('/api/products/my-purchases'),
    ])
      .then(([prodRes, purchRes]) => {
        setProducts(prodRes.data.products || [])
        const ids = new Set((purchRes.data.purchases || []).map(p => p.digital_products?.id).filter(Boolean))
        setPurchases(ids)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const startPayment = async () => {
    if (!buying || paying) return
    setPaying(true)
    try {
      const orderRes = await api.post('/api/products/purchase', { productId: buying.id })
      const { orderId, amount, currency } = orderRes.data

      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!rzpKey || !window.Razorpay) {
        showToast('Payment not available', 'error')
        return
      }

      const rzp = new window.Razorpay({
        key:         rzpKey,
        amount,
        currency,
        name:        'AWE-OS',
        description: `Buy ${buying.title}`,
        order_id:    orderId,
        handler: async (response) => {
          try {
            await api.post('/api/products/verify', { ...response, productId: buying.id })
            setPurchases(prev => new Set([...prev, buying.id]))
            showToast(`${buying.title} purchased!`)
            setBuying(null)
          } catch {
            showToast('Verification failed. Contact support.', 'error')
          }
        },
        theme: { color: '#6366f1' },
      })
      rzp.open()
    } catch (err) {
      showToast(err.response?.data?.error || 'Payment failed', 'error')
    } finally {
      setPaying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <p className="text-5xl mb-5">📦</p>
        <h3 className="text-xl font-bold text-white mb-2">No Products Yet</h3>
        <p className="text-gray-400 text-sm max-w-xs">
          Premium templates, courses &amp; resources coming soon.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => {
            const owned = purchases.has(product.id)
            return (
              <div
                key={product.id}
                className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-colors"
              >
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold text-sm leading-tight">{product.title}</h3>
                    <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full shrink-0">
                      {product.category}
                    </span>
                  </div>

                  <p className="text-gray-400 text-xs line-clamp-2 mb-4">{product.description}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-indigo-400">
                      {product.price === 0 ? 'Free' : `₹${product.price}`}
                    </span>
                    <button
                      onClick={() => setBuying(product)}
                      disabled={owned}
                      className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                        owned
                          ? 'bg-green-900 text-green-400 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {owned ? 'Owned' : product.price === 0 ? 'Get Free' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {buying && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-1">{buying.title}</h3>
            <p className="text-gray-400 text-sm mb-1">One-time purchase</p>
            <p className="text-3xl font-bold text-indigo-400 mb-6">₹{buying.price}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setBuying(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startPayment}
                disabled={paying}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {paying ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
