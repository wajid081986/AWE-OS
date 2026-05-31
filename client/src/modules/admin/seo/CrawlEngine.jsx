import { useState, useRef } from 'react'
import api from '../../../services/api.service'

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADE_COLOR = {
  'A+': '#22c55e', A: '#4ade80', 'B+': '#84cc16',
  B:    '#a3e635', C: '#eab308', D:    '#f97316', F: '#ef4444',
}

const SEV_BADGE = {
  error:   'bg-red-900/40 text-red-300 border border-red-700',
  warning: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  info:    'bg-blue-900/40 text-blue-300 border border-blue-700',
}

const SEV_ICON = { error: '🔴', warning: '🟡', info: 'ℹ️' }

const ISSUE_META = {
  THIN_CONTENT:       { label: 'Thin Content',          fix: 'view', btnLabel: 'View & Fix' },
  FEW_INTERNAL_LINKS: { label: 'Few Internal Links',    fix: 'view', btnLabel: 'View Pages' },
  NO_SCHEMA:          { label: 'Missing Schema',         fix: 'view', btnLabel: 'Fix Schema' },
  META_DESC_LONG:     { label: 'Meta Desc Too Long',     fix: 'view', btnLabel: 'Fix Meta' },
  META_DESC_SHORT:    { label: 'Meta Desc Too Short',    fix: 'view', btnLabel: 'Fix Meta' },
  MISSING_META_DESC:  { label: 'Missing Meta Desc',     fix: 'view', btnLabel: 'Fix Meta' },
  MISSING_TITLE:      { label: 'Missing Title',          fix: 'view', btnLabel: 'View Pages' },
  MISSING_H1:         { label: 'Missing H1',             fix: 'view', btnLabel: 'View Pages' },
  NO_CANONICAL:       { label: 'No Canonical Tag',       fix: 'view', btnLabel: 'View Pages' },
  MISSING_ALT:        { label: 'Missing Alt Text',       fix: 'view', btnLabel: 'View Pages' },
  LARGE_PAGE:         { label: 'Large Page Size',        fix: 'view', btnLabel: 'View Pages' },
  MULTIPLE_H1:        { label: 'Multiple H1 Tags',       fix: 'view', btnLabel: 'View Pages' },
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function pathname(url) {
  try { return new URL(url).pathname || '/' } catch { return url }
}

function fmt(n) {
  return n > 0 ? `+${n}` : String(n)
}

function diffColor(change, lowerIsBetter = false) {
  if (change === 0) return 'text-gray-400'
  const improved = lowerIsBetter ? change < 0 : change > 0
  return improved ? 'text-green-400' : 'text-red-400'
}

function diffArrow(change, lowerIsBetter = false) {
  if (change === 0) return '→'
  const improved = lowerIsBetter ? change < 0 : change > 0
  return improved ? '↑' : '↓'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score, grade }) {
  const r      = 44
  const circ   = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = GRADE_COLOR[grade] || '#6b7280'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#374151" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="55" y="50" textAnchor="middle" fill={color}
          fontSize={grade.length > 1 ? '18' : '22'} fontWeight="bold" dominantBaseline="middle">
          {grade}
        </text>
        <text x="55" y="70" textAnchor="middle" fill="#9ca3af" fontSize="13">{score}/100</text>
      </svg>
      <span className="text-xs text-gray-400">Site Health</span>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function ScoreBar({ label, score, max, detail }) {
  const pct   = Math.round((score / max) * 100)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="grid grid-cols-[140px_1fr_70px] gap-3 items-center">
      <span className="text-xs text-gray-400 text-right truncate" title={label}>{label}</span>
      <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 text-right font-mono">{score}/{max}</span>
    </div>
  )
}

function IssueModal({ issue, pages, onClose }) {
  if (!issue) return null

  const type = issue.type
  const affectedPages = pages.filter(p => {
    if (type === 'THIN_CONTENT')       return (p.wordCount || 0) < 300
    if (type === 'FEW_INTERNAL_LINKS') return (p.internalLinks || 0) < 3
    if (type === 'NO_SCHEMA')          return !p.hasSchema
    return (issue.urls || []).includes(p.url)
  }).sort((a, b) => (a.pageScore || 0) - (b.pageScore || 0))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h3 className="text-white font-semibold">{ISSUE_META[type]?.label || type}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{affectedPages.length} affected pages</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {affectedPages.length === 0 ? (
            <p className="p-5 text-gray-500 text-sm">No matching pages found in crawl data</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-400 text-xs">URL</th>
                  {type === 'THIN_CONTENT'       && <th className="px-4 py-2.5 text-right text-gray-400 text-xs">Words</th>}
                  {type === 'FEW_INTERNAL_LINKS' && <th className="px-4 py-2.5 text-right text-gray-400 text-xs">Links</th>}
                  {type === 'NO_SCHEMA'          && <th className="px-4 py-2.5 text-center text-gray-400 text-xs">Schema</th>}
                  <th className="px-4 py-2.5 text-right text-gray-400 text-xs">Score</th>
                  <th className="px-4 py-2.5 text-right text-gray-400 text-xs">Action</th>
                </tr>
              </thead>
              <tbody>
                {affectedPages.map(p => (
                  <tr key={p.url} className="border-t border-gray-700/50 hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-[240px] truncate" title={p.url}>
                      {pathname(p.url)}
                    </td>
                    {type === 'THIN_CONTENT' && (
                      <td className="px-4 py-3 text-red-400 text-xs text-right font-mono">{p.wordCount ?? '—'}</td>
                    )}
                    {type === 'FEW_INTERNAL_LINKS' && (
                      <td className="px-4 py-3 text-yellow-400 text-xs text-right font-mono">{p.internalLinks ?? '—'}</td>
                    )}
                    {type === 'NO_SCHEMA' && (
                      <td className="px-4 py-3 text-center text-xs">❌</td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold ${
                        (p.pageScore || 0) >= 70 ? 'text-green-400' :
                        (p.pageScore || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{p.pageScore ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                        View →
                      </a>
                    </td>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function CrawlEngine() {
  const [url,           setUrl]           = useState('https://www.awe-os.com')
  const [maxPages,      setMaxPages]      = useState(200)
  const [maxDepth,      setMaxDepth]      = useState(3)
  const [followSitemap, setFollowSitemap] = useState(true)
  const [delayMs,       setDelayMs]       = useState(300)
  const [showOpts,      setShowOpts]      = useState(false)
  const [crawling,      setCrawling]      = useState(false)
  const [report,        setReport]        = useState(null)
  const [error,         setError]         = useState(null)
  const [elapsed,       setElapsed]       = useState(0)
  const [progress,      setProgress]      = useState(null)
  const [pageFilter,    setPageFilter]    = useState('all')
  const [issueModal,    setIssueModal]    = useState(null)
  const [prevSnap,      setPrevSnap]      = useState(null)
  const [gscMsg,        setGscMsg]        = useState(null)

  const timerRef  = useRef(null)
  const pollRef   = useRef(null)
  const cancelRef = useRef(false)

  // ── Start crawl ─────────────────────────────────────────────────────────────

  async function startCrawl() {
    if (!url.trim()) return
    setError(null)
    setReport(null)
    setProgress(null)
    setGscMsg(null)
    setCrawling(true)
    setElapsed(0)
    setPageFilter('all')
    cancelRef.current = false

    // Persist current report as previous snapshot before overwriting
    if (report?.summary) {
      const snap = {
        score:      report.summary.score,
        grade:      report.summary.grade,
        totalPages: report.summary.totalPages,
        avgWords:   report.averages?.words || 0,
        thinCount:  (report.issues || []).find(i => i.type === 'THIN_CONTENT')?.count || 0,
        warnings:   report.summary.warningCount,
        crawledAt:  report.metadata?.crawledAt,
      }
      try { localStorage.setItem('awe_crawl_prev', JSON.stringify(snap)) } catch {}
    }
    try {
      const raw = localStorage.getItem('awe_crawl_prev')
      if (raw) setPrevSnap(JSON.parse(raw))
    } catch {}

    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500)

    try {
      const startRes = await api.post('/api/admin/seo/crawl-start', {
        url: url.trim(), maxPages, maxDepth, followSitemap, delayMs,
      })
      const jobId = startRes.data.jobId

      await new Promise((resolve, reject) => {
        pollRef.current = setInterval(async () => {
          if (cancelRef.current) { clearInterval(pollRef.current); reject(new Error('Cancelled')); return }
          try {
            const res = await api.get(`/api/admin/seo/crawl-status/${jobId}`)
            const { status, progress: p, report: r, error: e } = res.data
            if (p) setProgress(p)
            if (status === 'done')  { clearInterval(pollRef.current); setReport(r); resolve() }
            if (status === 'error') { clearInterval(pollRef.current); reject(new Error(e || 'Crawl failed')) }
          } catch (err) {
            clearInterval(pollRef.current); reject(err)
          }
        }, 2000)
      })
    } catch (err) {
      if (!cancelRef.current) {
        setError(err.response?.data?.error || err.message || 'Crawl failed')
      }
    } finally {
      clearInterval(timerRef.current)
      setCrawling(false)
    }
  }

  function cancelCrawl() {
    cancelRef.current = true
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
    setCrawling(false)
    setProgress(null)
  }

  async function submitOrphansToGSC(orphanUrls) {
    setGscMsg('Submitting…')
    try {
      const res = await api.post('/api/admin/seo/submit-orphans-gsc', { urls: orphanUrls })
      setGscMsg(`✅ Submitted ${res.data.submitted} URLs to GSC index queue`)
    } catch (err) {
      setGscMsg(`❌ ${err.response?.data?.error || err.message}`)
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const summary   = report?.summary
  const breakdown = report?.scoreBreakdown
  const graph     = report?.graph
  const issues    = report?.issues || []
  const pages     = report?.pages  || []

  const sortedPages = [...pages].sort((a, b) => (a.pageScore || 0) - (b.pageScore || 0))
  const filteredPages = sortedPages.filter(p => {
    if (pageFilter === 'critical') return (p.pageScore || 0) < 50
    if (pageFilter === 'low')      return (p.pageScore || 0) >= 50 && (p.pageScore || 0) < 70
    if (pageFilter === 'good')     return (p.pageScore || 0) >= 70
    return true
  })

  const progressPct = progress
    ? Math.min(100, Math.round((progress.current / Math.max(progress.total, 1)) * 100))
    : 0

  const criticalCount = sortedPages.filter(p => (p.pageScore || 0) < 50).length
  const lowCount      = sortedPages.filter(p => (p.pageScore || 0) >= 50 && (p.pageScore || 0) < 70).length
  const goodCount     = sortedPages.filter(p => (p.pageScore || 0) >= 70).length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Crawl Engine</h1>
      <p className="text-gray-400 text-sm mb-6">
        Sitemap-first crawl — audits SEO health, link graph, and content quality for every page.
      </p>

      {/* ── URL + Options ──────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com" disabled={crawling}
            className="flex-1 min-w-[260px] bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5
              text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
          />
          {!crawling ? (
            <button onClick={startCrawl}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Start Crawl
            </button>
          ) : (
            <button onClick={cancelCrawl}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          )}
          <button onClick={() => setShowOpts(v => !v)}
            className="shrink-0 text-gray-400 hover:text-white text-sm px-3 py-2.5 border border-gray-600 rounded-lg transition-colors">
            {showOpts ? '▲ Options' : '▼ Options'}
          </button>
        </div>

        {showOpts && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Pages: {maxPages}</label>
              <input type="range" min="20" max="300" step="10" value={maxPages}
                onChange={e => setMaxPages(Number(e.target.value))}
                className="w-full accent-indigo-500" />
              <span className="text-xs text-gray-600">20–300</span>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Depth</label>
              <select value={maxDepth} onChange={e => setMaxDepth(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                {[1,2,3,4,5].map(d => <option key={d} value={d}>Depth {d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Crawl Delay</label>
              <select value={delayMs} onChange={e => setDelayMs(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                <option value={200}>200ms (fast)</option>
                <option value={300}>300ms (normal)</option>
                <option value={500}>500ms (polite)</option>
                <option value={1000}>1000ms (slow)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="sitemap" checked={followSitemap}
                onChange={e => setFollowSitemap(e.target.checked)}
                className="accent-indigo-500 w-4 h-4" />
              <label htmlFor="sitemap" className="text-xs text-gray-300">Follow Sitemap</label>
            </div>
          </div>
        )}
      </div>

      {/* ── Real-time progress ─────────────────────────────────────────────── */}
      {crawling && (
        <div className="bg-gray-800 border border-indigo-700 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-indigo-300 text-sm font-semibold tracking-wide">CRAWLING IN PROGRESS</span>
            <span className="text-gray-400 text-xs">{elapsed}s elapsed</span>
          </div>

          <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress ? progressPct : 100}%` }} />
          </div>

          {progress ? (
            <>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span className="font-mono">{progress.current} / {progress.total} pages</span>
                <span>{progress.speed} pages/sec</span>
              </div>
              <p className="text-xs text-gray-500 truncate mb-3">
                Currently: <span className="text-gray-300">{progress.url || '…'}</span>
              </p>
              <div className="flex gap-5 text-xs">
                <span className="text-red-400">🔴 Thin content: {progress.thinCount}</span>
                <span className="text-green-400">🟢 Good pages: {progress.goodCount}</span>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-xs mt-2 animate-pulse">
              Starting crawl… reading sitemap
            </p>
          )}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4 text-red-300 text-sm">{error}</div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {report && summary && (
        <>
          {/* Score + stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
            <div className="sm:col-span-1 bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-center">
              <ScoreRing score={summary.score} grade={summary.grade} />
            </div>
            <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Pages Crawled"  value={summary.totalPages} sub={`${report.averages?.crawlTime}ms avg`} />
              <StatCard label="Errors"         value={summary.errorCount}   color="text-red-400" />
              <StatCard label="Warnings"       value={summary.warningCount} color="text-yellow-400" />
              <StatCard label="Avg Words"      value={report.averages?.words} sub={`${summary.schemaCount} with schema`} />
            </div>
          </div>

          {/* Score breakdown — Upgrade 2 */}
          {breakdown && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-4">Score Breakdown</h2>
              <div className="space-y-3">
                {Object.values(breakdown).map(item => (
                  <div key={item.label}>
                    <ScoreBar label={item.label} score={item.score} max={item.max} />
                    <p className="text-xs text-gray-600 text-right mt-0.5">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-[140px_1fr_70px] gap-3 items-center">
                <span className="text-xs text-white text-right font-semibold">TOTAL</span>
                <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${summary.score}%` }} />
                </div>
                <span className="text-xs text-white text-right font-semibold font-mono">
                  {summary.score}/100
                </span>
              </div>
            </div>
          )}

          {/* Crawl comparison — Upgrade 6 */}
          {prevSnap && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
              <h2 className="text-sm font-semibold text-white mb-3">Crawl Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs">
                      <th className="text-left pb-2">Metric</th>
                      <th className="text-right pb-2">Previous</th>
                      <th className="text-right pb-2">Current</th>
                      <th className="text-right pb-2">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/40">
                    {[
                      { label: 'Score',        prev: prevSnap.score,      curr: summary.score,            li: false },
                      { label: 'Pages',        prev: prevSnap.totalPages, curr: summary.totalPages,       li: false },
                      { label: 'Avg Words',    prev: prevSnap.avgWords,   curr: report.averages?.words,   li: false },
                      { label: 'Thin Content', prev: prevSnap.thinCount,  curr: (issues.find(i => i.type === 'THIN_CONTENT')?.count || 0), li: true },
                      { label: 'Warnings',     prev: prevSnap.warnings,   curr: summary.warningCount,     li: true },
                    ].map(row => {
                      const change = (row.curr || 0) - (row.prev || 0)
                      return (
                        <tr key={row.label}>
                          <td className="py-2 text-gray-300 text-xs">{row.label}</td>
                          <td className="py-2 text-right text-gray-500 text-xs font-mono">{row.prev ?? '—'}</td>
                          <td className="py-2 text-right text-white text-xs font-mono">{row.curr ?? '—'}</td>
                          <td className={`py-2 text-right text-xs font-semibold ${diffColor(change, row.li)}`}>
                            {change === 0 ? '→ 0' : `${diffArrow(change, row.li)} ${Math.abs(change)}`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Graph insights */}
          {graph && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Orphan pages — Upgrade 4 */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Orphan Pages ({graph.orphanPages?.length || 0})
                </h3>
                {graph.orphanPages?.length > 0 ? (
                  <>
                    <ul className="space-y-1 mb-3">
                      {graph.orphanPages.slice(0, 5).map(u => (
                        <li key={u} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400 truncate flex-1" title={u}>{pathname(u)}</span>
                          <a href={u} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0">→</a>
                        </li>
                      ))}
                      {graph.orphanPages.length > 5 && (
                        <li className="text-xs text-gray-500">+{graph.orphanPages.length - 5} more</li>
                      )}
                    </ul>
                    <div className="space-y-2">
                      <button
                        onClick={() => submitOrphansToGSC(graph.orphanPages)}
                        className="w-full text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300
                          border border-indigo-700 rounded-lg px-3 py-1.5 transition-colors">
                        Submit All to GSC Index Queue
                      </button>
                    </div>
                    {gscMsg && <p className="text-xs mt-2 text-gray-400">{gscMsg}</p>}
                  </>
                ) : (
                  <p className="text-xs text-gray-500">None found — great internal linking!</p>
                )}
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">High Authority Pages</h3>
                {graph.highAuthorityPages?.length > 0 ? (
                  <ul className="space-y-1">
                    {graph.highAuthorityPages.slice(0, 5).map(p => (
                      <li key={p.url} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate flex-1 mr-2" title={p.url}>{pathname(p.url)}</span>
                        <span className="text-indigo-400 shrink-0">{p.inboundLinks} links</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-500">None found</p>}
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Deep Pages (&gt; depth {maxDepth}) ({graph.deepPages?.length || 0})
                </h3>
                {graph.deepPages?.length > 0 ? (
                  <ul className="space-y-1">
                    {graph.deepPages.slice(0, 5).map(p => (
                      <li key={p.url} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate flex-1 mr-2">{pathname(p.url)}</span>
                        <span className="text-gray-500 shrink-0">d{p.depth}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-500">None found</p>}
              </div>
            </div>
          )}

          {/* Issues with fix buttons — Upgrade 3 */}
          {issues.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl mb-4 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white">Issues Found ({issues.length} types)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs w-16">Severity</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Issue</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs w-24">Pages</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Sample URLs</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs w-28">Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map(issue => (
                      <tr key={issue.type} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_BADGE[issue.severity] || SEV_BADGE.info}`}>
                            {SEV_ICON[issue.severity]} {issue.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                          {ISSUE_META[issue.type]?.label || issue.type}
                        </td>
                        <td className="px-4 py-3 text-white font-semibold text-sm">{issue.count}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {(issue.urls || []).slice(0, 2).map(u => (
                              <p key={u} className="text-gray-500 text-xs truncate max-w-[200px]" title={u}>
                                {pathname(u)}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setIssueModal(issue)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700/50
                              hover:border-indigo-500 rounded px-2 py-1 transition-colors">
                            {ISSUE_META[issue.type]?.btnLabel || 'View Pages'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advanced pages table — Upgrade 5 */}
          {pages.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-sm font-semibold text-white">
                  Crawled Pages ({pages.length}) — sorted by score ↑
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all',      label: `All (${pages.length})` },
                    { key: 'critical', label: `🔴 Critical <50 (${criticalCount})` },
                    { key: 'low',      label: `🟡 Low 50–70 (${lowCount})` },
                    { key: 'good',     label: `🟢 Good 70+ (${goodCount})` },
                  ].map(f => (
                    <button key={f.key} onClick={() => setPageFilter(f.key)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        pageFilter === f.key
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-gray-600 text-gray-400 hover:text-white'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">URL</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Words</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Issues</th>
                      <th className="px-4 py-2.5 text-center text-gray-400 font-medium text-xs">Schema</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Links</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Score</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPages.map(page => {
                      const ps = page.pageScore || 0
                      const scoreColor = ps >= 70 ? 'text-green-400' : ps >= 50 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <tr key={page.url} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 text-gray-300 text-xs max-w-[220px] truncate" title={page.url}>
                            <a href={page.url} target="_blank" rel="noopener noreferrer"
                              className="hover:text-indigo-400 transition-colors">
                              {pathname(page.url)}
                            </a>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-mono ${(page.wordCount || 0) < 300 ? 'text-red-400' : 'text-gray-400'}`}>
                              {page.wordCount ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-semibold ${page.issues > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {page.issues}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs">
                            {page.hasSchema ? '✅' : '❌'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-mono ${(page.internalLinks || 0) < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {page.internalLinks ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-bold ${scoreColor}`}>{ps}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs text-right">{page.crawlTime}ms</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredPages.length === 0 && (
                  <p className="p-5 text-center text-gray-500 text-sm">
                    No pages match this filter.
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-600 mt-4 text-right">
            Crawled {report.metadata?.crawledAt ? new Date(report.metadata.crawledAt).toLocaleString() : ''}
            {report.metadata?.sitemapFound && ` · Sitemap: ${report.metadata.sitemapUrlCount} URLs`}
          </p>
        </>
      )}

      {/* Issue detail modal — Upgrade 3 */}
      {issueModal && (
        <IssueModal issue={issueModal} pages={pages} onClose={() => setIssueModal(null)} />
      )}
    </div>
  )
}
