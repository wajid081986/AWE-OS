#!/usr/bin/env node
/**
 * prerender.js — Static HTML injection for AWE-OS
 *
 * After `vite build`, for every public route this script:
 *   1. Reads dist/index.html (the Vite SPA shell)
 *   2. Injects route-specific <title>, <meta>, canonical, OG, Twitter, JSON-LD into <head>
 *   3. Injects semantic static HTML into <div id="root"> so Googlebot sees real
 *      body content (h1, description, breadcrumb, related tool links) without JS
 *   4. Writes the result to dist/{route}/index.html
 *
 * React's createRoot() replaces the static body content at runtime — no hydration
 * conflict since we don't use hydrateRoot().
 *
 * Vercel: static files take precedence over rewrites, so prerendered files are
 * served directly. Unknown routes fall back to the SPA rewrite → dist/index.html.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname }                        from 'path'
import { fileURLToPath }                           from 'url'

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const SITE_URL  = 'https://www.awe-os.com'
const DIST      = resolve(__dirname, '../dist')

let TOOL_REGISTRY, CATEGORY_META, BLOG_POSTS

try {
  const registry = await import('../src/data/toolRegistry.js')
  TOOL_REGISTRY  = registry.TOOL_REGISTRY
  CATEGORY_META  = registry.CATEGORY_META
} catch (e) {
  console.error('❌ Failed to import toolRegistry.js:', e.message)
  process.exit(1)
}

let TOOL_ABOUT = {}
try {
  const content = await import('../src/data/toolPageContent.js')
  TOOL_ABOUT = content.TOOL_ABOUT ?? {}
} catch (e) {
  console.warn('⚠️  Could not import toolPageContent.js — about sections will be skipped.')
}

try {
  const blog = await import('../src/data/blogPosts.js')
  BLOG_POSTS = blog.BLOG_POSTS
} catch (e) {
  console.warn('⚠️  Could not import blogPosts.js — blog routes will be skipped.')
  BLOG_POSTS = []
}

let CITY_PAGES = []
try {
  const cityData = await import('../src/data/cityPages.js')
  CITY_PAGES = cityData.CITY_PAGES ?? []
} catch (e) {
  console.warn('⚠️  Could not import cityPages.js — city routes will be skipped.')
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

const slugToTool     = new Map(TOOL_REGISTRY.map(t => [t.slug, t]))
const categoryByKey  = Object.values(CATEGORY_META)  // array of { slug, name, icon, ... }

function getCatName(categoryKey) {
  const meta = CATEGORY_META[categoryKey]
  return meta ? meta.name : 'Tools'
}
function getCatSlug(categoryKey) {
  const meta = CATEGORY_META[categoryKey]
  return meta ? meta.slug : categoryKey
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function replaceMeta(html, nameAttr, newContent) {
  const re1 = new RegExp(`(<meta\\s+name="${nameAttr}"\\s+content=")[^"]*(")`,'i')
  const re2 = new RegExp(`(<meta\\s+content=")[^"]*("\\s+name="${nameAttr}")`, 'i')
  if (re1.test(html)) return html.replace(re1, `$1${esc(newContent)}$2`)
  if (re2.test(html)) return html.replace(re2, `$1${esc(newContent)}$2`)
  return html
}

function replaceOG(html, prop, newContent) {
  const re = new RegExp(`(<meta\\s+property="${prop}"\\s+content=")[^"]*(")`,'i')
  return html.replace(re, `$1${esc(newContent)}$2`)
}

function injectMeta(template, { title, description, canonical, schema, schemas, keywords }) {
  let html = template

  html = html.replace(/(<title>)[^<]*(<\/title>)/, `$1${esc(title)}$2`)
  html = replaceMeta(html, 'description', description)

  if (keywords) {
    html = replaceMeta(html, 'keywords', keywords)
  }

  if (/rel="canonical"/.test(html)) {
    html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${canonical}$2`)
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n</head>`)
  }

  html = replaceOG(html, 'og:title',       title)
  html = replaceOG(html, 'og:description', description)
  html = replaceOG(html, 'og:url',         canonical)
  html = replaceMeta(html, 'twitter:title',       title)
  html = replaceMeta(html, 'twitter:description', description)

  const allSchemas = schemas ?? (schema ? [schema] : [])
  for (const s of allSchemas) {
    const jsonld = `  <script type="application/ld+json">${JSON.stringify(s)}</script>`
    html = html.replace('</head>', `${jsonld}\n</head>`)
  }

  return html
}

// ── Body HTML builders ────────────────────────────────────────────────────────

function breadcrumb(crumbs) {
  // crumbs: [{href, label}, ...] — last item has no href (current page)
  const items = crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1
    if (isLast) return `<li aria-current="page">${esc(c.label)}</li>`
    return `<li><a href="${c.href}">${esc(c.label)}</a></li>`
  }).join('')
  return `<nav aria-label="Breadcrumb"><ol>${items}</ol></nav>`
}

function buildToolBody(tool) {
  const catSlug = getCatSlug(tool.category)
  const catName = getCatName(tool.category)

  const bc = breadcrumb([
    { href: '/', label: 'Home' },
    { href: '/tools', label: 'Tools' },
    { href: `/tools/${catSlug}`, label: catName },
    { label: tool.name },
  ])

  const tagList = tool.tags?.length
    ? `<ul aria-label="Keywords">${tool.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
    : ''

  const relatedLinks = (tool.relatedSlugs ?? [])
    .map(s => slugToTool.get(s))
    .filter(Boolean)
    .map(r => `<li><a href="/tools/${r.slug}">${esc(r.name)}</a></li>`)
    .join('')
  const relatedSection = relatedLinks
    ? `<section aria-label="Related tools"><h2>Related Tools</h2><ul>${relatedLinks}</ul></section>`
    : ''

  const aboutData = TOOL_ABOUT[tool.slug]
  let aboutSection = ''
  if (Array.isArray(aboutData) && aboutData.length) {
    // Legacy format: array of plain-text paragraphs
    aboutSection = `<section aria-label="About ${esc(tool.name)}">${aboutData.map(p => `<p>${esc(p)}</p>`).join('\n')}</section>`
  } else if (aboutData && typeof aboutData === 'object') {
    // Current structured format: { description, features, useCases, howToUse, whyUseUs, faqs }
    const parts = []

    // description (was incorrectly checked as 'whatIsIt' — field name is 'description')
    const desc = aboutData.description || aboutData.whatIsIt
    if (desc) parts.push(`<p>${esc(desc)}</p>`)

    if (aboutData.features?.length) {
      parts.push(`<h2>Key Features</h2><ul>${aboutData.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`)
    }

    if (aboutData.useCases?.length) {
      parts.push(`<h2>Who Should Use This Tool</h2><ul>${aboutData.useCases.map(u => `<li>${esc(u)}</li>`).join('')}</ul>`)
    }

    if (aboutData.howToUse?.length) {
      parts.push(`<h2>How to Use ${esc(tool.name)}</h2><ol>${aboutData.howToUse.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`)
    }

    if (aboutData.whyUseUs?.length) {
      parts.push(`<h2>Why Choose AWE-OS ${esc(tool.name)}</h2><ul>${aboutData.whyUseUs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`)
    }

    if (aboutData.faqs?.length) {
      parts.push(`<h2>Frequently Asked Questions</h2>${aboutData.faqs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}`)
    }

    if (parts.length) {
      aboutSection = `<section aria-label="About ${esc(tool.name)}">${parts.join('\n')}</section>`
    }
  }

  return `${bc}
<main>
<h1>${esc(tool.icon ?? '')} ${esc(tool.name)}</h1>
<p>${esc(tool.seo?.description ?? tool.description)}</p>
<p>${esc(tool.description)}</p>
${tagList}
${aboutSection}
${relatedSection}
</main>`
}

function buildCategoryBody(cat) {
  const bc = breadcrumb([
    { href: '/', label: 'Home' },
    { href: '/tools', label: 'Tools' },
    { label: cat.name },
  ])

  const toolsInCat = TOOL_REGISTRY
    .filter(t => t.category === cat.slug && !t.comingSoon)
    .map(t => `<li><a href="/tools/${t.slug}">${esc(t.name)}</a> — ${esc(t.description)}</li>`)
    .join('')
  const toolList = toolsInCat
    ? `<section><h2>All ${esc(cat.name)}</h2><ul>${toolsInCat}</ul></section>`
    : ''

  return `${bc}
<main>
<h1>${esc(cat.icon ?? '')} ${esc(cat.name)}</h1>
<p>${esc(cat.description)}</p>
${cat.intro?.body ? `<p>${esc(cat.intro.body)}</p>` : ''}
${toolList}
</main>`
}

function buildCityBody(cityPage) {
  const toolLabel = cityPage.toolName || cityPage.toolSlug || ''
  const cityLabel = cityPage.cityName || ''
  const bc = breadcrumb([
    { href: '/', label: 'Home' },
    { href: '/tools', label: 'Tools' },
    { href: `/tools/${cityPage.toolSlug}`, label: toolLabel },
    { label: cityLabel },
  ])
  const blocks = (cityPage.content || []).map(b => {
    if (b.type === 'h1' || b.type === 'h2') return `<h${b.type.slice(1)}>${esc(b.text)}</h${b.type.slice(1)}>`
    if (b.type === 'p') return `<p>${esc(b.text)}</p>`
    if (b.type === 'ul') return `<ul>${(b.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    return ''
  }).join('\n')
  const faqItems = (cityPage.faqs || []).map(f =>
    `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`
  ).join('\n')
  return `${bc}
<main>
${blocks}
${faqItems ? `<section><h2>Frequently Asked Questions</h2>${faqItems}</section>` : ''}
</main>`
}

function buildBlogBody(post) {
  const bc = breadcrumb([
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    { label: post.title },
  ])

  return `${bc}
<main>
<article>
<h1>${esc(post.title)}</h1>
${post.excerpt ? `<p>${esc(post.excerpt)}</p>` : ''}
${post.date ? `<time datetime="${esc(post.date)}">${esc(post.date)}</time>` : ''}
</article>
</main>`
}

function buildHomeBody() {
  const allTools = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')
  const totalTools = allTools.length

  const SECTIONS = [
    { key: 'pdf',          label: 'PDF Tools'               },
    { key: 'calculators',  label: 'Calculators'              },
    { key: 'converters',   label: 'Converters & Generators'  },
    { key: 'productivity', label: 'Productivity'             },
    { key: 'ai',           label: 'AI Tools'                 },
  ]

  const categorySections = SECTIONS.map(s => {
    const tools = allTools.filter(t => t.category === s.key)
    if (!tools.length) return ''
    const toolLinks = tools
      .map(t => `<li><a href="${t.path || `/tools/${t.slug}`}">${esc(t.name)}</a> — ${esc(t.description)}</li>`)
      .join('')
    return `<section id="section-${s.key}" aria-label="${esc(s.label)}">
<h2>${esc(s.label)}</h2>
<ul>${toolLinks}</ul>
</section>`
  }).join('\n')

  return `<main>
<h1>${totalTools}+ Free Tools. No Signup. Just Works.</h1>
<p>PDF tools, calculators, converters, and AI tools — all free, all in your browser.</p>
<p>Search tools — PDF, calculator, currency...</p>
<div aria-label="Platform statistics">
  <span>${totalTools}+ Tools</span>
  <span>100% Free</span>
  <span>No Signup</span>
  <span>Works in Browser</span>
</div>
${categorySections}
</main>`
}

function buildStaticBody(route) {
  // Strip " | AWE-OS" suffix and use as h1 text
  const h1 = route.title.replace(/\s*[|—–]\s*AWE-OS\s*$/i, '').trim()
  return `<main>
<h1>${esc(h1)}</h1>
<p>${esc(route.description)}</p>
</main>`
}

function buildBlogIndexBody() {
  const links = BLOG_POSTS.slice(0, 12)
    .map(p => `<li><a href="/blog/${p.slug}">${esc(p.title)}</a></li>`)
    .join('')
  return `<main>
<h1>AWE-OS Blog — Free Tools Guides &amp; Tutorials</h1>
<p>Guides, tutorials, and tips on PDF handling, online calculators, AI writing tools, and free productivity software.</p>
${links ? `<ul>${links}</ul>` : ''}
</main>`
}

function buildToolsIndexBody() {
  const featured = TOOL_REGISTRY
    .filter(t => t.isFeatured && !t.comingSoon)
    .slice(0, 12)
    .map(t => `<li><a href="/tools/${t.slug}">${esc(t.name)}</a> — ${esc(t.description)}</li>`)
    .join('')
  return `<main>
<h1>Free Online Tools — PDF, Calculators, AI &amp; Converters</h1>
<p>Browse 50+ free tools: PDF merger, compressor &amp; converter; BMI &amp; loan EMI calculators; QR code generator; AI resume builder. No sign-up, works in browser.</p>
${featured ? `<ul>${featured}</ul>` : ''}
</main>`
}

/** Replace the empty <div id="root"></div> with our static body HTML. */
function injectBody(html, bodyHTML) {
  return html.replace(
    /<div\s+id="root"\s*><\/div>/,
    `<div id="root">\n${bodyHTML}\n</div>`
  )
}

/** Write html to dist/{path}/index.html, creating directories as needed. */
function writeRoute(path, html) {
  const dir     = path === '/' ? DIST : `${DIST}${path}`
  const outFile = `${dir}/index.html`
  mkdirSync(dir, { recursive: true })
  writeFileSync(outFile, html, 'utf-8')
}

// ── Schema helpers ────────────────────────────────────────────────────────────

function buildBreadcrumbSchema(tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',                    item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools',                   item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: getCatName(tool.category), item: `${SITE_URL}/tools/${getCatSlug(tool.category)}` },
      { '@type': 'ListItem', position: 4, name: tool.name,                 item: `${SITE_URL}/tools/${tool.slug}` },
    ],
  }
}

// FAQPage schema removed — deprecated by Google as of May 7 2026

// ── Route definitions ─────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  {
    path: '/',
    title: 'AWE-OS — Free Online Tools: PDF, Calculators, AI & More',
    description: '50+ free browser-based tools. Merge, compress & convert PDFs; BMI, loan EMI & SIP calculators; QR code generator, AI resume builder. No sign-up required.',
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AWE-OS',
        url: SITE_URL,
        description: '50+ free browser-based tools. No sign-up required.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/tools?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'AWE-OS',
        url: SITE_URL,
        logo: `${SITE_URL}/og-image.svg`,
        sameAs: ['https://twitter.com/awe_os'],
      },
    ],
  },
  {
    path: '/tools',
    title: 'Free Online Tools — PDF, Calculators, AI & Converters | AWE-OS',
    description: 'Browse 50+ free tools: PDF merger, compressor & converter; BMI & loan EMI calculators; QR code generator; AI resume builder. No sign-up, works in browser.',
  },
  {
    path: '/tools/free',
    title: 'Free Tools — No Sign-Up Required | AWE-OS',
    description: 'All free tools on AWE-OS require no account, no payment, and no software. PDF, calculators, converters, AI tools — 100% free in your browser.',
  },
  {
    path: '/about',
    title: 'About AWE-OS — Free AI-Powered Tools for Everyone',
    description: 'AWE-OS provides 50+ free browser-based tools for everyone. Learn about our mission to make powerful tools accessible without subscriptions.',
  },
  {
    path: '/contact',
    title: 'Contact AWE-OS — Support & Feedback',
    description: 'Contact the AWE-OS team for support, feedback, or partnership enquiries. We respond within 24 hours.',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy — AWE-OS',
    description: 'AWE-OS privacy policy. All free tool computations run in your browser — no personal data is processed or stored on our servers.',
  },
  {
    path: '/terms',
    title: 'Terms of Service — AWE-OS',
    description: 'AWE-OS terms of service and usage conditions for free and premium tools.',
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer — AWE-OS',
    description: 'AWE-OS disclaimer regarding tool accuracy, financial calculations, and third-party services.',
  },
  {
    path: '/blog',
    title: 'Blog — Free Tools Guides & Tutorials | AWE-OS',
    description: 'Guides, tutorials, and tips on PDF handling, online calculators, AI writing tools, and free productivity software.',
  },
]

const EXCLUDED_SLUGS = new Set(['test-ai-tool', 'invoice'])

const CATEGORY_ROUTES = categoryByKey.map(cat => ({
  path: `/tools/${cat.slug}`,
  title: cat.title,
  description: cat.description,
  schema: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.name,
    description: cat.description,
    url: `${SITE_URL}/tools/${cat.slug}`,
    isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
  },
  _cat: cat,
}))

const TOOL_ROUTES = TOOL_REGISTRY
  .filter(t => !t.comingSoon && !EXCLUDED_SLUGS.has(t.slug))
  .map(t => ({
    path: `/tools/${t.slug}`,
    title: t.seo.title,
    description: t.seo.description,
    keywords: [...(t.tags ?? []), 'free online tool', 'no signup', 'browser based'].join(', '),
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: t.name,
        description: t.description,
        url: `${SITE_URL}/tools/${t.slug}`,
        applicationCategory: 'WebApplication',
        operatingSystem: 'Web Browser',
        screenshot: `${SITE_URL}/og-image.svg`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        provider: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
      },
      buildBreadcrumbSchema(t),
    ],
    _tool: t,
  }))

const BLOG_ROUTES = BLOG_POSTS.map(post => ({
  path: `/blog/${post.slug}`,
  title: post.metaTitle   || post.title,
  description: post.metaDescription || post.excerpt || '',
  schema: {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription || post.excerpt || '',
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
  },
  _post: post,
}))

const CITY_ROUTES = CITY_PAGES.map(cityPage => ({
  path: `/${cityPage.slug}`,   // e.g. /gst-calculator/mumbai
  title: cityPage.metaTitle || cityPage.title || `${cityPage.toolName} for ${cityPage.cityName}`,
  description: cityPage.metaDescription || '',
  schema: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: cityPage.title || '',
    description: cityPage.metaDescription || '',
    url: `${SITE_URL}/${cityPage.slug}`,
  },
  _cityPage: cityPage,
}))

const ALL_ROUTES = [
  ...STATIC_ROUTES,
  ...CATEGORY_ROUTES,
  ...TOOL_ROUTES,
  ...BLOG_ROUTES,
  ...CITY_ROUTES,
]

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🔧 Prerendering ${ALL_ROUTES.length} routes…`)

let template
try {
  template = readFileSync(`${DIST}/index.html`, 'utf-8')
} catch {
  console.error(`\n❌ dist/index.html not found at: ${DIST}`)
  console.error('   Run `vite build` first before running prerender.js\n')
  process.exit(1)
}

let count  = 0
const errors = []

for (const route of ALL_ROUTES) {
  try {
    const canonical = `${SITE_URL}${route.path}`

    // 1. Inject <head> meta
    let html = injectMeta(template, {
      title:       route.title,
      description: route.description,
      canonical,
      schema:      route.schema   ?? null,
      schemas:     route.schemas  ?? null,
      keywords:    route.keywords ?? null,
    })

    // 2. Inject static <body> content for crawlers
    let bodyHTML
    if (route._tool) {
      bodyHTML = buildToolBody(route._tool)
    } else if (route._cat) {
      bodyHTML = buildCategoryBody(route._cat)
    } else if (route._post) {
      bodyHTML = buildBlogBody(route._post)
    } else if (route._cityPage) {
      bodyHTML = buildCityBody(route._cityPage)
    } else if (route.path === '/') {
      bodyHTML = buildHomeBody()
    } else if (route.path === '/tools') {
      bodyHTML = buildToolsIndexBody()
    } else if (route.path === '/blog') {
      bodyHTML = buildBlogIndexBody()
    } else {
      bodyHTML = buildStaticBody(route)
    }

    html = injectBody(html, bodyHTML)

    writeRoute(route.path, html)
    count++
  } catch (err) {
    errors.push({ path: route.path, error: err.message })
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n✅ Prerender complete: ${count}/${ALL_ROUTES.length} routes`)
console.log(`   📄 Static pages : ${STATIC_ROUTES.length}`)
console.log(`   📂 Categories   : ${CATEGORY_ROUTES.length}`)
console.log(`   🛠️  Tools        : ${TOOL_ROUTES.length}`)
console.log(`   📝 Blog posts   : ${BLOG_ROUTES.length}`)
console.log(`   🏙️  City pages   : ${CITY_ROUTES.length}`)

if (errors.length) {
  console.error(`\n⚠️  ${errors.length} route(s) failed:`)
  errors.forEach(e => console.error(`   ${e.path}: ${e.error}`))
  process.exitCode = 1
}

// Spot-check
console.log('\nSpot-check:')
;[
  '/tools/merge-pdf',
  '/tools/sip-calculator',
  '/tools/fd-calculator',
  '/tools/ppf-calculator',
  '/tools/contract-generator',
  '/tools/calculators',
  '/blog/best-free-ai-tools-for-students-2025',
].forEach(p => console.log(`   ✓ dist${p}/index.html`))
console.log()
