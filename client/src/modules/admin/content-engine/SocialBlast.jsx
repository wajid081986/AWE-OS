import { useState } from 'react'
import api from '../../../services/api.service'

// ── Platform definitions (all Tailwind classes written in full for JIT) ────────
const PLATFORMS = [
  {
    id:          'redditPost',
    name:        'Reddit',
    icon:        '🔴',
    limit:       null,
    isThread:    false,
    cardBorder:  'border-orange-500/30',
    headerBg:    'bg-orange-500/10',
    headerBd:    'border-orange-500/20',
    badgeOn:     'bg-orange-500 text-white',
    accentText:  'text-orange-400',
    warnColor:   'text-orange-300',
  },
  {
    id:          'quoraAnswer',
    name:        'Quora',
    icon:        '🟤',
    limit:       null,
    isThread:    false,
    cardBorder:  'border-red-800/40',
    headerBg:    'bg-red-900/20',
    headerBd:    'border-red-800/30',
    badgeOn:     'bg-red-800 text-white',
    accentText:  'text-red-400',
    warnColor:   'text-red-300',
  },
  {
    id:          'pinterestPin',
    name:        'Pinterest',
    icon:        '📌',
    limit:       500,
    isThread:    false,
    cardBorder:  'border-red-500/30',
    headerBg:    'bg-red-500/10',
    headerBd:    'border-red-500/20',
    badgeOn:     'bg-red-500 text-white',
    accentText:  'text-red-400',
    warnColor:   'text-red-300',
  },
  {
    id:          'whatsappMessage',
    name:        'WhatsApp',
    icon:        '💬',
    limit:       null,
    isThread:    false,
    cardBorder:  'border-green-500/30',
    headerBg:    'bg-green-500/10',
    headerBd:    'border-green-500/20',
    badgeOn:     'bg-green-500 text-white',
    accentText:  'text-green-400',
    warnColor:   'text-green-300',
  },
  {
    id:          'linkedinPost',
    name:        'LinkedIn',
    icon:        '💼',
    limit:       3000,
    isThread:    false,
    cardBorder:  'border-blue-500/30',
    headerBg:    'bg-blue-500/10',
    headerBd:    'border-blue-500/20',
    badgeOn:     'bg-blue-600 text-white',
    accentText:  'text-blue-400',
    warnColor:   'text-blue-300',
  },
  {
    id:          'twitterThread',
    name:        'Twitter / X',
    icon:        '🐦',
    limit:       280,
    isThread:    true,
    cardBorder:  'border-sky-500/30',
    headerBg:    'bg-sky-500/10',
    headerBd:    'border-sky-500/20',
    badgeOn:     'bg-sky-500 text-white',
    accentText:  'text-sky-400',
    warnColor:   'text-sky-300',
  },
]

// ── localStorage ──────────────────────────────────────────────────────────────
const HIST_KEY   = 'awe_social_blast_history'
const DRAFTS_KEY = 'awe_content_drafts'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]') } catch { return [] }
}
function saveHistory(entry) {
  const h    = loadHistory()
  const next = [{ ...entry, savedAt: new Date().toISOString() }, ...h].slice(0, 10)
  try { localStorage.setItem(HIST_KEY, JSON.stringify(next)) } catch {}
  return next
}
function loadBlogDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch { return [] }
}

// ── Convert Claude JSON → editable content strings ────────────────────────────
function rawToContents(data) {
  const r = data.redditPost      || {}
  const q = data.quoraAnswer     || {}
  const p = data.pinterestPin    || {}
  const w = data.whatsappMessage || {}
  const l = data.linkedinPost    || {}
  const t = data.twitterThread   || []
  return {
    redditPost:      [r.subreddit ? `Subreddit: r/${r.subreddit}` : '', r.title || '', r.body || ''].filter(Boolean).join('\n\n'),
    quoraAnswer:     [q.question ? `Q: ${q.question}` : '', q.answer || ''].filter(Boolean).join('\n\n'),
    pinterestPin:    [p.title || '', p.description || '', (p.hashtags || []).join(' ')].filter(Boolean).join('\n\n'),
    whatsappMessage: w.text || '',
    linkedinPost:    l.text || '',
    twitterThread:   [t[0]?.tweet || '', t[1]?.tweet || '', t[2]?.tweet || ''],
  }
}

const TWEET_LABELS = ['Hook', 'Value', 'CTA']

// ── Single platform card ──────────────────────────────────────────────────────
function PlatformCard({ p, content, onContentChange, enabled, onToggle }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const text = p.isThread ? content.join('\n\n——\n\n') : content
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charCount = p.isThread
    ? Math.max(...content.map(t => t.length))
    : content.length

  const isOver = p.limit && charCount > p.limit

  return (
    <div className={`bg-gray-800 border rounded-2xl overflow-hidden flex flex-col transition-opacity ${p.cardBorder} ${!enabled ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${p.headerBg} border-b ${p.headerBd}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{p.icon}</span>
          <span className={`text-sm font-bold ${p.accentText}`}>{p.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {p.isThread && <span className="text-[10px] text-gray-500">3 tweets</span>}
          <button
            onClick={onToggle}
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors ${
              enabled ? p.badgeOn : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {p.isThread ? (
          /* Twitter thread: 3 separate textareas */
          <div className="flex flex-col gap-3">
            {content.map((tweet, i) => {
              const over = tweet.length > 280
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                      Tweet {i + 1} — {TWEET_LABELS[i]}
                    </span>
                    <span className={`text-[10px] font-bold ${over ? 'text-red-400' : tweet.length > 250 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {tweet.length} / 280
                    </span>
                  </div>
                  <textarea
                    value={tweet}
                    onChange={e => {
                      const updated = [...content]
                      updated[i] = e.target.value
                      onContentChange(updated)
                    }}
                    disabled={!enabled}
                    rows={3}
                    className={`w-full bg-gray-900 border rounded-xl px-3 py-2.5 text-xs text-gray-200 resize-none focus:outline-none transition leading-relaxed ${
                      over ? 'border-red-500/60 focus:border-red-500' : 'border-gray-700 focus:border-sky-500'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          /* Single textarea */
          <textarea
            value={content}
            onChange={e => onContentChange(e.target.value)}
            disabled={!enabled}
            rows={7}
            className={`w-full bg-gray-900 border rounded-xl px-3 py-2.5 text-xs text-gray-200 resize-none focus:outline-none transition leading-relaxed flex-1 ${
              isOver ? 'border-red-500/60 focus:border-red-500' : 'border-gray-700 focus:border-orange-500'
            }`}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {!p.isThread && (
            <span className={`text-[10px] font-medium ${isOver ? 'text-red-400' : 'text-gray-600'}`}>
              {content.length}{p.limit ? ` / ${p.limit}` : ''} chars
            </span>
          )}
          {p.isThread && <span className="text-[10px] text-gray-600">Each tweet ≤ 280 chars</span>}
          <button
            onClick={handleCopy}
            disabled={!enabled}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 ${
              copied ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Audience options ──────────────────────────────────────────────────────────
const AUDIENCES = ['General', 'Students', 'Professionals', 'Freelancers']

// ── Main component ────────────────────────────────────────────────────────────
export default function SocialBlast() {
  const [articleTitle, setArticleTitle] = useState('')
  const [articleUrl, setArticleUrl]     = useState('')
  const [toolName, setToolName]         = useState('')
  const [toolSlug, setToolSlug]         = useState('')
  const [audience, setAudience]         = useState('General')
  const [selectedDraft, setSelectedDraft] = useState('')

  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const [contents, setContents]         = useState({
    redditPost: '', quoraAnswer: '', pinterestPin: '',
    whatsappMessage: '', linkedinPost: '', twitterThread: ['', '', ''],
  })
  const [enabled, setEnabled]           = useState(
    Object.fromEntries(PLATFORMS.map(p => [p.id, true]))
  )
  const [hasData, setHasData]           = useState(false)

  const [history, setHistory]           = useState(loadHistory)
  const [histOpen, setHistOpen]         = useState(false)
  const [copyAllMsg, setCopyAllMsg]     = useState('')

  const blogDrafts = loadBlogDrafts()

  // ── Import from Blog Writer draft ─────────────────────────────────────────
  function importDraft(idx) {
    if (idx === '') { setSelectedDraft(''); return }
    const draft = blogDrafts[Number(idx)]
    if (!draft) return
    setSelectedDraft(idx)
    setArticleTitle(draft.title || draft.keyword || '')
    setArticleUrl(draft.slug ? `https://www.awe-os.com/blog/${draft.slug}` : '')
    setToolName(draft.toolName || '')
    setToolSlug(draft.toolSlug || '')
  }

  // ── Toggle platform ───────────────────────────────────────────────────────
  function togglePlatform(id) {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ── Update content for a platform ─────────────────────────────────────────
  function updateContent(id, value) {
    setContents(prev => ({ ...prev, [id]: value }))
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  async function generate() {
    if (!articleTitle.trim() || !toolName.trim()) {
      setError('Article title and tool name are required')
      return
    }
    setLoading(true); setError(''); setHasData(false)
    try {
      const res = await api.post('/api/admin/social-blast-claude', {
        articleTitle: articleTitle.trim(),
        articleUrl:   articleUrl.trim() || undefined,
        toolName:     toolName.trim(),
        toolSlug:     toolSlug.trim() || undefined,
        audience,
      })
      const parsed = rawToContents(res.data)
      setContents(parsed)
      setEnabled(Object.fromEntries(PLATFORMS.map(p => [p.id, true])))
      setHasData(true)
      const entry = { articleTitle: articleTitle.trim(), toolName: toolName.trim(), audience, contents: parsed }
      setHistory(saveHistory(entry))
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Copy All ──────────────────────────────────────────────────────────────
  function copyAll() {
    const sections = PLATFORMS
      .filter(p => enabled[p.id])
      .map(p => {
        const c = contents[p.id]
        const text = p.isThread
          ? c.map((t, i) => `Tweet ${i + 1} (${TWEET_LABELS[i]}): ${t}`).join('\n\n')
          : c
        return `${'═'.repeat(40)}\n${p.icon} ${p.name.toUpperCase()}\n${'═'.repeat(40)}\n\n${text}`
      })
      .join('\n\n\n')
    navigator.clipboard.writeText(sections).catch(() => {})
    setCopyAllMsg('All Copied! ✓')
    setTimeout(() => setCopyAllMsg(''), 2500)
  }

  // ── Load from history ─────────────────────────────────────────────────────
  function loadHistoryEntry(entry) {
    setArticleTitle(entry.articleTitle || '')
    setToolName(entry.toolName || '')
    setAudience(entry.audience || 'General')
    if (entry.contents) {
      setContents(entry.contents)
      setEnabled(Object.fromEntries(PLATFORMS.map(p => [p.id, true])))
      setHasData(true)
    }
    setHistOpen(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* ── Config panel ────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>📡</span> Social Blast
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          One Claude call → content for Reddit, Quora, Pinterest, WhatsApp, LinkedIn, and Twitter/X
        </p>

        {/* Blog Writer import */}
        {blogDrafts.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Auto-import from Blog Writer drafts
            </label>
            <select
              value={selectedDraft}
              onChange={e => importDraft(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            >
              <option value="">— Select a draft to import —</option>
              {blogDrafts.map((d, i) => (
                <option key={i} value={i}>
                  {d.title || d.keyword || `Draft ${i + 1}`} ({d.toolName})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Article / Page Title *</label>
            <input
              type="text"
              value={articleTitle}
              onChange={e => setArticleTitle(e.target.value)}
              placeholder="e.g. How to Merge PDF Files Free"
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Content URL</label>
            <input
              type="url"
              value={articleUrl}
              onChange={e => setArticleUrl(e.target.value)}
              placeholder="https://www.awe-os.com/blog/..."
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">AWE-OS Tool Name *</label>
            <input
              type="text"
              value={toolName}
              onChange={e => setToolName(e.target.value)}
              placeholder="e.g. Merge PDF"
              className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Audience</label>
            <div className="flex gap-2">
              {AUDIENCES.map(a => (
                <button
                  key={a}
                  onClick={() => setAudience(a)}
                  className={`flex-1 text-xs py-2.5 rounded-xl font-semibold border transition-colors ${
                    audience === a
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating all 6 platforms…</>
            : '📡 Generate Social Blast'}
        </button>

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* ── Platform cards grid ──────────────────────────────────────────── */}
      {hasData && (
        <>
          {/* Copy All bar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {PLATFORMS.filter(p => enabled[p.id]).length} of {PLATFORMS.length} platforms enabled
            </p>
            <button
              onClick={copyAll}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              {copyAllMsg || '📋 Copy All'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {PLATFORMS.map(p => (
              <PlatformCard
                key={p.id}
                p={p}
                content={contents[p.id]}
                onContentChange={val => updateContent(p.id, val)}
                enabled={enabled[p.id]}
                onToggle={() => togglePlatform(p.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── History ──────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              🕐 Blast History
              <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {history.length}
              </span>
            </span>
            <span className={`text-gray-500 transition-transform duration-200 ${histOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {histOpen && (
            <div className="border-t border-gray-700 divide-y divide-gray-700/50">
              {history.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => loadHistoryEntry(entry)}
                  className="w-full text-left px-5 py-3 hover:bg-gray-700/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{entry.articleTitle}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {entry.toolName} · {entry.audience}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-600 shrink-0">
                    {new Date(entry.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
