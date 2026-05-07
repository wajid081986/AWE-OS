import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toolsAPI } from '../../../services/api.service'
import api from '../../../services/api.service'
import ToolRenderer from '../components/ToolRenderer'

function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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

export default function ToolPage() {
  const { slug } = useParams()
  const [tool, setTool]         = useState(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState(null)
  const [unlockTool, setUnlock] = useState(null)
  const [paying, setPaying]     = useState(false)
  const [toast, setToast]       = useState(null)

  useEffect(() => {
    setLoading(true)
    toolsAPI.getBySlug(slug)
      .then(res => setTool(res.data?.tool ?? res.data))
      .catch(err => setError(err.response?.data?.error || 'Tool not found'))
      .finally(() => setLoading(false))
  }, [slug])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUnlock = useCallback(async (t) => {
    setUnlock(t)
  }, [])

  const startPayment = async () => {
    if (!unlockTool || paying) return
    setPaying(true)
    try {
      const orderRes = await api.post('/api/billing/order', {
        toolSlug: unlockTool.slug,
        amount:   unlockTool.price,
      })
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
        description: `Unlock ${unlockTool.name}`,
        order_id:    orderId,
        handler: async (response) => {
          try {
            await api.post('/api/billing/verify', { ...response, toolSlug: unlockTool.slug })
            showToast(`${unlockTool.name} unlocked!`)
            setUnlock(null)
            // Reload tool to reflect new access
            const res = await toolsAPI.getBySlug(slug)
            setTool(res.data?.tool ?? res.data)
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

  if (isLoading) return <PageSpinner />

  if (error || !tool) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Tool not found'}</p>
          <Link to="/dashboard/store" className="text-indigo-400 hover:underline text-sm">
            Back to Store
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to="/dashboard/store" className="hover:text-white transition-colors">Tools</Link>
          <span>/</span>
          <span className="text-white">{tool.name}</span>
        </nav>

        {/* Tool header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{tool.name}</h1>
            <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">{tool.category}</span>
            {(tool.is_free ?? tool.isFree) && <span className="text-xs text-green-400 font-medium">Free</span>}
          </div>
          <p className="text-gray-400">{tool.description}</p>
        </div>

        <ToolRenderer tool={tool} onUnlock={handleUnlock} />
      </div>

      {/* Unlock modal */}
      {unlockTool && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-1">Unlock {unlockTool.name}</h3>
            <p className="text-gray-400 text-sm mb-1">Get lifetime access for</p>
            <p className="text-3xl font-bold text-indigo-400 mb-6">₹{unlockTool.price}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnlock(null)}
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
