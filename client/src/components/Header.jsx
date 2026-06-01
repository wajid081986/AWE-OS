import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import { TOOL_CATALOGUE } from '../data/toolCatalogue'

// ── Shared: one tool link inside a dropdown ──────────────────────────────────
function DropdownItem({ icon, label, to, comingSoon, onClick }) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg opacity-45 cursor-not-allowed select-none">
        <span className="text-base shrink-0" aria-hidden="true">{icon}</span>
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
      <span className="text-base shrink-0" aria-hidden="true">{icon}</span>
      <span className="text-sm text-gray-700 group-hover:text-blue-700 transition-colors">{label}</span>
    </Link>
  )
}

// ── Desktop mega-menu: all categories in one wide panel ───────────────────────
function AllToolsMegaMenu({ onClose }) {
  const entries = Object.entries(TOOL_CATALOGUE)
  return (
    <div
      className="absolute left-0 top-full mt-1.5 z-[60] bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
      style={{ minWidth: Math.min(entries.length * 180, 900), maxWidth: 'calc(100vw - 2rem)' }}
      role="menu"
    >
      <div
        className="grid divide-x divide-gray-50"
        style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
      >
        {entries.map(([key, cat]) => (
          <div key={key} className="p-4 min-w-0">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2.5 px-2 flex items-center gap-1">
              <span aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </p>
            {cat.sections.map(section => (
              <div key={section.title} className="mb-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-2">
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
        ))}
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">All tools in one place</span>
        <Link
          to="/tools"
          onClick={onClose}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          Browse all tools →
        </Link>
      </div>
    </div>
  )
}

// ── Mobile accordion section ──────────────────────────────────────────────────
function MobileAccordion({ catKey, data, onClose }) {
  const [open, setOpen] = useState(false)
  const panelId = `mobile-panel-${catKey}`
  const buttonId = `mobile-btn-${catKey}`

  return (
    <div className="border-b border-gray-100">
      <button
        id={buttonId}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span aria-hidden="true">{data.icon}</span>
          {data.label}
        </span>
        <span
          className={`text-gray-400 text-lg transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
          aria-hidden="true"
        >+</span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className={open ? 'pb-4 space-y-3' : ''}
      >
        {open && data.sections.map(section => (
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
    </div>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────
export default function Header() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [openMenu, setOpenMenu]   = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ]                 = useState('')
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

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-md' : 'border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-6">
            <span className="text-2xl" aria-hidden="true">🤖</span>
            <span className="text-gray-900 font-bold text-xl tracking-tight">AWE-OS</span>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────────── */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-0.5 flex-1" aria-label="Main navigation">

            {/* Tools mega-menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(prev => prev === 'tools' ? null : 'tools')}
                aria-expanded={openMenu === 'tools'}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  openMenu === 'tools'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Tools
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === 'tools' ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openMenu === 'tools' && (
                <AllToolsMegaMenu onClose={() => setOpenMenu(null)} />
              )}
            </div>

            <Link
              to="/blog"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                location.pathname === '/blog'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Blog
            </Link>

            <Link
              to="/about"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                location.pathname === '/about'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              About
            </Link>

            <Link
              to="/contact"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                location.pathname === '/contact'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* ── Right actions ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            {searching ? (
              <form onSubmit={submitSearch} className="flex items-center gap-2" role="search">
                <label htmlFor="header-search" className="sr-only">Search tools</label>
                <input
                  id="header-search"
                  autoFocus type="search" value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search tools..."
                  className="w-44 sm:w-56 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setSearching(false)}
                  aria-label="Close search"
                  className="text-gray-400 hover:text-gray-600 text-lg w-8 h-8 flex items-center justify-center"
                >✕</button>
              </form>
            ) : (
              <button
                onClick={() => setSearching(true)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search tools"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
            )}


            {isAdmin && (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Dashboard →
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen overlay ───────────────────────────── */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-[70] bg-white overflow-y-auto lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Mobile header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between h-16 px-4">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🤖</span>
              <span className="text-gray-900 font-bold text-xl">AWE-OS</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-2">
            {/* Tool category accordions */}
            {Object.entries(TOOL_CATALOGUE).map(([key, cat]) => (
              <MobileAccordion key={key} catKey={key} data={cat} onClose={() => setMobileOpen(false)} />
            ))}

            <Link
              to="/blog"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between py-4 text-sm font-semibold text-gray-900 border-b border-gray-100"
            >
              <span>📝 Blog</span>
              <span className="text-gray-400 text-xs">Articles →</span>
            </Link>

            <Link
              to="/about"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between py-4 text-sm font-semibold text-gray-900 border-b border-gray-100"
            >
              <span>👋 About</span>
              <span className="text-gray-400 text-xs">Our story →</span>
            </Link>

            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between py-4 text-sm font-semibold text-gray-900 border-b border-gray-100"
            >
              <span>✉️ Contact</span>
              <span className="text-gray-400 text-xs">Get in touch →</span>
            </Link>

            {isAdmin && (
              <div className="pt-4 pb-6">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full py-3 text-center text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                >
                  Dashboard →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  )
}
