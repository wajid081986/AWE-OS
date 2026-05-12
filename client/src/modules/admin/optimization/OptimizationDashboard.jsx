import { useState, useEffect, useCallback } from 'react'
import {
  getOptimizationStatus,
  getBottlenecks,
  getRecommendations,
  runAnalysisCycle,
  applyRecommendation,
  dismissRecommendation,
  getTuningHistory,
  toggleAutonomousTuner,
  resetCircuitBreaker,
  rollbackTuning,
} from '../../../services/optimization.service'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

const SEVERITY_COLOR = { critical: 'text-red-400 bg-red-900/20 border-red-700', warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-700', info: 'text-blue-400 bg-blue-900/20 border-blue-700' }
const PRIORITY_COLOR = { critical: 'bg-red-700', high: 'bg-orange-700', medium: 'bg-yellow-700', low: 'bg-gray-600' }

function BottleneckCard({ event }) {
  const sc = SEVERITY_COLOR[event.severity] ?? SEVERITY_COLOR.info
  return (
    <div className={`rounded-xl border p-3 ${sc}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase">{event.eventType?.replace(/_/g, ' ')}</span>
        <span className="text-xs opacity-70">{event.targetId ?? event.targetType}</span>
      </div>
      <p className="text-xs opacity-80">
        Value: {event.value} {event.threshold ? `(threshold: ${event.threshold})` : ''}
      </p>
      <p className="text-xs opacity-60 mt-1">{new Date(event.detectedAt).toLocaleTimeString()}</p>
    </div>
  )
}

function RecommendationCard({ rec, onApply, onDismiss }) {
  const [applying,   setApplying]   = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const handleApply = async () => {
    setApplying(true)
    try { await onApply(rec.id) } finally { setApplying(false) }
  }

  const handleDismiss = async () => {
    setDismissing(true)
    try { await onDismiss(rec.id) } finally { setDismissing(false) }
  }

  const conf = parseFloat(rec.confidence ?? 0)
  const confColor = conf >= 0.80 ? 'text-green-400' : conf >= 0.60 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${PRIORITY_COLOR[rec.priority] ?? 'bg-gray-600'} text-white`}>
              {rec.priority}
            </span>
            {rec.auto_applicable && (
              <span className="px-2 py-0.5 text-xs bg-indigo-800 text-indigo-300 rounded">auto-applicable</span>
            )}
          </div>
          <p className="text-sm font-medium text-white">{rec.title}</p>
          <p className="text-xs text-gray-400 mt-1">{rec.description}</p>
        </div>
        <span className={`text-sm font-bold ${confColor}`}>{(conf * 100).toFixed(0)}%</span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">{rec.source} · {rec.target_type}{rec.target_id ? `: ${rec.target_id}` : ''}</span>
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-xs rounded-lg transition-colors"
          >
            {dismissing ? '…' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OptimizationDashboard() {
  const [status,    setStatus]    = useState(null)
  const [bottlenecks, setBN]      = useState([])
  const [recs,      setRecs]      = useState([])
  const [tuningHistory, setTH]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [tab,       setTab]       = useState('recommendations')
  const [error,     setError]     = useState(null)
  const [toast,     setToast]     = useState(null)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, bnRes, recsRes, thRes] = await Promise.allSettled([
        getOptimizationStatus(),
        getBottlenecks(),
        getRecommendations({ limit: 30 }),
        getTuningHistory({ limit: 20 }),
      ])
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data)
      if (bnRes.status     === 'fulfilled') setBN(bnRes.value.data ?? [])
      if (recsRes.status   === 'fulfilled') setRecs(recsRes.value.data ?? [])
      if (thRes.status     === 'fulfilled') setTH(thRes.value.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await runAnalysisCycle()
      showToast(`Analysis complete. ${res.data?.newRecommendations ?? 0} new recommendations.`)
      await load()
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApply = async (id) => {
    await applyRecommendation(id)
    showToast('Recommendation applied')
    setRecs(r => r.filter(x => x.id !== id))
  }

  const handleDismiss = async (id) => {
    await dismissRecommendation(id)
    setRecs(r => r.filter(x => x.id !== id))
  }

  const handleToggleTuner = async (enabled) => {
    await toggleAutonomousTuner(enabled)
    showToast(`Autonomous tuner ${enabled ? 'enabled' : 'disabled'}`)
    await load()
  }

  const handleRollback = async (id) => {
    await rollbackTuning(id, 'admin_manual_rollback')
    showToast('Tuning rolled back')
    await load()
  }

  const tuner   = status?.tuner
  const recomm  = status?.recommender
  const runtime = status?.runtime

  const TABS = ['recommendations', 'bottlenecks', 'tuning']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Self-Optimization Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 5D — Runtime Adaptive Optimization</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {analyzing ? 'Analyzing…' : 'Run Analysis'}
          </button>
          <button onClick={load} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard label="Pending Recs"      value={recomm?.pending}            color="text-yellow-400" />
        <StatCard label="Applied Recs"      value={recomm?.applied}            color="text-green-400" />
        <StatCard label="Active Bottlenecks" value={runtime?.activeBottlenecks} color="text-red-400" />
        <StatCard label="Tuner"
          value={tuner?.enabled ? 'ON' : 'OFF'}
          color={tuner?.enabled ? 'text-green-400' : 'text-gray-500'}
          sub={tuner?.circuitBreakerOpen ? 'Circuit OPEN' : null}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tunings"     value={tuner?.totalTunings} />
        <StatCard label="Rollbacks"         value={tuner?.rollbacks}            color={tuner?.rollbacks > 0 ? 'text-red-400' : 'text-gray-400'} />
        <StatCard label="Conf Threshold"    value={tuner?.confidenceThreshold ? `${(tuner.confidenceThreshold * 100).toFixed(0)}%` : null} />
        <StatCard label="Avg Conf"          value={recomm?.avgPendingConfidence ? `${(recomm.avgPendingConfidence * 100).toFixed(0)}%` : null} />
      </div>

      {/* Tuner controls */}
      {tuner && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-300 flex-1">Autonomous Tuner</span>
          <button onClick={() => handleToggleTuner(!tuner.enabled)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${tuner.enabled ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-green-700 hover:bg-green-600 text-white'}`}>
            {tuner.enabled ? 'Disable' : 'Enable'}
          </button>
          {tuner.circuitBreakerOpen && (
            <button onClick={resetCircuitBreaker}
              className="px-3 py-1.5 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded-lg">
              Reset Breaker
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-t capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t} {t === 'recommendations' && recs.length > 0 ? `(${recs.length})` : ''}{t === 'bottlenecks' && bottlenecks.length > 0 ? `(${bottlenecks.length})` : ''}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === 'recommendations' && (
            <div>
              {recs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">No pending recommendations</p>
                  <p className="text-sm">Run an analysis cycle to generate new recommendations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recs.map(r => (
                    <RecommendationCard key={r.id} rec={r} onApply={handleApply} onDismiss={handleDismiss} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'bottlenecks' && (
            <div>
              {bottlenecks.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No active bottlenecks detected.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bottlenecks.map((b, i) => <BottleneckCard key={i} event={b} />)}
                </div>
              )}
            </div>
          )}

          {tab === 'tuning' && (
            <div>
              {tuningHistory.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No tuning history.</p>
              ) : (
                <div className="space-y-2">
                  {tuningHistory.map((t, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{t.description ?? t.tuningType}</p>
                        <p className="text-xs text-gray-400">Target: {t.target} · By: {t.appliedBy}</p>
                        <p className="text-xs text-gray-500">{t.appliedAt ? new Date(t.appliedAt).toLocaleString() : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'applied' ? 'bg-green-900/40 text-green-400' : t.status === 'rolled_back' ? 'bg-red-900/40 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                          {t.status}
                        </span>
                        {t.status === 'applied' && (
                          <button
                            onClick={() => handleRollback(t.tuningId)}
                            className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded transition-colors"
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
