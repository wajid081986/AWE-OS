/**
 * Vercel Edge Middleware — Bot-aware prerendering.
 *
 * Three rendering modes:
 *   1. Regular users         — pass through unchanged (zero impact on UX)
 *   2. Social media bots     — lightweight OG-only HTML (Twitter, Facebook, etc.)
 *   3. Search engine crawlers— full pre-rendered HTML with visible body content,
 *                              FAQ/About sections, and JSON-LD structured data
 *
 * Routes handled for search bots:
 *   /                          static home page HTML
 *   /tools                     tools index HTML
 *   /tools/<category>          category landing HTML
 *   /tools/<slug>              full tool page (About + How-to + FAQ + schemas)
 *   /blog                      blog listing with all article titles + excerpts
 *   /blog/<slug>               individual article with Article schema
 *   /about /contact /pricing   static page HTML with body content
 *   /privacy-policy /terms /disclaimer  same
 *
 * Runs on Vercel Edge Runtime (Web APIs only, no Node.js modules).
 */

// ── User-agent detection ──────────────────────────────────────────────────────

// Social-media bots: need OG meta tags only
const SOCIAL_BOT_UA = /Twitterbot|facebookexternalhit|Slackbot-LinkExpanding|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Pinterest|Googlebot-Image|applebot|Iframely/i;

// Search engine crawlers: need full pre-rendered HTML with body content
const SEARCH_BOT_UA = /Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebot|ia_archiver|AhrefsBot|SemrushBot|MJ12bot|DotBot/i;

const SITE_URL = 'https://www.awe-os.com';
const OG_IMAGE = 'https://www.awe-os.com/og-image.svg';

// ── Utilities ─────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Safe JSON inside <script> tags — prevents </script> injection
function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function slugToName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Shared <head> block reused by all full-HTML responses
function headBlock({ title, description, url, canonical, extraMeta = '' }) {
  const t = esc(title);
  const d = esc(description);
  const u = esc(url || canonical);
  const c = esc(canonical || url);
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${c}">
  <meta property="og:site_name" content="AWE-OS">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:url" content="${c}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${esc(OG_IMAGE)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@awe_os">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${esc(OG_IMAGE)}">
  ${extraMeta}
  <style>
    body{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:24px 16px;color:#1a1a1a;line-height:1.6}
    nav{font-size:13px;color:#666;margin-bottom:24px}
    nav a{color:#2563eb;text-decoration:none}
    h1{font-size:2rem;font-weight:700;margin:0 0 8px}
    h2{font-size:1.25rem;font-weight:600;margin:32px 0 12px}
    h3{font-size:1rem;font-weight:600;margin:0 0 6px}
    p{margin:0 0 12px;color:#374151}
    a{color:#2563eb;text-decoration:none}
    .card{border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px}
    .card .meta{font-size:12px;color:#9ca3af;margin-bottom:6px}
    .about{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:28px}
    ol,ul{padding-left:20px}
    li{margin-bottom:8px;color:#374151}
    .faq-item{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px}
    .faq-item h3{font-size:0.95rem;font-weight:600;margin:0 0 8px;color:#111827}
    .faq-item p{font-size:0.9rem;margin:0;color:#4b5563}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#9ca3af}
  </style>
</head>`;
}

// Shared footer HTML
const FOOTER_HTML = `<footer>
  <p>
    <a href="${SITE_URL}">AWE-OS</a> — 100+ free AI-powered tools for everyone. &nbsp;|&nbsp;
    <a href="${SITE_URL}/tools">Browse all tools</a> &nbsp;|&nbsp;
    <a href="${SITE_URL}/blog">Blog</a> &nbsp;|&nbsp;
    <a href="${SITE_URL}/privacy-policy">Privacy Policy</a>
  </p>
</footer>`;

// ── Lightweight OG-only HTML for social media bots ────────────────────────────
function ogHtml(title, description, url) {
  const t = esc(title);
  const d = esc(description);
  const u = esc(url);
  return (
    '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    `<title>${t}</title>` +
    `<meta name="description" content="${d}">` +
    '<meta property="og:site_name" content="AWE-OS">' +
    '<meta property="og:locale" content="en_US">' +
    `<meta property="og:title" content="${t}">` +
    `<meta property="og:description" content="${d}">` +
    `<meta property="og:url" content="${u}">` +
    '<meta property="og:type" content="website">' +
    `<meta property="og:image" content="${esc(OG_IMAGE)}">` +
    '<meta property="og:image:width" content="1200">' +
    '<meta property="og:image:height" content="630">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:site" content="@awe_os">' +
    `<meta name="twitter:title" content="${t}">` +
    `<meta name="twitter:description" content="${d}">` +
    `<meta name="twitter:image" content="${esc(OG_IMAGE)}">` +
    `</head><body><p><a href="${u}">${t}</a></p></body></html>`
  );
}

// ── Full tool page prerender ──────────────────────────────────────────────────
function seoToolHtml({ title, description, url, toolName, toolDescription }) {
  const t    = esc(title);
  const d    = esc(description);
  const u    = esc(url);
  const name = esc(toolName);
  const desc = esc(toolDescription);

  const steps = [
    `Open ${name} on AWE-OS — no installation or sign-up required.`,
    'Enter your content or upload your file in the input area.',
    `Click the "${name}" button to process your request instantly.`,
    'Review the generated output and copy or download as needed.',
    'Create a free account to save results and access your history.',
  ];

  const faqs = [
    {
      q: `Is ${toolName} free to use?`,
      a: `Yes! ${toolName} is completely free for basic use. Create a free account to unlock unlimited access and save your history.`,
    },
    {
      q: 'Do I need to create an account?',
      a: 'Most tools work without an account. Sign up free to save results, access history, and unlock premium features.',
    },
    {
      q: 'Is my data safe?',
      a: 'Yes. We do not store your input data on our servers unless you are logged in and explicitly save your work. All processing happens in your browser.',
    },
    {
      q: `How accurate are the results from ${toolName}?`,
      a: `${toolName} uses state-of-the-art AI models and algorithms. Results are highly accurate but we recommend reviewing output before final use.`,
    },
    {
      q: `Can I use ${toolName} on mobile?`,
      a: 'Yes — all AWE-OS tools are fully responsive and work on any device including phones and tablets, without requiring an app download.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: toolName,
    url,
    description: toolDescription,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',  item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: toolName, item: url },
    ],
  };

  const extraMeta =
    `<script type="application/ld+json">${safeJson(faqSchema)}</script>\n  ` +
    `<script type="application/ld+json">${safeJson(appSchema)}</script>\n  ` +
    `<script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>`;

  const faqItems = faqs
    .map(({ q, a }) => `<div class="faq-item"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`)
    .join('\n  ');

  const stepsHtml = steps
    .map((s, i) => `<li><strong>${i + 1}.</strong> ${esc(s)}</li>`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
${headBlock({ title: t, description: d, url: u, canonical: u, extraMeta })}
<body>
  <nav>
    <a href="${esc(SITE_URL)}">Home</a> /
    <a href="${esc(SITE_URL)}/tools">Tools</a> /
    <span>${name}</span>
  </nav>

  <h1>${name}</h1>
  <p>${desc}</p>

  <div class="about">
    <h2>About ${name}</h2>
    <p>${name} is one of the most popular free tools available on AWE-OS. Designed for professionals, students, and everyday users, it makes ${desc.toLowerCase().replace(/\.$/, '')} easier than ever before.</p>
    <p>Unlike other online tools, ${name} is completely free with no hidden charges. You don&apos;t need to install any software or create an account to get started — simply open the tool and begin working immediately.</p>
    <p>Our AI-powered engine ensures fast, accurate results every time. Whether you&apos;re a first-time user or a power user, ${name} scales to meet your needs.</p>
  </div>

  <h2>How to Use ${name}</h2>
  <ol>
      ${stepsHtml}
  </ol>

  <h2>Frequently Asked Questions</h2>
  ${faqItems}

  ${FOOTER_HTML}
</body>
</html>`;
}

// ── Blog listing page prerender ───────────────────────────────────────────────
function blogListingHtml(posts, pageUrl) {
  const url = pageUrl || `${SITE_URL}/blog`;

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'AWE-OS Blog',
    url,
    description: 'Guides, tips, and tutorials on free online tools — PDF tools, AI tools, calculators, and more.',
    publisher: { '@type': 'Organization', name: 'AWE-OS', url: SITE_URL },
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/blog/${p.slug}`,
      name: p.title,
    })),
  };

  const extraMeta =
    `<script type="application/ld+json">${safeJson(webSiteSchema)}</script>\n  ` +
    `<script type="application/ld+json">${safeJson(itemListSchema)}</script>`;

  const articleCards = posts
    .map(p => `<div class="card">
      <div class="meta">${esc(p.category)} &nbsp;·&nbsp; ${esc(p.date)} &nbsp;·&nbsp; ${esc(p.readTime)}</div>
      <h2><a href="${esc(SITE_URL)}/blog/${esc(p.slug)}">${esc(p.title)}</a></h2>
      <p>${esc(p.excerpt)}</p>
      <a href="${esc(SITE_URL)}/blog/${esc(p.slug)}">Read article →</a>
    </div>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
${headBlock({
    title:       'AWE-OS Blog — Free Tools Guides, Tips & Tutorials',
    description: 'Guides and tutorials on PDF tools, AI tools, calculators, and online productivity tools. All free. No sign-up required.',
    url,
    canonical:   url,
    extraMeta,
  })}
<body>
  <nav>
    <a href="${SITE_URL}">Home</a> /
    <span>Blog</span>
  </nav>

  <h1>AWE-OS Blog</h1>
  <p>Guides, tips, and tutorials on free online tools — PDF tools, AI writing assistants, calculators, converters, and more.</p>

  ${articleCards}

  ${FOOTER_HTML}
</body>
</html>`;
}

// ── Individual blog post prerender ────────────────────────────────────────────
function blogPostHtml(post, pageUrl) {
  const url = pageUrl || `${SITE_URL}/blog/${post.slug}`;

  // Full ISO 8601 datetime required by Google Rich Results
  const toISO = (d) => (d && !d.includes('T') ? `${d}T00:00:00Z` : d);

  const ogImageObject = {
    '@type': 'ImageObject',
    url:     OG_IMAGE,
    width:   1200,
    height:  630,
  };

  const articleSchema = {
    '@context':    'https://schema.org',
    '@type':       'Article',
    headline:      post.title,
    description:   post.metaDescription,
    image:         ogImageObject,
    url,
    datePublished: toISO(post.date),
    dateModified:  toISO(post.date),
    author: {
      '@type': 'Person',
      name:    post.author,
      url:     `${SITE_URL}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name:    'AWE-OS',
      url:     SITE_URL,
      logo:    ogImageObject,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage:       'en-US',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const extraMeta =
    `<meta property="og:type" content="article">\n  ` +
    `<meta property="article:published_time" content="${esc(toISO(post.date))}">\n  ` +
    `<script type="application/ld+json">${safeJson(articleSchema)}</script>\n  ` +
    `<script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>`;

  // Render related tools as links
  const relatedHtml = (post.relatedTools || [])
    .map(t => `<li><a href="${esc(SITE_URL)}/tools/${esc(t.slug)}">${esc(t.label)}</a></li>`)
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
${headBlock({
    title:       post.metaTitle,
    description: post.metaDescription,
    url,
    canonical:   url,
    extraMeta,
  })}
<body>
  <nav>
    <a href="${SITE_URL}">Home</a> /
    <a href="${SITE_URL}/blog">Blog</a> /
    <span>${esc(post.title)}</span>
  </nav>

  <h1>${esc(post.title)}</h1>
  <p class="meta" style="font-size:13px;color:#9ca3af;margin-bottom:20px">
    ${esc(post.category)} &nbsp;·&nbsp; ${esc(post.date)} &nbsp;·&nbsp; ${esc(post.readTime)} &nbsp;·&nbsp; By ${esc(post.author)}
  </p>

  <p>${esc(post.excerpt)}</p>

  <p>${esc(post.metaDescription)}</p>

  ${relatedHtml ? `<h2>Related Tools</h2>\n  <ul>\n    ${relatedHtml}\n  </ul>` : ''}

  <p><a href="${esc(url)}">Read the full article on AWE-OS →</a></p>

  ${FOOTER_HTML}
</body>
</html>`;
}

// ── Static page full HTML (for search bots — replaces thin ogHtml) ───────────
function seoStaticHtml({ title, description, url, h1, bodyHtml }) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: h1 || title.split(' — ')[0], item: url },
    ],
  };
  const extraMeta = `<script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>`;

  return `<!DOCTYPE html>
<html lang="en">
${headBlock({ title, description, url, canonical: url, extraMeta })}
<body>
  <nav><a href="${SITE_URL}">Home</a> / <span>${esc(h1 || title.split(' — ')[0])}</span></nav>
  <h1>${esc(h1 || title.split(' — ')[0])}</h1>
  ${bodyHtml}
  ${FOOTER_HTML}
</body>
</html>`;
}

// ── Static page data ──────────────────────────────────────────────────────────
const STATIC_PAGES = {
  '/': {
    title:       'AWE-OS — Free AI-Powered Tools for Everyone',
    description: 'Discover 100+ free AI-powered tools — Resume Builder, PDF Tools, Calculators, Converters and more. Fast, free, and easy to use.',
    h1:          'Free AI-Powered Tools for Everyone',
    bodyHtml:    `<p>AWE-OS gives you instant access to 100+ free online tools — AI writing assistants, PDF utilities, calculators, converters, and more — all running in your browser with no software to install and no account required.</p>
  <h2>Featured Tool Categories</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/pdf">PDF Tools</a> — merge, split, compress, rotate, convert and secure PDF files</li>
    <li><a href="${SITE_URL}/tools/calculators">Calculators</a> — BMI, loan EMI, GPA, age, percentage and more</li>
    <li><a href="${SITE_URL}/tools/converters">Converters</a> — unit, text, file and image conversion</li>
    <li><a href="${SITE_URL}/tools/ai">AI Tools</a> — resume builder, content writer, and AI-powered utilities</li>
  </ul>
  <p>All tools are free to use. No subscription required. <a href="${SITE_URL}/tools">Browse all tools</a>.</p>`,
  },
  '/tools': {
    title:       'All Tools — AWE-OS Free Online Tools',
    description: 'Browse 100+ free tools on AWE-OS — PDF tools, calculators, converters, and AI tools. Fast, free, and easy to use.',
    h1:          'All Free Online Tools',
    bodyHtml:    `<p>AWE-OS offers 100+ free browser-based tools across four categories. No download, no sign-up, no cost.</p>
  <h2>PDF Tools</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/merge-pdf">Merge PDF</a> — combine multiple PDFs into one</li>
    <li><a href="${SITE_URL}/tools/split-pdf">Split PDF</a> — split into separate pages or ranges</li>
    <li><a href="${SITE_URL}/tools/compress-pdf">Compress PDF</a> — reduce file size without quality loss</li>
    <li><a href="${SITE_URL}/tools/jpg-to-pdf">JPG to PDF</a> — convert images to PDF</li>
    <li><a href="${SITE_URL}/tools/word-to-pdf">Word to PDF</a> — convert DOCX to PDF</li>
  </ul>
  <h2>Calculators</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/bmi-calculator">BMI Calculator</a></li>
    <li><a href="${SITE_URL}/tools/loan-calculator">Loan EMI Calculator</a></li>
    <li><a href="${SITE_URL}/tools/gpa-calculator">GPA Calculator</a></li>
    <li><a href="${SITE_URL}/tools/percentage-calculator">Percentage Calculator</a></li>
  </ul>
  <h2>Converters & Utilities</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/unit-converter">Unit Converter</a></li>
    <li><a href="${SITE_URL}/tools/qr-code-generator">QR Code Generator</a></li>
    <li><a href="${SITE_URL}/tools/password-generator">Password Generator</a></li>
    <li><a href="${SITE_URL}/tools/image-compressor">Image Compressor</a></li>
    <li><a href="${SITE_URL}/tools/word-counter">Word Counter</a></li>
  </ul>
  <h2>AI Tools</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/resume-builder">AI Resume Builder</a></li>
    <li><a href="${SITE_URL}/tools/ai-content-writer">AI Content Writer</a></li>
  </ul>`,
  },
  '/about': {
    title:       'About AWE-OS — Free AI-Powered Tools for Everyone',
    description: 'Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone.',
    h1:          'About AWE-OS',
    bodyHtml:    `<p>AWE-OS is a free online platform that provides 100+ AI-powered tools for professionals, students, and everyday users. Our mission is simple: make powerful digital tools free and accessible to everyone, with no subscription, no watermarks, and no sign-up required for basic use.</p>
  <h2>What We Offer</h2>
  <p>From PDF utilities to AI writing assistants, calculators to converters — AWE-OS covers the tools people need most. All tools run in your browser, which means your files and data stay on your device.</p>
  <h2>Why AWE-OS?</h2>
  <ul>
    <li>100% free for basic use — no credit card required</li>
    <li>Browser-based — no software to install or update</li>
    <li>Privacy-first — files are processed locally, not uploaded to servers</li>
    <li>Mobile-friendly — works on any device</li>
    <li>No annoying watermarks on outputs</li>
  </ul>
  <p><a href="${SITE_URL}/tools">Browse all free tools</a> or <a href="${SITE_URL}/contact">contact us</a> with any questions.</p>`,
  },
  '/contact': {
    title:       'Contact AWE-OS — Get in Touch',
    description: 'Get in touch with the AWE-OS team. We respond within 24 hours on weekdays.',
    h1:          'Contact Us',
    bodyHtml:    `<p>Have a question, feedback, or a tool request? We would love to hear from you. The AWE-OS team responds to all messages within 24 hours on weekdays.</p>
  <h2>How to Reach Us</h2>
  <ul>
    <li>Use the contact form on this page</li>
    <li>For tool issues, describe the tool name and what went wrong</li>
    <li>For business enquiries including partnerships and advertising, mention this in your message</li>
  </ul>
  <p>We are a small team building tools that help people work smarter. Every piece of feedback genuinely helps us improve.</p>`,
  },
  '/pricing': {
    title:       'Pricing — AWE-OS Pro',
    description: 'Simple, transparent pricing. Start free, upgrade to Pro for AI tools, unlimited history, and priority support.',
    h1:          'AWE-OS Pricing',
    bodyHtml:    `<p>AWE-OS is free for the vast majority of users. A Pro plan is available for power users who need unlimited AI tool access, saved history, and priority support.</p>
  <h2>Free Plan</h2>
  <ul>
    <li>Access to all PDF tools — unlimited</li>
    <li>All calculators and converters — unlimited</li>
    <li>AI tools — limited daily usage</li>
    <li>No account required for most tools</li>
  </ul>
  <h2>Pro Plan</h2>
  <ul>
    <li>Unlimited AI tool usage</li>
    <li>Save and access your tool history</li>
    <li>Priority customer support</li>
    <li>Early access to new tools</li>
  </ul>
  <p><a href="${SITE_URL}/tools">Start using free tools</a> — no credit card required.</p>`,
  },
  '/privacy-policy': {
    title:       'Privacy Policy — AWE-OS',
    description: 'AWE-OS Privacy Policy — how we collect, use, and protect your data. GDPR compliant.',
    h1:          'Privacy Policy',
    bodyHtml:    `<p>Your privacy matters to us. AWE-OS is designed to process as much as possible in your browser, without sending your files or data to our servers.</p>
  <h2>What Data We Collect</h2>
  <ul>
    <li>Usage analytics (page views, tool usage counts) via Google Analytics — anonymised</li>
    <li>Account information if you choose to create a free account (email address)</li>
    <li>No files you process with our tools are stored on our servers unless you explicitly save them</li>
  </ul>
  <h2>How We Use Your Data</h2>
  <p>Analytics data is used to understand which tools are most useful so we can improve them. We do not sell your data to third parties. We do not use your data for advertising profiling.</p>
  <p>For the full legal text, visit <a href="${SITE_URL}/privacy-policy">awe-os.com/privacy-policy</a>.</p>`,
  },
  '/privacy': {
    title:       'Privacy Policy — AWE-OS',
    description: 'AWE-OS Privacy Policy — how we collect, use, and protect your data. GDPR compliant.',
    h1:          'Privacy Policy',
    bodyHtml:    `<p>Your privacy matters to us. AWE-OS processes files in your browser without sending them to our servers. For the full privacy policy, see <a href="${SITE_URL}/privacy-policy">awe-os.com/privacy-policy</a>.</p>`,
  },
  '/terms': {
    title:       'Terms of Service — AWE-OS',
    description: 'AWE-OS Terms of Service — rules for using our platform, your rights, and our responsibilities.',
    h1:          'Terms of Service',
    bodyHtml:    `<p>By using AWE-OS you agree to these terms. AWE-OS tools are provided free of charge for personal and commercial use. We make no warranty about the accuracy of AI-generated outputs — always review results before use in professional contexts.</p>
  <h2>Acceptable Use</h2>
  <ul>
    <li>Do not use AWE-OS tools for illegal purposes</li>
    <li>Do not attempt to reverse-engineer or scrape our platform</li>
    <li>Do not upload files containing malware or harmful content</li>
  </ul>
  <p>AWE-OS reserves the right to suspend access to users who violate these terms.</p>`,
  },
  '/disclaimer': {
    title:       'Disclaimer — AWE-OS',
    description: 'AWE-OS Disclaimer — important information about tool accuracy, AI limitations, and the absence of professional advice.',
    h1:          'Disclaimer',
    bodyHtml:    `<p>AWE-OS tools are provided for informational and productivity purposes only. They do not constitute professional advice of any kind.</p>
  <h2>AI Tool Accuracy</h2>
  <p>AI-generated content may contain errors, inaccuracies, or outdated information. Always review AI output before using it in a professional, medical, legal, or financial context. AWE-OS is not liable for decisions made based on tool outputs.</p>
  <h2>PDF and File Tools</h2>
  <p>File processing tools operate in your browser. While we test our tools thoroughly, we recommend keeping a backup of any important file before processing it.</p>`,
  },
};

// ── Category page data ────────────────────────────────────────────────────────
const CATEGORIES = {
  pdf: {
    title:       'Free PDF Tools Online — Merge, Split, Compress & Convert | AWE-OS',
    description: 'Powerful free PDF tools: merge, split, compress, rotate, convert and secure PDFs without any software install. 100% browser-based.',
    h1:          'Free PDF Tools',
    bodyHtml:    `<p>AWE-OS provides 18+ free PDF tools that run entirely in your browser. No software to install, no files uploaded to a server, no registration required.</p>
  <h2>Organise PDF</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/merge-pdf">Merge PDF</a> — combine multiple PDFs into one document</li>
    <li><a href="${SITE_URL}/tools/split-pdf">Split PDF</a> — split into separate pages or ranges</li>
    <li><a href="${SITE_URL}/tools/remove-pages-pdf">Remove Pages</a> — delete unwanted pages</li>
    <li><a href="${SITE_URL}/tools/extract-pages-pdf">Extract Pages</a> — pull specific pages into a new PDF</li>
    <li><a href="${SITE_URL}/tools/organize-pdf">Organize PDF</a> — drag to reorder pages</li>
  </ul>
  <h2>Optimise PDF</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/compress-pdf">Compress PDF</a> — reduce file size without quality loss</li>
  </ul>
  <h2>Convert to PDF</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/jpg-to-pdf">JPG to PDF</a> — images to PDF</li>
    <li><a href="${SITE_URL}/tools/word-to-pdf">Word to PDF</a> — DOCX to PDF</li>
    <li><a href="${SITE_URL}/tools/excel-to-pdf">Excel to PDF</a> — spreadsheets to PDF</li>
    <li><a href="${SITE_URL}/tools/powerpoint-to-pdf">PowerPoint to PDF</a> — presentations to PDF</li>
  </ul>
  <h2>Convert from PDF</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/pdf-to-jpg">PDF to JPG</a></li>
    <li><a href="${SITE_URL}/tools/pdf-to-word">PDF to Word</a></li>
    <li><a href="${SITE_URL}/tools/pdf-to-excel">PDF to Excel</a></li>
  </ul>
  <h2>Edit & Secure PDF</h2>
  <ul>
    <li><a href="${SITE_URL}/tools/rotate-pdf">Rotate PDF</a></li>
    <li><a href="${SITE_URL}/tools/watermark-pdf">Add Watermark</a></li>
    <li><a href="${SITE_URL}/tools/protect-pdf">Protect PDF</a> — add password</li>
    <li><a href="${SITE_URL}/tools/unlock-pdf">Unlock PDF</a> — remove password</li>
  </ul>`,
  },
  calculators: {
    title:       'Free Online Calculators — BMI, Loan EMI, GPA & More | AWE-OS',
    description: 'Accurate free calculators for health, finance, and education. All calculations happen in your browser — instant, private, and free.',
    h1:          'Free Online Calculators',
    bodyHtml:    `<p>AWE-OS calculators are free, instant, and browser-based — no download, no sign-up, no cost.</p>
  <ul>
    <li><a href="${SITE_URL}/tools/bmi-calculator">BMI Calculator</a> — body mass index in metric or imperial</li>
    <li><a href="${SITE_URL}/tools/age-calculator">Age Calculator</a> — exact age in years, months, and days</li>
    <li><a href="${SITE_URL}/tools/loan-calculator">Loan EMI Calculator</a> — monthly payments and amortisation</li>
    <li><a href="${SITE_URL}/tools/percentage-calculator">Percentage Calculator</a> — three calculation modes</li>
    <li><a href="${SITE_URL}/tools/gpa-calculator">GPA Calculator</a> — weighted GPA on 4.0 scale</li>
    <li><a href="${SITE_URL}/tools/compound-interest-calculator">Compound Interest Calculator</a> — investment growth</li>
  </ul>`,
  },
  converters: {
    title:       'Free Online Converters — Unit, File, Text & Image | AWE-OS',
    description: 'Convert units, files, text, and formats instantly. Browser-based, fast, free, and completely private.',
    h1:          'Free Online Converters',
    bodyHtml:    `<p>Convert anything instantly — units, files, text, and images — with AWE-OS free converters.</p>
  <ul>
    <li><a href="${SITE_URL}/tools/unit-converter">Unit Converter</a> — length, weight, temperature, speed, volume</li>
    <li><a href="${SITE_URL}/tools/word-counter">Word Counter</a> — words, characters, reading time</li>
    <li><a href="${SITE_URL}/tools/csv-to-json">CSV to JSON</a> — convert spreadsheet data to JSON</li>
    <li><a href="${SITE_URL}/tools/color-picker">Color Picker</a> — HEX, RGB, HSL conversion</li>
    <li><a href="${SITE_URL}/tools/image-compressor">Image Compressor</a> — reduce JPG, PNG, WEBP sizes</li>
  </ul>`,
  },
  ai: {
    title:       'Free AI-Powered Tools — Resume Builder, Content Writer & More | AWE-OS',
    description: 'AI-powered productivity tools for writing, resumes, and content creation. Powered by state-of-the-art AI models.',
    h1:          'Free AI Tools',
    bodyHtml:    `<p>AWE-OS AI tools help you write faster, create better resumes, and automate repetitive tasks — all free.</p>
  <ul>
    <li><a href="${SITE_URL}/tools/resume-builder">AI Resume Builder</a> — ATS-optimised resumes in minutes</li>
    <li><a href="${SITE_URL}/tools/ai-content-writer">AI Content Writer</a> — blog posts, captions, and ad copy</li>
  </ul>`,
  },
};

// ── Tool metadata ─────────────────────────────────────────────────────────────
const TOOLS = {
  'merge-pdf':                   { title: 'Merge PDF — Combine PDF Files Free Online | AWE-OS',                description: 'Combine multiple PDF files into one document instantly in your browser. Drag to reorder, no upload, no registration.' },
  'split-pdf':                   { title: 'Split PDF — Split PDF into Multiple Files Free | AWE-OS',            description: 'Split a PDF into separate pages or custom page ranges instantly in your browser. No server upload needed.' },
  'remove-pages-pdf':            { title: 'Remove PDF Pages — Delete Pages from PDF Free | AWE-OS',             description: 'Remove unwanted pages from any PDF file. Free, browser-based PDF page remover. No files uploaded to any server.' },
  'extract-pages-pdf':           { title: 'Extract PDF Pages — Pull Pages from PDF Free | AWE-OS',              description: 'Extract specific pages from any PDF into a new file. 100% browser-based, no server upload required.' },
  'organize-pdf':                { title: 'Organize PDF — Rearrange PDF Pages Free Online | AWE-OS',            description: 'Reorder and organize PDF pages. Drag and drop to rearrange, delete unwanted pages. Free, browser-based.' },
  'compress-pdf':                { title: 'Compress PDF — Reduce PDF File Size Free Online | AWE-OS',           description: 'Reduce the size of your PDF without losing quality. 100% free, browser-based PDF compressor. No registration needed.' },
  'pdf-compressor':              { title: 'PDF Compressor — Compress PDF Free Online | AWE-OS',                 description: 'Compress PDF files online for free. Reduce PDF file size without losing quality. Fast, browser-based, no registration needed.' },
  'jpg-to-pdf':                  { title: 'JPG to PDF — Convert Images to PDF Free Online | AWE-OS',            description: 'Convert JPG, PNG, and WEBP images to PDF for free. Fast, browser-based image to PDF converter. No sign-up required.' },
  'word-to-pdf':                 { title: 'Word to PDF — Convert DOCX to PDF Free Online | AWE-OS',             description: 'Convert Word documents to PDF online for free. Preserve all formatting, fonts, and layout. No software needed.' },
  'excel-to-pdf':                { title: 'Excel to PDF — Convert Excel Spreadsheets to PDF Free | AWE-OS',     description: 'Convert Excel spreadsheets to PDF free online. Preserve tables, charts, and formatting. No registration needed.' },
  'powerpoint-to-pdf':           { title: 'PowerPoint to PDF — Convert PPTX to PDF Free | AWE-OS',              description: 'Convert PowerPoint presentations to PDF free online. Preserve slides and design. No registration required.' },
  'pdf-to-jpg':                  { title: 'PDF to JPG — Convert PDF Pages to Images Free | AWE-OS',             description: 'Convert PDF pages to JPG images instantly. Free browser-based PDF to image converter. No upload required.' },
  'pdf-to-word':                 { title: 'PDF to Word — Convert PDF to Editable DOCX Free | AWE-OS',           description: 'Convert PDF to Word document free online. Get an editable DOCX from any PDF. No sign-up required.' },
  'pdf-to-excel':                { title: 'PDF to Excel — Extract PDF Tables to Excel Free | AWE-OS',           description: 'Convert PDF tables to Excel spreadsheets free. Extract data from PDF to XLSX format online.' },
  'rotate-pdf':                  { title: 'Rotate PDF — Rotate PDF Pages Free Online | AWE-OS',                 description: 'Rotate PDF pages 90° or 180°. Fix orientation of PDF documents. 100% free, browser-based PDF rotator.' },
  'watermark-pdf':               { title: 'Add Watermark to PDF — Free PDF Watermark Tool | AWE-OS',            description: 'Add text watermarks to PDF pages for free. Protect and brand your documents. Browser-based, no upload.' },
  'page-numbers-pdf':            { title: 'Add Page Numbers to PDF — Free Online Tool | AWE-OS',                description: 'Add automatic page numbers to PDF documents free. Choose position, style, and starting number.' },
  'protect-pdf':                 { title: 'Protect PDF — Add Password to PDF Free Online | AWE-OS',             description: 'Add password protection to any PDF file. Secure your documents with encryption. Free, browser-based.' },
  'unlock-pdf':                  { title: 'Unlock PDF — Remove PDF Password Free Online | AWE-OS',              description: 'Remove password from protected PDF files. Unlock PDF documents free online. No software needed.' },
  'roi-calculator':              { title: 'ROI Calculator — Calculate Return on Investment Free | AWE-OS',       description: 'Free online ROI calculator. Calculate return on investment, annualized ROI (CAGR), and compare up to 3 scenarios with charts. Browser-based, instant.' },
  'tax-calculator':              { title: 'Tax Calculator — India & US Income Tax Calculator Free | AWE-OS',     description: 'Calculate income tax for India (Old/New Regime, FY 2024-25) and USA (2024 Federal). Slab-wise breakdown, effective rate, TDS, and regime comparison.' },
  'bmi-calculator':              { title: 'BMI Calculator — Body Mass Index Calculator Free | AWE-OS',          description: 'Calculate your BMI instantly. Supports metric (cm/kg) and imperial (ft/lb) units with visual scale.' },
  'age-calculator':              { title: 'Age Calculator — Calculate Exact Age Free Online | AWE-OS',          description: 'Calculate exact age in years, months, and days from any date of birth. Free, instant age calculator.' },
  'loan-calculator':             { title: 'Loan EMI Calculator — Monthly Payment Calculator Free | AWE-OS',     description: 'Calculate monthly EMI for any loan. Get a complete amortization schedule. Free, instant loan calculator.' },
  'percentage-calculator':       { title: 'Percentage Calculator — Calculate Percent Free Online | AWE-OS',     description: 'Calculate any percentage instantly. Percentage of total, percentage change, increase and decrease.' },
  'gpa-calculator':              { title: 'GPA Calculator — Calculate Grade Point Average Free | AWE-OS',       description: 'Calculate your GPA from course grades and credit hours. Supports weighted and unweighted GPA.' },
  'compound-interest-calculator':{ title: 'Compound Interest Calculator — Free Online | AWE-OS',                description: 'Calculate compound interest and investment growth over time. See year-by-year breakdown.' },
  'unit-converter':              { title: 'Unit Converter — Convert Length, Weight, Temperature Free | AWE-OS', description: 'Convert between all units of measurement. Length, weight, temperature, speed, volume, and more.' },
  'word-counter':                { title: 'Word Counter — Count Words & Characters Free Online | AWE-OS',       description: 'Count words, characters, sentences, and estimate reading time instantly. Free online word counter.' },
  'password-generator':          { title: 'Password Generator — Generate Strong Passwords Free | AWE-OS',       description: 'Generate strong, secure, random passwords. Customize length, character sets, and complexity.' },
  'color-picker':                { title: 'Color Picker — HEX, RGB & HSL Color Converter Free | AWE-OS',        description: 'Pick and convert colors between HEX, RGB, and HSL formats. Free online color picker tool.' },
  'qr-code-generator':           { title: 'QR Code Generator — Create QR Codes Free Online | AWE-OS',          description: 'Generate QR codes for URLs, text, WiFi, contacts, and more. Download as PNG. 100% free.' },
  'image-compressor':            { title: 'Image Compressor — Compress JPG & PNG Free Online | AWE-OS',         description: 'Compress images without losing quality. Reduce JPG, PNG, WEBP file sizes instantly in your browser.' },
  'csv-to-json':                 { title: 'CSV to JSON Converter — Convert CSV Files Free Online | AWE-OS',     description: 'Convert CSV files to JSON format instantly in your browser. Free CSV to JSON converter.' },
  'resume-builder':              { title: 'AI Resume Builder — Create Professional Resume Free | AWE-OS',       description: 'Build a professional, ATS-friendly resume with AI. Multiple templates, instant download. Free.' },
  'ai-content-writer':           { title: 'AI Content Writer — Generate Blog Posts & Copy Free | AWE-OS',       description: 'Write blog posts, social media captions, and ad copy with AI. GPT-powered content writer. Free.' },
};

// ── Blog post metadata (mirrors src/data/blogPosts.js — keep in sync) ────────
const BLOG_POSTS = [
  {
    slug:            'best-free-ai-tools-for-students-2025',
    title:           'Best Free AI Tools for Students in 2025',
    date:            '2025-04-18',
    category:        'AI Tools',
    author:          'AWE-OS Team',
    readTime:        '7 min read',
    excerpt:         'From writing assistants to resume builders, discover the top free AI tools that are helping students work smarter, study faster, and land better jobs in 2025.',
    metaTitle:       'Best Free AI Tools for Students in 2025 | AWE-OS',
    metaDescription: 'Discover the best free AI tools for students in 2025 — writing assistants, resume builders, calculators and more. No subscription required.',
    relatedTools:    [
      { label: 'AI Resume Builder', slug: 'resume-builder' },
      { label: 'AI Content Writer', slug: 'ai-content-writer' },
      { label: 'Word Counter',      slug: 'word-counter' },
    ],
  },
  {
    slug:            'how-to-compress-pdf-without-losing-quality',
    title:           'How to Compress PDF Without Losing Quality',
    date:            '2025-04-25',
    category:        'PDF Tools',
    author:          'AWE-OS Team',
    readTime:        '5 min read',
    excerpt:         'Large PDFs cause upload failures, slow email delivery, and rejected submissions. Learn exactly how PDF compression works and how to reduce file size without degrading your document.',
    metaTitle:       'How to Compress PDF Without Losing Quality | AWE-OS',
    metaDescription: 'Step-by-step guide to compressing PDFs without quality loss. Learn what browser-based compression removes and how to get the smallest file while keeping text and images sharp.',
    relatedTools:    [
      { label: 'Compress PDF', slug: 'compress-pdf' },
      { label: 'Merge PDF',    slug: 'merge-pdf' },
      { label: 'Protect PDF',  slug: 'protect-pdf' },
    ],
  },
  {
    slug:            'qr-code-marketing-guide-small-business',
    title:           'Complete QR Code Marketing Guide for Small Business',
    date:            '2025-05-02',
    category:        'Marketing',
    author:          'AWE-OS Team',
    readTime:        '8 min read',
    excerpt:         'QR codes bridge the gap between physical and digital marketing for virtually zero cost. This complete guide covers where to use them, how to design them, and how to measure results.',
    metaTitle:       'QR Code Marketing Guide for Small Business 2025 | AWE-OS',
    metaDescription: 'Complete guide to QR code marketing for small businesses. Learn where to place QR codes, design best practices, and how to create them free with AWE-OS.',
    relatedTools:    [
      { label: 'QR Code Generator', slug: 'qr-code-generator' },
      { label: 'Image Compressor',  slug: 'image-compressor' },
      { label: 'AI Content Writer', slug: 'ai-content-writer' },
    ],
  },
  {
    slug:            'resume-tips-beat-ats-systems-2025',
    title:           'Resume Tips That Beat ATS Systems in 2025',
    date:            '2025-05-07',
    category:        'Career',
    author:          'AWE-OS Team',
    readTime:        '6 min read',
    excerpt:         'Up to 75% of resumes are rejected by Applicant Tracking Systems before a human ever reads them. Here is exactly what to do — and what to avoid — to get through.',
    metaTitle:       'Resume Tips to Beat ATS Systems in 2025 | AWE-OS',
    metaDescription: 'Learn how ATS resume screening works and the exact formatting, keyword, and structure tips that get your resume past automated filters and in front of hiring managers.',
    relatedTools:    [
      { label: 'AI Resume Builder', slug: 'resume-builder' },
      { label: 'Word to PDF',       slug: 'word-to-pdf' },
      { label: 'Word Counter',      slug: 'word-counter' },
    ],
  },
  {
    slug:            'top-10-free-online-calculators-for-students',
    title:           'Top 10 Free Online Calculators Every Student Needs',
    date:            '2025-05-10',
    category:        'Calculators',
    author:          'AWE-OS Team',
    readTime:        '5 min read',
    excerpt:         'From GPA planning to loan repayment, these ten free online calculators solve the most common maths problems students face — no app download, no sign-up required.',
    metaTitle:       'Top 10 Free Online Calculators for Students 2025 | AWE-OS',
    metaDescription: 'The 10 best free online calculators for students in 2025 — GPA, BMI, loan, age, percentage, unit converter and more. All free, no sign-up, browser-based.',
    relatedTools:    [
      { label: 'GPA Calculator',        slug: 'gpa-calculator' },
      { label: 'BMI Calculator',         slug: 'bmi-calculator' },
      { label: 'Loan Calculator',        slug: 'loan-calculator' },
      { label: 'Percentage Calculator',  slug: 'percentage-calculator' },
    ],
  },
  {
    slug:            'how-to-convert-word-to-pdf-free',
    title:           'How to Convert Word to PDF for Free',
    date:            '2025-05-13',
    category:        'PDF Tools',
    author:          'AWE-OS Team',
    readTime:        '5 min read',
    excerpt:         'Word documents look different on every computer. PDF preserves your formatting exactly. Here is how to convert .docx files to PDF for free — no Microsoft Office required.',
    metaTitle:       'How to Convert Word to PDF for Free Online | AWE-OS',
    metaDescription: 'Free online Word to PDF converter — no sign-up, no watermarks, no file size limit. Convert .docx to PDF in seconds with AWE-OS. Works without Microsoft Office.',
    relatedTools:    [
      { label: 'Word to PDF',  slug: 'word-to-pdf' },
      { label: 'PDF to Word',  slug: 'pdf-to-word' },
      { label: 'Compress PDF', slug: 'compress-pdf' },
    ],
  },
  {
    slug:            'how-to-build-resume-no-experience-2025',
    title:           'How to Build a Resume with No Experience in 2025',
    date:            '2025-05-16',
    category:        'Career',
    author:          'AWE-OS Team',
    readTime:        '8 min read',
    excerpt:         'No work history? No problem. Learn exactly how to build a resume from scratch in 2025 — even if you have zero professional experience — and land your first job or internship.',
    metaTitle:       'How to Build a Resume with No Experience in 2025 | AWE-OS',
    metaDescription: 'Step-by-step guide to writing a resume with no work experience. Learn what to include, how to format it, and use our free AI resume builder to create yours in minutes.',
    relatedTools:    [
      { label: 'AI Resume Builder', slug: 'resume-builder' },
      { label: 'Word to PDF',       slug: 'word-to-pdf' },
      { label: 'Word Counter',      slug: 'word-counter' },
    ],
  },
  {
    slug:            'best-free-pdf-tools-for-students',
    title:           'Best Free PDF Tools for Students in 2025',
    date:            '2025-05-17',
    category:        'PDF Tools',
    author:          'AWE-OS Team',
    readTime:        '6 min read',
    excerpt:         'Students deal with PDFs constantly — lecture notes, assignments, research papers. Here are the best free PDF tools that handle every task without subscriptions or watermarks.',
    metaTitle:       'Best Free PDF Tools for Students 2025 | AWE-OS',
    metaDescription: 'The best free PDF tools for students — merge, compress, convert, split and more. No sign-up, no watermarks. Everything you need for academic PDFs in one place.',
    relatedTools:    [
      { label: 'Merge PDF',    slug: 'merge-pdf' },
      { label: 'Compress PDF', slug: 'compress-pdf' },
      { label: 'PDF to Word',  slug: 'pdf-to-word' },
    ],
  },
  {
    slug:            'ai-writing-tools-comparison-2025',
    title:           'AI Writing Tools Comparison 2025: Which One Should You Use?',
    date:            '2025-05-18',
    category:        'AI Tools',
    author:          'AWE-OS Team',
    readTime:        '7 min read',
    excerpt:         'AI writing tools promise to save time, improve quality, and beat writer\'s block. But which one is actually worth using in 2025? We break down the real differences so you can choose.',
    metaTitle:       'AI Writing Tools Comparison 2025: Best Free Options | AWE-OS',
    metaDescription: 'Compare the best AI writing tools of 2025 — features, free tiers, and use cases. Find out which AI writer suits your needs without paying for a subscription.',
    relatedTools:    [
      { label: 'AI Content Writer', slug: 'ai-content-writer' },
      { label: 'Word Counter',      slug: 'word-counter' },
      { label: 'AI Resume Builder', slug: 'resume-builder' },
    ],
  },
  {
    slug:            'free-calculator-tools-for-students',
    title:           'Free Calculator Tools Every Student Needs in 2025',
    date:            '2025-05-19',
    category:        'Calculators',
    author:          'AWE-OS Team',
    readTime:        '6 min read',
    excerpt:         'From tracking your GPA to calculating loan repayments before graduation, the right calculator tools make student life significantly easier. Here are the ones you actually need.',
    metaTitle:       'Free Calculator Tools for Students 2025 | AWE-OS',
    metaDescription: 'Free online calculator tools every student needs — GPA, BMI, loan, percentage, age calculator and more. No download, no sign-up, works instantly in browser.',
    relatedTools:    [
      { label: 'GPA Calculator',       slug: 'gpa-calculator' },
      { label: 'BMI Calculator',        slug: 'bmi-calculator' },
      { label: 'Percentage Calculator', slug: 'percentage-calculator' },
    ],
  },
  {
    slug:            'word-to-pdf-complete-guide-2025',
    title:           'Word to PDF: The Complete Guide for 2025',
    date:            '2025-05-20',
    category:        'PDF Tools',
    author:          'AWE-OS Team',
    readTime:        '7 min read',
    excerpt:         'Converting Word to PDF seems simple — until the formatting breaks. This complete guide covers every method, explains why conversions go wrong, and shows you the fastest fix.',
    metaTitle:       'Word to PDF Complete Guide 2025 — Every Method Explained | AWE-OS',
    metaDescription: 'Complete guide to converting Word documents to PDF in 2025. Compare all methods, learn why formatting breaks, and convert .docx to PDF free in your browser.',
    relatedTools:    [
      { label: 'Word to PDF',  slug: 'word-to-pdf' },
      { label: 'PDF to Word',  slug: 'pdf-to-word' },
      { label: 'Compress PDF', slug: 'compress-pdf' },
    ],
  },
  {
    slug:            'image-compression-guide-2025',
    title:           'Image Compression Guide 2025: Reduce File Size Without Losing Quality',
    date:            '2025-05-21',
    category:        'Converters',
    author:          'AWE-OS Team',
    readTime:        '6 min read',
    excerpt:         'Oversized images slow down websites, fail upload limits, and drain mobile data. This guide explains how image compression works and how to shrink any image without visible quality loss.',
    metaTitle:       'Image Compression Guide 2025: Reduce Size Without Quality Loss | AWE-OS',
    metaDescription: 'Learn how to compress images without losing quality in 2025. Understand lossy vs lossless compression and use our free image compressor tool to reduce file sizes instantly.',
    relatedTools:    [
      { label: 'Image Compressor', slug: 'image-compressor' },
      { label: 'JPG to PDF',       slug: 'jpg-to-pdf' },
      { label: 'Compress PDF',     slug: 'compress-pdf' },
    ],
  },
];

// ── Main middleware ────────────────────────────────────────────────────────────
export default function middleware(req) {
  const ua = req.headers.get('user-agent') || '';

  const isSearchBot = SEARCH_BOT_UA.test(ua);
  const isSocialBot = !isSearchBot && SOCIAL_BOT_UA.test(ua);

  // Regular user — pass through to SPA
  if (!isSearchBot && !isSocialBot) return;

  const pathname = (req.nextUrl ?? new URL(req.url)).pathname;

  // ── /blog — blog listing ───────────────────────────────────────────────────
  if (pathname === '/blog') {
    const pageUrl = `${SITE_URL}${pathname}`;
    if (isSearchBot) {
      return new Response(blogListingHtml(BLOG_POSTS, pageUrl), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'index, follow' },
      });
    }
    return new Response(
      ogHtml('AWE-OS Blog — Free Tools Guides, Tips & Tutorials', 'Guides and tutorials on PDF tools, AI tools, calculators, and online productivity tools. All free.', pageUrl),
      { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' } },
    );
  }

  // ── /blog/:slug — individual blog post ────────────────────────────────────
  const blogMatch = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blogMatch) {
    const postSlug = blogMatch[1];
    const post     = BLOG_POSTS.find(p => p.slug === postSlug);
    const pageUrl  = `${SITE_URL}${pathname}`;

    if (isSearchBot) {
      if (post) {
        return new Response(blogPostHtml(post, pageUrl), {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'index, follow' },
        });
      }
      // Unknown slug — generic fallback
      const fallbackTitle = slugToName(postSlug);
      return new Response(
        seoStaticHtml({
          title:       `${fallbackTitle} — AWE-OS Blog`,
          description: `Read about ${fallbackTitle.toLowerCase()} on the AWE-OS blog. Free tools guides, tips, and tutorials.`,
          url:         pageUrl,
          h1:          fallbackTitle,
          bodyHtml:    `<p>Read the full article on <a href="${esc(pageUrl)}">${esc(pageUrl)}</a>.</p>`,
        }),
        { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
      );
    }
    // Social bot
    const p = post || { metaTitle: `${slugToName(postSlug)} | AWE-OS Blog`, metaDescription: `Read about ${postSlug.replace(/-/g, ' ')} on the AWE-OS blog.` };
    return new Response(ogHtml(p.metaTitle, p.metaDescription, pageUrl), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }

  // ── Static pages ───────────────────────────────────────────────────────────
  if (STATIC_PAGES[pathname]) {
    const page    = STATIC_PAGES[pathname];
    const pageUrl = `${SITE_URL}${pathname}`;
    if (isSearchBot) {
      return new Response(
        seoStaticHtml({ title: page.title, description: page.description, url: pageUrl, h1: page.h1, bodyHtml: page.bodyHtml }),
        { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'index, follow' } },
      );
    }
    return new Response(ogHtml(page.title, page.description, pageUrl), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }

  // ── Category pages: /tools/pdf, /tools/calculators, etc. ─────────────────
  const catMatch = pathname.match(/^\/tools\/(pdf|calculators|converters|ai)$/);
  if (catMatch) {
    const cat     = CATEGORIES[catMatch[1]];
    const pageUrl = `${SITE_URL}${pathname}`;
    if (cat) {
      if (isSearchBot) {
        return new Response(
          seoStaticHtml({ title: cat.title, description: cat.description, url: pageUrl, h1: cat.h1, bodyHtml: cat.bodyHtml }),
          { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'index, follow' } },
        );
      }
      return new Response(ogHtml(cat.title, cat.description, pageUrl), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }
  }

  // ── Tool pages: /tools/<slug> — matches ALL slugs, known or unknown ───────
  const toolMatch = pathname.match(/^\/tools\/([a-z0-9-]+)$/);
  if (toolMatch) {
    const slug    = toolMatch[1];
    const meta    = TOOLS[slug];
    const pageUrl = `${SITE_URL}${pathname}`;
    const toolName = slugToName(slug);
    const toolTitle       = meta?.title       || `${toolName} — Free Online Tool | AWE-OS`;
    const toolDescription = meta?.description || `Free online ${toolName.toLowerCase()} tool. Fast, easy, and completely free to use. No sign-up required.`;

    if (isSearchBot) {
      return new Response(
        seoToolHtml({ title: toolTitle, description: toolDescription, url: pageUrl, toolName, toolDescription }),
        {
          headers: {
            'content-type':  'text/html; charset=utf-8',
            'cache-control': 'public, max-age=3600',
            'x-robots-tag':  'index, follow',
          },
        },
      );
    }
    return new Response(ogHtml(toolTitle, toolDescription, pageUrl), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }
}

export const config = {
  matcher: [
    '/',
    '/blog',
    '/blog/:path*',
    '/tools',
    '/tools/:path*',
    '/about',
    '/contact',
    '/privacy-policy',
    '/privacy',
    '/terms',
    '/disclaimer',
    '/pricing',
    '/category/:path*',
  ],
};
