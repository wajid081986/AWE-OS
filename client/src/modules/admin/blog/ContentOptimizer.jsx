import { useState } from 'react'
import api from '../../../services/api.service'

const GOALS = [
  { value: 'full-seo',        label: '🎯 Full SEO Optimization' },
  { value: 'readability',     label: '📖 Improve Readability'   },
  { value: 'eeat',            label: '🏆 Boost EEAT Signals'    },
  { value: 'indian-context',  label: '💰 Add Indian Context'    },
  { value: 'internal-links',  label: '🔗 Add Internal Links'    },
]

function wc(text = '') {
  return text.split(/\s+/).filter(Boolean).length
}

function copyText(t) {
  navigator.clipboard.writeText(t).catch(() => {})
}

export default function ContentOptimizer({ onPublishVersion }) {
  const [title,       setTitle]       = useState('')
  const [keyword,     setKeyword]     = useState('')
  const [goal,        setGoal]        = useState('full-seo')
  const [articleText, setArticleText] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [result,      setResult]      = useState(null)
  const [optimized,   setOptimized]   = useState('')
  const [copied,      setCopied]      = useState(false)

  async function handleOptimize() {
    if (!title.trim() || !keyword.trim() || !articleText.trim()) {
      setError('Title, keyword, and article text are required.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setOptimized('')
    try {
      const res = await api.post('/api/admin/blog/optimize-content', {
        title, keyword, goal, articleText,
      })
      if (res.data.success) {
        setResult(res.data.result)
        setOptimized(res.data.result.optimized.content || '')
      } else {
        setError(res.data.error || 'Optimization failed.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Optimization failed.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    copyText(optimized)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePublish() {
    if (onPublishVersion) {
      onPublishVersion({ topic: title, keyword, content: optimized })
    }
  }

  const beforeWc = wc(articleText)
  const afterWc  = result ? wc(optimized) : 0
  const beforeScore = result?.analysis?.currentScore || 0
  const afterScore  = result?.optimized?.estimatedNewScore || 0
  const scoreDiff   = afterScore - beforeScore

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Input */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">📝 Article Input</h2>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Article Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Best SIP Calculator India 2026"
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="e.g. SIP calculator India"
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Optimization Goal</label>
            <select
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Article Text</label>
            <textarea
              value={articleText}
              onChange={e => setArticleText(e.target.value)}
              placeholder="Paste your existing article here..."
              rows={12}
              style={{ height: '250px' }}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
            {articleText && (
              <p className="text-xs text-gray-500 mt-1">{beforeWc} words</p>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleOptimize}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Optimizing...</>
            ) : '✨ Optimize Content'}
          </button>
        </div>

        {/* MIDDLE — Analysis */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">🔍 Issues Found</h2>

          {!result && !loading && (
            <p className="text-gray-500 text-sm text-center py-12">Analysis will appear after optimization</p>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Analyzing & optimizing...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score comparison */}
              <div className="bg-gray-900 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">SEO Score</p>
                <p className="text-white font-bold">
                  Before: <span className="text-red-400">{beforeScore}</span>
                  {' → '}
                  After: <span className="text-green-400">{afterScore}</span>
                  {' '}
                  <span className="text-green-400 text-sm">(+{scoreDiff} pts)</span>
                </p>
              </div>

              {/* Issues */}
              {result.analysis?.issues?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-2">Issues Detected</p>
                  <div className="space-y-1">
                    {result.analysis.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400 text-xs mt-0.5">⚠</span>
                        <span className="text-xs text-gray-300">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {result.analysis?.opportunities?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-2">Improvements Made</p>
                  <div className="space-y-1">
                    {result.analysis.opportunities.map((opp, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-green-400 text-xs mt-0.5">✓</span>
                        <span className="text-xs text-gray-300">{opp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Word count comparison */}
              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Word Count</p>
                <p className="text-white text-sm font-medium">
                  Before: <span className="text-yellow-400">{beforeWc}</span>
                  {' → '}
                  After: <span className="text-green-400">{afterWc}</span>
                  {afterWc > beforeWc && <span className="text-green-400"> (+{afterWc - beforeWc})</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Output */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">✅ Optimized Article</h2>

          {!result && !loading && (
            <p className="text-gray-500 text-sm text-center py-12">Optimized article will appear here</p>
          )}

          {result && (
            <div className="space-y-4">
              <textarea
                value={optimized}
                onChange={e => setOptimized(e.target.value)}
                rows={14}
                style={{ height: '300px' }}
                className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 resize-none"
              />

              {result.optimized?.improvements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-2">What Changed</p>
                  <ol className="space-y-1">
                    {result.optimized.improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-gray-300 flex gap-2">
                        <span className="text-indigo-400 font-bold flex-shrink-0">{i + 1}.</span>
                        {imp}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <button
                onClick={handleCopy}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {copied ? '✅ Copied!' : '📋 Copy Optimized Article'}
              </button>

              <button
                onClick={handlePublish}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                🚀 Publish as New Version
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM — Side-by-side comparison */}
      {result && articleText && optimized && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">🔄 Before vs After Comparison</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-red-400 mb-2">Original</p>
              <div className="bg-gray-900 rounded-lg p-3">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans leading-relaxed line-clamp-[20]">
                  {articleText.substring(0, 800)}{articleText.length > 800 ? '...' : ''}
                </pre>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-400 mb-2">Optimized</p>
              <div className="bg-gray-900 rounded-lg p-3">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {optimized.substring(0, 800)}{optimized.length > 800 ? '...' : ''}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
