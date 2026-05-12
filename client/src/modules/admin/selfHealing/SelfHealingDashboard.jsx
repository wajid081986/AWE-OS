import { useEffect, useState } from 'react'
import { useSelfHealing } from '../../../hooks/useSelfHealing'

function ScoreRing({ score, size = 72 }) {
  const pct   = Math.min(100, Math.max(0, score || 0))
  const r     = (size - 10) / 2
  const circ  = 2 * Math.PI * r
  const dash  = (pct / 100) * circ
  const color = pct >= 75 ? '#22c55e' : pct >= 45 ? '#eab308' : '#ef4444'
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#374151" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central"
        fontSize={16} fill={color} fontWeight="700">{Math.round(pct)}</text>
      <text x="50%" y="68%" textAnchor="middle" dominantBaseline="central"
        fontSize={9} fill="#9ca3af">score</text>
    </svg>
  )
}

function GradeBadge({ grade }) {
  const colors = { S: 'bg-purple-500', A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white ${colors[grade] || 'bg-gray-600'}`}>{grade}</span>
}

function RiskBadge({ risk }) {
  const colors = { CRITICAL: 'text-red-400 bg-red-900/30 border-red-700', HIGH: 'text-orange-400 bg-orange-900/30 border-orange-700', MEDIUM: 'text-yellow-400 bg-yellow-900/30 border-yellow-700', LOW: 'text-blue-400 bg-blue-900/30 border-blue-700', NOMINAL: 'text-green-400 bg-green-900/30 border-green-700' }
  return <span className={`border text-xs px-2 py-0.5 rounded font-medium ${colors[risk] || colors.NOMINAL}`}>{risk}</span>
}

function Skeleton() {
  return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-gray-800 rounded-xl h-24" />)}</div>
}

function ResiliencePanel({ resilience }) {
  if (!resilience) return null
  const dims = [
    ['Worker Health',       resilience.dimensions?.workerHealth],
    ['Exec Stability',      resilience.dimensions?.executionStability],
    ['Recovery Velocity',   resilience.dimensions?.recoveryVelocity],
    ['Isolation Health',    resilience.dimensions?.isolationHealth],
    ['Queue Health',        resilience.dimensions?.queueHealth],
  ]
  return (
    <div className="bg-gray-800 rounded-xl p-5 flex gap-6">
      <div className="flex flex-col items-center justify-center">
        <ScoreRing score={resilience.survivabilityScore} />
        <GradeBadge grade={resilience.grade} />
        <p className="text-gray-400 text-xs mt-2">Survivability</p>
      </div>
      <div className="flex-1 space-y-3 my-1">
        {dims.map(([label, val]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-gray-400 text-xs w-36 shrink-0">{label}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, val || 0)}%`, backgroundColor: (val || 0) >= 70 ? '#22c55e' : (val || 0) >= 45 ? '#eab308' : '#ef4444' }} />
            </div>
            <span className="text-gray-300 text-xs w-8 text-right">{Math.round(val || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertsPanel({ alerts }) {
  if (!alerts?.length) return <p className="text-green-400 text-sm">No active failure alerts.</p>
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <RiskBadge risk={alert.risk} />
              <span className="text-white text-sm font-medium">{alert.componentId}</span>
              <span className="text-gray-500 text-xs">({alert.componentType})</span>
            </div>
            <p className="text-gray-400 text-xs">Probability: {(alert.probability * 100).toFixed(1)}% · TTF: {alert.ttfEstimate}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {(alert.signals || []).map((s, j) => (
                <span key={j} className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{s.type} ({Math.round(s.value * 100) / 100})</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecoveryPanel({ recovery }) {
  if (!recovery) return null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Recoveries', value: recovery.pendingRecoveries?.length || 0 },
          { label: 'Max Attempts',       value: recovery.maxAttempts || 3 },
          { label: 'Last Scan',          value: recovery.lastScanAt ? new Date(recovery.lastScanAt).toLocaleTimeString() : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-lg font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>
      {(recovery.pendingRecoveries || []).map(r => (
        <div key={r.executionId} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
          <div className="flex-1">
            <p className="text-white text-sm font-mono">{r.executionId}</p>
            <p className="text-gray-400 text-xs">Attempt {r.attempts} · Last: {new Date(r.lastAt).toLocaleTimeString()}</p>
          </div>
          {r.canRetry
            ? <span className="text-green-400 text-xs">Can retry</span>
            : <span className="text-yellow-400 text-xs">In cooldown</span>}
        </div>
      ))}
    </div>
  )
}

function HealingCyclePanel({ healingEngine }) {
  if (!healingEngine) return null
  const s = healingEngine.lastSummary
  return (
    <div className="bg-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${healingEngine.running ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
        <span className="text-white text-sm">{healingEngine.running ? 'Engine Running' : 'Engine Stopped'}</span>
        <span className="text-gray-500 text-xs ml-auto">Cycle #{healingEngine.cycleCount}</span>
      </div>
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Resilience', value: `${s.resilience} (${s.grade})` },
            { label: 'Stuck Fixed', value: s.stuckRecovered || 0 },
            { label: 'Repaired',    value: s.repaired || 0 },
            { label: 'Duration',    value: `${s.duration || 0}ms` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-700/50 rounded-lg p-2">
              <p className="text-gray-400">{label}</p>
              <p className="text-white font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TABS = ['overview', 'alerts', 'recovery', 'healing']

export default function SelfHealingDashboard() {
  const { overview, resilience, failures, loading, healing, error, loadDashboard, loadDetails, triggerHeal } = useSelfHealing()
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    loadDashboard()
    loadDetails()
  }, [loadDashboard, loadDetails])

  const alerts        = failures?.alerts || []
  const recovery      = overview?.recovery
  const healingEngine = overview?.healingEngine

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Self-Healing Infrastructure</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 6E — Survivability, recovery, fault isolation</p>
        </div>
        <button
          onClick={triggerHeal}
          disabled={healing}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {healing ? 'Healing…' : 'Force Heal'}
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
              ${tab === t ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {t === 'alerts' ? `alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` : t}
          </button>
        ))}
      </div>

      {loading && <Skeleton />}

      {!loading && tab === 'overview' && (
        <div className="space-y-4">
          <ResiliencePanel resilience={resilience || overview?.resilience} />
          {failures?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Components',    value: failures.summary.totalComponents },
                { label: 'Critical',      value: failures.summary.criticalCount,  danger: failures.summary.criticalCount > 0 },
                { label: 'High Risk',     value: failures.summary.highCount,      warn:  failures.summary.highCount > 0 },
                { label: 'Fail Rate 1h',  value: `${failures.summary.globalFailRate1h || 0}%` },
              ].map(({ label, value, danger, warn }) => (
                <div key={label} className={`rounded-xl p-4 ${danger ? 'bg-red-900/30 border border-red-700' : warn ? 'bg-orange-900/20 border border-orange-700' : 'bg-gray-800'}`}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${danger ? 'text-red-300' : warn ? 'text-orange-300' : 'text-white'}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'alerts' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Active Failure Alerts</h2>
          <AlertsPanel alerts={alerts} />
        </div>
      )}

      {!loading && tab === 'recovery' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Recovery Status</h2>
          <RecoveryPanel recovery={recovery} />
        </div>
      )}

      {!loading && tab === 'healing' && (
        <HealingCyclePanel healingEngine={healingEngine} />
      )}
    </div>
  )
}
