import { useState } from 'react'
import api from '../../../services/api.service'
import { getAllTools, CATEGORY_META, getAllCategories } from '../../../data/toolRegistry'

const TOOLS = getAllTools().map(t => ({
  name:     t.name,
  slug:     t.slug,
  category: CATEGORY_META[t.category]?.name || t.category,
}))
const CATEGORIES = getAllCategories().map(slug => CATEGORY_META[slug].name)

const AUDIENCES = ['Students', 'Salaried', 'Business owners', 'CA/Accountants', 'Freelancers', 'General India']
const GOALS     = ['Drive traffic', 'Build authority', 'Get backlinks', 'Grow social following']

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

function DiffBadge({ level }) {
  const cls = level === 'High' ? 'bg-red-900/60 text-red-300' : level === 'Low' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'
  return <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${cls}`}>{level}</span>
}

export default function StrategyTab({ strategyState, onStrategyChange, onWriteThis }) {
  const [tool,      setTool]      = useState(strategyState?.tool || TOOLS.find(t => t.slug === 'sip-calculator') || TOOLS[0])
  const [audience,  setAudience]  = useState(strategyState?.audience || AUDIENCES[0])
  const [goal,      setGoal]      = useState(strategyState?.goal || GOALS[0])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const strategy = strategyState?.strategy || null

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/admin/growth-os/strategy', {
        toolSlug:     tool.slug,
        toolName:     tool.name,
        toolCategory: tool.category,
        audience,
        goal,
      })
      if (res.data.success) {
        onStrategyChange({
          tool, audience, goal,
          strategy: { keywords: res.data.keywords, competitors: res.data.competitors, calendar: res.data.calendar },
        })
        if (res.data.warnings?.length) {
          setError(`Partial result — ${res.data.warnings.join('; ')}`)
        }
      } else {
        setError(res.data.error || 'Strategy generation failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Strategy generation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Step 1: Goal Setter ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Step 1 — Goal Setter</h2>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">What do you want to promote?</label>
          <select
            value={tool.slug}
            onChange={e => { const t = TOOLS.find(x => x.slug === e.target.value); if (t) setTool(t) }}
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIES.map(cat => (
              <optgroup key={cat} label={`── ${cat}`}>
                {TOOLS.filter(t => t.category === cat).map(t => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Who is your target audience?</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map(a => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${audience === a ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Content goal this week?</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${goal === g ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner />Generating strategy…</> : '🎯 Generate Strategy'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {strategy && (
        <>
          {/* ── Step 2: Auto Research ── */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Step 2 — Auto Research</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700">
                    {['Keyword', 'Volume', 'Competition', 'Related Questions'].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {strategy.keywords.map((kw, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-2 px-2 text-white font-medium">{kw.keyword}</td>
                      <td className="py-2 px-2"><DiffBadge level={kw.volume} /></td>
                      <td className="py-2 px-2"><DiffBadge level={kw.competition} /></td>
                      <td className="py-2 px-2 text-gray-500 max-w-[280px]">{(kw.relatedQuestions || []).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Step 3: Competitor Analysis ── */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Step 3 — Competitor Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategy.competitors.map((c, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-indigo-400 truncate">{c.url}</p>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Ranks for</p>
                    <ul className="text-xs text-gray-300 space-y-0.5 list-disc list-inside">
                      {(c.ranksFor || []).map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Content gaps we can cover</p>
                    <ul className="text-xs text-green-300 space-y-0.5 list-disc list-inside">
                      {(c.gaps || []).map((g, j) => <li key={j}>{g}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Step 4: Content Calendar ── */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Step 4 — 7-Day Content Calendar</h2>
            <div className="space-y-2">
              {strategy.calendar.map(entry => (
                <div key={entry.day} className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center gap-4">
                  <div className="w-10 shrink-0 text-center">
                    <p className="text-lg font-bold text-white">D{entry.day}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-400 shrink-0 w-24 text-center">{entry.platform}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                  </div>
                  <DiffBadge level={entry.estimatedImpact} />
                  <button
                    onClick={() => onWriteThis({ topic: entry.title, keyword: strategy.keywords[0]?.keyword || '', toolSlug: tool.slug })}
                    className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg shrink-0 transition-colors"
                  >
                    Write This →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
