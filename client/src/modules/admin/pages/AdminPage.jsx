import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import api from '../../../services/api.service'

const NAV_ITEMS = [
  { icon: '📊', label: 'Overview',     to: '/admin' },
  { icon: '🛠️', label: 'Tool Builder', to: '/admin/tools/builder' },
  { icon: '📦', label: 'Products',     to: '/admin/products' },
  { icon: '🧮', label: 'Calculators',  to: '/admin/calculators' },
  { icon: '👥', label: 'Users',        to: '/admin/users' },
  { icon: '💰', label: 'Revenue',      to: '/admin/revenue' },
]

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading, user, role } = useAuth()
  const navigate    = useNavigate()
  const adminEmail  = import.meta.env.VITE_ADMIN_EMAIL

  const [stats, setStats]           = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const isAdmin = role === 'admin' || user?.email === adminEmail

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) { navigate('/login', { replace: true }); return }
    if (!isAdmin)         { navigate('/dashboard', { replace: true }); return }
  }, [authLoading, isAuthenticated, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    api.get('/api/admin/stats')
      .then(res => setStats(res.data.stats))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [isAdmin])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-800 border-r border-gray-700 flex-shrink-0 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5 px-1">
          Admin Panel
        </p>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ icon, label, to }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Overview</h1>

          {/* Stats cards */}
          {statsLoading ? <Spinner /> : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <p className="text-gray-400 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats?.totalUsers ?? '—'}</p>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <p className="text-gray-400 text-sm mb-1">Total Tools</p>
                <p className="text-3xl font-bold text-white">{stats?.totalTools ?? '—'}</p>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <p className="text-gray-400 text-sm mb-1">Active Subscriptions</p>
                <p className="text-3xl font-bold text-green-400">{stats?.activeSubscriptions ?? '—'}</p>
              </div>
            </div>
          )}

          {/* Quick access grid */}
          <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {NAV_ITEMS.filter(i => i.to !== '/admin').map(({ icon, label, to }) => (
              <Link
                key={to}
                to={to}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-5 text-center transition-all"
              >
                <div className="text-3xl mb-2">{icon}</div>
                <p className="text-sm text-gray-300">{label}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
