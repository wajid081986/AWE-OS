import { useEffect, useState } from 'react'
import { useSelfHealing } from '../../../hooks/useSelfHealing'

function Skeleton() {
  return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-gray-800 rounded-xl h-24" />)}</div>
}

function WorkerCard({ w }) {
  const fresh = w.freshHeartbeats
  const total = w.active
  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-medium text-sm">Workers</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${total > 0 ? 'text-green-400 border-green-700 bg-green-900/20' : 'text-red-400 border-red-700 bg-red-900/20'}`}>
          {total}/{w.total} active
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Fresh heartbeats</span>
            <span>{fresh}/{total}</span>
          </div>
          <div className="bg-gray-700 rounded-full h-2">
            <div className="h-2 bg-green-500 rounded-full" style={{ width: `${total > 0 ? Math.round(fresh / total * 100) : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function QueueCard({ queue }) {
  const total = (queue?.pending || 0) + (queue?.claimed || 0) + (queue?.processing || 0)
  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-medium text-sm">Queue Depth</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${total > 20 ? 'text-red-400 border-red-700 bg-red-900/20' : total > 5 ? 'text-yellow-400 border-yellow-700 bg-yellow-900/20' : 'text-green-400 border-green-700 bg-green-900/20'}`}>
          {total} total
        </span>
      </div>
      <div className="space-y-1">
        {[
          { label: 'Pending',    value: queue?.pending    || 0, color: '#3b82f6' },
          { label: 'Claimed',    value: queue?.claimed    || 0, color: '#8b5cf6' },
          { label: 'Processing', value: queue?.processing || 0, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-gray-400 text-xs w-20">{label}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, value * 5)}%`, backgroundColor: color }} />
            </div>
            <span className="text-gray-300 text-xs w-6 text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmergencyPanel({ routing }) {
  const active   = routing?.activeEmergencies   || []
  const resolved = routing?.resolvedEmergencies || []

  if (!active.length && !resolved.length) {
    return <p className="text-green-400 text-sm">No active emergencies.</p>
  }

  return (
    <div className="space-y-2">
      {active.map((em) => (
        <div key={em.id} className="flex items-start gap-3 bg-red-900/20 border border-red-700 rounded-xl px-4 py-3">
          <span className="w-2 h-2 bg-red-400 rounded-full mt-1.5 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{em.scope}</p>
            <p className="text-red-300 text-xs mt-0.5">Reason: {em.reason} · Strategy: {em.strategy}</p>
            <p className="text-gray-500 text-xs mt-0.5">{em.reroutes} reroutes · Declared {new Date(em.declaredAt).toLocaleTimeString()}</p>
          </div>
          <span className="text-red-400 text-xs font-medium">ACTIVE</span>
        </div>
      ))}
      {resolved.slice(0, 3).map((em) => (
        <div key={em.id} className="flex items-start gap-3 bg-gray-700/30 rounded-xl px-4 py-3">
          <span className="w-2 h-2 bg-gray-500 rounded-full mt-1.5 shrink-0" />
          <div className="flex-1">
            <p className="text-gray-300 text-sm">{em.scope}</p>
            <p className="text-gray-500 text-xs">{em.reason}</p>
          </div>
          <span className="text-gray-500 text-xs">Resolved</span>
        </div>
      ))}
    </div>
  )
}

function IsolationPanel({ isolation, onRelease }) {
  const quarantines = isolation?.quarantines || {}
  const circuits    = isolation?.circuits    || {}

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs text-gray-400 font-medium mb-2">Circuit Breakers</h3>
        {!Object.keys(circuits).length
          ? <p className="text-gray-500 text-sm">All circuits closed.</p>
          : Object.entries(circuits).map(([id, cb]) => (
            <div key={id} className={`flex items-center gap-3 rounded-lg px-4 py-2 mb-1 ${cb.state === 'OPEN' ? 'bg-red-900/20 border border-red-800' : cb.state === 'HALF_OPEN' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-gray-700/30'}`}>
              <span className={`text-xs font-medium ${cb.state === 'OPEN' ? 'text-red-400' : cb.state === 'HALF_OPEN' ? 'text-yellow-400' : 'text-green-400'}`}>{cb.state}</span>
              <span className="text-gray-300 text-sm flex-1">{id}</span>
              <span className="text-gray-500 text-xs">{cb.windowFailures} fails / {cb.totalFailures} total</span>
            </div>
          ))
        }
      </div>
      <div>
        <h3 className="text-xs text-gray-400 font-medium mb-2">Quarantined Modules</h3>
        {!Object.keys(quarantines).length
          ? <p className="text-gray-500 text-sm">No quarantined modules.</p>
          : Object.entries(quarantines).map(([id, q]) => (
            <div key={id} className="flex items-center gap-3 bg-orange-900/20 border border-orange-800 rounded-lg px-4 py-2 mb-1">
              <span className="text-orange-300 text-sm flex-1">{id}</span>
              <span className="text-orange-400 text-xs">{q.reason}</span>
              <span className="text-gray-500 text-xs">Release: {new Date(q.releaseAfter).toLocaleTimeString()}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

const TABS = ['workers', 'queue', 'emergencies', 'isolation']

export default function RuntimeResilienceCenter() {
  const { resilience, routing, isolation, loading, error, loadResilience, loadDetails } = useSelfHealing()
  const [tab, setTab] = useState('workers')

  useEffect(() => {
    loadResilience()
    loadDetails()
  }, [loadResilience, loadDetails])

  const workers = resilience?.details?.workers
  const queue   = resilience?.details?.queue
  const execs   = resilience?.details?.executions24h

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Runtime Resilience Center</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 6E — Worker health, queue depth, survivability metrics</p>
        </div>
        <button
          onClick={() => { loadResilience(true); loadDetails() }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-4 text-sm">{error}</div>
      )}

      {execs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Success Rate 24h', value: `${execs.successRate || 0}%` },
            { label: 'Total Execs 24h',  value: execs.total || 0 },
            { label: 'Failed 24h',       value: execs.failed || 0, danger: (execs.failed || 0) > 10 },
            { label: 'Success Rate 1h',  value: `${resilience?.details?.executions1h?.successRate || 0}%` },
          ].map(({ label, value, danger }) => (
            <div key={label} className={`rounded-xl p-4 ${danger ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${danger ? 'text-red-300' : 'text-white'}`}>{value}</p>
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

      {!loading && tab === 'workers'     && workers   && <WorkerCard w={workers} />}
      {!loading && tab === 'queue'       && queue     && <QueueCard queue={queue} />}
      {!loading && tab === 'emergencies' && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">Emergency Routing</h2><EmergencyPanel routing={routing} /></div>}
      {!loading && tab === 'isolation'   && <div className="bg-gray-800 rounded-xl p-5"><h2 className="text-sm font-semibold text-gray-300 mb-4">Fault Isolation</h2><IsolationPanel isolation={isolation} /></div>}
    </div>
  )
}
