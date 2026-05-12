'use strict';

/**
 * Express OG Bot Middleware
 *
 * Detects social media bot User-Agents and returns lightweight HTML with
 * correct Open Graph and Twitter Card meta tags for known routes.
 *
 * Social bots (Twitterbot, facebookexternalhit, Slackbot, LinkedIn, etc.)
 * do NOT execute JavaScript, making react-helmet meta invisible to them.
 * This middleware solves that by serving pre-built meta HTML server-side.
 *
 * Mount BEFORE all other middleware but AFTER static file serving:
 *   app.use(ogMiddleware);
 */

const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot-LinkExpanding|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Pinterest|Googlebot-Image|applebot|Iframely/i;

const SITE_URL = process.env.FRONTEND_URL || 'https://awe-os.com';
const OG_IMAGE = `${SITE_URL}/og-image.svg`;

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(title, description, url) {
  const t = esc(title);
  const d = esc(description);
  const u = esc(url);
  const img = esc(OG_IMAGE);
  return [
    '<!DOCTYPE html><html lang="en"><head>',
    '<meta charset="UTF-8">',
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    '<meta property="og:site_name" content="AWE-OS">',
    '<meta property="og:locale" content="en_US">',
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${u}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:image" content="${img}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:site" content="@awe_os">',
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="twitter:image" content="${img}">`,
    `</head><body><p><a href="${u}">${t}</a></p></body></html>`,
  ].join('');
}

// ── Static pages ──────────────────────────────────────────────────────────────
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
    description: 'Learn about AWE-OS — our mission to make AI-powered tools free and accessible to everyone.',
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

// ── Category pages ─────────────────────────────────────────────────────────────
const CATEGORIES = {
  pdf: {
    title: 'Free PDF Tools Online — Merge, Split, Compress & Convert | AWE-OS',
    description: 'Powerful free PDF tools: merge, split, compress, rotate, convert and secure PDFs. 100% browser-based.',
  },
  calculators: {
    title: 'Free Online Calculators — BMI, Loan EMI, GPA & More | AWE-OS',
    description: 'Accurate free calculators for health, finance, and education. All calculations happen in your browser.',
  },
  converters: {
    title: 'Free Online Converters — Unit, File, Text & Image | AWE-OS',
    description: 'Convert units, files, text, and formats instantly. Browser-based, fast, free, and completely private.',
  },
  ai: {
    title: 'Free AI-Powered Tools — Resume Builder, Content Writer & More | AWE-OS',
    description: 'AI-powered productivity tools for writing, resumes, and content creation. Powered by GPT-4.',
  },
};

// ── Tool pages ─────────────────────────────────────────────────────────────────
const TOOLS = {
  'merge-pdf':               { title: 'Merge PDF — Combine PDF Files Free Online | AWE-OS',           description: 'Free online PDF merger. Combine multiple PDF files into one document instantly in your browser.' },
  'split-pdf':               { title: 'Split PDF — Split PDF into Multiple Files Free | AWE-OS',      description: 'Free PDF splitter. Split a PDF into separate pages or custom page ranges. No server upload.' },
  'remove-pages-pdf':        { title: 'Remove PDF Pages — Delete Pages from PDF Free | AWE-OS',       description: 'Remove unwanted pages from any PDF file. Free, browser-based PDF page remover.' },
  'extract-pages-pdf':       { title: 'Extract PDF Pages — Pull Pages from PDF Free | AWE-OS',        description: 'Extract specific pages from any PDF into a new file. 100% browser-based.' },
  'organize-pdf':            { title: 'Organize PDF — Rearrange PDF Pages Free Online | AWE-OS',      description: 'Reorder and organize PDF pages with drag and drop. Free, browser-based.' },
  'compress-pdf':            { title: 'Compress PDF — Reduce PDF File Size Free Online | AWE-OS',     description: 'Reduce PDF file size without losing quality. Free, browser-based PDF compressor.' },
  'jpg-to-pdf':              { title: 'JPG to PDF — Convert Images to PDF Free Online | AWE-OS',      description: 'Convert JPG, PNG, and WEBP images to PDF for free. Browser-based, no sign-up.' },
  'word-to-pdf':             { title: 'Word to PDF — Convert DOCX to PDF Free Online | AWE-OS',       description: 'Convert Word documents to PDF online for free. Preserve all formatting.' },
  'excel-to-pdf':            { title: 'Excel to PDF — Convert Spreadsheets to PDF Free | AWE-OS',     description: 'Convert Excel spreadsheets to PDF free online. Preserve tables and formatting.' },
  'powerpoint-to-pdf':       { title: 'PowerPoint to PDF — Convert PPTX to PDF Free | AWE-OS',       description: 'Convert PowerPoint presentations to PDF free. Preserve slides and design.' },
  'pdf-to-jpg':              { title: 'PDF to JPG — Convert PDF Pages to Images Free | AWE-OS',       description: 'Convert PDF pages to JPG images instantly. Free browser-based converter.' },
  'pdf-to-word':             { title: 'PDF to Word — Convert PDF to Editable DOCX Free | AWE-OS',    description: 'Convert PDF to Word document free online. Get an editable DOCX from any PDF.' },
  'pdf-to-excel':            { title: 'PDF to Excel — Extract PDF Tables to Excel Free | AWE-OS',     description: 'Convert PDF tables to Excel spreadsheets free. Extract data from PDF to XLSX.' },
  'rotate-pdf':              { title: 'Rotate PDF — Rotate PDF Pages Free Online | AWE-OS',           description: 'Rotate PDF pages 90° or 180°. Fix orientation of PDF documents.' },
  'watermark-pdf':           { title: 'Add Watermark to PDF — Free PDF Watermark Tool | AWE-OS',      description: 'Add text watermarks to PDF pages for free. Protect and brand your documents.' },
  'page-numbers-pdf':        { title: 'Add Page Numbers to PDF — Free Online Tool | AWE-OS',          description: 'Add automatic page numbers to PDF documents free. Choose position and style.' },
  'protect-pdf':             { title: 'Protect PDF — Add Password to PDF Free Online | AWE-OS',       description: 'Add password protection to any PDF file. Secure your documents with encryption.' },
  'unlock-pdf':              { title: 'Unlock PDF — Remove PDF Password Free Online | AWE-OS',        description: 'Remove password from protected PDF files. Unlock PDF documents free online.' },
  'bmi-calculator':          { title: 'BMI Calculator — Body Mass Index Calculator Free | AWE-OS',    description: 'Calculate your BMI instantly. Supports metric and imperial units with visual scale.' },
  'age-calculator':          { title: 'Age Calculator — Calculate Exact Age Free Online | AWE-OS',    description: 'Calculate exact age in years, months, and days from any date of birth.' },
  'loan-calculator':         { title: 'Loan EMI Calculator — Monthly Payment Calculator Free | AWE-OS', description: 'Calculate monthly EMI for any loan with complete amortization schedule.' },
  'percentage-calculator':   { title: 'Percentage Calculator — Calculate Percent Free Online | AWE-OS', description: 'Calculate any percentage instantly. Percentage of total, change, increase and decrease.' },
  'gpa-calculator':          { title: 'GPA Calculator — Calculate Grade Point Average Free | AWE-OS', description: 'Calculate your GPA from course grades and credit hours. Weighted and unweighted.' },
  'compound-interest-calculator': { title: 'Compound Interest Calculator — Free Online | AWE-OS',    description: 'Calculate compound interest and investment growth. Year-by-year breakdown.' },
  'unit-converter':          { title: 'Unit Converter — Convert Length, Weight, Temperature Free | AWE-OS', description: 'Convert between all units of measurement. Length, weight, temperature, speed, and more.' },
  'word-counter':            { title: 'Word Counter — Count Words & Characters Free Online | AWE-OS', description: 'Count words, characters, sentences, and estimate reading time instantly.' },
  'password-generator':      { title: 'Password Generator — Generate Strong Passwords Free | AWE-OS', description: 'Generate strong, secure, random passwords. Customize length and complexity.' },
  'color-picker':            { title: 'Color Picker — HEX, RGB & HSL Color Converter Free | AWE-OS', description: 'Pick and convert colors between HEX, RGB, and HSL formats.' },
  'qr-code-generator':       { title: 'QR Code Generator — Create QR Codes Free Online | AWE-OS',    description: 'Generate QR codes for URLs, text, WiFi, contacts, and more. Download as PNG.' },
  'image-compressor':        { title: 'Image Compressor — Compress JPG & PNG Free Online | AWE-OS',   description: 'Compress images without losing quality. Reduce JPG, PNG, WEBP file sizes.' },
  'csv-to-json':             { title: 'CSV to JSON Converter — Convert CSV Files Free Online | AWE-OS', description: 'Convert CSV files to JSON format instantly in your browser. No upload needed.' },
  'resume-builder':          { title: 'AI Resume Builder — Create Professional Resume Free | AWE-OS', description: 'Build a professional, ATS-friendly resume with AI. Multiple templates, instant download.' },
  'ai-content-writer':       { title: 'AI Content Writer — Generate Blog Posts & Copy Free | AWE-OS', description: 'Write blog posts, social media captions, and ad copy with AI. GPT-powered.' },
};

const CAT_PATTERN  = /^\/tools\/(pdf|calculators|converters|ai)$/;
const TOOL_PATTERN = /^\/tools\/([a-z0-9-]+)$/;

function sendOg(res, title, description, url) {
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=86400',
    'X-OG-Bot': '1',
  });
  res.send(buildHtml(title, description, url));
}

module.exports = function ogMiddleware(req, res, next) {
  const ua = req.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return next();

  const path = req.path;
  const url  = `${SITE_URL}${path}`;

  // Static pages
  if (STATIC_PAGES[path]) {
    const { title, description } = STATIC_PAGES[path];
    return sendOg(res, title, description, url);
  }

  // Category pages: /tools/pdf etc.
  const catMatch = path.match(CAT_PATTERN);
  if (catMatch && CATEGORIES[catMatch[1]]) {
    const { title, description } = CATEGORIES[catMatch[1]];
    return sendOg(res, title, description, url);
  }

  // Tool pages: /tools/<slug>
  const toolMatch = path.match(TOOL_PATTERN);
  if (toolMatch) {
    const tool = TOOLS[toolMatch[1]];
    if (tool) {
      return sendOg(res, tool.title, tool.description, url);
    }
    // Unknown tool — generic fallback
    const slug = toolMatch[1];
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return sendOg(
      res,
      `${name} — Free Online Tool | AWE-OS`,
      `Free online ${name.toLowerCase()}. Fast, easy, and free. No sign-up required.`,
      url,
    );
  }

  next();
};
