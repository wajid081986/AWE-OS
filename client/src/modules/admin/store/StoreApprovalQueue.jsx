import { useState, useEffect } from 'react'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

const CURRENCY_SYMBOL = { INR: '₹', USD: '$' }

export default function StoreApprovalQueue() {
  const [products, setProducts] = useState([])
  const [isLoading, setLoading] = useState(true)
  const [acting, setActing]     = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason]     = useState('')
  const [priceEdits, setPriceEdits] = useState({})
  const [savingPrice, setSavingPrice] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/api/store/admin/products/pending')
      .then(res => setProducts(res.data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const priceEditFor = (p) => priceEdits[p.id] || { price: String(p.price), currency: p.currency || 'INR' }

  const setPriceEdit = (p, patch) => {
    setPriceEdits(prev => ({ ...prev, [p.id]: { ...priceEditFor(p), ...patch } }))
  }

  const priceEditDirty = (p) => {
    const edit = priceEditFor(p)
    return edit.price !== String(p.price) || edit.currency !== (p.currency || 'INR')
  }

  const savePrice = async (p) => {
    const edit = priceEditFor(p)
    const price = Number(edit.price)
    if (!Number.isFinite(price) || price < 0) { alert('Enter a valid non-negative price'); return }

    setSavingPrice(p.id)
    try {
      const res = await api.put(`/api/store/admin/products/${p.id}/price`, { price, currency: edit.currency })
      const updated = res.data.product
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, price: updated.price, currency: updated.currency } : item))
      setPriceEdits(prev => { const next = { ...prev }; delete next[p.id]; return next })
    } catch (err) {
      alert(err.response?.data?.error || 'Price update failed')
    } finally {
      setSavingPrice(null)
    }
  }

  const approve = async (id) => {
    setActing(id)
    try {
      await api.post(`/api/store/admin/products/${id}/approve`)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Approval failed')
    } finally {
      setActing(null)
    }
  }

  const reject = async (id) => {
    setActing(id)
    try {
      await api.post(`/api/store/admin/products/${id}/reject`, { reason })
      setProducts(prev => prev.filter(p => p.id !== id))
      setRejecting(null)
      setReason('')
    } catch (err) {
      alert(err.response?.data?.error || 'Rejection failed')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Store Approvals</h1>
        <p className="text-gray-400 text-sm mb-8">{products.length} product{products.length !== 1 ? 's' : ''} pending review</p>

        {isLoading ? (
          <div className="py-16"><Spinner /></div>
        ) : products.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">No pending products. All caught up.</p>
        ) : (
          <div className="space-y-4">
            {products.map(p => (
              <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold">{p.title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      by {p.store_sellers?.display_name || 'Platform'} · {p.category}
                    </p>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">{p.description}</p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{CURRENCY_SYMBOL[priceEditFor(p).currency]}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceEditFor(p).price}
                        onChange={e => setPriceEdit(p, { price: e.target.value })}
                        className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <select
                        value={priceEditFor(p).currency}
                        onChange={e => setPriceEdit(p, { currency: e.target.value })}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                      </select>
                      {priceEditDirty(p) && (
                        <button
                          onClick={() => savePrice(p)}
                          disabled={savingPrice === p.id}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {savingPrice === p.id ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                  {p.thumbnail_url && (
                    <img src={p.thumbnail_url} alt={p.title} className="w-20 h-20 object-cover rounded-lg shrink-0" />
                  )}
                </div>

                {rejecting === p.id ? (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Rejection reason..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => reject(p.id)}
                      disabled={acting === p.id}
                      className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setRejecting(null); setReason('') }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => approve(p.id)}
                      disabled={acting === p.id}
                      className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejecting(p.id)}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
