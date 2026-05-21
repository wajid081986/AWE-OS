import { useState } from 'react'
import api from '../../../services/api.service'

const NICHES = ['Finance', 'PDF', 'AI', 'Health', 'Legal', 'General']

function ScoreRing({ label, score }) {
  const color =
    score >= 70 ? '#22c55e' :
    score >= 40 ? '#eab308' :
                  '#ef4444'
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const fill   = circ - (circ * score) / 100

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#374151" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={fill}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">
          {score}
        </text>
      </svg>
      <span className="text-xs text-gray-400 font-semibold">{label}</span>
    </div>
  )
}

function copyText(t) {
  navigator.clipboard.writeText(t).catch(() => {})
}

export default function EeatBooster() {
  const [niche,        setNiche]        = useState('Finance')
  const [articleText,  setArticleText]  = useState('')
  const [analyzing,    setAnalyzing]    = useState(false)
  const [boosting,     setBoosting]     = useState(false)
  const [error,        setError]        = useState(null)
  const [analysis,     setAnalysis]     = useState(null)
  const [boosted,      setBoosted]      = useState('')
  const [boostedAnalysis, setBoostedAnalysis] = useState(null)
  const [reanalyzing,  setReanalyzing]  = useState(false)
  const [copied,       setCopied]       = useState(false)

  async function handleAnalyze(text = articleText) {
    if (!text.trim()) { setError('Paste an article to analyze.'); return }
    setAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setBoosted('')
    setBoostedAnalysis(null)
    try {
      const res = await api.post('/api/admin/blog/eeat-analyze', { articleText: text, niche })
      if (res.data.success) {
        setAnalysis(res.data.result)
      } else {
        setError(res.data.error || 'Analysis failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleBoost() {
    if (!analysis) return
    setBoosting(true)
    setError(null)
    try {
      const res = await api.post('/api/admin/blog/eeat-boost', {
        articleText,
        niche,
        missingSignals: analysis.missing,
      })
      if (res.data.success) {
        setBoosted(res.data.boostedArticle || '')
      } else {
        setError(res.data.error || 'Boost failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Boost failed.')
    } finally {
      setBoosting(false)
    }
  }

  async function handleReanalyze() {
    if (!boosted.trim()) return
    setReanalyzing(true)
    setError(null)
    try {
      const res = await api.post('/api/admin/blog/eeat-analyze', { articleText: boosted, niche })
      if (res.data.success) {
        setBoostedAnalysis(res.data.result)
      } else {
        setError(res.data.error || 'Re-analysis failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Re-analysis failed.')
    } finally {
      setReanalyzing(false)
    }
  }

  function handleCopy() {
    copyText(boosted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scores   = analysis?.scores
  const missing  = analysis?.missing || {}
  const additions = analysis?.specificAdditions || []
  const rewrites  = analysis?.sectionsToRewrite || []

  const boostedScores = boostedAnalysis?.scores

  const MISSING_COLS = [
    {
      key:   'experience',
      label: 'E — Experience',
      icon:  '👁',
      items: [
        'First-person examples',
        'Real usage scenarios',
        'Personal observations',
      ],
    },
    {
      key:   'expertise',
      label: 'E — Expertise',
      icon:  '🎓',
      items: [
        'Technical accuracy markers',
        'Industry terminology',
        'Data and statistics cited',
      ],
    },
    {
      key:   'authority',
      label: 'A — Authority',
      icon:  '🏛',
      items: [
        'External references (RBI, SEBI, ICMR)',
        'Expert quotes',
        'Research citations',
      ],
    },
    {
      key:   'trust',
      label: 'T — Trust',
      icon:  '🔒',
      items: [
        'Author credentials',
        'Last updated date',
        'Sources listed',
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">🏆 EEAT Signal Analyzer</h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Niche</label>
            <select
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
            >
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-400 mb-1">Article Text</label>
            <textarea
              value={articleText}
              onChange={e => setArticleText(e.target.value)}
              placeholder="Paste your article here to analyze EEAT signals..."
              rows={7}
              style={{ height: '200px' }}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={() => handleAnalyze()}
          disabled={analyzing}
          className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {analyzing ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing EEAT...</>
          ) : '🏆 Analyze EEAT'}
        </button>
      </div>

      {/* EEAT Score Dashboard */}
      {scores && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">📊 EEAT Score Dashboard</h2>

          <div className="flex items-center justify-around flex-wrap gap-6 py-2">
            <ScoreRing label="Experience"      score={scores.experience} />
            <ScoreRing label="Expertise"       score={scores.expertise}  />
            <ScoreRing label="Authority"       score={scores.authority}  />
            <ScoreRing label="Trustworthiness" score={scores.trust}      />

            <div className="flex flex-col items-center gap-1">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                scores.overall >= 70 ? 'border-green-500 text-green-400' :
                scores.overall >= 40 ? 'border-yellow-500 text-yellow-400' :
                                       'border-red-500 text-red-400'
              }`}>
                <span className="text-2xl font-bold">{scores.overall}</span>
              </div>
              <span className="text-xs text-gray-400 font-semibold">Overall EEAT</span>
            </div>
          </div>

          {/* Improvement comparison when re-analyzed */}
          {boostedScores && (
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-400 mb-2">Score Improvement After Boost</p>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {['experience', 'expertise', 'authority', 'trust', 'overall'].map(k => (
                  <div key={k}>
                    <p className="text-gray-400 capitalize text-[10px]">{k}</p>
                    <p className="text-red-400">{scores[k]}</p>
                    <p className="text-gray-500">→</p>
                    <p className="text-green-400">{boostedScores[k]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* What's Missing */}
      {scores && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">❌ What's Missing</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MISSING_COLS.map(col => {
              const missingItems = missing[col.key] || []
              const score = scores[col.key] || 0
              const isMissing = score < 40
              return (
                <div key={col.key} className={`bg-gray-900 rounded-lg p-3 border ${isMissing ? 'border-red-700/50' : 'border-gray-700'}`}>
                  <p className={`text-xs font-bold mb-2 ${isMissing ? 'text-red-400' : 'text-gray-300'}`}>
                    {col.icon} {col.label}
                  </p>
                  <div className="space-y-1">
                    {missingItems.length > 0 ? (
                      missingItems.map((item, i) => (
                        <p key={i} className="text-[11px] text-red-300 flex gap-1">
                          <span>•</span>{item}
                        </p>
                      ))
                    ) : (
                      col.items.map((item, i) => (
                        <p key={i} className="text-[11px] text-gray-500 flex gap-1">
                          <span>✓</span>{item}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Improvements */}
      {analysis && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">💡 AI-Suggested Improvements</h2>

          {additions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-yellow-400 mb-2">Sentences to Add</p>
              <div className="space-y-2">
                {additions.map((s, i) => (
                  <div key={i} className="bg-gray-900 rounded-lg p-2 text-xs text-gray-300 border-l-2 border-yellow-500">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {rewrites.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-400 mb-2">Sections to Rewrite</p>
              <div className="space-y-3">
                {rewrites.map((rw, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-900 rounded-lg p-2 border border-red-700/30">
                      <p className="text-[10px] text-red-400 font-semibold mb-1">BEFORE</p>
                      <p className="text-xs text-gray-400">{rw.original}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-2 border border-green-700/30">
                      <p className="text-[10px] text-green-400 font-semibold mb-1">AFTER</p>
                      <p className="text-xs text-gray-300">{rw.improved}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleBoost}
            disabled={boosting}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {boosting ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating EEAT-Boosted Version...</>
            ) : '🚀 Generate EEAT-Boosted Version'}
          </button>
        </div>
      )}

      {/* Full Improved Article */}
      {boosted && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">✅ EEAT-Boosted Article</h2>

          <textarea
            value={boosted}
            onChange={e => setBoosted(e.target.value)}
            rows={16}
            className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 resize-none"
          />

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Original: <span className="text-white">{articleText.split(/\s+/).filter(Boolean).length} words</span></span>
            <span>→</span>
            <span>Boosted: <span className="text-green-400">{boosted.split(/\s+/).filter(Boolean).length} words</span></span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {reanalyzing ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              ) : '📊 Re-analyze EEAT Score'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
