import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

function Toast({ message, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

function isLoggedIn() {
  return !!localStorage.getItem('awe_token')
}

export default function StoreProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct]   = useState(null)
  const [reviews, setReviews]   = useState([])
  const [notFound, setNotFound] = useState(false)
  const [isLoading, setLoading] = useState(true)
  const [order, setOrder]       = useState(null) // matching completed purchase, if any
  const [paying, setPaying]     = useState(false)
  const [downloading, setDl]    = useState(false)
  const [wishlisted, setWish]   = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [toast, setToast]       = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/store/products/${slug}`)
      setProduct(res.data.product)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.get(`/api/store/products/${slug}/reviews`)
      .then(res => setReviews(res.data.reviews || []))
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    if (!product || !isLoggedIn()) return
    api.get('/api/store/orders/my')
      .then(res => {
        const match = (res.data.orders || []).find(o => o.digital_products?.id === product.id)
        if (match) setOrder(match)
      })
      .catch(() => {})
  }, [product])

  const startPayment = async () => {
    if (!isLoggedIn()) { window.location.href = '/login'; return }
    setPaying(true)
    try {
      const orderRes = await api.post('/api/store/orders', { productId: product.id })
      const { orderId, amount, currency } = orderRes.data

      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!rzpKey || !window.Razorpay) {
        showToast('Payment not available', 'error')
        return
      }

      const rzp = new window.Razorpay({
        key: rzpKey, amount, currency,
        name: 'AWE-OS', description: `Buy ${product.title}`, order_id: orderId,
        handler: async (response) => {
          try {
            await api.post('/api/store/orders/verify', response)
            showToast(`${product.title} purchased!`)
            const res = await api.get('/api/store/orders/my')
            const match = (res.data.orders || []).find(o => o.digital_products?.id === product.id)
            if (match) setOrder(match)
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

  const handleDownload = async () => {
    if (!order) return
    setDl(true)
    try {
      const tokenRes = await api.post(`/api/store/downloads/${order.id}/token`)
      const dlRes = await api.get(`/api/store/downloads/${tokenRes.data.token}`)
      const a = document.createElement('a')
      a.href = dlRes.data.url
      a.rel = 'noopener noreferrer'
      a.click()
    } catch (err) {
      showToast(err.response?.data?.error || 'Download failed', 'error')
    } finally {
      setDl(false)
    }
  }

  const toggleWishlist = async () => {
    if (!isLoggedIn()) { window.location.href = '/login'; return }
    try {
      if (wishlisted) {
        await api.delete(`/api/store/wishlist/${product.id}`)
        setWish(false)
      } else {
        await api.post(`/api/store/wishlist/${product.id}`)
        setWish(true)
      }
    } catch {
      showToast('Failed to update wishlist', 'error')
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setSubmittingReview(true)
    try {
      await api.post(`/api/store/products/${product.id}/reviews`, reviewForm)
      showToast('Review submitted')
      const res = await api.get(`/api/store/products/${slug}/reviews`)
      setReviews(res.data.reviews || [])
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit review', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Spinner /></div>
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center px-4">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-white mb-2">Product not found</h1>
        <Link to="/store" className="text-indigo-400 hover:underline text-sm">Back to Store</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Helmet>
        <title>{product.title} | AWE-OS Store</title>
        <meta name="description" content={product.description?.slice(0, 155)} />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.title} className="w-full rounded-xl border border-gray-700 mb-6" />
          ) : (
            <div className="w-full h-64 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center mb-6">
              <span className="text-6xl">📦</span>
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-2">{product.title}</h1>
          {product.store_sellers?.display_name && (
            <p className="text-gray-400 text-sm mb-4">
              by <span className="text-indigo-400">{product.store_sellers.display_name}</span>
            </p>
          )}
          <p className="text-gray-300 text-sm whitespace-pre-wrap mb-6">{product.description}</p>

          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {product.tags.map(t => (
                <span key={t} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          )}

          <div className="border-t border-gray-800 pt-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Reviews {product.rating_count > 0 && <span className="text-yellow-400 text-sm">★ {product.rating_avg} ({product.rating_count})</span>}
            </h2>

            {order && (
              <form onSubmit={submitReview} className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">Your rating:</span>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n} type="button"
                      onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                      className={n <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-600'}
                    >★</button>
                  ))}
                </div>
                <input
                  placeholder="Title (optional)"
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
                <textarea
                  placeholder="Write a review..."
                  rows={3}
                  value={reviewForm.body}
                  onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-500 text-sm">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className="text-gray-500 text-xs">{r.users?.name || 'Anonymous'}</span>
                    </div>
                    {r.title && <p className="text-white text-sm font-medium">{r.title}</p>}
                    {r.body && <p className="text-gray-400 text-sm">{r.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sticky top-6">
            <p className="text-3xl font-bold text-indigo-400 mb-4">
              {product.price === 0 ? 'Free' : `₹${product.price}`}
            </p>

            {order ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors mb-3"
              >
                {downloading ? 'Preparing...' : '⬇ Download'}
              </button>
            ) : (
              <button
                onClick={startPayment}
                disabled={paying}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors mb-3"
              >
                {paying ? 'Processing...' : 'Buy Now'}
              </button>
            )}

            <button
              onClick={toggleWishlist}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition-colors"
            >
              {wishlisted ? '♥ Wishlisted' : '♡ Add to Wishlist'}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
