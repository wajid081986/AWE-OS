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

let TOOL_GUIDE = {}
try {
  const guide = await import('../src/data/toolGuideContent.js')
  TOOL_GUIDE = guide.TOOL_GUIDE ?? {}
} catch (e) {
  console.warn('⚠️  Could not import toolGuideContent.js — guide sections will be skipped.')
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

  const guideData = TOOL_GUIDE[tool.slug]
  let guideSection = ''
  if (guideData) {
    const guideParts = []
    if (guideData.tips?.length) {
      guideParts.push(`<h2>Tips &amp; Best Practices</h2><ul>${guideData.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`)
    }
    if (guideData.mistakes?.length) {
      guideParts.push(`<h2>Common Mistakes to Avoid</h2><ul>${guideData.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`)
    }
    if (guideParts.length) {
      guideSection = `<section aria-label="Guide for ${esc(tool.name)}">${guideParts.join('\n')}</section>`
    }
  }

  return `${bc}
<main>
<h1>${esc(tool.icon ?? '')} ${esc(tool.name)}</h1>
<p>${esc(tool.seo?.description ?? tool.description)}</p>
<p>${esc(tool.description)}</p>
${tagList}
${aboutSection}
${guideSection}
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

function renderBlogBlock(block) {
  switch (block.type) {
    case 'h2':   return `<h2>${esc(block.text)}</h2>`
    case 'h3':   return `<h3>${esc(block.text)}</h3>`
    case 'p':    return `<p>${esc(block.text)}</p>`
    case 'ul':
      return `<ul>${(block.items ?? []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    case 'ol':
      return `<ol>${(block.items ?? []).map(i => `<li>${esc(i)}</li>`).join('')}</ol>`
    case 'table': {
      const thead = block.headers?.length
        ? `<thead><tr>${block.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>`
        : ''
      const tbody = block.rows?.length
        ? `<tbody>${block.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
        : ''
      return `<table>${thead}${tbody}</table>`
    }
    case 'callout': {
      const linkHtml = (block.links ?? [])
        .map(l => `<a href="${l.href}">${esc(l.label)}</a>`)
        .join(' ')
      return `<aside><p>${esc(block.text)}${linkHtml ? ' ' + linkHtml : ''}</p></aside>`
    }
    default: return ''
  }
}

function buildBlogBody(post) {
  const bc = breadcrumb([
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    { label: post.title },
  ])

  const contentHtml = (post.content ?? []).map(renderBlogBlock).filter(Boolean).join('\n')

  // Related tools links
  const relatedToolLinks = (post.relatedTools ?? [])
    .map(t => `<li><a href="/tools/${t.slug}">${esc(t.icon ?? '')} ${esc(t.label)}</a></li>`)
    .join('')
  const relatedToolsSection = relatedToolLinks
    ? `<section aria-label="Related tools"><h2>Related Tools</h2><ul>${relatedToolLinks}</ul></section>`
    : ''

  // Related blog posts (same category, different slug, up to 3)
  const relatedPosts = BLOG_POSTS
    .filter(p => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3)
  const relatedPostLinks = relatedPosts
    .map(p => `<li><a href="/blog/${p.slug}">${esc(p.title)}</a></li>`)
    .join('')
  const relatedPostsSection = relatedPostLinks
    ? `<section aria-label="Related articles"><h2>Related Articles</h2><ul>${relatedPostLinks}</ul></section>`
    : ''

  return `${bc}
<main>
<article>
<h1>${esc(post.title)}</h1>
${post.excerpt ? `<p>${esc(post.excerpt)}</p>` : ''}
${post.date ? `<time datetime="${esc(post.date)}">${esc(post.date)}</time>` : ''}
${contentHtml}
</article>
${relatedToolsSection}
${relatedPostsSection}
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
<h1>${totalTools}+ Tools. No Signup for Most. Just Works.</h1>
<p>PDF tools, calculators, converters, and AI tools — most are free and run right in your browser.</p>
<p>Search tools — PDF, calculator, currency...</p>
<div aria-label="Platform statistics">
  <span>${totalTools}+ Tools</span>
  <span>Mostly Free</span>
  <span>No Signup for Most</span>
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

function buildAboutBody() {
  const values = [
    { title: 'Always Free',       desc: 'Core tools are free forever. No hidden fees, no paywalls on essential features. We believe utility should not be gated by your budget.' },
    { title: 'Fast & Simple',     desc: 'Every tool is designed to deliver results in seconds. Most need no sign-up and no bloated interfaces — just paste, click, done.' },
    { title: 'Private & Safe',    desc: 'We never sell your data. Files you process in our PDF tools are never stored on our servers. Your inputs stay yours.' },
    { title: 'AI-Powered',        desc: 'Cutting-edge language models and machine learning algorithms work behind every AI tool to deliver smarter, more accurate results.' },
    { title: 'Mobile First',      desc: 'Every tool works perfectly on your phone, tablet or desktop. No app download needed — just open your browser and start.' },
    { title: 'Built for Everyone', desc: 'From students in Lagos to freelancers in London, AWE-OS is designed to be useful regardless of your device, language, or technical skill.' },
  ]

  const categories = [
    {
      title: 'PDF Tools', href: '/tools/pdf',
      desc: 'Merge, split, compress, rotate, protect, unlock, watermark and convert PDF files — all without uploading to a third-party server. Our browser-based PDF engine processes everything locally for maximum privacy.',
      tools: ['Merge PDF', 'Compress PDF', 'PDF to Word', 'Word to PDF', 'Split PDF', 'Protect PDF'],
    },
    {
      title: 'Calculators', href: '/tools/calculators',
      desc: 'From BMI and loan repayments to GPA and compound interest, our calculators cover the everyday maths that matters. Each one is built with verified formulas from authoritative sources like WHO, RBI, and standard financial principles.',
      tools: ['BMI Calculator', 'Loan Calculator', 'Age Calculator', 'GPA Calculator', 'SIP Calculator', 'GST Calculator'],
    },
    {
      title: 'Converters & Generators', href: '/tools/converters',
      desc: 'Instantly convert between units, file formats, colour spaces, and data formats. Whether you need to convert kilometres to miles or CSV to JSON, our converters are accurate, fast and completely free.',
      tools: ['Unit Converter', 'CSV to JSON', 'Color Picker', 'Image Compressor', 'QR Code Generator'],
    },
    {
      title: 'Productivity & AI Tools', href: '/tools/productivity',
      desc: 'Our AI-powered tools tap into state-of-the-art language models to help you write, create and produce better content faster. Build a polished resume in minutes, write content with AI, or create invoices and contracts.',
      tools: ['AI Resume Builder', 'AI Content Writer', 'Invoice Generator', 'Contract Generator'],
    },
  ]

  const team = [
    { name: 'Wajid',     role: 'Founder & CEO',       bio: 'Passionate about democratising AI and making powerful software tools accessible to people who need them most.' },
    { name: 'AI Team',   role: 'Engineering & Models', bio: 'Our AI agents continuously discover, design and deploy new tools based on real user needs.' },
    { name: 'Community', role: 'Users & Contributors', bio: 'Everyone who uses AWE-OS and shares feedback helps shape what we build next.' },
  ]

  const catHTML = categories.map(c => `
<section>
  <h3><a href="${c.href}">${esc(c.title)}</a></h3>
  <p>${esc(c.desc)}</p>
  <ul>${c.tools.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
</section>`).join('')

  const valuesHTML = values.map(v =>
    `<dt>${esc(v.title)}</dt><dd>${esc(v.desc)}</dd>`
  ).join('')

  const teamHTML = team.map(m =>
    `<section><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p><p>${esc(m.bio)}</p></section>`
  ).join('')

  return `<main>
<h1>About AWE-OS</h1>
<p>We build free, fast, browser-based tools for everyone.</p>

<section aria-label="Platform statistics">
  <ul>
    <li>49+ Tools</li>
    <li>47+ No-Signup Tools</li>
    <li>0 Files Stored</li>
    <li>0 Cost for Core Tools</li>
  </ul>
</section>

<section aria-label="Our Mission">
  <h2>Our Mission</h2>
  <p>AWE-OS was built to give everyone access to tools that usually cost money or require accounts. PDF tools, financial calculators, and converters are free and run entirely in your browser — no account needed. Whether you're a student in Mumbai, a freelancer in Lagos, or a small business owner in London, you deserve the same powerful tools as any Fortune 500 company.</p>
  <p>Privacy is not an afterthought — it's our foundation. No data is sent to any server. Everything runs locally in your browser. When you compress a PDF, calculate your BMI, or generate a QR code, your data never leaves your device. We have no access to it, and we never will.</p>
  <p>We live in an era where browser technology is powerful enough to run sophisticated tools entirely on your device — with zero uploads, zero accounts, and zero cost. Most of AWE-OS works exactly that way. A small number of advanced AI tools run on server-side models and require a free account, with an optional paid plan for heavy use. AWE-OS is our commitment to keeping as much as possible free, fast, and open.</p>
</section>

<section aria-label="What you can do on AWE-OS">
  <h2>What You Can Do on AWE-OS</h2>
  ${catHTML}
</section>

<section aria-label="Why we built this">
  <h2>Why We Built This</h2>
  <p>Most online tool sites are cluttered with ads, require sign-ups, or upload your files to foreign servers. A simple PDF compression sends your private documents to a server you know nothing about. A basic calculator is buried under pop-ups asking you to subscribe. We built AWE-OS to fix that.</p>
  <p>The goal was simple: clean UI, no signup, browser-only processing wherever possible. Most tools on AWE-OS — PDF tools, calculators, and converters — run entirely inside your browser. Your files never travel over the network. Your calculations are never logged. You never have to create an account just to convert a PDF or check your BMI.</p>
</section>

<section aria-label="Our Values">
  <h2>Our Values</h2>
  <dl>${valuesHTML}</dl>
</section>

<section aria-label="The Team">
  <h2>The Team</h2>
  <p>AWE-OS is built and maintained by a small team of developers passionate about making useful tools accessible to everyone.</p>
  ${teamHTML}
</section>
</main>`
}

function buildContactBody() {
  return `<main>
<h1>Contact AWE-OS — Support &amp; Feedback</h1>
<p>Have a question, suggestion, or found a bug? We'd love to hear from you. The AWE-OS team typically responds within 24 hours on weekdays.</p>

<section aria-label="Contact methods">
  <h2>Other Ways to Reach Us</h2>
  <ul>
    <li><strong>Email:</strong> <a href="mailto:contact@awe-os.com">contact@awe-os.com</a> — for support, feedback, and partnership enquiries.</li>
    <li><strong>Twitter / X:</strong> <a href="https://twitter.com/awe_os" rel="noopener noreferrer">@awe_os</a> — follow us for updates and tool announcements.</li>
    <li><strong>Response time:</strong> We typically respond within 24 hours on weekdays. We aim to reply to all messages within 48 hours.</li>
  </ul>
</section>

<section aria-label="What we can help with">
  <h2>What We Can Help With</h2>
  <dl>
    <dt>Bug Reports</dt>
    <dd>If a tool is not working correctly — incorrect output, broken UI, or unexpected errors — please describe the issue and the tool name. Screenshots or steps to reproduce are very helpful.</dd>
    <dt>Feature Requests</dt>
    <dd>We love hearing what tools or features you'd like to see added to AWE-OS. Describe your use case and we'll add it to our roadmap consideration.</dd>
    <dt>General Questions</dt>
    <dd>Questions about how our tools work, data privacy, browser compatibility, or anything else. We're happy to explain.</dd>
    <dt>Partnership &amp; Collaboration</dt>
    <dd>Interested in partnering with AWE-OS? Whether it's content collaboration, tool integration, or something else entirely, reach out and let's talk.</dd>
  </dl>
</section>

<section aria-label="Quick help links">
  <h2>Looking for Quick Help?</h2>
  <ul>
    <li><a href="/tools/merge-pdf">How do I merge PDF files?</a></li>
    <li><a href="/about">Is my data safe on AWE-OS?</a></li>
    <li><a href="/about">Are all tools really free?</a></li>
    <li><a href="/tools">Browse all free tools</a></li>
    <li><a href="/privacy-policy">Privacy Policy</a></li>
    <li><a href="/terms">Terms of Service</a></li>
  </ul>
</section>

<section aria-label="Send a message">
  <h2>Send Us a Message</h2>
  <p>Use our contact form to send us your name, email address, subject, and message. We accept messages about general questions, bug reports, feature requests, partnerships, and other topics.</p>
  <p>All fields are required. Please include as much detail as possible so we can help you effectively. For bug reports, include the tool name, what you expected to happen, and what actually happened.</p>
</section>
</main>`
}

function buildPrivacyBody() {
  return `<main>
<h1>Privacy Policy</h1>
<p>Last updated: June 1, 2026</p>

<section aria-label="Introduction">
  <h2>1. Introduction</h2>
  <p>AWE-OS is a free, browser-based tools platform. We are committed to your privacy — not just as a legal obligation, but as a core design principle. This policy explains exactly what data we do and do not handle when you use awe-os.com.</p>
  <p>The short version: we built AWE-OS so your data never has to leave your device. PDF processing, image editing, calculations, and conversions all run locally in your browser. Nothing is uploaded to our servers. Nothing is stored. Nothing is sold.</p>
</section>

<section aria-label="Data we do not collect">
  <h2>2. Data We Do NOT Collect</h2>
  <p>The following data is never sent to our servers under any circumstances:</p>
  <ul>
    <li>Files you upload to PDF tools (merge, compress, split, convert, etc.)</li>
    <li>Images you process with our image tools</li>
    <li>Numbers or values you enter into calculators or converters</li>
    <li>Text you paste into any text-processing tool</li>
    <li>QR code data, colour values, or unit conversion inputs</li>
  </ul>
  <p>All of the above run entirely inside your browser using JavaScript. Your data never travels over the network. We have no access to it, and we never will.</p>
</section>

<section aria-label="Data we may collect">
  <h2>3. Data We May Collect</h2>
  <p>The only personal data we may receive comes through two voluntary channels:</p>
  <p><strong>Contact form:</strong> If you use the contact form at awe-os.com/contact, we receive your name, email address, and the message you write. We use this solely to reply to you and do not add you to any marketing list.</p>
  <p><strong>Analytics:</strong> If Google Analytics is active on the site, it collects anonymised usage data — pages visited, session duration, country, and device type. This data is aggregated and never linked to you personally. You can opt out at any time using the Google Analytics Opt-out Browser Add-on.</p>
</section>

<section aria-label="Cookies">
  <h2>4. Cookies</h2>
  <p>AWE-OS itself does not set any tracking or login cookies — there are no user accounts, so there is no session to maintain.</p>
  <p>If Google Analytics or Google AdSense is active, those services may set their own cookies. Analytics cookies measure site traffic in aggregate and do not identify you personally. Advertising cookies (Google AdSense) are used to serve contextually relevant ads and can be opted out via Google Ads Settings.</p>
  <p>You can block or delete all cookies through your browser settings at any time. Doing so will not affect any tool functionality on AWE-OS.</p>
</section>

<section aria-label="Third-party services">
  <h2>5. Third-Party Services</h2>
  <p><strong>Google AdSense:</strong> We plan to display non-intrusive ads to fund the platform. AdSense may use cookies to personalise ads based on your browsing history across the web.</p>
  <p><strong>Google Analytics:</strong> Anonymised traffic measurement. Data is processed by Google under their standard terms. No personally identifiable information is shared.</p>
  <p>We do not use any other third-party data processors. We do not sell, rent, or share your data with any party for commercial purposes.</p>
</section>

<section aria-label="Your rights">
  <h2>6. Your Rights</h2>
  <p>We respect your rights under both the EU General Data Protection Regulation (GDPR) and the Indian Information Technology Act 2000 and its associated rules (IT Reasonable Security Practices and Procedures Rules 2011).</p>
  <p>Because we collect almost no personal data, most rights are automatically satisfied. You have the right to access any contact form data we hold, the right to erasure (contact us and we will delete within 30 days), and the right to object to analytics or advertising cookies at any time via their respective opt-out mechanisms.</p>
  <p>For any privacy-related questions or data deletion requests, email: <a href="mailto:contact@awe-os.com">contact@awe-os.com</a></p>
</section>

<section aria-label="Contact">
  <h2>7. Contact</h2>
  <p>For any privacy-related questions, data deletion requests, or concerns, please contact us at <a href="mailto:contact@awe-os.com">contact@awe-os.com</a> or via our <a href="/contact">contact form</a>. We aim to respond to all privacy enquiries within 5 business days.</p>
</section>

<section aria-label="Changes to this policy">
  <h2>8. Changes to This Policy</h2>
  <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Because we do not hold your email address (unless you contacted us), we cannot notify you of changes directly. Continued use of AWE-OS after a policy update constitutes your acceptance of the revised policy.</p>
</section>
</main>`
}

function buildTermsBody() {
  return `<main>
<h1>Terms of Service</h1>
<p>Last updated: June 1, 2026</p>

<section aria-label="Acceptance of terms">
  <h2>1. Acceptance of Terms</h2>
  <p>By accessing or using AWE-OS at awe-os.com, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use AWE-OS.</p>
  <p>We reserve the right to update these Terms at any time. Changes take effect immediately upon posting. Continued use of AWE-OS after a change constitutes your acceptance of the revised Terms.</p>
</section>

<section aria-label="Free use">
  <h2>2. Free Use — Personal and Commercial</h2>
  <p>AWE-OS tools are free to use for both personal and commercial purposes. No sign-up, subscription, or payment is required to access any tool on the platform.</p>
  <p>You are permitted to use all tools for personal projects, freelance work, and business use; use outputs generated by AWE-OS tools in commercial products and client deliverables; and share links to AWE-OS tools freely.</p>
  <p>You must not use the Service for any unlawful purpose, attempt to reverse-engineer or systematically scrape AWE-OS content, use automated bots at rates exceeding normal human use, infringe intellectual property rights, or submit malicious code designed to disrupt the platform.</p>
</section>

<section aria-label="No warranty">
  <h2>3. No Warranty</h2>
  <p>AWE-OS is provided "as is" and "as available" without warranties of any kind, either express or implied. We make no warranty that the Service will be uninterrupted or error-free, that tool outputs will be accurate or fit for any particular purpose, or that any defects or errors will be corrected.</p>
  <p>You use AWE-OS at your own risk. We disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement to the fullest extent permitted by law.</p>
</section>

<section aria-label="Limitation of liability">
  <h2>4. Limitation of Liability</h2>
  <p>To the maximum extent permitted by applicable law, AWE-OS and its owners shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of — or inability to use — the Service. This includes loss of data or files, loss of profits or business revenue, decisions made based on tool outputs, and service interruptions or downtime.</p>
  <p>Because AWE-OS is a free service, our total liability to you for any claim shall not exceed INR 100.</p>
</section>

<section aria-label="Intellectual property">
  <h2>5. Intellectual Property</h2>
  <p>All original content on AWE-OS — including the platform design, tool interfaces, branding, and written content — is the intellectual property of AWE-OS and is protected under applicable copyright law.</p>
  <p>Your inputs and outputs belong to you. Files you upload, text you enter, and results generated by our tools remain your property. By using AWE-OS, you grant us no licence to your content — it stays on your device and we never see it.</p>
  <p>You may not reproduce, republish, or create derivative works from AWE-OS's own content (tool UI, branding, marketing copy) without prior written permission.</p>
</section>

<section aria-label="Governing law">
  <h2>6. Governing Law</h2>
  <p>These Terms of Service are governed by and construed in accordance with the laws of India, including the Information Technology Act 2000 and applicable rules thereunder.</p>
  <p>Any disputes arising out of or relating to these Terms or your use of AWE-OS shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.</p>
  <p>If you have questions about these Terms, please contact us at <a href="mailto:contact@awe-os.com">contact@awe-os.com</a> or via the <a href="/contact">contact form</a>.</p>
</section>
</main>`
}

function buildDisclaimerBody() {
  return `<main>
<h1>Disclaimer</h1>
<p>Please read this disclaimer carefully before using the tools and services provided by AWE-OS at awe-os.com. Last updated: May 8, 2026.</p>

<section aria-label="General disclaimer">
  <h2>1. General Disclaimer</h2>
  <p>The information, tools, calculators, converters and AI-generated content available on AWE-OS are provided strictly for general informational and educational purposes. While we make every reasonable effort to ensure the accuracy and reliability of our tools, AWE-OS makes no representations or warranties of any kind — express, implied, statutory or otherwise — about the completeness, accuracy, reliability, suitability or availability of any tool, result or content on this platform.</p>
  <p>Any reliance you place on information or results generated by our tools is strictly at your own risk. AWE-OS expressly disclaims all liability for any errors, omissions, or inaccuracies in tool outputs, and for any loss or damage — direct or indirect — arising from your use of or reliance on any content or tool on this platform.</p>
</section>

<section aria-label="No financial advice">
  <h2>2. No Financial Advice</h2>
  <p>AWE-OS offers financial calculation tools such as loan calculators, EMI calculators, compound interest calculators, percentage calculators, and similar utilities. These tools are designed to help you perform mathematical computations quickly and conveniently.</p>
  <p>Nothing on AWE-OS constitutes financial advice. The results produced by our financial calculators are estimates based on the inputs you provide and standard mathematical formulas. They are not a substitute for advice from a qualified financial advisor, accountant, or investment professional.</p>
  <p>Financial decisions — including loans, investments, tax planning, budgeting and retirement planning — involve complex variables, regulatory requirements and personal circumstances that our tools cannot fully account for. Before making any financial decision, consult a licensed financial professional.</p>
</section>

<section aria-label="No medical advice">
  <h2>3. No Medical or Health Advice</h2>
  <p>AWE-OS offers health-related tools such as BMI calculators, calorie estimators, age calculators and similar health metrics tools. These tools are provided for general informational purposes only.</p>
  <p>Nothing on AWE-OS constitutes medical advice, diagnosis, or treatment. The results from our health and wellness calculators are based on general population formulas (such as WHO and CDC guidelines) and do not account for individual medical history, pre-existing conditions, medications, or other personal health factors.</p>
  <p>Always consult a qualified healthcare professional before making decisions about your health, diet, exercise or medical treatment.</p>
</section>

<section aria-label="No legal advice">
  <h2>4. No Legal Advice</h2>
  <p>Some tools on AWE-OS — such as document converters, invoice generators, contract templates and content generators — may produce documents or text that have legal implications. Nothing on AWE-OS constitutes legal advice. The documents, templates, and text generated by our tools are provided for general informational purposes only and should not be treated as legal counsel.</p>
  <p>Laws vary significantly by jurisdiction, and no automated tool can account for the full complexity of your legal situation. Documents generated by AWE-OS tools should be reviewed by a licensed legal professional before being used in formal or legally binding contexts. AWE-OS is not a law firm and no attorney-client relationship is created by your use of this platform.</p>
</section>

<section aria-label="AI-generated content disclaimer">
  <h2>5. AI-Generated Content Disclaimer</h2>
  <p>Several tools on AWE-OS use artificial intelligence — including large language models (LLMs) — to generate text, summaries, rewritten content, resumes, cover letters and other outputs. AI-generated content is produced by statistical models and may contain errors, inaccuracies, outdated information, or content that does not fully meet your needs.</p>
  <p>AI outputs should always be reviewed, fact-checked and edited by a qualified human before being used in any professional, academic, medical, legal or financial context. AWE-OS does not guarantee that AI-generated content is original, free from plagiarism, or suitable for any particular purpose.</p>
</section>

<section aria-label="Tool accuracy and limitations">
  <h2>6. Tool Accuracy and Limitations</h2>
  <p>AWE-OS tools are built using widely accepted algorithms, mathematical formulas, and industry-standard methods. However, all digital tools have inherent limitations: results are only as accurate as the inputs you provide; rounding and approximation methods may introduce minor inaccuracies; unit converters use standardised conversion factors which may not account for regional variations; PDF tools may not preserve all formatting from every document type; image compression tools balance quality and file size; and AI writing tools reflect training data up to a knowledge cut-off date.</p>
</section>

<section aria-label="External links">
  <h2>7. External Links</h2>
  <p>AWE-OS may contain links to external websites and services that are not operated by us. These links are provided for your convenience only. We have no control over the content, accuracy, or availability of external sites and accept no responsibility or liability for them. The inclusion of a link does not imply our endorsement of the linked website or its content.</p>
</section>

<section aria-label="Limitation of liability">
  <h2>8. Limitation of Liability</h2>
  <p>To the fullest extent permitted by applicable law, AWE-OS, its founders, employees, agents, partners and affiliates shall not be liable for any direct, indirect, incidental, consequential, special or punitive damages arising from your use of or inability to use any tool, feature, or content on AWE-OS — including errors in tool outputs, decisions made based on tool results, temporary unavailability of the platform, or unauthorised access to your data.</p>
</section>

<section aria-label="Contact">
  <h2>9. Contact Us</h2>
  <p>If you have questions about this Disclaimer or concerns about the accuracy of any tool result, contact us at <a href="mailto:contact@awe-os.com">contact@awe-os.com</a> or via our <a href="/contact">contact form</a>.</p>
</section>
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
<h1>Online Tools — PDF, Calculators, AI &amp; Converters</h1>
<p>Browse 49+ tools, most free with no signup: PDF merger, compressor &amp; converter; BMI &amp; loan EMI calculators; QR code generator; AI-powered tools. Works in browser.</p>
${featured ? `<ul>${featured}</ul>` : ''}
</main>`
}

/** Replace the empty <div id="root"></div> with our static body HTML.
 *  The content is hidden from the browser so crawlers (which read raw HTML)
 *  still see it, but users never see raw unstyled text before React mounts. */
function injectBody(html, bodyHTML) {
  return html.replace(
    /<div\s+id="root"\s*><\/div>/,
    `<div id="root"><div style="display:none" aria-hidden="true">\n${bodyHTML}\n</div></div>`
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
    title: 'AWE-OS — Mostly Free Online Tools: PDF, Calculators, AI & More',
    description: '49+ browser-based tools, most free with no signup. Merge, compress & convert PDFs; BMI, loan EMI & SIP calculators; QR code generator, and AI-powered tools.',
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AWE-OS',
        url: SITE_URL,
        description: '49+ browser-based tools, most free with no signup required.',
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
        logo: `${SITE_URL}/og-image.png`,
        sameAs: ['https://twitter.com/awe_os'],
      },
    ],
  },
  {
    path: '/tools',
    title: 'Online Tools — PDF, Calculators, AI & Converters | AWE-OS',
    description: 'Browse 49+ tools, most free with no signup: PDF merger, compressor & converter; BMI & loan EMI calculators; QR code generator; AI-powered tools. Works in browser.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Online Tools — AWE-OS',
      description: 'Browse 49+ tools, most free with no signup: PDF merger, compressor & converter; BMI & loan EMI calculators; QR code generator; AI-powered tools. Works in browser.',
      url: `${SITE_URL}/tools`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/tools/free',
    title: 'Free Tools — No Sign-Up Required | AWE-OS',
    description: 'All free tools on AWE-OS require no account, no payment, and no software. PDF, calculators, and converters — 100% free in your browser.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Free Tools — No Sign-Up Required',
      description: 'All free tools on AWE-OS require no account, no payment, and no software. PDF, calculators, and converters — 100% free in your browser.',
      url: `${SITE_URL}/tools/free`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/about',
    title: 'About AWE-OS — Mostly Free, AI-Powered Tools for Everyone',
    description: 'AWE-OS provides 49+ browser-based tools for everyone, most free and no signup. Learn about our mission to make powerful tools accessible.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About AWE-OS',
      description: 'AWE-OS provides 49+ browser-based tools for everyone, most free and no signup. Learn about our mission to make powerful tools accessible.',
      url: `${SITE_URL}/about`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/contact',
    title: 'Contact AWE-OS — Support & Feedback',
    description: 'Contact the AWE-OS team for support, feedback, or partnership enquiries. We respond within 24 hours.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact AWE-OS',
      description: 'Contact the AWE-OS team for support, feedback, or partnership enquiries. We respond within 24 hours.',
      url: `${SITE_URL}/contact`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy — AWE-OS',
    description: 'AWE-OS privacy policy. All free tool computations run in your browser — no personal data is processed or stored on our servers.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Privacy Policy — AWE-OS',
      description: 'AWE-OS privacy policy. All free tool computations run in your browser — no personal data is processed or stored on our servers.',
      url: `${SITE_URL}/privacy-policy`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/terms',
    title: 'Terms of Service — AWE-OS',
    description: 'AWE-OS terms of service and usage conditions for free and premium tools.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Terms of Service — AWE-OS',
      description: 'AWE-OS terms of service and usage conditions for free and premium tools.',
      url: `${SITE_URL}/terms`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer — AWE-OS',
    description: 'AWE-OS disclaimer regarding tool accuracy, financial calculations, and third-party services.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Disclaimer — AWE-OS',
      description: 'AWE-OS disclaimer regarding tool accuracy, financial calculations, and third-party services.',
      url: `${SITE_URL}/disclaimer`,
      isPartOf: { '@type': 'WebSite', name: 'AWE-OS', url: SITE_URL },
    },
  },
  {
    path: '/blog',
    title: 'Blog — Free Tools Guides & Tutorials | AWE-OS',
    description: 'Guides, tutorials, and tips on PDF handling, online calculators, AI writing tools, and free productivity software.',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'AWE-OS Blog',
      description: 'Guides, tutorials, and tips on PDF handling, online calculators, AI writing tools, and free productivity software.',
      url: `${SITE_URL}/blog`,
      publisher: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
    },
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
        screenshot: `${SITE_URL}/og-image.png`,
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
  noindex: post.noindex ?? false,
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
    } else if (route.path === '/about') {
      bodyHTML = buildAboutBody()
    } else if (route.path === '/contact') {
      bodyHTML = buildContactBody()
    } else if (route.path === '/privacy-policy') {
      bodyHTML = buildPrivacyBody()
    } else if (route.path === '/terms') {
      bodyHTML = buildTermsBody()
    } else if (route.path === '/disclaimer') {
      bodyHTML = buildDisclaimerBody()
    } else {
      bodyHTML = buildStaticBody(route)
    }

    html = injectBody(html, bodyHTML)

    if (route.noindex) {
      html = replaceMeta(html, 'robots', 'noindex, follow')
    }

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
