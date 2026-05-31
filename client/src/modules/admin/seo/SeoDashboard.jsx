import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api.service'

// ── Coverage categories for blog gap map ─────────────────────────────────────
const COVERAGE_CATEGORIES = [
  { label: 'Finance',     topic: 'GST Calculator India 2026 — Complete Guide',       keyword: 'gst calculator india 2026',    tool: 'gst-calculator',    cityTool: 'gst-calculator'  },
  { label: 'Calculators', topic: 'BMI Calculator for Indians — Complete Guide 2026',  keyword: 'bmi calculator india',          tool: 'bmi-calculator',    cityTool: 'bmi-calculator'  },
  { label: 'PDF Tools',   topic: 'How to Merge PDF Files Free Online in India',       keyword: 'merge pdf free online india',   tool: 'merge-pdf',         cityTool: null              },
  { label: 'AI Tools',    topic: 'Best Free AI Content Writer for Indian SMBs 2026',  keyword: 'free ai content writer india',  tool: 'ai-content-writer', cityTool: null              },
  { label: 'Converters',  topic: 'CSV to JSON Converter — Free Tool for Developers',  keyword: 'csv to json converter free',    tool: 'csv-to-json',       cityTool: null              },
  { label: 'Career',      topic: 'Resume Tips for Indian Job Seekers 2026',           keyword: 'resume tips india ats 2026',    tool: 'resume-builder',    cityTool: null              },
  { label: 'Marketing',   topic: 'QR Code Marketing Guide for Indian Small Business', keyword: 'qr code marketing india',       tool: 'qr-code-generator', cityTool: null              },
]

// ── Grade colours ────────────────────────────────────────────────────────────
const GRADE_COLOR = { A: 'text-green-400', B: 'text-lime-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400' }
const GRADE_BAR   = { A: 'bg-green-500',   B: 'bg-lime-500',   C: 'bg-yellow-500',   D: 'bg-orange-500',   F: 'bg-red-500'   }
const SUB_BAR = (score) => score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return ''
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)} min ago`
  return `${Math.round(secs / 3600)} hr ago`
}

export default function SeoDashboard() {
  const navigate = useNavigate()

  // ── Core dashboard data ──────────────────────────────────────────────────
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Section 1: SEO Health Score ───────────────────────────────────────────
  const [healthScore,   setHealthScore]   = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [nowTick,       setNowTick]       = useState(Date.now())
  const tickRef = useRef(null)

  // ── Section 2: Thin Content Manager ──────────────────────────────────────
  const [scanData,       setScanData]       = useState(null)
  const [scanLoading,    setScanLoading]    = useState(false)
  const [fixingSlug,     setFixingSlug]     = useState(null)
  const [fixingAll,      setFixingAll]      = useState(false)
  const [fixAllProgress, setFixAllProgress] = useState({ current: 0, total: 0, label: '' })
  const [fixResults,     setFixResults]     = useState({})

  // ── City Pages Controller ─────────────────────────────────────────────────
  const [cityStatus,        setCityStatus]        = useState(null)
  const [cityStatusLoading, setCityStatusLoading] = useState(true)

  // ── GSC Indexing Status ───────────────────────────────────────────────────
  const [gscPending, setGscPending] = useState(null)
  const [gscLoading, setGscLoading] = useState(true)

  const loadHealthScore = useCallback(async () => {
    setHealthLoading(true)
    try {
      const r = await api.get('/api/admin/seo/health-score')
      setHealthScore(r.data.score || null)
    } catch {
      setHealthScore(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    // Dashboard stats
    api.get('/api/admin/seo/dashboard-data')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))

    // Health score
    loadHealthScore()

    // City coverage
    api.get('/api/admin/seo/city-pages-status')
      .then(r => setCityStatus(r.data.status || []))
      .catch(() => setCityStatus([]))
      .finally(() => setCityStatusLoading(false))

    // GSC pending
    api.get('/api/admin/seo/gsc-pending')
      .then(r => setGscPending(r.data.pending || []))
      .catch(() => setGscPending([]))
      .finally(() => setGscLoading(false))

    // Tick "last updated" every 30s
    tickRef.current = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(tickRef.current)
  }, [loadHealthScore])

  // ── Thin Content handlers ─────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setScanLoading(true)
    setScanData(null)
    try {
      const r = await api.get('/api/admin/seo/scan-tool-content')
      setScanData(r.data.results || [])
    } catch {
      setScanData([])
    } finally {
      setScanLoading(false)
    }
  }, [])

  const handleFixOne = useCallback(async (slug) => {
    setFixingSlug(slug)
    try {
      const r = await api.post('/api/admin/seo/fix-thin-content', { slug, targetWords: 700 })
      setFixResults(prev => ({ ...prev, [slug]: r.data }))
      if (r.data.wordsAfter) {
        setScanData(prev => prev?.map(e =>
          e.slug === slug
            ? { ...e, words: r.data.wordsAfter, status: r.data.wordsAfter >= 600 ? 'good' : r.data.wordsAfter >= 300 ? 'low' : 'critical' }
            : e
        ))
      }
    } catch (err) {
      setFixResults(prev => ({ ...prev, [slug]: { error: err.response?.data?.error || 'Fix failed' } }))
    } finally {
      setFixingSlug(null)
    }
  }, [])

  // Fix All 🔴 = only Critical pages (<300 words)
  const handleFixAllCritical = useCallback(async () => {
    if (!scanData) return
    const critical = scanData.filter(e => e.words < 300 && !fixResults[e.slug]?.wordsAfter).map(e => e.slug)
    if (!critical.length) return
    setFixingAll(true)
    for (let i = 0; i < critical.length; i++) {
      setFixAllProgress({ current: i + 1, total: critical.length, label: critical[i] })
      await handleFixOne(critical[i])
    }
    setFixingAll(false)
    setFixAllProgress({ current: 0, total: 0, label: '' })
  }, [scanData, fixResults, handleFixOne])

  if (loading) return <Spinner />
  if (!data)   return <div className="p-6 text-red-400">Failed to load dashboard data. Check server logs.</div>

  const { stats, recentArticles, contentGaps, monthlyCalendar } = data

  const startDay = monthlyCalendar[0]?.date
    ? new Date(monthlyCalendar[0].date + 'T00:00:00').getDay()
    : 0

  const daysSince = stats.lastPublished
    ? Math.round((new Date() - new Date(stats.lastPublished)) / 86400000)
    : null

  const alerts = []
  if (stats.publishingStreak < 3) alerts.push({ msg: `Publishing streak is ${stats.publishingStreak} day${stats.publishingStreak !== 1 ? 's' : ''} — keep going!`, action: 'Write Now', to: '/admin/blog', sev: 'yellow' })
  if (stats.articlesThisMonth < 3) alerts.push({ msg: `Only ${stats.articlesThisMonth} article${stats.articlesThisMonth !== 1 ? 's' : ''} this month — target is 3+`, action: 'Write Now', to: '/admin/blog', sev: 'red' })
  contentGaps.forEach(gap => alerts.push({ msg: gap, action: 'Fix Gap', to: '/admin/blog', sev: 'red' }))
  if (!alerts.length) alerts.push({ msg: 'All health checks passing — keep publishing!', action: null, sev: 'green' })

  const sevCls = {
    red:    { wrap: 'bg-red-900/30 border-red-800',       text: 'text-red-300',    btn: 'bg-red-600 hover:bg-red-700' },
    yellow: { wrap: 'bg-yellow-900/30 border-yellow-800', text: 'text-yellow-300', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    green:  { wrap: 'bg-green-900/30 border-green-800',   text: 'text-green-300',  btn: 'bg-green-600 hover:bg-green-700' },
  }

  // Thin content counts (new thresholds)
  const criticalCount = scanData ? scanData.filter(e => e.words < 300 && !fixResults[e.slug]?.wordsAfter).length : null
  const fixableCount  = scanData ? scanData.filter(e => e.words < 600 && !fixResults[e.slug]?.wordsAfter).length : null

  // AdSense readiness
  const cityTotal  = cityStatus?.reduce((s, t) => s + t.done, 0) || 0
  const totalPages = stats.totalTools + stats.totalArticles + cityTotal
  const avgToolWords = scanData?.length ? Math.round(scanData.reduce((s, e) => s + e.words, 0) / scanData.length) : null

  const adsenseChecks = [
    { ok: true,  warn: false, label: 'HTTPS enabled',                                      detail: null },
    { ok: true,  warn: false, label: 'Privacy Policy page exists',                         detail: '/privacy' },
    { ok: true,  warn: false, label: 'Contact page exists',                                detail: '/contact' },
    { ok: totalPages >= 50, warn: totalPages >= 30 && totalPages < 50,
      label: `${totalPages} pages published`, detail: 'Need 50+ pages for AdSense' },
    { ok: stats.totalArticles >= 5, warn: stats.totalArticles >= 2 && stats.totalArticles < 5,
      label: `${stats.totalArticles} blog articles`, detail: 'AdSense reviewers expect 5+ articles' },
    avgToolWords !== null
      ? { ok: avgToolWords >= 600, warn: avgToolWords >= 400 && avgToolWords < 600,
          label: `Avg tool words: ${avgToolWords.toLocaleString()}`, detail: 'Need 600+ words/page' }
      : { ok: false, warn: true, label: 'Avg tool words: not scanned', detail: 'Click Scan All Pages' },
    { ok: false, warn: false, label: 'GSC not connected', detail: 'Connect Search Console for traffic data' },
  ]
  const adsenseScore = Math.round((adsenseChecks.filter(c => c.ok).length / adsenseChecks.length) * 100)

  const adsenseActions = [
    { label: `Publish ${Math.max(0, 5 - stats.totalArticles)} more blog articles`, btn: 'Write Now',   action: () => navigate('/admin/blog') },
    { label: criticalCount !== null ? `Fix ${criticalCount} critical tool pages (<300 words)` : 'Scan and fix thin pages',
      btn: criticalCount !== null && criticalCount > 0 ? 'Fix All 🔴' : 'Scan Now',
      action: () => criticalCount !== null && criticalCount > 0 ? handleFixAllCritical() : handleScan() },
    { label: 'Submit pages to Google Search Console', btn: 'Open GSC',  action: () => window.open('https://search.google.com/search-console', '_blank') },
    { label: 'Apply for Google AdSense',              btn: 'Apply Now', action: () => window.open('https://www.google.com/adsense/start/', '_blank') },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">SEO Dashboard</h1>

      {/* ── SECTION 1: Real-Time SEO Health Score ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-white">AWE-OS SEO Health Score</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {healthScore?.computedAt
                ? `Last updated: ${timeAgo(healthScore.computedAt)}`
                : healthLoading ? 'Computing…' : 'Not loaded'}
            </p>
          </div>
          <button
            onClick={loadHealthScore}
            disabled={healthLoading}
            className="text-sm px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium disabled:opacity-50 transition-colors"
          >
            {healthLoading ? '…' : '↻ Refresh'}
          </button>
        </div>

        {healthLoading && !healthScore ? (
          <div className="flex items-center gap-3 py-8 text-gray-400 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Computing health score…
          </div>
        ) : healthScore ? (
          <>
            {/* Main score bar */}
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              <div className="text-center min-w-[80px]">
                <div className={`text-6xl font-bold ${GRADE_COLOR[healthScore.grade] || 'text-white'}`}>
                  {healthScore.overall}
                </div>
                <div className="text-gray-500 text-sm mt-0.5">/ 100</div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Overall Score</span>
                  <span className={`text-3xl font-bold ${GRADE_COLOR[healthScore.grade] || 'text-white'}`}>
                    Grade {healthScore.grade}
                  </span>
                </div>
                <div className="h-5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${GRADE_BAR[healthScore.grade] || 'bg-gray-500'}`}
                    style={{ width: `${healthScore.overall}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1 px-0.5">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>
            </div>

            {/* Sub-score breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.values(healthScore.breakdown).map(sub => (
                <div key={sub.label} className="bg-gray-700/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-300 font-medium">{sub.label}</span>
                    <span className="text-xs text-gray-500">{sub.weight}%</span>
                  </div>
                  <div className="h-2 bg-gray-600 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${SUB_BAR(sub.score)}`}
                      style={{ width: `${sub.score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${SUB_BAR(sub.score).replace('bg-', 'text-')}`}>
                      {sub.score}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{sub.detail}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm py-4">Failed to compute health score. Check server logs.</p>
        )}
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📝', label: 'Articles',   value: stats.totalArticles,     sub: 'total published' },
          { icon: '🔧', label: 'Tools',      value: stats.totalTools,        sub: 'active tools' },
          { icon: '📅', label: 'This Month', value: stats.articlesThisMonth, sub: 'articles published' },
          { icon: '🔥', label: 'Streak',     value: stats.publishingStreak,  sub: 'day publishing streak' },
        ].map(card => (
          <div key={card.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
            <p className="text-xs text-gray-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── SECTION 2: Thin Content Command Center ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Thin Content Command Center</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              🔴 Critical &lt;300 words · 🟡 Low 300–599 · 🟢 Good 600+
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {criticalCount !== null && criticalCount > 0 && (
              <button
                onClick={handleFixAllCritical}
                disabled={fixingAll || !!fixingSlug}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {fixingAll
                  ? `Fixing ${fixAllProgress.current}/${fixAllProgress.total}: ${fixAllProgress.label}…`
                  : `Fix All 🔴 (${criticalCount})`}
              </button>
            )}
            <button
              onClick={handleScan}
              disabled={scanLoading || fixingAll}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors"
            >
              {scanLoading ? 'Scanning…' : scanData ? '↻ Re-Scan' : 'Scan All Pages'}
            </button>
          </div>
        </div>

        {fixingAll && fixAllProgress.total > 0 && (
          <div className="mb-4">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((fixAllProgress.current / fixAllProgress.total) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Fixing {fixAllProgress.current}/{fixAllProgress.total}: {fixAllProgress.label}
            </p>
          </div>
        )}

        {!scanData && !scanLoading && (
          <p className="text-gray-500 text-sm text-center py-8">
            Click "Scan All Pages" to analyse word counts across all tool pages
          </p>
        )}

        {scanData && scanData.length > 0 && (
          <>
            {/* Summary pills */}
            <div className="flex gap-3 mb-3 text-xs flex-wrap">
              <span className="bg-red-900/40 text-red-300 border border-red-800 px-3 py-1 rounded-full">
                🔴 Critical: {scanData.filter(e => e.words < 300).length}
              </span>
              <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-800 px-3 py-1 rounded-full">
                🟡 Low: {scanData.filter(e => e.words >= 300 && e.words < 600).length}
              </span>
              <span className="bg-green-900/40 text-green-300 border border-green-800 px-3 py-1 rounded-full">
                🟢 Good: {scanData.filter(e => e.words >= 600).length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="pb-2 pr-4 font-medium">Tool Page</th>
                    <th className="pb-2 pr-4 font-medium">Words</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scanData.map(entry => {
                    const result  = fixResults[entry.slug]
                    const isFixed = result?.wordsAfter
                    const hasErr  = result?.error
                    const isCritical = entry.words < 300
                    const isLow      = entry.words >= 300 && entry.words < 600
                    return (
                      <tr key={entry.slug} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="py-2 pr-4 text-gray-300 font-mono text-xs">{entry.slug}</td>
                        <td className="py-2 pr-4">
                          <span className={isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-green-400'}>
                            {entry.words.toLocaleString()}
                          </span>
                          {isFixed && (
                            <span className="text-green-400 text-xs ml-2">→ {result.wordsAfter.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-xs">
                          {entry.words >= 600
                            ? <span className="text-green-400">🟢 Good</span>
                            : entry.words >= 300
                            ? <span className="text-yellow-400">🟡 Low</span>
                            : <span className="text-red-400">🔴 Critical</span>}
                        </td>
                        <td className="py-2">
                          {isFixed ? (
                            <span className="text-xs text-green-400">✅ Fixed! {result.wordsAfter} words</span>
                          ) : hasErr ? (
                            <span className="text-xs text-red-400">❌ {result.error}</span>
                          ) : entry.words < 600 ? (
                            <button
                              onClick={() => handleFixOne(entry.slug)}
                              disabled={!!fixingSlug || fixingAll}
                              className={`text-xs px-3 py-1 rounded text-white disabled:opacity-50 transition-colors
                                ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                            >
                              {fixingSlug === entry.slug ? 'Fixing…' : 'AI Fix'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Publishing Calendar ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Publishing Calendar</h2>
          {daysSince !== null && (
            <span className="text-sm text-gray-400">
              Last published:{' '}
              <span className={daysSince > 3 ? 'text-red-400' : 'text-green-400'}>
                {daysSince === 0 ? 'today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`}
              </span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(startDay).fill(null).map((_, i) => <div key={`b${i}`} />)}
          {monthlyCalendar.map(({ date, hasArticle, title }) => (
            <div
              key={date}
              title={title || ''}
              className={`rounded-full w-8 h-8 flex items-center justify-center mx-auto text-xs font-medium
                ${hasArticle ? 'bg-green-500 text-white cursor-pointer' : 'bg-gray-700 text-gray-400'}`}
            >
              {new Date(date + 'T00:00:00').getDate()}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Article published</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-700 inline-block" /> No article</span>
        </div>
      </div>

      {/* ── Content Health row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEO Alerts */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">SEO Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg p-3 border ${sevCls[alert.sev].wrap}`}>
                <p className={`text-sm ${sevCls[alert.sev].text}`}>{alert.msg}</p>
                {alert.action && (
                  <button
                    onClick={() => navigate(alert.to)}
                    className={`text-xs px-3 py-1 rounded font-medium text-white ml-3 shrink-0 ${sevCls[alert.sev].btn}`}
                  >
                    {alert.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Map */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Coverage Map</h2>
          <div className="space-y-1">
            {COVERAGE_CATEGORIES.map(cat => {
              const blogCount = stats.categoryCounts?.[cat.label] || 0
              const cityDone  = cat.cityTool ? (cityStatus?.find(s => s.toolSlug === cat.cityTool)?.done ?? null) : null
              const ok        = blogCount >= 5
              const warn      = blogCount >= 2 && blogCount < 5
              return (
                <div key={cat.label} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <span className="text-sm text-white flex items-center gap-2">
                    {ok ? '✅' : warn ? '⚠️' : '🔴'} {cat.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-gray-400">
                      <span>{blogCount} blog{blogCount !== 1 ? 's' : ''}</span>
                      {cityDone !== null && <span className="ml-2 text-gray-500">· {cityDone}/20 cities</span>}
                    </div>
                    {!ok && (
                      <button
                        onClick={() => navigate(`/admin/blog?prefill=1&category=${encodeURIComponent(cat.label)}&topic=${encodeURIComponent(cat.topic)}&keyword=${encodeURIComponent(cat.keyword)}&tool=${encodeURIComponent(cat.tool)}`)}
                        className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      >
                        Write Blog
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── City Pages Controller ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-4">City Pages Controller</h2>
        {cityStatusLoading ? (
          <p className="text-gray-400 text-sm animate-pulse">Loading city page coverage…</p>
        ) : !cityStatus?.length ? (
          <p className="text-gray-500 text-sm">No city page data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Tool</th>
                  <th className="pb-2 pr-4 font-medium">Cities Done</th>
                  <th className="pb-2 pr-4 font-medium">Missing</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {cityStatus.map(item => (
                  <tr key={item.toolSlug} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-2.5 pr-4 text-white font-medium">{item.toolName}</td>
                    <td className="py-2.5 pr-4">
                      <span className={item.done === item.total ? 'text-green-400' : item.done > 0 ? 'text-yellow-400' : 'text-red-400'}>
                        {item.done}/{item.total}{' '}
                        {item.done === item.total ? '✅' : item.done > 0 ? '🟡' : '❌'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">
                      {item.done === item.total
                        ? <span className="text-green-500">None</span>
                        : `${item.missing.slice(0, 3).join(', ')}${item.missing.length > 3 ? ` +${item.missing.length - 3} more` : ''}`}
                    </td>
                    <td className="py-2.5">
                      {item.done < item.total && (
                        <button
                          onClick={() => navigate(`/admin/programmatic?tool=${item.toolSlug}`)}
                          className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                        >
                          Generate Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── GSC Indexing Status ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Indexing Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pages logged to GSC queue but not yet confirmed indexed</p>
          </div>
          {gscPending && gscPending.length > 0 && (
            <button
              onClick={() => {
                gscPending.slice(0, 5).forEach((item, i) => {
                  setTimeout(() => {
                    window.open(`https://search.google.com/search-console/inspect?resource_id=https%3A%2F%2Fwww.awe-os.com%2F&id=${encodeURIComponent(item.url)}`, '_blank')
                  }, i * 400)
                })
              }}
              className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Submit All Pending ({gscPending.length})
            </button>
          )}
        </div>
        {gscLoading ? (
          <p className="text-gray-400 text-sm animate-pulse">Loading GSC queue…</p>
        ) : !gscPending?.length ? (
          <p className="text-gray-500 text-sm text-center py-4">✅ No pending URLs in the GSC queue</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-2 pr-4 font-medium">URL</th>
                  <th className="pb-2 pr-4 font-medium">Submitted</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {gscPending.map(item => (
                  <tr key={item.url} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-2.5 pr-4 text-gray-300 font-mono text-xs max-w-xs truncate" title={item.url}>
                      {item.url.replace('https://www.awe-os.com', '') || '/'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(item.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-yellow-400">⏳ {item.status}</span>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => window.open(`https://search.google.com/search-console/inspect?resource_id=https%3A%2F%2Fwww.awe-os.com%2F&id=${encodeURIComponent(item.url)}`, '_blank')}
                        className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Submit GSC
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── AdSense Readiness ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">AdSense Readiness Score</h2>
          <span className={`text-3xl font-bold ${adsenseScore >= 80 ? 'text-green-400' : adsenseScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {adsenseScore}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${adsenseScore >= 80 ? 'bg-green-500' : adsenseScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${adsenseScore}%` }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {adsenseChecks.map((check, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base mt-0.5 shrink-0">{check.ok ? '✅' : check.warn ? '⚠️' : '❌'}</span>
              <div>
                <p className={`text-sm ${check.ok ? 'text-green-300' : check.warn ? 'text-yellow-300' : 'text-red-300'}`}>{check.label}</p>
                {check.detail && <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>}
              </div>
            </div>
          ))}
        </div>
        <h3 className="text-sm font-semibold text-white mb-3">What to do next</h3>
        <div className="space-y-2">
          {adsenseActions.map((action, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-200">{i + 1}. {action.label}</p>
              <button
                onClick={action.action}
                className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 ml-4 transition-colors"
              >
                {action.btn}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Articles ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Articles</h2>
        {recentArticles.length === 0 ? (
          <p className="text-gray-400 text-sm">No articles yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Words</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentArticles.map(article => (
                  <tr key={article.slug} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4 text-white max-w-xs"><span className="line-clamp-1">{article.title}</span></td>
                    <td className="py-3 pr-4">
                      <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{article.category}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{article.date}</td>
                    <td className="py-3 pr-4">
                      <span className={article.wordCount < 800 ? 'text-red-400' : 'text-green-400'}>~{article.wordCount.toLocaleString()}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-3">
                        <button onClick={() => navigate('/admin/blog')}    className="text-xs text-blue-400 hover:text-blue-300">Optimize</button>
                        <button onClick={() => navigate('/admin/blog')}    className="text-xs text-purple-400 hover:text-purple-300">Add Links</button>
                        <button onClick={() => navigate('/admin/traffic')} className="text-xs text-green-400 hover:text-green-300">Promote</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '✍️', label: 'Write New Article',   to: '/admin/blog',         color: 'indigo'  },
            { icon: '🏙️', label: 'Generate City Pages',  to: '/admin/programmatic', color: 'purple'  },
            { icon: '🔍', label: 'Crawl Site',           to: '/admin/crawl',        color: 'orange'  },
            { icon: '📊', label: 'Audit Article SEO',    to: '/admin/blog',         color: 'green'   },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-colors
                ${action.color === 'indigo' ? 'bg-indigo-900/30 border-indigo-800 hover:bg-indigo-900/50' :
                  action.color === 'purple' ? 'bg-purple-900/30 border-purple-800 hover:bg-purple-900/50' :
                  action.color === 'orange' ? 'bg-orange-900/30 border-orange-800 hover:bg-orange-900/50' :
                                             'bg-green-900/30 border-green-800 hover:bg-green-900/50'}`}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className={`text-sm font-medium
                ${action.color === 'indigo' ? 'text-indigo-300' :
                  action.color === 'purple' ? 'text-purple-300' :
                  action.color === 'orange' ? 'text-orange-300' :
                                             'text-green-300'}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
