import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../modules/auth/context/AuthContext'
import PaymentModal from '../components/PaymentModal'

const FREE_FEATURES = [
  { text: 'All 14 PDF Tools (merge, split, compress…)', ok: true },
  { text: 'All 6 Calculators (BMI, loan, GPA…)',       ok: true },
  { text: 'All 9 Converters (unit, color, QR code…)',  ok: true },
  { text: 'Image Compressor',                           ok: true },
  { text: 'CSV to JSON',                                ok: true },
  { text: 'AI Resume Builder',                          ok: false },
  { text: 'AI Content Writer',                          ok: false },
  { text: 'Unlimited AI generations',                   ok: false },
  { text: 'No ads',                                     ok: false },
]

const PRO_FEATURES = [
  { text: 'Everything in Free',          ok: true },
  { text: 'AI Resume Builder',           ok: true },
  { text: 'AI Content Writer',           ok: true },
  { text: 'Unlimited AI generations',    ok: true },
  { text: 'Priority support',            ok: true },
  { text: 'No ads',                      ok: true },
  { text: 'Early access to new tools',   ok: true },
]

function Check({ ok }) {
  return ok
    ? <span className="text-green-500 font-bold text-lg leading-none">✓</span>
    : <span className="text-gray-300 font-bold text-lg leading-none">✗</span>
}

export default function PricingPage() {
  const { isAuthenticated, isPro, subscriptionPlan } = useAuth()
  const navigate  = useNavigate()
  const [billing, setBilling]   = useState('monthly') // 'monthly' | 'yearly'
  const [modal, setModal]       = useState(null)

  const openModal = (plan) => {
    if (!isAuthenticated) { navigate('/login', { state: { from: '/pricing' } }); return }
    setModal(plan)
  }

  const monthlyPlan = billing === 'yearly' ? 'pro_yearly' : 'pro_monthly'
  const proPrice    = billing === 'yearly' ? '$79.99/year' : '$9.99/month'
  const proSubtext  = billing === 'yearly' ? '$6.67/month — Save 33%' : 'Billed monthly'

  return (
    <>
      <Helmet>
        <title>Pricing — AWE-OS Pro</title>
        <meta name="description"         content="Simple, transparent pricing. Start free, upgrade to Pro for AI tools. Resume Builder, AI Content Writer and more." />
        <link rel="canonical"            href="https://awe-os.com/pricing" />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content="Pricing — AWE-OS Pro" />
        <meta property="og:description"  content="Simple, transparent pricing. Start free, upgrade to Pro for AI tools. Resume Builder, AI Content Writer and more." />
        <meta property="og:url"          content="https://awe-os.com/pricing" />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://awe-os.com/og-image.svg" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="AWE-OS Pro Pricing" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content="Pricing — AWE-OS Pro" />
        <meta name="twitter:description" content="Simple, transparent pricing. Start free, upgrade to Pro for AI tools. Resume Builder, AI Content Writer and more." />
        <meta name="twitter:image"       content="https://awe-os.com/og-image.svg" />
        <meta name="twitter:image:alt"   content="AWE-OS Pro Pricing" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-500 text-lg">Start free, upgrade when you need AI power</p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span id="billing-monthly-label" className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              role="switch"
              aria-checked={billing === 'yearly'}
              aria-labelledby="billing-monthly-label billing-yearly-label"
              onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${billing === 'yearly' ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === 'yearly' ? 'translate-x-6' : ''}`}
                aria-hidden="true"
              />
            </button>
            <span id="billing-yearly-label" className={`text-sm font-medium ${billing === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Yearly
              <span className="ml-1.5 bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">Save 33%</span>
            </span>
          </div>
        </div>

        {/* Current plan banner */}
        {isPro && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 mb-8 flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-800">✅ You have an active Pro subscription</p>
              <p className="text-green-600 text-sm">Current plan: {subscriptionPlan.replace('_', ' ')}</p>
            </div>
            <Link to="/tools/resume-builder" className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
              Use AI Tools →
            </Link>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* FREE */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Free Forever</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">$0</p>
              <p className="text-gray-400 text-sm">No credit card required</p>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {FREE_FEATURES.map(f => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Check ok={f.ok} />
                  <span className={f.ok ? '' : 'text-gray-400'}>{f.text}</span>
                </li>
              ))}
            </ul>
            <Link
              to={isAuthenticated ? '/tools' : '/login'}
              className="w-full py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl text-center text-sm transition-colors block"
            >
              {isAuthenticated ? 'Continue Free' : 'Get Started Free'}
            </Link>
          </div>

          {/* PRO (highlighted) */}
          <div className="bg-blue-600 rounded-2xl p-6 flex flex-col relative shadow-xl shadow-blue-200">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">Most Popular</span>
            </div>
            <div className="mb-6">
              <p className="text-sm font-semibold text-blue-200 uppercase tracking-wider mb-2">Pro</p>
              <p className="text-4xl font-bold text-white mb-1">{proPrice}</p>
              <p className="text-blue-300 text-sm">{proSubtext}</p>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm text-blue-100">
                  <span className="text-blue-300 font-bold text-lg leading-none">✓</span>
                  {f.text}
                </li>
              ))}
            </ul>
            {isPro ? (
              <Link to="/tools/resume-builder"
                className="w-full py-3 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-xl text-center text-sm transition-colors block">
                Open AI Tools →
              </Link>
            ) : (
              <button
                onClick={() => openModal(monthlyPlan)}
                className="w-full py-3 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-xl text-sm transition-colors"
              >
                Start Pro — {proPrice}
              </button>
            )}
          </div>

          {/* PRO YEARLY (separate card when monthly selected) */}
          <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pro Yearly</p>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Save 33%</span>
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-1">$79.99<span className="text-lg font-medium text-gray-400">/yr</span></p>
              <p className="text-gray-400 text-sm">$6.67/month — best value</p>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Check ok={f.ok} />
                  {f.text}
                </li>
              ))}
            </ul>
            {isPro ? (
              <Link to="/tools/resume-builder"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center text-sm transition-colors block">
                Open AI Tools →
              </Link>
            ) : (
              <button
                onClick={() => openModal('pro_yearly')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Start Yearly — $79.99/yr
              </button>
            )}
          </div>
        </div>

        {/* Pay Per Use */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Pay Per Use</h2>
          <p className="text-gray-500 text-sm text-center mb-6">No subscription needed — pay only when you use</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">AI Resume Builder</p>
                <p className="text-sm text-gray-500">One professional resume</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">$1.99</p>
                <button onClick={() => openModal('resume_builder')}
                  className="text-xs text-blue-600 hover:underline font-medium">Pay & Use →</button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">AI Content Writer</p>
                <p className="text-sm text-gray-500">One piece of content</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">$0.99</p>
                <button onClick={() => openModal('content_writer')}
                  className="text-xs text-blue-600 hover:underline font-medium">Pay & Use →</button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Frequently Asked Questions</h2>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel your Pro subscription at any time from your dashboard. No questions asked.' },
            { q: 'What payment methods are accepted?', a: 'Credit/debit cards, UPI, net banking, and wallets via Razorpay secure checkout.' },
            { q: 'Are free tools really free?', a: 'Yes. All PDF tools, calculators, and converters are 100% free — no sign-up needed.' },
            { q: 'What is pay-per-use?', a: 'Pay a small one-time fee to use an AI tool once, without committing to a subscription.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="font-semibold text-gray-900 mb-1.5">{q}</p>
              <p className="text-gray-500 text-sm">{a}</p>
            </div>
          ))}
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
