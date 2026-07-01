import { useState, useEffect, useCallback, useRef, memo } from 'react'
import api from '../../../services/api.service'

const AGENTS = [
  { id: 'autonomous',    name: 'Autonomous Agent',   icon: '🤖' },
  { id: 'idea-pipeline', name: 'Idea Pipeline',      icon: '💡' },
  { id: 'decision',      name: 'Decision Engine',    icon: '🧠' },
  { id: 'auto-debug',    name: 'Builder & Debug',    icon: '🔧' },
  { id: 'builder',       name: 'Builder Agent',      icon: '🏗️' },
  { id: 'revenue',       name: 'Revenue Agent',      icon: '💰' },
  { id: 'deployment',    name: 'Deployment Agent',   icon: '🚀' },
  { id: 'marketing',     name: 'Marketing Agent',    icon: '📣' },
  { id: 'support',       name: 'Support Agent',      icon: '🎧' },
  { id: 'optimization',  name: 'Optimization Agent', icon: '⚡' },
]

// Maps frontend agent ids to the keys AGENT_HANDLERS exposes in
// server/routes/agents.routes.js — most ids match directly, but a
// couple of cards use different naming.
const AGENT_TRIGGER_ID = { 'idea-pipeline': 'idea' }

// 'auto-debug' has no handler in agents.routes.js — it's only wired up
// in admin.routes.js's own TRIGGERS map, so it must keep using that route.
const ADMIN_ONLY_TRIGGERS = new Set(['auto-debug'])

function fmtTime(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString()
}

const StatusBadge = memo(function StatusBadge({ status }) {
  const styles = {
    running: 'bg-green-900/60 text-green-400 border border-green-700/50',
    error:   'bg-red-900/60   text-red-400   border border-red-700/50',
    idle:    'bg-gray-800     text-gray-400   border border-gray-700/50',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${styles[status] || styles.idle}`}>
      {status || 'idle'}
    </span>
  )
})

const MetricCard = memo(function MetricCard({ label, value, icon, accent = false }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-red-400' : 'text-white'}`}>{value ?? '—'}</p>
    </div>
  )
})

const AgentCard = memo(function AgentCard({ agent, status = {}, triggering, onTrigger, onViewLogs, isSelected }) {
  const rate = Math.round((status.successRate ?? 0) * 100)
  return (
    <div className={`bg-gray-900 rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
      isSelected ? 'border-blue-600' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{agent.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{agent.name}</p>
            <div className="mt-1"><StatusBadge status={status.status} /></div>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-xs text-gray-500">
        <p>Last run: <span className="text-gray-400">{fmtTime(status.lastRun)}</span></p>
        <p>Runs (24h): <span className="text-gray-400">{status.totalRuns24h ?? 0}</span></p>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Success rate</span>
          <span className="text-gray-300">{rate}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${rate}%`,
              background: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button
          onClick={onTrigger}
          disabled={triggering}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {triggering ? (
            <span className="flex items-center justify-center gap-1">
              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" />
              Running…
            </span>
          ) : '▶ Trigger'}
        </button>
        <button
          onClick={onViewLogs}
          className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
        >
          📋 Logs
        </button>
      </div>
    </div>
  )
})

const LogEntry = memo(function LogEntry({ log }) {
  const color = log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'
  return (
    <div className="flex gap-3 text-xs font-mono bg-gray-950 rounded p-2 items-start">
      <span className="text-gray-600 shrink-0 pt-px">{new Date(log.created_at).toLocaleTimeString()}</span>
      <span className={`shrink-0 font-bold pt-px ${color}`}>[{(log.level || 'info').toUpperCase()}]</span>
      <span className="text-gray-300 break-all">{log.message}</span>
    </div>
  )
})

export default function AgentsMonitor() {
  const [metrics, setMetrics]           = useState(null)
  const [statuses, setStatuses]         = useState({})
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agentLogs, setAgentLogs]       = useState([])
  const [logsLoading, setLogsLoading]   = useState(false)
  const [triggering, setTriggering]     = useState({})
  const [loading, setLoading]           = useState(true)
  const [lastRefresh, setLastRefresh]   = useState(null)
  const intervalRef                     = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const [mRes, sRes] = await Promise.allSettled([
        api.get('/api/admin/agents/metrics'),
        api.get('/api/admin/agents/status'),
      ])
      if (mRes.status === 'fulfilled') setMetrics(mRes.value.data)
      if (sRes.status === 'fulfilled') setStatuses(sRes.value.data.agents || {})
      setLastRefresh(new Date())
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 30_000)
    return () => clearInterval(intervalRef.current)
  }, [fetchData])

  const viewLogs = async (agentId) => {
    setSelectedAgent(agentId)
    setLogsLoading(true)
    try {
      const res = await api.get(`/api/admin/agents/logs/${agentId}`)
      setAgentLogs(res.data.logs || [])
    } catch (_) {
      setAgentLogs([])
    }
    setLogsLoading(false)
  }

  const triggerAgent = async (agentId) => {
    setTriggering(p => ({ ...p, [agentId]: true }))
    try {
      const url = ADMIN_ONLY_TRIGGERS.has(agentId)
        ? `/api/admin/agents/trigger/${agentId}`
        : `/api/agents/${AGENT_TRIGGER_ID[agentId] || agentId}/trigger`
      await api.post(url)
      setTimeout(fetchData, 2500)
    } catch (_) {}
    setTimeout(() => setTriggering(p => ({ ...p, [agentId]: false })), 4000)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Agents Monitor</h1>
            <p className="text-gray-500 text-sm mt-0.5">Real-time status of all autonomous agents</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-600">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Metric cards */}
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Total Runs (24h)"
              value={metrics?.totalRuns24h ?? 0}
              icon="🔄"
            />
            <MetricCard
              label="Success Rate"
              value={`${Math.round((metrics?.successRate ?? 0) * 100)}%`}
              icon="✅"
            />
            <MetricCard
              label="Errors (24h)"
              value={metrics?.errorCount ?? 0}
              icon="❌"
              accent={metrics?.errorCount > 0}
            />
            <MetricCard
              label="Most Active"
              value={metrics?.mostActive || '—'}
              icon="⚡"
            />
          </div>
        )}

        {/* Agent cards — 3×3 grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4 h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                status={statuses[agent.id]}
                triggering={triggering[agent.id]}
                isSelected={selectedAgent === agent.id}
                onTrigger={() => triggerAgent(agent.id)}
                onViewLogs={() => viewLogs(agent.id)}
              />
            ))}
          </div>
        )}

        {/* Log viewer */}
        {selectedAgent && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">
                Recent Logs — {AGENTS.find(a => a.id === selectedAgent)?.name}
                <span className="ml-2 text-gray-600 font-normal text-xs">(last 20 entries)</span>
              </h2>
              <button
                onClick={() => { setSelectedAgent(null); setAgentLogs([]) }}
                className="text-gray-500 hover:text-white text-xs transition-colors"
              >
                Close ✕
              </button>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : agentLogs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-600 text-sm">No logs found for this agent.</p>
                <p className="text-gray-700 text-xs mt-1">Trigger the agent to generate logs.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {agentLogs.map((log, i) => (
                  <LogEntry key={log.id || i} log={log} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
