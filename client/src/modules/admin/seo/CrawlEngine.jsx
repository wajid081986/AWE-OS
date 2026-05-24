import { useState, useRef } from 'react'
import api from '../../../services/api.service'

const GRADE_COLOR = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' }
const SEV_BADGE = {
  error:   'bg-red-900/40 text-red-300 border border-red-700',
  warning: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  info:    'bg-blue-900/40 text-blue-300 border border-blue-700',
}

function ScoreRing({ score, grade }) {
  const r       = 44
  const circ    = 2 * Math.PI * r
  const offset  = circ - (score / 100) * circ
  const color   = GRADE_COLOR[grade] || '#6b7280'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="55" y="50" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" dominantBaseline="middle">{grade}</text>
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

export default function CrawlEngine() {
  const [url,           setUrl]           = useState('https://www.awe-os.com')
  const [maxPages,      setMaxPages]      = useState(30)
  const [maxDepth,      setMaxDepth]      = useState(3)
  const [followSitemap, setFollowSitemap] = useState(true)
  const [delayMs,       setDelayMs]       = useState(300)
  const [showOpts,      setShowOpts]      = useState(false)
  const [crawling,      setCrawling]      = useState(false)
  const [report,        setReport]        = useState(null)
  const [error,         setError]         = useState(null)
  const [elapsed,       setElapsed]       = useState(0)
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  async function startCrawl() {
    if (!url.trim()) return
    setError(null)
    setReport(null)
    setCrawling(true)
    setElapsed(0)

    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500)

    abortRef.current = new AbortController()
    try {
      const res = await api.post('/api/admin/seo/crawl', { url: url.trim(), maxPages, maxDepth, followSitemap }, {
        timeout: 125_000,
        signal:  abortRef.current.signal,
      })
      setReport(res.data.report)
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err.response?.data?.error || err.message || 'Crawl failed')
      }
    } finally {
      clearInterval(timerRef.current)
      setCrawling(false)
    }
  }

  function cancelCrawl() {
    abortRef.current?.abort()
    clearInterval(timerRef.current)
    setCrawling(false)
  }

  const summary = report?.summary
  const graph   = report?.graph
  const issues  = report?.issues  || []
  const pages   = report?.pages   || []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Crawl Engine</h1>
      <p className="text-gray-400 text-sm mb-6">Crawl any website and audit SEO health, link graph, and content quality.</p>

      {/* URL input */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={crawling}
            className="flex-1 min-w-[260px] bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
          />
          {!crawling ? (
            <button
              onClick={startCrawl}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Start Crawl
            </button>
          ) : (
            <button
              onClick={cancelCrawl}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => setShowOpts(v => !v)}
            className="shrink-0 text-gray-400 hover:text-white text-sm px-3 py-2.5 border border-gray-600 rounded-lg transition-colors"
          >
            {showOpts ? '▲ Options' : '▼ Options'}
          </button>
        </div>

        {/* Options panel */}
        {showOpts && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Pages: {maxPages}</label>
              <input type="range" min="5" max="100" step="5" value={maxPages}
                onChange={e => setMaxPages(Number(e.target.value))}
                className="w-full accent-indigo-500" />
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
                <option value={300}>300ms (fast)</option>
                <option value={500}>500ms (normal)</option>
                <option value={1000}>1000ms (polite)</option>
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

      {/* Crawling progress */}
      {crawling && (
        <div className="bg-gray-800 border border-indigo-700 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-indigo-300 text-sm font-medium">Crawling… {elapsed}s elapsed</span>
            <span className="text-gray-400 text-xs">Up to {maxPages} pages, depth {maxDepth}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
          <p className="text-gray-500 text-xs mt-2">robots.txt respected · {delayMs}ms delay · memory-only</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4 text-red-300 text-sm">{error}</div>
      )}

      {/* Results */}
      {report && summary && (
        <>
          {/* Score + stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
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

          {/* Graph insights */}
          {graph && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Orphan Pages ({graph.orphanPages?.length || 0})</h3>
                {graph.orphanPages?.length > 0 ? (
                  <ul className="space-y-1">
                    {graph.orphanPages.slice(0, 5).map(u => (
                      <li key={u} className="text-xs text-gray-400 truncate" title={u}>{u}</li>
                    ))}
                    {graph.orphanPages.length > 5 && <li className="text-xs text-gray-500">+{graph.orphanPages.length - 5} more</li>}
                  </ul>
                ) : <p className="text-xs text-gray-500">None found</p>}
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">High Authority Pages</h3>
                {graph.highAuthorityPages?.length > 0 ? (
                  <ul className="space-y-1">
                    {graph.highAuthorityPages.slice(0, 5).map(p => (
                      <li key={p.url} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate flex-1 mr-2" title={p.url}>{new URL(p.url).pathname}</span>
                        <span className="text-indigo-400 shrink-0">{p.inboundLinks} links</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-500">None found</p>}
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Deep Pages (&gt; depth {maxDepth}) ({graph.deepPages?.length || 0})</h3>
                {graph.deepPages?.length > 0 ? (
                  <ul className="space-y-1">
                    {graph.deepPages.slice(0, 5).map(p => (
                      <li key={p.url} className="flex justify-between text-xs">
                        <span className="text-gray-400 truncate flex-1 mr-2">{new URL(p.url).pathname}</span>
                        <span className="text-gray-500 shrink-0">d{p.depth}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-500">None found</p>}
              </div>
            </div>
          )}

          {/* Issues table */}
          {issues.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl mb-6 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white">Issues Found ({issues.length} types)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Severity</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Issue</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Affected Pages</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Sample URLs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map(issue => (
                      <tr key={issue.type} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_BADGE[issue.severity] || SEV_BADGE.info}`}>
                            {issue.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">{issue.type}</td>
                        <td className="px-4 py-3 text-white font-semibold">{issue.count}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {(issue.urls || []).slice(0, 2).map(u => (
                              <p key={u} className="text-gray-500 text-xs truncate max-w-[260px]" title={u}>{u}</p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pages table */}
          {pages.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white">Crawled Pages ({pages.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/50">
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">URL</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Status</th>
                      <th className="px-4 py-2.5 text-left text-gray-400 font-medium text-xs">Title</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Words</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Issues</th>
                      <th className="px-4 py-2.5 text-right text-gray-400 font-medium text-xs">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map(page => (
                      <tr key={page.url} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-300 text-xs max-w-[200px] truncate" title={page.url}>
                          {new URL(page.url).pathname || '/'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono ${
                            page.error         ? 'text-red-400' :
                            page.status >= 400 ? 'text-red-400' :
                            page.status >= 300 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {page.error ? 'ERR' : page.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate" title={page.title || ''}>
                          {page.title || <span className="text-red-400 italic">missing</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs text-right">{page.wordCount ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold ${page.issues > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {page.issues}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs text-right">{page.crawlTime}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metadata footer */}
          <p className="text-xs text-gray-600 mt-4 text-right">
            Crawled {report.metadata?.crawledAt ? new Date(report.metadata.crawledAt).toLocaleString() : ''}
          </p>
        </>
      )}
    </div>
  )
}
