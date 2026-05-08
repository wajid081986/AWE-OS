import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import { TOOL_CATALOGUE } from '../data/toolCatalogue'
import PaymentModal from './PaymentModal'

// ── Shared: one tool link inside a dropdown ──────────────────────────────────
function DropdownItem({ icon, label, to, comingSoon, onClick }) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg opacity-45 cursor-not-allowed select-none">
        <span className="text-base shrink-0">{icon}</span>
        <span className="text-sm text-gray-500 flex-1">{label}</span>
        <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">Soon</span>
      </div>
    )
  }
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-blue-50 group transition-colors"
    >
      <span className="text-base shrink-0">{icon}</span>
      <span className="text-sm text-gray-700 group-hover:text-blue-700 transition-colors">{label}</span>
    </Link>
  )
}

// ── Desktop mega-dropdown panel ───────────────────────────────────────────────
function DesktopDropdown({ catKey, data, onClose }) {
  const isPdf = catKey === 'pdf'
  const cols = isPdf ? 3 : 2
  return (
    <div
      className="absolute left-0 top-full mt-1.5 z-[60] bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
      style={{ minWidth: isPdf ? 700 : 380 }}
    >
      <div className={isPdf ? 'grid grid-cols-3 divide-x divide-gray-50' : 'grid grid-cols-2 divide-x divide-gray-50'}>
        {data.sections.map((section) => (
          <div key={section.title} className="p-5 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 px-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <DropdownItem key={item.label} {...item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{data.count} tools available</span>
        <Link
          to={data.to}
          onClick={onClose}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          See all {data.label} →
        </Link>
      </div>
    </div>
  )
}

// ── Mobile accordion section ──────────────────────────────────────────────────
function MobileAccordion({ catKey, data, onClose }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span>{data.icon}</span>
          {data.label}
        </span>
        <span className={`text-gray-400 text-lg transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="pb-4 space-y-3">
          {data.sections.map(section => (
            <div key={section.title}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                {section.title}
              </p>
              {section.items.map(item => (
                <DropdownItem key={item.label} {...item} onClick={onClose} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────
export default function Header() {
  const { isAuthenticated, isPro } = useAuth()
  const [openMenu, setOpenMenu]   = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ]                 = useState('')
  const [upgradeModal, setUpgradeModal] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()
  const navRef    = useRef(null)

  // Close everything on route change
  useEffect(() => {
    setOpenMenu(null)
    setMobileOpen(false)
    setSearching(false)
  }, [location.pathname, location.search])

  // Scroll shadow
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // Click-outside to close desktop dropdown
  useEffect(() => {
    if (!openMenu) return
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const submitSearch = (e) => {
    e.preventDefault()
    if (q.trim()) {
      setSearching(false)
      navigate(`/tools?q=${encodeURIComponent(q.trim())}`)
      setQ('')
    }
  }

  const toggleMenu = (key) => setOpenMenu(prev => prev === key ? null : key)

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-md' : 'border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-6">
            <span className="text-2xl">🤖</span>
            <span className="text-gray-900 font-bold text-xl tracking-tight">AWE-OS</span>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────────── */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-0.5 flex-1">
            {Object.entries(TOOL_CATALOGUE).map(([key, cat]) => (
              <div key={key} className="relative">
                <button
                  onClick={() => toggleMenu(key)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    openMenu === key
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {cat.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === key ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openMenu === key && (
                  <DesktopDropdown catKey={key} data={cat} onClose={() => setOpenMenu(null)} />
                )}
              </div>
            ))}

            <Link
              to="/tools"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              All Tools
            </Link>
            <Link
              to="/pricing"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Pricing
            </Link>
          </nav>

          {/* ── Right actions ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            {searching ? (
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <input
                  autoFocus type="text" value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search tools..."
                  className="w-44 sm:w-56 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setSearching(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </form>
            ) : (
              <button
                onClick={() => setSearching(true)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                🔍
              </button>
            )}

            {isAuthenticated ? (
              <>
                {!isPro && (
                  <button
                    onClick={() => setUpgradeModal(true)}
                    className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-colors border border-blue-500"
                  >
                    ⚡ Upgrade
                  </button>
                )}
                <Link to="/dashboard"
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                  Dashboard →
                </Link>
              </>
            ) : (
              <>
                <Link to="/pricing"
                  className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Pricing
                </Link>
                <Link to="/login"
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Login
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen overlay ───────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] bg-white overflow-y-auto lg:hidden">
          {/* Mobile header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between h-16 px-4">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <span className="text-gray-900 font-bold text-xl">AWE-OS</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-2">
            {Object.entries(TOOL_CATALOGUE).map(([key, cat]) => (
              <MobileAccordion key={key} catKey={key} data={cat} onClose={() => setMobileOpen(false)} />
            ))}

            <Link
              to="/tools"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between py-4 text-sm font-semibold text-gray-900 border-b border-gray-100"
            >
              <span>🔧 All Tools</span>
              <span className="text-gray-400 text-xs">Browse all →</span>
            </Link>

            {/* Auth */}
            <div className="pt-4 pb-6">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full py-3 text-center text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                >
                  Dashboard →
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full py-3 text-center text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {upgradeModal && (
        <PaymentModal
          plan="pro_monthly"
          onClose={() => setUpgradeModal(false)}
          onSuccess={() => setUpgradeModal(false)}
        />
      )}
    </>
  )
}
