import { useState, useEffect, useCallback } from 'react'
import {
  getMultiAgentStatus,
  queryIntelligence,
  contributeIntelligence,
  getDelegationHistory,
} from '../../../services/multiAgent.service'
import {
  getDecisionHistory,
  coordinateDecision as coordinateDecisionOpt,
} from '../../../services/optimization.service'
import api from '../../../services/api.service'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function StatCard({ label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── Weekly Report Tab ─────────────────────────────────────────────────────────
function WeeklyReportTab() {
  const [summaryData,    setSummaryData]    = useState(null)
  const [generating,     setGenerating]     = useState(false)
  const [currentReport,  setCurrentReport]  = useState(null)
  const [history,        setHistory]        = useState([])
  const [selectedIdx,    setSelectedIdx]    = useState(null)
  const [genError,       setGenError]       = useState(null)
  const [isDue,          setIsDue]          = useState(false)

  const getWeekStart = () => {
    const d   = new Date()
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    return mon.toISOString().split('T')[0]
  }

  const readLS = (key, fallback = '[]') => {
    try { return JSON.parse(localStorage.getItem(key) || fallback) } catch { return JSON.parse(fallback) }
  }

  const collectData = useCallback(() => {
    const campaigns    = readLS('awe_campaign_history').length
    const drafts       = readLS('awe_content_drafts').length
    const socialBlasts = readLS('awe_social_blast_history').length
    const contentCount = drafts + socialBlasts

    const dirStatuses    = readLS('awe_dir_statuses', '{}')
    const dirCount       = Object.values(dirStatuses).filter(s => s === 'submitted' || s === 'done').length

    const schedule    = readLS('awe_posting_schedule')
    const postedCount = schedule.filter(p => p.status === 'posted').length
    const pendingCount = schedule.filter(p => p.status === 'pending').length

    return {
      campaignsCount:    campaigns,
      contentCount,
      directoriesCount:  dirCount,
      scheduledPostsData: { completed: postedCount, pending: pendingCount },
    }
  }, [])

  useEffect(() => {
    setSummaryData(collectData())
    const stored = readLS('awe_weekly_reports')
    setHistory(stored)
    const today = new Date()
    if (today.getDay() === 1) {
      const daysSinceLast = stored.length === 0
        ? Infinity
        : (today - new Date(stored[0].generatedAt)) / 86400000
      if (daysSinceLast > 6) setIsDue(true)
    }
  }, [collectData])

  const displayedReport = selectedIdx !== null ? history[selectedIdx]?.report : currentReport

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const data     = collectData()
      setSummaryData(data)
      const prevRecs = history[0]?.report?.nextWeekRecommendations || []
      const { data: res } = await api.post('/api/admin/weekly-report-claude', {
        ...data,
        previousRecommendations: prevRecs,
        weekStartDate:           getWeekStart(),
      })
      if (!res.success) throw new Error(res.error)

      const entry = {
        generatedAt: new Date().toISOString(),
        weekOf:      getWeekStart(),
        summaryData: data,
        report:      res.data,
      }
      const newHist = [entry, ...history].slice(0, 12)
      localStorage.setItem('awe_weekly_reports', JSON.stringify(newHist))
      setHistory(newHist)
      setCurrentReport(res.data)
      setSelectedIdx(null)
      setIsDue(false)
    } catch (err) {
      setGenError(err.response?.data?.error || err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleExportPDF = () => {
    document.body.classList.add('awe-print-report')
    window.print()
    setTimeout(() => document.body.classList.remove('awe-print-report'), 500)
  }

  const PriorityBadge = ({ p }) => {
    const cls = { High: 'bg-red-600', Med: 'bg-yellow-600', Low: 'bg-blue-600' }[p] || 'bg-gray-600'
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 ${cls}`}>{p}</span>
  }

  return (
    <div>
      <style>{`
        @media print {
          body.awe-print-report > * { display: none !important; }
          body.awe-print-report .awe-report-printable {
            display: block !important;
            position: fixed; top: 0; left: 0; width: 100%;
            padding: 24px; background: #fff;
          }
          body.awe-print-report .awe-report-printable * { color: #111 !important; }
          body.awe-print-report .awe-report-printable .bg-gray-800 { background: #f5f5f5 !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      {isDue && (
        <div className="mb-4 px-4 py-3 bg-orange-500/20 border border-orange-500 rounded-xl flex items-center justify-between">
          <span className="text-orange-300 text-sm">📊 Weekly report due! Generate now →</span>
          <button onClick={handleGenerate} disabled={generating}
            className="px-3 py-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main panel ── */}
        <div className="lg:col-span-2 space-y-4 awe-report-printable">
          {summaryData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Campaigns Run"   value={summaryData.campaignsCount}                          color="text-orange-400" />
              <StatCard label="Content Pieces"  value={summaryData.contentCount}                             color="text-purple-400" />
              <StatCard label="Directories"     value={summaryData.directoriesCount}                         color="text-blue-400"   />
              <StatCard label="Posts Completed" value={summaryData.scheduledPostsData?.completed}
                        sub={`${summaryData.scheduledPostsData?.pending ?? 0} pending`}                      color="text-green-400"  />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={handleGenerate} disabled={generating}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2">
              {generating
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
                : '✨ Generate AI Analysis'}
            </button>
            {displayedReport && (
              <button onClick={handleExportPDF}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl transition-colors">
                Export PDF
              </button>
            )}
          </div>

          {genError && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-300 text-sm">{genError}</div>
          )}

          {displayedReport ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-800 rounded-xl border-l-4 border-purple-500 p-5">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Week Summary</h3>
                <p className="text-gray-200 text-sm leading-relaxed">{displayedReport.weekSummary}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 mb-1">Focus Tool Next Week</p>
                    <p className="text-sm font-semibold text-orange-400">{displayedReport.focusToolForNextWeek}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-[11px] text-gray-500 mb-1">Estimated Traffic Impact</p>
                    <p className="text-sm font-semibold text-green-400">{displayedReport.estimatedTrafficImpact}</p>
                  </div>
                </div>
              </div>

              {/* Top channels */}
              {displayedReport.topPerformingChannels?.length > 0 && (
                <div className="bg-gray-800 rounded-xl border-l-4 border-green-500 p-5">
                  <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">Top Performing Channels</h3>
                  <div className="space-y-2">
                    {displayedReport.topPerformingChannels.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 shrink-0">▸</span>
                        <p className="text-sm text-gray-200">
                          <span className="font-medium text-white">{c.channel}</span>
                          <span className="text-gray-400"> — {c.reason}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What worked / didn't */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl border-l-4 border-green-500 p-5">
                  <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">What Worked ✓</h3>
                  <ul className="space-y-2">
                    {(displayedReport.whatWorked || []).map((item, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-green-500 shrink-0 mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-xl border-l-4 border-red-500 p-5">
                  <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">What Didn't Work ✗</h3>
                  <ul className="space-y-2">
                    {(displayedReport.whatDidntWork || []).map((item, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-red-500 shrink-0 mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-800 rounded-xl border-l-4 border-orange-500 p-5">
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">Next Week Recommendations</h3>
                <div className="space-y-3">
                  {(displayedReport.nextWeekRecommendations || []).map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-700/40 rounded-lg p-3 border border-gray-700">
                      <PriorityBadge p={rec.priority} />
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{rec.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{rec.expectedImpact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !generating && (
            <div className="bg-gray-800/40 rounded-xl border border-dashed border-gray-700 p-10 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-gray-500 text-sm">
                No report generated yet.<br />
                Click "Generate AI Analysis" to create your first weekly report.
              </p>
            </div>
          )}
        </div>

        {/* ── History panel ── */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Report History</h3>
          {history.length === 0 ? (
            <p className="text-gray-600 text-xs py-4">No past reports yet. Generate your first one above.</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry, i) => (
                <button key={i}
                  onClick={() => { setSelectedIdx(i); setCurrentReport(null) }}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
                    selectedIdx === i
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  }`}>
                  <p className={`text-sm font-semibold ${selectedIdx === i ? 'text-orange-300' : 'text-gray-200'}`}>
                    Week of {entry.weekOf}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(entry.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="text-[10px] text-orange-400">{entry.summaryData?.campaignsCount ?? 0} campaigns</span>
                    <span className="text-[10px] text-purple-400">{entry.summaryData?.contentCount ?? 0} content</span>
                    <span className="text-[10px] text-blue-400">{entry.summaryData?.directoriesCount ?? 0} dirs</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IntelligenceDashboard() {
  const [status,      setStatus]    = useState(null)
  const [intelligence, setInt]      = useState([])
  const [decisions,   setDecisions] = useState([])
  const [loading,     setLoading]   = useState(true)
  const [tab,         setTab]       = useState('intelligence')
  const [searchTags,  setSearchTags] = useState('')
  const [searching,   setSearching]  = useState(false)
  const [error,       setError]      = useState(null)
  const [toast,       setToast]      = useState(null)

  // Decision form
  const [decForm, setDecForm] = useState({
    question: '', options: '', decisionType: 'lifecycle',
  })
  const [decResult, setDecResult] = useState(null)
  const [deciding,  setDeciding]  = useState(false)

  // Contribute form
  const [contForm, setContForm] = useState({ agentId: '', subject: '', intelligence: '', tags: '' })
  const [contributing, setContributing] = useState(false)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, intRes, decRes] = await Promise.allSettled([
        getMultiAgentStatus(),
        queryIntelligence({ limit: 20, minConfidence: 0.3 }),
        getDecisionHistory({ limit: 20 }),
      ])
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data)
      if (intRes.status    === 'fulfilled') setInt(intRes.value.data ?? [])
      if (decRes.status    === 'fulfilled') setDecisions(decRes.value.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTags.trim()) return
    setSearching(true)
    try {
      const tags = searchTags.split(',').map(t => t.trim()).filter(Boolean)
      const res = await queryIntelligence({ tags, limit: 20, minConfidence: 0.2 })
      setInt(res.data ?? [])
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setSearching(false)
    }
  }

  const handleDecide = async (e) => {
    e.preventDefault()
    setDeciding(true)
    setDecResult(null)
    try {
      const res = await coordinateDecisionOpt({
        decisionType: decForm.decisionType,
        question:     decForm.question,
        options:      decForm.options.split(',').map(s => s.trim()).filter(Boolean),
      })
      setDecResult(res.data)
    } catch (err) {
      setDecResult({ error: err.message })
    } finally {
      setDeciding(false)
    }
  }

  const handleContribute = async (e) => {
    e.preventDefault()
    setContributing(true)
    try {
      let parsed
      try { parsed = JSON.parse(contForm.intelligence) } catch { parsed = { value: contForm.intelligence } }
      await contributeIntelligence({
        agentId:      contForm.agentId,
        subject:      contForm.subject,
        intelligence: parsed,
        tags:         contForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      showToast('Intelligence contributed')
      setContForm({ agentId: '', subject: '', intelligence: '', tags: '' })
      await load()
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setContributing(false)
    }
  }

  const intel     = status?.intelligence
  const consensus = status?.consensus

  const TABS = ['intelligence', 'decisions', 'contribute', 'coordinate', 'weekly-report']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Intelligence Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 5C/5D — Cross-Agent Learning & Decision Intelligence</p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Intelligence Entries" value={intel?.dbTotal}          color="text-indigo-400" />
        <StatCard label="Cache Entries"         value={intel?.cacheEntries}    color="text-blue-400" />
        <StatCard label="Contributions"         value={intel?.contributionCount} />
        <StatCard label="Consensus Rate"        value={consensus?.consensusRate != null ? `${consensus.consensusRate}%` : null} color="text-green-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-t capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Intelligence tab */}
          {tab === 'intelligence' && (
            <div>
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchTags}
                  onChange={e => setSearchTags(e.target.value)}
                  placeholder="Search by tags (e.g. optimization, repair, seo)"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                />
                <button type="submit" disabled={searching}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg">
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </form>

              {intelligence.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No intelligence entries found. Try different tags or contribute some below.</p>
              ) : (
                <div className="space-y-3">
                  {intelligence.map((item, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">{item.subject}</p>
                          <p className="text-xs text-indigo-400">by {item.contributorAgent}</p>
                        </div>
                        <span className={`text-xs font-bold ${parseFloat(item.confidence) >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {(parseFloat(item.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(item.tags ?? []).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Decisions tab */}
          {tab === 'decisions' && (
            <div>
              {decisions.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No decision history. Use the Coordinate tab to run a decision.</p>
              ) : (
                <div className="space-y-3">
                  {decisions.map((d, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">{d.decision_type ?? d.decisionType} · {new Date(d.created_at ?? d.timestamp).toLocaleString()}</p>
                          <p className="text-sm text-white">{d.question}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-indigo-400 font-bold text-sm">{d.outcome}</p>
                          <p className={`text-xs ${parseFloat(d.confidence) >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {(parseFloat(d.confidence) * 100).toFixed(0)}% confidence
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Agents: {(d.participating_agents ?? d.participatingAgents ?? []).join(', ')}
                        {' · '}
                        Consensus: {(d.consensus_reached ?? d.consensusReached) ? 'Yes' : 'No'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contribute tab */}
          {tab === 'contribute' && (
            <div className="max-w-2xl">
              <p className="text-gray-400 text-sm mb-4">Contribute intelligence to the shared pool</p>
              <form onSubmit={handleContribute} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Agent ID</label>
                  <input type="text" value={contForm.agentId}
                    onChange={e => setContForm(f => ({ ...f, agentId: e.target.value }))}
                    placeholder="builder-agent"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subject</label>
                  <input type="text" value={contForm.subject}
                    onChange={e => setContForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="pdf-tool-optimization-strategy"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Intelligence (JSON or text)</label>
                  <textarea value={contForm.intelligence}
                    onChange={e => setContForm(f => ({ ...f, intelligence: e.target.value }))}
                    placeholder='{"strategy": "use_caching", "confidence": 0.9}'
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none resize-none"
                    required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                  <input type="text" value={contForm.tags}
                    onChange={e => setContForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="pdf, optimization, caching"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <button type="submit" disabled={contributing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  {contributing ? 'Contributing…' : 'Contribute'}
                </button>
              </form>
            </div>
          )}

          {/* Weekly Report tab */}
          {tab === 'weekly-report' && <WeeklyReportTab />}

          {/* Coordinate tab */}
          {tab === 'coordinate' && (
            <div className="max-w-2xl">
              <p className="text-gray-400 text-sm mb-4">Coordinate an AI decision across the agent network</p>
              <form onSubmit={handleDecide} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Decision Type</label>
                  <select value={decForm.decisionType}
                    onChange={e => setDecForm(f => ({ ...f, decisionType: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
                    {['lifecycle', 'optimization', 'delegation', 'configuration'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Question</label>
                  <input type="text" value={decForm.question}
                    onChange={e => setDecForm(f => ({ ...f, question: e.target.value }))}
                    placeholder="Should we publish or repair this tool?"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Options (comma-separated)</label>
                  <input type="text" value={decForm.options}
                    onChange={e => setDecForm(f => ({ ...f, options: e.target.value }))}
                    placeholder="publish, repair, monitor, pause"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required />
                </div>
                <button type="submit" disabled={deciding}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  {deciding ? 'Coordinating…' : 'Coordinate Decision'}
                </button>
              </form>

              {decResult && (
                <div className={`mt-4 p-4 rounded-xl border ${decResult.error ? 'bg-red-900/20 border-red-700' : 'bg-indigo-900/20 border-indigo-700'}`}>
                  {decResult.error ? (
                    <p className="text-red-400 text-sm">{decResult.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-indigo-400 font-semibold">Decision: <span className="text-white">{decResult.outcome}</span></p>
                      <p className="text-sm text-gray-300">Confidence: {(decResult.confidence * 100).toFixed(0)}% ({decResult.highConfidence ? 'High' : 'Low'})</p>
                      <p className="text-sm text-gray-300">Consensus: {decResult.consensusReached ? 'Reached' : 'Not reached'}</p>
                      <p className="text-xs text-gray-400">{decResult.reasoning}</p>
                      <p className="text-xs text-gray-500">Agents consulted: {(decResult.participatingAgents ?? []).join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
