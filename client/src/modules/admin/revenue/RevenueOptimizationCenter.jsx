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

function DiagnosisBadge({ diagnosis }) {
  const map = {
    underpriced:    'bg-blue-900/40 text-blue-300 border-blue-700/40',
    overpriced:     'bg-red-900/40 text-red-300 border-red-700/40',
    optimal:        'bg-green-900/40 text-green-300 border-green-700/40',
    freemium_ready: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  }
  const labels = {
    underpriced: '↓ Underpriced',
    overpriced:  '↑ Overpriced',
    optimal:     '✓ Optimal',
    freemium_ready: '★ Freemium Ready',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${map[diagnosis] || map.optimal}`}>
      {labels[diagnosis] || diagnosis}
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
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[model] || 'bg-gray-700 text-gray-300'}`}>
      {model}
    </span>
  )
}

// ── Panel components ──────────────────────────────────────────────────────────

const PricingPanel = memo(function PricingPanel({ pricing }) {
  const [filter, setFilter] = useState('all')

  if (!pricing) return <Skeleton className="h-60" />

  const { byDiagnosis, count } = pricing
  const diagnoses = ['all', 'underpriced', 'freemium_ready', 'overpriced', 'optimal']

  const displayItems = filter === 'all'
    ? (pricing.assessments || [])
    : (byDiagnosis?.[filter] || [])

  const counts = {
    all:            count || 0,
    underpriced:    byDiagnosis?.underpriced?.length     || 0,
    freemium_ready: byDiagnosis?.freemium_ready?.length  || 0,
    overpriced:     byDiagnosis?.overpriced?.length      || 0,
    optimal:        byDiagnosis?.optimal?.length         || 0,
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {diagnoses.map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filter === d
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {d === 'all' ? 'All' : d.replace('_', ' ')} ({counts[d]})
          </button>
        ))}
      </div>

      {displayItems.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">No tools in this category</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-2 font-medium">Tool</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Current</th>
                <th className="pb-2 font-medium text-right">Rec. Pro</th>
                <th className="pb-2 font-medium text-right">Revenue Delta</th>
                <th className="pb-2 font-medium text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.slice(0, 30).map((item, i) => (
                <tr key={item.toolId || i} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                  <td className="py-2">
                    <p className="text-white truncate max-w-[140px]">{item.toolName}</p>
                    <p className="text-[10px] text-gray-600">{item.toolSlug}</p>
                  </td>
                  <td className="py-2 text-gray-400 capitalize">{item.category}</td>
                  <td className="py-2">
                    <DiagnosisBadge diagnosis={item.diagnosis} />
                  </td>
                  <td className="py-2 text-right text-gray-300">
                    {item.currentPrice > 0 ? `$${item.currentPrice}` : 'Free'}
                  </td>
                  <td className="py-2 text-right text-green-400">${item.recommendedPro}</td>
                  <td className="py-2 text-right text-blue-400 text-xs">
                    {item.revenueDelta || '—'}
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${item.confidenceScore || 0}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs">{item.confidenceScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})

const ConversionPanel = memo(function ConversionPanel({ optimization }) {
  if (!optimization) return <Skeleton className="h-60" />

  const opportunities = optimization.topOpportunities || []

  return (
    <div className="space-y-6">
      {opportunities.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
            Top Revenue Opportunities ({opportunities.length})
          </p>
          <div className="space-y-3">
            {opportunities.map((opp, i) => (
              <div key={opp.toolId || i} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{opp.toolSlug}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{opp.category} · conversion score {opp.conversionScore}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-400 font-bold text-sm">+${opp.revenueImpactOfFix?.toFixed(2)}/mo</p>
                    <p className="text-[10px] text-gray-600">if bottleneck fixed</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Bottleneck</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-400 font-medium capitalize">{opp.bottleneck?.stage}</span>
                      <span className="text-[10px] text-gray-600">{opp.bottleneck?.gapPct}% below baseline</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-1">Monetization Issue</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{opp.monetizationBottleneck?.detail}</p>
                  </div>
                </div>

                {opp.ctaPlacements?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-600 mb-1">CTA Recommendations</p>
                    <div className="flex flex-wrap gap-1">
                      {opp.ctaPlacements.map((cta, j) => (
                        <span key={j} className="text-[10px] bg-indigo-900/30 text-indigo-300 border border-indigo-700/30 px-2 py-0.5 rounded-full">
                          {cta.placement} +{cta.liftPct}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {opp.bounceTactics?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-600 mb-1">Bounce Reduction</p>
                    <div className="space-y-0.5">
                      {opp.bounceTactics.slice(0, 2).map((t, j) => (
                        <p key={j} className="text-xs text-gray-500">→ {t}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {opportunities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-green-400 text-lg mb-1">✓</p>
          <p className="text-gray-400 text-sm">No significant conversion gaps detected</p>
          <p className="text-gray-600 text-xs mt-1">All tools are converting near baseline</p>
        </div>
      )}
    </div>
  )
})

const RoutingInsightsPanel = memo(function RoutingInsightsPanel({ optimization }) {
  if (!optimization) return <Skeleton className="h-40" />
  const analyses = optimization.analyses || []
  if (!analyses.length) return (
    <p className="text-gray-500 text-sm py-4">No routing analysis available yet</p>
  )

  const modelCounts = {}
  for (const a of analyses) {
    const m = a.primaryModel || 'adsense'
    modelCounts[m] = (modelCounts[m] || 0) + 1
  }
  const total = analyses.length

  const avgScore = Math.round(
    analyses.reduce((s, a) => s + (a.conversionScore || 0), 0) / (analyses.length || 1)
  )

  const lowEngagement = analyses.filter(a => (a.funnelRates?.engagement || 1) < 0.55).length
  const lowRetention  = analyses.filter(a => (a.funnelRates?.retention  || 1) < 0.35).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Analyzed Tools</p>
          <p className="text-xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Avg Conv. Score</p>
          <p className="text-xl font-bold text-white">{avgScore}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Low Engagement</p>
          <p className={`text-xl font-bold ${lowEngagement > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {lowEngagement}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Low Retention</p>
          <p className={`text-xl font-bold ${lowRetention > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {lowRetention}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Monetization Model Distribution</p>
        <div className="space-y-2">
          {Object.entries(modelCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([model, count]) => (
              <div key={model} className="flex items-center gap-3">
                <ModelBadge model={model} />
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {count} ({Math.round((count / total) * 100)}%)
                </span>
              </div>
            ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">UI Recommendations Sample</p>
        <div className="space-y-1.5">
          {analyses
            .filter(a => a.uiRecommendations?.length > 0)
            .slice(0, 5)
            .flatMap(a => a.uiRecommendations.map(r => ({ tool: a.toolSlug, rec: r })))
            .slice(0, 8)
            .map(({ tool, rec }, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-indigo-400 font-medium flex-shrink-0">{tool}:</span>
                <span className="text-gray-400">{rec}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['pricing', 'conversion', 'routing']

export default function RevenueOptimizationCenter() {
  const [tab, setTab] = useState('pricing')
  const {
    pricing, optimization,
    loading, error,
    loadOptimizationCenter,
  } = useRevenueIntelligence()

  useEffect(() => {
    loadOptimizationCenter()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !pricing && !optimization) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadOptimizationCenter}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Revenue Optimization</h1>
            <p className="text-gray-400 text-sm mt-0.5">Phase 6C — Pricing, conversion &amp; monetization routing</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadOptimizationCenter}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition-colors"
            >
              {loading ? <Spinner size="sm" /> : '↻'}
              {loading ? 'Loading…' : 'Reload'}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {(pricing || optimization) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Tools Assessed</p>
              <p className="text-xl font-bold text-white">{pricing?.count || 0}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Underpriced</p>
              <p className="text-xl font-bold text-blue-400">
                {pricing?.byDiagnosis?.underpriced?.length || 0}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Freemium Ready</p>
              <p className="text-xl font-bold text-purple-400">
                {pricing?.byDiagnosis?.freemium_ready?.length || 0}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Conv. Opportunities</p>
              <p className="text-xl font-bold text-green-400">
                {optimization?.topOpportunities?.length || 0}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit border border-gray-800">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t === 'routing' ? 'Monetization Routing' : t === 'conversion' ? 'Conversion Gaps' : 'Pricing'}
            </button>
          ))}
        </div>

        {/* ── Pricing Tab ───────────────────────────────────────────────────── */}
        {tab === 'pricing' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Pricing Intelligence — {pricing?.count || 0} tools analyzed
            </h3>
            {loading && !pricing ? (
              <Skeleton className="h-64" />
            ) : (
              <PricingPanel pricing={pricing} />
            )}
          </div>
        )}

        {/* ── Conversion Tab ────────────────────────────────────────────────── */}
        {tab === 'conversion' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Conversion Optimization — Top Revenue Opportunities
            </h3>
            {loading && !optimization ? (
              <Skeleton className="h-64" />
            ) : (
              <ConversionPanel optimization={optimization} />
            )}
          </div>
        )}

        {/* ── Routing Tab ───────────────────────────────────────────────────── */}
        {tab === 'routing' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Monetization Routing Analysis
            </h3>
            {loading && !optimization ? (
              <Skeleton className="h-64" />
            ) : (
              <RoutingInsightsPanel optimization={optimization} />
            )}
          </div>
        )}

      </div>
    </div>
  )
}
