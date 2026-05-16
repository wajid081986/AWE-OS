import { memo, useState, useCallback } from 'react'

const CATEGORIES = [
  'productivity', 'marketing', 'finance', 'writing',
  'education', 'health', 'legal', 'ecommerce',
  'pdf', 'calculators', 'converters', 'other',
]

async function runAnalysis(toolIdea, category) {
  const res = await fetch('/api/analyze-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolIdea, category }),
  })
  if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
  const json = await res.json()
  const text = json.content?.[0]?.text || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in analysis response')
  return JSON.parse(match[0])
}

// ── Idea input card ───────────────────────────────────────────────────────────

const IdeaInput = memo(function IdeaInput({ id, color, category, onCategory, idea, onIdea }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3 flex-1">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${color}`}>
          {id}
        </span>
        <span className="text-sm font-semibold text-white">Tool {id}</span>
      </div>
      <select
        value={category}
        onChange={e => onCategory(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
      >
        {CATEGORIES.map(c => (
          <option key={c} value={c} className="capitalize">{c}</option>
        ))}
      </select>
      <textarea
        value={idea}
        onChange={e => onIdea(e.target.value)}
        rows={3}
        placeholder={`Describe Tool ${id}…`}
        className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500 resize-none"
      />
    </div>
  )
})

// ── Score display ─────────────────────────────────────────────────────────────

function ScoreCell({ score }) {
  const color = score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : score > 0 ? 'text-red-400' : 'text-gray-600'
  return <span className={`text-sm font-black ${color}`}>{score > 0 ? score : '—'}</span>
}

function WinnerMark({ a, b }) {
  if (typeof a !== 'number' || typeof b !== 'number' || (a === 0 && b === 0)) {
    return <span className="text-gray-600 text-xs">—</span>
  }
  if (a > b) return <span className="text-blue-400 text-xs font-bold">✓ A</span>
  if (b > a) return <span className="text-purple-400 text-xs font-bold">✓ B</span>
  return <span className="text-gray-500 text-xs">Tie</span>
}

// ── Comparison table rows ─────────────────────────────────────────────────────

const SCORE_ROWS = [
  { label: 'Overall Score',   key: 'overallScore'      },
  { label: 'SEO Score',       key: 'seoScore'          },
  { label: 'Monetization',    key: 'monetizationScore' },
  { label: 'Uniqueness',      key: 'uniquenessScore'   },
]

const TEXT_ROWS = [
  { label: 'Est. Revenue',    key: 'estimatedRevenue'  },
  { label: 'Competition',     key: 'competition'       },
  { label: 'Priority Rating', key: 'priorityRating'    },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function CompareMode() {
  const [catA, setCatA]   = useState('calculators')
  const [ideaA, setIdeaA] = useState('')
  const [catB, setCatB]   = useState('marketing')
  const [ideaB, setIdeaB] = useState('')

  const [dataA, setDataA]   = useState(null)
  const [dataB, setDataB]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const handleCompare = useCallback(async () => {
    if (!ideaA.trim() || !ideaB.trim()) {
      setError('Enter both tool ideas before comparing.')
      return
    }
    setLoading(true)
    setError(null)
    setDataA(null)
    setDataB(null)
    try {
      const [a, b] = await Promise.all([
        runAnalysis(ideaA, catA),
        runAnalysis(ideaB, catB),
      ])
      setDataA(a)
      setDataB(b)
    } catch (err) {
      setError(err.message || 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }, [ideaA, ideaB, catA, catB])

  const overallA   = dataA?.overallScore || 0
  const overallB   = dataB?.overallScore || 0
  const diff       = Math.abs(overallA - overallB)
  const winner     = overallA > overallB ? 'A' : overallB > overallA ? 'B' : 'tie'
  const hasResults = !!(dataA && dataB)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-1">⚖️ Compare Two Tool Ideas</h3>
        <p className="text-gray-400 text-sm">Analyze two ideas simultaneously and see which has better potential</p>
      </div>

      {/* Inputs side by side */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <IdeaInput
          id="A" color="bg-blue-600"
          category={catA} onCategory={setCatA}
          idea={ideaA}    onIdea={setIdeaA}
        />
        <div className="flex items-center justify-center py-2 sm:py-0">
          <span className="text-2xl font-black text-gray-600">vs</span>
        </div>
        <IdeaInput
          id="B" color="bg-purple-600"
          category={catB} onCategory={setCatB}
          idea={ideaB}    onIdea={setIdeaB}
        />
      </div>

      {/* Compare button */}
      <button
        onClick={handleCompare}
        disabled={loading || !ideaA.trim() || !ideaB.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing both ideas…
          </>
        ) : '⚖️ Compare Both'}
      </button>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">

          {/* Comparison table */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-gray-700 bg-gray-800/80">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Metric</span>
              <span className="text-[10px] text-blue-400   uppercase tracking-wider font-medium text-center">Tool A</span>
              <span className="text-[10px] text-purple-400 uppercase tracking-wider font-medium text-center">Tool B</span>
              <span className="text-[10px] text-gray-500   uppercase tracking-wider font-medium text-center">Winner</span>
            </div>

            {/* Score rows */}
            {SCORE_ROWS.map(({ label, key }) => {
              const a = dataA?.[key] || 0
              const b = dataB?.[key] || 0
              return (
                <div key={key} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                  <span className="text-xs text-gray-400">{label}</span>
                  <div className="text-center"><ScoreCell score={a} /></div>
                  <div className="text-center"><ScoreCell score={b} /></div>
                  <div className="text-center"><WinnerMark a={a} b={b} /></div>
                </div>
              )
            })}

            {/* Text rows */}
            {TEXT_ROWS.map(({ label, key }) => {
              const a = dataA?.[key]
              const b = dataB?.[key]
              return (
                <div key={key} className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors">
                  <span className="text-xs text-gray-400">{label}</span>
                  <div className="text-center"><span className="text-xs text-white">{a || '—'}</span></div>
                  <div className="text-center"><span className="text-xs text-white">{b || '—'}</span></div>
                  <div className="text-center"><span className="text-gray-600 text-xs">—</span></div>
                </div>
              )
            })}
          </div>

          {/* Verdict boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Tool A Verdict', data: dataA, labelColor: 'text-blue-400',   border: 'border-blue-700/30',   bg: 'bg-blue-900/20'   },
              { label: 'Tool B Verdict', data: dataB, labelColor: 'text-purple-400', border: 'border-purple-700/30', bg: 'bg-purple-900/20' },
            ].map(({ label, data, labelColor, border, bg }) => (
              <div key={label} className={`rounded-xl border p-3 ${bg} ${border}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${labelColor}`}>{label}</p>
                <p className="text-xs text-gray-300 leading-relaxed">{data?.verdictReason || '—'}</p>
              </div>
            ))}
          </div>

          {/* Recommendation banner */}
          <div className={`rounded-xl border p-5 flex items-start gap-4 ${
            winner === 'tie'
              ? 'bg-gray-700/30 border-gray-600/50'
              : winner === 'A'
                ? 'bg-blue-950/50 border-blue-500/30'
                : 'bg-purple-950/50 border-purple-500/30'
          }`}>
            <span className="text-3xl shrink-0">{winner === 'tie' ? '🤝' : '🏆'}</span>
            <div>
              {winner === 'tie' ? (
                <>
                  <p className="text-white font-bold text-base mb-1">It's a Tie!</p>
                  <p className="text-gray-400 text-sm">
                    Both ideas score equally. Choose based on your domain expertise or personal interest.
                  </p>
                </>
              ) : (
                <>
                  <p className={`font-bold text-base mb-1 ${winner === 'A' ? 'text-blue-400' : 'text-purple-400'}`}>
                    Tool {winner} Wins — {winner === 'A' ? overallA : overallB} vs {winner === 'A' ? overallB : overallA}
                  </p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-medium">{winner === 'A' ? ideaA : ideaB}</span>
                    {diff >= 15
                      ? ' has a clear advantage. Build this one first.'
                      : ' has a slight edge. Both are worth building.'}
                  </p>
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
