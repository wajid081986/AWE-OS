import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api.service'

const QUICK_ITEMS = [
  { icon: '🤖', label: 'AI Factory',       to: '/admin/factory'        },
  { icon: '🖼️', label: 'Image Agent',     to: '/admin/image-agent'    },
  { icon: '📣', label: 'Marketing',        to: '/admin/marketing'      },
  { icon: '📈', label: 'Traffic Growth',   to: '/admin/traffic'         },
  { icon: '📊', label: 'SEO Dashboard',   to: '/admin/seo-dashboard'   },
  { icon: '🤖', label: 'SEO AI Agent',    to: '/admin/seo-agent'       },
  { icon: '⚡', label: 'Programmatic SEO',to: '/admin/programmatic-seo' },
  { icon: '🔍', label: 'SEO Audit',       to: '/admin/seo-audit'       },
  { icon: '🕷️', label: 'Crawl Engine',   to: '/admin/crawl-engine'    },
  { icon: '🧠', label: 'SEO Intelligence', to: '/admin/seo-intelligence' },
  { icon: '✍️', label: 'Blog Writer',      to: '/admin/blog'           },
  { icon: '✨', label: 'Content Studio',  to: '/admin/content-studio' },
  { icon: '⚙️', label: 'Automation Hub', to: '/admin/automation'     },
  { icon: '🧬', label: 'Agents',           to: '/admin/agents'         },
  { icon: '🛠️', label: 'Tool Builder',     to: '/admin/tools/builder'  },
  { icon: '🔄', label: 'Pipeline Control', to: '/admin/pipeline'       },
  { icon: '📦', label: 'Products',         to: '/admin/products'       },
  { icon: '🛍️', label: 'Store Approvals', to: '/admin/store/approvals' },
  { icon: '💸', label: 'Store Payouts',   to: '/admin/store/payouts'  },
  { icon: '🧮', label: 'Calculators',      to: '/admin/calculators'    },
  { icon: '👥', label: 'Users',            to: '/admin/users'          },
  { icon: '💰', label: 'Revenue',          to: '/admin/revenue'        },
  { icon: '🤝', label: 'Multi-Agent',     to: '/admin/multi-agent'    },
  { icon: '⚡', label: 'Optimization',    to: '/admin/optimization'   },
  { icon: '🧠', label: 'Intelligence',    to: '/admin/intelligence'   },
  { icon: '🏪', label: 'Marketplace',     to: '/admin/marketplace'           },
  { icon: '🚀', label: 'Expansion',       to: '/admin/expansion'             },
  { icon: '📊', label: 'Rev. Intel',      to: '/admin/revenue-intelligence'  },
  { icon: '⚙️', label: 'Rev. Optimize',   to: '/admin/revenue-optimization'  },
  { icon: '🪙', label: 'Agent Economy',   to: '/admin/agent-economy'         },
  { icon: '🏬', label: 'Mkpl Analytics',  to: '/admin/agent-marketplace'     },
  { icon: '🩺', label: 'Self-Healing',    to: '/admin/self-healing'          },
  { icon: '⚠️', label: 'Fail Analysis',   to: '/admin/failure-analytics'     },
  { icon: '🛡️', label: 'Resilience',      to: '/admin/runtime-resilience'    },
]

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AdminPage() {
  const [stats,        setStats]        = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(res => setStats(res.data.stats))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [])

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Overview</h1>

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

        <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {QUICK_ITEMS.map(({ icon, label, to }) => (
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
    </div>
  )
}
