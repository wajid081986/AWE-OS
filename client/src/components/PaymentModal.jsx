import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import api from '../services/api.service'

const PLAN_META = {
  pro_monthly:     { label: 'Pro Monthly',             displayPrice: '$9.99/month',  description: 'Unlimited AI tools + all features' },
  pro_yearly:      { label: 'Pro Yearly',              displayPrice: '$79.99/year',  description: 'Unlimited AI tools — save 33%' },
  resume_builder:  { label: 'Resume Builder (1 use)',   displayPrice: '$1.99',        description: 'Generate one professional resume' },
  content_writer:  { label: 'AI Content Writer (1 use)', displayPrice: '$0.99',       description: 'Generate one piece of content' },
}

export default function PaymentModal({ plan, onClose, onSuccess }) {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | loading | processing | error
  const [error, setError]   = useState('')
  const meta = PLAN_META[plan] || {}

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) return
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const openCheckout = async () => {
    if (!user) { navigate('/login'); return }
    setStatus('loading'); setError('')

    try {
      const orderRes = await api.post('/api/payment/create-order', { plan })
      if (!orderRes.data.success) throw new Error(orderRes.data.error || 'Failed to create order')

      const { orderId, amount, currency, key } = orderRes.data

      if (!window.Razorpay) throw new Error('Payment gateway not loaded. Please refresh and try again.')

      const options = {
        key:         key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name:        'AWE-OS',
        description: meta.description || plan,
        order_id:    orderId,
        prefill: {
          name:  user.name  || '',
          email: user.email || '',
        },
        theme: { color: '#2563EB' },
        modal: {
          ondismiss: () => setStatus('idle'),
        },
        handler: async (response) => {
          setStatus('processing')
          try {
            const verifyRes = await api.post('/api/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan,
            })

            if (!verifyRes.data.success) throw new Error(verifyRes.data.error || 'Verification failed')

            // Update user context with new subscription
            if (verifyRes.data.user) updateUser(verifyRes.data.user)
            else await refreshUser()

            onSuccess?.()
            onClose?.()
            navigate('/payment/success', { state: { plan, planLabel: meta.label } })
          } catch (err) {
            setError(err.message || 'Payment verification failed. Contact support.')
            setStatus('error')
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. Please try again.')
        setStatus('error')
      })
      setStatus('idle')
      rzp.open()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{meta.label}</h2>
          <p className="text-3xl font-bold text-blue-600 mb-1">{meta.displayPrice}</p>
          <p className="text-gray-500 text-sm">{meta.description}</p>
        </div>

        {/* Features summary */}
        {(plan === 'pro_monthly' || plan === 'pro_yearly') && (
          <ul className="space-y-2 mb-6">
            {['Unlimited AI Resume generations', 'Unlimited AI Content writing', 'All 100+ tools', 'No ads', 'Priority support'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-500 text-base">✓</span> {f}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={openCheckout}
          disabled={status === 'loading' || status === 'processing'}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {status === 'loading' || status === 'processing' ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {status === 'loading' ? 'Loading checkout…' : 'Verifying payment…'}</>
          ) : (
            `Pay ${meta.displayPrice} — Secure Checkout`
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Secured by Razorpay · 256-bit SSL encryption
        </p>
      </div>
    </div>
  )
}
