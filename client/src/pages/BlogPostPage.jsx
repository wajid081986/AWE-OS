import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getBlogPostBySlug } from '../data/blogPosts'

const CATEGORY_COLORS = {
  'AI Tools':    'bg-purple-100 text-purple-700',
  'PDF Tools':   'bg-red-100 text-red-700',
  'Marketing':   'bg-green-100 text-green-700',
  'Career':      'bg-blue-100 text-blue-700',
  'Calculators': 'bg-orange-100 text-orange-700',
}

function ContentBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">{block.text}</h2>
    case 'p':
      return <p className="text-gray-700 leading-relaxed mb-4">{block.text}</p>
    case 'ul':
      return (
        <ul className="list-disc list-outside pl-5 mb-4 space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="text-gray-700 leading-relaxed">{item}</li>
          ))}
        </ul>
      )
    default:
      return null
  }
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = getBlogPostBySlug(slug)

  if (!post) {
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

  // Ensure full ISO 8601 with time component — required by Google Rich Results
  const toISO = (d) => (d && !d.includes('T') ? `${d}T00:00:00Z` : d)

  const articleSchema = {
    '@context':     'https://schema.org',
    '@type':        'Article',
    headline:       post.title,
    description:    post.metaDescription,
    image:          'https://www.awe-os.com/og-image.svg',
    datePublished:  toISO(post.date),
    dateModified:   toISO(post.updatedDate || post.date),
    author: {
      '@type': 'Person',
      name:    post.author,
    },
    publisher: {
      '@type': 'Organization',
      name:    'AWE-OS',
      url:     'https://www.awe-os.com',
      logo: {
        '@type': 'ImageObject',
        url:     'https://www.awe-os.com/og-image.svg',
      },
    },
    url: `https://www.awe-os.com/blog/${post.slug}`,
  }

  const faqSchema = post.faqs?.length ? {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: post.faqs.map(({ q, a }) => ({
      '@type':        'Question',
      name:           q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } : null

  return (
    <>
      <Helmet>
        <title>{post.metaTitle}</title>
        <meta name="description" content={post.metaDescription} />
        <link rel="canonical" href={`https://www.awe-os.com/blog/${post.slug}`} />
        <meta property="og:title" content={post.metaTitle} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={toISO(post.date)} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

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

        </div>
      </div>
    </>
  )
}
