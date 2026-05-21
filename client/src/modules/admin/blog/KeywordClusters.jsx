import { useState } from 'react'
import api from '../../../services/api.service'

const NICHES = [
  'Finance & Calculators',
  'PDF Tools',
  'AI Tools',
  'Health & Fitness',
  'Business & Legal',
  'General',
]

const INTENT_TABS = [
  { id: 'Informational', label: '📚 Informational' },
  { id: 'Commercial',    label: '💼 Commercial'    },
  { id: 'Comparison',    label: '🔄 Comparison'    },
  { id: 'How-To',        label: '❓ How-To'        },
]

function DiffChip({ keyword, searches, difficulty, onAdd }) {
  const cls =
    difficulty === 'Easy'   ? 'bg-green-900/60 text-green-300 border-green-700' :
    difficulty === 'Hard'   ? 'bg-red-900/60 text-red-300 border-red-700' :
                              'bg-yellow-900/60 text-yellow-300 border-yellow-700'
  return (
    <button
      onClick={() => onAdd && onAdd(keyword)}
      className={`inline-flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-left hover:opacity-80 transition-opacity ${cls}`}
    >
      <span className="text-xs font-semibold">{keyword}</span>
      <span className="text-[10px] opacity-75">{searches}/mo</span>
    </button>
  )
}

function PriorityBadge({ priority }) {
  const cls =
    priority === 'High'   ? 'bg-red-900/60 text-red-300' :
    priority === 'Medium' ? 'bg-yellow-900/60 text-yellow-300' :
                            'bg-gray-700 text-gray-300'
  return <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${cls}`}>{priority}</span>
}

function DiffBadge({ level }) {
  const cls =
    level === 'Easy'   ? 'bg-green-900/60 text-green-300' :
    level === 'Hard'   ? 'bg-red-900/60 text-red-300' :
                         'bg-yellow-900/60 text-yellow-300'
  return <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${cls}`}>{level}</span>
}

export default function KeywordClusters({ onWriteArticle }) {
  const [pillarTopic, setPillarTopic] = useState('')
  const [niche,       setNiche]       = useState('Finance & Calculators')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [result,      setResult]      = useState(null)
  const [intentTab,   setIntentTab]   = useState('Informational')

  async function handleGenerate() {
    if (!pillarTopic.trim()) { setError('Enter a pillar topic first.'); return }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.post('/api/admin/blog/keyword-clusters', { pillarTopic, niche })
      if (res.data.success) {
        setResult(res.data.result)
      } else {
        setError(res.data.error || 'Cluster generation failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Cluster generation failed.')
    } finally {
      setLoading(false)
    }
  }

  function handleWrite(article) {
    if (onWriteArticle) {
      onWriteArticle({
        topic:    article.articleTitle || article.keyword,
        keyword:  article.keyword,
        toolSlug: article.aweosToolSlug || '',
      })
    }
  }

  const pillarKw = result?.pillarKeyword
  const clusters = result?.clusters || []
  const top8     = result?.top8Articles || []
  const calendar = result?.contentCalendar || []
  const stats    = result?.clusterStats

  const activeCluster = clusters.find(c => c.intent === intentTab)
  const clusterKws    = activeCluster?.keywords || []

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">🗺️ Topic Cluster Generator</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Pillar Topic</label>
            <input
              type="text"
              value={pillarTopic}
              onChange={e => setPillarTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="GST Calculator India"
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Niche</label>
            <select
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating Cluster Map...</>
          ) : '🗺️ Generate Cluster Map'}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Building topic cluster map with 2 AI calls...</p>
        </div>
      )}

      {result && (
        <>
          {/* Pillar keyword card */}
          {pillarKw && (
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-700/50 rounded-xl p-5">
              <p className="text-xs text-purple-300 font-semibold mb-2">PILLAR KEYWORD</p>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-white text-xl font-bold">{pillarKw.keyword}</p>
                  <p className="text-gray-400 text-xs mt-1">This is your main article topic</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-white font-bold text-lg">{pillarKw.searches}</p>
                    <p className="text-gray-400 text-[10px]">searches/mo</p>
                  </div>
                  <div>
                    <DiffBadge level={pillarKw.difficulty} />
                    <p className="text-gray-400 text-[10px] mt-1">difficulty</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cluster keywords by intent */}
          {clusters.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">📊 Cluster Keywords by Intent</h2>

              <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
                {INTENT_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setIntentTab(t.id)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      intentTab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {clusterKws.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {clusterKws.map((kw, i) => (
                    <DiffChip
                      key={i}
                      keyword={kw.keyword}
                      searches={kw.searches}
                      difficulty={kw.difficulty}
                      onAdd={() => handleWrite({ keyword: kw.keyword, articleTitle: kw.keyword, aweosToolSlug: '' })}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No {intentTab} keywords found</p>
              )}
            </div>
          )}

          {/* Top 8 priority articles */}
          {top8.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">🏆 Top 8 Priority Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {top8.map((art, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <PriorityBadge priority={art.priority} />
                      <DiffBadge level={art.difficulty} />
                    </div>
                    <p className="text-white text-sm font-semibold leading-snug">{art.articleTitle}</p>
                    <p className="text-indigo-400 text-xs font-medium">{art.keyword}</p>
                    <p className="text-gray-500 text-xs italic">{art.articleAngle}</p>

                    <div className="flex gap-4 text-[10px] text-gray-400">
                      <span>📈 {art.searches}/mo</span>
                      <span>⏱ Rank in {art.rankInMonths}mo</span>
                      {art.adSenseCPC && <span>💰 CPC {art.adSenseCPC}</span>}
                    </div>

                    {art.aweosTool && (
                      <p className="text-xs text-gray-500">🔗 Tool: {art.aweosTool}</p>
                    )}

                    <button
                      onClick={() => handleWrite(art)}
                      className="w-full mt-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors"
                    >
                      ✏️ Write This Article
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Calendar */}
          {calendar.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">📅 4-Week Content Calendar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {['Week', 'Article Title', 'Keyword', 'Difficulty', 'Est. Ranking', ''].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-gray-400 text-xs font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendar.map((row, i) => (
                      <tr key={i} className="border-b border-gray-700/50">
                        <td className="py-2 px-2 text-purple-400 font-bold text-xs">W{row.week}</td>
                        <td className="py-2 px-2 text-white text-xs">{row.title}</td>
                        <td className="py-2 px-2 text-indigo-400 text-xs">{row.keyword}</td>
                        <td className="py-2 px-2"><DiffBadge level={row.difficulty} /></td>
                        <td className="py-2 px-2 text-gray-400 text-xs">{row.estimatedRanking}</td>
                        <td className="py-2 px-2">
                          <button
                            onClick={() => handleWrite({ keyword: row.keyword, articleTitle: row.title, aweosToolSlug: '' })}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded transition-colors"
                          >
                            ✏️ Write
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cluster Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Easy Keywords', value: stats.totalEasyKeywords, icon: '🟢' },
                { label: 'Est. Monthly Traffic', value: stats.estimatedMonthlyTraffic, icon: '📈' },
                { label: 'Avg. Rank Time', value: stats.avgRankTime, icon: '⏱' },
                { label: 'AdSense Potential', value: stats.adSensePotential, icon: '💰' },
              ].map(s => (
                <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-white font-bold text-lg">{s.value}</p>
                  <p className="text-gray-400 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
