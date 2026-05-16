import { memo, useEffect, useState, useCallback } from 'react'

// ── Animated SVG Score Ring ──────────────────────────────────────────────────

const R = 32
const CIRC = 2 * Math.PI * R

function scoreColor(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

const ScoreRing = memo(function ScoreRing({ score, label, icon, size = 88 }) {
  const [offset, setOffset] = useState(CIRC)

  useEffect(() => {
    const t = setTimeout(() => setOffset(CIRC - (score / 100) * CIRC), 120)
    return () => clearTimeout(t)
  }, [score])

  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#1f2937" strokeWidth="6" />
          <circle
            cx={size / 2} cy={size / 2} r={R}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-base font-black text-white leading-tight mt-0.5">{score}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 font-medium text-center">{label}</span>
    </div>
  )
})

// ── Verdict Banner ───────────────────────────────────────────────────────────

const VerdictBanner = memo(function VerdictBanner({ score, gradeLabel, reasoning, priorityRating }) {
  const isGo = score >= 60
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${
      isGo ? 'bg-emerald-950/50 border-emerald-500/30' : 'bg-amber-950/40 border-amber-500/30'
    }`}>
      <span className="text-2xl shrink-0 mt-0.5">{isGo ? '🚀' : '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className={`text-sm font-bold ${isGo ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isGo ? 'Recommended to Launch' : 'Needs Refinement'} — {gradeLabel}
          </p>
          {priorityRating && (
            <span className="text-[10px] bg-gray-700 text-gray-300 border border-gray-600 px-2 py-0.5 rounded-full">
              {priorityRating}
            </span>
          )}
        </div>
        {reasoning?.map((r, i) => (
          <p key={i} className="text-xs text-gray-400 leading-relaxed">{r.text}</p>
        ))}
      </div>
    </div>
  )
})

// ── Grade Badge ──────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  'A':  'bg-green-500/20  text-green-400  border-green-500/40',
  'B+': 'bg-blue-500/20   text-blue-400   border-blue-500/40',
  'B':  'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  'C':  'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  'D':  'bg-red-500/20    text-red-400    border-red-500/40',
}

const GradeBadge = memo(function GradeBadge({ grade, label }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${GRADE_COLORS[grade] || GRADE_COLORS['C']}`}>
      <span className="text-2xl font-black">{grade}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
})

// ── Compact File Tree (inline inside panel) ──────────────────────────────────

const CompactFileTree = memo(function CompactFileTree({ architecture, filePath }) {
  if (!architecture && !filePath) return null
  const { mainFile, components = [], utilities = [], hooks = [] } = architecture || {}
  const main = mainFile || filePath

  const rows = [
    main       && { icon: '📄', file: main,        color: 'text-blue-300' },
    ...components.map(f => ({ icon: '🧩', file: f, color: 'text-purple-300' })),
    ...utilities.map(f => ({ icon: '⚙️', file: f,  color: 'text-yellow-300' })),
    ...hooks.map(f =>     ({ icon: '🪝', file: f,  color: 'text-green-300'  })),
  ].filter(Boolean)

  return (
    <div className="bg-gray-900/70 rounded-lg border border-gray-700/50 p-3 font-mono text-xs space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{row.icon}</span>
          <span className={`${row.color} shrink-0`}>{row.file.split('/').pop()}</span>
          <span className="text-gray-600 text-[9px] truncate hidden sm:block">
            {row.file.includes('/') ? row.file.replace(/\/[^/]+$/, '/') : ''}
          </span>
        </div>
      ))}
    </div>
  )
})

// ── Prompt Section ───────────────────────────────────────────────────────────

const PromptSection = memo(function PromptSection({ prompt, loading, onGenerate }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!prompt) return
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [prompt])

  const handleDownload = useCallback(() => {
    if (!prompt) return
    const blob = new Blob([prompt], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'claude-code-prompt.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [prompt])

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4 justify-center">
        <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Generating prompt…</span>
      </div>
    )
  }

  if (!prompt) {
    return (
      <button
        onClick={onGenerate}
        className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        ✨ Generate Claude Code Prompt
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">{prompt.length.toLocaleString()} characters</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              copied
                ? 'bg-green-600/20 text-green-400 border border-green-500/40'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            ⬇ Download
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={14}
        className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs font-mono rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 leading-relaxed"
      />
    </div>
  )
})

// ── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = memo(function Skeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mt-4 space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-700 rounded-full" />
          <div className="w-40 h-4 bg-gray-700 rounded" />
        </div>
        <div className="w-24 h-8 bg-gray-700 rounded-lg" />
      </div>
      <div className="flex justify-around py-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-[88px] h-[88px] rounded-full bg-gray-700" />
            <div className="w-16 h-3 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      <div className="h-16 bg-gray-700 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-700 rounded" />)}</div>
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-700 rounded" />)}</div>
      </div>
      <div className="h-10 bg-gray-700 rounded-lg" />
    </div>
  )
})

// ── Main Component ────────────────────────────────────────────────────────────

export default memo(function IntelligencePanel({
  data,
  loading,
  blueprint,
  blueprintLoading,
  onGenerateBlueprint,
  generatedPrompt,
  promptLoading,
  onGeneratePrompt,
}) {
  if (loading) return <Skeleton />
  if (!data)   return null

  const { analysis, monetization, seo, score, duplicateCheck } = data
  const analysisData = analysis     || {}
  const monetData    = monetization || {}
  const seoData      = seo          || {}
  const scoreData    = score        || {}
  const dupCheck     = duplicateCheck || {}

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden mt-4">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-800/80">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h3 className="text-sm font-semibold text-white">Intelligence Analysis</h3>
        </div>
        {scoreData.grade && (
          <GradeBadge grade={scoreData.grade} label={scoreData.gradeLabel || ''} />
        )}
      </div>

      <div className="p-5 space-y-5">

        {/* Duplicate warning */}
        {dupCheck.warning && (
          <div className={`rounded-lg border p-3 flex items-start gap-2 ${
            dupCheck.isDuplicate
              ? 'bg-red-950/40 border-red-500/40'
              : 'bg-yellow-950/40 border-yellow-500/40'
          }`}>
            <span className="text-lg shrink-0">{dupCheck.isDuplicate ? '🚫' : '⚠️'}</span>
            <div>
              <p className={`text-xs font-semibold ${dupCheck.isDuplicate ? 'text-red-400' : 'text-yellow-400'}`}>
                {dupCheck.isDuplicate ? 'Duplicate Detected' : 'Similar Tools Found'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{dupCheck.warning}</p>
            </div>
          </div>
        )}

        {/* Animated score rings */}
        <div className="flex justify-around py-2">
          <ScoreRing score={scoreData.overallScore       || 0} label="Overall"      icon="⭐" />
          <ScoreRing score={seoData.opportunityScore     || 0} label="SEO"          icon="📈" />
          <ScoreRing score={monetData.monetizationScore  || 0} label="Monetization" icon="💰" />
          <ScoreRing score={analysisData.uniquenessScore || 0} label="Uniqueness"   icon="✨" />
        </div>

        {/* Verdict banner */}
        <VerdictBanner
          score={scoreData.overallScore || 0}
          gradeLabel={scoreData.gradeLabel || ''}
          reasoning={scoreData.reasoning || []}
          priorityRating={monetData.primaryModel}
        />

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">Tool Details</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Complexity: <span className="text-white capitalize">{analysisData.complexity || '—'}</span></p>
                <p>Build time: <span className="text-white">~{analysisData.estimatedBuildTimeHours || '—'}h</span></p>
                <p>Audience: <span className="text-white">{analysisData.targetAudience || '—'}</span></p>
                <p>Solves: <span className="text-gray-300 text-[11px]">{analysisData.problemSolved || '—'}</span></p>
              </div>
            </div>
            {analysisData.coreFeatures?.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Core Features</p>
                <ul className="space-y-0.5">
                  {analysisData.coreFeatures.map((f, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">SEO Intelligence</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Difficulty: <span className="text-white">{seoData.difficultyScore || '—'}/100</span></p>
                <p>Intent: <span className="text-white capitalize">{seoData.searchIntent || '—'}</span></p>
                <p>Traffic: <span className="text-white">
                  {seoData.trafficEstimate?.monthlyLow?.toLocaleString() || '—'}–
                  {seoData.trafficEstimate?.monthlyHigh?.toLocaleString() || '—'}/mo
                </span></p>
                <p>Rank time: <span className="text-white">{seoData.timeToRankEstimate || '—'}</span></p>
              </div>
              {seoData.keywordClusters?.[0]?.keywords?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {seoData.keywordClusters[0].keywords.slice(0, 4).map((kw, i) => (
                    <span key={i} className="text-[10px] bg-gray-700/60 text-gray-300 px-1.5 py-0.5 rounded font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">Monetization</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Model: <span className="text-white">{monetData.primaryModel || '—'}</span></p>
                <p>Revenue: <span className="text-white">
                  ${monetData.estimatedMonthlyRevenue?.low?.toLocaleString() || 0}–
                  ${monetData.estimatedMonthlyRevenue?.high?.toLocaleString() || 0}/mo
                </span></p>
                <p>Payback: <span className="text-white">~{monetData.paybackPeriodMonths || '—'} months</span></p>
              </div>
              {monetData.viableModels?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
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

        {/* Blueprint section */}
        {onGenerateBlueprint && (
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Implementation Blueprint</p>

            {!blueprint && !blueprintLoading && (
              <button
                onClick={onGenerateBlueprint}
                className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                📐 Generate Implementation Blueprint
              </button>
            )}

            {blueprintLoading && (
              <div className="flex items-center gap-3 py-4 justify-center">
                <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Generating blueprint…</span>
              </div>
            )}

            {blueprint && !blueprintLoading && (
              <div className="space-y-3">
                {/* Compact file tree */}
                <CompactFileTree
                  architecture={blueprint.architecture}
                  filePath={blueprint.filePath}
                />

                {/* Build info row */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {blueprint.estimatedHours && (
                    <span>⏱ ~{blueprint.estimatedHours}h build</span>
                  )}
                  {blueprint.complexity && (
                    <span className="capitalize">📊 {blueprint.complexity} complexity</span>
                  )}
                  {blueprint.libraries?.length > 0 && (
                    <span>📦 {blueprint.libraries.slice(0, 2).join(', ')}{blueprint.libraries.length > 2 ? ` +${blueprint.libraries.length - 2}` : ''}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prompt section — only show if blueprint exists */}
        {blueprint && onGeneratePrompt && (
          <div className="space-y-3 border-t border-gray-700 pt-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Claude Code Prompt</p>
            <PromptSection
              prompt={generatedPrompt}
              loading={promptLoading}
              onGenerate={onGeneratePrompt}
            />
          </div>
        )}

      </div>
    </div>
  )
})
