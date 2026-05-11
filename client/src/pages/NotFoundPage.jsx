import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicLayout from '../components/PublicLayout'

const POPULAR = [
  { name: 'Resume Builder',   slug: 'resume-builder',   icon: '📄' },
  { name: 'BMI Calculator',   slug: 'bmi-calculator',   icon: '⚖️' },
  { name: 'PDF Merger',       slug: 'merge-pdf',        icon: '📎' },
  { name: 'Word Counter',     slug: 'word-counter',     icon: '📝' },
  { name: 'QR Code Generator',slug: 'qr-code-generator',icon: '📱' },
  { name: 'Age Calculator',   slug: 'age-calculator',   icon: '🎂' },
]

export default function NotFoundPage() {
  const [q, setQ]     = useState('')
  const navigate      = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    if (q.trim()) navigate(`/tools?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <PublicLayout>
      <Helmet>
        <title>Page Not Found — AWE-OS</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center">
          {/* Big 404 */}
          <p className="text-8xl font-bold text-gray-100 select-none leading-none">404</p>
          <p className="text-5xl -mt-6 mb-4">🤖</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-500 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>

          {/* Search */}
          <form onSubmit={submit} className="flex gap-2 mb-8">
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search for a tool..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Search
            </button>
          </form>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Link
              to="/"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Go to Home
            </Link>
            <Link
              to="/tools"
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium transition-colors"
            >
              Browse All Tools
            </Link>
          </div>

          {/* Popular tools */}
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Popular Tools</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POPULAR.map(({ name, slug, icon }) => (
                <Link
                  key={slug}
                  to={`/tools/${slug}`}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-colors group"
                >
                  <span className="text-lg shrink-0">{icon}</span>
                  <span className="text-xs text-gray-700 group-hover:text-blue-700 font-medium truncate transition-colors">{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
