import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../modules/auth/context/AuthContext'

const NAV_LINKS = [
  { to: '/dashboard/marketplace', label: '🏪 Marketplace' },
  { to: '/dashboard/store',       label: '🛠️ My Tools'    },
  { to: '/dashboard/downloads',   label: '📥 Downloads'   },
  { to: '/dashboard/analytics',   label: '📊 Analytics'   },
]

const activeClass   = 'px-3 py-1.5 rounded-lg text-sm text-white bg-gray-700 transition-colors'
const inactiveClass = 'px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors'

export default function AppShell() {
  const { user, role, logout } = useAuth()
  const [open, setOpen]        = useState(false)

  const navClass = ({ isActive }) => (isActive ? activeClass : inactiveClass)

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* ── Persistent top nav ── */}
      <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 shrink-0 h-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">

          {/* Brand */}
          <Link to="/dashboard" className="text-white font-bold text-lg tracking-tight shrink-0">
            AWE-OS
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navClass}>{label}</NavLink>
            ))}
            {role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive
                    ? 'px-3 py-1.5 rounded-lg text-sm text-white bg-indigo-700 transition-colors'
                    : 'px-3 py-1.5 rounded-lg text-sm text-indigo-300 hover:text-white hover:bg-indigo-700 transition-colors'
                }
              >
                ⚙️ Admin
              </NavLink>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-gray-400 text-xs hidden md:inline truncate max-w-[160px]">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="hidden sm:block bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(o => !o)}
              className="sm:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {open ? (
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
        </div>
      </header>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden sticky top-14 z-40 bg-gray-800 border-b border-gray-700 px-4 py-3 space-y-1 shrink-0">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              {label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-indigo-300 hover:text-white hover:bg-indigo-700 transition-colors"
            >
              ⚙️ Admin
            </Link>
          )}
          <div className="pt-2 border-t border-gray-700">
            <p className="text-gray-500 text-xs px-3 py-1 truncate">{user?.email}</p>
            <button
              onClick={logout}
              className="w-full mt-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors text-left"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}
