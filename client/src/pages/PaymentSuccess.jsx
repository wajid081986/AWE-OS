import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function PaymentSuccess() {
  const { state } = useLocation()
  const planLabel = state?.planLabel || 'Pro'
  const plan      = state?.plan || ''
  const isPayPerUse = plan === 'resume_builder' || plan === 'content_writer'

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <>
      <Helmet>
        <title>Payment Successful — AWE-OS</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          {/* Animated checkmark */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-once">
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h1>

          {isPayPerUse ? (
            <>
              <p className="text-gray-500 text-lg mb-2">Your {planLabel} credit is ready.</p>
              <p className="text-gray-400 text-sm mb-8">You have <strong>24 hours</strong> to use this credit.</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-lg mb-2">Welcome to AWE-OS Pro! 🎉</p>
              <p className="text-gray-400 text-sm mb-8">
                You now have unlimited access to all AI tools and premium features.
              </p>
            </>
          )}

          {/* Feature highlights */}
          {!isPayPerUse && (
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left space-y-3">
              {[
                { icon: '📄', text: 'AI Resume Builder — create unlimited resumes' },
                { icon: '✍️', text: 'AI Content Writer — write unlimited content' },
                { icon: '🔧', text: 'All 100+ free tools — always included' },
                { icon: '🚫', text: 'No ads — clean, focused experience' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="text-xl">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-3">
            {plan === 'resume_builder' ? (
              <Link to="/tools/resume-builder"
                className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Build My Resume →
              </Link>
            ) : plan === 'content_writer' ? (
              <Link to="/tools/ai-content-writer"
                className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Start Writing →
              </Link>
            ) : (
              <Link to="/tools/resume-builder"
                className="block w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Start Using AI Tools →
              </Link>
            )}
            <Link to="/tools"
              className="block w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-xl transition-colors text-sm">
              Browse All Tools
            </Link>
          </div>

          <p className="text-gray-400 text-xs mt-6">
            A confirmation email has been sent to your registered address.
          </p>
        </div>
      </div>
    </>
  )
}
