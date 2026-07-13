import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/context/AuthContext'
import { TOOL_CATALOGUE } from '../data/toolCatalogue'
import { Button, Container } from './primitives'

// ── Shared: brand logo (header + mobile sheet) ───────────────────────────────
function Logo({ onClick, className = '' }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`flex items-center gap-2.5 shrink-0 font-display font-extrabold text-xl text-ink ${className}`}
    >
      <span
        className="w-7 h-7 rounded-s grid place-items-center bg-gradient-to-br from-cobalt to-cobalt-deep text-white text-sm font-bold shrink-0"
        aria-hidden="true"
      >
        A
      </span>
      AWE-OS
    </Link>
  )
}

// ── Shared: one tool link inside a dropdown ──────────────────────────────────
function DropdownItem({ icon, label, to, comingSoon, onClick }) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-s opacity-45 cursor-not-allowed select-none">
        <span className="text-base shrink-0" aria-hidden="true">{icon}</span>
        <span className="text-sm text-ink-soft flex-1">{label}</span>
        <span className="text-[9px] bg-paper text-ink-soft px-1.5 py-0.5 rounded-full font-medium shrink-0">Soon</span>
      </div>
    )
  }
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-s hover:bg-cobalt-tint group transition-colors"
    >
      <span className="text-base shrink-0" aria-hidden="true">{icon}</span>
      <span className="text-sm text-ink group-hover:text-cobalt transition-colors">{label}</span>
    </Link>
  )
}

// ── Desktop mega-menu: all categories in one wide panel ───────────────────────
function AllToolsMegaMenu({ onClose }) {
  const entries = Object.entries(TOOL_CATALOGUE)
  return (
    <div
      className="absolute left-0 top-full mt-1.5 z-[60] bg-card border border-line rounded-l shadow-float overflow-hidden"
      style={{ minWidth: Math.min(entries.length * 180, 900), maxWidth: 'calc(100vw - 2rem)' }}
      role="menu"
    >
      <div
        className="grid divide-x divide-line"
        style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
      >
        {entries.map(([key, cat]) => (
          <div key={key} className="p-4 min-w-0">
            <p className="text-[10px] font-bold text-cobalt uppercase tracking-widest mb-2.5 px-2 flex items-center gap-1">
              <span aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </p>
            {cat.sections.map(section => (
              <div key={section.title} className="mb-3">
                <p className="text-[9px] font-bold text-ink-soft uppercase tracking-widest mb-1 px-2">
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
      <div className="border-t border-line bg-paper px-5 py-2.5 flex items-center justify-between">
        <span className="text-xs text-ink-soft">All tools in one place</span>
        <Link
          to="/tools"
          onClick={onClose}
          className="text-xs text-cobalt hover:text-cobalt-deep font-medium hover:underline"
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
    <div className="border-b border-line">
      <button
        id={buttonId}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true">{data.icon}</span>
          {data.label}
        </span>
        <span
          className={`text-ink-soft text-lg transition-transform duration-micro ease-ds-ease ${open ? 'rotate-45' : ''}`}
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
            <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-1.5 px-1">
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

// ── One desktop nav link (plain, non-dropdown) ────────────────────────────────
function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`px-3 py-2 text-[.95rem] whitespace-nowrap transition-colors ${
        active ? 'text-ink font-semibold' : 'text-ink-soft font-medium hover:text-ink'
      }`}
    >
      {children}
    </Link>
  )
}

// ── Mobile sheet row (icon + label + arrow) ────────────────────────────────────
function MobileRow({ to, icon, label, hint, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center justify-between py-4 text-sm font-semibold text-ink border-b border-line"
    >
      <span>{icon} {label}</span>
      <span className="text-ink-soft text-xs">{hint} →</span>
    </Link>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────
export default function Header() {
  const { isAuthenticated, role } = useAuth()
  const isAdmin = role === 'admin'
  const [openMenu, setOpenMenu]   = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ]                 = useState('')
  const navigate  = useNavigate()
  const location  = useLocation()
  const navRef    = useRef(null)
  const sheetRef  = useRef(null)
  const hamburgerRef = useRef(null)
  const closeBtnRef  = useRef(null)

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

  // Mobile sheet: focus trap + Esc to close, focus returns to the hamburger
  useEffect(() => {
    if (!mobileOpen) return
    const sheet = sheetRef.current
    if (!sheet) return

    closeBtnRef.current?.focus()

    const getFocusable = () =>
      Array.from(
        sheet.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter(el => el.offsetParent !== null)

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileOpen(false)
        hamburgerRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const submitSearch = (e) => {
    e.preventDefault()
    if (q.trim()) {
      setSearching(false)
      navigate(`/tools?q=${encodeURIComponent(q.trim())}`)
      setQ('')
    }
  }

  const isToolsActive = location.pathname.startsWith('/tools')
  const isStoreActive = location.pathname.startsWith('/store')

  return (
    <>
      <header
        className={`sticky top-0 z-[var(--z-header)] bg-[color:var(--header-bg)] backdrop-blur-[length:var(--blur-header)] transition-shadow border-b border-line ${scrolled ? 'shadow-float' : ''}`}
      >
        <Container className="flex items-center justify-between h-[length:var(--header-height)]">

          <Logo className="mr-6" />

          {/* ── Desktop nav ──────────────────────────────────────── */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-1 flex-1" aria-label="Main navigation">

            {/* Tools mega-menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(prev => prev === 'tools' ? null : 'tools')}
                aria-expanded={openMenu === 'tools'}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3 py-2 text-[.95rem] whitespace-nowrap transition-colors ${
                  openMenu === 'tools' || isToolsActive
                    ? 'text-ink font-semibold'
                    : 'text-ink-soft font-medium hover:text-ink'
                }`}
              >
                All Tools
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-micro ease-ds-ease ${openMenu === 'tools' ? 'rotate-180' : ''}`}
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

            <NavLink to="/store" active={isStoreActive}>Store</NavLink>
            <NavLink to="/blog" active={location.pathname === '/blog'}>Guides &amp; Blog</NavLink>
            <NavLink to="/about" active={location.pathname === '/about'}>About</NavLink>
            <NavLink to="/contact" active={location.pathname === '/contact'}>Contact</NavLink>
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
                  className="w-44 sm:w-56 px-3 py-1.5 text-sm border-[1.5px] border-line rounded-s bg-card text-ink focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-cobalt focus-visible:outline-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setSearching(false)}
                  aria-label="Close search"
                  className="text-ink-soft hover:text-ink text-lg w-8 h-8 flex items-center justify-center"
                >✕</button>
              </form>
            ) : (
              <button
                onClick={() => setSearching(true)}
                className="p-2 text-ink-soft hover:text-ink hover:bg-cobalt-tint rounded-s transition-colors"
                aria-label="Search tools"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
            )}

            {/* Primary CTA */}
            <Button
              as={Link}
              to="/tools"
              variant="primary"
              size="compact"
              className="hidden sm:inline-flex"
            >
              Browse 49 Tools
            </Button>

            {/* Dashboard (admin) or Login (ghost, rightmost, smallest) */}
            {isAdmin ? (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
              >
                Dashboard →
              </Link>
            ) : !isAuthenticated && (
              <Link
                to="/login"
                rel="nofollow"
                className="hidden sm:inline-flex items-center px-2 py-2 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
              >
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              ref={hamburgerRef}
              className="lg:hidden p-2 text-ink-soft hover:text-ink hover:bg-cobalt-tint rounded-s transition-colors"
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
        </Container>
      </header>

      {/* ── Mobile full-screen overlay ───────────────────────────── */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          ref={sheetRef}
          className="fixed inset-0 z-[var(--z-modal)] bg-paper overflow-y-auto lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Mobile header */}
          <div className="sticky top-0 bg-paper border-b border-line flex items-center justify-between h-[length:var(--header-height)] px-4">
            <Logo onClick={() => setMobileOpen(false)} />
            <button
              ref={closeBtnRef}
              onClick={() => { setMobileOpen(false); hamburgerRef.current?.focus() }}
              aria-label="Close menu"
              className="p-2 text-ink-soft hover:text-ink hover:bg-cobalt-tint rounded-s"
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

            <div className="py-4">
              <Button
                as={Link}
                to="/tools"
                variant="primary"
                className="w-full justify-center"
                onClick={() => setMobileOpen(false)}
              >
                Browse 49 Tools
              </Button>
            </div>

            <MobileRow to="/store" icon="🛍️" label="Store" hint="Marketplace" onClick={() => setMobileOpen(false)} />
            <MobileRow to="/blog" icon="📝" label="Guides & Blog" hint="Articles" onClick={() => setMobileOpen(false)} />
            <MobileRow to="/about" icon="👋" label="About" hint="Our story" onClick={() => setMobileOpen(false)} />
            <MobileRow to="/contact" icon="✉️" label="Contact" hint="Get in touch" onClick={() => setMobileOpen(false)} />

            {(isAdmin || !isAuthenticated) && (
              <div className="pt-4 pb-6">
                <Link
                  to={isAdmin ? '/dashboard' : '/login'}
                  rel={isAdmin ? undefined : 'nofollow'}
                  onClick={() => setMobileOpen(false)}
                  className="block w-full py-3 text-center text-sm font-semibold text-ink-soft border-[1.5px] border-line rounded-s hover:border-ink-soft transition-colors"
                >
                  {isAdmin ? 'Dashboard →' : 'Login'}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  )
}
