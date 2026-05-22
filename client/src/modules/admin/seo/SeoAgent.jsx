import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api.service'

const ACTION_ROUTES = {
  write:     '/admin/blog',
  optimize:  '/admin/blog',
  promote:   '/admin/traffic',
  technical: '/admin/blog',
}

const IMPACT_CLS = {
  High:   'bg-red-900/50 text-red-300 border border-red-800',
  Medium: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  Low:    'bg-green-900/50 text-green-300 border border-green-800',
}

const RANK_BADGE = {
  1: { label: 'URGENT',    cls: 'bg-red-600' },
  2: { label: 'IMPORTANT', cls: 'bg-yellow-600' },
  3: { label: 'PLAN',      cls: 'bg-blue-700' },
}

const URGENCY_CLS = {
  'Today':      'bg-red-600 text-white',
  'This Week':  'bg-yellow-600 text-white',
  'This Month': 'bg-blue-600 text-white',
}

function LoadingDots() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-gray-400 text-sm text-center">
        Your AI SEO advisor is preparing today's briefing...
      </p>
    </div>
  )
}

export default function SeoAgent() {
  const [briefing, setBriefing] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const navigate = useNavigate()

  const fetchBriefing = useCallback(async () => {
    setLoading(true)
    setError(null)
    setBriefing(null)
    try {
      // Pull any locally cached context to personalise the briefing
      const articleHistory = JSON.parse(localStorage.getItem('awe_published_articles')  || '[]')
      const kwHistory      = JSON.parse(localStorage.getItem('awe_researched_keywords') || '[]')
      const now            = new Date()

      const res = await api.post('/api/admin/seo/daily-briefing', {
        totalArticles:     articleHistory.length || 16,
        daysSinceLastPost: 2,
        unusedKeywords:    kwHistory.length,
        lowScoreArticles:  3,
        currentMonth:      now.toLocaleString('default', { month: 'long' }),
        currentDay:        now.toLocaleString('default', { weekday: 'long' }),
      })

      if (res.data.success) setBriefing(res.data.briefing)
      else setError(res.data.error || 'Failed to generate briefing')
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to generate briefing')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBriefing() }, [fetchBriefing])

  if (loading) return (
    <div className="p-6 max-w-3xl mx-auto">
      <LoadingDots />
    </div>
  )

  if (error) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-red-900/30 border border-red-800 rounded-xl p-5">
        <p className="text-red-300 font-medium mb-1">Failed to load briefing</p>
        <p className="text-red-400/70 text-sm mb-4">{error}</p>
        <button
          onClick={fetchBriefing}
          className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    </div>
  )

  if (!briefing) return null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">SEO AI Agent</h1>
        <button
          onClick={fetchBriefing}
          className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          🔄 New Briefing
        </button>
      </div>

      {/* Header card — greeting + motivational note */}
      <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-700 rounded-xl p-6">
        <p className="text-gray-400 text-sm mb-1">{briefing.date}</p>
        <p className="text-white text-lg font-medium mb-4">{briefing.greeting}</p>
        <div className="bg-white/10 rounded-lg p-4">
          <p className="text-indigo-200 text-sm italic">"{briefing.motivationalNote}"</p>
        </div>
      </div>

      {/* 3 Priority cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Today's Priorities</h2>
        <div className="space-y-3">
          {(briefing.priorities || []).map(p => {
            const badge = RANK_BADGE[p.rank] || RANK_BADGE[3]
            return (
              <div key={p.rank} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded text-white shrink-0 ${badge.cls}`}>
                    #{p.rank} {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{p.action}</p>
                    <p className="text-gray-400 text-sm mt-1">{p.reason}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded ${IMPACT_CLS[p.estimatedImpact] || IMPACT_CLS.Medium}`}>
                        {p.estimatedImpact} Impact
                      </span>
                      <span className="text-xs text-gray-500">⏱ {p.timeRequired}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(ACTION_ROUTES[p.actionType] || '/admin/blog')}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shrink-0 transition-colors"
                  >
                    Start →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trending topic alert */}
      {briefing.trendingTopic && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-yellow-400 font-bold text-sm">⚡ Trending Now:</span>
            <span className="text-white font-medium text-sm">{briefing.trendingTopic.topic}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ml-auto ${URGENCY_CLS[briefing.trendingTopic.urgency] || 'bg-blue-600 text-white'}`}>
              {briefing.trendingTopic.urgency}
            </span>
          </div>
          <p className="text-yellow-200/80 text-sm mb-2">
            <span className="font-medium text-yellow-300">Why:</span> {briefing.trendingTopic.reason}
          </p>
          <p className="text-white text-sm mb-2">
            <span className="text-gray-400">Article idea: </span>
            <span className="font-medium">{briefing.trendingTopic.articleIdea}</span>
          </p>
          <p className="text-sm text-gray-400">
            Keyword: <span className="text-indigo-300">"{briefing.trendingTopic.keyword}"</span>
          </p>
        </div>
      )}

      {/* Weekly goal */}
      {briefing.weeklyGoal && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Weekly Goal</h2>
          <p className="text-gray-400 text-sm mb-4">Target: {briefing.weeklyGoal.target}</p>
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{briefing.weeklyGoal.progress} / 3</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(((briefing.weeklyGoal.progress || 0) / 3) * 100, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3">Remaining: {briefing.weeklyGoal.remaining}</p>
        </div>
      )}

      {/* Quick win */}
      {briefing.quickWin && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-1">Quick Win</h2>
          <p className="text-gray-500 text-xs mb-3">Easiest thing you can do right now:</p>
          <p className="text-green-300 font-medium mb-4">{briefing.quickWin}</p>
          <button
            onClick={() => navigate('/admin/blog')}
            className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Do it now →
          </button>
        </div>
      )}
    </div>
  )
}
