import { useState, useEffect } from 'react'
import api from '../../../services/api.service'

const PERIODS = [
  { label: '7D',  value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: 'All', value: 3650 },
]

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

export default function RevenuePage() {
  const [period,       setPeriod]       = useState(30)
  const [adminData,    setAdminData]    = useState(null)
  const [tools,        setTools]        = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [adminRes, toolsRes, txRes] = await Promise.all([
        api.get(`/api/analytics/admin?days=${period}`),
        api.get('/api/analytics/tools'),
        api.get(`/api/analytics/revenue?days=${period}`),
      ])
      setAdminData(adminRes.data.data)
      setTools(toolsRes.data.data || [])
      setTransactions(txRes.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const totalToolUses = tools.reduce((sum, t) => sum + t.count, 0)

  const sortedDailyRevenue = adminData
    ? Object.entries(adminData.dailyRevenue).sort(([a], [b]) => a.localeCompare(b))
    : []
  const maxRevenue = Math.max(...sortedDailyRevenue.map(([, v]) => v), 1)

  const revenueByType       = adminData?.revenueByType || {}
  const totalRevenueByType  = Object.values(revenueByType).reduce((s, v) => s + v, 0) || 1

  const periodLabel = period === 3650 ? 'all time' : `${period} days`

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header + Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Revenue &amp; Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Platform performance overview</p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 1 — Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          ) : (
            <>
              <StatCard
                icon="💰"
                label="Total Revenue"
                value={`₹${(adminData?.totalRevenue || 0).toLocaleString('en-IN')}`}
              />
              <StatCard
                icon="📈"
                label="MRR"
                value={`₹${(adminData?.mrr || 0).toLocaleString('en-IN')}`}
                sub={`ARR ₹${(adminData?.arr || 0).toLocaleString('en-IN')}`}
              />
              <StatCard
                icon="👥"
                label="Total Users"
                value={(adminData?.totalUsers || 0).toLocaleString('en-IN')}
                sub={`+${adminData?.newUsers || 0} new`}
              />
              <StatCard
                icon="⚡"
                label="Tool Uses"
                value={totalToolUses.toLocaleString('en-IN')}
              />
            </>
          )}
        </div>

        {/* Section 2 — Revenue Bar Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-6">
            Daily Revenue ({periodLabel})
          </h2>
          {loading ? (
            <Skeleton className="h-48" />
          ) : sortedDailyRevenue.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">
              No revenue data for this period
            </p>
          ) : (
            <div className="flex items-end gap-1 h-40 overflow-x-auto pb-6">
              {sortedDailyRevenue.map(([date, amt]) => (
                <div
                  key={date}
                  className="flex flex-col items-center flex-1 min-w-[20px]"
                  title={`₹${amt} on ${date}`}
                >
                  <div
                    className="bg-indigo-500 hover:bg-indigo-400 rounded-t w-full transition-all cursor-pointer"
                    style={{
                      height:    `${(amt / maxRevenue) * 100}%`,
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-gray-500 text-xs mt-1 hidden md:block">
                    {date.slice(8)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sections 3 + 4 side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Section 3 — Top Tools Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Top Tools</h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : tools.length === 0 ? (
              <p className="text-gray-500 text-sm">No tool usage data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left pb-2 font-medium">#</th>
                      <th className="text-left pb-2 font-medium">Tool</th>
                      <th className="text-right pb-2 font-medium">Uses</th>
                      <th className="text-right pb-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tools.slice(0, 10).map((tool, i) => (
                      <tr key={tool.slug} className="border-b border-gray-700/50">
                        <td className="py-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 text-white">{tool.slug}</td>
                        <td className="py-2 text-right text-gray-300">{tool.count}</td>
                        <td className="py-2 text-right text-gray-400">
                          {totalToolUses > 0
                            ? ((tool.count / totalToolUses) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4 — Revenue Breakdown */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Revenue by Type</h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : Object.keys(revenueByType).length === 0 ? (
              <p className="text-gray-500 text-sm">No revenue data yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(revenueByType).map(([type, amount]) => {
                  const pct = ((amount / totalRevenueByType) * 100).toFixed(1)
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-300 capitalize">{type}</span>
                        <span className="text-white">
                          ₹{Number(amount).toLocaleString('en-IN')}{' '}
                          <span className="text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 5 — Recent Transactions */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-4">Recent Transactions</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-left pb-2 font-medium">Type</th>
                    <th className="text-right pb-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((tx, i) => (
                    <tr key={tx.id || i} className="border-b border-gray-700/50">
                      <td className="py-2 text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-2 text-gray-300 capitalize">
                        {tx.type || 'payment'}
                      </td>
                      <td className="py-2 text-right text-green-400 font-medium">
                        ₹{Number(tx.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 6 — User Growth */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">User Growth</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-xl p-5">
                <p className="text-gray-400 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">
                  {(adminData?.totalUsers || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5">
                <p className="text-gray-400 text-sm mb-1">New This Period</p>
                <p className="text-3xl font-bold text-green-400">
                  +{adminData?.newUsers || 0}
                </p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5">
                <p className="text-gray-400 text-sm mb-1">Top Tool</p>
                <p className="text-2xl font-bold text-indigo-400 truncate">
                  {adminData?.topTools?.[0]?.slug || '—'}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
