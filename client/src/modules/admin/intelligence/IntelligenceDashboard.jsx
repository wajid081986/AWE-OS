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

  const TABS = ['intelligence', 'decisions', 'contribute', 'coordinate']

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
            {t}
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
