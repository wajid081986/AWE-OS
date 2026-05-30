import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api.service'

// ── Shared helpers ────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(
      typeof text === 'string' ? text : JSON.stringify(text, null, 2)
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition">
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function Spinner({ text = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-6 text-gray-400">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

function ErrBox({ msg, onRetry }) {
  return (
    <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm flex items-center justify-between">
      <span>{msg}</span>
      {onRetry && (
        <button onClick={onRetry}
          className="ml-3 px-2 py-0.5 bg-red-800 hover:bg-red-700 rounded text-xs shrink-0">
          Retry
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    submitted:  'bg-green-900 text-green-300',
    pending:    'bg-blue-900 text-blue-300',
    failed:     'bg-red-900 text-red-300',
    skipped:    'bg-gray-700 text-gray-400',
    scheduled:  'bg-blue-900 text-blue-300',
    published:  'bg-green-900 text-green-300',
    cancelled:  'bg-gray-700 text-gray-400',
    queued:     'bg-yellow-900 text-yellow-300',
    processing: 'bg-indigo-900 text-indigo-300',
    high:       'bg-green-900 text-green-300',
    medium:     'bg-yellow-900 text-yellow-300',
    low:        'bg-gray-700 text-gray-300',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  )
}

// ── Tab 1: GSC Indexing ───────────────────────────────────────────────────────

function GSCTab() {
  const [mode, setMode] = useState('single')
  const [singleUrl, setSingleUrl] = useState('')
  const [batchUrls, setBatchUrls] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    try {
      const { data } = await api.get('/api/admin/automation/index-history')
      if (data.success) setHistory(data.history || [])
    } catch {}
    setHistLoading(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const submitSingle = async () => {
    if (!singleUrl.trim()) return setErr('Enter a URL')
    setErr(''); setLoading(true); setResult(null)
    try {
      const { data } = await api.post('/api/admin/automation/index-url', { url: singleUrl.trim() })
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
      await loadHistory()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const submitBatch = async (urls) => {
    const list = urls || batchUrls.split('\n').map(u => u.trim()).filter(Boolean)
    if (!list.length) return setErr('Enter at least one URL')
    setErr(''); setLoading(true); setResult(null)
    try {
      const { data } = await api.post('/api/admin/automation/index-batch', { urls: list })
      if (!data.success) throw new Error(data.error)
      setResult(data.result)
      await loadHistory()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const quickSubmit = async (type) => {
    const sitemapBase = 'https://www.awe-os.com'
    const presets = {
      city: [
        `${sitemapBase}/gst-calculator/mumbai`,
        `${sitemapBase}/gst-calculator/delhi`,
        `${sitemapBase}/gst-calculator/bangalore`,
        `${sitemapBase}/sip-calculator/mumbai`,
        `${sitemapBase}/sip-calculator/delhi`,
      ],
      blog: [
        `${sitemapBase}/blog/best-free-ai-tools-for-students-2025`,
        `${sitemapBase}/blog/how-to-calculate-gst-in-india`,
        `${sitemapBase}/blog/best-pdf-tools-online-free`,
        `${sitemapBase}/blog/sip-calculator-guide-india`,
        `${sitemapBase}/blog/income-tax-calculator-india-2025`,
      ],
      comparison: [`${sitemapBase}/compare/merge-pdf-vs-compress-pdf`],
      faq:        [`${sitemapBase}/faq/pdf-tools`],
    }
    await submitBatch(presets[type] || [])
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {['single', 'batch', 'quick'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${mode === m ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
            {m === 'single' ? 'Single URL' : m === 'batch' ? 'Batch URLs' : 'Quick Submit'}
          </button>
        ))}
      </div>

      {mode === 'single' && (
        <div className="space-y-3">
          <input value={singleUrl} onChange={e => setSingleUrl(e.target.value)}
            placeholder="https://www.awe-os.com/tools/gst-calculator"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
          <button onClick={submitSingle} disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            Submit to Google
          </button>
        </div>
      )}

      {mode === 'batch' && (
        <div className="space-y-3">
          <textarea rows={6} value={batchUrls} onChange={e => setBatchUrls(e.target.value)}
            placeholder="One URL per line:&#10;https://www.awe-os.com/tools/gst-calculator&#10;https://www.awe-os.com/blog/my-post"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-y" />
          <p className="text-xs text-gray-500">{batchUrls.split('\n').filter(u => u.trim()).length} URLs entered</p>
          <button onClick={() => submitBatch()} disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            Submit All
          </button>
        </div>
      )}

      {mode === 'quick' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'city',       label: 'City Pages',       desc: '5 city calculator pages' },
            { key: 'blog',       label: 'Recent Blog Posts', desc: '5 latest blog posts' },
            { key: 'comparison', label: 'Comparison Pages',  desc: 'All compare pages' },
            { key: 'faq',        label: 'FAQ Pages',         desc: 'All FAQ pages' },
          ].map(({ key, label, desc }) => (
            <button key={key} onClick={() => quickSubmit(key)} disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 text-left transition disabled:opacity-50">
              <p className="text-sm font-semibold text-white mb-1">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      )}

      {loading && <Spinner text="Saving URL…" />}
      {err && <ErrBox msg={err} />}

      {result && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          {result.submitted !== undefined ? (
            <>
              <p className="text-sm font-medium text-green-400">{result.results.length} URLs saved to log</p>
              <div className="space-y-2">
                {result.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400 truncate max-w-xs">{r.url}</span>
                    <a href={r.manualUrl} target="_blank" rel="noreferrer"
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition shrink-0">
                      Open in Search Console →
                    </a>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">Click 'Request Indexing' in Search Console for each URL</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-green-400">URL saved to log</p>
              <a href={result.manualUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
                Open in Search Console →
              </a>
              <p className="text-xs text-gray-500">Click 'Request Indexing' in Search Console</p>
            </>
          )}
        </div>
      )}

      {/* History table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">Indexing History</h4>
          <button onClick={loadHistory} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
        </div>
        {histLoading ? <Spinner text="Loading history…" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">URL</th>
                  <th className="text-left pb-2 pr-4">Status</th>
                  <th className="text-left pb-2 pr-4">Type</th>
                  <th className="text-left pb-2">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-gray-500 text-center">No submissions yet</td></tr>
                )}
                {history.map(h => (
                  <tr key={h.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 pr-4 text-gray-300 max-w-xs truncate">{h.url}</td>
                    <td className="py-2 pr-4"><StatusBadge status={h.status} /></td>
                    <td className="py-2 pr-4 text-gray-400">{h.type}</td>
                    <td className="py-2 text-gray-500">{h.submitted_at ? new Date(h.submitted_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Sitemap ────────────────────────────────────────────────────────────

function SitemapTab() {
  const [stats, setStats] = useState(null)
  const [urls, setUrls] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [err, setErr] = useState('')

  const loadStats = async () => {
    setLoading(true); setErr('')
    try {
      const { data } = await api.get('/api/admin/automation/sitemap-stats')
      if (!data.success) throw new Error(data.error)
      setStats(data.stats)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const loadPreview = async () => {
    setPreviewLoading(true); setErr('')
    try {
      const { data } = await api.get('/api/admin/automation/sitemap-preview')
      if (!data.success) throw new Error(data.error)
      setUrls(data.urls || [])
    } catch (e) { setErr(e.message) }
    finally { setPreviewLoading(false) }
  }

  useEffect(() => { loadStats() }, [])

  const filtered = filterType === 'all' ? urls : urls.filter(u => {
    const path = u.url.replace(/^https?:\/\/[^/]+/, '')
    if (filterType === 'tool')       return path.startsWith('/tools/')
    if (filterType === 'blog')       return path.startsWith('/blog/')
    if (filterType === 'compare')    return path.startsWith('/compare/')
    if (filterType === 'faq')        return path.startsWith('/faq/')
    if (filterType === 'city')       return path.includes('-calculator/')
    if (filterType === 'static')     return !path.startsWith('/tools/') && !path.startsWith('/blog/')
    return true
  })

  const allUrlsText = urls.map(u => u.url).join('\n')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={loadStats} disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
          {loading ? 'Refreshing…' : 'Refresh Stats'}
        </button>
        <a href="https://www.awe-os.com/sitemap.xml" target="_blank" rel="noreferrer"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
          View Live Sitemap ↗
        </a>
      </div>

      {err && <ErrBox msg={err} />}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total URLs</p>
          </div>
          {Object.entries(stats.byType || {}).map(([type, count]) => (
            <div key={type} className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-indigo-400">{count}</p>
              <p className="text-xs text-gray-500 capitalize mt-1">{type}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={loadPreview} disabled={previewLoading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm rounded-lg transition">
          {previewLoading ? 'Loading…' : 'Preview All URLs'}
        </button>
        {urls.length > 0 && <CopyBtn text={allUrlsText} label="Copy all URLs" />}
      </div>

      {previewLoading && <Spinner text="Fetching URL inventory…" />}

      {urls.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {['all', 'tool', 'blog', 'compare', 'faq', 'city', 'static'].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-xs transition ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                {t} {t === 'all' ? `(${urls.length})` : ''}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500">Showing {filtered.length} of {urls.length} URLs</p>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left py-2 pr-4">URL</th>
                  <th className="text-left py-2 pr-4">Priority</th>
                  <th className="text-left py-2 pr-4">Change Freq</th>
                  <th className="text-left py-2">Last Mod</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((u, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-1.5 pr-4 text-gray-300 max-w-xs truncate">
                      <a href={u.url} target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition">{u.url}</a>
                    </td>
                    <td className="py-1.5 pr-4 text-gray-400">{u.priority}</td>
                    <td className="py-1.5 pr-4 text-gray-400">{u.changefreq}</td>
                    <td className="py-1.5 text-gray-500">{u.lastmod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="text-xs text-gray-500 p-2">Showing first 200 of {filtered.length}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Social Scheduler ───────────────────────────────────────────────────

const TOOL_SLUGS = [
  'gst-calculator','sip-calculator','fd-calculator','tax-calculator',
  'emi-calculator','bmi-calculator','age-calculator','percentage-calculator',
  'pdf-to-word','merge-pdf','compress-pdf','image-compressor',
  'word-counter','qr-code-generator','password-generator',
  'resume-builder','ai-content-writer',
]

function SocialTab() {
  const [platform, setPlatform] = useState('reddit')
  const [toolSlug, setToolSlug] = useState('gst-calculator')
  const [subreddits, setSubreddits] = useState('r/india, r/IndiaInvestments')
  const [count, setCount] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState([])
  const [genErr, setGenErr] = useState('')
  const [expandedPost, setExpandedPost] = useState(null)
  const [schedulingId, setSchedulingId] = useState(null)

  // Schedule view
  const [schedule, setSchedule] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [schedTab, setSchedTab] = useState('generate')

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true)
    try {
      const { data } = await api.get('/api/admin/automation/schedule', { params: { limit: 50 } })
      if (data.success) setSchedule(data.posts || [])
    } catch {}
    setScheduleLoading(false)
  }, [])

  useEffect(() => {
    if (schedTab === 'schedule') loadSchedule()
  }, [schedTab, loadSchedule])

  const generatePosts = async () => {
    setGenErr(''); setGenerating(true); setPosts([])
    try {
      const { data } = await api.post('/api/admin/automation/generate-posts', {
        platform,
        toolSlug,
        toolName: toolSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        count: Number(count),
        subreddits: platform === 'reddit'
          ? subreddits.split(',').map(s => s.trim()).filter(Boolean)
          : []
      })
      if (!data.success) throw new Error(data.error)
      setPosts(data.posts || [])
    } catch (e) { setGenErr(e.message) }
    finally { setGenerating(false) }
  }

  const schedulePost = async (post) => {
    setSchedulingId(post.title)
    try {
      await api.post('/api/admin/automation/schedule-posts', { posts: [post] })
      setPosts(prev => prev.filter(p => p.title !== post.title))
    } catch {}
    setSchedulingId(null)
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/admin/automation/post-status/${id}`, { status })
      setSchedule(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-700 pb-3">
        {[
          { id: 'generate', label: 'Generate Posts' },
          { id: 'schedule', label: 'Schedule Calendar' },
          { id: 'today',    label: "Today's Posts"   },
        ].map(t => (
          <button key={t.id} onClick={() => setSchedTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${schedTab === t.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {schedTab === 'generate' && (
        <div className="space-y-4">
          {/* Platform tabs */}
          <div className="flex gap-2">
            {['reddit', 'quora', 'pinterest'].map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${platform === p ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                {p}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tool</label>
              <select value={toolSlug} onChange={e => setToolSlug(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
                {TOOL_SLUGS.map(s => (
                  <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Count</label>
              <select value={count} onChange={e => setCount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200">
                <option value={3}>3 posts</option>
                <option value={5}>5 posts</option>
                <option value={10}>10 posts</option>
              </select>
            </div>
            {platform === 'reddit' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Subreddits (comma separated)</label>
                <input value={subreddits} onChange={e => setSubreddits(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-gray-200 focus:border-indigo-500 outline-none" />
              </div>
            )}
          </div>

          <button onClick={generatePosts} disabled={generating}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            Generate Posts
          </button>

          {generating && <Spinner text={`Generating ${count} ${platform} posts with GPT-4o…`} />}
          {genErr && <ErrBox msg={genErr} />}

          {posts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">{posts.length} posts generated</p>
              {posts.map((post, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white mb-1 truncate">{post.title}</p>
                      <div className="flex gap-2 flex-wrap">
                        <StatusBadge status={post.estimatedEngagement} />
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                          {post.targetCommunity}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                          {post.bestDay} {post.bestTimeToPost}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <CopyBtn text={`${post.title}\n\n${post.content}`} />
                      <button
                        onClick={() => setExpandedPost(expandedPost === i ? null : i)}
                        className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition">
                        {expandedPost === i ? 'Collapse' : 'Expand'}
                      </button>
                      <button
                        onClick={() => schedulePost(post)}
                        disabled={schedulingId === post.title}
                        className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition">
                        {schedulingId === post.title ? 'Scheduling…' : 'Schedule'}
                      </button>
                    </div>
                  </div>
                  {expandedPost === i && (
                    <p className="text-sm text-gray-400 mt-3 whitespace-pre-wrap border-t border-gray-700 pt-3">
                      {post.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {schedTab === 'schedule' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Scheduled Posts ({schedule.length})</h4>
            <button onClick={loadSchedule} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
          </div>
          {scheduleLoading ? <Spinner text="Loading schedule…" /> : (
            <div className="space-y-2">
              {schedule.length === 0 && <p className="text-sm text-gray-500 py-4">No scheduled posts yet.</p>}
              {schedule.map(post => (
                <div key={post.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <StatusBadge status={post.status} />
                        <span className="text-xs text-gray-500 capitalize">{post.platform}</span>
                        <span className="text-xs text-gray-500">{post.target_community}</span>
                        <span className="text-xs text-gray-500">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <CopyBtn text={`${post.title}\n\n${post.content}`} />
                      {post.status === 'scheduled' && (
                        <>
                          <button onClick={() => updateStatus(post.id, 'published')}
                            className="px-2 py-1 text-xs bg-green-800 hover:bg-green-700 text-green-200 rounded transition">
                            Published
                          </button>
                          <button onClick={() => updateStatus(post.id, 'cancelled')}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {schedTab === 'today' && (
        <TodaysPosts schedule={schedule} onLoadSchedule={loadSchedule} />
      )}
    </div>
  )
}

function TodaysPosts({ schedule, onLoadSchedule }) {
  const today = new Date().toDateString()
  const todayPosts = schedule.filter(p => {
    if (!p.scheduled_at) return false
    return new Date(p.scheduled_at).toDateString() === today
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Today's Posts ({todayPosts.length})</h4>
        <button onClick={onLoadSchedule} className="text-xs text-indigo-400 hover:text-indigo-300">Refresh</button>
      </div>
      {todayPosts.length === 0 && (
        <p className="text-sm text-gray-500 py-4">No posts scheduled for today.</p>
      )}
      {todayPosts.map(post => (
        <div key={post.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{post.title}</p>
              <div className="flex gap-2 mt-1">
                <StatusBadge status={post.status} />
                <span className="text-xs text-gray-500 capitalize">{post.platform}</span>
                <span className="text-xs text-gray-500">{post.target_community}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <CopyBtn text={`${post.title}\n\n${post.content}`} label="Copy content" />
              {post.platform === 'reddit' && (
                <a href="https://www.reddit.com/submit" target="_blank" rel="noreferrer"
                  className="px-3 py-1 text-xs bg-orange-800 hover:bg-orange-700 text-orange-200 rounded transition">
                  Open Reddit
                </a>
              )}
              {post.platform === 'quora' && (
                <a href="https://www.quora.com" target="_blank" rel="noreferrer"
                  className="px-3 py-1 text-xs bg-red-800 hover:bg-red-700 text-red-200 rounded transition">
                  Open Quora
                </a>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-400 whitespace-pre-wrap border-t border-gray-700 pt-3">
            {post.content}
          </p>
          {post.hashtags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {post.hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-indigo-400">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tab 4: Publish Queue ──────────────────────────────────────────────────────

function QueueTab() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState(null)
  const [err, setErr] = useState('')

  const loadQueue = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const { data } = await api.get('/api/admin/automation/queue', {
        params: statusFilter ? { status: statusFilter } : {}
      })
      if (!data.success) throw new Error(data.error)
      setItems(data.items || [])
      setStats(data.stats)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { loadQueue() }, [loadQueue])

  const clearPublished = async () => {
    try {
      await api.delete('/api/admin/automation/queue/clear')
      await loadQueue()
    } catch {}
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Queued',     val: stats.queued,     color: 'text-yellow-400' },
            { label: 'Processing', val: stats.processing, color: 'text-indigo-400' },
            { label: 'Published',  val: stats.published,  color: 'text-green-400'  },
            { label: 'Failed',     val: stats.failed,     color: 'text-red-400'    },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{val ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Rate limit info */}
      {stats && (
        <div className="bg-gray-900 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">
              <span className="font-bold text-white">{stats.publishedThisHour ?? 0}</span>
              <span className="text-gray-500"> / {stats.maxPerHour ?? 10} published this hour</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{stats.remainingThisHour ?? 10} slots remaining</p>
          </div>
          <div className="w-32 bg-gray-700 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full"
              style={{ width: `${Math.min(100, ((stats.publishedThisHour ?? 0) / (stats.maxPerHour ?? 10)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={loadQueue} disabled={loading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm rounded-lg transition">
          Refresh
        </button>
        <button onClick={clearPublished}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
          Clear Published
        </button>
        <p className="text-xs text-gray-500 self-center">
          Note: To process queue, publish items via admin tools (Blog Writer, SEO, etc.)
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[null, 'queued', 'processing', 'published', 'failed'].map(s => (
          <button key={s ?? 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs transition ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
            {s ?? 'All'}
          </button>
        ))}
      </div>

      {err && <ErrBox msg={err} onRetry={loadQueue} />}
      {loading ? <Spinner text="Loading queue…" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left pb-2 pr-4">Title</th>
                <th className="text-left pb-2 pr-4">Type</th>
                <th className="text-left pb-2 pr-4">Priority</th>
                <th className="text-left pb-2 pr-4">Status</th>
                <th className="text-left pb-2 pr-4">Created</th>
                <th className="text-left pb-2">URL</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-gray-500 text-center">Queue is empty</td></tr>
              )}
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 pr-4 text-gray-300 max-w-xs truncate">{item.title}</td>
                  <td className="py-2 pr-4 text-gray-400">{item.type}</td>
                  <td className="py-2 pr-4 text-gray-400">{item.priority}</td>
                  <td className="py-2 pr-4"><StatusBadge status={item.status} /></td>
                  <td className="py-2 pr-4 text-gray-500">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 text-gray-400">
                    {item.live_url
                      ? <a href={item.live_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate block max-w-xs">{item.live_url}</a>
                      : '—'
                    }
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

// ── Main AutomationHub ────────────────────────────────────────────────────────

const TABS = [
  { id: 'gsc',     label: 'GSC Indexing',    icon: '🔍' },
  { id: 'sitemap', label: 'Sitemap',          icon: '🗺️' },
  { id: 'social',  label: 'Social Scheduler', icon: '📅' },
  { id: 'queue',   label: 'Publish Queue',    icon: '📬' },
]

export default function AutomationHub() {
  const [active, setActive] = useState('gsc')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Automation Hub</h2>
        <p className="text-gray-400 text-sm mt-1">
          GSC indexing · Sitemap · Social scheduling · Publish queue
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              active === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        {active === 'gsc'     && <GSCTab />}
        {active === 'sitemap' && <SitemapTab />}
        {active === 'social'  && <SocialTab />}
        {active === 'queue'   && <QueueTab />}
      </div>
    </div>
  )
}
