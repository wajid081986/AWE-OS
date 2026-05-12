import { memo, useEffect, useState, useCallback } from 'react'
import { useRevenueIntelligence } from '../../../hooks/useRevenueIntelligence'

// ── Shared primitives ─────────────────────────────────────────────────────────

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border' : 'w-8 h-8 border-2'
  return (
    <div className={`${s} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
  )
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-800 rounded-xl ${className}`} />
}

const ScoreRing = memo(function ScoreRing({ score, label, color = 'text-indigo-400', size = 'md' }) {
  const radius  = size === 'lg' ? 36 : 28
  const stroke  = size === 'lg' ? 5 : 4
  const cx      = radius + stroke
  const circ    = 2 * Math.PI * radius
  const dash    = ((score || 0) / 100) * circ
  const svgSize = (radius + stroke) * 2
  const barColor = (score || 0) >= 70 ? '#22c55e' : (score || 0) >= 50 ? '#eab308' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="#374151" strokeWidth={stroke} />
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke={barColor} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease' }} />
      </svg>
      <p className={`text-xs font-bold ${color} -mt-1`}>{score ?? '—'}</p>
      {label && <p className="text-[10px] text-gray-500 text-center leading-tight">{label}</p>}
    </div>
  )
})

function RiskBadge({ risk }) {
  const map = {
    critical: 'bg-red-900/40 text-red-400 border-red-700/50',
    high:     'bg-orange-900/40 text-orange-400 border-orange-700/50',
    moderate: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
    low:      'bg-green-900/40 text-green-400 border-green-700/50',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide ${map[risk] || map.low}`}>
      {risk}
    </span>
  )
}

function ModelBadge({ model }) {
  const map = {
    subscription: 'bg-indigo-900/40 text-indigo-300',
    adsense:      'bg-blue-900/40 text-blue-300',
    affiliate:    'bg-purple-900/40 text-purple-300',
    leadGen:      'bg-teal-900/40 text-teal-300',
    enterprise:   'bg-amber-900/40 text-amber-300',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[model] || map.adsense}`}>
      {model}
    </span>
  )
}

// ── Panel components ──────────────────────────────────────────────────────────

const HealthOverviewPanel = memo(function HealthOverviewPanel({ analytics, learning }) {
  const score = analytics?.revenueHealthScore ?? 0
  const mrr   = analytics?.totalEstimatedMRR  ?? 0
  const eff   = analytics?.monetizationEfficiency ?? 0
  const gini  = analytics?.giniCoefficient ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Health Score</p>
          <RiskBadge risk={analytics?.concentrationRisk || 'low'} />
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={score} size="lg" />
          <div>
            <p className="text-2xl font-bold text-white">{score}</p>
            <p className="text-xs text-gray-500">/ 100</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Est. Monthly MRR</p>
        <p className="text-2xl font-bold text-green-400">${mrr.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1">
          {analytics?.toolCount ?? 0} published tools
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Monetization Efficiency</p>
        <p className="text-2xl font-bold text-white">${eff.toFixed(4)}</p>
        <p className="text-xs text-gray-500 mt-1">per tool use</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Revenue Concentration</p>
        <p className="text-2xl font-bold text-white">Gini {gini.toFixed(3)}</p>
        <p className="text-xs text-gray-500 mt-1">
          Diversification: {analytics?.diversificationScore ?? 0}%
        </p>
        {learning?.driftAlert && (
          <p className="text-xs text-red-400 mt-2">⚠ Drift alert — recalibrate baselines</p>
        )}
      </div>
    </div>
  )
})

const TopEarnersPanel = memo(function TopEarnersPanel({ earners }) {
  if (!earners?.length) return (
    <p className="text-gray-500 text-sm py-6 text-center">No earner data yet</p>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 text-left">
            <th className="pb-2 font-medium w-6">#</th>
            <th className="pb-2 font-medium">Tool</th>
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium text-right">MRR</th>
            <th className="pb-2 font-medium text-right">RPM</th>
            <th className="pb-2 font-medium text-right">Quality</th>
          </tr>
        </thead>
        <tbody>
          {earners.map((t, i) => (
            <tr key={t.id || i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="py-2 text-gray-600">{i + 1}</td>
              <td className="py-2">
                <p className="text-white font-medium truncate max-w-[160px]">{t.name}</p>
                <p className="text-[10px] text-gray-500">{t.slug}</p>
              </td>
              <td className="py-2">
                <ModelBadge model={t.category} />
              </td>
              <td className="py-2 text-right text-green-400 font-medium">
                ${(t.monthlyRevenue || 0).toFixed(2)}
              </td>
              <td className="py-2 text-right text-gray-300">
                ${(t.rpm || 0).toFixed(2)}
              </td>
              <td className="py-2 text-right">
                <div className="inline-flex items-center gap-1">
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${t.qualityScore || 0}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs">{t.qualityScore ?? '—'}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

const CategoryBreakdownPanel = memo(function CategoryBreakdownPanel({ breakdown, totalMRR }) {
  if (!breakdown || !Object.keys(breakdown).length) return (
    <p className="text-gray-500 text-sm py-6 text-center">No category data yet</p>
  )
  const sorted = Object.entries(breakdown)
    .sort(([, a], [, b]) => b.totalMonthlyRevenue - a.totalMonthlyRevenue)
  const maxRev = sorted[0]?.[1]?.totalMonthlyRevenue || 1

  return (
    <div className="space-y-3">
      {sorted.map(([cat, data]) => {
        const share = totalMRR > 0 ? ((data.totalMonthlyRevenue / totalMRR) * 100).toFixed(1) : '0.0'
        return (
          <div key={cat}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300 capitalize font-medium">{cat}</span>
              <span className="text-gray-400">
                ${data.totalMonthlyRevenue.toFixed(2)}
                <span className="text-gray-600 ml-1">({share}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(data.totalMonthlyRevenue / maxRev) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>{data.toolCount} tools</span>
              <span>avg ${data.avgToolRevenue.toFixed(2)}/tool</span>
            </div>
          </div>
        )
      })}
    </div>
  )
})

const RiskFlagsPanel = memo(function RiskFlagsPanel({ flags }) {
  if (!flags?.length) return (
    <div className="flex items-center gap-2 py-4">
      <span className="text-green-400 text-lg">✓</span>
      <p className="text-green-400 text-sm">No active risk flags</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {flags.map((f, i) => (
        <div key={i} className={`rounded-lg px-4 py-3 border text-sm ${
          f.severity === 'critical' ? 'bg-red-900/20 border-red-700/40 text-red-300' :
          f.severity === 'high'     ? 'bg-orange-900/20 border-orange-700/40 text-orange-300' :
          'bg-yellow-900/20 border-yellow-700/40 text-yellow-300'
        }`}>
          <span className="font-medium capitalize">{f.type.replace(/_/g, ' ')}: </span>
          {f.message}
        </div>
      ))}
    </div>
  )
})

const ForecastPanel = memo(function ForecastPanel({ forecast }) {
  if (!forecast) return <Skeleton className="h-40" />
  const { scenarios, categoryProjections } = forecast
  const topCats = Object.entries(categoryProjections || {})
    .sort(([, a], [, b]) => b.totalCategoryMRR - a.totalCategoryMRR)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {['conservative', 'base', 'optimistic'].map(key => {
          const s = scenarios?.[key]
          return (
            <div key={key} className={`rounded-xl p-4 border ${
              key === 'base'
                ? 'border-indigo-600 bg-indigo-950/40'
                : 'border-gray-800 bg-gray-900'
            }`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">{key}</p>
              <p className="text-xs text-gray-500 mb-1">Month 1</p>
              <p className="text-lg font-bold text-white">${(s?.month1 || 0).toFixed(0)}</p>
              <p className="text-xs text-gray-600">Month 3: ${(s?.month3 || 0).toFixed(0)}</p>
              <p className="text-[10px] text-indigo-400 mt-1">+{s?.growthRatePct ?? 0}%/mo</p>
            </div>
          )
        })}
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Category Projections</p>
        <div className="space-y-2">
          {topCats.map(([cat, proj]) => (
            <div key={cat} className="flex items-center justify-between text-sm">
              <span className="text-gray-300 capitalize w-28 truncate">{cat}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">{proj.toolCount} tools</span>
                <span className="text-gray-400 text-xs">RPM ${proj.avgRPM?.toFixed(2)}</span>
                <span className="text-green-400 font-medium w-20 text-right">
                  ${proj.totalCategoryMRR?.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

const LearningPanel = memo(function LearningPanel({ learning }) {
  if (!learning) return <Skeleton className="h-40" />
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Evaluations</p>
          <p className="text-lg font-bold text-white">{learning.totalEvaluations || 0}</p>
          <p className="text-[10px] text-gray-600">{learning.dataWindow}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Drift</p>
          <p className={`text-lg font-bold ${(learning.avgPredictionDrift || 0) > 30 ? 'text-red-400' : 'text-white'}`}>
            {learning.avgPredictionDrift ?? 0}%
          </p>
          {learning.driftAlert && <p className="text-[10px] text-red-400">alert</p>}
        </div>
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase mb-1">MRR Trend</p>
          <p className={`text-lg font-bold ${(learning.healthTrend?.mrrSlope || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(learning.healthTrend?.mrrSlope || 0) >= 0 ? '+' : ''}{learning.healthTrend?.mrrSlope ?? 0}%
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Strategies</p>
          <p className="text-lg font-bold text-white">{learning.strategyRecommendations?.length ?? 0}</p>
          <p className="text-[10px] text-gray-600">active</p>
        </div>
      </div>

      {learning.strategyRecommendations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Strategy Signals</p>
          {learning.strategyRecommendations.map((s, i) => (
            <div key={i} className={`rounded-lg px-4 py-3 border text-xs ${
              s.priority === 'high'   ? 'bg-red-900/20 border-red-700/40 text-red-300' :
              s.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' :
              s.priority === 'info'   ? 'bg-blue-900/20 border-blue-700/40 text-blue-300' :
              'bg-gray-800 border-gray-700 text-gray-400'
            }`}>
              <span className="font-medium uppercase tracking-wide">{s.type.replace(/_/g, ' ')}: </span>
              {s.detail}
            </div>
          ))}
        </div>
      )}

      {Object.keys(learning.categoryAccuracy || {}).length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Category Accuracy</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left pb-1.5">Category</th>
                  <th className="text-right pb-1.5">Samples</th>
                  <th className="text-right pb-1.5">Accuracy</th>
                  <th className="text-right pb-1.5">Bias</th>
                  <th className="text-left pb-1.5 pl-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(learning.categoryAccuracy).map(([cat, acc]) => (
                  <tr key={cat} className="border-b border-gray-800/30">
                    <td className="py-1.5 text-gray-300 capitalize">{cat}</td>
                    <td className="py-1.5 text-right text-gray-500">{acc.count}</td>
                    <td className={`py-1.5 text-right font-medium ${acc.accuracyPct >= 80 ? 'text-green-400' : acc.accuracyPct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {acc.accuracyPct}%
                    </td>
                    <td className={`py-1.5 text-right ${acc.biasPct > 5 ? 'text-blue-400' : acc.biasPct < -5 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {acc.biasPct > 0 ? '+' : ''}{acc.biasPct}%
                    </td>
                    <td className="py-1.5 pl-3 text-gray-600 max-w-[200px] truncate">{acc.calibrationNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['overview', 'analytics', 'forecast', 'learning']

export default function RevenueDashboard() {
  const [tab, setTab] = useState('overview')
  const {
    analytics, forecast, learning,
    loading, refreshing, error,
    loadDashboard, loadForecast, refreshAll,
  } = useRevenueIntelligence()

  useEffect(() => {
    loadDashboard()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleForecastTab = useCallback(async () => {
    setTab('forecast')
    if (!forecast) await loadForecast()
  }, [forecast, loadForecast])

  if (error && !analytics) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const recs = analytics?.recommendations || []

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Revenue Intelligence</h1>
            <p className="text-gray-400 text-sm mt-0.5">Phase 6C — Autonomous monetization analytics</p>
          </div>
          <div className="flex items-center gap-3">
            {analytics?.analyzedAt && (
              <p className="text-xs text-gray-600">
                Updated {new Date(analytics.analyzedAt).toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={refreshAll}
              disabled={refreshing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {refreshing ? <Spinner size="sm" /> : '↻'}
              {refreshing ? 'Refreshing…' : 'Refresh All'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit border border-gray-800">
          {TABS.map(t => (
            <button
              key={t}
              onClick={t === 'forecast' ? handleForecastTab : () => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>
            {loading && !analytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-64" />
              </div>
            ) : (
              <>
                <HealthOverviewPanel analytics={analytics} learning={learning} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Top Earners</h3>
                    <TopEarnersPanel earners={analytics?.topEarners} />
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Category Revenue Breakdown</h3>
                    <CategoryBreakdownPanel
                      breakdown={analytics?.categoryBreakdown}
                      totalMRR={analytics?.totalEstimatedMRR || 1}
                    />
                  </div>
                </div>

                {recs.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">Recommendations</h3>
                    <div className="space-y-2">
                      {recs.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                          <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Risk Flags</h3>
                  <RiskFlagsPanel flags={analytics?.riskFlags} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Analytics Tab ─────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            {loading && !analytics ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Revenue Health Breakdown</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Health Score', value: analytics?.revenueHealthScore, suffix: '/100' },
                      { label: 'Diversification', value: analytics?.diversificationScore, suffix: '%' },
                      { label: 'Efficiency Score', value: analytics?.efficiencyScore, suffix: '/100' },
                      { label: 'Gini Coefficient', value: analytics?.giniCoefficient?.toFixed(3), suffix: '' },
                    ].map(({ label, value, suffix }) => (
                      <div key={label} className="bg-gray-800 rounded-xl p-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                        <p className="text-xl font-bold text-white">{value ?? '—'}{suffix}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">
                    Underperformers ({analytics?.underperformers?.length || 0})
                  </h3>
                  {!analytics?.underperformers?.length ? (
                    <p className="text-gray-500 text-sm">No underperformers detected</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-800">
                            <th className="text-left pb-2 font-medium">Tool</th>
                            <th className="text-right pb-2 font-medium">MRR</th>
                            <th className="text-right pb-2 font-medium">Uses</th>
                            <th className="text-left pb-2 font-medium pl-4">Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.underperformers.map((t, i) => (
                            <tr key={t.id || i} className="border-b border-gray-800/30">
                              <td className="py-2">
                                <p className="text-white truncate max-w-[140px]">{t.name}</p>
                                <p className="text-[10px] text-gray-600 capitalize">{t.category}</p>
                              </td>
                              <td className="py-2 text-right text-red-400">${(t.monthlyRevenue || 0).toFixed(2)}</td>
                              <td className="py-2 text-right text-gray-400">{t.usageCount}</td>
                              <td className="py-2 text-xs text-gray-500 pl-4 max-w-[220px]">{t.issue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Forecast Tab ─────────────────────────────────────────────────── */}
        {tab === 'forecast' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Revenue Forecast (3-Month Scenarios)</h3>
            <ForecastPanel forecast={forecast} />
          </div>
        )}

        {/* ── Learning Tab ─────────────────────────────────────────────────── */}
        {tab === 'learning' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Learning Engine — Prediction Accuracy &amp; Drift</h3>
            <LearningPanel learning={learning} />
          </div>
        )}

      </div>
    </div>
  )
}
