import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import api from '../../services/api.service'

const NAV_ITEMS = [
  { icon: '📊', label: 'Overview',         to: '/admin',               end: true },
  { icon: '🤖', label: 'AI Factory',       to: '/admin/factory',       badge: '⚡'     },
  { icon: '📣', label: 'Marketing',        to: '/admin/marketing'                      },
  { icon: '📈', label: 'Traffic Growth',   to: '/admin/traffic'                        },
  { icon: '✍️', label: 'Blog Assistant',   to: '/admin/blog'                           },
  { icon: '🧬', label: 'Agents',           to: '/admin/agents',        badge: 'LIVE'   },
  { icon: '🛠️', label: 'Tool Builder',     to: '/admin/tools/builder'                  },
  { icon: '🔄', label: 'Pipeline Control', to: '/admin/pipeline',      badge: 'pending'},
  { icon: '📦', label: 'Products',         to: '/admin/products'                       },
  { icon: '🧮', label: 'Calculators',      to: '/admin/calculators'                    },
  { icon: '👥', label: 'Users',            to: '/admin/users'                          },
  { icon: '💰', label: 'Revenue',          to: '/admin/revenue'                        },
]

export default function AdminShell() {
  const [pendingCount, setPendingCount] = useState(null)

  useEffect(() => {
    api.get('/api/ideas/pending')
      .then(res => {
        const items = res.data?.data || res.data?.ideas || []
        setPendingCount(Array.isArray(items) ? items.length : null)
      })
      .catch(() => setPendingCount(null))
  }, [])

  return (
    <div className="flex flex-1">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-gray-800 border-r border-gray-700 shrink-0 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5 px-1">
          Admin Panel
        </p>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ icon, label, to, badge, end }) => {
            const isPipeline   = badge === 'pending'
            const displayBadge = isPipeline
              ? (pendingCount > 0 ? String(pendingCount) : null)
              : badge
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white bg-gray-700'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`
                }
              >
                <span className="text-base shrink-0">{icon}</span>
                <span className="flex-1">{label}</span>
                {displayBadge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold leading-none text-white shrink-0 ${isPipeline ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                    {displayBadge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
