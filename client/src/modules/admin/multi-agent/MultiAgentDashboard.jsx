import { useState, useEffect, useCallback } from 'react'
import {
  getMultiAgentStatus,
  getAllAgents,
  getSessions,
  getConsensusHistory,
  getDelegationHistory,
  runConsensusVote,
  delegateTask,
  getDLQ,
  clearDLQ,
} from '../../../services/multiAgent.service'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function AgentCard({ agent }) {
  const conf = agent.confidenceScore ?? 0
  const confColor = conf >= 0.80 ? 'text-green-400' : conf >= 0.60 ? 'text-yellow-400' : 'text-red-400'
  const activeTasks = agent.metrics?.activeTasks ?? 0

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-indigo-500 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-white">{agent.agentId}</p>
          <p className="text-xs text-gray-400">{agent.role}</p>
        </div>
        <span className={`text-sm font-bold ${confColor}`}>{(conf * 100).toFixed(0)}%</span>
      </div>
      <p className="text-xs text-indigo-400 mb-2">{agent.specialization}</p>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>Tasks: {agent.metrics?.totalTasks ?? 0}</span>
        <span>Active: {activeTasks}</span>
        {agent.successRate !== null && <span>SR: {agent.successRate}%</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(agent.capabilities ?? []).slice(0, 3).map(c => (
          <span key={c} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{c}</span>
        ))}
      </div>
    </div>
  )
}

function SessionRow({ session }) {
  const statusColor = {
    active: 'text-yellow-400', completed: 'text-green-400',
    failed: 'text-red-400', initializing: 'text-blue-400',
  }[session.status] ?? 'text-gray-400'

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-750">
      <td className="py-2 px-3 text-xs font-mono text-gray-300">{session.session_id ?? session.sessionId}</td>
      <td className="py-2 px-3 text-xs text-gray-200 max-w-[200px] truncate" title={session.goal}>{session.goal}</td>
      <td className="py-2 px-3 text-xs text-gray-400">{session.participant_count ?? session.participants?.length ?? 0}</td>
      <td className={`py-2 px-3 text-xs font-semibold ${statusColor}`}>{session.status}</td>
      <td className="py-2 px-3 text-xs text-gray-400">
        {session.started_at
          ? new Date(session.started_at).toLocaleTimeString()
          : new Date(session.startedAt).toLocaleTimeString()}
      </td>
    </tr>
  )
}

export default function MultiAgentDashboard() {
  const [status,    setStatus]    = useState(null)
  const [agents,    setAgents]    = useState([])
  const [sessions,  setSessions]  = useState([])
  const [consensus, setConsensus] = useState([])
  const [delegates, setDelegates] = useState([])
  const [dlqCount,  setDlqCount]  = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('agents')
  const [error,     setError]     = useState(null)

  // Vote form
  const [voteForm, setVoteForm] = useState({ question: '', candidates: '', agents: '' })
  const [voteResult, setVoteResult] = useState(null)
  const [voteLoading, setVoteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, agentsRes, sessionsRes, consRes, delRes, dlqRes] = await Promise.allSettled([
        getMultiAgentStatus(),
        getAllAgents(),
        getSessions({ limit: 20 }),
        getConsensusHistory(10),
        getDelegationHistory(20),
        getDLQ(),
      ])

      if (statusRes.status   === 'fulfilled') setStatus(statusRes.value.data)
      if (agentsRes.status   === 'fulfilled') setAgents(agentsRes.value.data ?? [])
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data ?? [])
      if (consRes.status     === 'fulfilled') setConsensus(consRes.value.data ?? [])
      if (delRes.status      === 'fulfilled') setDelegates(delRes.value.data ?? [])
      if (dlqRes.status      === 'fulfilled') setDlqCount(dlqRes.value.count ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleVote = async (e) => {
    e.preventDefault()
    setVoteLoading(true)
    setVoteResult(null)
    try {
      const res = await runConsensusVote({
        question:     voteForm.question,
        candidates:   voteForm.candidates.split(',').map(s => s.trim()).filter(Boolean),
        votingAgents: voteForm.agents.split(',').map(s => s.trim()).filter(Boolean),
      })
      setVoteResult(res.data)
    } catch (err) {
      setVoteResult({ error: err.message })
    } finally {
      setVoteLoading(false)
    }
  }

  const handleClearDLQ = async () => {
    await clearDLQ()
    setDlqCount(0)
  }

  const reg = status?.registry
  const bus = status?.commBus
  const orch = status?.orchestrator

  const TABS = ['agents', 'sessions', 'consensus', 'delegation', 'vote']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Multi-Agent Intelligence</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 5C — Agent Collaboration Engine</p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Agents"    value={reg?.totalAgents}        color="text-indigo-400" />
        <StatCard label="Active Sessions"  value={orch?.activeSessions}    color="text-yellow-400" />
        <StatCard label="Messages Sent"    value={bus?.messageCount}       color="text-blue-400" />
        <StatCard label="DLQ Depth"        value={dlqCount}
          color={dlqCount > 0 ? 'text-red-400' : 'text-green-400'}
          sub={dlqCount > 0 ? <button onClick={handleClearDLQ} className="underline text-red-400 hover:text-red-300">Clear DLQ</button> : null}
        />
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Completed Sessions" value={orch?.completedSessions} color="text-green-400" />
        <StatCard label="Failed Sessions"    value={orch?.failedSessions}    color="text-red-400" />
        <StatCard label="Pending Requests"   value={bus?.pendingRequests}    />
        <StatCard label="Session Success Rate" value={orch?.successRate != null ? `${orch.successRate}%` : null} color="text-green-400" />
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-t capitalize transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Agents tab */}
          {tab === 'agents' && (
            <div>
              <p className="text-gray-400 text-sm mb-4">{agents.length} registered agents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(a => <AgentCard key={a.agentId} agent={a} />)}
                {agents.length === 0 && <p className="text-gray-500 text-sm col-span-3">No agents registered yet.</p>}
              </div>
            </div>
          )}

          {/* Sessions tab */}
          {tab === 'sessions' && (
            <div>
              <p className="text-gray-400 text-sm mb-4">{sessions.length} recent sessions</p>
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-sm">No collaboration sessions yet.</p>
              ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-700">
                      <tr>
                        {['Session ID', 'Goal', 'Agents', 'Status', 'Started'].map(h => (
                          <th key={h} className="py-2 px-3 text-xs text-gray-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => <SessionRow key={i} session={s} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Consensus tab */}
          {tab === 'consensus' && (
            <div>
              <p className="text-gray-400 text-sm mb-4">{consensus.length} recent votes</p>
              {consensus.length === 0 ? (
                <p className="text-gray-500 text-sm">No consensus votes yet. Use the Vote tab to run one.</p>
              ) : (
                <div className="space-y-3">
                  {consensus.map((v, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                      <p className="text-sm text-white font-medium mb-1">{v.question}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Outcome: <span className="text-indigo-400 font-medium">{v.outcome}</span></span>
                        <span>Confidence: <span className={v.highConfidence ? 'text-green-400' : 'text-yellow-400'}>{(v.confidence * 100).toFixed(0)}%</span></span>
                        <span>Voters: {v.voterCount}</span>
                        <span className={v.consensusReached ? 'text-green-400' : 'text-red-400'}>
                          {v.consensusReached ? 'Consensus ✓' : 'No consensus'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delegation tab */}
          {tab === 'delegation' && (
            <div>
              <p className="text-gray-400 text-sm mb-4">{delegates.length} delegations</p>
              {delegates.length === 0 ? (
                <p className="text-gray-500 text-sm">No task delegations yet.</p>
              ) : (
                <div className="space-y-2">
                  {delegates.map((d, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-indigo-400 font-medium">{d.fromAgent}</span>
                        <span className="text-gray-500 text-xs mx-2">→</span>
                        <span className="text-xs text-purple-400 font-medium">{d.toAgent}</span>
                        <span className="text-gray-400 text-xs ml-3">{d.taskType}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'escalated' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-indigo-900/40 text-indigo-400'}`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vote tab */}
          {tab === 'vote' && (
            <div className="max-w-2xl">
              <p className="text-gray-400 text-sm mb-4">Run an agent consensus vote</p>
              <form onSubmit={handleVote} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Question</label>
                  <input
                    type="text"
                    value={voteForm.question}
                    onChange={e => setVoteForm(f => ({ ...f, question: e.target.value }))}
                    placeholder="What should we do about this tool?"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Candidates (comma-separated)</label>
                  <input
                    type="text"
                    value={voteForm.candidates}
                    onChange={e => setVoteForm(f => ({ ...f, candidates: e.target.value }))}
                    placeholder="publish, repair, monitor"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Voting Agents (comma-separated)</label>
                  <input
                    type="text"
                    value={voteForm.agents}
                    onChange={e => setVoteForm(f => ({ ...f, agents: e.target.value }))}
                    placeholder="decision-agent, analytics-agent, optimization-agent"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={voteLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  {voteLoading ? 'Voting…' : 'Run Vote'}
                </button>
              </form>

              {voteResult && (
                <div className={`mt-4 p-4 rounded-xl border ${voteResult.error ? 'bg-red-900/20 border-red-700' : 'bg-green-900/20 border-green-700'}`}>
                  {voteResult.error ? (
                    <p className="text-red-400 text-sm">{voteResult.error}</p>
                  ) : (
                    <div>
                      <p className="text-green-400 font-medium mb-2">Vote complete</p>
                      <p className="text-sm text-white">Outcome: <span className="text-indigo-400 font-bold">{voteResult.outcome}</span></p>
                      <p className="text-sm text-gray-300">Confidence: {(voteResult.confidence * 100).toFixed(0)}%</p>
                      <p className="text-sm text-gray-300">Consensus: {voteResult.consensusReached ? 'Yes' : 'No'}</p>
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
