import { useEffect, useState } from 'react'
import { useAgentEconomy } from '../../../hooks/useAgentEconomy'

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="animate-pulse bg-gray-800 rounded-xl h-24" />
      ))}
    </div>
  )
}

function HeatmapPanel({ demandHeatmap }) {
  if (!demandHeatmap || !Object.keys(demandHeatmap).length) {
    return <p className="text-gray-500 text-sm">No demand data yet.</p>
  }
  const entries  = Object.entries(demandHeatmap).sort((a, b) => b[1] - a[1])
  const maxCount = entries[0]?.[1] || 1

  return (
    <div className="space-y-2">
      {entries.map(([cat, count]) => {
        const pct = Math.round((count / maxCount) * 100)
        const color = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f97316' : pct >= 25 ? '#eab308' : '#22c55e'
        return (
          <div key={cat} className="flex items-center gap-3">
            <span className="text-gray-300 text-xs w-32 truncate shrink-0">{cat}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-gray-400 text-xs w-10 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function RoutingMatrixPanel({ routingMatrix }) {
  if (!routingMatrix || !Object.keys(routingMatrix).length) {
    return <p className="text-gray-500 text-sm">No routing data yet.</p>
  }
  return (
    <div className="space-y-3">
      {Object.entries(routingMatrix).map(([category, agents]) => {
        const topAgent = Object.entries(agents).sort((a, b) => b[1] - a[1])[0]
        return (
          <div key={category} className="flex items-center gap-3 bg-gray-700/50 rounded-lg px-4 py-2">
            <span className="text-gray-300 text-sm w-36 truncate shrink-0">{category}</span>
            <span className="text-blue-400 text-xs font-mono">{topAgent?.[0] || '—'}</span>
            <span className="ml-auto text-gray-500 text-xs">{topAgent?.[1] || 0} routes</span>
          </div>
        )
      })}
    </div>
  )
}

function CapabilityPanel({ capCatalog }) {
  if (!capCatalog || !Object.keys(capCatalog).length) {
    return <p className="text-gray-500 text-sm">No capabilities indexed yet.</p>
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(capCatalog).slice(0, 18).map(([cap, info]) => (
        <div key={cap} className="bg-gray-700/50 rounded-lg px-3 py-2">
          <p className="text-white text-xs font-medium truncate">{cap}</p>
          <p className="text-gray-400 text-xs mt-1">{info.agentCount} agent{info.agentCount !== 1 ? 's' : ''}</p>
        </div>
      ))}
    </div>
  )
}

function CoverageGapsPanel({ coverageGaps }) {
  if (!coverageGaps?.length) {
    return <p className="text-green-400 text-sm">No coverage gaps detected.</p>
  }
  return (
    <div className="space-y-2">
      {coverageGaps.map((gap, i) => (
        <div key={i} className="flex items-center gap-3 bg-orange-900/20 border border-orange-800 rounded-lg px-4 py-2">
          <span className="text-orange-300 text-sm flex-1">{gap.category}</span>
          <span className="text-orange-400 text-xs">{gap.demandCount} requests — no dedicated agent</span>
        </div>
      ))}
    </div>
  )
}

function SpecializationGrid({ specializations }) {
  const profiles = specializations?.profiles || []
  if (!profiles.length) return <p className="text-gray-500 text-sm">No specialization data yet.</p>
  return (
    <div className="space-y-3">
      {profiles.slice(0, 10).map(agent => (
        <div key={agent.agentId} className="bg-gray-700/50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-white text-sm font-medium">{agent.agentId}</p>
            <span className="bg-blue-900/40 border border-blue-700 text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {agent.specializationCount} spec{agent.specializationCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(agent.strengths || []).slice(0, 6).map(s => (
              <span key={s.category} className="bg-gray-600 text-gray-200 text-xs px-2 py-0.5 rounded-full">
                {s.category} {Math.round(s.affinityScore)}%
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const TABS = ['demand', 'routing', 'capabilities', 'coverage', 'specializations']

export default function AgentMarketplaceDashboard() {
  const { marketplace, specializations, loading, error, loadMarketplace, loadSpecializations } = useAgentEconomy()
  const [tab, setTab] = useState('demand')

  useEffect(() => {
    loadMarketplace()
    loadSpecializations()
  }, [loadMarketplace, loadSpecializations])

  const state  = marketplace
  const health = state?.marketplaceHealth

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Marketplace</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 6D — Demand heatmaps, routing matrix, capability index</p>
        </div>
        <button
          onClick={() => { loadMarketplace(true); loadSpecializations() }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 text-sm">{error}</div>
      )}

      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Capabilities',   value: health.totalCapabilities },
            { label: 'Demand Events',  value: health.totalDemandEvents },
            { label: 'Routing Rate',   value: `${health.routingRate}%` },
            { label: 'Coverage Score', value: `${health.coverageScore}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-700 pb-0">
        {TABS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize font-medium border-b-2 transition-colors -mb-px
              ${tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <Skeleton />}

      {!loading && tab === 'demand'          && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">24h Demand Heatmap</h2><HeatmapPanel demandHeatmap={state?.demandHeatmap} /></div>}
      {!loading && tab === 'routing'         && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">Routing Matrix (top agent per category)</h2><RoutingMatrixPanel routingMatrix={state?.routingMatrix} /></div>}
      {!loading && tab === 'capabilities'    && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">Capability Index</h2><CapabilityPanel capCatalog={state?.capCatalog} /></div>}
      {!loading && tab === 'coverage'        && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">Coverage Gaps</h2><CoverageGapsPanel coverageGaps={state?.coverageGaps} /></div>}
      {!loading && tab === 'specializations' && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">Agent Specializations</h2><SpecializationGrid specializations={specializations} /></div>}
    </div>
  )
}
