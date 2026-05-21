import { useState } from 'react'
import api from '../../../services/api.service'

// ── Score circle ──────────────────────────────────────────────────────────────

function ScoreCircle({ score }) {
  const color   = score > 70 ? '#22c55e' : score > 40 ? '#eab308' : '#ef4444'
  const tClass  = score > 70 ? 'text-green-400' : score > 40 ? 'text-yellow-400' : 'text-red-400'
  const r       = 42
  const circ    = 2 * Math.PI * r
  const offset  = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#374151" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="55" y="50" textAnchor="middle" dy="0.3em" fill="white" fontSize="22" fontWeight="bold">{score}</text>
        <text x="55" y="70" textAnchor="middle" fill="#9ca3af" fontSize="10">/ 100</text>
      </svg>
      <p className={`text-sm font-semibold ${tClass} mt-1`}>SEO Score</p>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, metric }) {
  if (!metric) return null
  const { score, status, issue, fix, percentage, count, level, h2Count, hasIndianExamples } = metric
  const bg   = status === 'good' ? 'bg-green-900/30 border-green-800' : status === 'warning' ? 'bg-yellow-900/30 border-yellow-800' : 'bg-red-900/30 border-red-800'
  const tc   = status === 'good' ? 'text-green-300' : status === 'warning' ? 'text-yellow-300' : 'text-red-300'
  const bar  = status === 'good' ? 'bg-green-400' : status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
  const badge = status === 'good' ? 'Good' : status === 'warning' ? 'Warning' : 'Poor'

  let detail = ''
  if (percentage !== undefined)         detail = `${Number(percentage).toFixed(1)}%`
  else if (count !== undefined)         detail = String(count)
  else if (level)                       detail = level
  else if (h2Count !== undefined)       detail = `${h2Count} H2s`
  else if (hasIndianExamples !== undefined) detail = hasIndianExamples ? 'Found' : 'Missing'

  return (
    <div className={`border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-white">{label}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tc} bg-black/20`}>{badge}</span>
      </div>
      {detail && <p className="text-lg font-bold text-white mb-1">{detail}</p>}
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
        <div className={`h-1.5 rounded-full transition-all ${bar}`} style={{ width: `${Math.min(score ?? 0, 100)}%` }} />
      </div>
      <p className="text-xs text-gray-400">{issue}</p>
      {fix && <p className="text-xs text-indigo-400 mt-1">→ {fix}</p>}
    </div>
  )
}

const METRIC_LABELS = {
  titleScore:    'Title Score',
  keywordDensity:'Keyword Density',
  headingsScore: 'H2 Headings',
  wordCount:     'Word Count',
  readability:   'Readability',
  internalLinks: 'Internal Links',
  eeat:          'E-E-A-T Signals',
  indianContext: 'Indian Context',
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SeoAuditor() {
  const [title,   setTitle]   = useState('')
  const [keyword, setKeyword] = useState('')
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)
  const [copied,  setCopied]  = useState(null)

  async function handleAnalyze() {
    if (!text.trim()) { setError('Paste article text first.'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await api.post('/api/admin/blog/seo-audit', {
        articleText: text, targetKeyword: keyword, articleTitle: title,
      })
      if (res.data.success) setResult(res.data.result)
      else setError(res.data.error)
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  function copyText(str, key) {
    navigator.clipboard.writeText(str).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 2000)
    })
  }

  const inputCls = 'w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500'

  return (
    <div className="space-y-5">

      {/* ── Input form ── */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Article Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your article title" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Keyword</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="primary keyword" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Article Text</label>
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={7}
            placeholder="Paste the full article text here..."
            style={{ minHeight: 200 }}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
        <button
          onClick={handleAnalyze} disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner /> Analyzing…</> : '📊 Analyze SEO'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-5">

          {/* Score banner */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-8">
            <ScoreCircle score={result.overallScore ?? 0} />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm mb-1">Overall SEO Analysis</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                {(result.overallScore ?? 0) > 70
                  ? 'Strong SEO foundation. Focus on the remaining issues to maximise ranking potential.'
                  : (result.overallScore ?? 0) > 40
                  ? 'Room to improve. Address the warning and poor metrics below for better indexing.'
                  : 'Significant SEO issues detected. Prioritise the red metrics first.'}
              </p>
            </div>
          </div>

          {/* Metrics 2×4 grid */}
          {result.metrics && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Metrics Breakdown</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <MetricCard key={key} label={label} metric={result.metrics[key]} />
                ))}
              </div>
            </div>
          )}

          {/* Top suggestions */}
          {result.topSuggestions?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-white mb-3">🎯 Top Improvements</p>
              <ol className="space-y-2">
                {result.topSuggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Quick wins */}
          {(result.rewrittenTitle || result.improvedMetaDesc) && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
              <p className="text-sm font-semibold text-white">⚡ Quick Wins</p>
              {result.rewrittenTitle && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Rewritten Title</p>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm text-indigo-300 bg-gray-900 rounded-lg px-3 py-2">{result.rewrittenTitle}</p>
                    <button onClick={() => copyText(result.rewrittenTitle, 'title')}
                      className="shrink-0 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                      {copied === 'title' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              )}
              {result.improvedMetaDesc && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Improved Meta Description ({result.improvedMetaDesc.length} chars)</p>
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm text-indigo-300 bg-gray-900 rounded-lg px-3 py-2">{result.improvedMetaDesc}</p>
                    <button onClick={() => copyText(result.improvedMetaDesc, 'meta')}
                      className="shrink-0 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                      {copied === 'meta' ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
