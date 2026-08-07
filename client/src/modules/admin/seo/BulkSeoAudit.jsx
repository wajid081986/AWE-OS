import { useEffect, useState } from 'react'
import api from '../../../services/api.service'

const FLAG_LABEL = {
  thin_content:       'Thin content',
  no_faq:             'No FAQ',
  no_internal_links:  'No internal links',
  not_humanized:      'Not humanized',
}

function FlagBadge({ flag }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-900/40 border border-red-700 text-red-300 whitespace-nowrap">
      {FLAG_LABEL[flag] || flag}
    </span>
  )
}

function IssuesBadge({ count }) {
  const color = count === 0
    ? 'bg-green-900 text-green-300'
    : count <= 2
      ? 'bg-yellow-900 text-yellow-300'
      : 'bg-red-900 text-red-300'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {count}
    </span>
  )
}

export default function BulkSeoAudit() {
  const [posts,   setPosts]   = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function fetchAudit() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/blog-bulk-audit')
      if (res.data.success) {
        setPosts(res.data.posts || [])
        setSummary(res.data.summary || null)
      } else {
        setError(res.data.error || 'Audit failed')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAudit() }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Bulk SEO Audit</h1>
        <button
          type="button"
          onClick={fetchAudit}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Structural checks across all published posts — no AI calls, free to re-run anytime.
      </p>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
          Scanning published posts…
        </div>
      )}

      {summary && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex gap-8 text-sm text-gray-300">
          <span><strong className="text-white">{summary.totalPosts}</strong> published posts</span>
          <span><strong className="text-white">{summary.totalIssues}</strong> total issues</span>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Words</th>
                <th className="text-left px-4 py-3">Issues</th>
                <th className="text-left px-4 py-3">Flags</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-t border-gray-700">
                  <td className="px-4 py-3 text-white max-w-xs truncate">{post.title}</td>
                  <td className="px-4 py-3 text-gray-400">{post.wordCount}</td>
                  <td className="px-4 py-3"><IssuesBadge count={post.issuesCount} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {post.flags.map(flag => <FlagBadge key={flag} flag={flag} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/blog?edit=${encodeURIComponent(post.slug)}`}
                      className="text-indigo-400 hover:underline whitespace-nowrap"
                    >
                      Edit →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <p className="text-gray-500 text-sm">No published posts found.</p>
      )}
    </div>
  )
}
