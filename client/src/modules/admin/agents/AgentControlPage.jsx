import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../../services/api.service'

// ── Tab definitions ────────────────────────────────────────────
const TABS = [
  { id: 'overview',      label: '🔍 Overview'      },
  { id: 'ideas',         label: '💡 Ideas'          },
  { id: 'revenue',       label: '📊 Revenue'        },
  { id: 'health',        label: '🏥 Health'         },
  { id: 'content',       label: '📝 Content'        },
  { id: 'support',       label: '🎫 Support'        },
  { id: 'optimization',  label: '🔧 Optimization'   },
  { id: 'decisions',     label: '📋 Decisions'      },
  { id: 'pipeline',      label: '📡 Pipeline'       },
  { id: 'intelligence',  label: '🧠 Intelligence'   },
  { id: 'traffic',       label: '🚀 Traffic Campaign' },
  { id: 'scheduler',     label: '📅 Smart Scheduler'  },
  { id: 'backlinks',     label: '🔗 Backlink Bot'     },
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

// ── Execution status badge ─────────────────────────────────────
function ExecStatusBadge({ status }) {
  const map = {
    queued:    'bg-blue-900 text-blue-300',
    running:   'bg-yellow-800 text-yellow-300',
    paused:    'bg-purple-900 text-purple-300',
    completed: 'bg-green-800 text-green-300',
    failed:    'bg-red-800 text-red-300',
    cancelled: 'bg-gray-700 text-gray-400',
    stalled:   'bg-orange-900 text-orange-300',
    timed_out: 'bg-red-900 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status] || 'bg-gray-700 text-gray-300'}`}>
      {status || '—'}
    </span>
  )
}

function fmtDuration(ms) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })
}

function PipelineHealthTab() {
  const [cronMetrics, setCronMetrics] = useState(null)
  const [queues, setQueues]           = useState(null)
  const [rtMetrics, setRtMetrics]     = useState(null)
  const [activeExecs, setActiveExecs] = useState([])
  const [stalledExecs, setStalledExecs] = useState([])
  const [failures, setFailures]       = useState([])
  // Phase 4E/4F
  const [clusterData, setClusterData] = useState(null)
  const [healthData, setHealthData]   = useState(null)
  const [diagnostics, setDiagnostics] = useState([])
  const [dlqSummary, setDlqSummary]   = useState(null)
  const [dlqEntries, setDlqEntries]   = useState([])
  const [replayingId, setReplayingId] = useState(null)

  const [loading, setLoading]         = useState(true)
  const [connStatus, setConn]         = useState('polling')
  const [toast, setToast]             = useState(null)
  const [cbTripped, setCbTripped]     = useState(false)

  const ALERT_THRESHOLD = parseFloat(import.meta.env.VITE_ALERT_FAILURE_RATE_THRESHOLD || '0.20')

  const fetchData = useCallback(async () => {
    try {
      const [mRes, qRes, rtRes, activeRes, stalledRes, failRes,
             clusterRes, healthRes, diagRes, dlqRes] = await Promise.allSettled([
        api.get('/api/admin/pipeline-metrics'),
        api.get('/api/admin/queue-stats'),
        api.get('/api/runtime/metrics'),
        api.get('/api/runtime/active'),
        api.get('/api/runtime/stalled'),
        api.get('/api/runtime/failures?limit=10'),
        api.get('/api/workers/cluster'),
        api.get('/api/runtime/health'),
        api.get('/api/runtime/diagnostics'),
        api.get('/api/runtime/dlq?limit=10'),
      ])

      let anyLive = false

      if (mRes.status === 'fulfilled') {
        setCronMetrics(mRes.value.data?.data || null); anyLive = true
      }
      if (qRes.status === 'fulfilled') {
        setQueues(qRes.value.data?.data || null)
      }
      if (rtRes.status === 'fulfilled') {
        setRtMetrics(rtRes.value.data?.data || null); anyLive = true
      }
      if (activeRes.status === 'fulfilled') {
        setActiveExecs(activeRes.value.data?.data || [])
      }
      if (stalledRes.status === 'fulfilled') {
        setStalledExecs(stalledRes.value.data?.data?.executions || [])
      }
      if (failRes.status === 'fulfilled') {
        setFailures(failRes.value.data?.data || [])
      }
      if (clusterRes.status === 'fulfilled') {
        setClusterData(clusterRes.value.data?.data || null)
      }
      if (healthRes.status === 'fulfilled') {
        setHealthData(healthRes.value.data?.data || null)
      }
      if (diagRes.status === 'fulfilled') {
        setDiagnostics(diagRes.value.data?.data?.warnings || [])
      }
      if (dlqRes.status === 'fulfilled') {
        setDlqSummary(dlqRes.value.data?.summary || null)
        setDlqEntries(dlqRes.value.data?.data || [])
      }

      setConn(anyLive ? 'live' : 'disconnected')
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

  useEffect(() => {
    const failRate = cronMetrics?.failure_rate ?? 0
    setCbTripped(failRate > 0.50)
  }, [cronMetrics])

  const triggerRetention = async () => {
    try {
      await api.post('/api/admin/retention/trigger')
      setToast({ msg: 'Retention job triggered', type: 'success' })
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    }
  }

  const cancelExec = async (executionId) => {
    try {
      await api.post(`/api/pipelines/executions/${executionId}/cancel`)
      setToast({ msg: 'Cancellation requested', type: 'success' })
      fetchData()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Cancel failed', type: 'error' })
    }
  }

  const replayDlq = async (dlqId) => {
    setReplayingId(dlqId)
    try {
      const res = await api.post(`/api/runtime/dlq/${dlqId}/replay`)
      setToast({ msg: res.data?.executionId ? `Replay started: ${res.data.executionId.slice(0,8)}...` : 'Replay triggered', type: 'success' })
      fetchData()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Replay failed', type: 'error' })
    } finally {
      setReplayingId(null)
    }
  }

  const forceRebalance = async () => {
    try {
      await api.post('/api/workers/rebalance')
      setToast({ msg: 'Rebalance cycle triggered', type: 'success' })
      fetchData()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Rebalance failed', type: 'error' })
    }
  }

  const failRate    = cronMetrics?.failure_rate ?? 0
  const successRate = cronMetrics?.success_rate ?? 0
  const showAlert   = failRate >= ALERT_THRESHOLD

  // Runtime metrics from Phase 4 engine
  const liveMetrics  = rtMetrics?.live
  const queueMetrics = rtMetrics?.queue

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Connection + refresh */}
      <div className="flex items-center justify-between">
        <ConnectionBadge status={connStatus} />
        <button onClick={fetchData} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Refresh
        </button>
      </div>

      {/* Stalled execution warning banner */}
      {stalledExecs.length > 0 && (
        <div className="bg-orange-900/40 border border-orange-700 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-orange-400 text-lg">⚠</span>
          <div>
            <p className="text-orange-300 font-medium text-sm">
              {stalledExecs.length} Stalled Execution{stalledExecs.length > 1 ? 's' : ''} Detected
            </p>
            <p className="text-orange-400 text-xs mt-0.5">
              These executions stopped responding. Review and re-trigger if needed.
            </p>
          </div>
        </div>
      )}

      {/* High failure rate alert */}
      {showAlert && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <div>
            <p className="text-red-300 font-medium text-sm">High Failure Rate Detected</p>
            <p className="text-red-400 text-xs mt-0.5">
              {(failRate * 100).toFixed(1)}% failure rate exceeds {(ALERT_THRESHOLD * 100).toFixed(0)}% threshold.
            </p>
          </div>
        </div>
      )}

      {/* Circuit breaker banner */}
      {cbTripped && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">🔴</span>
          <div>
            <p className="text-red-300 font-medium text-sm">Circuit Breaker Tripped</p>
            <p className="text-red-400 text-xs mt-0.5">Failure rate exceeded 50% — resolve errors before re-triggering.</p>
          </div>
        </div>
      )}

      {/* ── Phase 4 Runtime KPI cards ── */}
      {liveMetrics && (
        <div>
          <h3 className="text-white text-sm font-semibold mb-3">Live Runtime Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Active Executions"
              value={liveMetrics.gauges?.active_executions ?? 0}
              sub="currently running"
              accent={(liveMetrics.gauges?.active_executions ?? 0) > 0 ? 'text-yellow-400' : 'text-green-400'}
            />
            <MetricCard
              title="Success Rate (5m)"
              value={liveMetrics.rolling?.successRate != null
                ? `${(liveMetrics.rolling.successRate * 100).toFixed(1)}%`
                : '—'}
              sub={`${liveMetrics.rolling?.total ?? 0} in window`}
              accent={
                liveMetrics.rolling?.successRate == null ? 'text-gray-400'
                : liveMetrics.rolling.successRate >= 0.8 ? 'text-green-400'
                : liveMetrics.rolling.successRate >= 0.6 ? 'text-yellow-400'
                : 'text-red-400'
              }
            />
            <MetricCard
              title="Median Duration"
              value={liveMetrics.durations?.p50 != null ? fmtDuration(liveMetrics.durations.p50) : '—'}
              sub={`p95: ${liveMetrics.durations?.p95 != null ? fmtDuration(liveMetrics.durations.p95) : '—'}`}
            />
            <MetricCard
              title="Total Retries"
              value={liveMetrics.counters?.step_retries_total ?? 0}
              sub={`${liveMetrics.counters?.agent_timeouts_total ?? 0} timeouts`}
              accent={(liveMetrics.counters?.step_retries_total ?? 0) > 10 ? 'text-yellow-400' : 'text-white'}
            />
          </div>
        </div>
      )}

      {/* ── Cron KPI cards ── */}
      <div>
        <h3 className="text-white text-sm font-semibold mb-3">Cron Health (24h)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Success Rate"
            value={`${(successRate * 100).toFixed(1)}%`}
            sub={`${cronMetrics?.total_runs ?? 0} total runs`}
            accent={successRate >= 0.8 ? 'text-green-400' : successRate >= 0.6 ? 'text-yellow-400' : 'text-red-400'}
          />
          <MetricCard
            title="Avg Build Time"
            value={cronMetrics?.avg_duration_ms != null ? fmtDuration(cronMetrics.avg_duration_ms) : '—'}
            sub="per cron run"
          />
          <MetricCard
            title="Records Processed"
            value={cronMetrics?.total_records_processed?.toLocaleString() ?? '—'}
            sub="last 24 hours"
          />
          <MetricCard
            title="Failed Jobs"
            value={cronMetrics?.failed_jobs_count ?? '—'}
            sub="unresolved"
            accent={(cronMetrics?.failed_jobs_count ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}
          />
        </div>
      </div>

      {/* ── Queue concurrency panel ── */}
      {queueMetrics && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white text-sm font-semibold mb-4">Execution Queue</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Active</p>
              <p className="text-white font-bold text-xl">{queueMetrics.activeCount}</p>
              <p className="text-gray-500 text-xs">of {queueMetrics.maxConcurrent} max</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Queued</p>
              <p className={`font-bold text-xl ${queueMetrics.queueDepth > 0 ? 'text-yellow-400' : 'text-white'}`}>
                {queueMetrics.queueDepth}
              </p>
              <p className="text-gray-500 text-xs">waiting for slot</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Utilization</p>
              <p className={`font-bold text-xl ${queueMetrics.utilizationPct >= 80 ? 'text-orange-400' : 'text-green-400'}`}>
                {queueMetrics.utilizationPct}%
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Total Dispatched</p>
              <p className="text-white font-bold text-xl">{queueMetrics.counters?.dequeued ?? 0}</p>
            </div>
          </div>
          <GaugeBar
            value={queueMetrics.activeCount}
            max={queueMetrics.maxConcurrent}
            label="Slot utilization"
            colorClass={queueMetrics.utilizationPct >= 80 ? 'bg-orange-500' : 'bg-indigo-500'}
          />
        </div>
      )}

      {/* ── Active executions table ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold">Active Executions</h3>
          <span className="text-gray-400 text-xs">{activeExecs.length} running</span>
        </div>
        {activeExecs.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No active executions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Pipeline', 'Status', 'Current Step', 'Started', 'Actions'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeExecs.map(exec => (
                  <tr key={exec.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2 text-gray-300 font-mono">{exec.pipeline_id}</td>
                    <td className="px-4 py-2"><ExecStatusBadge status={exec.status} /></td>
                    <td className="px-4 py-2 text-gray-400">{exec.current_step || exec.paused_step || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtTime(exec.started_at)}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => cancelExec(exec.id)}
                        className="text-red-400 hover:text-red-300 hover:underline"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Stalled executions ── */}
      {stalledExecs.length > 0 && (
        <div className="bg-gray-800 border border-orange-800/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 bg-orange-900/20">
            <h3 className="text-orange-300 text-sm font-semibold">Stalled Executions ({stalledExecs.length})</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {stalledExecs.map(exec => (
              <div key={exec.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-xs font-mono truncate">{exec.pipeline_id}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{exec.error_message || 'No error message'}</p>
                </div>
                <p className="text-gray-500 text-xs shrink-0">{fmtTime(exec.started_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent failures ── */}
      {failures.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-white text-sm font-semibold">Recent Failures (24h)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Pipeline', 'Status', 'Error', 'Completed'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failures.map(exec => (
                  <tr key={exec.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2 text-gray-300 font-mono">{exec.pipeline_id}</td>
                    <td className="px-4 py-2"><ExecStatusBadge status={exec.status} /></td>
                    <td className="px-4 py-2 text-gray-400 max-w-[200px] truncate">{exec.error_message || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtTime(exec.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cron success / failure gauges ── */}
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

      {/* ── Per-cron breakdown ── */}
      {cronMetrics?.by_cron?.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-white text-sm font-semibold">Failure Rate by Cron (24h)</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {cronMetrics.by_cron.map(row => {
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
                  <p className="text-xs text-gray-400 w-16 text-right">{row.errors}/{row.total}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── BullMQ queue stats ── */}
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

      {/* ── Phase 4E: Cluster Health + Worker Status ── */}
      {(clusterData || healthData) && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">Cluster Health</h3>
            {healthData && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                healthData.status === 'healthy'  ? 'bg-green-900/60 text-green-300' :
                healthData.status === 'degraded' ? 'bg-yellow-900/60 text-yellow-300' :
                                                   'bg-red-900/60 text-red-300'
              }`}>
                {healthData.status?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Health check breakdown */}
          {healthData?.checks && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(healthData.checks).map(([name, check]) => (
                <div key={name} className="bg-gray-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    check.status === 'healthy'  ? 'text-green-400' :
                    check.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {check.status === 'healthy' ? '✓' : check.status === 'degraded' ? '!' : '✗'}
                  </span>
                  <div>
                    <p className="text-gray-300 text-xs font-medium capitalize">{name.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[140px]">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Worker list */}
          {clusterData?.workers && (
            <div>
              <p className="text-gray-400 text-xs mb-2">
                Workers — {clusterData.workers.live?.length ?? 0} live,{' '}
                {clusterData.workers.dead?.length ?? 0} dead
              </p>
              {clusterData.workers.live?.length > 0 && (
                <div className="space-y-1">
                  {clusterData.workers.live.map(w => (
                    <div key={w.id} className="bg-gray-700/40 rounded px-3 py-1.5 flex items-center gap-3 text-xs">
                      <span className="text-green-400 font-bold">●</span>
                      <span className="text-gray-300 font-mono">{w.hostname}</span>
                      <span className="text-gray-500">pid {w.pid}</span>
                      <span className="text-gray-400 ml-auto">{w.active_jobs ?? 0} jobs · {w.memory_mb ?? '?'}MB</span>
                    </div>
                  ))}
                </div>
              )}
              {clusterData.workers.dead?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {clusterData.workers.dead.map(w => (
                    <div key={w.id} className="bg-gray-700/40 rounded px-3 py-1.5 flex items-center gap-3 text-xs">
                      <span className="text-red-400 font-bold">●</span>
                      <span className="text-gray-500 font-mono">{w.hostname}</span>
                      <span className="text-red-400 ml-auto">DEAD</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Circuit Breakers */}
          {clusterData?.circuitBreakers?.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-2">Circuit Breakers</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {clusterData.circuitBreakers.map(b => (
                  <div key={b.name} className={`rounded-lg px-3 py-2 border ${
                    b.state === 'OPEN'      ? 'bg-red-900/30 border-red-800/50' :
                    b.state === 'HALF_OPEN' ? 'bg-yellow-900/30 border-yellow-800/50' :
                                             'bg-gray-700/40 border-gray-600/30'
                  }`}>
                    <p className="text-gray-300 text-xs font-mono truncate">{b.name}</p>
                    <p className={`text-xs font-bold mt-0.5 ${
                      b.state === 'OPEN'      ? 'text-red-400' :
                      b.state === 'HALF_OPEN' ? 'text-yellow-400' : 'text-green-400'
                    }`}>{b.state}</p>
                    {b.state !== 'CLOSED' && b.reopensAt && (
                      <p className="text-gray-500 text-xs">Opens: {fmtTime(b.reopensAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backpressure */}
          {clusterData?.backpressure && clusterData.backpressure.level > 0 && (
            <div className={`rounded-lg px-3 py-2 border ${
              clusterData.backpressure.level >= 3 ? 'bg-red-900/30 border-red-800/50' :
              clusterData.backpressure.level >= 2 ? 'bg-orange-900/30 border-orange-800/50' :
                                                    'bg-yellow-900/30 border-yellow-800/50'
            }`}>
              <p className="text-xs text-gray-300">
                Backpressure: <span className="font-bold">{clusterData.backpressure.levelName}</span>
                {' '} · Heap {clusterData.backpressure.heapMb}MB
                {clusterData.backpressure.totalRejections > 0 &&
                  ` · ${clusterData.backpressure.totalRejections} rejected`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 4F: Diagnostics Warnings ── */}
      {diagnostics.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-white text-sm font-semibold">Runtime Diagnostics ({diagnostics.length})</h3>
          </div>
          <div className="divide-y divide-gray-700/50">
            {diagnostics.map((w, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <span className={`text-sm mt-0.5 ${
                  w.severity === 'error' ? 'text-red-400' :
                  w.severity === 'warn'  ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {w.severity === 'error' ? '✗' : w.severity === 'warn' ? '⚠' : 'ℹ'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-xs">{w.message}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{w.source}</p>
                </div>
                <p className="text-gray-600 text-xs shrink-0">{fmtTime(w.ts)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Phase 4F: Dead-Letter Queue ── */}
      {(dlqSummary?.dead > 0 || dlqEntries.length > 0) && (
        <div className="bg-gray-800 border border-red-900/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 bg-red-900/10 flex items-center justify-between">
            <h3 className="text-red-300 text-sm font-semibold">
              Dead-Letter Queue{dlqSummary ? ` — ${dlqSummary.dead} dead, ${dlqSummary.replayed} replayed` : ''}
            </h3>
          </div>
          {dlqEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">No entries</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-700">
                  <tr>
                    {['Pipeline', 'Reason', 'Attempts', 'Failed At', 'Actions'].map(h => (
                      <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dlqEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-700/50 last:border-0">
                      <td className="px-4 py-2 text-gray-300 font-mono">{entry.pipeline_id}</td>
                      <td className="px-4 py-2 text-gray-400 max-w-[160px] truncate">{entry.failure_reason}</td>
                      <td className="px-4 py-2 text-gray-400">{entry.attempts}</td>
                      <td className="px-4 py-2 text-gray-500">{fmtTime(entry.failed_at)}</td>
                      <td className="px-4 py-2">
                        <button
                          disabled={replayingId === entry.id || entry.status === 'replayed'}
                          onClick={() => replayDlq(entry.id)}
                          className={`font-medium transition-colors ${
                            entry.status === 'replayed'
                              ? 'text-gray-600 cursor-default'
                              : replayingId === entry.id
                                ? 'text-gray-500'
                                : 'text-indigo-400 hover:text-indigo-300 hover:underline'
                          }`}
                        >
                          {entry.status === 'replayed' ? 'Replayed' : replayingId === entry.id ? '…' : 'Replay'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={triggerRetention}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Run Data Retention Now
        </button>
        <button
          onClick={forceRebalance}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Force Rebalance
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

// ── Tab 10: Intelligence (Phase 5A + 5B) ──────────────────────
function IntelligenceTab() {
  const [memStats,      setMemStats]      = useState(null)
  const [learnStats,    setLearnStats]    = useState(null)
  const [events,        setEvents]        = useState([])
  const [velocity,      setVelocity]      = useState([])
  const [topPrompts,    setTopPrompts]    = useState([])
  const [bottomPrompts, setBottomPrompts] = useState([])
  const [patterns,      setPatterns]      = useState([])
  const [optimizations, setOptimizations] = useState([])
  const [repairRows,    setRepairRows]    = useState([])
  const [acting,        setActing]        = useState(null)
  const [toast,         setToast]         = useState(null)
  const [loading,       setLoading]       = useState(true)

  const load = useCallback(async () => {
    const safe = (p) => p.catch(() => null)
    const [mem, learn, evts, vel, top, bot, pats, opts, repairs] = await Promise.all([
      safe(api.get('/api/memory/stats')),
      safe(api.get('/api/learning/stats')),
      safe(api.get('/api/learning/events?limit=20&hours=24')),
      safe(api.get('/api/learning/velocity?days=7')),
      safe(api.get('/api/learning/prompts/top?limit=8')),
      safe(api.get('/api/learning/prompts/bottom?limit=5')),
      safe(api.get('/api/memory/patterns/list?limit=10')),
      safe(api.get('/api/learning/optimizations?limit=10')),
      safe(api.get('/api/learning/repair?limit=10&hours=48')),
    ])
    setMemStats(mem?.data?.data ?? null)
    setLearnStats(learn?.data?.data ?? null)
    setEvents(evts?.data?.data ?? [])
    setVelocity(vel?.data?.data ?? [])
    setTopPrompts(top?.data?.data ?? [])
    setBottomPrompts(bot?.data?.data ?? [])
    setPatterns(pats?.data?.data ?? [])
    setOptimizations(opts?.data?.data ?? [])
    setRepairRows(repairs?.data?.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  const applyOpt = async (id) => {
    setActing(id + '_apply')
    try {
      await api.post(`/api/learning/optimizations/${id}/apply`)
      setToast({ msg: 'Optimization marked applied', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const rejectOpt = async (id) => {
    setActing(id + '_reject')
    try {
      await api.post(`/api/learning/optimizations/${id}/reject`)
      setToast({ msg: 'Optimization rejected', type: 'success' })
      load()
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const runPipeline = async (name) => {
    setActing('pipeline_' + name)
    try {
      await api.post(`/api/learning/pipelines/run/${name}`)
      setToast({ msg: `Pipeline ${name.toUpperCase()} triggered`, type: 'success' })
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setActing(null) }
  }

  const outcomeColor = (o) => {
    if (o === 'success')  return 'text-green-400'
    if (o === 'partial')  return 'text-yellow-400'
    if (o === 'failure')  return 'text-red-400'
    return 'text-gray-400'
  }

  const scoreBar = (score) => {
    const pct  = Math.min(100, score ?? 0)
    const col  = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400">{pct}</span>
      </div>
    )
  }

  if (loading) return <Spinner />

  // ── Derived stats ──────────────────────────────────────────────
  const stm   = memStats?.shortTerm  ?? {}
  const ltm   = memStats?.longTerm   ?? {}
  const sem   = memStats?.semantic   ?? {}
  const lCap  = learnStats?.capture  ?? {}
  const e24h  = learnStats?.events24h ?? {}
  const totalE24 = Object.values(e24h).reduce((s, v) => s + v, 0)
  const successE  = e24h.success  ?? 0
  const failureE  = e24h.failure  ?? 0
  const successPct = totalE24 > 0 ? Math.round((successE / totalE24) * 100) : 0

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── Section: Memory Stats ── */}
      <div>
        <h2 className="text-white text-sm font-semibold mb-3">AI Memory Layer</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            title="Short-Term Entries"
            value={stm.count ?? 0}
            sub={`Cap ${stm.capacity ?? 500}`}
            accent="text-indigo-400"
          />
          <MetricCard
            title="Long-Term Memories"
            value={ltm.total ?? 0}
            sub={`Active: ${ltm.active ?? 0}`}
            accent="text-purple-400"
          />
          <MetricCard
            title="Semantic Tags"
            value={sem.totalTags ?? 0}
            sub={`Index: ${sem.indexedMemories ?? 0} memories`}
            accent="text-cyan-400"
          />
          <MetricCard
            title="Retired Memories"
            value={ltm.retired ?? 0}
            sub="Below confidence floor"
            accent="text-gray-400"
          />
        </div>
      </div>

      {/* ── Section: Learning 24h Stats ── */}
      <div>
        <h2 className="text-white text-sm font-semibold mb-3">Learning Activity (24h)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <MetricCard
            title="Total Events"
            value={totalE24}
            sub="Captured last 24h"
            accent="text-white"
          />
          <MetricCard
            title="Success Events"
            value={successE}
            sub={`${successPct}% success rate`}
            accent="text-green-400"
          />
          <MetricCard
            title="Failure Events"
            value={failureE}
            sub="Learning from failures"
            accent="text-red-400"
          />
          <MetricCard
            title="Total Captured"
            value={lCap.totalCaptured ?? 0}
            sub="All time"
            accent="text-indigo-400"
          />
        </div>

        {/* Learning velocity */}
        {velocity.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-3">Events / Day (7 days)</p>
            <div className="flex items-end gap-1.5 h-16">
              {velocity.map((row, i) => {
                const maxVal = Math.max(...velocity.map(r => r.event_count || 0), 1)
                const h = Math.round(((row.event_count || 0) / maxVal) * 100)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-indigo-600 rounded-t-sm transition-all duration-300"
                      style={{ height: `${h}%`, minHeight: row.event_count ? '4px' : 0 }}
                      title={`${row.day}: ${row.event_count}`}
                    />
                    <span className="text-gray-600 text-xs truncate w-full text-center">
                      {row.day ? new Date(row.day).toLocaleDateString('en-IN', { weekday: 'short' }) : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Section: Prompt Evolution ── */}
      {(topPrompts.length > 0 || bottomPrompts.length > 0) && (
        <div>
          <h2 className="text-white text-sm font-semibold mb-3">Prompt Evolution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topPrompts.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 bg-green-900/10">
                  <p className="text-green-300 text-xs font-semibold">Top Performing Prompts</p>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {topPrompts.map(p => (
                    <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-xs font-mono truncate">{p.prompt_name}</p>
                        <p className="text-gray-500 text-xs">v{p.version_number} · {p.total_usages ?? 0} uses</p>
                      </div>
                      {scoreBar(p.score)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {bottomPrompts.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 bg-red-900/10">
                  <p className="text-red-300 text-xs font-semibold">Underperforming Prompts</p>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {bottomPrompts.map(p => (
                    <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-xs font-mono truncate">{p.prompt_name}</p>
                        <p className="text-gray-500 text-xs">
                          v{p.version_number} · {p.status === 'retired' ? '⚠ Retired' : `${p.total_usages ?? 0} uses`}
                        </p>
                      </div>
                      {scoreBar(p.score)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section: Failure Patterns ── */}
      {patterns.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h2 className="text-white text-sm font-semibold">Runtime Failure Patterns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Pattern', 'Type', 'Occurrences', 'Last Seen', 'Resolution'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patterns.map(p => (
                  <tr key={p.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2 text-gray-300 font-mono max-w-[180px] truncate">{p.pattern_key || p.id}</td>
                    <td className="px-4 py-2">
                      <span className="bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded text-xs">{p.pattern_type || '—'}</span>
                    </td>
                    <td className="px-4 py-2 text-orange-300 font-bold">{p.occurrences ?? 0}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtTime(p.last_seen_at || p.updated_at)}</td>
                    <td className="px-4 py-2 text-gray-400 max-w-[160px] truncate">
                      {p.resolution_strategy || (p.is_resolved ? '✓ Resolved' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Recent Learning Events ── */}
      {events.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-white text-sm font-semibold">Recent Learning Events (24h)</h2>
            <span className="text-gray-500 text-xs">{events.length} shown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Type', 'Source', 'Outcome', 'Score', 'Duration', 'When'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-2 text-gray-300 font-mono">{e.event_type}</td>
                    <td className="px-4 py-2 text-gray-400 max-w-[140px] truncate">{e.agent_name || e.pipeline_id || '—'}</td>
                    <td className={`px-4 py-2 font-medium ${outcomeColor(e.outcome)}`}>{e.outcome}</td>
                    <td className="px-4 py-2 text-gray-400">{e.score ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtDuration(e.duration_ms)}</td>
                    <td className="px-4 py-2 text-gray-600">{fmtTime(e.learned_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Optimization Recommendations ── */}
      <div>
        <h2 className="text-white text-sm font-semibold mb-3">Optimization Recommendations</h2>
        {optimizations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6 bg-gray-800 border border-gray-700 rounded-xl">
            No pending recommendations
          </p>
        ) : (
          <div className="space-y-3">
            {optimizations.map(opt => (
              <div key={opt.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        opt.priority === 'critical' ? 'bg-red-900/60 text-red-300' :
                        opt.priority === 'high'     ? 'bg-orange-900/60 text-orange-300' :
                        opt.priority === 'medium'   ? 'bg-yellow-900/60 text-yellow-300' :
                                                      'bg-gray-700 text-gray-400'
                      }`}>{opt.priority || 'low'}</span>
                      <span className="text-gray-500 text-xs">{opt.category}</span>
                    </div>
                    <p className="text-gray-300 text-sm font-medium">{opt.title}</p>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{opt.description}</p>
                    {opt.affected_component && (
                      <p className="text-gray-600 text-xs mt-1 font-mono">{opt.affected_component}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={acting === opt.id + '_apply'}
                      onClick={() => applyOpt(opt.id)}
                      className="text-xs bg-green-800 hover:bg-green-700 disabled:opacity-40 text-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      {acting === opt.id + '_apply' ? '…' : 'Apply'}
                    </button>
                    <button
                      disabled={acting === opt.id + '_reject'}
                      onClick={() => rejectOpt(opt.id)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      {acting === opt.id + '_reject' ? '…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section: Repair History ── */}
      {repairRows.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h2 className="text-white text-sm font-semibold">Repair History (48h)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Tool', 'Fix Type', 'Category', 'Success', 'Confidence Δ', 'When'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repairRows.map(r => {
                  const delta = ((r.confidence_after ?? 0) - (r.confidence_before ?? 0)).toFixed(2)
                  return (
                    <tr key={r.id} className="border-b border-gray-700/50 last:border-0">
                      <td className="px-4 py-2 text-gray-300 font-mono max-w-[120px] truncate">{r.tool_id}</td>
                      <td className="px-4 py-2 text-gray-400">{r.fix_type || '—'}</td>
                      <td className="px-4 py-2 text-gray-400">{r.error_category || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={r.success ? 'text-green-400' : 'text-red-400'}>
                          {r.success ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className={`px-4 py-2 font-mono ${Number(delta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Number(delta) >= 0 ? '+' : ''}{delta}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{fmtTime(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Actions: Manual Pipeline Triggers ── */}
      <div className="flex flex-wrap gap-3">
        {['a', 'b', 'c'].map(name => {
          const labels = { a: 'Pipeline A — Distill Success', b: 'Pipeline B — Pattern Analysis', c: 'Pipeline C — Optimization Scan' }
          return (
            <button
              key={name}
              disabled={!!acting?.startsWith('pipeline_')}
              onClick={() => runPipeline(name)}
              className="text-sm bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40 text-indigo-200 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {acting === 'pipeline_' + name ? 'Running…' : labels[name]}
            </button>
          )
        })}
        <button
          onClick={load}
          className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

// ── Smart Scheduler constants ─────────────────────────────────
const SS_DAYS       = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SS_TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night']
const SS_TIME_LABELS = { Morning: '8–10 AM', Afternoon: '12–2 PM', Evening: '6–8 PM', Night: '9–11 PM' }
const SS_TIME_HOUR  = { Morning: 8, Afternoon: 12, Evening: 18, Night: 21 }

// Orange-highlighted best slots for Indian audiences
const SS_BEST_SLOTS = new Set(['Mon-Evening', 'Wed-Evening', 'Fri-Evening', 'Sat-Morning', 'Sun-Morning'])

// Best platform per highlighted slot (for auto-schedule)
const SS_SLOT_PLATFORMS = {
  'Mon-Evening': ['Reddit',    'LinkedIn', 'Twitter'  ],
  'Wed-Evening': ['Reddit',    'Blog',     'LinkedIn' ],
  'Fri-Evening': ['Reddit',    'Twitter',  'WhatsApp' ],
  'Sat-Morning': ['Pinterest', 'Blog',     'Quora'    ],
  'Sun-Morning': ['Pinterest', 'Quora',    'Blog'     ],
}

const SS_PLATFORM_ICON = { Reddit:'🔴', Quora:'🟤', Pinterest:'📌', Blog:'📝', LinkedIn:'💼', WhatsApp:'💬', Twitter:'🐦' }
const SS_PLATFORM_COLOR = {
  Reddit:    'bg-red-900/60 text-red-300',
  Quora:     'bg-orange-900/60 text-orange-300',
  Pinterest: 'bg-pink-900/60 text-pink-300',
  Blog:      'bg-blue-900/60 text-blue-300',
  LinkedIn:  'bg-sky-900/60 text-sky-300',
  WhatsApp:  'bg-green-900/60 text-green-300',
  Twitter:   'bg-cyan-900/60 text-cyan-300',
}
const SS_ALL_PLATFORMS = ['Reddit', 'Quora', 'Pinterest', 'Blog', 'LinkedIn', 'WhatsApp', 'Twitter']
const SS_CATEGORIES    = ['PDF Tools', 'Calculators', 'Converters', 'Productivity', 'AI Tools']
const SS_AUDIENCES     = ['Indian Students', 'Indian Professionals', 'Freelancers', 'General']

// JS getDay() 0=Sun → grid 0=Mon
function ssJsToGrid(jsDay) { return (jsDay + 6) % 7 }

function ssUpcomingBestSlots(n = 3) {
  const now = new Date()
  const todayGrid = ssJsToGrid(now.getDay())
  const todayHour = now.getHours()
  const ranked = [
    { day: 'Mon', gridIdx: 0, time: 'Evening' },
    { day: 'Wed', gridIdx: 2, time: 'Evening' },
    { day: 'Fri', gridIdx: 4, time: 'Evening' },
    { day: 'Sat', gridIdx: 5, time: 'Morning' },
    { day: 'Sun', gridIdx: 6, time: 'Morning' },
  ].map(s => {
    let diff = (s.gridIdx - todayGrid + 7) % 7
    if (diff === 0 && todayHour >= SS_TIME_HOUR[s.time]) diff = 7
    return { ...s, diff }
  }).sort((a, b) => a.diff - b.diff)
  return ranked.slice(0, n)
}

function ssDateForSlot(gridIdx, timeSlot) {
  const now  = new Date()
  const diff = (gridIdx - ssJsToGrid(now.getDay()) + 7) % 7
  const d    = new Date(now)
  d.setDate(d.getDate() + diff)
  d.setHours(SS_TIME_HOUR[timeSlot], 0, 0, 0)
  return d
}

function ssParseTime(raw) {
  return SS_TIME_SLOTS.find(t => raw?.startsWith(t)) || 'Evening'
}

function fmtScheduleTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Smart Scheduler Tab ────────────────────────────────────────
function SmartSchedulerTab() {
  const [schedule, setSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_posting_schedule') || '[]') } catch { return [] }
  })
  const [history] = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_campaign_history') || '[]') } catch { return [] }
  })
  const [selCampaign,     setSelCampaign]     = useState('')
  const [filterPlatform,  setFilterPlatform]  = useState('all')
  const [filterStatus,    setFilterStatus]    = useState('all')
  const [aiCategory,      setAiCategory]      = useState('PDF Tools')
  const [aiAudience,      setAiAudience]      = useState('Indian Students')
  const [aiSuggestions,   setAiSuggestions]   = useState([])
  const [aiLoading,       setAiLoading]       = useState(false)
  const [toastMsg,        setToastMsg]        = useState(null)

  const persistSchedule = (updated) => {
    setSchedule(updated)
    localStorage.setItem('awe_posting_schedule', JSON.stringify(updated))
  }

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  // ── Auto-schedule selected campaign into next 3 best slots ──
  const autoSchedule = () => {
    const campaign = history.find(c => String(c.id) === selCampaign)
    if (!campaign) return
    const slots = ssUpcomingBestSlots(3)
    const entries = slots.map((slot, i) => {
      const slotKey  = `${slot.day}-${slot.time}`
      const platform = (SS_SLOT_PLATFORMS[slotKey] || ['Reddit'])[0]
      const d        = ssDateForSlot(slot.gridIdx, slot.time)
      return {
        id:                Date.now() + i,
        campaignName:      campaign.name,
        tool:              campaign.tool,
        audience:          campaign.audience,
        platform,
        content:           `${platform} post for ${campaign.tool} · ${campaign.audience}`,
        scheduledDay:      slot.day,
        scheduledTime:     slot.time,
        scheduledDateTime: d.toISOString(),
        status:            'pending',
      }
    })
    persistSchedule([...entries, ...schedule])
    showToast(`Scheduled ${entries.length} posts from "${campaign.name}"`)
  }

  // ── Fetch AI suggestions ────────────────────────────────────
  const fetchAI = async () => {
    setAiLoading(true)
    setAiSuggestions([])
    try {
      const r = await api.post('/api/admin/schedule-intelligence', {
        toolCategory: aiCategory,
        audience:     aiAudience,
        dayOfWeek:    new Date().getDay(),
      })
      setAiSuggestions(r.data.suggestions || [])
    } catch (err) {
      showToast(err.response?.data?.error || 'AI request failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const buildEntryFromSuggestion = (sug, idx) => {
    const dayIdx = SS_DAYS.indexOf(sug.day)
    const time   = ssParseTime(sug.time)
    const d      = dayIdx >= 0 ? ssDateForSlot(dayIdx, time) : new Date()
    return {
      id:                Date.now() + idx,
      campaignName:      `AI Suggestion · ${aiCategory}`,
      tool:              aiCategory,
      audience:          aiAudience,
      platform:          sug.platform,
      content:           `${sug.platform} post for ${aiCategory} — ${(sug.reason || '').slice(0, 90)}`,
      scheduledDay:      sug.day,
      scheduledTime:     time,
      scheduledDateTime: d.toISOString(),
      status:            'pending',
    }
  }

  const applySuggestion = (sug, idx) => {
    persistSchedule([buildEntryFromSuggestion(sug, idx), ...schedule])
    showToast(`Added ${sug.platform} · ${sug.day} ${sug.time} to schedule`)
  }

  const applyAllSuggestions = () => {
    const entries = aiSuggestions.map((s, i) => buildEntryFromSuggestion(s, i))
    persistSchedule([...entries, ...schedule])
    showToast(`Applied ${entries.length} AI suggestions`)
  }

  const markPosted  = (id) => persistSchedule(schedule.map(s => s.id === id ? { ...s, status: 'posted' } : s))
  const deleteEntry = (id) => persistSchedule(schedule.filter(s => s.id !== id))

  // Filtered + sorted table rows
  const tableRows = schedule
    .filter(s => (filterPlatform === 'all' || s.platform === filterPlatform)
              && (filterStatus   === 'all' || s.status   === filterStatus))
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))

  // Grid lookup
  const gridMap = {}
  schedule.forEach(s => {
    const k = `${s.scheduledDay}-${s.scheduledTime}`
    if (!gridMap[k]) gridMap[k] = []
    gridMap[k].push(s)
  })

  // Slots preview for selected campaign
  const previewSlots = selCampaign ? ssUpcomingBestSlots(3) : []

  return (
    <div className="space-y-6">
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onDone={() => setToastMsg(null)} />}

      {/* ── 1: Weekly Schedule Grid ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700 flex flex-wrap items-center gap-3">
          <h2 className="text-white font-semibold text-sm flex-1">Weekly Schedule Grid (IST)</h2>
          <span className="text-gray-500 text-xs">🟠 Best times for Indian audiences</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 px-3 py-2 font-medium w-28 border-r border-gray-700/50">
                  Slot / Day
                </th>
                {SS_DAYS.map(day => (
                  <th key={day} className="text-center text-gray-300 px-2 py-2 font-semibold min-w-[90px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SS_TIME_SLOTS.map((time, ti) => (
                <tr key={time} className={`border-b border-gray-700/40 ${ti % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
                  {/* Time label */}
                  <td className="px-3 py-3 border-r border-gray-700/50 align-top">
                    <p className="text-gray-300 font-medium">{time}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{SS_TIME_LABELS[time]}</p>
                  </td>
                  {SS_DAYS.map(day => {
                    const key    = `${day}-${time}`
                    const isBest = SS_BEST_SLOTS.has(key)
                    const items  = gridMap[key] || []
                    return (
                      <td
                        key={day}
                        className={`px-2 py-2 align-top ${isBest ? 'bg-orange-500/8' : ''}`}
                        style={isBest ? { background: 'rgba(249,115,22,0.07)' } : {}}
                      >
                        {/* Best slot indicator dot (empty) */}
                        {isBest && items.length === 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60 mx-auto mt-1.5 mb-1" />
                        )}
                        {/* Scheduled items */}
                        <div className="space-y-0.5">
                          {items.map(item => (
                            <div
                              key={item.id}
                              title={`${item.platform}: ${item.content}`}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${
                                item.status === 'posted'
                                  ? 'bg-green-900/60 text-green-400'
                                  : (SS_PLATFORM_COLOR[item.platform] || 'bg-gray-700 text-gray-300')
                              }`}
                            >
                              {SS_PLATFORM_ICON[item.platform]} {item.platform}
                            </div>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2: Quick Schedule ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Quick Schedule</h2>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No saved campaigns yet — run a <span className="text-orange-400">Traffic Campaign</span> first, then save it.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-gray-400 text-xs mb-1.5">Select Saved Campaign</label>
                <select
                  value={selCampaign}
                  onChange={e => setSelCampaign(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">— Choose a campaign —</option>
                  {history.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} · {c.completed}/{c.total} channels
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={autoSchedule}
                disabled={!selCampaign}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
              >
                ⚡ Auto-Schedule
              </button>
            </div>

            {/* Slot preview */}
            {selCampaign && previewSlots.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-2">Will be scheduled into these best upcoming slots:</p>
                <div className="flex flex-wrap gap-2">
                  {previewSlots.map((slot, i) => {
                    const slotKey  = `${slot.day}-${slot.time}`
                    const platform = (SS_SLOT_PLATFORMS[slotKey] || ['Reddit'])[0]
                    return (
                      <div key={i} className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                        <span className="text-orange-300 font-semibold">{slot.day}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-400">{slot.time} {SS_TIME_LABELS[slot.time]}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-gray-300">{SS_PLATFORM_ICON[platform]} {platform}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3: Scheduled Posts Table ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700 flex flex-wrap items-center gap-3">
          <h2 className="text-white font-semibold text-sm flex-1">
            Scheduled Posts <span className="text-gray-500 font-normal">({schedule.length})</span>
          </h2>
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="all">All Platforms</option>
            {SS_ALL_PLATFORMS.map(p => <option key={p} value={p}>{SS_PLATFORM_ICON[p]} {p}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="pending">⏰ Pending</option>
            <option value="posted">✓ Posted</option>
          </select>
        </div>

        {tableRows.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">No scheduled posts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Platform', 'Content', 'Scheduled Time', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map(row => (
                  <tr key={row.id} className="border-b border-gray-700/50 last:border-0">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${SS_PLATFORM_COLOR[row.platform] || 'bg-gray-700 text-gray-300'}`}>
                        {SS_PLATFORM_ICON[row.platform]} {row.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-gray-300 truncate">{row.content}</p>
                      <p className="text-gray-600 text-xs mt-0.5 truncate">{row.campaignName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {fmtScheduleTime(row.scheduledDateTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        row.status === 'posted'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {row.status === 'posted' ? '✓ Posted' : '⏰ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {row.status === 'pending' && (
                          <button
                            onClick={() => markPosted(row.id)}
                            className="text-green-400 hover:text-green-300 transition-colors hover:underline"
                          >
                            Mark Posted
                          </button>
                        )}
                        <button
                          onClick={() => deleteEntry(row.id)}
                          className="text-red-400 hover:text-red-300 transition-colors hover:underline"
                        >
                          Delete
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

      {/* ── 4: Best Time Intelligence ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Best Time Intelligence</h2>
        <div className="flex flex-wrap gap-3 items-end mb-5">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Tool Category</label>
            <select
              value={aiCategory}
              onChange={e => setAiCategory(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {SS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Audience</label>
            <select
              value={aiAudience}
              onChange={e => setAiAudience(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {SS_AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button
            onClick={fetchAI}
            disabled={aiLoading}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {aiLoading
              ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              : '🧠 Get AI Suggestions'}
          </button>
        </div>

        {/* AI Suggestion cards */}
        {aiSuggestions.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 text-xs">
                Claude's recommendations for <span className="text-white">{aiCategory}</span> / <span className="text-white">{aiAudience}</span>
              </p>
              <button
                onClick={applyAllSuggestions}
                className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Apply All ({aiSuggestions.length})
              </button>
            </div>
            {aiSuggestions.map((sug, i) => (
              <div key={i} className="bg-gray-700/40 border border-gray-600/60 rounded-xl p-4 flex items-start gap-4">
                {/* Priority badge */}
                <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-orange-300 font-bold text-xs">{sug.priority || i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Day + Time + Platform */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-white font-semibold text-sm">{sug.day}</span>
                    <span className="text-orange-300 text-sm">· {sug.time}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${SS_PLATFORM_COLOR[sug.platform] || 'bg-gray-600 text-gray-300'}`}>
                      {SS_PLATFORM_ICON[sug.platform] || ''} {sug.platform}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{sug.reason}</p>
                </div>
                <button
                  onClick={() => applySuggestion(sug, i)}
                  className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/40 hover:border-orange-500/70 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          !aiLoading && (
            <div className="text-center py-6">
              <p className="text-gray-600 text-sm">Select category and audience, then click "Get AI Suggestions"</p>
              <p className="text-gray-700 text-xs mt-1">Claude will analyze optimal posting times for Indian users in IST</p>
            </div>
          )
        )}
      </div>

    </div>
  )
}

// ── Traffic Campaign: 49 AWE-OS tools ─────────────────────────
const CAMPAIGN_TOOLS = [
  { name: 'Merge PDF',                  slug: 'merge-pdf',             category: 'PDF Tools'    },
  { name: 'Split PDF',                  slug: 'split-pdf',             category: 'PDF Tools'    },
  { name: 'Remove PDF Pages',           slug: 'remove-pages-pdf',      category: 'PDF Tools'    },
  { name: 'Extract PDF Pages',          slug: 'extract-pages-pdf',     category: 'PDF Tools'    },
  { name: 'Organize PDF',               slug: 'organize-pdf',          category: 'PDF Tools'    },
  { name: 'Compress PDF',               slug: 'compress-pdf',          category: 'PDF Tools'    },
  { name: 'JPG to PDF',                 slug: 'jpg-to-pdf',            category: 'PDF Tools'    },
  { name: 'Word to PDF',                slug: 'word-to-pdf',           category: 'PDF Tools'    },
  { name: 'Excel to PDF',               slug: 'excel-to-pdf',          category: 'PDF Tools'    },
  { name: 'PowerPoint to PDF',          slug: 'powerpoint-to-pdf',     category: 'PDF Tools'    },
  { name: 'PDF to JPG',                 slug: 'pdf-to-jpg',            category: 'PDF Tools'    },
  { name: 'PDF to Word',                slug: 'pdf-to-word',           category: 'PDF Tools'    },
  { name: 'PDF to Text',                slug: 'pdf-to-text',           category: 'PDF Tools'    },
  { name: 'PDF to PowerPoint',          slug: 'pdf-to-ppt',            category: 'PDF Tools'    },
  { name: 'PDF to Excel',               slug: 'pdf-to-excel',          category: 'PDF Tools'    },
  { name: 'Rotate PDF',                 slug: 'rotate-pdf',            category: 'PDF Tools'    },
  { name: 'Add Watermark to PDF',       slug: 'watermark-pdf',         category: 'PDF Tools'    },
  { name: 'Add Page Numbers to PDF',    slug: 'page-numbers-pdf',      category: 'PDF Tools'    },
  { name: 'PDF Editor',                 slug: 'pdf-editor',            category: 'PDF Tools'    },
  { name: 'Protect PDF',                slug: 'protect-pdf',           category: 'PDF Tools'    },
  { name: 'Unlock PDF',                 slug: 'unlock-pdf',            category: 'PDF Tools'    },
  { name: 'FD Calculator',              slug: 'fd-calculator',         category: 'Calculators'  },
  { name: 'PPF Calculator',             slug: 'ppf-calculator',        category: 'Calculators'  },
  { name: 'SIP Calculator',             slug: 'sip-calculator',        category: 'Calculators'  },
  { name: 'ROI Calculator',             slug: 'roi-calculator',        category: 'Calculators'  },
  { name: 'Tax Calculator',             slug: 'tax-calculator',        category: 'Calculators'  },
  { name: 'Loan EMI Calculator',        slug: 'loan-calculator',       category: 'Calculators'  },
  { name: 'Percentage Calculator',      slug: 'percentage-calculator', category: 'Calculators'  },
  { name: 'GST Calculator',             slug: 'gst-calculator',        category: 'Calculators'  },
  { name: 'Tip Calculator',             slug: 'tip-calculator',        category: 'Calculators'  },
  { name: 'Discount Calculator',        slug: 'discount-calculator',   category: 'Calculators'  },
  { name: 'BMI Calculator',             slug: 'bmi-calculator',        category: 'Calculators'  },
  { name: 'Age Calculator',             slug: 'age-calculator',        category: 'Calculators'  },
  { name: 'GPA Calculator',             slug: 'gpa-calculator',        category: 'Calculators'  },
  { name: 'Unit Converter',             slug: 'unit-converter',        category: 'Converters'   },
  { name: 'Word Counter',               slug: 'word-counter',          category: 'Converters'   },
  { name: 'Password Generator',         slug: 'password-generator',    category: 'Converters'   },
  { name: 'Color Picker',               slug: 'color-picker',          category: 'Converters'   },
  { name: 'QR Code Generator',          slug: 'qr-code-generator',     category: 'Converters'   },
  { name: 'Image Compressor',           slug: 'image-compressor',      category: 'Converters'   },
  { name: 'Currency Converter',         slug: 'currency-converter',    category: 'Converters'   },
  { name: 'Number Base Converter',      slug: 'base-converter',        category: 'Converters'   },
  { name: 'JSON Formatter',             slug: 'json-formatter',        category: 'Converters'   },
  { name: 'CSV to JSON',                slug: 'csv-to-json',           category: 'Converters'   },
  { name: 'Invoice Generator',          slug: 'invoice',               category: 'Productivity' },
  { name: 'Invoice Generator (Quick)',  slug: 'invoice-generator',     category: 'Productivity' },
  { name: 'Contract Generator',         slug: 'contract-generator',    category: 'Productivity' },
  { name: 'AI Resume Builder',          slug: 'resume-builder',        category: 'AI Tools'     },
  { name: 'AI Content Writer',          slug: 'ai-content-writer',     category: 'AI Tools'     },
]

const TC_SUBREDDIT = {
  'PDF Tools':    'india',
  'Calculators':  'personalfinanceindia',
  'Converters':   'productivity',
  'Productivity': 'freelance',
  'AI Tools':     'artificial',
}

const TC_BOARD = {
  'PDF Tools':    'PDF Tips India',
  'Calculators':  'Financial Planning India',
  'Converters':   'Online Tools India',
  'Productivity': 'Work Productivity',
  'AI Tools':     'AI Tools Tips',
}

const TC_CHANNEL_STEPS = [
  { id: 'reddit',    label: 'Reddit Post',   icon: '🔴' },
  { id: 'quora',     label: 'Quora Answer',  icon: '🟤' },
  { id: 'pinterest', label: 'Pinterest Pin', icon: '📌' },
  { id: 'blog',      label: 'Blog Article',  icon: '📝' },
  { id: 'social',    label: 'Social Blast',  icon: '📣' },
]

function TrafficCampaignTab() {
  const today = new Date().toISOString().slice(0, 10)

  const [selectedTool, setSelectedTool] = useState(CAMPAIGN_TOOLS[0])
  const [audience,     setAudience]     = useState('Indian Students')
  const [campaignName, setCampaignName] = useState(`${CAMPAIGN_TOOLS[0].name} Traffic Campaign - ${today}`)
  const [channels,     setChannels]     = useState({ reddit: true, quora: true, pinterest: true, blog: true, social: true })
  const [phase,        setPhase]        = useState('setup')
  const [steps,        setSteps]        = useState(TC_CHANNEL_STEPS.map(s => ({ ...s, status: 'pending', result: null, error: null })))
  const [expanded,     setExpanded]     = useState({})
  const [copyFeedback, setCopyFeedback] = useState(null)
  const [saveDone,     setSaveDone]     = useState(false)
  const [history,      setHistory]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_campaign_history') || '[]') } catch { return [] }
  })

  useEffect(() => {
    setCampaignName(`${selectedTool.name} Traffic Campaign - ${today}`)
  }, [selectedTool, today])

  const doneCount    = steps.filter(s => s.status === 'done').length
  const totalEnabled = TC_CHANNEL_STEPS.filter(s => channels[s.id]).length

  const buildParams = useCallback(() => {
    const t   = selectedTool
    const url = `https://www.awe-os.com/tools/${t.slug}`
    return {
      toolName:       t.name,
      toolSlug:       t.slug,
      toolUrl:        url,
      subreddit:      TC_SUBREDDIT[t.category] || 'india',
      targetAudience: audience,
      question:       `What is the best free ${t.name} tool for Indians?`,
      niche:          t.category.toLowerCase().replace(/\s+/g, '_'),
      board:          TC_BOARD[t.category] || 'Online Tools India',
      keywords:       `${t.name} free online India`,
      keyword:        `free ${t.name} online India`,
      articleTitle:   `Best Free ${t.name} Online for Indian Users`,
      audience,
    }
  }, [selectedTool, audience])

  const runCampaign = async () => {
    const params = buildParams()
    setPhase('running')
    setSteps(TC_CHANNEL_STEPS.map(s => ({ ...s, status: channels[s.id] ? 'pending' : 'skipped', result: null, error: null })))
    setExpanded({})

    for (const ch of ['reddit', 'quora', 'pinterest', 'blog', 'social']) {
      if (!channels[ch]) continue
      setSteps(prev => prev.map(s => s.id === ch ? { ...s, status: 'running' } : s))
      try {
        let result
        if (ch === 'reddit') {
          const r = await api.post('/api/admin/traffic/reddit-post-claude', {
            toolName: params.toolName, toolSlug: params.toolSlug, toolUrl: params.toolUrl,
            subreddit: params.subreddit, targetAudience: params.targetAudience,
          })
          result = r.data
        } else if (ch === 'quora') {
          const r = await api.post('/api/admin/traffic/quora-answer-claude', {
            question: params.question, toolName: params.toolName, toolSlug: params.toolSlug,
            toolUrl: params.toolUrl, niche: params.niche,
          })
          result = r.data
        } else if (ch === 'pinterest') {
          const r = await api.post('/api/admin/traffic/pinterest-pin-claude', {
            toolName: params.toolName, toolSlug: params.toolSlug, toolUrl: params.toolUrl,
            board: params.board, keywords: params.keywords,
          })
          result = r.data
        } else if (ch === 'blog') {
          const r = await api.post('/api/admin/blog-writer-claude', {
            keyword: params.keyword, toolName: params.toolName, toolSlug: params.toolSlug,
          })
          result = r.data
        } else if (ch === 'social') {
          const r = await api.post('/api/admin/social-blast-claude', {
            articleTitle: params.articleTitle, articleUrl: params.toolUrl,
            toolName: params.toolName, toolSlug: params.toolSlug, audience: params.audience,
          })
          result = r.data
        }
        setSteps(prev => prev.map(s => s.id === ch ? { ...s, status: 'done', result } : s))
      } catch (err) {
        setSteps(prev => prev.map(s => s.id === ch ? { ...s, status: 'failed', error: err.response?.data?.error || err.message } : s))
      }
    }
    setPhase('done')
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(key)
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  const formatResult = (step) => {
    const r = step.result
    if (!r) return ''
    if (step.id === 'reddit') {
      return `Title: ${r.post?.title}\n\n${r.post?.body}`
    }
    if (step.id === 'quora') {
      return `Q: What is the best free ${selectedTool.name} tool for Indians?\n\n${r.answer?.content}\n\n${r.answer?.callToAction || ''}`
    }
    if (step.id === 'pinterest') {
      return `Titles:\n${r.titles?.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nDescription:\n${r.description}\n\nHashtags: ${r.hashtags?.join(' ')}`
    }
    if (step.id === 'blog') {
      let text = `# ${r.title}\nMeta: ${r.metaDescription}\nSlug: /blog/${r.slug}\n\n`
      r.sections?.forEach(sec => { text += `## ${sec.h2}\n${sec.content}\n\n` })
      r.faqSection?.forEach(faq => { text += `Q: ${faq.q}\nA: ${faq.a}\n\n` })
      return text
    }
    if (step.id === 'social') {
      return [
        `=== LinkedIn ===\n${r.linkedinPost?.text}`,
        `=== WhatsApp ===\n${r.whatsappMessage?.text}`,
        `=== Twitter Thread ===\n${r.twitterThread?.map((t, i) => `${i + 1}. ${t.tweet}`).join('\n')}`,
      ].join('\n\n')
    }
    return ''
  }

  const copyAll = () => {
    let text = `# ${campaignName}\nTool: ${selectedTool.name} | Audience: ${audience}\n\n`
    steps.forEach(step => {
      if (step.status !== 'done') return
      text += `${'='.repeat(50)}\n## ${step.icon} ${step.label}\n${'='.repeat(50)}\n`
      text += formatResult(step)
      text += '\n\n'
    })
    copyText(text, 'all')
  }

  const saveCampaign = () => {
    const entry = {
      id:        Date.now(),
      name:      campaignName,
      tool:      selectedTool.name,
      audience,
      timestamp: new Date().toISOString(),
      completed: steps.filter(s => s.status === 'done').length,
      total:     totalEnabled,
    }
    const updated = [entry, ...history].slice(0, 10)
    setHistory(updated)
    localStorage.setItem('awe_campaign_history', JSON.stringify(updated))
    setSaveDone(true)
    setTimeout(() => setSaveDone(false), 2500)
  }

  const reset = () => {
    setPhase('setup')
    setSteps(TC_CHANNEL_STEPS.map(s => ({ ...s, status: 'pending', result: null, error: null })))
    setExpanded({})
  }

  const renderResultContent = (step) => {
    const r = step.result
    if (!r) return null
    if (step.id === 'reddit') return (
      <div className="space-y-3">
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">TITLE</p>
          <p className="text-gray-200 text-sm font-medium">{r.post?.title}</p>
        </div>
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">BODY</p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.post?.body}</p>
        </div>
      </div>
    )
    if (step.id === 'quora') return (
      <div className="space-y-3">
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">ANSWER</p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.answer?.content}</p>
        </div>
        {r.answer?.callToAction && (
          <div>
            <p className="text-orange-400 text-xs font-semibold mb-1">CALL TO ACTION</p>
            <p className="text-gray-400 text-sm italic">{r.answer.callToAction}</p>
          </div>
        )}
      </div>
    )
    if (step.id === 'pinterest') return (
      <div className="space-y-3">
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">TITLES</p>
          {r.titles?.map((t, i) => <p key={i} className="text-gray-300 text-sm">• {t}</p>)}
        </div>
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">DESCRIPTION</p>
          <p className="text-gray-300 text-sm">{r.description}</p>
        </div>
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">HASHTAGS</p>
          <p className="text-gray-400 text-xs">{r.hashtags?.join(' ')}</p>
        </div>
      </div>
    )
    if (step.id === 'blog') return (
      <div className="space-y-3">
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">TITLE</p>
          <p className="text-gray-200 text-sm font-medium">{r.title}</p>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>Slug: /blog/{r.slug}</span>
          <span>{r.wordCount} words</span>
        </div>
        <div>
          <p className="text-orange-400 text-xs font-semibold mb-1">META DESCRIPTION</p>
          <p className="text-gray-400 text-sm italic">{r.metaDescription}</p>
        </div>
        {r.sections?.map((sec, i) => (
          <div key={i}>
            <p className="text-gray-200 text-sm font-semibold">## {sec.h2}</p>
            <p className="text-gray-400 text-xs mt-0.5 line-clamp-4">{sec.content}</p>
          </div>
        ))}
        {r.faqSection?.length > 0 && (
          <div>
            <p className="text-orange-400 text-xs font-semibold mb-1">FAQs ({r.faqSection.length})</p>
            {r.faqSection.map((faq, i) => (
              <div key={i} className="mb-1.5">
                <p className="text-gray-300 text-xs font-medium">Q: {faq.q}</p>
                <p className="text-gray-500 text-xs">A: {faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
    if (step.id === 'social') return (
      <div className="space-y-4">
        {r.linkedinPost && (
          <div>
            <p className="text-orange-400 text-xs font-semibold mb-1">LINKEDIN</p>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.linkedinPost.text}</p>
          </div>
        )}
        {r.whatsappMessage && (
          <div>
            <p className="text-orange-400 text-xs font-semibold mb-1">WHATSAPP</p>
            <p className="text-gray-300 text-sm">{r.whatsappMessage.text}</p>
          </div>
        )}
        {r.twitterThread?.length > 0 && (
          <div>
            <p className="text-orange-400 text-xs font-semibold mb-1">TWITTER THREAD</p>
            {r.twitterThread.map((t, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}.</span>
                <p className="text-gray-300 text-sm">{t.tweet}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
    return null
  }

  return (
    <div className="space-y-6">

      {/* ── Step 1: Campaign Setup ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-white font-semibold text-base mb-5">
          Step 1 — Campaign Setup
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tool selector */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Tool (49 AWE-OS tools)</label>
            <select
              value={selectedTool.slug}
              disabled={phase === 'running'}
              onChange={e => {
                const t = CAMPAIGN_TOOLS.find(x => x.slug === e.target.value)
                if (t) setSelectedTool(t)
              }}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            >
              {['PDF Tools', 'Calculators', 'Converters', 'Productivity', 'AI Tools'].map(cat => (
                <optgroup key={cat} label={`── ${cat}`}>
                  {CAMPAIGN_TOOLS.filter(t => t.category === cat).map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Target audience */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Target Audience</label>
            <select
              value={audience}
              disabled={phase === 'running'}
              onChange={e => setAudience(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            >
              {['Indian Students', 'Indian Professionals', 'Freelancers', 'General'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Campaign name */}
          <div className="md:col-span-2">
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              disabled={phase === 'running'}
              onChange={e => setCampaignName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Channel toggles */}
        <div className="mt-5">
          <p className="text-gray-400 text-xs font-medium mb-3">Channels (toggle ON/OFF)</p>
          <div className="flex flex-wrap gap-3">
            {TC_CHANNEL_STEPS.map(ch => (
              <button
                key={ch.id}
                disabled={phase === 'running'}
                onClick={() => setChannels(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  channels[ch.id]
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                    : 'bg-gray-700/50 border-gray-600 text-gray-500'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs font-bold ${
                  channels[ch.id] ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-500 text-gray-600'
                }`}>
                  {channels[ch.id] ? '✓' : ''}
                </span>
                {ch.icon} {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Run / Reset buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={runCampaign}
            disabled={phase === 'running' || totalEnabled === 0}
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-8 py-3 rounded-xl transition-colors"
          >
            {phase === 'running' ? '⏳ Running Campaign...' : '🚀 Run Campaign'}
          </button>
          {phase === 'done' && (
            <button
              onClick={reset}
              className="text-sm text-gray-400 hover:text-white px-4 py-3 transition-colors"
            >
              ↩ Run Another
            </button>
          )}
          {totalEnabled === 0 && (
            <p className="text-red-400 text-xs">Enable at least one channel</p>
          )}
        </div>
      </div>

      {/* ── Step 2: Execution Progress ── */}
      {(phase === 'running' || phase === 'done') && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-base">Step 2 — Execution Progress</h2>
            <span className="text-sm text-gray-400 tabular-nums">{doneCount} / {totalEnabled} complete</span>
          </div>

          {/* Overall progress bar */}
          <div className="h-2 bg-gray-700 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: totalEnabled > 0 ? `${(doneCount / totalEnabled) * 100}%` : '0%' }}
            />
          </div>

          {/* Per-channel step list */}
          <div className="space-y-2">
            {steps.map(step => {
              if (step.status === 'skipped') return null
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    step.status === 'done'    ? 'bg-green-900/20  border-green-800/40' :
                    step.status === 'running' ? 'bg-orange-900/20 border-orange-800/40' :
                    step.status === 'failed'  ? 'bg-red-900/20    border-red-800/40' :
                                               'bg-gray-700/30   border-gray-700/30'
                  }`}
                >
                  {/* Animated status icon */}
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {step.status === 'done'    && <span className="text-green-400 font-bold text-base">✓</span>}
                    {step.status === 'failed'  && <span className="text-red-400   font-bold text-base">✗</span>}
                    {step.status === 'pending' && <span className="text-gray-600  text-base">○</span>}
                    {step.status === 'running' && (
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <span className="text-base">{step.icon}</span>
                  <span className={`text-sm flex-1 font-medium ${
                    step.status === 'done'    ? 'text-green-300'  :
                    step.status === 'running' ? 'text-orange-300' :
                    step.status === 'failed'  ? 'text-red-300'   : 'text-gray-500'
                  }`}>
                    [{step.label}]
                  </span>
                  <span className="text-xs text-gray-500">
                    {step.status === 'running' ? '⏳ Generating...' :
                     step.status === 'done'    ? '✅ Done' :
                     step.status === 'failed'  ? `❌ ${step.error || 'Failed'}` : 'Waiting'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Step 3: Results Panel ── */}
      {phase === 'done' && (
        <div className="space-y-4">
          {/* Results header + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-white font-semibold text-base flex-1">Step 3 — Campaign Results</h2>
            <button
              onClick={copyAll}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {copyFeedback === 'all' ? '✓ Copied!' : '📋 Copy All'}
            </button>
            <button
              onClick={saveCampaign}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {saveDone ? '✓ Saved!' : '💾 Save Campaign'}
            </button>
          </div>

          {/* Result cards (expandable) */}
          {steps.filter(s => s.status === 'done').map(step => (
            <div key={step.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              {/* Card header */}
              <div
                className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => setExpanded(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
              >
                <span className="text-xl">{step.icon}</span>
                <span className="text-white font-medium text-sm flex-1">{step.label}</span>
                <button
                  onClick={e => { e.stopPropagation(); copyText(formatResult(step), step.id) }}
                  className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md transition-colors mr-2 shrink-0"
                >
                  {copyFeedback === step.id ? '✓ Copied' : 'Copy'}
                </button>
                <span className={`text-gray-500 text-xs transition-transform duration-200 ${expanded[step.id] ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
              {/* Expanded content */}
              {expanded[step.id] && (
                <div className="px-5 py-4 border-t border-gray-700">
                  {renderResultContent(step)}
                </div>
              )}
            </div>
          ))}

          {/* Failed channels */}
          {steps.filter(s => s.status === 'failed').map(step => (
            <div key={step.id} className="bg-red-900/20 border border-red-800/40 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-red-400 font-bold">✗</span>
              <span className="text-lg">{step.icon}</span>
              <span className="text-red-300 text-sm flex-1">{step.label} — Failed</span>
              <span className="text-red-400 text-xs">{step.error || 'Unknown error'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Campaign History ── */}
      {history.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white text-sm font-semibold">Campaign History</h3>
            <span className="text-gray-500 text-xs">Last {history.length}</span>
          </div>
          <div className="divide-y divide-gray-700/60">
            {history.map(entry => (
              <div key={entry.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {entry.audience} · {entry.completed}/{entry.total} channels complete
                  </p>
                </div>
                <p className="text-gray-600 text-xs shrink-0">
                  {new Date(entry.timestamp).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Backlink Bot: 20 directories ──────────────────────────────
const BL_DIRECTORIES = [
  { id: 'alternativeto',  name: 'AlternativeTo',                url: 'https://alternativeto.net',                          category: 'Global', da: 78 },
  { id: 'futurepedia',    name: 'Futurepedia',                  url: 'https://www.futurepedia.io',                         category: 'Global', da: 54 },
  { id: 'theresanai',     name: "There's An AI For That",       url: 'https://theresanaiforthat.com',                      category: 'Global', da: 62 },
  { id: 'toolpilot',      name: 'ToolPilot',                    url: 'https://www.toolpilot.ai',                           category: 'Global', da: 32 },
  { id: 'producthunt',    name: 'Product Hunt',                 url: 'https://www.producthunt.com',                        category: 'Global', da: 89 },
  { id: 'g2',             name: 'G2',                           url: 'https://www.g2.com',                                 category: 'Global', da: 91 },
  { id: 'capterra',       name: 'Capterra',                     url: 'https://www.capterra.com',                           category: 'Global', da: 90 },
  { id: 'saashub',        name: 'SaaSHub',                      url: 'https://www.saashub.com',                            category: 'Global', da: 64 },
  { id: 'slant',          name: 'Slant',                        url: 'https://www.slant.co',                               category: 'Global', da: 71 },
  { id: 'getapp',         name: 'GetApp',                       url: 'https://www.getapp.com',                             category: 'Global', da: 86 },
  { id: 'trustpilot',     name: 'Trustpilot',                   url: 'https://www.trustpilot.com',                         category: 'Global', da: 93 },
  { id: 'indiamart',      name: 'IndiaMART',                    url: 'https://www.indiamart.com',                          category: 'India',  da: 76 },
  { id: 'justdial',       name: 'Justdial',                     url: 'https://www.justdial.com',                           category: 'India',  da: 72 },
  { id: 'startupindia',   name: 'Startup India',                url: 'https://www.startupindia.gov.in',                    category: 'India',  da: 69 },
  { id: 'yourstory',      name: 'YourStory Tools',              url: 'https://yourstory.com',                              category: 'India',  da: 74 },
  { id: 'techinasia',     name: 'Tech In Asia',                 url: 'https://www.techinasia.com',                         category: 'India',  da: 77 },
  { id: 'appsumo',        name: 'AppSumo',                      url: 'https://appsumo.com',                                category: 'Global', da: 81 },
  { id: 'betalist',       name: 'BetaList',                     url: 'https://betalist.com',                               category: 'Global', da: 60 },
  { id: 'indiehackers',   name: 'Indie Hackers',                url: 'https://www.indiehackers.com',                       category: 'Global', da: 82 },
  { id: 'rib',            name: 'r/InternetIsBeautiful',        url: 'https://www.reddit.com/r/InternetIsBeautiful',       category: 'Global', da: 91 },
]

const BL_STATUS_CYCLE   = { not_submitted: 'submitted', submitted: 'listed', listed: 'not_submitted' }
const BL_STATUS_CFG = {
  not_submitted: { label: 'Not Submitted', cls: 'bg-gray-700 text-gray-400 border-gray-600'          },
  submitted:     { label: 'Submitted',     cls: 'bg-yellow-900/60 text-yellow-300 border-yellow-800/50' },
  listed:        { label: 'Listed ✅',     cls: 'bg-green-900/60 text-green-300 border-green-800/50'  },
}
const BL_OUTREACH_STATUSES = [
  { value: 'pending',     label: '⏳ Pending',      cls: 'bg-yellow-900/60 text-yellow-300' },
  { value: 'sent',        label: '📤 Sent',          cls: 'bg-blue-900/60 text-blue-300'    },
  { value: 'replied',     label: '✅ Replied',       cls: 'bg-green-900/60 text-green-300'  },
  { value: 'no_response', label: '🔕 No Response',   cls: 'bg-gray-700 text-gray-500'       },
]

function BacklinkBotTab() {
  // ── Section 1 state ────────────────────────────────────────
  const [statuses, setStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_dir_statuses') || '{}') } catch { return {} }
  })
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_dir_notes') || '{}') } catch { return {} }
  })

  // ── Section 2 state ────────────────────────────────────────
  const [genTool,    setGenTool]    = useState(CAMPAIGN_TOOLS[0])
  const [genDirId,   setGenDirId]   = useState(BL_DIRECTORIES[0].id)
  const [genResult,  setGenResult]  = useState(null)
  const [genEdited,  setGenEdited]  = useState({})
  const [genLoading, setGenLoading] = useState(false)
  const sec2Ref = useRef(null)

  // ── Section 3 state ────────────────────────────────────────
  const [outUrl,        setOutUrl]        = useState('')
  const [outTool,       setOutTool]       = useState(CAMPAIGN_TOOLS[0])
  const [outResult,     setOutResult]     = useState(null)
  const [outLoading,    setOutLoading]    = useState(false)
  const [outreachList,  setOutreachList]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('awe_outreach_list') || '[]') } catch { return [] }
  })

  // ── Shared ──────────────────────────────────────────────────
  const [copyKey,  setCopyKey]  = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopyKey(key)
    setTimeout(() => setCopyKey(null), 2000)
  }

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
    : '—'

  // ── Section 1 handlers ─────────────────────────────────────
  const cycleStatus = (dirId) => {
    const cur     = statuses[dirId] || 'not_submitted'
    const updated = { ...statuses, [dirId]: BL_STATUS_CYCLE[cur] }
    setStatuses(updated)
    localStorage.setItem('awe_dir_statuses', JSON.stringify(updated))
  }

  const saveNote = (dirId, val) => {
    const updated = { ...notes, [dirId]: val }
    setNotes(updated)
    localStorage.setItem('awe_dir_notes', JSON.stringify(updated))
  }

  const submittedCount = BL_DIRECTORIES.filter(d => {
    const s = statuses[d.id] || 'not_submitted'
    return s === 'submitted' || s === 'listed'
  }).length

  const openGenForDir = (dirId) => {
    setGenDirId(dirId)
    setGenResult(null)
    setGenEdited({})
    setTimeout(() => sec2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // ── Section 2 handlers ─────────────────────────────────────
  const generateContent = async () => {
    const dir = BL_DIRECTORIES.find(d => d.id === genDirId)
    if (!dir) return
    setGenLoading(true)
    setGenResult(null)
    setGenEdited({})
    try {
      const r = await api.post('/api/admin/backlink-content-claude', {
        toolName:      genTool.name,
        toolSlug:      genTool.slug,
        directoryName: dir.name,
      })
      setGenResult(r.data)
    } catch (err) {
      showToast(err.response?.data?.error || 'Generation failed', 'error')
    } finally {
      setGenLoading(false)
    }
  }

  const getField = (key) => {
    if (genEdited[key] !== undefined) return genEdited[key]
    if (!genResult) return ''
    if (key === 'categories') return (genResult.categories || []).join(', ')
    if (key === 'tags')       return (genResult.tags       || []).join(', ')
    return genResult[key] || ''
  }

  const setField = (key, val) => setGenEdited(prev => ({ ...prev, [key]: val }))

  const markDirSubmitted = () => {
    const updated = { ...statuses, [genDirId]: 'submitted' }
    setStatuses(updated)
    localStorage.setItem('awe_dir_statuses', JSON.stringify(updated))
    showToast(`${BL_DIRECTORIES.find(d => d.id === genDirId)?.name} marked as Submitted`)
  }

  const genCopyAll = () => copyText(
    `Tagline: ${getField('tagline')}\n\nShort: ${getField('shortDescription')}\n\nLong: ${getField('longDescription')}\n\nCategories: ${getField('categories')}\n\nTags: ${getField('tags')}`,
    'gen_all'
  )

  // ── Section 3 handlers ─────────────────────────────────────
  const generateOutreach = async () => {
    if (!outUrl.trim()) { showToast('Enter a blogger URL first', 'error'); return }
    setOutLoading(true)
    setOutResult(null)
    try {
      const r = await api.post('/api/admin/outreach-email-claude', {
        bloggerUrl: outUrl.trim(),
        toolName:   outTool.name,
        toolSlug:   outTool.slug,
      })
      setOutResult(r.data)
    } catch (err) {
      showToast(err.response?.data?.error || 'Generation failed', 'error')
    } finally {
      setOutLoading(false)
    }
  }

  const saveOutreach = () => {
    if (!outResult) return
    const followUp = new Date()
    followUp.setDate(followUp.getDate() + 7)
    const entry = {
      id:           Date.now(),
      targetSite:   outUrl.trim(),
      tool:         outTool.name,
      subject:      outResult.subject,
      status:       'pending',
      date:         new Date().toISOString(),
      followUpDate: followUp.toISOString(),
    }
    const updated = [entry, ...outreachList]
    setOutreachList(updated)
    localStorage.setItem('awe_outreach_list', JSON.stringify(updated))
    showToast('Saved to outreach list')
  }

  const updateOutreach = (id, status) => {
    const updated = outreachList.map(o => o.id === id ? { ...o, status } : o)
    setOutreachList(updated)
    localStorage.setItem('awe_outreach_list', JSON.stringify(updated))
  }

  const deleteOutreach = (id) => {
    const updated = outreachList.filter(o => o.id !== id)
    setOutreachList(updated)
    localStorage.setItem('awe_outreach_list', JSON.stringify(updated))
  }

  const GEN_FIELDS = [
    { key: 'tagline',          label: 'Tagline',           hint: '60 chars',        rows: 1 },
    { key: 'shortDescription', label: 'Short Description', hint: '150 chars',       rows: 2 },
    { key: 'longDescription',  label: 'Long Description',  hint: '500 chars',       rows: 5 },
    { key: 'categories',       label: 'Categories',        hint: 'comma-separated', rows: 1 },
    { key: 'tags',             label: 'Tags',              hint: 'comma-separated', rows: 1 },
  ]

  return (
    <div className="space-y-6">
      {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} onDone={() => setToastMsg(null)} />}

      {/* ── Section 1: Directory Submission Tracker ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-sm">Directory Submission Tracker</h2>
            <span className="text-gray-400 text-xs tabular-nums">{submittedCount} / {BL_DIRECTORIES.length} submitted</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(submittedCount / BL_DIRECTORIES.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {BL_DIRECTORIES.map(dir => {
            const status = statuses[dir.id] || 'not_submitted'
            const cfg    = BL_STATUS_CFG[status]
            return (
              <div
                key={dir.id}
                className="border border-gray-700/60 rounded-xl p-4 flex flex-col gap-3"
                style={{ background: 'rgba(17,24,39,0.5)' }}
              >
                {/* Row 1: name + badges + status toggle */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={dir.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-medium text-sm hover:text-orange-400 transition-colors leading-tight"
                    >
                      {dir.name}
                      <span className="text-gray-600 ml-1 text-xs">↗</span>
                    </a>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        dir.category === 'India'
                          ? 'bg-orange-900/50 text-orange-300'
                          : 'bg-blue-900/50 text-blue-300'
                      }`}>
                        {dir.category === 'India' ? '🇮🇳' : '🌐'} {dir.category}
                      </span>
                      <span className="text-xs bg-gray-700/80 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                        DA {dir.da}
                      </span>
                    </div>
                  </div>
                  {/* Status button (cycles on click) */}
                  <button
                    onClick={() => cycleStatus(dir.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-opacity hover:opacity-75 shrink-0 ${cfg.cls}`}
                  >
                    {cfg.label}
                  </button>
                </div>

                {/* Row 2: generate content action */}
                <button
                  onClick={() => openGenForDir(dir.id)}
                  className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-500/60 px-3 py-1.5 rounded-lg transition-colors text-left w-fit"
                >
                  ✨ Generate Submission Content
                </button>

                {/* Row 3: notes */}
                <input
                  type="text"
                  value={notes[dir.id] || ''}
                  onChange={e => saveNote(dir.id, e.target.value)}
                  placeholder="Add note (URL, date, contact...)"
                  className="w-full bg-gray-700/40 border border-gray-600/40 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500/50 placeholder-gray-600"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 2: Submission Content Generator ── */}
      <div ref={sec2Ref} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Submission Content Generator</h2>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          {/* Tool selector */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-gray-400 text-xs mb-1.5">AWE-OS Tool</label>
            <select
              value={genTool.slug}
              onChange={e => { const t = CAMPAIGN_TOOLS.find(x => x.slug === e.target.value); if (t) setGenTool(t) }}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {['PDF Tools', 'Calculators', 'Converters', 'Productivity', 'AI Tools'].map(cat => (
                <optgroup key={cat} label={`── ${cat}`}>
                  {CAMPAIGN_TOOLS.filter(t => t.category === cat).map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {/* Directory selector */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-gray-400 text-xs mb-1.5">Directory</label>
            <select
              value={genDirId}
              onChange={e => setGenDirId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {BL_DIRECTORIES.map(d => (
                <option key={d.id} value={d.id}>{d.name} · DA {d.da}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateContent}
            disabled={genLoading}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {genLoading
              ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              : '✨ Generate'}
          </button>
        </div>

        {/* Output fields */}
        {genResult && (
          <div className="space-y-3 border-t border-gray-700 pt-4">
            {GEN_FIELDS.map(({ key, label, hint, rows }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-400 text-xs font-medium">
                    {label} <span className="text-gray-600">({hint})</span>
                  </label>
                  <button
                    onClick={() => copyText(getField(key), `gen_${key}`)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {copyKey === `gen_${key}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                {rows === 1 ? (
                  <input
                    type="text"
                    value={getField(key)}
                    onChange={e => setField(key, e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                ) : (
                  <textarea
                    rows={rows}
                    value={getField(key)}
                    onChange={e => setField(key, e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={markDirSubmitted}
                className="bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                ✓ Mark as Submitted
              </button>
              <button
                onClick={genCopyAll}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {copyKey === 'gen_all' ? '✓ Copied!' : '📋 Copy All Fields'}
              </button>
            </div>
          </div>
        )}

        {!genResult && !genLoading && (
          <p className="text-gray-600 text-sm text-center py-4">
            Select a tool + directory, then click Generate
          </p>
        )}
      </div>

      {/* ── Section 3: Outreach Email Generator ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Outreach Email Generator</h2>
        <p className="text-gray-500 text-xs mb-4">
          Target bloggers and websites that cover free tools, PDF tools, calculators, or productivity.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Blogger / Website URL</label>
            <input
              type="text"
              value={outUrl}
              onChange={e => setOutUrl(e.target.value)}
              placeholder="https://example.com/best-free-pdf-tools"
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Tool to Promote</label>
            <select
              value={outTool.slug}
              onChange={e => { const t = CAMPAIGN_TOOLS.find(x => x.slug === e.target.value); if (t) setOutTool(t) }}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {CAMPAIGN_TOOLS.map(t => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={generateOutreach}
          disabled={outLoading || !outUrl.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors flex items-center gap-2 mb-4"
        >
          {outLoading
            ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            : '✉️ Generate Email'}
        </button>

        {/* Generated email output */}
        {outResult && (
          <div className="space-y-3 border-t border-gray-700 pt-4">
            {/* Subject */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-400 text-xs font-medium">Subject Line</label>
                <button onClick={() => copyText(outResult.subject, 'out_sub')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  {copyKey === 'out_sub' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <input
                type="text"
                value={outResult.subject}
                onChange={e => setOutResult(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-400 text-xs font-medium">Email Body</label>
                <button onClick={() => copyText(outResult.body, 'out_body')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  {copyKey === 'out_body' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <textarea
                rows={8}
                value={outResult.body}
                onChange={e => setOutResult(prev => ({ ...prev, body: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveOutreach}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                💾 Save to Outreach List
              </button>
              <button
                onClick={() => copyText(`Subject: ${outResult.subject}\n\n${outResult.body}`, 'out_all')}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {copyKey === 'out_all' ? '✓ Copied!' : '📋 Copy Full Email'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Outreach List Table ── */}
      {outreachList.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700">
            <h3 className="text-white text-sm font-semibold">
              Outreach List <span className="text-gray-500 font-normal">({outreachList.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-700">
                <tr>
                  {['Target Site', 'Tool', 'Subject', 'Status', 'Sent', 'Follow-up', 'Actions'].map(h => (
                    <th key={h} className="text-left text-gray-400 px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outreachList.map(row => {
                  const sc = BL_OUTREACH_STATUSES.find(s => s.value === row.status) || BL_OUTREACH_STATUSES[0]
                  return (
                    <tr key={row.id} className="border-b border-gray-700/50 last:border-0">
                      <td className="px-4 py-3 max-w-[140px]">
                        <p className="text-gray-300 truncate text-xs" title={row.targetSite}>
                          {row.targetSite.replace(/^https?:\/\//, '').split('/')[0]}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{row.tool}</td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-gray-400 truncate" title={row.subject}>{row.subject}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.status}
                          onChange={e => updateOutreach(row.id, e.target.value)}
                          className={`text-xs px-2 py-0.5 rounded font-medium focus:outline-none cursor-pointer ${sc.cls}`}
                          style={{ background: 'transparent', border: 'none' }}
                        >
                          {BL_OUTREACH_STATUSES.map(s => (
                            <option key={s.value} value={s.value} style={{ background: '#1f2937', color: '#d1d5db' }}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(row.followUpDate)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteOutreach(row.id)}
                          className="text-red-400 hover:text-red-300 transition-colors hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    intelligence: <IntelligenceTab />,
    traffic:      <TrafficCampaignTab />,
    scheduler:    <SmartSchedulerTab />,
    backlinks:    <BacklinkBotTab />,
  }

  return (
    <div>
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
