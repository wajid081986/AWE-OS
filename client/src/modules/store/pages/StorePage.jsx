import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTools } from '../../../shared/hooks/useTools'
import { usePermissions } from '../../../shared/hooks/usePermissions'
import api from '../../../services/api.service'

function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 bg-gray-700 rounded w-1/4" />
        <div className="h-4 bg-gray-700 rounded w-1/5" />
      </div>
      <div className="h-6 bg-gray-700 rounded w-2/3 mb-2" />
      <div className="h-4 bg-gray-700 rounded w-full mb-1" />
      <div className="h-4 bg-gray-700 rounded w-4/5 mb-5" />
      <div className="h-10 bg-gray-700 rounded" />
    </div>
  )
}

function Toast({ message, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

export default function StorePage() {
  const { tools, isLoading, refetch } = useTools()
  const { canAccessTool }             = usePermissions()
  const navigate                      = useNavigate()

  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter]   = useState('all')
  const [unlocking, setUnlocking]   = useState(null)
  const [toast, setToast]           = useState(null)

  // Supabase returns is_free (snake_case)
  const categories = useMemo(() => {
    const cats = [...new Set(tools.map(t => t.category).filter(Boolean))]
    return ['all', ...cats]
  }, [tools])

  const filtered = useMemo(() => tools.filter(t => {
    const isFree = t.is_free ?? t.isFree
    const typeOk = typeFilter === 'all' || (typeFilter === 'free' ? isFree : !isFree)
    const catOk  = catFilter === 'all' || t.category === catFilter
    return typeOk && catOk
  }), [tools, typeFilter, catFilter])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUnlock = useCallback(async (tool) => {
    if (unlocking) return
    setUnlocking(tool.id)

    try {
      const orderRes = await api.post('/api/billing/order', {
        toolSlug: tool.slug,
        amount:   tool.price,
      })
      const { orderId, amount, currency } = orderRes.data
      const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID

      if (!rzpKey || !window.Razorpay) {
        showToast('Payment unavailable', 'error')
        return
      }

      const rzp = new window.Razorpay({
        key:         rzpKey,
        amount,
        currency,
        name:        'AWE-OS',
        description: `Unlock ${tool.name}`,
        order_id:    orderId,
        handler: async (response) => {
          try {
            await api.post('/api/billing/verify', { ...response, toolSlug: tool.slug })
            await refetch()
            showToast(`${tool.name} unlocked! ✓`)
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
      setUnlocking(null)
    }
  }, [unlocking, refetch])

  const renderCard = (tool) => {
    const isFree    = tool.is_free ?? tool.isFree
    const accessed  = isFree || canAccessTool(tool.slug)
    const isWorking = unlocking === tool.id

    let label, onClick, btnClass
    if (accessed) {
      label    = isFree ? 'Use Free' : 'Use Tool ✓'
      onClick  = () => navigate(`/dashboard/tools/${tool.slug}`)
      btnClass = 'bg-green-600 hover:bg-green-700'
    } else {
      label    = isWorking ? 'Processing...' : `Unlock ₹${tool.price}`
      onClick  = () => handleUnlock(tool)
      btnClass = 'bg-indigo-600 hover:bg-indigo-700'
    }

    return (
      <div key={tool.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
            {tool.category}
          </span>
          {isFree
            ? <span className="text-xs text-green-400 font-medium">Free</span>
            : <span className="text-xs text-yellow-400 font-medium">₹{tool.price}</span>
          }
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{tool.name}</h3>
        <p className="text-gray-400 text-sm mb-5 flex-1 line-clamp-2">{tool.description}</p>
        <button
          onClick={onClick}
          disabled={isWorking}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${btnClass}`}
        >
          {label}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">AI Tools Store</h1>
          <p className="text-gray-400">Unlock powerful AI tools to supercharge your workflow</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex gap-2">
            {['all', 'free', 'premium'].map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${typeFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
          {categories.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${catFilter === cat ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
              ? <div className="col-span-3 text-center py-20"><p className="text-gray-400">No tools found</p></div>
              : filtered.map(renderCard)
          }
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
