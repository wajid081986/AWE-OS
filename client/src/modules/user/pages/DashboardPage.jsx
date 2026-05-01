import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import { useTools } from '../../../shared/hooks/useTools'
import { usePermissions } from '../../../shared/hooks/usePermissions'
import SupportModal from '../../../shared/components/SupportModal'

const NAV_LINKS = [
  { to: '/dashboard/marketplace', label: '🏪 Marketplace' },
  { to: '/dashboard/store',       label: '🛠️ My Tools' },
  { to: '/dashboard/downloads',   label: '📥 Downloads' },
  { to: '/dashboard/analytics',   label: '📊 Analytics' },
]

const QUICK_LINKS = [
  { label: 'Browse Tools', to: '/dashboard/marketplace', icon: '🏪' },
  { label: 'My Products',  to: '/dashboard/downloads',   icon: '📦' },
  { label: 'Downloads',    to: '/dashboard/downloads',   icon: '⬇️' },
  { label: 'Invoice Tool', to: '/tools/invoice',         icon: '📄' },
  { label: 'Analytics',    to: '/dashboard/analytics',   icon: '📊' },
]

export default function DashboardPage() {
  const { user, logout }        = useAuth()
  const { tools, isLoading }    = useTools()
  const { canAccessTool, role } = usePermissions()
  const [showSupport,    setShowSupport]    = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Supabase returns is_free (snake_case)
  const unlockedTools = useMemo(
    () => tools.filter(t => (t.is_free ?? t.isFree) || canAccessTool(t.slug)),
    [tools, canAccessTool]
  )

  const recentTools  = unlockedTools.slice(0, 3)
  const displayName  = user?.name || user?.email?.split('@')[0] || 'User'
  const subStatus    = user?.subscriptionStatus === 'active' ? 'Active' : user?.isPremium ? 'Premium' : 'Free'

  return (
    <div className="min-h-screen bg-gray-900">
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {/* ── Navbar ── */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="text-white font-bold text-lg tracking-tight shrink-0">
            AWE-OS
          </Link>

          {/* Center nav — desktop only */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                {label}
              </Link>
            ))}
            {role === 'admin' && (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-lg text-sm text-indigo-300 hover:text-white hover:bg-indigo-700 transition-colors"
              >
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Right: email + logout + hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-gray-400 text-xs hidden md:inline truncate max-w-[160px]">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hidden sm:block"
            >
              Logout
            </button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="sm:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
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

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-gray-800 border-b border-gray-700 px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              {label}
            </Link>
          ))}
          {role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-indigo-300 hover:text-white hover:bg-indigo-700 transition-colors"
            >
              Admin Panel
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

      <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            Welcome back, {displayName} 👋
          </h1>
          <p className="text-gray-400">Here's your workspace at a glance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-400 text-sm mb-1">Tools Unlocked</p>
            <p className="text-3xl font-bold text-white">
              {isLoading ? '—' : unlockedTools.length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-400 text-sm mb-1">Subscription</p>
            <p className={`text-2xl font-bold ${subStatus === 'Active' ? 'text-green-400' : 'text-gray-300'}`}>
              {subStatus}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-gray-400 text-sm mb-1">Account Type</p>
            <p className="text-2xl font-bold text-indigo-400 capitalize">{role || 'User'}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map(({ label, to, icon }) => (
              <Link
                key={to}
                to={to}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 text-center transition-all group"
              >
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</p>
              </Link>
            ))}
            <button
              onClick={() => setShowSupport(true)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 text-center transition-all group"
            >
              <div className="text-2xl mb-2">🎫</div>
              <p className="text-sm text-gray-300 group-hover:text-white transition-colors">Support</p>
            </button>
          </div>
        </div>

        {/* Recent Tools */}
        {!isLoading && recentTools.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Your Tools</h2>
              <Link to="/dashboard/store" className="text-indigo-400 hover:underline text-sm">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentTools.map(tool => {
                const isFree = tool.is_free ?? tool.isFree
                return (
                  <Link
                    key={tool.id}
                    to={`/dashboard/tools/${tool.slug}`}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-indigo-300 bg-indigo-900 px-2 py-0.5 rounded-full">
                        {tool.category}
                      </span>
                      {isFree && <span className="text-xs text-green-400">Free</span>}
                    </div>
                    <h3 className="text-white font-medium mb-1">{tool.name}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2">{tool.description}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
