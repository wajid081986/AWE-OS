import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api.service'

// ── Tab definitions ────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: '🔍 Overview'    },
  { id: 'ideas',        label: '💡 Ideas'        },
  { id: 'revenue',      label: '📊 Revenue'      },
  { id: 'health',       label: '🏥 Health'       },
  { id: 'content',      label: '📝 Content'      },
  { id: 'support',      label: '🎫 Support'      },
  { id: 'optimization', label: '🔧 Optimization' },
  { id: 'decisions',    label: '📋 Decisions'    },
  { id: 'pipeline',     label: '📡 Pipeline'     },
]

// ── Agent metadata for Overview cards ─────────────────────────
const AGENTS = [
  { key: 'autonomous',   icon: '🤖', name: 'Autonomous Agent',  cron: 'Every 6 hrs',    endpoint: '/api/autonomous/run',           method: 'post' },
  { key: 'ideas',        icon: '💡', name: 'Idea Pipeline',     cron: 'Every 12 hrs',   endpoint: '/api/ideas/generate',           method: 'post' },
  { key: 'decision',     icon: '⚖️', name: 'Decision Engine',   cron: 'Via autonomous', endpoint: '/api/decision',                 method: 'get'  },
  { key: 'builder',      icon: '🛠️', name: 'Builder Agent',     cron: 'On demand',      endpoint: null,                            method: null   },
  { key: 'revenue',      icon: '💰', name: 'Revenue Agent',     cron: 'Daily 11:59PM',  endpoint: '/api/revenue-agent/snapshot',   method: 'post' },
  { key: 'health',       icon: '🏥', name: 'Deployment Agent',  cron: 'Every 30 min',   endpoint: '/api/deploy/pre-check',         method: 'post' },
  { key: 'marketing',    icon: '📣', name: 'Marketing Agent',   cron: 'Weekly Mon 7AM', endpoint: '/api/marketing/blog/generate',  method: 'post' },
  { key: 'support',      icon: '🎫', name: 'Support Agent',     cron: 'Every 30 min',   endpoint: null,                            method: null   },
  { key: 'optimization', icon: '🔧', name: 'Optimization Agent',cron: 'On demand',      endpoint: '/api/optimize/run-all',         method: 'post' },
]

// ── Shared helpers ─────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {msg}
    </div>
  )
}

// ── Tab 1: Overview ────────────────────────────────────────────
function OverviewTab() {
  const [triggering, setTriggering]   = useState(null)
  const [lastRun, setLastRun]         = useState(null)
  const [toast, setToast]             = useState(null)

  useEffect(() => {
    api.get('/api/autonomous/last-run').then(r => setLastRun(r.data?.data)).catch(() => {})
  }, [])

  const trigger = async (agent) => {
    if (!agent.endpoint) return
    setTriggering(agent.key)
    try {
      await api[agent.method](agent.endpoint)
      setToast({ msg: `${agent.name} triggered!`, type: 'success' })
      if (agent.key === 'autonomous') {
        api.get('/api/autonomous/last-run').then(r => setLastRun(r.data?.data)).catch(() => {})
      }
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Trigger failed', type: 'error' })
    } finally {
      setTriggering(null)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map(agent => (
          <div key={agent.key} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <p className="text-white font-medium text-sm">{agent.name}</p>
                <p className="text-gray-500 text-xs">{agent.cron}</p>
              </div>
              <span className="ml-auto w-2 h-2 rounded-full bg-green-400 shrink-0" title="Active" />
            </div>
            {agent.key === 'autonomous' && lastRun && (
              <p className="text-gray-400 text-xs mb-3">
                Last run: {fmtDate(lastRun.completed_at)} · {lastRun.tools_processed ?? 0} tools
              </p>
            )}
            <button
              onClick={() => trigger(agent)}
              disabled={!agent.endpoint || triggering === agent.key}
              className="w-full mt-1 text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-1.5 rounded-lg transition-colors font-medium"
            >
              {triggering === agent.key ? 'Running...' : agent.endpoint ? 'Trigger Now' : 'Auto-triggered'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab 2: Ideas ───────────────────────────────────────────────
function IdeasTab() {
  const [ideas, setIdeas]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('pending')
  const [acting, setActing]         = useState(null)
  const [toast, setToast]           = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(filter === 'pending' ? '/api/ideas/pending' : '/api/ideas')
      setIdeas(res.data?.data || [])
    } catch { setIdeas([]) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const approve = async (id) => {
    setActing(id + '_approve')
    try {
      await api.post('/api/ideas/approve', { tool_id: id })
      setToast({ msg: 'Idea approved — build plan queued!', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed to approve', type: 'error' })
    } finally { setActing(null) }
  }

  const reject = async (id) => {
    setActing(id + '_reject')
    try {
      await api.post('/api/ideas/ignore', { tool_id: id })
      setToast({ msg: 'Idea rejected.', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed to reject', type: 'error' })
    } finally { setActing(null) }
  }

  const buildTool = async (idea) => {
    setActing(idea.id + '_build')
    try {
      const meta = idea.idea_metadata || {}
      await api.post('/api/factory/generate', {
        category: idea.category || meta.category || 'saas',
        idea: `${idea.name}: ${idea.description}`,
      })
      setToast({ msg: 'Tool generation started in AI Factory!', type: 'success' })
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Build failed', type: 'error' })
    } finally { setActing(null) }
  }

  const scoreColor = (s) => {
    if (!s) return 'text-gray-400'
    if (s >= 8) return 'text-green-400'
    if (s >= 5) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['pending', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {f === 'pending' ? 'Pending Review' : 'All Ideas'}
            </button>
          ))}
        </div>
        <button
          onClick={() => api.post('/api/ideas/generate').then(load).catch(() => {})}
          className="text-sm bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          + Generate New Ideas
        </button>
      </div>

      {loading ? <Spinner /> : ideas.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No ideas found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ideas.map(idea => {
            const meta = idea.idea_metadata || {}
            return (
              <div key={idea.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-semibold text-sm">{idea.name}</h3>
                  {idea.idea_score && (
                    <span className={`text-xs font-bold shrink-0 ${scoreColor(idea.idea_score)}`}>
                      {idea.idea_score}/10
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">{idea.description}</p>
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  {meta.monetization && (
                    <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{meta.monetization}</span>
                  )}
                  {meta.complexity && (
                    <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded">{meta.complexity}</span>
                  )}
                  {idea.category && (
                    <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{idea.category}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(idea.id)}
                    disabled={!!acting}
                    className="flex-1 text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors"
                  >
                    {acting === idea.id + '_approve' ? '...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => reject(idea.id)}
                    disabled={!!acting}
                    className="flex-1 text-xs bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors"
                  >
                    {acting === idea.id + '_reject' ? '...' : '✗ Reject'}
                  </button>
                  <button
                    onClick={() => buildTool(idea)}
                    disabled={!!acting}
                    className="flex-1 text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white py-1.5 rounded-lg transition-colors"
                  >
                    {acting === idea.id + '_build' ? '...' : '⚡ Build'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Revenue ─────────────────────────────────────────────
function RevenueTab() {
  const [data, setData]         = useState(null)
  const [upsells, setUpsells]   = useState([])
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [toast, setToast]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, u, a] = await Promise.allSettled([
        api.get('/api/revenue-agent/dashboard'),
        api.get('/api/revenue-agent/upsells'),
        api.get('/api/revenue-agent/alerts'),
      ])
      setData(d.value?.data?.data || d.value?.data || null)
      setUpsells(u.value?.data?.data || [])
      setAlerts(a.value?.data?.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const runSnapshot = async () => {
    setRunning(true)
    try {
      await api.post('/api/revenue-agent/snapshot')
      setToast({ msg: 'Snapshot calculated!', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setRunning(false) }
  }

  const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

  if (loading) return <Spinner />

  const snap = data?.latest_snapshot || data || {}

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex justify-end mb-4">
        <button
          onClick={runSnapshot}
          disabled={running}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {running ? 'Calculating...' : '↻ Run Snapshot'}
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'MRR',   value: fmt(snap.mrr)   },
          { label: 'ARR',   value: fmt(snap.arr)   },
          { label: 'Total', value: fmt(snap.total_revenue) },
          { label: 'LTV',   value: fmt(snap.ltv)   },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{label}</p>
            <p className="text-white font-bold text-xl">{value}</p>
          </div>
        ))}
      </div>

      {/* Upsell Opportunities */}
      {upsells.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">Upsell Opportunities</h3>
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  {['User', 'Type', 'Reason'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upsells.slice(0, 10).map((u, i) => (
                  <tr key={u.id || i} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2 text-gray-300 font-mono text-xs">{u.user_id?.slice(0,8)}…</td>
                    <td className="px-4 py-2"><span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">{u.type || '—'}</span></td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{u.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3">Alerts</h3>
          <div className="space-y-2">
            {alerts.filter(a => !a.acknowledged_at).map((a, i) => (
              <div key={a.id || i} className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 flex items-start gap-3">
                <span className="text-red-400 text-lg shrink-0">⚠️</span>
                <div>
                  <p className="text-red-300 text-sm font-medium">{a.alert_type}</p>
                  <p className="text-gray-400 text-xs">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!snap.mrr && upsells.length === 0 && alerts.length === 0 && (
        <p className="text-gray-500 text-center py-10">No revenue data yet. Run a snapshot to generate metrics.</p>
      )}
    </div>
  )
}

// ── Tab 4: Health ──────────────────────────────────────────────
function HealthTab() {
  const [health, setHealth]     = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [toast, setToast]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [h, hist] = await Promise.allSettled([
        api.get('/api/deploy/health'),
        api.get('/api/deploy/health-history'),
      ])
      setHealth(h.value?.data?.data || h.value?.data || null)
      setHistory(hist.value?.data?.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const runCheck = async () => {
    setRunning(true)
    try {
      await api.post('/api/deploy/pre-check')
      setToast({ msg: 'Health check complete!', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Check failed', type: 'error' })
    } finally { setRunning(false) }
  }

  const statusDot = (ok) => (
    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
  )

  if (loading) return <Spinner />

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex justify-end mb-4">
        <button
          onClick={runCheck}
          disabled={running}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {running ? 'Checking...' : '↻ Run Health Check'}
        </button>
      </div>

      {health ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Backend</p>
            <p className="text-white font-semibold flex items-center">
              {statusDot(health.backend_status === 'ok' || health.backend_up)}
              {health.backend_status || (health.backend_up ? 'OK' : 'Down')}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Frontend</p>
            <p className="text-white font-semibold flex items-center">
              {statusDot(health.frontend_status === 'ok' || health.frontend_up)}
              {health.frontend_status || (health.frontend_up ? 'OK' : 'Down')}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Database</p>
            <p className="text-white font-semibold flex items-center">
              {statusDot(health.db_tables_ok !== false)}
              {health.db_tables_ok !== false ? 'OK' : 'Issues'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 text-center">
          <p className="text-gray-400">No health data. Run a check to populate.</p>
        </div>
      )}

      {/* Issues */}
      {health?.issues?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">Issues Detected</h3>
          <div className="space-y-2">
            {health.issues.map((issue, i) => (
              <div key={i} className="bg-red-900/20 border border-red-700/40 rounded-lg px-4 py-2 text-red-300 text-sm">
                {typeof issue === 'string' ? issue : JSON.stringify(issue)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3">Recent Checks</h3>
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Time', 'Backend', 'Frontend', 'DB'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h, i) => (
                  <tr key={h.id || i} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2 text-gray-400 text-xs">{new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="px-4 py-2">{statusDot(h.backend_status === 'ok')}{h.backend_status}</td>
                    <td className="px-4 py-2">{statusDot(h.frontend_status === 'ok')}{h.frontend_status}</td>
                    <td className="px-4 py-2">{statusDot(h.db_tables_ok)}{h.db_tables_ok ? 'OK' : 'Issue'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 5: Content ─────────────────────────────────────────────
function ContentTab() {
  const [blogs, setBlogs]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)
  const [preview, setPreview]     = useState(null)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/marketing/blogs')
      setBlogs(res.data?.data || [])
    } catch { setBlogs([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    setActing(id + '_' + status)
    try {
      await api.patch(`/api/marketing/blog/${id}/status`, { status })
      setToast({ msg: `Post ${status}!`, type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const generate = async () => {
    setGenerating(true)
    try {
      await api.post('/api/marketing/blog/generate')
      setToast({ msg: 'Blog post generated!', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Generation failed', type: 'error' })
    } finally { setGenerating(false) }
  }

  const statusBadge = (s) => {
    const map = {
      draft:     'bg-gray-700 text-gray-300',
      published: 'bg-green-800 text-green-300',
      rejected:  'bg-red-800 text-red-300',
    }
    return <span className={`text-xs px-2 py-0.5 rounded ${map[s] || map.draft}`}>{s}</span>
  }

  if (loading) return <Spinner />

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setPreview(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-white font-semibold">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{preview.content}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={generate}
          disabled={generating}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {generating ? 'Generating...' : '+ Generate Blog Post'}
        </button>
      </div>

      {blogs.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No blog posts yet.</p>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                {['Title', 'Category', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blogs.map((b) => (
                <tr key={b.id} className="border-b border-gray-700/50 last:border-0">
                  <td className="px-4 py-2 text-white text-xs max-w-[200px] truncate">{b.title}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{b.category}</td>
                  <td className="px-4 py-2">{statusBadge(b.status)}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(b)} className="text-xs text-indigo-400 hover:underline">View</button>
                      {b.status !== 'published' && (
                        <button
                          onClick={() => updateStatus(b.id, 'published')}
                          disabled={!!acting}
                          className="text-xs text-green-400 hover:underline disabled:opacity-40"
                        >
                          {acting === b.id + '_published' ? '...' : 'Publish'}
                        </button>
                      )}
                      {b.status !== 'rejected' && (
                        <button
                          onClick={() => updateStatus(b.id, 'rejected')}
                          disabled={!!acting}
                          className="text-xs text-red-400 hover:underline disabled:opacity-40"
                        >
                          {acting === b.id + '_rejected' ? '...' : 'Reject'}
                        </button>
                      )}
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
}

// ── Tab 6: Support ─────────────────────────────────────────────
function SupportTab() {
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(null)
  const [replying, setReplying]   = useState(null)
  const [replyText, setReplyText] = useState('')
  const [acting, setActing]       = useState(null)
  const [toast, setToast]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/support/tickets')
      setTickets(res.data?.data || res.data?.tickets || [])
    } catch { setTickets([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const resolve = async (id) => {
    setActing(id)
    try {
      await api.patch(`/api/support/ticket/${id}/resolve`)
      setToast({ msg: 'Ticket resolved!', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const sendReply = async (id) => {
    if (!replyText.trim()) return
    setActing(id + '_reply')
    try {
      await api.post(`/api/support/ticket/${id}/reply`, { message: replyText })
      setToast({ msg: 'Reply sent!', type: 'success' })
      setReplying(null)
      setReplyText('')
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const priorityColor = (p) => {
    const map = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-gray-400' }
    return map[p] || 'text-gray-400'
  }

  const statusBadge = (s) => {
    const map = {
      open:          'bg-blue-800 text-blue-300',
      ai_responded:  'bg-indigo-800 text-indigo-300',
      in_progress:   'bg-yellow-800 text-yellow-300',
      resolved:      'bg-green-800 text-green-300',
      closed:        'bg-gray-700 text-gray-400',
      spam:          'bg-red-800 text-red-300',
    }
    return <span className={`text-xs px-2 py-0.5 rounded ${map[s] || map.open}`}>{s || 'open'}</span>
  }

  if (loading) return <Spinner />

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {tickets.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No support tickets yet.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-750"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <span className={`text-xs font-semibold ${priorityColor(t.priority)} w-16 shrink-0`}>
                  {t.priority || 'medium'}
                </span>
                <p className="text-white text-sm flex-1 truncate">{t.subject}</p>
                {statusBadge(t.status)}
                <span className="text-gray-500 text-xs shrink-0">{new Date(t.created_at).toLocaleDateString()}</span>
                <span className="text-gray-500 text-xs">{expanded === t.id ? '▲' : '▼'}</span>
              </div>
              {/* Expanded */}
              {expanded === t.id && (
                <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                  <div>
                    <p className="text-gray-400 text-xs font-medium mb-1">User Message</p>
                    <p className="text-gray-300 text-sm">{t.description}</p>
                  </div>
                  {t.ai_response && (
                    <div>
                      <p className="text-indigo-400 text-xs font-medium mb-1">AI Response</p>
                      <p className="text-gray-300 text-sm bg-indigo-900/20 rounded-lg p-3">{t.ai_response}</p>
                    </div>
                  )}
                  {replying === t.id ? (
                    <div>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Type your reply..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => sendReply(t.id)}
                          disabled={!!acting}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg"
                        >
                          {acting === t.id + '_reply' ? 'Sending...' : 'Send Reply'}
                        </button>
                        <button onClick={() => setReplying(null)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {t.status !== 'resolved' && t.status !== 'closed' && (
                        <button
                          onClick={() => resolve(t.id)}
                          disabled={acting === t.id}
                          className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg"
                        >
                          {acting === t.id ? '...' : 'Mark Resolved'}
                        </button>
                      )}
                      <button
                        onClick={() => { setReplying(t.id); setReplyText('') }}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab 7: Optimization ────────────────────────────────────────
function OptimizationTab() {
  const [tools, setTools]           = useState([])
  const [suggestions, setSuggestions] = useState({})
  const [loading, setLoading]       = useState(true)
  const [analyzing, setAnalyzing]   = useState(null)
  const [runningAll, setRunningAll] = useState(false)
  const [toast, setToast]           = useState(null)

  const loadTools = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/tools')
      setTools(res.data?.tools || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTools() }, [loadTools])

  const loadSuggestions = async (toolId) => {
    try {
      const res = await api.get(`/api/optimize/suggestions/${toolId}`)
      setSuggestions(prev => ({ ...prev, [toolId]: res.data?.data || [] }))
    } catch {
      setSuggestions(prev => ({ ...prev, [toolId]: [] }))
    }
  }

  const analyze = async (toolId) => {
    setAnalyzing(toolId)
    try {
      await api.post(`/api/optimize/analyze/${toolId}`)
      setToast({ msg: 'Analysis complete!', type: 'success' })
      loadSuggestions(toolId)
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Analysis failed', type: 'error' })
    } finally { setAnalyzing(null) }
  }

  const runAll = async () => {
    setRunningAll(true)
    try {
      await api.post('/api/optimize/run-all')
      setToast({ msg: 'All tools analyzed!', type: 'success' })
      loadTools()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setRunningAll(false) }
  }

  const toggleTool = (toolId) => {
    if (suggestions[toolId] === undefined) loadSuggestions(toolId)
    setSuggestions(prev => {
      const cur = prev[toolId]
      if (cur === undefined) return prev
      return { ...prev, [toolId]: cur === null ? [] : null }
    })
  }

  if (loading) return <Spinner />

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex justify-end mb-4">
        <button
          onClick={runAll}
          disabled={runningAll}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {runningAll ? 'Analyzing All...' : '↻ Analyze All Tools'}
        </button>
      </div>

      {tools.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No published tools found.</p>
      ) : (
        <div className="space-y-2">
          {tools.map(tool => (
            <div key={tool.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{tool.name}</p>
                  <p className="text-gray-500 text-xs">{tool.category}</p>
                </div>
                <button
                  onClick={() => analyze(tool.id)}
                  disabled={analyzing === tool.id}
                  className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {analyzing === tool.id ? 'Analyzing...' : '🔍 Analyze'}
                </button>
                <button
                  onClick={() => toggleTool(tool.id)}
                  className="text-xs text-gray-400 hover:text-white px-2"
                >
                  {suggestions[tool.id] != null ? '▲' : '▼'} Suggestions
                </button>
              </div>
              {suggestions[tool.id] != null && suggestions[tool.id] !== null && (
                <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                  {suggestions[tool.id].length === 0 ? (
                    <p className="text-gray-500 text-sm">No suggestions yet. Click Analyze to generate.</p>
                  ) : (
                    <div className="space-y-2">
                      {suggestions[tool.id].map((s, i) => (
                        <div key={s.id || i} className="bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-gray-300 text-xs">{typeof s.suggestions === 'string' ? s.suggestions : JSON.stringify(s.suggestions)}</p>
                            </div>
                            {!s.applied && (
                              <button
                                onClick={() => api.patch(`/api/optimize/suggestion/${s.id}/apply`).then(() => loadSuggestions(tool.id))}
                                className="text-xs text-green-400 hover:underline shrink-0"
                              >
                                Apply
                              </button>
                            )}
                            {s.applied && <span className="text-xs text-green-400 shrink-0">✓ Applied</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab 8: Decisions ───────────────────────────────────────────
function DecisionsTab() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [running, setRunning]     = useState(false)
  const [acting, setActing]       = useState(null)
  const [toast, setToast]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // GET /api/decision runs dry-run evaluation and returns results
      const res = await api.get('/api/decision?dry_run=true')
      const results = res.data?.data?.results || []
      setDecisions(results)
    } catch { setDecisions([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const runAll = async () => {
    setRunning(true)
    try {
      await api.get('/api/decision')
      setToast({ msg: 'Decision engine ran on all tools!', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setRunning(false) }
  }

  const approve = async (toolId) => {
    setActing(toolId + '_approve')
    try {
      await api.post('/api/decision/approve', { tool_id: toolId })
      setToast({ msg: 'Tool approved → live', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const reject = async (toolId) => {
    setActing(toolId + '_reject')
    try {
      await api.post('/api/decision/reject', { tool_id: toolId })
      setToast({ msg: 'Tool rejected → killed', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const actionBadge = (action) => {
    const map = {
      scale:   'bg-green-800 text-green-300',
      kill:    'bg-red-800 text-red-300',
      improve: 'bg-yellow-800 text-yellow-300',
      observe: 'bg-blue-800 text-blue-300',
    }
    const key = (action || '').toLowerCase()
    return <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${map[key] || 'bg-gray-700 text-gray-300'}`}>{action || '—'}</span>
  }

  if (loading) return <Spinner />

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex justify-end mb-4">
        <button
          onClick={runAll}
          disabled={running}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {running ? 'Running...' : '↻ Run Decision Engine'}
        </button>
      </div>

      {decisions.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No decision results yet. Click Run to evaluate all tools.</p>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                {['Tool', 'Decision', 'Reason', 'Confidence', 'Actions'].map(h => (
                  <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d, i) => (
                <tr key={d.tool_id || i} className="border-b border-gray-700/50 last:border-0">
                  <td className="px-4 py-2 text-white text-xs font-medium">{d.tool_name || d.tool_id?.slice(0, 8)}</td>
                  <td className="px-4 py-2">{actionBadge(d.decision)}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs max-w-[200px] truncate">{d.reason || '—'}</td>
                  <td className="px-4 py-2 text-gray-300 text-xs">{d.confidence != null ? `${(d.confidence * 100).toFixed(0)}%` : '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(d.tool_id)}
                        disabled={!!acting}
                        className="text-xs text-green-400 hover:underline disabled:opacity-40"
                      >
                        {acting === d.tool_id + '_approve' ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => reject(d.tool_id)}
                        disabled={!!acting}
                        className="text-xs text-red-400 hover:underline disabled:opacity-40"
                      >
                        {acting === d.tool_id + '_reject' ? '...' : 'Reject'}
                      </button>
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
}

// ── Tab 9: Pipeline Health (Observability Dashboard) ──────────
const POLL_INTERVAL_MS = 30_000

function ConnectionBadge({ status }) {
  const map = {
    live:        { dot: 'bg-green-400', label: 'Live' },
    polling:     { dot: 'bg-yellow-400', label: 'Polling' },
    disconnected:{ dot: 'bg-red-500',   label: 'Disconnected' },
  }
  const cfg = map[status] || map.disconnected
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  )
}

function GaugeBar({ value, max = 100, label, colorClass = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MetricCard({ title, value, sub, accent = 'text-white' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1">{title}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function PipelineHealthTab() {
  const [metrics, setMetrics]   = useState(null)
  const [queues, setQueues]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [connStatus, setConn]   = useState('polling')
  const [toast, setToast]       = useState(null)
  const [cbTripped, setCbTripped] = useState(false)

  const ALERT_THRESHOLD = parseFloat(import.meta.env.VITE_ALERT_FAILURE_RATE_THRESHOLD || '0.20')

  const fetchData = useCallback(async () => {
    try {
      const [mRes, qRes] = await Promise.allSettled([
        api.get('/api/admin/pipeline-metrics'),
        api.get('/api/admin/queue-stats'),
      ])

      if (mRes.status === 'fulfilled') {
        setMetrics(mRes.value.data?.data || null)
        setConn('live')
      }
      if (qRes.status === 'fulfilled') {
        setQueues(qRes.value.data?.data || null)
      }
      if (mRes.status === 'rejected' && qRes.status === 'rejected') {
        setConn('disconnected')
      }
    } catch {
      setConn('polling')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchData])

  // Detect circuit breaker state from metrics
  useEffect(() => {
    if (!metrics) return
    const failRate = metrics.failure_rate ?? 0
    setCbTripped(failRate > 0.50)
  }, [metrics])

  const triggerRetention = async () => {
    try {
      await api.post('/api/admin/retention/trigger')
      setToast({ msg: 'Retention job triggered', type: 'success' })
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    }
  }

  const failRate    = metrics?.failure_rate ?? 0
  const successRate = metrics?.success_rate ?? 0
  const showAlert   = failRate >= ALERT_THRESHOLD

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Connection status + circuit breaker banner */}
      <div className="flex items-center justify-between">
        <ConnectionBadge status={connStatus} />
        <button
          onClick={fetchData}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {showAlert && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <div>
            <p className="text-red-300 font-medium text-sm">High Failure Rate Detected</p>
            <p className="text-red-400 text-xs mt-0.5">
              {(failRate * 100).toFixed(1)}% failure rate exceeds {(ALERT_THRESHOLD * 100).toFixed(0)}% threshold. Check error logs.
            </p>
          </div>
        </div>
      )}

      {cbTripped && (
        <div className="bg-orange-900/40 border border-orange-700 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-orange-400 text-lg">🔴</span>
          <div>
            <p className="text-orange-300 font-medium text-sm">Circuit Breaker Tripped</p>
            <p className="text-orange-400 text-xs mt-0.5">
              Failure rate exceeded 50% — pipeline auto-paused. Resolve errors before re-triggering.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Success Rate (24h)"
          value={`${(successRate * 100).toFixed(1)}%`}
          sub={`${metrics?.total_runs ?? 0} total runs`}
          accent={successRate >= 0.8 ? 'text-green-400' : successRate >= 0.6 ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          title="Avg Build Time"
          value={metrics?.avg_duration_ms != null ? `${(metrics.avg_duration_ms / 1000).toFixed(1)}s` : '—'}
          sub="per pipeline run"
        />
        <MetricCard
          title="Records Processed"
          value={metrics?.total_records_processed?.toLocaleString() ?? '—'}
          sub="last 24 hours"
        />
        <MetricCard
          title="Failed Jobs (DB)"
          value={metrics?.failed_jobs_count ?? '—'}
          sub="unresolved"
          accent={metrics?.failed_jobs_count > 0 ? 'text-red-400' : 'text-green-400'}
        />
      </div>

      {/* Success / failure gauge */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
        <h3 className="text-white text-sm font-semibold mb-4">Cron Success Rate</h3>
        <GaugeBar
          value={Math.round(successRate * 100)}
          max={100}
          label="Success %"
          colorClass={successRate >= 0.8 ? 'bg-green-500' : successRate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}
        />
        <GaugeBar
          value={Math.round(failRate * 100)}
          max={100}
          label="Failure %"
          colorClass="bg-red-500"
        />
      </div>

      {/* Per-cron breakdown */}
      {metrics?.by_cron && metrics.by_cron.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-white text-sm font-semibold">Failure Rate by Cron (24h)</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {metrics.by_cron.map(row => {
              const rate = row.total > 0 ? row.errors / row.total : 0
              return (
                <div key={row.cron_name} className="px-5 py-3 flex items-center gap-4">
                  <p className="text-gray-300 text-sm flex-1 font-mono">{row.cron_name}</p>
                  <div className="w-32">
                    <GaugeBar
                      value={row.errors}
                      max={row.total}
                      label=""
                      colorClass={rate > 0.3 ? 'bg-red-500' : rate > 0.1 ? 'bg-yellow-500' : 'bg-green-500'}
                    />
                  </div>
                  <p className="text-xs text-gray-400 w-16 text-right">
                    {row.errors}/{row.total}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Queue stats */}
      {queues && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white text-sm font-semibold mb-4">BullMQ Queue Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(queues).map(q => (
              <div key={q.name} className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-300 text-xs font-mono mb-2">{q.name}</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-gray-400">Waiting</span><span className="text-white font-medium">{q.waiting ?? '—'}</span>
                  <span className="text-gray-400">Active</span><span className="text-yellow-400 font-medium">{q.active ?? '—'}</span>
                  <span className="text-gray-400">Failed</span><span className={`font-medium ${q.failed > 0 ? 'text-red-400' : 'text-green-400'}`}>{q.failed ?? '—'}</span>
                  <span className="text-gray-400">Done</span><span className="text-green-400 font-medium">{q.completed ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={triggerRetention}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Run Data Retention Now
        </button>
        <a
          href="/api/admin/pipeline-metrics?format=csv"
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Export Metrics CSV
        </a>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function AgentControlPage() {
  const [tab, setTab] = useState('overview')

  const tabContent = {
    overview:     <OverviewTab />,
    ideas:        <IdeasTab />,
    revenue:      <RevenueTab />,
    health:       <HealthTab />,
    content:      <ContentTab />,
    support:      <SupportTab />,
    optimization: <OptimizationTab />,
    decisions:    <DecisionsTab />,
    pipeline:     <PipelineHealthTab />,
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-white font-bold text-xl">Agent Control Center</h1>
        <p className="text-gray-400 text-sm mt-0.5">Monitor and control all autonomous agents</p>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {tabContent[tab]}
      </div>
    </div>
  )
}
