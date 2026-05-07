import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import SearchBar    from '../components/SearchBar'
import ToolCard     from '../components/ToolCard'
import CategoryCard from '../components/CategoryCard'
import AdBanner     from '../components/AdBanner'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { MOCK_TOOLS } from './mockTools'
import api from '../services/api.service'

const POPULAR_TAGS = [
  { label: 'Merge PDF',          to: '/tools/merge-pdf'          },
  { label: 'PDF to JPG',         to: '/tools/pdf-to-jpg'         },
  { label: 'BMI Calculator',     to: '/tools/bmi-calculator'     },
  { label: 'Word Counter',       to: '/tools/word-counter'       },
  { label: 'Compress PDF',       to: '/tools/compress-pdf'       },
  { label: 'Password Generator', to: '/tools/password-generator' },
]

const CATEGORIES = [
  { icon: '📄', title: 'PDF Tools',    description: 'Merge, split, compress, convert and secure PDFs', count: 14, to: '/tools?cat=pdf',         accent: 'red'    },
  { icon: '🧮', title: 'Calculators',  description: 'BMI, Loan, GPA, Age and Percentage calculators',  count: 6,  to: '/tools?cat=calculators',  accent: 'green'  },
  { icon: '🔄', title: 'Converters',   description: 'Unit converter, word counter, color picker',       count: 8,  to: '/tools?cat=converters',   accent: 'purple' },
  { icon: '🤖', title: 'AI Tools',     description: 'AI-powered writing and content creation',          count: 2,  to: '/tools?cat=ai_tools',     accent: 'blue'   },
]

const STATS = [
  { value: '100+', label: 'Free Tools'    },
  { value: '50K+', label: 'Users'         },
  { value: '1M+',  label: 'Tasks Done'   },
]

export default function Home() {
  const [tools, setTools]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/tools/public')
      .then(r => setTools(r.data?.data || r.data?.tools || []))
      .catch(() => setTools(MOCK_TOOLS))
      .finally(() => setLoading(false))
  }, [])

  const allTools    = tools.length ? tools : MOCK_TOOLS
  const featured    = allTools.filter(t => t.isFeatured).slice(0, 6)
  const recent      = [...allTools].sort((a, b) => (b.id - a.id)).slice(0, 4)

  return (
    <>
      <Helmet>
        <title>AWE-OS — Free AI-Powered Tools for Everyone</title>
        <meta name="description" content="Discover 100+ free AI-powered tools — Resume Builder, PDF Tools, Calculators, Converters and more. Fast, free, and easy to use." />
        <link rel="canonical" href="https://awe-os.com/" />
      </Helmet>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-16 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Free AI-Powered Tools<br className="hidden sm:block" /> for Everyone
          </h1>
          <p className="text-gray-500 text-lg mb-8">
            Discover 100+ smart tools — free, fast, and easy to use.
          </p>

          <SearchBar tools={allTools} className="max-w-xl mx-auto" placeholder="Search 100+ tools..." />

          {/* Popular tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {POPULAR_TAGS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Browse by Category</h2>
            <p className="text-gray-500 mt-2">Find the right tool for your task</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => <CategoryCard key={cat.title} {...cat} />)}
          </div>
        </div>
      </section>

      {/* ── Ad banner (leaderboard) ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4">
        <AdBanner size="leaderboard" />
      </div>

      {/* ── Featured Tools ───────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Most Popular Tools</h2>
              <p className="text-gray-500 mt-1">Used by thousands every day</p>
            </div>
            <Link to="/tools" className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap">
              View all →
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton count={6} type="tool" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(tool => <ToolCard key={tool.id || tool.slug} tool={tool} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Rectangle ad ─────────────────────────────────────────── */}
      <div className="flex justify-center px-4 pb-4">
        <AdBanner size="rectangle" />
      </div>

      {/* ── Recently Added ───────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Recently Added</h2>
              <p className="text-gray-500 mt-1">Fresh tools added to the platform</p>
            </div>
            <Link to="/tools" className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap">
              See all →
            </Link>
          </div>

          {/* Horizontal scroll on mobile, 4-col on desktop */}
          <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
            {recent.map(tool => (
              <div key={tool.id || tool.slug} className="min-w-[260px] sm:min-w-0">
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="py-14 px-4 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl sm:text-4xl font-bold text-blue-600">{value}</p>
                <p className="text-gray-500 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────── */}
      <section className="bg-blue-600 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Start Using Free Tools Today
          </h2>
          <p className="text-blue-100 mb-7">No sign-up required for most tools. Just open and use.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/tools"
              className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm"
            >
              Browse All Tools →
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 bg-blue-700 text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors border border-blue-500"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
