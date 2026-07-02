import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

const StatCard = ({ label, value }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <p className="text-2xl font-bold text-white mb-1">{value}</p>
    <p className="text-sm text-gray-400">{label}</p>
  </div>
)

const TABS = ['Overview', 'Products', 'Orders', 'Payouts']
const EMPTY_PRODUCT = { title: '', description: '', category: 'General', price: '', tags: '', thumbnail_url: '' }

export default function SellerDashboardPage() {
  const [seller, setSeller]     = useState(null)
  const [status, setStatus]     = useState('loading') // loading | not-registered | ready
  const [tab, setTab]           = useState('Overview')
  const [dashboard, setDashboard] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders]     = useState([])
  const [payouts, setPayouts]   = useState([])

  const [showModal, setModal]   = useState(false)
  const [form, setForm]         = useState(EMPTY_PRODUCT)
  const [file, setFile]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const fileRef = useRef(null)

  const loadSeller = useCallback(async () => {
    try {
      const res = await api.get('/api/store/seller/me')
      setSeller(res.data.seller)
      setStatus('ready')
    } catch {
      setStatus('not-registered')
    }
  }, [])

  useEffect(() => { loadSeller() }, [loadSeller])

  useEffect(() => {
    if (status !== 'ready') return
    api.get('/api/store/seller/dashboard').then(res => setDashboard(res.data)).catch(() => {})
    api.get('/api/store/seller/products').then(res => setProducts(res.data.products || [])).catch(() => {})
    api.get('/api/store/seller/orders').then(res => setOrders(res.data.orders || [])).catch(() => {})
    api.get('/api/store/seller/payouts').then(res => setPayouts(res.data.payouts || [])).catch(() => {})
  }, [status])

  const openModal = () => { setForm(EMPTY_PRODUCT); setFile(null); setFormError(null); setModal(true) }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!form.title || !form.price) { setFormError('Title and price are required'); return }
    if (!file) { setFormError('Please select a file'); return }

    setSaving(true)
    setFormError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('file', file)
      await api.post('/api/store/seller/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setModal(false)
      const res = await api.get('/api/store/seller/products')
      setProducts(res.data.products || [])
    } catch (err) {
      setFormError(err.response?.data?.error || 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    try {
      await api.delete(`/api/store/seller/products/${id}`)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  const togglePublish = async (product) => {
    try {
      const { data } = await api.put(`/api/store/seller/products/${product.id}`, { is_published: !product.is_published })
      setProducts(prev => prev.map(p => p.id === product.id ? data.product : p))
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed')
    }
  }

  const requestPayout = async () => {
    setRequesting(true)
    try {
      await api.post('/api/store/seller/payouts')
      const [pRes, dRes] = await Promise.all([
        api.get('/api/store/seller/payouts'),
        api.get('/api/store/seller/dashboard'),
      ])
      setPayouts(pRes.data.payouts || [])
      setDashboard(dRes.data)
    } catch (err) {
      alert(err.response?.data?.error || 'Payout request failed')
    } finally {
      setRequesting(false)
    }
  }

  const statusColor = {
    draft: 'bg-gray-700 text-gray-300', pending: 'bg-yellow-900 text-yellow-400',
    approved: 'bg-green-900 text-green-400', rejected: 'bg-red-900 text-red-400',
  }

  if (status === 'loading') {
    return <div className="p-6 flex justify-center py-24"><Spinner /></div>
  }

  if (status === 'not-registered') {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24 text-center">
        <p className="text-5xl mb-4">🛍️</p>
        <h2 className="text-xl font-bold text-white mb-2">You're not a seller yet</h2>
        <p className="text-gray-400 text-sm mb-6">Register to start selling digital products on AWE-OS.</p>
        <Link to="/store/sell" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          Become a Seller
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{seller.display_name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">Seller Dashboard</p>
          </div>
          {tab === 'Products' && (
            <button onClick={openModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Upload Product
            </button>
          )}
        </div>

        <div className="flex gap-1 border-b border-gray-800 mb-6">
          {TABS.map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'text-white border-indigo-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && dashboard && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Products" value={dashboard.productCount} />
              <StatCard label="Orders (90d)" value={dashboard.orderCount} />
              <StatCard label="Unpaid Balance" value={`₹${dashboard.unpaidBalance.toFixed(2)}`} />
              <StatCard label="Total Earnings" value={`₹${dashboard.totalEarnings.toFixed(2)}`} />
            </div>

            {dashboard.revenueSeries.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Revenue (last 90 days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dashboard.revenueSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {tab === 'Products' && (
          products.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No products yet. Upload your first one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3 pr-4 font-medium">Product</th>
                    <th className="pb-3 pr-4 font-medium">Price</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Published</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {products.map(p => (
                    <tr key={p.id} className="text-gray-300">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-white">{p.title}</div>
                        {p.status === 'rejected' && p.rejection_reason && (
                          <div className="text-red-400 text-xs mt-0.5">Rejected: {p.rejection_reason}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-indigo-400">₹{p.price}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>{p.status}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => togglePublish(p)}
                          disabled={p.status !== 'approved'}
                          className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-2.5 py-1 rounded transition-colors"
                        >
                          {p.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      </td>
                      <td className="py-3">
                        <button onClick={() => deleteProduct(p.id)} className="text-xs bg-red-900/50 hover:bg-red-800 text-red-400 px-2.5 py-1 rounded transition-colors">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'Orders' && (
          orders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{o.digital_products?.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date(o.purchased_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-semibold">₹{Number(o.seller_earnings_amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{o.payout_status}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'Payouts' && (
          <>
            <button
              onClick={requestPayout}
              disabled={requesting || !dashboard || dashboard.unpaidBalance <= 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors mb-6"
            >
              {requesting ? 'Requesting...' : `Request Payout (₹${dashboard?.unpaidBalance.toFixed(2) || '0.00'})`}
            </button>

            {payouts.length === 0 ? (
              <p className="text-gray-400 text-sm">No payout requests yet.</p>
            ) : (
              <div className="space-y-3">
                {payouts.map(p => (
                  <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">₹{Number(p.amount).toFixed(2)}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{new Date(p.requested_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-green-900 text-green-400' : p.status === 'rejected' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Upload Product</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Title <span className="text-red-400">*</span></label>
                <input className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Category</label>
                  <input className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Price (₹) <span className="text-red-400">*</span></label>
                  <input type="number" min="0" step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tags (comma separated)</label>
                <input className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Thumbnail URL</label>
                <input className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">File <span className="text-red-400">*</span></label>
                <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full bg-gray-700 border border-dashed border-gray-500 hover:border-indigo-500 rounded-lg px-3 py-3 text-gray-400 text-sm transition-colors text-left">
                  {file ? <span className="text-white">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span> : 'Click to select file (max 50 MB)'}
                </button>
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors">
                  {saving ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
