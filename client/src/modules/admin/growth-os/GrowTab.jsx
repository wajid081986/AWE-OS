import { useState, useEffect } from 'react'
import api from '../../../services/api.service'
import AutoCampaignPage from '../auto-campaign/AutoCampaignPage'

const SUB_SECTIONS = [
  { id: 'queue',   label: '🗂️ Publishing Queue'   },
  { id: 'publish', label: '📤 Platform Publisher'  },
  { id: 'analytics', label: '📊 Analytics'          },
  { id: 'recs',    label: '🧭 AI Recommendations'  },
]

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

const STATUS_BADGE = {
  published: 'bg-green-900/60 text-green-300',
  draft:     'bg-yellow-900/60 text-yellow-300',
  archived:  'bg-gray-700 text-gray-400',
}

// Same key Blog Creator (Create tab) and BlogWriterPanel/SocialBlast already
// write to — local drafts show up here before they've ever hit the DB.
const DRAFTS_KEY = 'awe_content_drafts'
function loadLocalDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch { return [] }
}
function removeLocalDraft(savedAt) {
  const next = loadLocalDrafts().filter(d => d.savedAt !== savedAt)
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(next)) } catch {}
  return next
}

// ── A) Publishing Queue ──────────────────────────────────────────────────────

function PublishingQueuePanel() {
  const [posts,   setPosts]   = useState([])
  const [drafts,  setDrafts]  = useState(loadLocalDrafts)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [busyId,  setBusyId]  = useState(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/blog/published')
      if (res.data.success) setPosts(res.data.posts)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load queue.')
    } finally {
      setLoading(false)
    }
  }

  const dbQueued = posts.filter(p => p.status !== 'published')
  // Local drafts that have since been published (same slug now live in DB)
  // shouldn't show twice.
  const publishedSlugs = new Set(posts.filter(p => p.status === 'published').map(p => p.slug))
  const localQueued = drafts.filter(d => d.slug && !publishedSlugs.has(d.slug))

  async function publishOne(id) {
    setBusyId(id)
    try {
      await api.patch(`/api/admin/blog/published/${id}`, { status: 'published' })
      setPosts(ps => ps.map(p => p.id === id ? { ...p, status: 'published' } : p))
    } catch {} finally {
      setBusyId(null)
    }
  }

  async function publishLocalDraft(draft) {
    setBusyId(draft.savedAt)
    try {
      await api.post('/api/admin/blog/publish-db', {
        title: draft.title, slug: draft.slug, content: draft.content,
        meta_title: draft.metaTitle, meta_description: draft.metaDescription,
        category: draft.category, excerpt: draft.excerpt, read_time: draft.readTime,
        faqs: draft.faqs, related_tools: draft.relatedTools,
        image_url: draft.imageUrl, image_credit: draft.imageCredit, image_credit_url: draft.imageCreditUrl,
      })
      setDrafts(removeLocalDraft(draft.savedAt))
      await load()
    } catch {} finally {
      setBusyId(null)
    }
  }

  async function publishAll() {
    setBulkBusy(true)
    for (const p of dbQueued) {
      try { await api.patch(`/api/admin/blog/published/${p.id}`, { status: 'published' }) } catch {}
    }
    for (const d of localQueued) {
      try {
        await api.post('/api/admin/blog/publish-db', {
          title: d.title, slug: d.slug, content: d.content,
          meta_title: d.metaTitle, meta_description: d.metaDescription,
          category: d.category, excerpt: d.excerpt, read_time: d.readTime,
          faqs: d.faqs, related_tools: d.relatedTools,
          image_url: d.imageUrl, image_credit: d.imageCredit, image_credit_url: d.imageCreditUrl,
        })
      } catch {}
    }
    setDrafts(loadLocalDrafts().filter(d => !localQueued.some(q => q.savedAt === d.savedAt)))
    await load()
    setBulkBusy(false)
  }

  const totalQueued = dbQueued.length + localQueued.length

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (error) return <p className="text-red-400 text-sm">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Publishing Queue — {totalQueued} pending</h2>
        {totalQueued > 0 && (
          <button onClick={publishAll} disabled={bulkBusy}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2">
            {bulkBusy ? <><Spinner />Publishing…</> : '🚀 Publish All'}
          </button>
        )}
      </div>

      {totalQueued === 0 ? (
        <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-400 text-sm">Nothing waiting — queue is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {localQueued.map(d => (
            <div key={d.savedAt} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <span className="text-lg shrink-0">💾</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.title || d.keyword}</p>
                <p className="text-xs text-gray-500">{d.category || d.toolName}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 bg-blue-900/60 text-blue-300">local draft</span>
              <button onClick={() => publishLocalDraft(d)} disabled={busyId === d.savedAt}
                className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg shrink-0">
                {busyId === d.savedAt ? <Spinner /> : 'Publish'}
              </button>
            </div>
          ))}
          {dbQueued.map(p => (
            <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <span className="text-lg shrink-0">📝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.title}</p>
                <p className="text-xs text-gray-500">{p.category}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${STATUS_BADGE[p.status] || STATUS_BADGE.draft}`}>{p.status}</span>
              <button onClick={() => publishOne(p.id)} disabled={busyId === p.id}
                className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg shrink-0">
                {busyId === p.id ? <Spinner /> : 'Publish'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── B) Platform Publisher ────────────────────────────────────────────────────

function PlatformPublisherPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-xs text-gray-400">
          One-click blog + Twitter/X + Pinterest, with Reddit &amp; Quora drafted for manual posting. For LinkedIn, Pinterest description, or WhatsApp copy, use <span className="text-indigo-400">Create → Social Content</span>.
        </p>
      </div>
      <AutoCampaignPage />
    </div>
  )
}

// ── C) Analytics Dashboard ───────────────────────────────────────────────────

function loadJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

function withinDays(iso, days) {
  if (!iso) return false
  return (Date.now() - new Date(iso).getTime()) <= days * 24 * 60 * 60 * 1000
}

const SEARCH_WINDOWS = [
  { id: '7',  label: '7d'  },
  { id: '28', label: '28d' },
]

function SearchPerformanceSection() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [win,     setWin]     = useState('7')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await api.get('/api/admin/growth-os/search-performance')
      if (res.data.success) setData(res.data)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load search performance.')
    } finally {
      setLoading(false)
    }
  }

  async function syncNow() {
    setSyncing(true)
    try {
      await api.post('/api/admin/growth-os/gsc-sync')
      await load()
    } catch {} finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="flex justify-center py-6"><Spinner /></div>
  if (error) return <p className="text-red-400 text-sm">{error}</p>
  if (!data) return null

  if (!data.configured) {
    return (
      <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-6 text-center">
        <p className="text-xs text-gray-500">
          Search Console isn't connected yet — set <span className="text-gray-400">GOOGLE_SERVICE_ACCOUNT_JSON</span> on the server to enable real search performance data here.
        </p>
      </div>
    )
  }

  if (!data.lastSyncedAt) {
    return (
      <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-6 text-center space-y-3">
        <p className="text-xs text-gray-500">Not synced yet.</p>
        <button onClick={syncNow} disabled={syncing}
          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold inline-flex items-center gap-2">
          {syncing ? <><Spinner />Syncing…</> : '🔄 Sync Now'}
        </button>
      </div>
    )
  }

  const stats = win === '7' ? data.last7 : data.last28

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">🔍 Search Performance</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            {SEARCH_WINDOWS.map(w => (
              <button key={w.id} onClick={() => setWin(w.id)}
                className={`text-[11px] px-2.5 py-1 font-medium ${win === w.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {w.label}
              </button>
            ))}
          </div>
          <button onClick={syncNow} disabled={syncing}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2">
            {syncing ? <Spinner /> : '🔄 Sync Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Clicks',       stats.totalClicks],
          ['Impressions',  stats.totalImpressions],
          ['Avg CTR',      `${(stats.avgCtr * 100).toFixed(1)}%`],
          ['Avg Position', stats.avgPosition],
        ].map(([label, val]) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">{val}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-600">Last synced {new Date(data.lastSyncedAt).toLocaleString()}.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-2">Top Pages</h3>
          {stats.topPages.length === 0 ? (
            <p className="text-xs text-gray-500">No data.</p>
          ) : (
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="font-normal pb-1 w-auto">Page</th>
                  <th className="font-normal pb-1 text-right w-16">Clicks</th>
                  <th className="font-normal pb-1 text-right w-16">Impr.</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPages.map(p => (
                  <tr key={p.page_url} className="border-t border-gray-700">
                    <td className="py-1.5 pr-2 text-gray-300 truncate" title={p.page_url}>{p.page_url}</td>
                    <td className="py-1.5 text-right text-white">{p.clicks}</td>
                    <td className="py-1.5 text-right text-gray-400">{p.impressions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-2">Top Queries</h3>
          {stats.topQueries.length === 0 ? (
            <p className="text-xs text-gray-500">No data.</p>
          ) : (
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="font-normal pb-1 w-auto">Query</th>
                  <th className="font-normal pb-1 text-right w-16">Clicks</th>
                  <th className="font-normal pb-1 text-right w-16">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {stats.topQueries.map(q => (
                  <tr key={q.query} className="border-t border-gray-700">
                    <td className="py-1.5 pr-2 text-gray-300 truncate" title={q.query}>{q.query}</td>
                    <td className="py-1.5 text-right text-white">{q.clicks}</td>
                    <td className="py-1.5 text-right text-gray-400">{q.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function AnalyticsPanel() {
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/blog/published')
      .then(res => { if (res.data.success) setPosts(res.data.posts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const blogDrafts   = loadJson('awe_content_drafts')
  const socialBlasts = loadJson('awe_social_blast_history')

  const publishedThisWeek = posts.filter(p => p.status === 'published' && withinDays(p.updated_at || p.created_at, 7)).length
  const draftsThisWeek    = blogDrafts.filter(d => withinDays(d.savedAt, 7)).length
  const blastsThisWeek    = socialBlasts.filter(b => withinDays(b.savedAt, 7)).length
  const categoriesTouched = new Set(posts.filter(p => withinDays(p.updated_at || p.created_at, 7)).map(p => p.category)).size

  const topByHumanScore = [...posts]
    .filter(p => p.human_score != null)
    .sort((a, b) => (b.human_score ?? 0) - (a.human_score ?? 0))
    .slice(0, 5)

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="space-y-6">
      <SearchPerformanceSection />

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Blogs Published', publishedThisWeek],
          ['Content Pieces Drafted', draftsThisWeek + blastsThisWeek],
          ['Categories Touched', categoriesTouched],
          ['Social Blasts Run', blastsThisWeek],
        ].map(([label, val]) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">{val}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-600">
        Last 7 days. Draft/blast counts come from this browser's local history — clearing site data resets them. No live pageview/reach tracking is wired up yet, so this doesn't include traffic numbers.
      </p>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Top Content by Human Score</h2>
        {topByHumanScore.length === 0 ? (
          <p className="text-xs text-gray-500">No humanized posts scored yet.</p>
        ) : (
          <div className="space-y-2">
            {topByHumanScore.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                <p className="text-xs text-white truncate flex-1">{p.title}</p>
                <span className="text-xs text-green-400 font-semibold shrink-0">{p.human_score}/100</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── D) AI Recommendations ────────────────────────────────────────────────────

const PRIORITY_COLOR = {
  High:   'bg-red-900/60 text-red-300',
  Medium: 'bg-yellow-900/60 text-yellow-300',
  Low:    'bg-gray-700 text-gray-400',
}

function RecommendationsPanel() {
  const [recs,    setRecs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await api.get('/api/admin/growth-os/recommendations')
      if (res.data.success) setRecs(res.data.recommendations)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load recommendations.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">🧭 AI Recommendations</h2>
        <button onClick={load} disabled={loading} className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          {loading ? <Spinner /> : '🔄 Refresh'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : recs.length === 0 ? (
        <p className="text-xs text-gray-500">No recommendations yet — publish a few posts first.</p>
      ) : (
        <div className="space-y-2">
          {recs.map((r, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.Medium}`}>{r.priority || 'Medium'}</span>
              <p className="text-xs text-gray-300 flex-1">{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GrowTab() {
  const [section, setSection] = useState('queue')

  return (
    <div className="flex gap-5">
      <aside className="w-48 shrink-0 space-y-1">
        {SUB_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              section === s.id ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
            }`}
          >
            {s.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        {section === 'queue'     && <PublishingQueuePanel />}
        {section === 'publish'   && <PlatformPublisherPanel />}
        {section === 'analytics' && <AnalyticsPanel />}
        {section === 'recs'      && <RecommendationsPanel />}
      </div>
    </div>
  )
}
