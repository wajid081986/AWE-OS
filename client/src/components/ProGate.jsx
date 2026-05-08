import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import PaymentModal from './PaymentModal'

export default function ProGate({ children, toolName, toolSlug, payPerUsePlan, payPerUsePrice }) {
  const { isAuthenticated, isPro } = useAuth()
  const navigate  = useNavigate()
  const [modal, setModal] = useState(null) // 'pro_monthly' | payPerUsePlan | null

  if (isPro) return children

  const handlePayPerUse = () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: window.location.pathname } }); return }
    setModal(payPerUsePlan)
  }

  const handleUpgrade = () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: window.location.pathname } }); return }
    setModal('pro_monthly')
  }

  return (
    <>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          {/* Lock icon */}
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro Feature</h2>
          <p className="text-gray-500 mb-8">
            <strong>{toolName}</strong> requires a Pro subscription or a one-time payment.
          </p>

          {/* Pay per use */}
          {payPerUsePlan && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 text-left">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">Pay Per Use</p>
                  <p className="text-sm text-gray-500">One resume, no commitment</p>
                </div>
                <span className="text-2xl font-bold text-gray-900">${payPerUsePrice}</span>
              </div>
              <button
                onClick={handlePayPerUse}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Pay ${payPerUsePrice} — Use Once
              </button>
            </div>
          )}

          {/* Pro upgrade */}
          <div className="bg-blue-600 rounded-2xl p-5 text-left mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs bg-yellow-400 text-yellow-900 font-bold px-2 py-0.5 rounded-full mb-1 inline-block">Most Popular</span>
                <p className="font-semibold text-white">Pro Subscription</p>
                <p className="text-sm text-blue-200">Unlimited AI generations + all tools</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">$9.99</span>
                <span className="text-blue-300 text-xs block">/month</span>
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              className="w-full py-2.5 bg-white hover:bg-blue-50 text-blue-600 font-semibold rounded-xl text-sm transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>

          <Link to="/pricing" className="text-sm text-blue-600 hover:underline">
            View all plans →
          </Link>
        </div>
      </div>

      {modal && (
        <PaymentModal
          plan={modal}
          onClose={() => setModal(null)}
          onSuccess={() => setModal(null)}
        />
      )}
    </>
  )
}
