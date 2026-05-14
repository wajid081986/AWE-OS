/**
 * Vercel Edge Middleware — Bot-aware prerendering.
 *
 * Two rendering modes:
 *   1. Social media bots (Twitter, Facebook, etc.) — lightweight OG-only HTML
 *   2. Search engine crawlers (Googlebot, Bingbot, etc.) — full pre-rendered page
 *      with About, How-to-use, FAQ, and JSON-LD structured data, so all SEO
 *      content is visible in page source without executing JavaScript.
 *
 * Regular users pass through unchanged — zero performance impact on real UX.
 * Runs on Vercel Edge Runtime (Web APIs only, no Node.js modules).
 */

// Social-media bots: need OG meta tags only
const SOCIAL_BOT_UA = /Twitterbot|facebookexternalhit|Slackbot-LinkExpanding|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Pinterest|Googlebot-Image|applebot|Iframely/i;

// Search engine crawlers: need full pre-rendered HTML with body content
const SEARCH_BOT_UA = /Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebot|ia_archiver|AhrefsBot|SemrushBot|MJ12bot|DotBot/i;

const SITE_URL = 'https://awe-os.com';
const OG_IMAGE = 'https://awe-os.com/og-image.svg';

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Lightweight OG-only response for social media bots ───────────────────────
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

// ── Full pre-rendered HTML for search engine crawlers ───────────────────────
function seoHtml({ title, description, url, toolName, toolDescription, slug }) {
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

  // JSON-LD schemas
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

  // Build visible FAQ HTML
  const faqItems = faqs
    .map(({ q, a }) =>
      `<div class="faq-item"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`)
    .join('');

  // Build steps HTML
  const stepsHtml = steps
    .map((s, i) => `<li><strong>${i + 1}.</strong> ${esc(s)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${u}">
  <meta property="og:site_name" content="AWE-OS">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:url" content="${u}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${esc(OG_IMAGE)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@awe_os">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${esc(OG_IMAGE)}">
  <script type="application/ld+json">${safeJson(faqSchema)}</script>
  <script type="application/ld+json">${safeJson(appSchema)}</script>
  <script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>
  <style>
    body{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:24px 16px;color:#1a1a1a;line-height:1.6}
    nav{font-size:13px;color:#666;margin-bottom:24px}
    nav a{color:#2563eb;text-decoration:none}
    h1{font-size:2rem;font-weight:700;margin:0 0 8px}
    h2{font-size:1.25rem;font-weight:600;margin:32px 0 12px}
    p{margin:0 0 12px;color:#374151}
    .about{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:28px}
    ol,ul{padding-left:20px}
    li{margin-bottom:8px;color:#374151}
    .faq-item{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px}
    .faq-item h3{font-size:0.95rem;font-weight:600;margin:0 0 8px;color:#111827}
    .faq-item p{font-size:0.9rem;margin:0;color:#4b5563}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#9ca3af}
    footer a{color:#2563eb;text-decoration:none}
  </style>
</head>
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
    <p>${name} is one of the most popular free tools available on AWE-OS. Designed for professionals, students, and everyday users, it makes ${desc.toLowerCase()} easier than ever before.</p>
    <p>Unlike other online tools, ${name} is completely free with no hidden charges. You don&apos;t need to install any software or create an account to get started — simply open the tool and begin working immediately.</p>
    <p>Our AI-powered engine ensures fast, accurate results every time. Whether you&apos;re a first-time user or a power user, ${name} scales to meet your needs.</p>
  </div>

  <h2>How to Use ${name}</h2>
  <ol>${stepsHtml}</ol>

  <h2>Frequently Asked Questions</h2>
  ${faqItems}

  <footer>
    <p>
      <a href="${esc(SITE_URL)}">AWE-OS</a> — 100+ free AI-powered tools for everyone.
      <a href="${esc(SITE_URL)}/tools">Browse all tools</a> &nbsp;|&nbsp;
      <a href="${esc(SITE_URL)}/privacy-policy">Privacy Policy</a>
    </p>
  </footer>
</body>
</html>`;
}

// ── Static page metadata ─────────────────────────────────────────────────────
const STATIC_PAGES = {
  '/': {
    title: 'AWE-OS — Free AI-Powered Tools for Everyone',
    description: 'Discover 100+ free AI-powered tools — Resume Builder, PDF Tools, Calculators, Converters and more. Fast, free, and easy to use.',
  },
  '/tools': {
    title: 'All Tools — AWE-OS Free Online Tools',
    description: 'Browse 100+ free tools on AWE-OS — PDF tools, calculators, converters, and AI tools. Fast, free, and easy to use.',
  },
  '/pricing': {
    title: 'Pricing — AWE-OS Pro',
    description: 'Simple, transparent pricing. Start free, upgrade to Pro for AI tools. Resume Builder, AI Content Writer and more.',
  },
  '/about': {
    title: 'About Us — AWE-OS | Free AI-Powered Tools for Everyone',
    description: 'Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone. PDF tools, calculators, converters and AI writers.',
  },
  '/contact': {
    title: 'Contact Us — AWE-OS',
    description: 'Get in touch with the AWE-OS team. We respond within 24 hours on weekdays.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy — AWE-OS',
    description: 'AWE-OS Privacy Policy — how we collect, use and protect your data. GDPR compliant.',
  },
  '/privacy': {
    title: 'Privacy Policy — AWE-OS',
    description: 'AWE-OS Privacy Policy — how we collect, use and protect your data. GDPR compliant.',
  },
  '/terms': {
    title: 'Terms of Service — AWE-OS',
    description: 'AWE-OS Terms of Service — rules for using our platform, your rights, and our responsibilities.',
  },
  '/disclaimer': {
    title: 'Disclaimer — AWE-OS',
    description: 'AWE-OS Disclaimer — important information about tool accuracy, limitations, and the absence of professional advice.',
  },
};

// ── Category metadata ────────────────────────────────────────────────────────
const CATEGORIES = {
  pdf: {
    title: 'Free PDF Tools Online — Merge, Split, Compress & Convert | AWE-OS',
    description: 'Powerful free PDF tools: merge, split, compress, rotate, convert and secure PDFs without any software install. 100% browser-based.',
  },
  calculators: {
    title: 'Free Online Calculators — BMI, Loan EMI, GPA & More | AWE-OS',
    description: 'Accurate free calculators for health, finance, and education. All calculations happen in your browser — instant, private, and free.',
  },
  converters: {
    title: 'Free Online Converters — Unit, File, Text & Image | AWE-OS',
    description: 'Convert units, files, text, and formats instantly. Browser-based, fast, free, and completely private.',
  },
  ai: {
    title: 'Free AI-Powered Tools — Resume Builder, Content Writer & More | AWE-OS',
    description: 'AI-powered productivity tools for writing, resumes, and content creation. Powered by GPT-4 and advanced AI models.',
  },
};

// ── Tool metadata (title + description for meta tags) ───────────────────────
const TOOLS = {
  // PDF — Organize
  'merge-pdf': {
    title: 'Merge PDF — Combine PDF Files Free Online | AWE-OS',
    description: 'Combine multiple PDF files into one document instantly in your browser. Drag to reorder, no upload, no registration.',
  },
  'split-pdf': {
    title: 'Split PDF — Split PDF into Multiple Files Free | AWE-OS',
    description: 'Split a PDF into separate pages or custom page ranges instantly in your browser. No server upload needed.',
  },
  'remove-pages-pdf': {
    title: 'Remove PDF Pages — Delete Pages from PDF Free | AWE-OS',
    description: 'Remove unwanted pages from any PDF file. Free, browser-based PDF page remover. No files uploaded to any server.',
  },
  'extract-pages-pdf': {
    title: 'Extract PDF Pages — Pull Pages from PDF Free | AWE-OS',
    description: 'Extract specific pages from any PDF into a new file. 100% browser-based, no server upload required.',
  },
  'organize-pdf': {
    title: 'Organize PDF — Rearrange PDF Pages Free Online | AWE-OS',
    description: 'Reorder and organize PDF pages. Drag and drop to rearrange, delete unwanted pages. Free, browser-based.',
  },
  // PDF — Optimize
  'compress-pdf': {
    title: 'Compress PDF — Reduce PDF File Size Free Online | AWE-OS',
    description: 'Reduce the size of your PDF without losing quality. 100% free, browser-based PDF compressor. No registration needed.',
  },
  'pdf-compressor': {
    title: 'PDF Compressor — Compress PDF Free Online | AWE-OS',
    description: 'Compress PDF files online for free. Reduce PDF file size without losing quality. Fast, browser-based, no registration needed.',
  },
  // PDF — Convert to
  'jpg-to-pdf': {
    title: 'JPG to PDF — Convert Images to PDF Free Online | AWE-OS',
    description: 'Convert JPG, PNG, and WEBP images to PDF for free. Fast, browser-based image to PDF converter. No sign-up required.',
  },
  'word-to-pdf': {
    title: 'Word to PDF — Convert DOCX to PDF Free Online | AWE-OS',
    description: 'Convert Word documents to PDF online for free. Preserve all formatting, fonts, and layout. No software needed.',
  },
  'excel-to-pdf': {
    title: 'Excel to PDF — Convert Excel Spreadsheets to PDF Free | AWE-OS',
    description: 'Convert Excel spreadsheets to PDF free online. Preserve tables, charts, and formatting. No registration needed.',
  },
  'powerpoint-to-pdf': {
    title: 'PowerPoint to PDF — Convert PPTX to PDF Free | AWE-OS',
    description: 'Convert PowerPoint presentations to PDF free online. Preserve slides and design. No registration required.',
  },
  // PDF — Convert from
  'pdf-to-jpg': {
    title: 'PDF to JPG — Convert PDF Pages to Images Free | AWE-OS',
    description: 'Convert PDF pages to JPG images instantly. Free browser-based PDF to image converter. No upload required.',
  },
  'pdf-to-word': {
    title: 'PDF to Word — Convert PDF to Editable DOCX Free | AWE-OS',
    description: 'Convert PDF to Word document free online. Get an editable DOCX from any PDF. No sign-up required.',
  },
  'pdf-to-excel': {
    title: 'PDF to Excel — Extract PDF Tables to Excel Free | AWE-OS',
    description: 'Convert PDF tables to Excel spreadsheets free. Extract data from PDF to XLSX format online.',
  },
  // PDF — Edit
  'rotate-pdf': {
    title: 'Rotate PDF — Rotate PDF Pages Free Online | AWE-OS',
    description: 'Rotate PDF pages 90° or 180°. Fix orientation of PDF documents. 100% free, browser-based PDF rotator.',
  },
  'watermark-pdf': {
    title: 'Add Watermark to PDF — Free PDF Watermark Tool | AWE-OS',
    description: 'Add text watermarks to PDF pages for free. Protect and brand your documents. Browser-based, no upload.',
  },
  'page-numbers-pdf': {
    title: 'Add Page Numbers to PDF — Free Online Tool | AWE-OS',
    description: 'Add automatic page numbers to PDF documents free. Choose position, style, and starting number.',
  },
  // PDF — Security
  'protect-pdf': {
    title: 'Protect PDF — Add Password to PDF Free Online | AWE-OS',
    description: 'Add password protection to any PDF file. Secure your documents with encryption. Free, browser-based.',
  },
  'unlock-pdf': {
    title: 'Unlock PDF — Remove PDF Password Free Online | AWE-OS',
    description: 'Remove password from protected PDF files. Unlock PDF documents free online. No software needed.',
  },
  // Calculators
  'bmi-calculator': {
    title: 'BMI Calculator — Body Mass Index Calculator Free | AWE-OS',
    description: 'Calculate your BMI instantly. Supports metric (cm/kg) and imperial (ft/lb) units with visual scale.',
  },
  'age-calculator': {
    title: 'Age Calculator — Calculate Exact Age Free Online | AWE-OS',
    description: 'Calculate exact age in years, months, and days from any date of birth. Free, instant age calculator.',
  },
  'loan-calculator': {
    title: 'Loan EMI Calculator — Monthly Payment Calculator Free | AWE-OS',
    description: 'Calculate monthly EMI for any loan. Get a complete amortization schedule. Free, instant loan calculator.',
  },
  'percentage-calculator': {
    title: 'Percentage Calculator — Calculate Percent Free Online | AWE-OS',
    description: 'Calculate any percentage instantly. Percentage of total, percentage change, increase and decrease.',
  },
  'gpa-calculator': {
    title: 'GPA Calculator — Calculate Grade Point Average Free | AWE-OS',
    description: 'Calculate your GPA from course grades and credit hours. Supports weighted and unweighted GPA.',
  },
  'compound-interest-calculator': {
    title: 'Compound Interest Calculator — Free Online | AWE-OS',
    description: 'Calculate compound interest and investment growth over time. See year-by-year breakdown.',
  },
  // Converters & utilities
  'unit-converter': {
    title: 'Unit Converter — Convert Length, Weight, Temperature Free | AWE-OS',
    description: 'Convert between all units of measurement. Length, weight, temperature, speed, volume, and more.',
  },
  'word-counter': {
    title: 'Word Counter — Count Words & Characters Free Online | AWE-OS',
    description: 'Count words, characters, sentences, and estimate reading time instantly. Free online word counter.',
  },
  'password-generator': {
    title: 'Password Generator — Generate Strong Passwords Free | AWE-OS',
    description: 'Generate strong, secure, random passwords. Customize length, character sets, and complexity.',
  },
  'color-picker': {
    title: 'Color Picker — HEX, RGB & HSL Color Converter Free | AWE-OS',
    description: 'Pick and convert colors between HEX, RGB, and HSL formats. Free online color picker tool.',
  },
  'qr-code-generator': {
    title: 'QR Code Generator — Create QR Codes Free Online | AWE-OS',
    description: 'Generate QR codes for URLs, text, WiFi, contacts, and more. Download as PNG. 100% free.',
  },
  'image-compressor': {
    title: 'Image Compressor — Compress JPG & PNG Free Online | AWE-OS',
    description: 'Compress images without losing quality. Reduce JPG, PNG, WEBP file sizes instantly in your browser.',
  },
  'csv-to-json': {
    title: 'CSV to JSON Converter — Convert CSV Files Free Online | AWE-OS',
    description: 'Convert CSV files to JSON format instantly in your browser. Free CSV to JSON converter.',
  },
  // AI Tools
  'resume-builder': {
    title: 'AI Resume Builder — Create Professional Resume Free | AWE-OS',
    description: 'Build a professional, ATS-friendly resume with AI. Multiple templates, instant download. Free.',
  },
  'ai-content-writer': {
    title: 'AI Content Writer — Generate Blog Posts & Copy Free | AWE-OS',
    description: 'Write blog posts, social media captions, and ad copy with AI. GPT-powered content writer. Free.',
  },
};

// Safe JSON serialisation — prevents </script> injection inside ld+json blocks
function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

// ── Derive a human-readable tool name from a slug ───────────────────────────
function slugToName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Main middleware ──────────────────────────────────────────────────────────
export default function middleware(req) {
  const ua = req.headers.get('user-agent') || '';

  const isSearchBot = SEARCH_BOT_UA.test(ua);
  const isSocialBot = !isSearchBot && SOCIAL_BOT_UA.test(ua);

  // Regular user — pass through to SPA
  if (!isSearchBot && !isSocialBot) return;

  const { pathname } = new URL(req.url);

  // ── Static pages ──────────────────────────────────────────────────────────
  if (STATIC_PAGES[pathname]) {
    const { title, description } = STATIC_PAGES[pathname];
    const pageUrl = `${SITE_URL}${pathname}`;
    if (isSearchBot) {
      // For static non-tool pages, OG HTML is sufficient for search bots too
      return new Response(ogHtml(title, description, pageUrl), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }
    return new Response(ogHtml(title, description, pageUrl), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }

  // ── Category pages: /tools/pdf, /tools/calculators, etc. ─────────────────
  const catMatch = pathname.match(/^\/tools\/(pdf|calculators|converters|ai)$/);
  if (catMatch) {
    const cat = CATEGORIES[catMatch[1]];
    if (cat) {
      return new Response(ogHtml(cat.title, cat.description, `${SITE_URL}${pathname}`), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }
  }

  // ── Tool pages: /tools/<slug> ─────────────────────────────────────────────
  const toolMatch = pathname.match(/^\/tools\/([a-z0-9-]+)$/);
  if (toolMatch) {
    const slug    = toolMatch[1];
    const meta    = TOOLS[slug];
    const pageUrl = `${SITE_URL}${pathname}`;

    const toolName        = meta ? slugToName(slug) : slugToName(slug);
    const toolTitle       = meta?.title       || `${toolName} — Free Online Tool | AWE-OS`;
    const toolDescription = meta?.description || `Free online ${toolName.toLowerCase()}. Fast, easy, and free to use. No sign-up required.`;

    if (isSearchBot) {
      // Full pre-rendered HTML: About + How-to + FAQ + JSON-LD
      return new Response(
        seoHtml({
          title:           toolTitle,
          description:     toolDescription,
          url:             pageUrl,
          toolName,
          toolDescription: meta?.description || `${toolName.toLowerCase()} quickly and easily`,
          slug,
        }),
        {
          headers: {
            'content-type':  'text/html; charset=utf-8',
            'cache-control': 'public, max-age=3600',
            'x-robots-tag':  'index, follow',
          },
        },
      );
    }

    // Social bot — OG meta only
    return new Response(ogHtml(toolTitle, toolDescription, pageUrl), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }
}

export const config = {
  matcher: '/((?!_vercel|.*\\.(ico|png|jpg|jpeg|gif|svg|webp|js|css|woff2?|ttf|eot|map|json|xml|txt)).*)',
};
