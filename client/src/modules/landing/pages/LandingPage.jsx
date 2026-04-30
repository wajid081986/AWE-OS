import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'

const FEATURES = [
  {
    icon: '🛠️',
    title: 'AI Tools',
    desc: 'Powerful AI tools for every business task — from content generation to code review.',
  },
  {
    icon: '📦',
    title: 'Digital Products',
    desc: 'Premium templates, courses & resources to accelerate your business.',
  },
  {
    icon: '🧮',
    title: 'Calculators',
    desc: 'Free calculators for instant results — EMI, GST, SIP and 50+ more.',
  },
]

const STEPS = [
  { icon: '🔐', num: '01', title: 'Sign Up Free',       desc: 'Create your account in seconds. No credit card required.' },
  { icon: '🛠️', num: '02', title: 'Choose Your Tools',  desc: 'Browse our marketplace of AI tools and digital products.' },
  { icon: '🚀', num: '03', title: 'Start Building',      desc: 'Use AI-powered tools to grow your business faster.' },
]

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    highlight: false,
    features: ['Resume Builder', '3 AI tools / month', 'Basic templates', 'Community support'],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    price: '₹299',
    period: '/month',
    highlight: true,
    badge: 'Most Popular',
    features: ['Everything in Free', 'Unlimited AI tools', 'All digital products', 'Priority support'],
    cta: 'Start Pro',
  },
  {
    name: 'Premium',
    price: '₹999',
    period: '/month',
    highlight: false,
    features: ['Everything in Pro', 'AI Factory access', 'Custom agents', 'Team access'],
    cta: 'Contact Us',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Navbar({ menuOpen, setMenuOpen }) {
  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link to="/" className="text-white font-bold text-xl tracking-tight">AWE-OS</Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {['features', 'pricing', 'tools'].map(id => (
            <a
              key={id}
              href={`#${id}`}
              className="text-gray-400 hover:text-white text-sm capitalize transition-colors"
            >
              {id}
            </a>
          ))}
        </nav>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-gray-300 hover:text-white text-sm transition-colors">
            Login
          </Link>
          <Link
            to="/login"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Get Started Free
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-2"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 space-y-3">
          {['features', 'pricing', 'tools'].map(id => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => setMenuOpen(false)}
              className="block text-gray-400 hover:text-white text-sm py-1 capitalize transition-colors"
            >
              {id}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-center border border-gray-700 text-gray-300 hover:text-white text-sm py-2 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-center bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold py-2 rounded-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function ToolCard({ tool }) {
  const isFree = tool.is_free ?? tool.isFree
  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full">
          {tool.category || 'Tool'}
        </span>
        {isFree
          ? <span className="text-xs text-green-400 font-medium">Free</span>
          : <span className="text-xs text-yellow-400 font-medium">₹{tool.price}</span>
        }
      </div>
      <h3 className="text-white font-semibold mb-2">{tool.name}</h3>
      <p className="text-gray-400 text-sm line-clamp-2">{tool.description}</p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [tools,    setTools]    = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/tools`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tools) setTools(d.tools.slice(0, 6)) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 text-center">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-y-16" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            🚀 AI-Powered Business Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
            Build Smarter with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              AI Tools
            </span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Access powerful AI tools, digital products, and free calculators —
            all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-base"
            >
              Get Started Free →
            </Link>
            <Link
              to="/login"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-base"
            >
              View Tools
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-800/60 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: '50+',     label: 'AI Tools' },
            { value: '10,000+', label: 'Users' },
            { value: '₹0',      label: 'To Start' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{value}</p>
              <p className="text-gray-400 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-gray-400">One platform for all your business tools and resources</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-gray-900 border border-gray-800 hover:border-blue-800/60 rounded-2xl p-6 transition-colors"
              >
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400">Get started in minutes — no credit card needed</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map(({ icon, num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-5">
                  <span className="text-2xl">{icon}</span>
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {num}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-gray-400">Start free, scale when you need more</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, period, highlight, badge, features, cta }) => (
              <div
                key={name}
                className={`relative flex flex-col rounded-2xl p-6 ${
                  highlight
                    ? 'bg-blue-600/10 border-2 border-blue-500'
                    : 'bg-gray-900 border border-gray-800'
                }`}
              >
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {badge}
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-gray-400 text-sm mb-2">{name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    <span className="text-gray-400 text-sm">{period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <span className="text-green-400 font-bold text-xs shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    highlight
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                      : 'border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS SHOWCASE ───────────────────────────────────────────────────── */}
      {tools.length > 0 && (
        <section id="tools" className="py-20 px-4 sm:px-6 bg-gray-900/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Popular Tools</h2>
              <p className="text-gray-400">AI-powered tools ready to use right now</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {tools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
            </div>
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all"
              >
                View All Tools →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-4 sm:px-6 overflow-hidden text-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[600px] h-[350px] bg-blue-600/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to supercharge your business?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join thousands of entrepreneurs using AWE-OS
          </p>
          <Link
            to="/login"
            className="inline-flex items-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-base"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm">
          <div>
            <p className="text-white font-bold text-lg mb-0.5">AWE-OS</p>
            <p className="text-gray-500">AI-Powered Business Platform</p>
          </div>
          <nav className="flex flex-wrap gap-6 text-gray-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
            <Link to="/login"   className="hover:text-white transition-colors">Login</Link>
            <a href="#"         className="hover:text-white transition-colors">Privacy</a>
          </nav>
          <p className="text-gray-600">© {new Date().getFullYear()} AWE-OS. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
