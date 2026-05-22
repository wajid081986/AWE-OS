import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api.service'

const REVENUE_PROJECTIONS = [
  { months: 3,  traffic: '200–500',     adsense: '₹500–1,500',    note: '3 articles/mo' },
  { months: 6,  traffic: '1K–3K',       adsense: '₹2K–8K',        note: 'current pace' },
  { months: 12, traffic: '5K–15K',      adsense: '₹10K–40K',      note: '20+ articles' },
]

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function SeoDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/admin/seo/dashboard-data')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data) return (
    <div className="p-6 text-red-400">Failed to load dashboard data. Check server logs.</div>
  )

  const { stats, recentArticles, contentGaps, monthlyCalendar } = data

  // Leading blank days to align calendar grid
  const startDay = monthlyCalendar[0]?.date
    ? new Date(monthlyCalendar[0].date + 'T00:00:00').getDay()
    : 0

  // Days since last published
  const daysSince = stats.lastPublished
    ? Math.round((new Date() - new Date(stats.lastPublished)) / 86400000)
    : null

  // SEO alerts derived from live data
  const alerts = []
  if (stats.publishingStreak < 3) {
    alerts.push({ msg: `Publishing streak is ${stats.publishingStreak} day${stats.publishingStreak !== 1 ? 's' : ''} — keep going!`, action: 'Write Now', to: '/admin/blog', sev: 'yellow' })
  }
  if (stats.articlesThisMonth < 3) {
    alerts.push({ msg: `Only ${stats.articlesThisMonth} article${stats.articlesThisMonth !== 1 ? 's' : ''} this month — target is 3+`, action: 'Write Now', to: '/admin/blog', sev: 'red' })
  }
  contentGaps.forEach(gap => {
    alerts.push({ msg: gap, action: 'Fix Gap', to: '/admin/blog', sev: 'red' })
  })
  if (alerts.length === 0) {
    alerts.push({ msg: 'All health checks passing — keep publishing!', action: null, sev: 'green' })
  }

  const sevCls = {
    red:    { wrap: 'bg-red-900/30 border-red-800',       text: 'text-red-300',    btn: 'bg-red-600 hover:bg-red-700' },
    yellow: { wrap: 'bg-yellow-900/30 border-yellow-800', text: 'text-yellow-300', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    green:  { wrap: 'bg-green-900/30 border-green-800',   text: 'text-green-300',  btn: 'bg-green-600 hover:bg-green-700' },
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">SEO Dashboard</h1>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📝', label: 'Articles',   value: stats.totalArticles,    sub: 'total published' },
          { icon: '🔧', label: 'Tools',      value: stats.totalTools,       sub: 'active tools' },
          { icon: '📅', label: 'This Month', value: stats.articlesThisMonth, sub: 'articles published' },
          { icon: '🔥', label: 'Streak',     value: stats.publishingStreak, sub: 'day publishing streak' },
        ].map(card => (
          <div key={card.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
            <p className="text-xs text-gray-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Publishing Calendar ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Publishing Calendar</h2>
          {daysSince !== null && (
            <span className="text-sm text-gray-400">
              Last published:{' '}
              <span className={daysSince > 3 ? 'text-red-400' : 'text-green-400'}>
                {daysSince === 0 ? 'today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`}
              </span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(startDay).fill(null).map((_, i) => <div key={`b${i}`} />)}
          {monthlyCalendar.map(({ date, hasArticle, title }) => (
            <div
              key={date}
              title={title || ''}
              className={`relative rounded-full w-8 h-8 flex items-center justify-center mx-auto text-xs font-medium
                ${hasArticle
                  ? 'bg-green-500 text-white cursor-pointer'
                  : 'bg-gray-700 text-gray-400'
                }`}
            >
              {new Date(date + 'T00:00:00').getDate()}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Article published
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-700 inline-block" /> No article
          </span>
        </div>
      </div>

      {/* ── Content Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SEO Alerts */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">SEO Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg p-3 border ${sevCls[alert.sev].wrap}`}>
                <p className={`text-sm ${sevCls[alert.sev].text}`}>{alert.msg}</p>
                {alert.action && (
                  <button
                    onClick={() => navigate(alert.to)}
                    className={`text-xs px-3 py-1 rounded font-medium text-white ml-3 shrink-0 ${sevCls[alert.sev].btn}`}
                  >
                    {alert.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Map */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Coverage Map</h2>
          <div className="space-y-1">
            {Object.entries(stats.categoryCounts || {}).map(([cat, count]) => {
              const icon  = count >= 5 ? '✅' : count >= 2 ? '⚠️' : '🔴'
              const badge = count >= 5
                ? 'bg-green-900/50 text-green-400'
                : count >= 2
                ? 'bg-yellow-900/50 text-yellow-400'
                : 'bg-red-900/50 text-red-400'
              const note  = count >= 5 ? 'Good' : count >= 2 ? 'Need more' : 'Critical'
              return (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <span className="flex items-center gap-2 text-sm text-white">
                    {icon} {cat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{count} article{count !== 1 ? 's' : ''}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>{note}</span>
                  </div>
                </div>
              )
            })}
            {contentGaps.map((gap, i) => (
              <div key={`gap${i}`} className="flex items-center gap-2 py-2 border-b border-gray-700 last:border-0">
                <span className="text-sm text-red-400">🔴 {gap}</span>
              </div>
            ))}
            {Object.keys(stats.categoryCounts || {}).length === 0 && contentGaps.length === 0 && (
              <p className="text-sm text-gray-400">No data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Revenue Estimator ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-1">Traffic & Revenue Projection</h2>
        <p className="text-sm text-gray-400 mb-4">Based on your content — here's your traffic projection at current pace</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                {['Month', 'Est. Traffic', 'AdSense Revenue', 'Assumption'].map(h => (
                  <th key={h} className="text-gray-400 font-medium pb-3 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REVENUE_PROJECTIONS.map(row => (
                <tr key={row.months} className="border-b border-gray-700/50">
                  <td className="py-3 pr-6 text-white font-medium">Month {row.months}</td>
                  <td className="py-3 pr-6 text-indigo-400">{row.traffic}</td>
                  <td className="py-3 pr-6 text-green-400 font-medium">{row.adsense}</td>
                  <td className="py-3 text-gray-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Articles ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Articles</h2>
        {recentArticles.length === 0 ? (
          <p className="text-gray-400 text-sm">No articles yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Words</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentArticles.map(article => (
                  <tr key={article.slug} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4 text-white max-w-xs">
                      <span className="line-clamp-1">{article.title}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
                        {article.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{article.date}</td>
                    <td className="py-3 pr-4">
                      <span className={article.wordCount < 800 ? 'text-red-400' : 'text-green-400'}>
                        ~{article.wordCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-3">
                        <button onClick={() => navigate('/admin/blog')} className="text-xs text-blue-400 hover:text-blue-300">Optimize</button>
                        <button onClick={() => navigate('/admin/blog')} className="text-xs text-purple-400 hover:text-purple-300">Add Links</button>
                        <button onClick={() => navigate('/admin/traffic')} className="text-xs text-green-400 hover:text-green-300">Promote</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '✍️', label: 'Write New Article', to: '/admin/blog',    color: 'indigo' },
            { icon: '🔍', label: 'Research Keyword',  to: '/admin/blog',    color: 'purple' },
            { icon: '🚀', label: 'Promote on Reddit', to: '/admin/traffic', color: 'orange' },
            { icon: '📊', label: 'Audit Article SEO', to: '/admin/blog',    color: 'green'  },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-colors
                ${action.color === 'indigo' ? 'bg-indigo-900/30 border-indigo-800 hover:bg-indigo-900/50' :
                  action.color === 'purple' ? 'bg-purple-900/30 border-purple-800 hover:bg-purple-900/50' :
                  action.color === 'orange' ? 'bg-orange-900/30 border-orange-800 hover:bg-orange-900/50' :
                                             'bg-green-900/30 border-green-800 hover:bg-green-900/50'}`}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className={`text-sm font-medium
                ${action.color === 'indigo' ? 'text-indigo-300' :
                  action.color === 'purple' ? 'text-purple-300' :
                  action.color === 'orange' ? 'text-orange-300' :
                                             'text-green-300'}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
