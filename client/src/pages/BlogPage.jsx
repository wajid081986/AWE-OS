import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { BLOG_POSTS, BLOG_CATEGORIES } from '../data/blogPosts'

const CATEGORY_COLORS = {
  'AI Tools':    'bg-purple-100 text-purple-700',
  'PDF Tools':   'bg-red-100 text-red-700',
  'Marketing':   'bg-green-100 text-green-700',
  'Career':      'bg-blue-100 text-blue-700',
  'Calculators': 'bg-orange-100 text-orange-700',
}

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {category}
    </span>
  )
}

function PostCard({ post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200"
    >
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-gray-400">{post.readTime}</span>
        </div>

        <h2 className="text-gray-900 font-bold text-lg leading-snug mb-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h2>

        <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {post.author.charAt(0)}
            </span>
            <span className="text-xs text-gray-500">{post.author}</span>
          </div>
          <time className="text-xs text-gray-400" dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </time>
        </div>
      </div>
    </Link>
  )
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category === activeCategory)

  const blogSchema = {
    '@context':   'https://schema.org',
    '@type':      'CollectionPage',
    name:         'AWE-OS Blog — Guides, Tips & Tutorials',
    description:  'Guides, tips, and tutorials on AI tools, PDF tools, productivity, career, and more.',
    url:          'https://www.awe-os.com/blog',
    publisher: {
      '@type': 'Organization',
      name:    'AWE-OS',
      url:     'https://www.awe-os.com',
    },
    hasPart: BLOG_POSTS.slice(0, 10).map(p => ({
      '@type':         'Article',
      headline:        p.title,
      url:             `https://www.awe-os.com/blog/${p.slug}`,
      datePublished:   new Date(p.date).toISOString(),
      author: { '@type': 'Person', name: p.author },
    })),
  }

  return (
    <>
      <Helmet>
        <title>Blog — Free Tools, Productivity Tips & AI Guides | AWE-OS</title>
        <meta name="description" content="Explore guides, tips, and tutorials on AI tools, PDF tools, productivity, career, and more. Free resources from the AWE-OS team." />
        <link rel="canonical" href="https://www.awe-os.com/blog" />
        <script type="application/ld+json">{JSON.stringify(blogSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">AWE-OS Blog</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
              Guides, Tips &amp; Tutorials
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Practical articles on AI tools, PDF workflows, productivity, and career development — all free.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {BLOG_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat}
                {cat !== 'All' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({BLOG_POSTS.filter(p => p.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Post grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              No posts in this category yet.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
