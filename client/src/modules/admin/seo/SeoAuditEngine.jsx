import { useState } from 'react'
import api from '../../../services/api.service'

const GRADE_COLOR = {
  A: 'text-green-400 border-green-500',
  B: 'text-blue-400 border-blue-500',
  C: 'text-yellow-400 border-yellow-500',
  D: 'text-orange-400 border-orange-500',
  F: 'text-red-400 border-red-500',
}

const SEVERITY_STYLE = {
  error:   'bg-red-900/40 border-red-700 text-red-300',
  warning: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
  info:    'bg-blue-900/40 border-blue-700 text-blue-300',
}

const SEVERITY_ICON = { error: '✕', warning: '⚠', info: 'ℹ' }

function ScoreRing({ score, grade }) {
  const color = GRADE_COLOR[grade] || 'text-gray-400 border-gray-500'
  return (
    <div className={`flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 ${color}`}>
      <span className="text-4xl font-bold leading-none">{score}</span>
      <span className="text-sm font-semibold mt-1 opacity-80">Grade {grade}</span>
    </div>
  )
}

function MetaRow({ label, value, length, minLen, maxLen }) {
  const ok = length >= minLen && length <= maxLen
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ok ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          {length} chars
        </span>
      </div>
      <p className="text-xs text-gray-400 truncate">{value || '—'}</p>
    </div>
  )
}

function CheckRow({ label, ok, detail }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <span className={`text-lg w-5 text-center ${ok ? 'text-green-400' : 'text-red-400'}`}>{ok ? '✓' : '✕'}</span>
      <span className="text-sm text-gray-300 flex-1">{label}</span>
      {detail && <span className="text-xs text-gray-500">{detail}</span>}
    </div>
  )
}

export default function SeoAuditEngine() {
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  async function runAudit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await api.post('/api/admin/seo/audit', { url: url.trim() })
      if (res.data.success) setResult(res.data.audit)
      else setError(res.data.error || 'Audit failed')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const a = result

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">SEO Audit Engine</h1>
      <p className="text-gray-400 text-sm mb-6">Fetch any live URL and get an instant on-page SEO score.</p>

      {/* URL input */}
      <form onSubmit={runAudit} className="flex gap-3 mb-8">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.awe-os.com/tools/merge-pdf"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Auditing…' : 'Run Audit'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
          Fetching and analysing page…
        </div>
      )}

      {/* Results */}
      {a && (
        <div className="space-y-6">

          {/* Score + URL */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={a.score} grade={a.grade} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Audited URL</p>
              <a href={a.url} target="_blank" rel="noopener noreferrer"
                className="text-indigo-400 text-sm hover:underline break-all">{a.url}</a>
              <p className="text-gray-400 text-xs mt-3">
                {a.issues.filter(i => i.severity === 'error').length} errors ·{' '}
                {a.issues.filter(i => i.severity === 'warning').length} warnings ·{' '}
                {a.issues.filter(i => i.severity === 'info').length} suggestions
              </p>
            </div>
          </div>

          {/* Meta + Checks grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Title & Meta */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">Title & Meta</h2>
              <MetaRow label="Title" value={a.titleCheck.value} length={a.titleCheck.length} minLen={30} maxLen={60} />
              <MetaRow label="Meta Description" value={a.metaCheck.value} length={a.metaCheck.length} minLen={70} maxLen={160} />
            </div>

            {/* Page signals */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Page Signals</h2>
              <CheckRow label="Single H1 tag"         ok={a.h1Count === 1}    detail={`${a.h1Count} found`} />
              <CheckRow label="H2 subheadings"        ok={a.h2Count > 0}      detail={`${a.h2Count} found`} />
              <CheckRow label="Canonical tag"         ok={a.canonicalPresent} />
              <CheckRow label="Structured data (LD+JSON)" ok={a.schemaPresent} />
              <CheckRow label="Word count ≥ 300"      ok={a.wordCount >= 300} detail={`${a.wordCount} words`} />
              <CheckRow label="Images have alt text"  ok={a.imagesMissingAlt === 0} detail={`${a.imagesMissingAlt} missing`} />
            </div>
          </div>

          {/* Issues */}
          {a.issues.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Issues ({a.issues.length})</h2>
              <div className="space-y-2">
                {a.issues.map((issue, i) => (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs ${SEVERITY_STYLE[issue.severity]}`}>
                    <span className="font-bold mt-0.5 shrink-0">{SEVERITY_ICON[issue.severity]}</span>
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {a.suggestions.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Suggestions</h2>
              <ul className="space-y-2">
                {a.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-indigo-400 shrink-0 mt-0.5">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
