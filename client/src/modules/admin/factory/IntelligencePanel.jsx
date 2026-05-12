import { memo } from 'react'

// ── Small reusable sub-components ──────────────────────────────────────────

const ScoreBar = memo(function ScoreBar({ value, color = 'bg-blue-500' }) {
  return (
    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
})

const ScoreCard = memo(function ScoreCard({ label, score, icon, color }) {
  const barColor = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-xl font-bold mb-1.5 ${color || 'text-white'}`}>{score}<span className="text-xs text-gray-500 font-normal">/100</span></p>
      <ScoreBar value={score} color={barColor} />
    </div>
  )
})

const GradeBadge = memo(function GradeBadge({ grade, label }) {
  const colorMap = {
    'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    'A':  'bg-green-500/20  text-green-400  border-green-500/40',
    'B+': 'bg-blue-500/20   text-blue-400   border-blue-500/40',
    'B':  'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    'C':  'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    'D':  'bg-red-500/20    text-red-400    border-red-500/40',
  }
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorMap[grade] || colorMap['C']}`}>
      <span className="text-2xl font-black">{grade}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
})

const DuplicateWarning = memo(function DuplicateWarning({ duplicateCheck }) {
  if (!duplicateCheck?.warning) return null
  const isError = duplicateCheck.isDuplicate
  return (
    <div className={`rounded-lg border p-3 mb-4 ${isError ? 'bg-red-950/40 border-red-500/40' : 'bg-yellow-950/40 border-yellow-500/40'}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{isError ? '🚫' : '⚠️'}</span>
        <div className="min-w-0">
          <p className={`text-xs font-semibold mb-0.5 ${isError ? 'text-red-400' : 'text-yellow-400'}`}>
            {isError ? 'Duplicate Detected' : 'Similar Tools Found'}
          </p>
          <p className="text-xs text-gray-400">{duplicateCheck.warning}</p>
          {duplicateCheck.similarTools?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {duplicateCheck.similarTools.slice(0, 3).map(t => (
                <a
                  key={t.id}
                  href={`/tools/${t.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] bg-gray-700 text-gray-300 hover:text-white px-2 py-0.5 rounded font-mono transition-colors"
                >
                  {t.name} ({t.similarity}%)
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

const KeywordChips = memo(function KeywordChips({ keywords, label }) {
  if (!keywords?.length) return null
  return (
    <div className="mt-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {keywords.map((kw, i) => (
          <span key={i} className="text-[11px] bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded font-mono">
            {kw}
          </span>
        ))}
      </div>
    </div>
  )
})

// ── Main component ──────────────────────────────────────────────────────────

export default memo(function IntelligencePanel({ data, onGenerateBlueprint, blueprintLoading }) {
  if (!data) return null

  const { analysis, monetization, seo, score, duplicateCheck, historical } = data

  const analysisData    = analysis    || {}
  const monetData       = monetization || {}
  const seoData         = seo         || {}
  const scoreData       = score       || {}
  const dupCheck        = duplicateCheck || {}
  const histData        = historical   || {}

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-800/80">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h3 className="text-sm font-semibold text-white">Intelligence Analysis</h3>
          {analysisData._fallback && (
            <span className="text-[10px] bg-yellow-900/50 text-yellow-400 border border-yellow-700/40 px-2 py-0.5 rounded-full">fallback mode</span>
          )}
        </div>
        {scoreData.grade && (
          <GradeBadge grade={scoreData.grade} label={scoreData.gradeLabel || ''} />
        )}
      </div>

      <div className="p-5 space-y-5">

        {/* Duplicate warning */}
        <DuplicateWarning duplicateCheck={dupCheck} />

        {/* Score grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard label="Overall"      score={scoreData.overallScore        || 0} icon="⭐" color="text-white"        />
          <ScoreCard label="SEO"          score={seoData.opportunityScore      || 0} icon="📈" color="text-blue-300"    />
          <ScoreCard label="Monetization" score={monetData.monetizationScore   || 0} icon="💰" color="text-green-300"   />
          <ScoreCard label="Uniqueness"   score={analysisData.uniquenessScore  || 0} icon="✨" color="text-purple-300"  />
        </div>

        {/* Analysis details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Left: Tool details */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Details</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Complexity: <span className="text-white capitalize">{analysisData.complexity || '—'}</span></p>
                <p>Build time: <span className="text-white">~{analysisData.estimatedBuildTimeHours || '—'}h</span></p>
                <p>Audience: <span className="text-white">{analysisData.targetAudience || '—'}</span></p>
                <p>Solves: <span className="text-gray-300">{analysisData.problemSolved || '—'}</span></p>
              </div>
            </div>

            {analysisData.coreFeatures?.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Core Features</p>
                <ul className="space-y-0.5">
                  {analysisData.coreFeatures.map((f, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Launch recommendation */}
            <div className={`rounded-lg border p-2.5 ${scoreData.launchRecommendation ? 'bg-green-950/40 border-green-700/40' : 'bg-gray-700/30 border-gray-600/40'}`}>
              <p className={`text-xs font-semibold ${scoreData.launchRecommendation ? 'text-green-400' : 'text-gray-400'}`}>
                {scoreData.launchRecommendation ? '✅ Recommended to Launch' : '⏸ Needs Refinement Before Launch'}
              </p>
            </div>
          </div>

          {/* Right: SEO + Monetization */}
          <div className="space-y-3">
            {/* SEO block */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">SEO Intelligence</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Difficulty: <span className="text-white">{seoData.difficultyScore || '—'}/100</span></p>
                <p>Intent: <span className="text-white capitalize">{seoData.searchIntent || '—'}</span></p>
                <p>Traffic est.: <span className="text-white">{seoData.trafficEstimate?.monthlyLow?.toLocaleString() || '—'}–{seoData.trafficEstimate?.monthlyHigh?.toLocaleString() || '—'}/mo</span></p>
                <p>Rank time: <span className="text-white">{seoData.timeToRankEstimate || '—'}</span></p>
              </div>
              <KeywordChips keywords={(seoData.keywordClusters?.[0]?.keywords || []).slice(0, 3)} label="Core keywords" />
            </div>

            {/* Monetization block */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Monetization</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Primary model: <span className="text-white">{monetData.primaryModel || '—'}</span></p>
                <p>Revenue est.: <span className="text-white">${monetData.estimatedMonthlyRevenue?.low?.toLocaleString() || 0}–${monetData.estimatedMonthlyRevenue?.high?.toLocaleString() || 0}/mo</span></p>
                <p>Payback: <span className="text-white">~{monetData.paybackPeriodMonths || '—'} months</span></p>
              </div>
              {monetData.viableModels?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {monetData.viableModels.slice(0, 3).map((m, i) => (
                    <span key={i} className="text-[10px] bg-green-900/40 text-green-400 border border-green-700/30 px-1.5 py-0.5 rounded">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reasoning */}
        {scoreData.reasoning?.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">Score Reasoning</p>
            <div className="space-y-1.5">
              {scoreData.reasoning.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="shrink-0">{r.icon}</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical context */}
        {histData.insights?.length > 0 && (
          <div className="bg-gray-700/30 rounded-lg border border-gray-600/40 p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">📊 Historical Context</p>
            {histData.insights.map((insight, i) => (
              <p key={i} className="text-xs text-gray-400">{insight}</p>
            ))}
          </div>
        )}

        {/* Blueprint button */}
        <button
          onClick={onGenerateBlueprint}
          disabled={blueprintLoading}
          className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-50 border border-indigo-500/40 text-indigo-400 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {blueprintLoading ? (
            <>
              <span className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Generating Blueprint…
            </>
          ) : (
            <>📐 Generate Implementation Blueprint</>
          )}
        </button>
      </div>
    </div>
  )
})
