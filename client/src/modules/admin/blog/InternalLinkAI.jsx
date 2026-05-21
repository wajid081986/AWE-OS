import { useState } from 'react'
import api from '../../../services/api.service'

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="shrink-0 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded">
      {copied ? '✓' : '📋'}
    </button>
  )
}

// ── Link card ──────────────────────────────────────────────────────────────────

function LinkCard({ item, type }) {
  const html = type === 'tool'
    ? `<a href="${item.url}" title="${item.anchorText}">${item.anchorText}</a>`
    : `<a href="${item.url}">${item.anchorText}</a>`

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-300 truncate">{item.anchorText}</p>
          <p className="text-xs text-gray-500 truncate">{item.url}</p>
        </div>
        <CopyBtn text={html} />
      </div>
      {item.context && (
        <p className="text-xs text-gray-400 italic leading-relaxed">"{item.context}"</p>
      )}
      {item.reason && (
        <p className="text-xs text-green-400">→ {item.reason}</p>
      )}
    </div>
  )
}

// ── Gap card ───────────────────────────────────────────────────────────────────

function GapCard({ gap, onWrite }) {
  return (
    <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-xs font-semibold text-yellow-300">{gap.topic}</p>
        {onWrite && (
          <button
            onClick={() => onWrite(gap.topic)}
            className="shrink-0 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
          >
            ✍ Write
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{gap.reason}</p>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, count, color = 'indigo', children }) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-900/20 border-indigo-800/50',
    purple: 'text-purple-400 bg-purple-900/20 border-purple-800/50',
    yellow: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50',
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        {count !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[color]}`}>{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function InternalLinkAI({ onWriteIdea }) {
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('tools')

  async function handleAnalyze() {
    if (!text.trim()) { setError('Paste article text first.'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await api.post('/api/admin/blog/internal-links', { articleText: text })
      if (res.data.success) {
        setResult(res.data.result)
        setTab('tools')
      } else {
        setError(res.data.error)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const toolLinks = result?.toolLinks || []
  const blogLinks = result?.blogLinks || []
  const gaps      = result?.contentGaps || []

  const tabs = [
    { id: 'tools', label: `🔧 Tool Links (${toolLinks.length})` },
    { id: 'blogs', label: `📝 Blog Links (${blogLinks.length})` },
    { id: 'gaps',  label: `💡 Content Gaps (${gaps.length})` },
  ]

  return (
    <div className="space-y-5">

      {/* Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Article Text</label>
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={7}
            placeholder="Paste your article text here — AI will find internal link opportunities and content gaps..."
            style={{ minHeight: 180 }}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
        <button
          onClick={handleAnalyze} disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner /> Analysing links…</> : '🔗 Find Internal Links'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tool Links',    count: toolLinks.length, color: 'text-indigo-400' },
              { label: 'Blog Links',    count: blogLinks.length, color: 'text-purple-400' },
              { label: 'Content Gaps', count: gaps.length,       color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tool links tab */}
          {tab === 'tools' && (
            <Section title="Suggested Tool Links" count={toolLinks.length} color="indigo">
              {toolLinks.length === 0
                ? <p className="text-sm text-gray-500 text-center py-4">No tool link opportunities found.</p>
                : <div className="space-y-2">
                    {toolLinks.map((item, i) => <LinkCard key={i} item={item} type="tool" />)}
                  </div>
              }
            </Section>
          )}

          {/* Blog links tab */}
          {tab === 'blogs' && (
            <Section title="Suggested Blog Links" count={blogLinks.length} color="purple">
              {blogLinks.length === 0
                ? <p className="text-sm text-gray-500 text-center py-4">No blog link opportunities found.</p>
                : <div className="space-y-2">
                    {blogLinks.map((item, i) => <LinkCard key={i} item={item} type="blog" />)}
                  </div>
              }
            </Section>
          )}

          {/* Gaps tab */}
          {tab === 'gaps' && (
            <Section title="Content Gap Opportunities" count={gaps.length} color="yellow">
              {gaps.length === 0
                ? <p className="text-sm text-gray-500 text-center py-4">No content gaps detected.</p>
                : <div className="space-y-2">
                    {gaps.map((gap, i) => (
                      <GapCard
                        key={i} gap={gap}
                        onWrite={onWriteIdea ? () => onWriteIdea(gap.topic) : null}
                      />
                    ))}
                  </div>
              }
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
