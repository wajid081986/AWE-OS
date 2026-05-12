import { memo, useEffect, useState, useCallback } from 'react'
import { useMarketplace } from '../../../hooks/useMarketplace'

// ── Shared primitives ─────────────────────────────────────────────────────────

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border' : 'w-8 h-8 border-2'
  return (
    <div className={`${s} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
  )
}

const ScoreRing = memo(function ScoreRing({ score, label, color = 'text-indigo-400', size = 'md' }) {
  const radius   = size === 'lg' ? 36 : 28
  const stroke   = size === 'lg' ? 5 : 4
  const cx       = radius + stroke
  const circ     = 2 * Math.PI * radius
  const dash     = ((score || 0) / 100) * circ
  const svgSize  = (radius + stroke) * 2
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

const VelocityBadge = memo(function VelocityBadge({ velocity }) {
  const map = {
    rising:   'bg-green-900/30 text-green-400 border-green-700/40',
    stable:   'bg-gray-700/40  text-gray-400  border-gray-600/40',
    declining: 'bg-red-900/30   text-red-400   border-red-700/40',
    dormant:  'bg-gray-800/60  text-gray-500  border-gray-700/40',
  }
  const icon = { rising: '↑', stable: '→', declining: '↓', dormant: '—' }
  const cls  = map[velocity] || map.stable
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      <span>{icon[velocity] || '→'}</span>
      {velocity}
    </span>
  )
})

// ── Sub-panels ────────────────────────────────────────────────────────────────

const EcosystemHealthPanel = memo(function EcosystemHealthPanel({ health }) {
  if (!health) return null
  const { ecosystemScore, riskFlags = [], recommendations = [], categoryDistribution = {},
          toolCount, activeToolCount, inactiveToolCount, qualityTrend, averageQuality,
          categoryBalanceScore, trafficDiversityScore, resilienceScore } = health

  const scoreColor = ecosystemScore >= 70 ? 'text-green-400' : ecosystemScore >= 50 ? 'text-yellow-400' : 'text-red-400'
  const borderColor = ecosystemScore >= 70 ? 'border-green-500/30' : ecosystemScore >= 50 ? 'border-yellow-500/30' : 'border-red-500/30'

  return (
    <div className={`bg-gray-800 border ${borderColor} rounded-xl overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-800/80">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <h3 className="text-sm font-semibold text-white">Ecosystem Health</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-2xl font-black ${scoreColor}`}>{ecosystemScore}</span>
          <span className="text-gray-500 text-xs">/100</span>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Score breakdown */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Balance',     score: categoryBalanceScore  || 0 },
            { label: 'Traffic Div', score: trafficDiversityScore || 0 },
            { label: 'Resilience',  score: resilienceScore       || 0 },
            { label: 'Avg Quality', score: averageQuality        || 0 },
          ].map(({ label, score }) => (
            <div key={label} className="bg-gray-700/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-gray-500 mb-1.5">{label}</p>
              <ScoreRing score={score} />
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Total Tools', value: toolCount ?? '—', color: 'text-white' },
            { label: 'Active',      value: activeToolCount ?? '—', color: 'text-green-400' },
            { label: 'Inactive',    value: inactiveToolCount ?? '—', color: inactiveToolCount > 0 ? 'text-yellow-400' : 'text-gray-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-700/30 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Quality trend */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
          qualityTrend === 'improving' ? 'bg-green-950/30 border-green-700/40 text-green-400' :
          qualityTrend === 'declining' ? 'bg-red-950/30 border-red-700/40 text-red-400' :
          'bg-gray-700/30 border-gray-600/40 text-gray-400'
        }`}>
          <span>{qualityTrend === 'improving' ? '📈' : qualityTrend === 'declining' ? '📉' : '📊'}</span>
          Quality trend: <span className="font-semibold capitalize ml-1">{qualityTrend}</span>
        </div>

        {/* Category distribution */}
        {Object.keys(categoryDistribution).length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Category Distribution</p>
            <div className="space-y-1.5">
              {Object.entries(categoryDistribution)
                .sort((a, b) => b[1].percentage - a[1].percentage)
                .slice(0, 6)
                .map(([cat, data]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 w-20 shrink-0 capitalize">{cat}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, data.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 w-8 text-right">{data.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk flags */}
        {riskFlags.length > 0 && (
          <div className="space-y-1.5">
            {riskFlags.map((flag, i) => (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
                flag.severity === 'critical' ? 'bg-red-950/30 border-red-700/40' :
                flag.severity === 'high'     ? 'bg-orange-950/30 border-orange-700/40' :
                'bg-yellow-950/20 border-yellow-700/30'
              }`}>
                <span className="shrink-0 mt-0.5">
                  {flag.severity === 'critical' ? '🚨' : flag.severity === 'high' ? '⚠️' : '🔔'}
                </span>
                <span className={
                  flag.severity === 'critical' ? 'text-red-400' :
                  flag.severity === 'high'     ? 'text-orange-400' : 'text-yellow-400'
                }>{flag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Recommendations</p>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                  <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
})

const TrendHeatmap = memo(function TrendHeatmap({ trends }) {
  if (!trends) return null
  const { trendingCategories = [], underservedMarkets = [], saturationRisk = [], risingKeywords = [], opportunityScore } = trends

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <h3 className="text-sm font-semibold text-white">Market Trends</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">Overall Opportunity</span>
          <span className={`text-sm font-bold ${opportunityScore >= 65 ? 'text-green-400' : opportunityScore >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
            {opportunityScore ?? '—'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Trending categories */}
        {trendingCategories.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Trending Categories</p>
            <div className="space-y-2">
              {trendingCategories.slice(0, 5).map(tc => (
                <div key={tc.category} className="flex items-center gap-3 bg-gray-700/30 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white capitalize">{tc.category}</span>
                      <VelocityBadge velocity={tc.velocity} />
                      {tc.seasonalBoost === 'high' && (
                        <span className="text-[10px] bg-orange-900/30 text-orange-400 border border-orange-700/40 px-1 py-0.5 rounded">seasonal</span>
                      )}
                    </div>
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${tc.opportunityScore}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-green-400">{tc.opportunityScore}</p>
                    <p className="text-[10px] text-gray-500">sat. {tc.saturation}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Underserved markets */}
        {underservedMarkets.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Underserved Markets</p>
            <div className="flex flex-wrap gap-1.5">
              {underservedMarkets.map(m => (
                <div key={m.category} className="bg-blue-900/20 border border-blue-700/30 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[11px] font-semibold text-blue-300 capitalize">{m.category}</p>
                  <p className="text-[10px] text-gray-500">{m.toolGap} tool gap</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saturation risk */}
        {saturationRisk.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Saturation Risk</p>
            <div className="space-y-1">
              {saturationRisk.map(s => (
                <div key={s.category} className="flex items-center gap-2 text-xs">
                  <span className={s.risk === 'critical' ? 'text-red-400' : s.risk === 'high' ? 'text-orange-400' : 'text-yellow-400'}>
                    {s.risk === 'critical' ? '🚫' : '⚠️'}
                  </span>
                  <span className="text-gray-400 capitalize">{s.category}</span>
                  <span className="text-gray-500">({s.toolCount}/{s.capacity} tools)</span>
                  <span className={`ml-auto font-mono text-[10px] ${s.risk === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>
                    {s.saturation}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rising keywords */}
        {risingKeywords.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Rising Keywords</p>
            <div className="flex flex-wrap gap-1">
              {risingKeywords.slice(0, 8).map((kw, i) => (
                <span key={i} className="text-[10px] bg-gray-700/60 text-gray-300 border border-gray-600/40 px-1.5 py-0.5 rounded font-mono">
                  {kw.keyword}
                  <span className={`ml-1 ${kw.velocity === 'rising' ? 'text-green-400' : 'text-gray-500'}`}>
                    {kw.confidence}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

const OpportunityRankList = memo(function OpportunityRankList({ plan, onQueue, actionLoading }) {
  if (!plan?.launchQueue) return null
  const queue = plan.launchQueue || []

  if (queue.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
        <p className="text-4xl mb-3">🎯</p>
        <p className="text-sm text-gray-400">No opportunities in launch queue</p>
        <p className="text-xs text-gray-600 mt-1">All categories may be paused or saturated</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-sm font-semibold text-white">Launch Queue</h3>
          <span className="text-[10px] bg-indigo-900/50 text-indigo-400 border border-indigo-700/40 px-2 py-0.5 rounded-full">
            {queue.length} opportunities
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-700/50">
        {queue.map((item) => (
          <div key={item.rank} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-700/20 transition-colors">
            <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-indigo-400">{item.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded capitalize">{item.category}</span>
                <VelocityBadge velocity={item.trendSignal} />
                {item.timing === 'peak' && (
                  <span className="text-[10px] bg-orange-900/30 text-orange-400 border border-orange-700/40 px-1.5 py-0.5 rounded">peak season</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mb-1.5">{item.description}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-gray-500">Score: <span className="text-white font-medium">{item.opportunityScore}</span></span>
                <span className="text-[10px] text-gray-500">Confidence: <span className="text-green-400 font-medium">{item.launchConfidence}%</span></span>
                <span className="text-[10px] text-gray-500 capitalize">Complexity: <span className="text-white">{item.complexity}</span></span>
                {item.estimatedROI && (
                  <span className="text-[10px] text-gray-500">
                    ROI: <span className="text-green-400">${item.estimatedROI.monthlyRevLow}–${item.estimatedROI.monthlyRevHigh}/mo</span>
                  </span>
                )}
                <span className="text-[10px] bg-gray-700/50 text-gray-400 px-1.5 py-0.5 rounded capitalize">{item.horizon}</span>
              </div>
            </div>
            <button
              onClick={() => onQueue(item)}
              disabled={actionLoading}
              className="shrink-0 text-[10px] bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-40 border border-indigo-500/40 text-indigo-400 px-2 py-1 rounded transition-colors"
            >
              Queue →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
})

const ExpansionRoadmap = memo(function ExpansionRoadmap({ plan }) {
  if (!plan?.roadmap?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <h3 className="text-sm font-semibold text-white">Expansion Roadmap</h3>
      </div>
      <div className="p-5 space-y-3">
        {plan.roadmap.map((phase) => (
          <div key={phase.phase} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-indigo-400">{phase.phase}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-white">{phase.horizon}</p>
              </div>
              <p className="text-[11px] text-gray-500 mb-1">{phase.focus}</p>
              {phase.items?.length > 0 && (
                <ul className="space-y-0.5">
                  {phase.items.map((item, i) => (
                    <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1">
                      <span className="text-indigo-400 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {phase.expectedValue && (
                <p className="text-[10px] text-green-400 mt-1">→ {phase.expectedValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const LearningPanel = memo(function LearningPanel({ learning }) {
  if (!learning) return null
  const { adjustments = [], strategyRecommendations = [], overallSuccessRate, adaptiveThresholds } = learning

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
        <span className="text-lg">🧬</span>
        <h3 className="text-sm font-semibold text-white">Learning Signals</h3>
        {overallSuccessRate > 0 && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ml-auto ${
            overallSuccessRate >= 60 ? 'bg-green-900/30 text-green-400 border-green-700/40' :
            overallSuccessRate >= 40 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700/40' :
            'bg-red-900/30 text-red-400 border-red-700/40'
          }`}>{overallSuccessRate}% success rate</span>
        )}
      </div>
      <div className="p-5 space-y-3">
        {/* Adaptive thresholds */}
        {adaptiveThresholds && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Min Score', value: adaptiveThresholds.recommendedMinScore },
              { label: 'Max Concurrent', value: adaptiveThresholds.recommendedMaxConcurrent },
              { label: 'Velocity', value: adaptiveThresholds.expansionVelocity, isText: true },
            ].map(({ label, value, isText }) => (
              <div key={label} className="bg-gray-700/30 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                <p className={`text-xs font-bold capitalize ${isText ? (value === 'increase' ? 'text-green-400' : value === 'decrease' ? 'text-red-400' : 'text-yellow-400') : 'text-white'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Adjustments */}
        {adjustments.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Category Adjustments</p>
            <div className="space-y-1.5">
              {adjustments.slice(0, 6).map((adj, i) => (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
                  adj.type === 'boost'          ? 'bg-green-950/20 border-green-700/30' :
                  adj.type === 'fatigue_warning' ? 'bg-orange-950/20 border-orange-700/30' :
                  'bg-red-950/20 border-red-700/30'
                }`}>
                  <span className="shrink-0">
                    {adj.type === 'boost' ? '⬆️' : adj.type === 'fatigue_warning' ? '😴' : '⬇️'}
                  </span>
                  <div className="min-w-0">
                    <span className={`font-semibold capitalize mr-1.5 ${
                      adj.type === 'boost' ? 'text-green-400' :
                      adj.type === 'fatigue_warning' ? 'text-orange-400' : 'text-red-400'
                    }`}>{adj.category}</span>
                    <span className="text-gray-400">{adj.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy */}
        {strategyRecommendations.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Strategy</p>
            <ul className="space-y-1">
              {strategyRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                  <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
})

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function MarketplaceDashboard() {
  const {
    plan, health, trends, learning, loading, actionLoading, error,
    loadExpansionPlan, queueOpportunity, refreshAll,
  } = useMarketplace()

  const [toast, setToast] = useState(null)
  const [tab,   setTab]   = useState('overview')

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    loadExpansionPlan()
  }, [loadExpansionPlan])

  const handleQueue = useCallback(async (opportunity) => {
    const res = await queueOpportunity(opportunity)
    if (res.success) showToast(`"${opportunity.title}" queued for review`)
    else showToast(res.error || 'Queue failed', false)
  }, [queueOpportunity, showToast])

  const handleRefresh = useCallback(async () => {
    showToast('Refreshing marketplace intelligence…', true)
    await refreshAll()
    showToast('Marketplace data refreshed')
  }, [refreshAll, showToast])

  const TABS = [
    { key: 'overview',     label: 'Overview'    },
    { key: 'trends',       label: 'Trends'      },
    { key: 'opportunities', label: 'Opportunities' },
    { key: 'learning',     label: 'Learning'    },
  ]

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Marketplace Intelligence</h1>
            <p className="text-gray-400 text-sm mt-0.5">Autonomous expansion engine — trend detection, opportunity ranking, ecosystem health</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-50 border border-indigo-500/40 text-indigo-400 text-xs font-semibold rounded-lg transition-colors"
          >
            {loading ? <Spinner size="sm" /> : <span>↻</span>}
            Refresh
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg transition-all ${
            toast.ok ? 'bg-green-950 border-green-700 text-green-400' : 'bg-red-950 border-red-700 text-red-400'
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mb-6 bg-red-950/30 border border-red-700/40 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !plan && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner />
            <p className="text-gray-400 text-sm">Running marketplace intelligence pipeline…</p>
          </div>
        )}

        {/* Summary row */}
        {health && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Ecosystem Score',   value: health.ecosystemScore,         color: health.ecosystemScore >= 70 ? 'text-green-400' : 'text-yellow-400' },
              { label: 'Total Tools',       value: health.toolCount,              color: 'text-white' },
              { label: 'Launch Queue',      value: plan?.launchQueue?.length || 0, color: 'text-indigo-400' },
              { label: 'Trending Cats',     value: trends?.trendingCategories?.length || 0, color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {plan && (
          <>
            <div className="flex gap-1 mb-6 border-b border-gray-700 pb-1">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-xs font-medium rounded-t transition-colors ${
                    tab === t.key
                      ? 'text-white bg-indigo-600/20 border-b-2 border-indigo-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <EcosystemHealthPanel health={health} />
                <TrendHeatmap trends={trends} />
                <OpportunityRankList plan={plan} onQueue={handleQueue} actionLoading={actionLoading} />
                <ExpansionRoadmap plan={plan} />
              </div>
            )}

            {tab === 'trends' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <TrendHeatmap trends={trends} />
                <div className="space-y-5">
                  <EcosystemHealthPanel health={health} />
                </div>
              </div>
            )}

            {tab === 'opportunities' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <OpportunityRankList plan={plan} onQueue={handleQueue} actionLoading={actionLoading} />
                <ExpansionRoadmap plan={plan} />
              </div>
            )}

            {tab === 'learning' && (
              <LearningPanel learning={learning} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
