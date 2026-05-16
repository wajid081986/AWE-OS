import { memo, useState, useCallback, useMemo } from 'react'
import { useIdeaTracker } from '../../../hooks/useIdeaTracker'

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  analyzed:  { label: 'Analyzed',  bg: 'bg-blue-900/40',   text: 'text-blue-400',   border: 'border-blue-700/40'   },
  blueprint: { label: 'Blueprint', bg: 'bg-purple-900/40', text: 'text-purple-400', border: 'border-purple-700/40' },
  prompted:  { label: 'Prompted',  bg: 'bg-orange-900/40', text: 'text-orange-400', border: 'border-orange-700/40' },
  building:  { label: 'Building',  bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-700/40' },
  live:      { label: 'Live',      bg: 'bg-green-900/40',  text: 'text-green-400',  border: 'border-green-700/40'  },
}

const PIPELINE = ['analyzed', 'blueprint', 'prompted', 'building', 'live']

const FILTERS = [
  { id: 'all',       label: 'All'        },
  { id: 'highscore', label: 'High Score' },
  { id: 'mustbuild', label: 'Must Build' },
  { id: 'live',      label: 'Live'       },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 70) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function priorityFor(score) {
  if (score >= 80) return { label: 'Must Build', cls: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30' }
  if (score >= 65) return { label: 'High',       cls: 'text-blue-400   bg-blue-900/30   border-blue-700/30'     }
  if (score >= 50) return { label: 'Medium',     cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30'   }
  return                    { label: 'Low',        cls: 'text-gray-400   bg-gray-700/30   border-gray-600/30'     }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = memo(function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-700/40 border border-gray-600/40 rounded-xl p-3 text-center flex-1 min-w-0">
      <p className={`text-2xl font-black ${color || 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 font-medium truncate">{label}</p>
    </div>
  )
})

const StatusBadge = memo(function StatusBadge({ status }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.analyzed
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
})

// ── Expanded row detail ───────────────────────────────────────────────────────

const ExpandedRow = memo(function ExpandedRow({ idea, onStatusChange }) {
  return (
    <div className="px-4 pb-4 pt-2 bg-gray-700/10 border-t border-gray-700/40 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">Grade</p>
          <p className="text-white font-bold">
            {idea.grade}
            {idea.gradeLabel && (
              <span className="text-gray-400 font-normal ml-1 text-[10px]">{idea.gradeLabel}</span>
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">Category</p>
          <p className="text-white capitalize">{idea.category || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">Saved</p>
          <p className="text-white text-[10px]">
            {new Date(idea.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      {idea.toolIdea && (
        <div>
          <p className="text-[10px] text-gray-500 mb-1">Full Idea</p>
          <p className="text-xs text-gray-300 leading-relaxed">{idea.toolIdea}</p>
        </div>
      )}

      <div>
        <p className="text-[10px] text-gray-500 mb-1.5">Move through pipeline</p>
        <div className="flex flex-wrap gap-1">
          {PIPELINE.map(s => {
            const cfg = STATUS_STYLES[s]
            const isActive = idea.status === s
            return (
              <button
                key={s}
                onClick={() => !isActive && onStatusChange(idea.id, s)}
                className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} font-semibold`
                    : 'border-gray-700 text-gray-600 hover:text-gray-400 hover:border-gray-600'
                }`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────

export default function IdeaTracker({ ideas: propIdeas, stats: propStats, updateIdeaStatus: propUpdate, deleteIdea: propDelete } = {}) {
  const hook = useIdeaTracker()
  const ideas           = propIdeas  ?? hook.ideas
  const stats           = propStats  ?? hook.stats
  const updateIdeaStatus = propUpdate ?? hook.updateIdeaStatus
  const deleteIdea       = propDelete ?? hook.deleteIdea

  const [filter, setFilter]       = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [copied, setCopied]       = useState(null)

  const avgScore = useMemo(() => {
    const scored = ideas.filter(i => i.score > 0)
    if (!scored.length) return 0
    return Math.round(scored.reduce((s, i) => s + i.score, 0) / scored.length)
  }, [ideas])

  const highPriority = useMemo(() => ideas.filter(i => (i.score || 0) >= 70).length, [ideas])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'highscore': return ideas.filter(i => (i.score || 0) >= 70)
      case 'mustbuild': return ideas.filter(i => (i.score || 0) >= 80)
      case 'live':      return ideas.filter(i => i.status === 'live')
      default:          return ideas
    }
  }, [ideas, filter])

  const handleCopyPrompt = useCallback(async (idea) => {
    if (!idea.prompt) return
    await navigator.clipboard.writeText(idea.prompt)
    setCopied(idea.id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const toggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="flex gap-3">
        <StatCard label="Total Ideas"   value={stats.total}  color="text-white"                  />
        <StatCard label="Avg Score"     value={avgScore || '—'} color={scoreColor(avgScore)}     />
        <StatCard label="High Priority" value={highPriority} color="text-indigo-400"             />
        <StatCard label="Live"          value={stats.live}   color="text-green-400"              />
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 w-fit">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-xl">
          <p className="text-4xl mb-3">💡</p>
          <p className="text-gray-400 text-sm font-medium">
            {ideas.length === 0 ? 'No ideas saved yet' : 'No ideas match this filter'}
          </p>
          {ideas.length === 0 && (
            <p className="text-gray-600 text-xs mt-1">
              Analyze a tool idea in the Generate Tool tab to track it here
            </p>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-[1fr_56px_88px_88px_72px_160px] gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-800/80 min-w-[640px]">
              {['Name', 'Score', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                <span key={h} className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-700/60">
              {filtered.map(idea => {
                const priority = priorityFor(idea.score || 0)
                const isExpanded = expandedId === idea.id

                return (
                  <div key={idea.id}>
                    <div className="grid grid-cols-[1fr_56px_88px_88px_72px_160px] gap-3 px-4 py-3 items-center hover:bg-gray-700/20 transition-colors min-w-[640px]">

                      {/* Name */}
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium truncate">{idea.toolIdea || 'Untitled'}</p>
                        <p className="text-[10px] text-gray-500 capitalize">{idea.category}</p>
                      </div>

                      {/* Score */}
                      <div>
                        <span className={`text-sm font-black ${scoreColor(idea.score || 0)}`}>
                          {idea.score || '—'}
                        </span>
                        {idea.grade && (
                          <span className="text-[9px] text-gray-500 ml-0.5">{idea.grade}</span>
                        )}
                      </div>

                      {/* Priority */}
                      <div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priority.cls}`}>
                          {priority.label}
                        </span>
                      </div>

                      {/* Status */}
                      <div>
                        <StatusBadge status={idea.status} />
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-[10px] text-gray-500">
                          {new Date(idea.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short',
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => toggleExpand(idea.id)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>

                        {idea.prompt && (
                          <button
                            onClick={() => handleCopyPrompt(idea)}
                            className={`text-[10px] font-medium transition-colors ${
                              copied === idea.id
                                ? 'text-green-400'
                                : 'text-purple-400 hover:text-purple-300'
                            }`}
                          >
                            {copied === idea.id ? '✓' : 'Prompt'}
                          </button>
                        )}

                        {idea.status !== 'live' && (
                          <button
                            onClick={() => updateIdeaStatus(idea.id, 'live')}
                            className="text-[10px] text-green-400 hover:text-green-300 transition-colors font-medium"
                          >
                            Mark Live
                          </button>
                        )}

                        <button
                          onClick={() => deleteIdea(idea.id)}
                          className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <ExpandedRow idea={idea} onStatusChange={updateIdeaStatus} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-gray-700 flex items-center justify-between">
            <span className="text-[10px] text-gray-600">
              {filtered.length} of {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
