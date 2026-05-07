import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import { useTools } from '../../../shared/hooks/useTools'
import { usePermissions } from '../../../shared/hooks/usePermissions'
import SupportModal from '../../../shared/components/SupportModal'

const QUICK_LINKS = [
  { label: 'Browse Tools', to: '/dashboard/marketplace', icon: '🏪' },
  { label: 'My Products',  to: '/dashboard/downloads',   icon: '📦' },
  { label: 'Downloads',    to: '/dashboard/downloads',   icon: '⬇️' },
  { label: 'Invoice Tool', to: '/tools/invoice',         icon: '📄' },
  { label: 'Analytics',    to: '/dashboard/analytics',   icon: '📊' },
]

export default function DashboardPage() {
  const { user }                 = useAuth()
  const { tools, isLoading }     = useTools()
  const { canAccessTool, role }  = usePermissions()
  const [showSupport, setShowSupport] = useState(false)

  const unlockedTools = useMemo(
    () => tools.filter(t => (t.is_free ?? t.isFree) || canAccessTool(t.slug)),
    [tools, canAccessTool]
  )

  const recentTools = unlockedTools.slice(0, 3)
  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const subStatus   = user?.subscriptionStatus === 'active' ? 'Active' : user?.isPremium ? 'Premium' : 'Free'

  return (
    <div className="p-6">
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
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
  )
}
