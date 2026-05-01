import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api.service'

function timeAgo(dateStr) {
  const diffMs    = Date.now() - new Date(dateStr)
  const diffMins  = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays  = Math.floor(diffHours / 24)
  if (diffMins  <  1) return 'Just now'
  if (diffMins  < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays  === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <div className="flex justify-between items-start mb-3">
      <span className="text-2xl">{icon}</span>
      {sub && (
        <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
          {sub}
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-white mb-1">{value}</p>
    <p className="text-sm text-gray-400">{label}</p>
  </div>
)

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-800 rounded-xl ${className}`} />
}

export default function UserAnalyticsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/analytics/user')
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">📊 My Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Your personal usage stats</p>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!error && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)
              ) : (
                <>
                  <StatCard
                    icon="🛠️"
                    label="Tools Used"
                    value={data?.toolsUsed || 0}
                  />
                  <StatCard
                    icon="⚡"
                    label="Total Generations"
                    value={data?.totalGenerations || 0}
                  />
                  <StatCard
                    icon="💳"
                    label="Total Spent"
                    value={`₹${(data?.totalSpent || 0).toLocaleString('en-IN')}`}
                  />
                </>
              )}
            </div>

            {/* Favorite Tools */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
              <h2 className="text-white font-semibold mb-4">Favorite Tools</h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !data?.favoriteTools?.length ? (
                <p className="text-gray-500 text-sm">
                  No tools used yet.{' '}
                  <Link to="/dashboard/marketplace" className="text-indigo-400 hover:underline">
                    Browse the marketplace
                  </Link>
                </p>
              ) : (
                <div className="space-y-3">
                  {data.favoriteTools.map(({ slug, count }) => (
                    <div
                      key={slug}
                      className="flex items-center justify-between bg-gray-900 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-300 bg-indigo-900 text-xs px-3 py-1 rounded-full font-medium">
                          {slug}
                        </span>
                        <span className="text-gray-400 text-sm bg-gray-700 px-2 py-0.5 rounded-full">
                          {count} {count === 1 ? 'use' : 'uses'}
                        </span>
                      </div>
                      <Link
                        to={`/dashboard/tools/${slug}`}
                        className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                      >
                        Use Again →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !data?.recentActivity?.length ? (
                <p className="text-gray-500 text-sm">No recent activity</p>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {data.recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-gray-300 text-sm">{item.tool_slug}</span>
                      <span className="text-gray-500 text-xs">{timeAgo(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
