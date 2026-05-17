/**
 * CategoryPage — SEO-optimized landing page for each tool category.
 *
 * Routes:
 *   /tools/pdf          → category="pdf"
 *   /tools/calculators  → category="calculators"
 *   /tools/converters   → category="converters"
 *   /tools/ai           → category="ai"
 *
 * Includes:
 *   - Schema.org ItemList + BreadcrumbList JSON-LD
 *   - Category hero with trust badges
 *   - Subcategory-grouped tool grid
 *   - SEO intro content (why-use section)
 *   - AdSense placements
 */

import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import AdContainer from '../components/tool-engine/AdContainer'
import {
  getCategoryMeta,
  getCatalogueSections,
  getToolsByCategory,
} from '../data/toolRegistry'
import { SITE_URL, getCategoryCanonical } from '../utils/canonicalUrl'
import { generateCategorySchema, generateBreadcrumbSchema } from '../utils/schema'

// ── Accent colour map ────────────────────────────────────────────────────────
const ACCENT = {
  red:    { badge: 'bg-red-50    text-red-700    border-red-200',    dot: 'bg-red-500'    },
  green:  { badge: 'bg-green-50  text-green-700  border-green-200',  dot: 'bg-green-500'  },
  purple: { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  blue:   { badge: 'bg-blue-50   text-blue-700   border-blue-200',   dot: 'bg-blue-500'   },
  indigo: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
}

// ── Tool card inside CategoryPage ────────────────────────────────────────────
function CategoryToolCard({ icon, label, to, comingSoon }) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl opacity-55 cursor-not-allowed select-none">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">Coming soon</p>
        </div>
      </div>
    )
  }
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/30 transition-all group"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate leading-snug">
        {label}
      </p>
    </Link>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CategoryPage({ category }) {
  const meta = getCategoryMeta(category)

  if (!meta) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Category Not Found</h1>
        <p className="text-gray-500 mb-6">This tool category doesn't exist or may have moved.</p>
        <Link
          to="/tools"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Browse All Tools →
        </Link>
      </div>
    )
  }

  const sections  = getCatalogueSections(category)
  const allTools  = getToolsByCategory(category)
  const intro     = meta.intro || {}
  const accent    = ACCENT[meta.accent] || ACCENT.blue
  const canonical = getCategoryCanonical(category)

  // ── Schema.org ──────────────────────────────────────────────────────────
  const itemListSchema   = generateCategorySchema({ name: meta.name, description: meta.description, tools: allTools, siteUrl: SITE_URL })
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home',     url: SITE_URL },
    { name: 'Tools',    url: `${SITE_URL}/tools` },
    { name: meta.name,  url: canonical },
  ])

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description"         content={meta.description} />
        <link rel="canonical"            href={canonical} />
        <meta property="og:site_name"    content="AWE-OS" />
        <meta property="og:locale"       content="en_US" />
        <meta property="og:title"        content={meta.title} />
        <meta property="og:description"  content={meta.description} />
        <meta property="og:url"          content={canonical} />
        <meta property="og:type"         content="website" />
        <meta property="og:image"        content="https://www.awe-os.com/og-image.svg" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content={`${meta.name} — AWE-OS`} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@awe_os" />
        <meta name="twitter:title"       content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image"       content="https://www.awe-os.com/og-image.svg" />
        <meta name="twitter:image:alt"   content={`${meta.name} — AWE-OS`} />
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* ── Category hero ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 px-4 sm:px-6 py-10">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400 mb-5">
            <Link to="/"      className="hover:text-gray-700 transition-colors">Home</Link>
            <span aria-hidden>/</span>
            <Link to="/tools" className="hover:text-gray-700 transition-colors">Tools</Link>
            <span aria-hidden>/</span>
            <span className="text-gray-700 font-medium">{meta.name}</span>
          </nav>

          {/* Heading */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl" aria-hidden>{meta.icon}</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {intro.heading || meta.name}
            </h1>
          </div>
          <p className="text-gray-600 text-base max-w-2xl leading-relaxed">
            {intro.body || meta.description}
          </p>

          {/* Trust badges */}
          <div className="flex items-center gap-2.5 mt-5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${accent.badge}`}>
              ✓ {allTools.length} Free Tools
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-green-50 text-green-700 border-green-200">
              ✓ No Registration Required
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
              ✓ Browser-Based &amp; Private
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Ad banner (top-banner = eager) ──────────────────────────────── */}
        <AdContainer slot="top-banner" />

        {/* ── Tool sections ───────────────────────────────────────────────── */}
        <div className="mt-10 space-y-10">
          {sections.map(section => (
            <div key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-gray-900 whitespace-nowrap">{section.title}</h2>
                <div className="flex-1 h-px bg-gray-200" aria-hidden />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {section.items.map(item => (
                  <CategoryToolCard key={item.label} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Why use section ─────────────────────────────────────────────── */}
        {intro.whyTitle && (
          <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{intro.whyTitle}</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {intro.whyPoints.map(point => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Browse other categories ─────────────────────────────────────── */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Explore More Tool Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { slug: 'pdf',         name: 'PDF Tools',    icon: '📄', accent: 'red'    },
              { slug: 'calculators', name: 'Calculators',  icon: '🧮', accent: 'green'  },
              { slug: 'converters',  name: 'Converters',   icon: '🔄', accent: 'purple' },
              { slug: 'ai',          name: 'AI Tools',     icon: '🤖', accent: 'blue'   },
            ]
              .filter(c => c.slug !== category)
              .map(cat => (
                <Link
                  key={cat.slug}
                  to={`/tools/${cat.slug}`}
                  className="flex items-center gap-2.5 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <span className="text-2xl shrink-0">{cat.icon}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
          </div>
        </div>

        {/* ── CTA strip ───────────────────────────────────────────────────── */}
        <div className="mt-12 bg-blue-600 rounded-2xl px-6 py-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Get More Done with AWE-OS</h2>
          <p className="text-blue-100 text-sm mb-5">
            Create a free account to save your work, access your history, and unlock AI-powered features.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/login"
              className="px-5 py-3 bg-white text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm text-center"
            >
              Create Free Account →
            </Link>
            <Link
              to="/tools"
              className="px-5 py-3 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors border border-blue-500 text-center"
            >
              Browse All Tools
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
