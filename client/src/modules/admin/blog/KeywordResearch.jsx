import { useState } from 'react'
import api from '../../../services/api.service'

// ── Constants ─────────────────────────────────────────────────────────────────

const NICHES = [
  'Finance & Calculators', 'PDF Tools', 'AI Tools',
  'Health & Fitness', 'Legal & Business', 'General',
]

const LOADING_STEPS = [
  '🔍 Analyzing keyword competition...',
  '📊 Checking top competitors...',
  '💡 Finding better alternatives...',
  '📅 Building content strategy...',
  '✅ Research complete!',
]

const VERDICT_CFG = {
  'Use This':           { bg: 'bg-green-600',  icon: '🟢', label: 'USE THIS'           },
  'Avoid':              { bg: 'bg-red-600',    icon: '🔴', label: 'AVOID'              },
  'Long Term':          { bg: 'bg-yellow-600', icon: '🟡', label: 'LONG TERM'          },
  'With Modifications': { bg: 'bg-blue-600',   icon: '🔵', label: 'WITH MODIFICATIONS' },
}

const DIFF_CLS = {
  Easy:       'bg-green-900/60 text-green-300 border-green-700/40',
  Medium:     'bg-yellow-900/60 text-yellow-300 border-yellow-700/40',
  Hard:       'bg-red-900/60 text-red-300 border-red-700/40',
  'Very Hard':'bg-red-900/80 text-red-200 border-red-700/60',
  Extreme:    'bg-red-950 text-red-100 border-red-800',
}

const PRI_CLS = { High: 'text-green-400', Medium: 'text-yellow-400', Low: 'text-gray-400' }
const WEEK_ICON = { High: '🟢', Medium: '🟡', Low: '🔴', Easy: '🟢' }
const ADSENSE_CLS = {
  'Very High': 'bg-green-900/40 text-green-300',
  'High':      'bg-green-900/30 text-green-400',
  'Medium':    'bg-yellow-900/30 text-yellow-400',
  'Low':       'bg-gray-700 text-gray-400',
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Badge({ level }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${DIFF_CLS[level] || DIFF_CLS.Medium}`}>
      {level}
    </span>
  )
}

function PriLabel({ level }) {
  return <span className={`text-[10px] font-bold uppercase tracking-wide ${PRI_CLS[level] || 'text-gray-400'}`}>[{level}]</span>
}

// ── Card 1 — Keyword Scorecard ────────────────────────────────────────────────

function ScoreCard({ main, siteDA }) {
  const vc = VERDICT_CFG[main.verdict] || VERDICT_CFG['With Modifications']

  function gauge(possible, months) {
    if (!possible) return { pct: 12, label: 'Cannot rank', color: 'bg-red-500' }
    if (months <= 3)  return { pct: 85, label: `Possible (${months} months)`,     color: 'bg-green-500' }
    if (months <= 6)  return { pct: 55, label: `Difficult (${months} months)`,    color: 'bg-yellow-500' }
    if (months <= 12) return { pct: 30, label: `Very hard (${months} months)`,    color: 'bg-orange-500' }
    return              { pct: 12, label: `Long shot (${months}+ months)`, color: 'bg-red-500' }
  }

  const da10 = gauge(main.canRank?.da10?.possible, main.canRank?.da10?.timeMonths)
  const da20 = gauge(main.canRank?.da20?.possible, main.canRank?.da20?.timeMonths)
  const da30 = gauge(main.canRank?.da30?.possible, main.canRank?.da30?.timeMonths)

  const metrics = [
    { icon: '🇮🇳', label: 'India Searches',  value: main.monthlySearches?.india  || '—' },
    { icon: '🌍', label: 'Global Searches',  value: main.monthlySearches?.global || '—' },
    { icon: '💰', label: 'AdSense CPC',       value: main.cpc                     || '—' },
    { icon: '🎯', label: 'Search Intent',     value: main.searchIntent            || '—' },
    { icon: '📈', label: 'Trend',              value: `${main.trendDirection || 'Stable'} ${main.trendDirection === 'Rising' ? '↑' : main.trendDirection === 'Declining' ? '↓' : '→'}` },
    { icon: '🏆', label: 'KD Score',           value: main.keywordDifficulty ? `${main.keywordDifficulty}/100` : '—' },
  ]

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Keyword Analysis</p>
        <h3 className="text-xl font-bold text-white break-words">"{main.keyword}"</h3>
        {main.intentExplanation && <p className="text-xs text-gray-500 mt-1">{main.intentExplanation}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {metrics.map(({ icon, label, value }) => (
          <div key={label} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <p className="text-base mb-0.5">{icon}</p>
            <p className="text-white text-sm font-bold leading-tight">{value}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          DA Compatibility (Your DA: {siteDA})
        </p>
        {[['DA 10', da10], ['DA 20', da20], ['DA 30', da30]].map(([label, g]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${g.color}`} style={{ width: `${g.pct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-44 text-right shrink-0">{g.label}</span>
          </div>
        ))}
      </div>

      <div className={`${vc.bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
        <span className="text-2xl">{vc.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm">{vc.label} — {main.verdictScore}/10</p>
          <p className="text-white/80 text-xs mt-0.5 leading-relaxed">{main.verdictReason}</p>
        </div>
      </div>

      {main.serpFeatures?.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 mb-2">SERP Features Detected:</p>
          <div className="flex flex-wrap gap-1.5">
            {main.serpFeatures.map(f => (
              <span key={f} className="text-[10px] px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded border border-indigo-700/40">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {main.adSensePotential && (
        <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${ADSENSE_CLS[main.adSensePotential] || ADSENSE_CLS.Low}`}>
          💰 AdSense: {main.adSensePotential} — {main.adSenseCPCNote}
        </div>
      )}

      {main.seasonalityNote && (
        <p className="text-[11px] text-gray-500">📅 {main.seasonality}: {main.seasonalityNote}</p>
      )}

      {main.trendNote && (
        <p className="text-[11px] text-gray-500">📊 {main.trendNote}</p>
      )}
    </div>
  )
}

// ── Card 2 — Competitor Intelligence ─────────────────────────────────────────

function CompetitorCard({ competitors = [], gaps = [] }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold text-white">🕵️ Competitor Intelligence</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              {['Site', 'Est. DA', 'Backlinks', 'Content', 'Why They Rank', 'Their Weakness'].map(h => (
                <th key={h} className="text-left py-2 px-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.slice(0, 5).map((c, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="py-2.5 px-2 text-indigo-400 font-medium whitespace-nowrap">{c.site}</td>
                <td className="py-2.5 px-2 text-white whitespace-nowrap">{c.estimatedDA}</td>
                <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">{c.estimatedBacklinks}</td>
                <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">{c.contentLength}</td>
                <td className="py-2.5 px-2 text-gray-300 max-w-[150px]">{c.whyTheyRank}</td>
                <td className="py-2.5 px-2 text-red-300 max-w-[150px]">{c.weakness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gaps.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Content Gap Opportunities</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gaps.slice(0, 3).map((g, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-1.5">
                <p className="text-yellow-400 text-[10px] font-semibold">❌ No one covers:</p>
                <p className="text-white text-xs font-medium">{g.gap}</p>
                <p className="text-gray-500 text-[11px]">{g.opportunity}</p>
                <Badge level={g.difficulty || 'Easy'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card 3 — Keyword Clusters ─────────────────────────────────────────────────

function ClustersCard({ clusters = [], onWrite }) {
  const [active, setActive] = useState(0)
  if (!clusters.length) return null
  const cluster = clusters[active] || clusters[0]

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white">🗂️ Keyword Clusters</h3>

      <div className="flex flex-wrap gap-1.5">
        {clusters.map((c, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              active === i ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:text-white'
            }`}
          >
            {c.clusterName}
            <span className="ml-1.5 text-[10px] opacity-60">({(c.keywords || []).length})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(cluster.keywords || []).map((kw, i) => (
          <button
            key={i}
            onClick={() => onWrite({ topic: kw.keyword, keyword: kw.keyword, toolSlug: '' })}
            title="Click to write article"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 cursor-pointer ${
              kw.difficulty === 'Easy'   ? 'bg-green-900/50 text-green-300 border-green-700/40' :
              kw.difficulty === 'Hard'   ? 'bg-red-900/50 text-red-300 border-red-700/40' :
                                          'bg-yellow-900/50 text-yellow-300 border-yellow-700/40'
            }`}
          >
            {kw.keyword}
            <span className="ml-1.5 opacity-60">{kw.searches}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-600">Click any chip → opens in Blog Writer</p>
    </div>
  )
}

// ── Card 4 — Top 8 Alternatives ───────────────────────────────────────────────

function AlternativesCard({ alternatives = [], onWrite, onQueue }) {
  const sorted = [...alternatives].sort((a, b) => {
    const p = { High: 0, Medium: 1, Low: 2 }
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
  })

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white">🎯 Top 8 Alternative Keywords <span className="text-gray-500 font-normal">(Priority Ranked)</span></h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.slice(0, 8).map((kw, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge level={kw.difficulty} />
              <PriLabel level={kw.priority} />
              <span className="ml-auto text-[10px] text-gray-600">#{i + 1}</span>
            </div>

            <p className="text-white text-sm font-semibold leading-snug">"{kw.keyword}"</p>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <span className="text-gray-400">📊 {kw.searches}</span>
              <span className="text-gray-400">⏱️ {kw.canRankInMonths}mo</span>
              <span className="text-yellow-400">💰 {kw.adSenseCPC}</span>
            </div>

            {kw.articleAngle && (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="text-gray-600">Angle: </span>{kw.articleAngle}
              </p>
            )}
            {kw.aweosTool && (
              <p className="text-[11px] text-indigo-400">🛠️ {kw.aweosTool}</p>
            )}
            {kw.indianContext && (
              <p className="text-[11px] text-amber-400">🇮🇳 {kw.indianContext}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onWrite({ topic: kw.keyword, keyword: kw.keyword, toolSlug: kw.aweosToolSlug || '' })}
                className="flex-1 py-1.5 text-[11px] font-semibold bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors"
              >
                ✏️ Write Article
              </button>
              <button
                onClick={() => onQueue({ keyword: kw.keyword, topic: kw.articleAngle || kw.keyword, toolSlug: kw.aweosToolSlug || '' })}
                title="Add to queue"
                className="px-3 py-1.5 text-[11px] font-bold bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                ➕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Card 5 — Long-Tail Gems ───────────────────────────────────────────────────

function LongTailCard({ gems = [], onWrite }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">💎 Hidden Gems — Easy to Rank</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Low competition, targeted traffic</p>
      </div>
      <div className="space-y-3">
        {gems.slice(0, 6).map((g, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex gap-4 items-start">
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium truncate">"{g.keyword}"</span>
                <Badge level="Easy" />
              </div>
              <div className="flex gap-4 text-[11px] text-gray-500">
                <span>📊 {g.searches}</span>
                <span>⏱️ Rank in {g.canRankInMonths} months</span>
              </div>
              <p className="text-xs text-gray-400">{g.articleIdea}</p>
              <p className="text-[11px] text-gray-600 italic">{g.whyItWorks}</p>
            </div>
            <button
              onClick={() => onWrite({ topic: g.keyword, keyword: g.keyword, toolSlug: '' })}
              className="shrink-0 px-3 py-2 text-xs font-semibold bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              Write Now
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Card 6 — Content Brief ────────────────────────────────────────────────────

function ContentBriefCard({ brief, onWriteWithBrief }) {
  const [copied, setCopied] = useState(false)
  if (!brief) return null

  function copyBrief() {
    const lines = [
      `Title: ${brief.recommendedTitle}`,
      `Meta Title (${(brief.metaTitle || '').length}/60): ${brief.metaTitle}`,
      `Meta Desc (${(brief.metaDescription || '').length}/155): ${brief.metaDescription}`,
      `Word Count: ${brief.targetWordCount}`,
      `\nH2 Sections:\n${(brief.recommendedH2s || []).map((h, i) => `${i + 1}. ${h}`).join('\n')}`,
      `\nMust Include:\n${(brief.mustInclude || []).map(t => `• ${t}`).join('\n')}`,
      `\nInternal Links:\n${(brief.internalLinks || []).join('\n')}`,
      `\nFAQ Questions:\n${(brief.faqQuestions || []).map(q => `• ${q}`).join('\n')}`,
      `\nUnique Angle: ${brief.uniqueAngle}`,
    ].join('\n')
    navigator.clipboard.writeText(lines).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white">📋 AI Content Brief</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Ready-to-use brief for the recommended keyword</p>
      </div>

      <div>
        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest">Recommended Title</p>
        <p className="text-white text-sm font-semibold leading-snug">{brief.recommendedTitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <p className="text-[10px] text-gray-500 mb-1">META TITLE ({(brief.metaTitle || '').length}/60)</p>
          <p className="text-xs text-indigo-300 leading-relaxed">{brief.metaTitle}</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <p className="text-[10px] text-gray-500 mb-1">TARGET WORD COUNT</p>
          <p className="text-white text-2xl font-bold">{brief.targetWordCount}</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <p className="text-[10px] text-gray-500 mb-1">META DESCRIPTION ({(brief.metaDescription || '').length}/155)</p>
        <p className="text-xs text-gray-300 leading-relaxed">{brief.metaDescription}</p>
      </div>

      <div>
        <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Recommended H2 Sections</p>
        <ol className="space-y-1.5">
          {(brief.recommendedH2s || []).map((h, i) => (
            <li key={i} className="text-xs text-white flex gap-2">
              <span className="text-gray-600 shrink-0 w-4">{i + 1}.</span>
              {h}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Must Include</p>
          <ul className="space-y-1">
            {(brief.mustInclude || []).map((t, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2">
                <span className="text-green-500 shrink-0">✓</span>{t}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Internal Links</p>
          <ul className="space-y-1">
            {(brief.internalLinks || []).map((l, i) => (
              <li key={i} className="text-[11px] text-indigo-400 font-mono">{l}</li>
            ))}
          </ul>
        </div>
      </div>

      {(brief.faqQuestions || []).length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">FAQ Questions to Answer</p>
          <ul className="space-y-1.5">
            {brief.faqQuestions.map((q, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2">
                <span className="text-indigo-400 shrink-0">Q{i + 1}.</span>{q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.uniqueAngle && (
        <div className="bg-indigo-900/30 border border-indigo-700/40 rounded-lg p-3">
          <p className="text-[10px] text-indigo-400 mb-1 uppercase tracking-widest">Unique Angle vs Competitors</p>
          <p className="text-xs text-white leading-relaxed">{brief.uniqueAngle}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={copyBrief}
          className="flex-1 py-2 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {copied ? '✓ Copied!' : '📋 Copy Full Brief'}
        </button>
        <button
          onClick={onWriteWithBrief}
          className="flex-1 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          ✏️ Generate Article with This Brief
        </button>
      </div>
    </div>
  )
}

// ── Card 7 — 4-Week Calendar ──────────────────────────────────────────────────

function CalendarCard({ plan = [], onWrite }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">📅 4-Week Content Calendar</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Recommended publishing schedule for max impact</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              {['Week', 'Article Title', 'Priority', 'Est. Ranking', ''].map(h => (
                <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.slice(0, 4).map((w, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="py-3 px-3 text-white font-bold">W{w.week || i + 1}</td>
                <td className="py-3 px-3 text-gray-300 max-w-[240px]">{w.title}</td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <span className="mr-1">{WEEK_ICON[w.priority] || '🟡'}</span>
                  <span className="text-gray-400">{w.priority}</span>
                </td>
                <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{w.estimatedRankingTime}</td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => onWrite({ topic: w.keyword || w.title, keyword: w.keyword || '', toolSlug: '' })}
                    className="px-2.5 py-1.5 text-[10px] font-semibold bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors whitespace-nowrap"
                  >
                    📝 Write
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Card 8 — ROI + Indian Strategy ───────────────────────────────────────────

function ROICard({ roi, insights }) {
  if (!roi && !insights) return null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-semibold text-white">📈 ROI Projection + Indian Strategy</h3>

      {roi && (
        <div>
          <p className="text-[11px] text-gray-500 mb-3">If you publish articles targeting these keywords:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Month', 'Traffic', 'AdSense Revenue'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Month 3',  roi.month3?.traffic,  roi.month3?.adRevenue],
                  ['Month 6',  roi.month6?.traffic,  roi.month6?.adRevenue],
                  ['Month 12', roi.month12?.traffic, roi.month12?.adRevenue],
                ].map(([label, traffic, revenue]) => (
                  <tr key={label} className="border-b border-gray-700/50">
                    <td className="py-2.5 px-3 text-white font-medium">{label}</td>
                    <td className="py-2.5 px-3 text-indigo-300">{traffic}</td>
                    <td className="py-2.5 px-3 text-green-400 font-semibold">{revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {roi.assumptions && <p className="text-[11px] text-gray-600 mt-2">* {roi.assumptions}</p>}
        </div>
      )}

      {insights && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">🇮🇳 Indian Audience Strategy</p>
          {[
            ['🔍 Search Behavior',  insights.searchBehavior],
            ['👥 Target Audience',  insights.targetAudience],
            ['🗣️ Hinglish Tip',    insights.hinglishTip],
            ['📅 Best Publish',     insights.bestPublishDay && insights.bestPublishTime
              ? `${insights.bestPublishDay} at ${insights.bestPublishTime}` : insights.bestPublishDay],
            ['📱 Social Strategy',  insights.socialStrategy],
            ['💬 WhatsApp Angle',   insights.whatsappAngle],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="bg-gray-900 rounded-lg px-3 py-2.5 border border-gray-700">
              <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
              <p className="text-xs text-white leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Article Queue (floating) ──────────────────────────────────────────────────

function ArticleQueue({ queue, onRemove, onWrite, onClear, onReorder }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && queue.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 w-80 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">📝 Article Queue</p>
            <button onClick={onClear} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {queue.map((item, i) => (
              <div key={i} className="bg-gray-900 rounded-lg px-3 py-2 flex items-center gap-2 border border-gray-700">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => onReorder(i, -1)}
                    disabled={i === 0}
                    className="text-gray-600 hover:text-white disabled:opacity-20 text-[9px] leading-none transition-colors"
                  >▲</button>
                  <button
                    onClick={() => onReorder(i, 1)}
                    disabled={i === queue.length - 1}
                    className="text-gray-600 hover:text-white disabled:opacity-20 text-[9px] leading-none transition-colors"
                  >▼</button>
                </div>
                <p className="text-[11px] text-gray-300 flex-1 truncate">{item.keyword}</p>
                <button
                  onClick={() => onWrite(item)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 shrink-0 transition-colors font-medium"
                >
                  Write
                </button>
                <button
                  onClick={() => onRemove(i)}
                  className="text-[10px] text-red-400 hover:text-red-300 shrink-0 transition-colors"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition-colors"
      >
        📝 Queue
        {queue.length > 0 && (
          <span className="bg-white text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {queue.length}
          </span>
        )}
      </button>
    </div>
  )
}

// ── Research History ──────────────────────────────────────────────────────────

function ResearchHistory({ history, onReresearch, onWrite }) {
  if (!history.length) return null

  const VERDICT_ICON = { 'Use This': '🟢', 'Avoid': '🔴', 'Long Term': '🟡', 'With Modifications': '🔵' }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">🕐 Research History</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              {['Keyword', 'Verdict', 'Score', 'Best Alternative', 'Date', ''].map(h => (
                <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 10).map((h, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="py-2 px-2 text-white font-medium">{h.keyword}</td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <span>{VERDICT_ICON[h.verdict] || '⚪'}</span>
                  <span className="ml-1 text-gray-400">{h.verdict}</span>
                </td>
                <td className="py-2 px-2 text-white">{h.score}/10</td>
                <td className="py-2 px-2 text-indigo-400 max-w-[140px] truncate">{h.topAlternative || '—'}</td>
                <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{h.date}</td>
                <td className="py-2 px-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onReresearch(h.keyword)}
                      title="Re-research"
                      className="text-gray-500 hover:text-white transition-colors"
                    >🔄</button>
                    {h.topAlternative && (
                      <button
                        onClick={() => onWrite({ topic: h.topAlternative, keyword: h.topAlternative, toolSlug: '' })}
                        title="Write top alternative"
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      >✏️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KeywordResearchTab({ onWriteIdea }) {
  const [form,        setForm]        = useState({ keyword: '', niche: NICHES[0], siteDA: 10 })
  const [loading,     setLoading]     = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)
  const [queue,       setQueue]       = useState(() => { try { return JSON.parse(localStorage.getItem('awe_article_queue') || '[]') } catch { return [] } })
  const [history,     setHistory]     = useState(() => { try { return JSON.parse(localStorage.getItem('awe_keyword_history') || '[]') } catch { return [] } })

  function saveQueue(q) {
    setQueue(q)
    localStorage.setItem('awe_article_queue', JSON.stringify(q))
  }

  function saveHistory(h) {
    setHistory(h)
    localStorage.setItem('awe_keyword_history', JSON.stringify(h))
  }

  async function handleResearch(presetKeyword) {
    const kw = presetKeyword || form.keyword
    if (!kw.trim()) return
    if (presetKeyword) setForm(f => ({ ...f, keyword: presetKeyword }))

    setLoading(true)
    setError(null)
    setResult(null)
    setLoadingStep(0)

    const timer = setInterval(() => setLoadingStep(s => Math.min(s + 1, 3)), 2800)
    try {
      const res = await api.post('/api/admin/blog/keyword-research', {
        keyword: kw.trim(),
        niche:   form.niche,
        siteDA:  form.siteDA,
      })
      clearInterval(timer)
      setLoadingStep(4)
      if (res.data.success) {
        setResult(res.data)
        const main   = res.data.analysis?.mainKeyword
        const topAlt = res.data.strategy?.top8Alternatives?.[0]?.keyword
        saveHistory([
          {
            keyword: kw.trim(),
            verdict: main?.verdict || '—',
            score:   main?.verdictScore || 0,
            topAlternative: topAlt || null,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          },
          ...history.filter(h => h.keyword !== kw.trim()),
        ].slice(0, 20))
      } else {
        setError(res.data.error || 'Research failed.')
      }
    } catch (err) {
      clearInterval(timer)
      setError(err.response?.data?.error || 'Research failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function addToQueue(item) {
    saveQueue([item, ...queue.filter(q => q.keyword !== item.keyword)].slice(0, 20))
  }

  function removeFromQueue(i) {
    saveQueue(queue.filter((_, idx) => idx !== i))
  }

  function reorderQueue(i, dir) {
    const q = [...queue]
    const j = i + dir
    if (j < 0 || j >= q.length) return
    ;[q[i], q[j]] = [q[j], q[i]]
    saveQueue(q)
  }

  function writeIdea(data) { onWriteIdea(data) }

  function writeWithBrief() {
    const brief = result?.strategy?.contentBrief
    const rec   = result?.strategy?.recommendedKeyword
    if (!brief || !rec) return
    writeIdea({ topic: brief.recommendedTitle || rec.keyword, keyword: rec.keyword, toolSlug: '' })
  }

  const main     = result?.analysis?.mainKeyword
  const strategy = result?.strategy
  const analysis = result?.analysis

  return (
    <div className="space-y-6 pb-24">

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-0.5">🔬 Deep Keyword Research</h2>
          <p className="text-[11px] text-gray-500">Powered by GPT-4o — brutally honest, India-focused, two-call analysis</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Target Keyword *</label>
          <input
            type="text"
            value={form.keyword}
            onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && !loading && handleResearch()}
            placeholder="e.g. home loan tax benefit india 2026"
            className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Niche</label>
            <select
              value={form.niche}
              onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Your Site DA: <span className="text-white font-bold">{form.siteDA}</span></label>
            <input
              type="range"
              min={1} max={100}
              value={form.siteDA}
              onChange={e => setForm(f => ({ ...f, siteDA: parseInt(e.target.value) }))}
              className="w-full accent-indigo-500 mt-2"
            />
          </div>
        </div>

        <button
          onClick={() => handleResearch()}
          disabled={loading || !form.keyword.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {LOADING_STEPS[loadingStep]}
            </>
          ) : '🔍 Deep Research'}
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* ── History ────────────────────────────────────────────────────────── */}
      <ResearchHistory history={history} onReresearch={handleResearch} onWrite={writeIdea} />

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {main && (
        <>
          <ScoreCard main={main} siteDA={form.siteDA} />
          <CompetitorCard competitors={main.topCompetitors} gaps={analysis?.competitorGaps} />
          <ClustersCard clusters={analysis?.keywordClusters} onWrite={writeIdea} />
        </>
      )}

      {strategy && (
        <>
          <AlternativesCard alternatives={strategy.top8Alternatives} onWrite={writeIdea} onQueue={addToQueue} />
          <LongTailCard gems={strategy.longTailGems} onWrite={writeIdea} />
          <ContentBriefCard brief={strategy.contentBrief} onWriteWithBrief={writeWithBrief} />
          <CalendarCard plan={strategy.monthlyPlan} onWrite={writeIdea} />
          <ROICard roi={strategy.roiProjection} insights={strategy.indianInsights} />
        </>
      )}

      {/* ── Floating Queue ──────────────────────────────────────────────────── */}
      <ArticleQueue
        queue={queue}
        onRemove={removeFromQueue}
        onWrite={item => writeIdea({ topic: item.topic || item.keyword, keyword: item.keyword, toolSlug: item.toolSlug || '' })}
        onClear={() => saveQueue([])}
        onReorder={reorderQueue}
      />
    </div>
  )
}
