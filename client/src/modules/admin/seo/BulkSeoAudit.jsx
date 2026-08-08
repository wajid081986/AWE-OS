import { useEffect, useState } from 'react'
import api from '../../../services/api.service'

const FLAG_LABEL = {
  thin_content:       'Thin content',
  no_faq:             'No FAQ',
  no_internal_links:  'No internal links',
  not_humanized:      'Not humanized',
}

function FlagBadge({ flag }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-900/40 border border-red-700 text-red-300 whitespace-nowrap">
      {FLAG_LABEL[flag] || flag}
    </span>
  )
}

function IssuesBadge({ count }) {
  const color = count === 0
    ? 'bg-green-900 text-green-300'
    : count <= 2
      ? 'bg-yellow-900 text-yellow-300'
      : 'bg-red-900 text-red-300'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {count}
    </span>
  )
}

// Local trimmed copy of growth-os/CreateTab.jsx's ContentPreviewBlock/renderInline
// pattern (not imported — different, unrelated admin module) so the "Fix This"
// preview panel renders the same **bold**/<a> markup and block types the
// generator/humanizer actually produce. See CLAUDE.md changelog 2026-08-07.
const INLINE_LINK_RE = /^<a\s+href=(['"])([^'"]+)\1[^>]*>([^<]*)<\/a>$/i
function renderInline(text) {
  if (typeof text !== 'string' || (!text.includes('**') && !text.includes('<a '))) return text
  return text.split(/(\*\*[^*]+\*\*|<a\s+href=(?:'[^']+'|"[^"]+")[^>]*>[^<]*<\/a>)/gi).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    const linkMatch = part.match(INLINE_LINK_RE)
    if (linkMatch) {
      const [, , href, label] = linkMatch
      return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2">{label}</a>
    }
    return part
  })
}

function ContentPreviewBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return <h3 className="text-sm font-bold text-white mt-4 mb-1.5">{block.text}</h3>
    case 'h3':
      return <h4 className="text-sm font-semibold text-white mt-3 mb-1">{block.text}</h4>
    case 'p':
      return <p className="text-xs text-gray-300 leading-relaxed mb-2">{renderInline(block.text)}</p>
    case 'ul':
      return (
        <ul className="list-disc list-outside pl-4 mb-2 space-y-1">
          {block.items.map((item, i) => <li key={i} className="text-xs text-gray-300 leading-relaxed">{renderInline(item)}</li>)}
        </ul>
      )
    case 'table':
      return (
        <div className="overflow-x-auto mb-3">
          <table className="min-w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-700">
                {block.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-gray-300 border-t border-gray-700 whitespace-nowrap">{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'callout': {
      const ctaLinks = [...(block.links || []), ...(block.link ? [block.link] : [])]
      return (
        <div className="bg-indigo-950/40 border border-indigo-800 rounded-lg p-3 mb-3">
          {block.title && <p className="text-xs font-bold text-indigo-200 mb-1">{block.title}</p>}
          <p className="text-xs text-indigo-300 mb-2 leading-relaxed">{block.text}</p>
          {ctaLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ctaLinks.map((l, i) => (
                <a key={i} href={l.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">
                  {l.label} →
                </a>
              ))}
            </div>
          )}
        </div>
      )
    }
    default:
      return null
  }
}

function FixPreviewModal({ postTitle, mode, preview, saving, error, onReplace, onCancel }) {
  const scores = preview.humanizeInfo?.scores
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">
              {mode === 'regenerate' ? 'Regenerated content preview' : 'Humanized content preview'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{postTitle}</p>
          </div>
          {preview.wordCount != null && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-900 border border-gray-700 text-gray-300 whitespace-nowrap">
              {preview.wordCount} words
            </span>
          )}
        </div>

        {scores && (
          <div className="px-5 py-3 border-b border-gray-700 flex gap-4 text-xs text-gray-300 flex-wrap">
            {scores.humanScore != null && <span>Human score: <strong className="text-white">{scores.humanScore}</strong></span>}
            {scores.afterHumanization != null && <span>AI-likelihood after: <strong className="text-white">{scores.afterHumanization}</strong></span>}
            {scores.readability != null && <span>Readability: <strong className="text-white">{scores.readability}</strong></span>}
          </div>
        )}

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {preview.content.map((block, i) => <ContentPreviewBlock key={i} block={block} />)}

          {Array.isArray(preview.faqs) && preview.faqs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-bold text-white mb-2">FAQs</h3>
              {preview.faqs.map((f, i) => (
                <div key={i} className="mb-3">
                  <p className="text-xs font-semibold text-white mb-1">{f.q}</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-900/40 border-t border-red-700 text-red-300 text-xs">{error}</div>
        )}

        <div className="px-5 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReplace}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Replacing…' : 'Replace →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CTR Optimizer ──────────────────────────────────────────────────────────────

function CtrOpportunityRow({ post, onSuggest, suggesting, error }) {
  return (
    <tr className="border-t border-gray-700 align-top">
      <td className="px-4 py-3 text-white max-w-xs truncate">{post.title}</td>
      <td className="px-4 py-3 text-gray-400">{post.impressions}</td>
      <td className="px-4 py-3 text-gray-400">{post.clicks}</td>
      <td className="px-4 py-3 text-gray-400">{(post.ctr * 100).toFixed(2)}%</td>
      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{post.meta_title || <span className="italic text-gray-600">(none set)</span>}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onSuggest(post)}
          disabled={suggesting}
          className="text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline whitespace-nowrap text-sm"
        >
          {suggesting ? 'Thinking…' : 'Suggest →'}
        </button>
        {error && <p className="text-xs text-red-400 mt-1 max-w-[12rem]">{error}</p>}
      </td>
    </tr>
  )
}

function MetaOptionsModal({ postTitle, current, options, applyingIndex, error, onApply, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-bold text-white">Meta title / description options</h2>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{postTitle}</p>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Current</p>
            <p className="text-sm text-white mb-1">{current.meta_title || <span className="italic text-gray-500">(none set)</span>}</p>
            <p className="text-xs text-gray-400">{current.meta_description || <span className="italic text-gray-500">(none set)</span>}</p>
          </div>

          {options.map((opt, i) => (
            <div key={i} className="bg-indigo-950/30 border border-indigo-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-300 uppercase mb-1">Option {i + 1}</p>
              <p className="text-sm text-white mb-1">{opt.meta_title}</p>
              <p className="text-xs text-gray-300 mb-3">{opt.meta_description}</p>
              <button
                type="button"
                onClick={() => onApply(opt, i)}
                disabled={applyingIndex != null}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {applyingIndex === i ? 'Applying…' : 'Apply this option →'}
              </button>
            </div>
          ))}

          {options.length === 0 && (
            <p className="text-gray-500 text-sm">No options returned — try again.</p>
          )}
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-900/40 border-t border-red-700 text-red-300 text-xs">{error}</div>
        )}

        <div className="px-5 py-4 border-t border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={applyingIndex != null}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function CtrOptimizerSection() {
  const [posts,      setPosts]      = useState([])
  const [configured, setConfigured] = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const [suggestingId, setSuggestingId] = useState(null)
  const [suggestError, setSuggestError] = useState({})
  const [modal,         setModal]        = useState(null) // { postId, postTitle, current, options }
  const [applyingIndex, setApplyingIndex] = useState(null)
  const [applyError,    setApplyError]    = useState(null)

  async function fetchOpportunities() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/blog-bulk-audit/ctr-opportunities')
      if (res.data.success) {
        setConfigured(res.data.configured !== false)
        setPosts(res.data.posts || [])
      } else {
        setError(res.data.error || 'Failed to load CTR opportunities')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOpportunities() }, [])

  async function handleSuggest(post) {
    setSuggestingId(post.id)
    setSuggestError(prev => ({ ...prev, [post.id]: null }))
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/meta-suggest/${post.id}`)
      if (res.data.success) {
        setModal({
          postId:    post.id,
          postTitle: post.title,
          current:   { meta_title: post.meta_title, meta_description: post.meta_description },
          options:   res.data.options || [],
        })
      } else {
        setSuggestError(prev => ({ ...prev, [post.id]: res.data.error || 'Suggest failed' }))
      }
    } catch (err) {
      setSuggestError(prev => ({ ...prev, [post.id]: err.response?.data?.error || err.message || 'Request failed' }))
    } finally {
      setSuggestingId(null)
    }
  }

  function closeModal() {
    setModal(null)
    setApplyError(null)
    setApplyingIndex(null)
  }

  async function handleApply(option, index) {
    if (!modal) return
    setApplyingIndex(index)
    setApplyError(null)
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/meta-confirm/${modal.postId}`, {
        meta_title:       option.meta_title,
        meta_description: option.meta_description,
      })
      if (res.data.success) {
        closeModal()
        fetchOpportunities()
      } else {
        setApplyError(res.data.error || 'Apply failed')
        setApplyingIndex(null)
      }
    } catch (err) {
      setApplyError(err.response?.data?.error || err.message || 'Request failed')
      setApplyingIndex(null)
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white">CTR Optimizer</h2>
        <button
          type="button"
          onClick={fetchOpportunities}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Published posts with real search impressions (28d) but zero or very low clicks — a title/snippet
        problem, not a ranking problem. Suggestions only touch the search-result meta title/description,
        never the post's own title, slug, or content.
      </p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {!loading && !error && !configured && (
        <p className="text-gray-500 text-sm">Search Console isn't configured yet — no data to show.</p>
      )}

      {loading && posts.length === 0 && (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading search performance…
        </div>
      )}

      {!loading && configured && posts.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Impressions (28d)</th>
                <th className="text-left px-4 py-3">Clicks</th>
                <th className="text-left px-4 py-3">CTR</th>
                <th className="text-left px-4 py-3">Current meta title</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <CtrOpportunityRow
                  key={post.id}
                  post={post}
                  onSuggest={handleSuggest}
                  suggesting={suggestingId === post.id}
                  error={suggestError[post.id]}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && configured && !error && posts.length === 0 && (
        <p className="text-gray-500 text-sm">No CTR opportunities found — every post with meaningful impressions is converting reasonably well.</p>
      )}

      {modal && (
        <MetaOptionsModal
          postTitle={modal.postTitle}
          current={modal.current}
          options={modal.options}
          applyingIndex={applyingIndex}
          error={applyError}
          onApply={handleApply}
          onCancel={closeModal}
        />
      )}
    </div>
  )
}

// ── Priority Queue (Batch 59 — SDD Phase 2) ─────────────────────────────────
// Merges the structural audit with real GSC performance into a single
// ranked list. Own local state/handlers, reusing the FixPreviewModal and
// MetaOptionsModal components as-is — the existing Structural Audit and
// CTR Optimizer sections below are untouched.

function ScoreBadge({ score }) {
  const color = score >= 120
    ? 'bg-red-900 text-red-300'
    : score >= 60
      ? 'bg-yellow-900 text-yellow-300'
      : 'bg-green-900 text-green-300'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {score}
    </span>
  )
}

function PriorityQueueRow({ post, onFixThis, fixing, fixError, onSuggest, suggesting, suggestError }) {
  return (
    <tr className="border-t border-gray-700 align-top">
      <td className="px-4 py-3 text-white max-w-xs truncate">{post.title}</td>
      <td className="px-4 py-3"><ScoreBadge score={post.score} /></td>
      <td className="px-4 py-3 max-w-sm">
        <ul className={`text-xs space-y-0.5 ${post.decaying ? 'text-red-400' : 'text-gray-400'}`}>
          {post.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
        </ul>
      </td>
      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{post.impressions}</td>
      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{post.avgPosition || '—'}</td>
      <td className="px-4 py-3">
        {post.issuesCount > 0 && (
          <>
            <button
              type="button"
              onClick={() => onFixThis(post)}
              disabled={fixing}
              className="text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline whitespace-nowrap text-sm"
            >
              {fixing ? 'Analyzing…' : 'Fix This →'}
            </button>
            {fixError && <p className="text-xs text-red-400 mt-1 max-w-[12rem]">{fixError}</p>}
          </>
        )}
        {post.needsMetaFix && (
          <div className={post.issuesCount > 0 ? 'mt-1' : ''}>
            <button
              type="button"
              onClick={() => onSuggest(post)}
              disabled={suggesting}
              className="text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline whitespace-nowrap text-sm"
            >
              {suggesting ? 'Thinking…' : 'Suggest →'}
            </button>
            {suggestError && <p className="text-xs text-red-400 mt-1 max-w-[12rem]">{suggestError}</p>}
          </div>
        )}
      </td>
    </tr>
  )
}

function PriorityQueueSection() {
  const [posts,       setPosts]       = useState([])
  const [configured,  setConfigured]  = useState(true)
  const [decayStatus, setDecayStatus] = useState(null) // { sufficientData, daysCollected } | null
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const [fixingId, setFixingId] = useState(null)
  const [fixError, setFixError] = useState({})
  const [preview,  setPreview]  = useState(null) // { postId, postTitle, mode, data }
  const [saving,   setSaving]   = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [suggestingId, setSuggestingId] = useState(null)
  const [suggestError, setSuggestError] = useState({})
  const [modal,         setModal]         = useState(null) // { postId, postTitle, current, options }
  const [applyingIndex, setApplyingIndex] = useState(null)
  const [applyError,    setApplyError]    = useState(null)

  async function fetchQueue() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/blog-bulk-audit/priority-queue')
      if (res.data.success) {
        setConfigured(res.data.configured !== false)
        setDecayStatus(res.data.decayStatus || null)
        setPosts(res.data.posts || [])
      } else {
        setError(res.data.error || 'Failed to load priority queue')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQueue() }, [])

  async function handleFixThis(post) {
    setFixingId(post.id)
    setFixError(prev => ({ ...prev, [post.id]: null }))
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/fix/${post.id}`)
      if (res.data.success) {
        setPreview({ postId: post.id, postTitle: post.title, mode: res.data.mode, data: res.data.preview })
      } else {
        setFixError(prev => ({ ...prev, [post.id]: res.data.error || 'Fix failed' }))
      }
    } catch (err) {
      setFixError(prev => ({ ...prev, [post.id]: err.response?.data?.error || err.message || 'Request failed' }))
    } finally {
      setFixingId(null)
    }
  }

  function closePreview() {
    setPreview(null)
    setSaveError(null)
  }

  async function handleReplace() {
    if (!preview) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/fix/${preview.postId}/confirm`, {
        mode:    preview.mode,
        preview: preview.data,
      })
      if (res.data.success) {
        closePreview()
        fetchQueue()
      } else {
        setSaveError(res.data.error || 'Replace failed')
      }
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSuggest(post) {
    setSuggestingId(post.id)
    setSuggestError(prev => ({ ...prev, [post.id]: null }))
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/meta-suggest/${post.id}`)
      if (res.data.success) {
        setModal({
          postId:    post.id,
          postTitle: post.title,
          current:   { meta_title: post.meta_title, meta_description: post.meta_description },
          options:   res.data.options || [],
        })
      } else {
        setSuggestError(prev => ({ ...prev, [post.id]: res.data.error || 'Suggest failed' }))
      }
    } catch (err) {
      setSuggestError(prev => ({ ...prev, [post.id]: err.response?.data?.error || err.message || 'Request failed' }))
    } finally {
      setSuggestingId(null)
    }
  }

  function closeModal() {
    setModal(null)
    setApplyError(null)
    setApplyingIndex(null)
  }

  async function handleApply(option, index) {
    if (!modal) return
    setApplyingIndex(index)
    setApplyError(null)
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/meta-confirm/${modal.postId}`, {
        meta_title:       option.meta_title,
        meta_description: option.meta_description,
      })
      if (res.data.success) {
        closeModal()
        fetchQueue()
      } else {
        setApplyError(res.data.error || 'Apply failed')
        setApplyingIndex(null)
      }
    } catch (err) {
      setApplyError(err.response?.data?.error || err.message || 'Request failed')
      setApplyingIndex(null)
    }
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white">Priority Queue</h2>
        <button
          type="button"
          onClick={fetchQueue}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Structural issues ranked against real Search Console performance (28d) — work on these posts next,
        in this order. Score = issues × 25 + capped impressions/position, damped for posts with no
        structural flags. Reasons in red flag posts whose ranking worsened week-over-week once enough
        history exists. No AI cost to view; "Fix This" and "Suggest" reuse the same actions below.
      </p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {!loading && !error && !configured && (
        <p className="text-gray-500 text-sm mb-6">Search Console isn't configured yet — showing structural issues only.</p>
      )}

      {!loading && !error && configured && decayStatus && !decayStatus.sufficientData && (
        <div className="bg-gray-800 border border-gray-700 border-dashed rounded-xl p-4 text-center mb-6">
          <p className="text-xs text-gray-500">
            Accumulating data — content decay trend available after 14 days
            (currently {decayStatus.daysCollected} day{decayStatus.daysCollected === 1 ? '' : 's'} collected).
          </p>
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
          Ranking posts…
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Reasons</th>
                <th className="text-left px-4 py-3">Impressions (28d)</th>
                <th className="text-left px-4 py-3">Avg position</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <PriorityQueueRow
                  key={post.id}
                  post={post}
                  onFixThis={handleFixThis}
                  fixing={fixingId === post.id}
                  fixError={fixError[post.id]}
                  onSuggest={handleSuggest}
                  suggesting={suggestingId === post.id}
                  suggestError={suggestError[post.id]}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <p className="text-gray-500 text-sm">No published posts found.</p>
      )}

      {preview && (
        <FixPreviewModal
          postTitle={preview.postTitle}
          mode={preview.mode}
          preview={preview.data}
          saving={saving}
          error={saveError}
          onReplace={handleReplace}
          onCancel={closePreview}
        />
      )}

      {modal && (
        <MetaOptionsModal
          postTitle={modal.postTitle}
          current={modal.current}
          options={modal.options}
          applyingIndex={applyingIndex}
          error={applyError}
          onApply={handleApply}
          onCancel={closeModal}
        />
      )}
    </div>
  )
}

export default function BulkSeoAudit() {
  const [posts,   setPosts]   = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const [fixingId, setFixingId]   = useState(null) // post id currently loading a /fix preview
  const [fixError, setFixError]   = useState({})   // postId -> error message
  const [preview,  setPreview]    = useState(null)  // { postId, postTitle, mode, data }
  const [saving,   setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function fetchAudit() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/blog-bulk-audit')
      if (res.data.success) {
        setPosts(res.data.posts || [])
        setSummary(res.data.summary || null)
      } else {
        setError(res.data.error || 'Audit failed')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAudit() }, [])

  async function handleFixThis(post) {
    setFixingId(post.id)
    setFixError(prev => ({ ...prev, [post.id]: null }))
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/fix/${post.id}`)
      if (res.data.success) {
        setPreview({ postId: post.id, postTitle: post.title, mode: res.data.mode, data: res.data.preview })
      } else {
        setFixError(prev => ({ ...prev, [post.id]: res.data.error || 'Fix failed' }))
      }
    } catch (err) {
      setFixError(prev => ({ ...prev, [post.id]: err.response?.data?.error || err.message || 'Request failed' }))
    } finally {
      setFixingId(null)
    }
  }

  function closePreview() {
    setPreview(null)
    setSaveError(null)
  }

  async function handleReplace() {
    if (!preview) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await api.post(`/api/admin/blog-bulk-audit/fix/${preview.postId}/confirm`, {
        mode:    preview.mode,
        preview: preview.data,
      })
      if (res.data.success) {
        closePreview()
        fetchAudit()
      } else {
        setSaveError(res.data.error || 'Replace failed')
      }
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Bulk SEO Audit</h1>

      <PriorityQueueSection />

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white">Structural Audit</h2>
        <button
          type="button"
          onClick={fetchAudit}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Structural checks across all published posts — no AI calls, free to re-run anytime.
      </p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
          Scanning published posts…
        </div>
      )}

      {summary && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex gap-8 text-sm text-gray-300">
          <span><strong className="text-white">{summary.totalPosts}</strong> published posts</span>
          <span><strong className="text-white">{summary.totalIssues}</strong> total issues</span>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Words</th>
                <th className="text-left px-4 py-3">Issues</th>
                <th className="text-left px-4 py-3">Flags</th>
                <th className="text-left px-4 py-3"></th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-t border-gray-700 align-top">
                  <td className="px-4 py-3 text-white max-w-xs truncate">{post.title}</td>
                  <td className="px-4 py-3 text-gray-400">{post.wordCount}</td>
                  <td className="px-4 py-3"><IssuesBadge count={post.issuesCount} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {post.flags.map(flag => <FlagBadge key={flag} flag={flag} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/blog?edit=${encodeURIComponent(post.slug)}`}
                      className="text-indigo-400 hover:underline whitespace-nowrap"
                    >
                      Edit →
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {post.issuesCount > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleFixThis(post)}
                          disabled={fixingId === post.id}
                          className="text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline whitespace-nowrap text-sm"
                        >
                          {fixingId === post.id ? 'Analyzing…' : 'Fix This →'}
                        </button>
                        {fixError[post.id] && (
                          <p className="text-xs text-red-400 mt-1 max-w-[12rem]">{fixError[post.id]}</p>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <p className="text-gray-500 text-sm">No published posts found.</p>
      )}

      {preview && (
        <FixPreviewModal
          postTitle={preview.postTitle}
          mode={preview.mode}
          preview={preview.data}
          saving={saving}
          error={saveError}
          onReplace={handleReplace}
          onCancel={closePreview}
        />
      )}

      <CtrOptimizerSection />
    </div>
  )
}
