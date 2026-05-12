import { useEffect } from 'react'
import { useSelfHealing } from '../../../hooks/useSelfHealing'

function RiskBadge({ risk }) {
  const colors = { CRITICAL: 'text-red-400 bg-red-900/30 border-red-700', HIGH: 'text-orange-400 bg-orange-900/30 border-orange-700', MEDIUM: 'text-yellow-400 bg-yellow-900/30 border-yellow-700', LOW: 'text-blue-400 bg-blue-900/30 border-blue-700', NOMINAL: 'text-green-400 bg-green-900/30 border-green-700' }
  return <span className={`border text-xs px-2 py-0.5 rounded font-medium ${colors[risk] || colors.NOMINAL}`}>{risk}</span>
}

function ProbabilityBar({ value }) {
  const pct   = Math.round(value * 100)
  const color = pct >= 75 ? '#ef4444' : pct >= 50 ? '#f97316' : pct >= 25 ? '#eab308' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-gray-300 text-xs w-8 text-right">{pct}%</span>
    </div>
  )
}

function Skeleton() {
  return <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-gray-800 rounded-xl h-20" />)}</div>
}

export default function FailureAnalyticsPanel() {
  const { failures, loading, error, loadFailures } = useSelfHealing()

  useEffect(() => { loadFailures() }, [loadFailures])

  const components = failures?.components || []
  const summary    = failures?.summary

  const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NOMINAL: 4 }
  const sorted = [...components].sort((a, b) => (riskOrder[a.risk] ?? 5) - (riskOrder[b.risk] ?? 5))

  const criticalCount = summary?.criticalCount || 0
  const highCount     = summary?.highCount     || 0

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Failure Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 6E — Predictive failure signals and instability heatmaps</p>
        </div>
        <button
          onClick={() => loadFailures(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 text-sm">{error}</div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Overall Risk',   value: summary.overallRisk,              danger: summary.overallRisk === 'CRITICAL', warn: summary.overallRisk === 'HIGH' },
            { label: 'Critical',       value: criticalCount,                    danger: criticalCount > 0 },
            { label: 'High Risk',      value: highCount,                        warn: highCount > 0 },
            { label: 'Fail Rate 1h',   value: `${summary.globalFailRate1h || 0}%` },
          ].map(({ label, value, danger, warn }) => (
            <div key={label} className={`rounded-xl p-4 ${danger ? 'bg-red-900/30 border border-red-700' : warn ? 'bg-orange-900/20 border border-orange-700' : 'bg-gray-800'}`}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${danger ? 'text-red-300' : warn ? 'text-orange-300' : 'text-white'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">Component Risk Analysis</h2>
          {sorted.length === 0
            ? <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center text-green-400">All components nominal — no failure signals detected</div>
            : sorted.map((comp, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <RiskBadge risk={comp.risk} />
                  <span className="text-white text-sm font-medium">{comp.componentId}</span>
                  <span className="text-gray-500 text-xs">({comp.componentType})</span>
                  <span className="text-gray-400 text-xs ml-auto">TTF: {comp.ttfEstimate}</span>
                </div>
                <ProbabilityBar value={comp.probability} />
                {comp.signals?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {comp.signals.map((s, j) => (
                      <span key={j} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">
                        {s.type.replace(/_/g, ' ')} = {typeof s.value === 'number' ? Math.round(s.value * 1000) / 1000 : s.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
