import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api.service'

// ── Shared helpers (styled to match ContentStudio.jsx / BlogAssistant.jsx) ──

function Spinner({ text = 'Working…' }) {
  return (
    <div className="flex items-center gap-3 py-6 text-gray-400">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
      {msg}
    </div>
  )
}

// ── Blog backlog summary card — links out to the existing Humanize flow ─────
// Deliberately does not reimplement anything: /admin/blog already has a
// working "Humanize All" bulk action for unscored posts.

function BlogSummaryCard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/content-quality/blog-summary')
      .then(res => { if (res.data.success) setSummary(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">Blog Posts</p>
          {loading ? (
            <p className="text-2xl font-bold text-white">—</p>
          ) : (
            <p className="text-2xl font-bold text-white">
              {summary?.unscored ?? '—'} <span className="text-sm font-normal text-gray-400">unscored of {summary?.published ?? '—'} published</span>
            </p>
          )}
        </div>
        <Link
          to="/admin/blog"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
        >
          Open Blog Assistant →
        </Link>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Humanize / score unscored posts from Published Posts → Humanize All.
      </p>
    </div>
  )
}

// ── Per-tool generate + preview + save ──────────────────────────────────────

function ToolRow({ tool, onSaved }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [preview, setPreview] = useState(null)
  const [err, setErr]         = useState('')

  const generate = async () => {
    setOpen(true)
    setLoading(true)
    setErr('')
    setPreview(null)
    try {
      const { data } = await api.post(`/api/admin/content-quality/tools/${tool.id}/generate`, {})
      if (!data.success) throw new Error(data.error || 'Generation failed')
      setPreview(data.result)
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!preview) return
    setSaving(true)
    setErr('')
    try {
      const { data } = await api.post(`/api/admin/content-quality/tools/${tool.id}/save`, {
        about: preview.about,
        faq:   preview.faq,
      })
      if (!data.success) throw new Error(data.error || 'Save failed')
      setOpen(false)
      setPreview(null)
      onSaved(tool.id)
    } catch (e) {
      setErr(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-800">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{tool.name}</p>
          <p className="text-xs text-gray-500">/tools/{tool.slug} · {tool.category || 'Uncategorized'}</p>
        </div>
        <button
          onClick={() => (open ? setOpen(false) : generate())}
          disabled={loading}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition shrink-0"
        >
          {open ? 'Close' : '✨ Generate'}
        </button>
      </div>

      {open && (
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          {loading && <Spinner text="Drafting About + FAQ with GPT-4o…" />}
          {err && <ErrBox msg={err} />}

          {preview && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">About (preview)</p>
                <div className="space-y-2 text-sm text-gray-300">
                  {preview.about.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">FAQ (preview)</p>
                <div className="space-y-2">
                  {preview.faq.map((f, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-200">{f.q}</p>
                      <p className="text-sm text-gray-400 mt-1">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {saving ? 'Saving…' : '💾 Save to tool page'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContentQualityPage() {
  const [tools,   setTools]   = useState([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const [bulkSummary, setBulkSummary] = useState(null)

  const loadTools = useCallback(() => {
    setLoading(true)
    api.get('/api/admin/content-quality/tools')
      .then(res => { if (res.data.success) setTools(res.data.tools) })
      .catch(e => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadTools() }, [loadTools])

  const handleSaved = (toolId) => {
    setTools(prev => prev.filter(t => t.id !== toolId))
  }

  const runBulk = async () => {
    if (tools.length === 0) return
    setBulkRunning(true)
    setBulkSummary(null)
    setBulkProgress({ done: 0, total: tools.length })
    let generated = 0, failed = 0
    for (const tool of [...tools]) {
      try {
        const { data: genData } = await api.post(`/api/admin/content-quality/tools/${tool.id}/generate`, {})
        if (!genData.success) throw new Error(genData.error || 'Generation failed')
        const { data: saveData } = await api.post(`/api/admin/content-quality/tools/${tool.id}/save`, {
          about: genData.result.about,
          faq:   genData.result.faq,
        })
        if (!saveData.success) throw new Error(saveData.error || 'Save failed')
        generated++
        setTools(prev => prev.filter(t => t.id !== tool.id))
      } catch (e) {
        console.error(`[Content Quality bulk] "${tool.name}" (${tool.id}) failed:`, e.response?.data?.error || e.message)
        failed++
      } finally {
        setBulkProgress(prev => ({ ...prev, done: prev.done + 1 }))
      }
    }
    setBulkSummary({ generated, failed, total: tools.length })
    setBulkRunning(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Content Quality</h2>
        <p className="text-gray-400 text-sm mt-1">
          Find and fix thin content across blog posts and tool pages, ahead of AdSense review.
        </p>
      </div>

      <div className="mb-6">
        <BlogSummaryCard />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Tool Pages Without Content</h3>
            <p className="text-sm text-gray-400 mt-1">
              These tools render the generic fallback About/FAQ template on their public page.
            </p>
          </div>
          {tools.length > 0 && (
            <button
              onClick={runBulk}
              disabled={bulkRunning}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
            >
              {bulkRunning ? `Generating ${bulkProgress.done}/${bulkProgress.total}…` : `✨ Generate All (${tools.length})`}
            </button>
          )}
        </div>

        {bulkSummary && (
          <div className="mb-4 p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300">
            ✅ {bulkSummary.generated} generated · ⚠️ {bulkSummary.failed} failed · {bulkSummary.total} total
          </div>
        )}

        {loading && <Spinner text="Loading tool backlog…" />}
        {err && <ErrBox msg={err} />}

        {!loading && tools.length === 0 && !err && (
          <p className="text-sm text-gray-500 py-6 text-center">
            No tools currently missing content. 🎉
          </p>
        )}

        <div className="space-y-2">
          {tools.map(tool => (
            <ToolRow key={tool.id} tool={tool} onSaved={handleSaved} />
          ))}
        </div>
      </div>
    </div>
  )
}
