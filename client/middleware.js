/**
 * Vercel Edge Middleware — OG meta injection for social media bots.
 *
 * Social media crawlers (Twitter, Facebook, LinkedIn, Slack, WhatsApp, etc.)
 * do NOT execute JavaScript, so react-helmet meta tags are invisible to them.
 * This middleware intercepts bot requests and returns lightweight HTML with
 * the correct Open Graph and Twitter Card meta tags for known routes.
 *
 * Regular users pass through unchanged — zero performance impact on UX.
 * Runs on Vercel Edge Runtime (Web APIs only, no Node.js modules).
 */

const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot-LinkExpanding|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Pinterest|Googlebot-Image|applebot|Iframely/i;

const SITE_URL = 'https://awe-os.com';
const OG_IMAGE = 'https://awe-os.com/og-image.svg';

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

// ── Static pages ─────────────────────────────────────────────────────────────
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

// ── Category pages ────────────────────────────────────────────────────────────
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

// ── Tool pages ────────────────────────────────────────────────────────────────
const TOOLS = {
  // PDF — Organize
  'merge-pdf': {
    title: 'Merge PDF — Combine PDF Files Free Online | AWE-OS',
    description: 'Free online PDF merger. Combine multiple PDF files into one document instantly in your browser. Drag to reorder, no upload, no registration.',
  },
  'split-pdf': {
    title: 'Split PDF — Split PDF into Multiple Files Free | AWE-OS',
    description: 'Free PDF splitter. Split a PDF into separate pages or custom page ranges instantly in your browser. No server upload needed.',
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
    description: 'Calculate your BMI instantly with our free online BMI calculator. Supports metric (cm/kg) and imperial (ft/lb) units with visual scale.',
  },
  'age-calculator': {
    title: 'Age Calculator — Calculate Exact Age Free Online | AWE-OS',
    description: 'Calculate exact age in years, months, and days from any date of birth. Free, instant age calculator online.',
  },
  'loan-calculator': {
    title: 'Loan EMI Calculator — Monthly Payment Calculator Free | AWE-OS',
    description: 'Calculate monthly EMI for any loan. Get a complete amortization schedule. Free, instant loan calculator.',
  },
  'percentage-calculator': {
    title: 'Percentage Calculator — Calculate Percent Free Online | AWE-OS',
    description: 'Calculate any percentage instantly. Percentage of total, percentage change, increase and decrease calculations.',
  },
  'gpa-calculator': {
    title: 'GPA Calculator — Calculate Grade Point Average Free | AWE-OS',
    description: 'Calculate your GPA from course grades and credit hours. Supports weighted and unweighted GPA. Free online tool.',
  },
  'compound-interest-calculator': {
    title: 'Compound Interest Calculator — Free Online | AWE-OS',
    description: 'Calculate compound interest and investment growth over time. See year-by-year breakdown. Free online financial tool.',
  },
  // Converters
  'unit-converter': {
    title: 'Unit Converter — Convert Length, Weight, Temperature Free | AWE-OS',
    description: 'Convert between all units of measurement. Length, weight, temperature, speed, volume, and more. Free online unit converter.',
  },
  'word-counter': {
    title: 'Word Counter — Count Words & Characters Free Online | AWE-OS',
    description: 'Count words, characters, sentences, and estimate reading time instantly. Free online word and character counter.',
  },
  'password-generator': {
    title: 'Password Generator — Generate Strong Passwords Free | AWE-OS',
    description: 'Generate strong, secure, random passwords. Customize length, character sets, and complexity. 100% free.',
  },
  'color-picker': {
    title: 'Color Picker — HEX, RGB & HSL Color Converter Free | AWE-OS',
    description: 'Pick and convert colors between HEX, RGB, and HSL formats. Free online color picker and converter tool.',
  },
  'qr-code-generator': {
    title: 'QR Code Generator — Create QR Codes Free Online | AWE-OS',
    description: 'Generate QR codes for URLs, text, WiFi, contacts, and more. Download as PNG. 100% free QR code creator.',
  },
  'image-compressor': {
    title: 'Image Compressor — Compress JPG & PNG Free Online | AWE-OS',
    description: 'Compress images without losing quality. Reduce JPG, PNG, WEBP file sizes instantly in your browser.',
  },
  'csv-to-json': {
    title: 'CSV to JSON Converter — Convert CSV Files Free Online | AWE-OS',
    description: 'Convert CSV files to JSON format instantly in your browser. Free CSV to JSON converter — no upload needed.',
  },
  // AI Tools
  'resume-builder': {
    title: 'AI Resume Builder — Create Professional Resume Free | AWE-OS',
    description: 'Build a professional, ATS-friendly resume with AI. Multiple templates, instant download. Free online resume builder.',
  },
  'ai-content-writer': {
    title: 'AI Content Writer — Generate Blog Posts & Copy Free | AWE-OS',
    description: 'Write blog posts, social media captions, and ad copy with AI. GPT-powered content writer. Free to use.',
  },
};

export default function middleware(req) {
  const ua = req.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return; // pass through — regular user

  const { pathname } = new URL(req.url);

  // Static pages
  if (STATIC_PAGES[pathname]) {
    const { title, description } = STATIC_PAGES[pathname];
    return new Response(ogHtml(title, description, `${SITE_URL}${pathname}`), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }

  // Category pages: /tools/pdf, /tools/calculators, /tools/converters, /tools/ai
  const catMatch = pathname.match(/^\/tools\/(pdf|calculators|converters|ai)$/);
  if (catMatch) {
    const cat = CATEGORIES[catMatch[1]];
    if (cat) {
      return new Response(ogHtml(cat.title, cat.description, `${SITE_URL}${pathname}`), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }
  }

  // Tool pages: /tools/<slug>
  const toolMatch = pathname.match(/^\/tools\/([a-z0-9-]+)$/);
  if (toolMatch) {
    const tool = TOOLS[toolMatch[1]];
    if (tool) {
      return new Response(ogHtml(tool.title, tool.description, `${SITE_URL}${pathname}`), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    }
    // Unknown tool — generic fallback
    const slug = toolMatch[1];
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return new Response(
      ogHtml(
        `${name} — Free Online Tool | AWE-OS`,
        `Free online ${name.toLowerCase()}. Fast, easy, and free. No sign-up required.`,
        `${SITE_URL}${pathname}`,
      ),
      { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
    );
  }

  // All other routes — pass through to SPA
}

export const config = {
  // Match all paths except Vercel internals and static file extensions
  matcher: '/((?!_vercel|.*\\.(ico|png|jpg|jpeg|gif|svg|webp|js|css|woff2?|ttf|eot|map|json|xml|txt)).*)',
};
