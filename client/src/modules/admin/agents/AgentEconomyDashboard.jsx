import { useEffect, useState } from 'react'
import { useAgentEconomy } from '../../../hooks/useAgentEconomy'

function ScoreRing({ score, size = 56 }) {
  const pct    = Math.min(100, Math.max(0, score || 0))
  const r      = (size - 8) / 2
  const circ   = 2 * Math.PI * r
  const dash   = (pct / 100) * circ
  const color  = pct >= 70 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#374151" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size < 48 ? 10 : 12} fill={color} fontWeight="700">
        {Math.round(pct)}
      </text>
    </svg>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="animate-pulse bg-gray-800 rounded-xl h-20" />
      ))}
    </div>
  )
}

function GradeBadge({ grade }) {
  const colors = { S: 'bg-purple-500', A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white ${colors[grade] || 'bg-gray-600'}`}>
      {grade}
    </span>
  )
}

function HealthPanel({ health }) {
  if (!health) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Avg Score',    value: health.avgScore?.toFixed(1) || '—',  sub: `Grade ${health.economyGrade}` },
        { label: 'Agents',       value: health.totalAgents  || 0,             sub: 'tracked' },
        { label: 'Elite',        value: health.eliteCount   || 0,             sub: '≥ 80 score' },
        { label: 'Total Credits',value: (health.totalCredits || 0).toLocaleString(), sub: 'in circulation' },
      ].map(({ label, value, sub }) => (
        <div key={label} className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  )
}

function LeaderboardPanel({ leaderboard }) {
  if (!leaderboard?.length) return <p className="text-gray-500 text-sm">No agents ranked yet.</p>
  return (
    <div className="space-y-2">
      {leaderboard.map((agent, i) => (
        <div key={agent.agentId} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
          <span className="text-gray-400 text-sm w-5 shrink-0">#{i + 1}</span>
          <ScoreRing score={agent.economyScore} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{agent.agentId}</p>
            <p className="text-gray-400 text-xs truncate">{agent.agentRole} · {agent.specialization}</p>
          </div>
          <div className="text-right shrink-0">
            <GradeBadge grade={agent.grade} />
            <p className="text-gray-400 text-xs mt-1">{agent.credits?.toFixed(0)} cr</p>
          </div>
          {agent.isElite && <span className="text-yellow-400 text-xs">★ Elite</span>}
        </div>
      ))}
    </div>
  )
}

function CreditPanel({ overview }) {
  const economy = overview?.economy
  if (!economy) return null
  const failingAgents = economy.failingAgents || []
  return (
    <div className="space-y-3">
      {failingAgents.length === 0
        ? <p className="text-gray-500 text-sm">No failing agents detected.</p>
        : failingAgents.map(agent => (
          <div key={agent.agentId} className="flex items-center gap-3 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
            <ScoreRing score={agent.economyScore} size={40} />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{agent.agentId}</p>
              <p className="text-red-400 text-xs">Score: {agent.economyScore?.toFixed(1)} · Tasks: {agent.totalTasks}</p>
            </div>
            <GradeBadge grade={agent.grade} />
          </div>
        ))
      }
    </div>
  )
}

function ComponentBreakdown({ agent }) {
  if (!agent?.components) return null
  const comps = [
    ['Quality',      agent.components.qualityScore],
    ['Execution',    agent.components.executionSuccess],
    ['Revenue',      agent.components.revenueImpact],
    ['Learning',     agent.components.learningScore],
    ['Recovery',     agent.components.recoveryScore],
    ['Optimization', agent.components.optimizationScore],
    ['Coordination', agent.components.coordinationScore],
  ]
  return (
    <div className="space-y-2 mt-2">
      {comps.map(([label, val]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-gray-400 text-xs w-24 shrink-0">{label}</span>
          <div className="flex-1 bg-gray-700 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, val || 0)}%` }} />
          </div>
          <span className="text-gray-300 text-xs w-8 text-right">{Math.round(val || 0)}</span>
        </div>
      ))}
    </div>
  )
}

const TABS = ['overview', 'leaderboard', 'failing', 'details']

export default function AgentEconomyDashboard() {
  const { overview, leaderboard, loading, refreshing, error, loadDashboard, refreshAll } = useAgentEconomy()
  const [tab, setTab] = useState('overview')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const economy     = overview?.economy
  const health      = economy?.economyHealth
  const topAgents   = leaderboard?.leaderboard || economy?.leaderboard || []
  const eliteAgents = economy?.eliteAgents || []

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Economy</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 6D — Economy scores, credits, and agent rankings</p>
        </div>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {refreshing ? 'Refreshing…' : 'Refresh All'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 text-sm">{error}</div>
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

      {!loading && tab === 'overview' && (
        <div className="space-y-6">
          <HealthPanel health={health} />
          <div className="bg-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Top 5 Agents</h2>
            <LeaderboardPanel leaderboard={topAgents.slice(0, 5)} />
          </div>
          {eliteAgents.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Elite Agents ({eliteAgents.length})</h2>
              <div className="flex flex-wrap gap-2">
                {eliteAgents.map(a => (
                  <span key={a.agentId} className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-xs px-3 py-1 rounded-full">
                    ★ {a.agentId} ({a.economyScore?.toFixed(1)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'leaderboard' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Economy Leaderboard</h2>
          <LeaderboardPanel leaderboard={topAgents} />
        </div>
      )}

      {!loading && tab === 'failing' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Failing Agents (score ≤ 35)</h2>
          <CreditPanel overview={overview} />
        </div>
      )}

      {!loading && tab === 'details' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Click an agent to expand component breakdown.</p>
          {topAgents.map(agent => (
            <div key={agent.agentId} className="bg-gray-800 rounded-xl p-4">
              <button
                className="flex items-center gap-3 w-full text-left"
                onClick={() => setSelected(selected === agent.agentId ? null : agent.agentId)}
              >
                <ScoreRing score={agent.economyScore} size={44} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{agent.agentId}</p>
                  <p className="text-gray-400 text-xs">{agent.agentRole} · {agent.totalTasks} tasks · Trust {agent.trustScore?.toFixed(0)}</p>
                </div>
                <GradeBadge grade={agent.grade} />
                <span className="text-gray-500 text-xs ml-2">{selected === agent.agentId ? '▲' : '▼'}</span>
              </button>
              {selected === agent.agentId && <ComponentBreakdown agent={agent} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
