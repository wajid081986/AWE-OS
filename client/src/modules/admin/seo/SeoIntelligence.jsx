import { useState } from 'react'
import api from '../../../services/api.service'

// ── Shared helpers ─────────────────────────────────────────────────────────────

const DIFF_BADGE = {
  low:       'bg-green-900/40 text-green-300 border border-green-700',
  medium:    'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  high:      'bg-red-900/40 text-red-300 border border-red-700',
  very_high: 'bg-purple-900/40 text-purple-300 border border-purple-700',
}
const VOL_BADGE = {
  'low(<1k)':        'bg-gray-700 text-gray-300',
  low:               'bg-gray-700 text-gray-300',
  'medium(1k-10k)':  'bg-blue-900/40 text-blue-300',
  medium:            'bg-blue-900/40 text-blue-300',
  'high(10k-100k)':  'bg-indigo-900/40 text-indigo-300',
  high:              'bg-indigo-900/40 text-indigo-300',
  'very_high(100k+)':'bg-purple-900/40 text-purple-300',
  very_high:         'bg-purple-900/40 text-purple-300',
}
const IMPACT_COLOR = { high: 'text-green-400', medium: 'text-yellow-400', low: 'text-gray-400' }

function Badge({ text, map, fallback = 'bg-gray-700 text-gray-300' }) {
  const cls = map?.[text?.toLowerCase?.()] || fallback
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{text || '—'}</span>
}

function Spinner({ label = 'Thinking…' }) {
  return (
    <div className="flex items-center justify-center py-20 gap-3 text-gray-400 text-sm">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  )
}

function ErrBox({ msg, onRetry }) {
  return (
    <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-center justify-between gap-4">
      <p className="text-red-300 text-sm">{msg}</p>
      {onRetry && <button onClick={onRetry} className="text-xs text-red-400 hover:text-red-300 border border-red-700 px-3 py-1 rounded-lg">Retry</button>}
    </div>
  )
}

function CopyBtn({ data }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-xs text-gray-400 hover:text-white border border-gray-600 px-3 py-1 rounded-lg transition-colors">
      {copied ? '✓ Copied' : 'Copy JSON'}
    </button>
  )
}

// ── Tab 1: Keyword Intelligence ────────────────────────────────────────────────

function KeywordTab() {
  const [seed,       setSeed]       = useState('')
  const [country,    setCountry]    = useState('India')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState(null)
  const [diffKw,     setDiffKw]     = useState('')
  const [diffResult, setDiffResult] = useState(null)
  const [diffLoading,setDiffLoading]= useState(false)

  async function research() {
    if (!seed.trim()) return
    setError(null); setResult(null); setLoading(true)
    try {
      const res = await api.post('/api/admin/seo/keyword-research', { keyword: seed.trim(), country }, { timeout: 90000 })
      setResult(res.data.result)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  async function checkDiff() {
    if (!diffKw.trim()) return
    setDiffResult(null); setDiffLoading(true)
    try {
      const res = await api.post('/api/admin/seo/keyword-difficulty', { keyword: diffKw.trim() }, { timeout: 30000 })
      setDiffResult(res.data.result)
    } catch (err) {
      setDiffResult({ error: err.response?.data?.error || err.message })
    } finally { setDiffLoading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Seed Keyword</label>
            <input value={seed} onChange={e => setSeed(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && research()}
              placeholder="gst calculator india"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm">
              <option>India</option><option>US</option><option>UK</option><option>Global</option>
            </select>
          </div>
          <button onClick={research} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {loading ? 'Researching…' : 'Research Keywords'}
          </button>
        </div>
      </div>

      {loading && <Spinner label="Generating keyword variations and clusters…" />}
      {error   && <ErrBox msg={error} onRetry={research} />}

      {result && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{result.totalKeywords}</p>
              <p className="text-xs text-gray-400 mt-1">Total Keywords</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-indigo-400">{result.totalClusters}</p>
              <p className="text-xs text-gray-400 mt-1">Topic Clusters</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{result.topOpportunities?.length || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Top Opportunities</p>
            </div>
          </div>

          {/* Top Opportunities */}
          {result.topOpportunities?.length > 0 && (
            <div className="bg-gray-800 border border-green-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-green-400 mb-3">Top Opportunities (Low Difficulty + High Volume)</h3>
              <div className="flex flex-wrap gap-2">
                {result.topOpportunities.map((k, i) => (
                  <span key={i} className="bg-green-900/30 border border-green-700 text-green-300 text-xs px-3 py-1.5 rounded-lg">
                    {k.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Clusters */}
          {result.clusters?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Topic Clusters ({result.clusters.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.clusters.map((c, i) => (
                  <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{c.clusterName}</p>
                      <Badge text={c.priority} map={{ high: 'bg-green-900/40 text-green-300', medium: 'bg-yellow-900/40 text-yellow-300', low: 'bg-gray-700 text-gray-300' }} />
                    </div>
                    <p className="text-xs text-indigo-400 mb-2">{c.pillarKeyword}</p>
                    <p className="text-xs text-gray-500 mb-2 italic">{c.contentSuggestion}</p>
                    <div className="flex flex-wrap gap-1">
                      {(c.keywords || []).slice(0, 6).map((kw, j) => (
                        <span key={j} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{kw}</span>
                      ))}
                      {c.totalKeywords > 6 && <span className="text-xs text-gray-500">+{c.totalKeywords - 6}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords table */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">All Keywords ({result.keywords?.length})</h3>
              <CopyBtn data={result.keywords} />
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Keyword</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Intent</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Difficulty</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Volume</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.keywords || []).map((k, i) => (
                    <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 text-gray-200">{k.keyword}</td>
                      <td className="px-4 py-2.5 text-gray-400">{k.searchIntent}</td>
                      <td className="px-4 py-2.5"><Badge text={k.difficulty} map={DIFF_BADGE} /></td>
                      <td className="px-4 py-2.5"><Badge text={k.estimatedVolume} map={VOL_BADGE} /></td>
                      <td className="px-4 py-2.5 text-right font-semibold text-indigo-400">{k.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Quick difficulty checker */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Difficulty Check</h3>
        <div className="flex gap-3">
          <input value={diffKw} onChange={e => setDiffKw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkDiff()}
            placeholder="Check any keyword…"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={checkDiff} disabled={diffLoading}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg text-sm transition-colors">
            {diffLoading ? '…' : 'Check'}
          </button>
        </div>
        {diffResult && !diffResult.error && (
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <span className="text-gray-300 text-sm font-medium">{diffResult.keyword}</span>
            <Badge text={diffResult.difficulty} map={DIFF_BADGE} />
            <Badge text={diffResult.estimatedVolume} map={VOL_BADGE} />
            <span className={`text-xs font-medium ${IMPACT_COLOR[diffResult.rankingOpportunity]}`}>
              {diffResult.rankingOpportunity} opportunity
            </span>
            <span className="text-gray-500 text-xs italic">{diffResult.recommendation}</span>
          </div>
        )}
        {diffResult?.error && <p className="text-red-400 text-xs mt-2">{diffResult.error}</p>}
      </div>
    </div>
  )
}

// ── Tab 2: Competitor Analysis ─────────────────────────────────────────────────

function CompetitorTab() {
  const [ourUrl,  setOurUrl]  = useState('')
  const [compUrls,setCompUrls]= useState(['', '', ''])
  const [topic,   setTopic]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)
  const [findKw,  setFindKw]  = useState('')
  const [findRes, setFindRes] = useState(null)
  const [findLoad,setFindLoad]= useState(false)

  async function analyze() {
    const filled = compUrls.filter(Boolean)
    if (!ourUrl || !filled.length) return
    setError(null); setResult(null); setLoading(true)
    try {
      const res = await api.post('/api/admin/seo/competitor-gap',
        { ourUrl, competitorUrls: filled, topic }, { timeout: 90000 })
      setResult(res.data.result)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  async function findCompetitors() {
    if (!findKw.trim()) return
    setFindLoad(true); setFindRes(null)
    try {
      const res = await api.post('/api/admin/seo/find-competitors',
        { keyword: findKw.trim(), domain: 'awe-os.com' }, { timeout: 30000 })
      setFindRes(res.data.result)
    } catch (err) {
      setFindRes({ error: err.response?.data?.error || err.message })
    } finally { setFindLoad(false) }
  }

  const a = result?.analysis

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Our URL</label>
          <input value={ourUrl} onChange={e => setOurUrl(e.target.value)}
            placeholder="https://www.awe-os.com/tools/gst-calculator"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {compUrls.map((u, i) => (
            <div key={i}>
              <label className="block text-xs text-gray-400 mb-1">Competitor {i + 1}</label>
              <input value={u} onChange={e => { const arr = [...compUrls]; arr[i] = e.target.value; setCompUrls(arr) }}
                placeholder="https://competitor.com/page"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <input value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Topic / keyword (optional)"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={analyze} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            {loading ? 'Analyzing…' : 'Analyze Gap'}
          </button>
        </div>
      </div>

      {/* Auto-find competitors */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Auto-Find Competitors</h3>
        <div className="flex gap-3">
          <input value={findKw} onChange={e => setFindKw(e.target.value)}
            placeholder="Enter keyword to find competitors…"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={findCompetitors} disabled={findLoad}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg text-sm transition-colors">
            {findLoad ? '…' : 'Find'}
          </button>
        </div>
        {findRes?.competitors?.length > 0 && (
          <div className="mt-3 space-y-2">
            {findRes.competitors.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-4 py-2">
                <div>
                  <span className="text-sm text-white font-medium">{c.domain}</span>
                  <span className="text-xs text-gray-500 ml-3">{c.type}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{c.whyTheyRank}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge text={c.strength} map={DIFF_BADGE} />
                  <button onClick={() => {
                    const arr = [...compUrls]; arr[i] = `https://${c.domain}`; setCompUrls(arr)
                  }} className="text-xs text-indigo-400 hover:text-indigo-300">Use →</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {findRes?.error && <p className="text-red-400 text-xs mt-2">{findRes.error}</p>}
      </div>

      {loading && <Spinner label="Crawling pages and analyzing gaps with GPT-4o…" />}
      {error   && <ErrBox msg={error} />}

      {result && a && (
        <>
          {/* Score comparison */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Our Score',       val: a.overallScore?.ours,           color: 'text-white' },
              { label: 'Avg Competitor',  val: a.overallScore?.avgCompetitor,  color: 'text-yellow-400' },
              { label: 'Gap',             val: a.overallScore?.gap,
                color: (a.overallScore?.gap || 0) < 0 ? 'text-red-400' : 'text-green-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{val ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Word count gap */}
          {a.wordCountGap && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex gap-6 items-center flex-wrap">
              <div>
                <p className="text-xs text-gray-400">Our Words</p>
                <p className="text-xl font-bold text-white">{a.wordCountGap.ours}</p>
              </div>
              <div className="text-gray-600 text-2xl">vs</div>
              <div>
                <p className="text-xs text-gray-400">Avg Competitor</p>
                <p className="text-xl font-bold text-yellow-400">{a.wordCountGap.avgCompetitor}</p>
              </div>
              <p className="text-sm text-gray-400 flex-1 italic">{a.wordCountGap.recommendation}</p>
            </div>
          )}

          {/* Quick wins */}
          {a.quickWins?.length > 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-3">Quick Wins</h3>
              <ul className="space-y-1">
                {a.quickWins.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 shrink-0">→</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content gaps */}
          {a.contentGaps?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Content Gaps ({a.contentGaps.length})</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {a.contentGaps.map((g, i) => (
                  <div key={i} className="px-5 py-3 flex items-start justify-between gap-4">
                    <p className="text-sm text-gray-300 flex-1">{g.gap}</p>
                    <div className="flex gap-2 shrink-0">
                      <Badge text={g.importance} map={DIFF_BADGE} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority actions */}
          {a.priorityActions?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Priority Actions</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {a.priorityActions.map((act, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                    <p className="text-sm text-gray-300 flex-1">{act.action}</p>
                    <div className="flex gap-2">
                      <span className={`text-xs font-medium ${IMPACT_COLOR[act.impact]}`}>Impact: {act.impact}</span>
                      <span className="text-xs text-gray-500">Effort: {act.effort}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Tab 3: Content Opportunities ──────────────────────────────────────────────

function ContentTab() {
  const [niche,     setNiche]     = useState('free online tools India')
  const [keywords,  setKeywords]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)
  const [briefFor,  setBriefFor]  = useState(null)
  const [brief,     setBrief]     = useState(null)
  const [briefLoad, setBriefLoad] = useState(false)

  async function find() {
    setError(null); setResult(null); setBrief(null); setBriefFor(null); setLoading(true)
    const targetKeywords = keywords.split(',').map(k => k.trim()).filter(Boolean)
    try {
      const res = await api.post('/api/admin/seo/content-opportunities',
        { niche, targetKeywords, toolCategories: ['pdf', 'calculators', 'converters', 'ai', 'productivity'] },
        { timeout: 90000 })
      setResult(res.data.result)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  async function generateBrief(opp) {
    setBriefFor(opp); setBrief(null); setBriefLoad(true)
    try {
      const res = await api.post('/api/admin/seo/content-brief', { opportunity: opp }, { timeout: 60000 })
      setBrief(res.data.result)
    } catch (err) {
      setBrief({ error: err.response?.data?.error || err.message })
    } finally { setBriefLoad(false) }
  }

  const TYPE_BADGE = {
    blog: 'bg-blue-900/40 text-blue-300', comparison: 'bg-purple-900/40 text-purple-300',
    faq: 'bg-yellow-900/40 text-yellow-300', 'city-page': 'bg-green-900/40 text-green-300',
    'tool-page': 'bg-indigo-900/40 text-indigo-300',
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Niche / Market</label>
          <input value={niche} onChange={e => setNiche(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Target Keywords (comma separated, optional)</label>
          <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={2}
            placeholder="gst calculator, pdf tools, loan calculator india…"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
        </div>
        <button onClick={find} disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Finding Opportunities…' : 'Find Opportunities'}
        </button>
      </div>

      {loading && <Spinner label="Analyzing content gaps with GPT-4o…" />}
      {error   && <ErrBox msg={error} onRetry={find} />}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{result.totalOpportunities}</p>
              <p className="text-xs text-gray-400 mt-1">Opportunities</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{result.highPriority}</p>
              <p className="text-xs text-gray-400 mt-1">High Priority</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{result.quickWins?.length || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Quick Wins</p>
            </div>
          </div>

          {/* Opportunities grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(result.opportunities || []).map((opp, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-snug">{opp.title}</p>
                  <span className="text-indigo-400 font-bold text-sm shrink-0">{opp.priority}/10</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge text={opp.type} map={TYPE_BADGE} />
                  <Badge text={opp.difficulty} map={DIFF_BADGE} />
                  <Badge text={opp.estimatedVolume} map={VOL_BADGE} />
                </div>
                <p className="text-xs text-gray-400 italic">{opp.reason}</p>
                <p className="text-xs text-indigo-400 font-mono">{opp.targetKeyword}</p>
                {opp.contentOutline?.length > 0 && (
                  <ul className="space-y-0.5">
                    {opp.contentOutline.slice(0, 3).map((h, j) => (
                      <li key={j} className="text-xs text-gray-500">• {h}</li>
                    ))}
                  </ul>
                )}
                <button onClick={() => generateBrief(opp)}
                  className="mt-auto text-xs bg-indigo-900/40 border border-indigo-700 text-indigo-300 hover:bg-indigo-900/70 px-3 py-1.5 rounded-lg transition-colors text-left">
                  Generate Brief →
                </button>
              </div>
            ))}
          </div>

          {/* Quick wins */}
          {result.quickWins?.length > 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-3">Quick Wins</h3>
              {result.quickWins.map((w, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <span className={`text-xs font-medium shrink-0 ${IMPACT_COLOR[w.impact]}`}>[{w.impact}]</span>
                  <p className="text-sm text-gray-300">{w.action}</p>
                </div>
              ))}
            </div>
          )}

          {/* Content gaps */}
          {result.contentGaps?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Content Gaps</h3>
              <ul className="space-y-1">
                {result.contentGaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-red-400">✕</span>{g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Content Brief modal/panel */}
      {briefFor && (
        <div className="bg-gray-800 border border-indigo-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-indigo-300">Content Brief: {briefFor.title}</h3>
            <button onClick={() => { setBriefFor(null); setBrief(null) }}
              className="text-gray-500 hover:text-white text-xs border border-gray-600 px-3 py-1 rounded-lg">Close</button>
          </div>
          {briefLoad && <Spinner label="Generating detailed brief with GPT-4o…" />}
          {brief?.error && <ErrBox msg={brief.error} />}
          {brief?.brief && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Title Tag</p>
                  <p className="text-white bg-gray-900/50 p-2 rounded text-xs">{brief.brief.titleTag}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Meta Description</p>
                  <p className="text-white bg-gray-900/50 p-2 rounded text-xs">{brief.brief.metaDescription}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">H1</p>
                <p className="text-white font-semibold">{brief.brief.h1}</p>
              </div>
              {brief.brief.outline?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Content Outline</p>
                  <div className="space-y-2">
                    {brief.brief.outline.map((sec, i) => (
                      <div key={i} className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-sm font-medium text-white">{sec.h2}</p>
                        {sec.keyPoints?.map((pt, j) => (
                          <p key={j} className="text-xs text-gray-400 mt-1">• {pt}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {brief.brief.faqs?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">FAQs ({brief.brief.faqs.length})</p>
                  <div className="space-y-2">
                    {brief.brief.faqs.map((f, i) => (
                      <div key={i} className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-white">{f.q}</p>
                        <p className="text-xs text-gray-400 mt-1">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <CopyBtn data={brief.brief} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab 4: Link Intelligence ───────────────────────────────────────────────────

function LinkTab() {
  const [mode,      setMode]      = useState('analyze')  // 'analyze' | 'orphans'
  const [targetUrl, setTargetUrl] = useState('')
  const [pagesText, setPagesText] = useState('')
  const [orphanText,setOrphanText]= useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)

  function parsePages(txt) {
    return txt.split('\n').map(l => l.trim()).filter(Boolean).map(url => ({ url, title: url }))
  }

  async function run() {
    setError(null); setResult(null); setLoading(true)
    try {
      if (mode === 'analyze') {
        const pages = parsePages(pagesText)
        const res = await api.post('/api/admin/seo/internal-links' /* future route */
          || '/api/admin/seo/fix-orphans',
          mode === 'analyze'
            ? { orphanUrls: [targetUrl], allPages: pages }
            : { orphanUrls: orphanText.split('\n').map(s => s.trim()).filter(Boolean), allPages: pages },
          { timeout: 60000 })
        setResult(res.data.result)
      } else {
        const orphanUrls = orphanText.split('\n').map(s => s.trim()).filter(Boolean)
        const allPages   = parsePages(pagesText)
        const res = await api.post('/api/admin/seo/fix-orphans', { orphanUrls, allPages }, { timeout: 60000 })
        setResult(res.data.result)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 mb-2">
        {[['analyze', 'Analyze Page Links'], ['orphans', 'Fix Orphan Pages']].map(([v, l]) => (
          <button key={v} onClick={() => { setMode(v); setResult(null); setError(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === v ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        {mode === 'analyze' ? (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target URL to Analyze</label>
            <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
              placeholder="https://www.awe-os.com/tools/gst-calculator"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Orphan Page URLs (one per line)</label>
            <textarea value={orphanText} onChange={e => setOrphanText(e.target.value)} rows={4}
              placeholder="https://www.awe-os.com/tools/some-page&#10;https://www.awe-os.com/blog/old-post"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono" />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Available Pages (one URL per line)</label>
          <textarea value={pagesText} onChange={e => setPagesText(e.target.value)} rows={4}
            placeholder="https://www.awe-os.com/tools/gst-calculator&#10;https://www.awe-os.com/blog/gst-guide"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono" />
        </div>
        <button onClick={run} disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Analyzing…' : mode === 'analyze' ? 'Analyze Links' : 'Find Best Links'}
        </button>
      </div>

      {loading && <Spinner label="Analyzing internal link opportunities…" />}
      {error   && <ErrBox msg={error} />}

      {result?.fixes?.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex justify-between">
            <h3 className="text-sm font-semibold text-white">Link Fixes ({result.fixes.length})</h3>
            <CopyBtn data={result.fixes} />
          </div>
          <div className="divide-y divide-gray-700">
            {result.fixes.map((fix, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-xs text-gray-500 mb-1 truncate">{fix.orphanUrl}</p>
                <p className="text-sm text-gray-300">Link from: <span className="text-indigo-400">{fix.linkFromUrl}</span></p>
                <p className="text-xs text-gray-400 mt-1">Anchor: "<span className="text-white">{fix.anchorText}</span>" · <Badge text={fix.confidence} map={DIFF_BADGE} /></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 5: SERP Analysis ───────────────────────────────────────────────────────

function SerpTab() {
  const [keyword, setKeyword] = useState('')
  const [country, setCountry] = useState('India')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  async function analyze() {
    if (!keyword.trim()) return
    setError(null); setResult(null); setLoading(true)
    try {
      const res = await api.post('/api/admin/seo/serp-analysis', { keyword: keyword.trim(), country }, { timeout: 30000 })
      setResult(res.data.result)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  const sf = result?.serpFeatures

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Keyword</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="gst calculator india"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm">
              <option>India</option><option>US</option><option>UK</option><option>Global</option>
            </select>
          </div>
          <button onClick={analyze} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {loading ? 'Analyzing…' : 'Analyze SERP'}
          </button>
        </div>
      </div>

      {loading && <Spinner label="Simulating SERP features…" />}
      {error   && <ErrBox msg={error} onRetry={analyze} />}

      {result && sf && (
        <>
          {/* Winning format + word count */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center col-span-1">
              <p className="text-xs text-gray-400 mb-1">Winning Format</p>
              <p className="text-sm font-bold text-indigo-400 capitalize">{result.winningContentFormat}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Optimal Words</p>
              <p className="text-xl font-bold text-white">{result.optimalWordCount}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">CTR #1</p>
              <p className="text-xl font-bold text-green-400">{result.estimatedCTR?.position1}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">CTR #10</p>
              <p className="text-xl font-bold text-red-400">{result.estimatedCTR?.position10}</p>
            </div>
          </div>

          {/* Featured snippet */}
          {sf.featuredSnippet && (
            <div className={`border rounded-xl p-4 ${sf.featuredSnippet.likely ? 'bg-yellow-900/20 border-yellow-700' : 'bg-gray-800 border-gray-700'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{sf.featuredSnippet.likely ? '⭐' : '○'}</span>
                <h3 className="text-sm font-semibold text-white">Featured Snippet</h3>
                {sf.featuredSnippet.likely && <Badge text={sf.featuredSnippet.type} map={{}} fallback="bg-yellow-900/40 text-yellow-300" />}
              </div>
              {sf.featuredSnippet.likely && <p className="text-sm text-gray-300 italic">{sf.featuredSnippet.howToGet}</p>}
            </div>
          )}

          {/* SERP features checklist */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">SERP Features</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(sf)
                .filter(([, v]) => v && typeof v === 'object' && 'likely' in v)
                .map(([key, val]) => (
                  <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${val.likely ? 'border-green-700 bg-green-900/20' : 'border-gray-700 bg-gray-900/30'}`}>
                    <span className={val.likely ? 'text-green-400' : 'text-gray-600'}>{val.likely ? '✓' : '○'}</span>
                    <span className="text-xs text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* PAA */}
          {sf.peopleAlsoAsk?.likely && sf.peopleAlsoAsk.questions?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">People Also Ask</h3>
              <ul className="space-y-2">
                {sf.peopleAlsoAsk.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-indigo-400 shrink-0 mt-0.5">?</span>{q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ranking factors */}
          {result.rankingFactors?.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Ranking Factors</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {result.rankingFactors.map((f, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm text-white font-medium">{f.factor}</span>
                      <Badge text={f.importance} map={{
                        critical: 'bg-red-900/40 text-red-300 border border-red-700',
                        high:     'bg-orange-900/40 text-orange-300 border border-orange-700',
                        medium:   'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
                      }} />
                    </div>
                    <p className="text-xs text-gray-400 italic">{f.howToOptimize}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required elements + schema */}
          <div className="grid grid-cols-2 gap-4">
            {result.requiredElements?.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-2">Required Elements</h3>
                <ul className="space-y-1">
                  {result.requiredElements.map((e, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-indigo-400">→</span>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.schemaRecommended?.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-2">Schema Recommended</h3>
                <div className="flex flex-wrap gap-2">
                  {result.schemaRecommended.map((s, i) => (
                    <span key={i} className="text-xs bg-indigo-900/40 border border-indigo-700 text-indigo-300 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'keywords',    label: '🔑 Keywords'    },
  { id: 'competitors', label: '🏆 Competitors' },
  { id: 'content',     label: '💡 Content'     },
  { id: 'links',       label: '🔗 Links'       },
  { id: 'serp',        label: '📊 SERP'        },
]

export default function SeoIntelligence() {
  const [tab, setTab] = useState('keywords')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">SEO Intelligence Engine</h1>
      <p className="text-gray-400 text-sm mb-6">Keyword research, competitor gaps, content opportunities, link intelligence and SERP analysis.</p>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'keywords'    && <KeywordTab />}
      {tab === 'competitors' && <CompetitorTab />}
      {tab === 'content'     && <ContentTab />}
      {tab === 'links'       && <LinkTab />}
      {tab === 'serp'        && <SerpTab />}
    </div>
  )
}
