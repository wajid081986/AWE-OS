import { memo, useEffect, useState, useCallback } from 'react'
import { useMarketplace } from '../../../hooks/useMarketplace'

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }) {
  const s = size === 'sm' ? 'w-4 h-4 border' : 'w-7 h-7 border-2'
  return <div className={`${s} border-indigo-500 border-t-transparent rounded-full animate-spin`} />
}

const StatusBadge = memo(function StatusBadge({ status }) {
  const map = {
    pending:     'bg-yellow-900/30 text-yellow-400 border-yellow-700/40',
    in_progress: 'bg-blue-900/30   text-blue-400   border-blue-700/40',
    launched:    'bg-green-900/30  text-green-400  border-green-700/40',
    rejected:    'bg-red-900/30    text-red-400    border-red-700/40',
    expired:     'bg-gray-800      text-gray-500   border-gray-700',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${map[status] || map.expired}`}>
      {status?.replace('_', ' ') || '—'}
    </span>
  )
})

const QueueItemCard = memo(function QueueItemCard({ item, onApprove, onReject, actionLoading }) {
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = () => onApprove(item.id)
  const handleRejectConfirm = () => {
    onReject(item.id, rejectReason)
    setRejecting(false)
    setRejectReason('')
  }

  const isPending = item.status === 'pending'
  const isRunning = item.status === 'in_progress'

  return (
    <div className="bg-gray-700/30 border border-gray-600/40 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-xs text-gray-400 mb-1">{item.description}</p>
          <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded capitalize">{item.category}</span>
        </div>
        {isRunning && (
          <div className="shrink-0 mt-1">
            <Spinner />
          </div>
        )}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Opportunity', value: item.opportunity_score },
          { label: 'SEO',        value: item.seo_score         },
          { label: 'Revenue',    value: item.monetization_score },
          { label: 'Priority',   value: item.launch_priority   },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-700/50 rounded-lg p-2 text-center">
            <p className="text-[9px] text-gray-500">{label}</p>
            <p className="text-xs font-bold text-white">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 mb-3 text-[10px] text-gray-500">
        {item.trend_signal && (
          <span>Trend: <span className="text-gray-300 capitalize">{item.trend_signal}</span></span>
        )}
        {item.metadata?.complexity && (
          <span>Complexity: <span className="text-gray-300 capitalize">{item.metadata.complexity}</span></span>
        )}
        {item.metadata?.timing && (
          <span>Timing: <span className={item.metadata.timing === 'peak' ? 'text-orange-400' : 'text-gray-300'}>{item.metadata.timing}</span></span>
        )}
        <span>Created: <span className="text-gray-300">{new Date(item.created_at).toLocaleDateString()}</span></span>
      </div>

      {/* Actions */}
      {isPending && !rejecting && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="flex-1 py-1.5 bg-green-600/20 hover:bg-green-600/30 disabled:opacity-40 border border-green-500/40 text-green-400 text-xs font-semibold rounded-lg transition-colors"
          >
            ✓ Approve & Build
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={actionLoading}
            className="flex-1 py-1.5 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-40 border border-red-500/40 text-red-400 text-xs font-semibold rounded-lg transition-colors"
          >
            ✕ Reject
          </button>
        </div>
      )}

      {isPending && rejecting && (
        <div className="space-y-2">
          <input
            type="text"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/60"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRejectConfirm}
              disabled={actionLoading}
              className="flex-1 py-1.5 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-40 border border-red-500/40 text-red-400 text-xs font-semibold rounded-lg transition-colors"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => { setRejecting(false); setRejectReason('') }}
              className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-400 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/20 border border-blue-700/30 rounded-lg px-3 py-2">
          <Spinner />
          Building tool… this may take a few minutes
        </div>
      )}
    </div>
  )
})

// ── Policy configuration ──────────────────────────────────────────────────────

const POLICY_DEFAULTS = {
  maxConcurrentBuilds:    3,
  maxLaunchesPerCat30d:   3,
  minQualityScore:        55,
  autoApproveThreshold:   0,   // 0 = disabled, 85+ = auto-approve
  pausedCategories:       [],
}

const PolicyPanel = memo(function PolicyPanel({ policy, onChange }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
        <span className="text-lg">⚙️</span>
        <h3 className="text-sm font-semibold text-white">Expansion Policies</h3>
        <span className="text-[10px] bg-yellow-900/30 text-yellow-400 border border-yellow-700/40 px-2 py-0.5 rounded-full ml-auto">
          UI config only — persisted in localStorage
        </span>
      </div>
      <div className="p-5 space-y-4">

        {/* Numeric controls */}
        {[
          { key: 'maxConcurrentBuilds',  label: 'Max Concurrent Builds', min: 1, max: 10 },
          { key: 'maxLaunchesPerCat30d', label: 'Max Launches / Category / 30 Days', min: 1, max: 10 },
          { key: 'minQualityScore',      label: 'Minimum Quality Score', min: 30, max: 90 },
          { key: 'autoApproveThreshold', label: 'Auto-Approve Score Threshold (0 = off)', min: 0, max: 95 },
        ].map(({ key, label, min, max }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="flex-1 text-xs text-gray-400">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={min}
                max={max}
                value={policy[key]}
                onChange={e => onChange({ ...policy, [key]: Number(e.target.value) })}
                className="w-24 accent-indigo-500"
              />
              <span className="text-xs text-white font-mono w-8 text-center">{policy[key]}</span>
            </div>
          </div>
        ))}

        {/* Auto-approve warning */}
        {policy.autoApproveThreshold > 0 && (
          <div className="bg-yellow-950/20 border border-yellow-700/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
            ⚠️ Auto-approve active for opportunities scoring ≥ {policy.autoApproveThreshold}. Builds will start without manual review.
          </div>
        )}

        {/* Reset */}
        <button
          onClick={() => onChange(POLICY_DEFAULTS)}
          className="w-full py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

export default function ExpansionCenter() {
  const {
    queue, loading, actionLoading, error,
    loadQueue, approveOpportunity, rejectOpportunity,
  } = useMarketplace()

  const [toast,  setToast]  = useState(null)
  const [policy, setPolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('marketplace_policy')
      return saved ? { ...POLICY_DEFAULTS, ...JSON.parse(saved) } : POLICY_DEFAULTS
    } catch (_) { return POLICY_DEFAULTS }
  })
  const [filter, setFilter] = useState('all')

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => { loadQueue() }, [loadQueue])

  const handlePolicyChange = useCallback((newPolicy) => {
    setPolicy(newPolicy)
    try { localStorage.setItem('marketplace_policy', JSON.stringify(newPolicy)) } catch (_) {}
  }, [])

  const handleApprove = useCallback(async (id) => {
    const res = await approveOpportunity(id)
    if (res.success) showToast('Build pipeline started')
    else showToast(res.error || 'Approval failed', false)
  }, [approveOpportunity, showToast])

  const handleReject = useCallback(async (id, reason) => {
    const res = await rejectOpportunity(id, reason)
    if (res.success) showToast('Opportunity rejected')
    else showToast(res.error || 'Rejection failed', false)
  }, [rejectOpportunity, showToast])

  const filteredQueue = queue.filter(item => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const statusCounts = queue.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Autonomous Expansion Center</h1>
            <p className="text-gray-400 text-sm mt-0.5">Approve, reject, and configure autonomous marketplace expansion</p>
          </div>
          <button
            onClick={loadQueue}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
          >
            ↻ Refresh Queue
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-green-950 border-green-700 text-green-400' : 'bg-red-950 border-red-700 text-red-400'
          }`}>
            {toast.msg}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-950/30 border border-red-700/40 rounded-xl p-4 text-sm text-red-400">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Queue panel */}
          <div className="lg:col-span-2 space-y-4">

            {/* Status summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { status: 'pending',     label: 'Pending',     color: 'text-yellow-400' },
                { status: 'in_progress', label: 'Building',    color: 'text-blue-400'   },
                { status: 'launched',    label: 'Launched',    color: 'text-green-400'  },
              ].map(({ status, label, color }) => (
                <div key={status} className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{statusCounts[status] || 0}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1">
              {['all', 'pending', 'in_progress', 'launched', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${
                    filter === f
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f.replace('_', ' ')}
                  {f !== 'all' && statusCounts[f] ? ` (${statusCounts[f]})` : ''}
                </button>
              ))}
            </div>

            {/* Queue items */}
            {loading && queue.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm text-gray-400">
                  {filter === 'all' ? 'No items in the expansion queue' : `No ${filter.replace('_', ' ')} items`}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Use the Marketplace Dashboard to queue new opportunities
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQueue.map(item => (
                  <QueueItemCard
                    key={item.id}
                    item={item}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Policy panel */}
          <div className="space-y-4">
            <PolicyPanel policy={policy} onChange={handlePolicyChange} />

            {/* Safety guardrails info */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                <span>🛡️</span> Safety Guardrails
              </p>
              <ul className="space-y-2">
                {[
                  'Max 3 concurrent builds enforced server-side',
                  'Max 3 launches per category per 30 days',
                  'Quality gate: min score 55 required',
                  'Duplicate guard prevents identical launches',
                  'Saturation gate pauses at 80% category fill',
                  'Failed builds auto-retry with backoff (max 2×)',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                    <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Expansion velocity gauge */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                <span>⚡</span> Current Expansion State
              </p>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Pending</span>
                  <span className="text-yellow-400 font-mono">{statusCounts.pending || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Building</span>
                  <span className="text-blue-400 font-mono">{statusCounts.in_progress || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Launched (all time)</span>
                  <span className="text-green-400 font-mono">{statusCounts.launched || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rejected</span>
                  <span className="text-red-400 font-mono">{statusCounts.rejected || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
