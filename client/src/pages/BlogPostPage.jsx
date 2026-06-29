import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getBlogPostBySlug, BLOG_POSTS } from '../data/blogPosts'
import api from '../services/api.service'

const CATEGORY_COLORS = {
  'AI Tools':    'bg-purple-100 text-purple-700',
  'PDF Tools':   'bg-red-100 text-red-700',
  'Marketing':   'bg-green-100 text-green-700',
  'Career':      'bg-blue-100 text-blue-700',
  'Calculators': 'bg-orange-100 text-orange-700',
  'Finance':     'bg-teal-100 text-teal-700',
  'Converters':  'bg-yellow-100 text-yellow-700',
}

// Converts **bold** markers to <strong> elements
function renderInline(text) {
  if (typeof text !== 'string' || !text.includes('**')) return text
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : part
  )
}

function ContentBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">{block.text}</h2>
    case 'p':
      return <p className="text-gray-700 leading-relaxed mb-4">{renderInline(block.text)}</p>
    case 'ul':
      return (
        <ul className="list-disc list-outside pl-5 mb-4 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="text-gray-700 leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-gray-700 border-t border-gray-100 whitespace-nowrap">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'callout': {
      const ctaLinks = [...(block.links || []), ...(block.link ? [block.link] : [])]
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 mt-2">
          <p className="text-sm font-bold text-blue-900 mb-1">{block.title}</p>
          <p className="text-sm text-blue-800 mb-3 leading-relaxed">{block.text}</p>
          {ctaLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ctaLinks.map((l, i) => (
                <Link key={i} to={l.href}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }
    default:
      return null
  }
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const staticPost = getBlogPostBySlug(slug)

  const [dbPost,   setDbPost]   = useState(null)
  const [loading,  setLoading]  = useState(!staticPost)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (staticPost) return
    api.get(`/api/blog/posts/${slug}`)
      .then(r => { if (r.data.success) setDbPost(r.data.post); else setNotFound(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug, staticPost])

  const post = staticPost || dbPost
  const relatedPosts = post
    ? BLOG_POSTS.filter(p => !p.noindex && p.slug !== post.slug && p.category === post.category).slice(0, 3)
    : []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post || notFound) {
    return (
      <>
        <Helmet><title>Post Not Found | AWE-OS Blog</title></Helmet>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-5xl">📭</p>
          <h1 className="text-2xl font-bold text-gray-900">Article not found</h1>
          <p className="text-gray-500">The post you're looking for doesn't exist or may have been removed.</p>
          <Link to="/blog" className="mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            ← Back to Blog
          </Link>
        </div>
      </>
    )
  }

  const badgeCls = CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-600'
  const formattedDate = new Date(post.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const toISO = (d) => (d && !d.includes('T') ? `${d}T00:00:00Z` : d)

  // Extract plain text from content blocks for articleBody / wordCount
  const plainText = (post.content || [])
    .map(b => b.text || (b.items || []).join(' '))
    .join(' ')
    .trim()

  const OG_IMAGE = {
    '@type': 'ImageObject',
    url:     'https://www.awe-os.com/og-image.svg',
    width:   1200,
    height:  630,
  }
  const postUrl = `https://www.awe-os.com/blog/${post.slug}`

  const articleSchema = {
    '@context':  'https://schema.org',
    '@type':     'Article',
    headline:    post.title,
    description: post.excerpt,
    image:       OG_IMAGE,
    datePublished:  new Date(post.date).toISOString(),
    dateModified:   new Date(post.updatedDate || post.date).toISOString(),
    author: {
      '@type': 'Person',
      name:    post.author,
      url:     'https://www.awe-os.com/about',
    },
    publisher: {
      '@type': 'Organization',
      name:    'AWE-OS',
      url:     'https://www.awe-os.com',
      logo:    OG_IMAGE,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id':   postUrl,
    },
    url:         postUrl,
    inLanguage:  'en-US',
    articleBody: plainText.slice(0, 1500),
    wordCount:   plainText.split(/\s+/).filter(Boolean).length,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://www.awe-os.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog',  item: 'https://www.awe-os.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  }

  return (
    <>
      <Helmet>
        <title>{post.metaTitle}</title>
        <meta name="description" content={post.metaDescription} />
        <link rel="canonical" href={`https://www.awe-os.com/blog/${post.slug}`} />
        {post.noindex && <meta name="robots" content="noindex, follow" />}
        <meta property="og:title" content={post.metaTitle} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={toISO(post.date)} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400 mb-4 flex-wrap">
            <Link to="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <span aria-hidden>/</span>
            <Link to="/blog" className="hover:text-gray-700 transition-colors">Blog</Link>
            <span aria-hidden>/</span>
            <span className="text-gray-700 font-medium">{post.category}</span>
          </nav>

          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          {/* Article header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}>
                {post.category}
              </span>
              <span className="text-xs text-gray-400">{post.readTime}</span>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
              {post.title}
            </h1>

            <p className="text-gray-500 text-base leading-relaxed mb-6">
              {post.excerpt}
            </p>

            <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
              <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                {post.author.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{post.author}</p>
                <time className="text-xs text-gray-400" dateTime={post.date}>{formattedDate}</time>
              </div>
            </div>
          </div>

          {/* Article body */}
          <article className="bg-white rounded-2xl border border-gray-200 p-8 mb-6 prose-sm">
            {post.content.map((block, i) => (
              <ContentBlock key={i} block={block} />
            ))}
          </article>

          {/* FAQ section */}
          {post.faqs && post.faqs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {post.faqs.map(({ q, a }, i) => (
                  <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-white hover:bg-gray-50 transition-colors">
                      <span className="text-sm font-medium text-gray-900 pr-4">{q}</span>
                      <span className="text-gray-400 text-xl shrink-0 group-open:rotate-45 transition-transform duration-200" aria-hidden>+</span>
                    </summary>
                    <div className="px-5 pb-4 pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Related tools */}
          {post.relatedTools && post.relatedTools.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Try These Free Tools</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {post.relatedTools.map(tool => (
                  <Link
                    key={tool.slug}
                    to={`/tools/${tool.slug}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-2xl">{tool.icon}</span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                      {tool.label}
                    </span>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Related Articles</h2>
              <div className="space-y-3">
                {relatedPosts.map(p => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="flex flex-col gap-1 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                  >
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">{p.title}</span>
                    <span className="text-xs text-gray-400">{p.readTime} · {p.category}</span>
                  </Link>
                ))}
              </div>
              <Link to="/blog" className="mt-4 text-xs text-blue-600 hover:text-blue-700 font-medium block text-right">
                Browse all articles →
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
