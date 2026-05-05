import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Tools',       to: '/tools'       },
  { label: 'Converters',  to: '/tools?cat=converters'  },
  { label: 'Calculators', to: '/calculators' },
  { label: 'Products',    to: '/tools?cat=products'    },
  { label: 'Blog',        to: '/blog'        },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled,  setScrolled]  = useState(false)
  const [searching, setSearching] = useState(false)
  const [q, setQ]                 = useState('')
  const navigate                  = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [])

  const submitSearch = (e) => {
    e.preventDefault()
    if (q.trim()) {
      setSearching(false)
      navigate(`/tools?q=${encodeURIComponent(q.trim())}`)
      setQ('')
    }
  }

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-md' : 'border-b border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMenuOpen(false)}>
          <span className="text-2xl">🤖</span>
          <span className="text-gray-900 font-bold text-xl tracking-tight">AWE-OS</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search toggle */}
          {searching ? (
            <form onSubmit={submitSearch} className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search tools..."
                className="w-48 sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <Link
            to="/login"
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Login
          </Link>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="mt-2 px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg text-center transition-colors hover:bg-blue-700"
          >
            Login / Sign Up
          </Link>
        </div>
      )}
    </header>
  )
}
