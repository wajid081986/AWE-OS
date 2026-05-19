/**
 * AWE-OS Tool Registry — single source of truth for all tool metadata.
 *
 * Rules:
 *  - Add a new tool here; routing + SEO are automatic.
 *  - Component lazy imports live in DynamicToolPage.jsx (Vite needs static paths).
 *  - Every tool needs: slug, name, category, icon, description, seo.title, seo.description.
 *  - relatedSlugs powers the "Related Tools" sidebar; keep to 3-5 entries.
 */

// ── Category metadata ────────────────────────────────────────────────────────

export const CATEGORY_META = {
  pdf: {
    slug: 'pdf',
    name: 'PDF Tools',
    title: 'Free PDF Tools Online — Merge, Split, Compress & Convert | AWE-OS',
    description: 'Powerful free PDF tools: merge, split, compress, rotate, convert and secure PDFs without any software install. 100% browser-based.',
    icon: '📄',
    accent: 'red',
    applicationCategory: 'UtilitiesApplication',
    intro: {
      heading: 'Free PDF Tools — No Software Required',
      body: 'AWE-OS provides 18+ powerful PDF tools that run entirely in your browser. Merge, split, compress, convert, protect, and edit PDF files without uploading to any server. Your files stay private on your device.',
      whyTitle: 'Why use AWE-OS PDF Tools?',
      whyPoints: [
        '100% browser-based — files never leave your device',
        'No account required for most tools',
        'Supports all PDF versions and encrypted files',
        'Works on desktop, tablet, and mobile',
      ],
    },
  },

  calculators: {
    slug: 'calculators',
    name: 'Calculators',
    title: 'Free Online Calculators — BMI, Loan EMI, GPA & More | AWE-OS',
    description: 'Accurate free calculators for health, finance, and education. All calculations happen in your browser — instant, private, and free.',
    icon: '🧮',
    accent: 'green',
    applicationCategory: 'UtilitiesApplication',
    intro: {
      heading: 'Free Online Calculators',
      body: 'Accurate, fast calculators for health, finance, and education. All calculations happen in your browser — no data is sent to any server, ever.',
      whyTitle: 'Why use AWE-OS Calculators?',
      whyPoints: [
        'Instant results with clear explanations',
        'Supports both metric and imperial units',
        'Designed for professionals, students, and everyday users',
        'No ads in results, no registration required',
      ],
    },
  },

  converters: {
    slug: 'converters',
    name: 'Converters & Tools',
    title: 'Free Online Converters — Unit, File, Text & Image | AWE-OS',
    description: 'Convert units, files, text, and formats instantly. Browser-based, fast, free, and completely private.',
    icon: '🔄',
    accent: 'purple',
    applicationCategory: 'UtilitiesApplication',
    intro: {
      heading: 'Free Online Converters & Utilities',
      body: 'Convert units, files, text, and formats instantly in your browser. All tools are 100% client-side — fast, free, and private.',
      whyTitle: 'Why use AWE-OS Converters?',
      whyPoints: [
        'No file uploads — works 100% in your browser',
        'Instant conversion results',
        'Supports the most popular formats and units',
        'Mobile-friendly, works on any device',
      ],
    },
  },

  productivity: {
    slug: 'productivity',
    name: 'Productivity',
    title: 'Free Productivity Tools — Invoice Generator & More | AWE-OS',
    description: 'Free productivity tools for freelancers and businesses. Create GST invoices, manage clients, and export PDFs — no subscription required.',
    icon: '🧾',
    accent: 'indigo',
    applicationCategory: 'BusinessApplication',
    intro: {
      heading: 'Free Productivity Tools for Freelancers & Businesses',
      body: 'Professional tools that help you bill clients, manage projects, and run your business without expensive software. All tools are free and work in your browser.',
      whyTitle: 'Why use AWE-OS Productivity Tools?',
      whyPoints: [
        'No subscription — free for freelancers and small businesses',
        'GST-compliant invoicing for Indian businesses',
        'Export to PDF in one click',
        'Works on any device, no install required',
      ],
    },
  },

  ai: {
    slug: 'ai',
    name: 'AI Tools',
    title: 'Free AI-Powered Tools — Resume Builder, Content Writer & More | AWE-OS',
    description: 'AI-powered productivity tools for writing, resumes, and content creation. Powered by GPT-4 and advanced AI models.',
    icon: '🤖',
    accent: 'blue',
    applicationCategory: 'BusinessApplication',
    intro: {
      heading: 'Free AI-Powered Productivity Tools',
      body: 'AI-powered tools that help you work smarter. Generate resumes, write content, and automate repetitive tasks with state-of-the-art AI models — no technical knowledge required.',
      whyTitle: 'Why use AWE-OS AI Tools?',
      whyPoints: [
        'Powered by GPT-4 and advanced AI models',
        'Free tier with generous monthly limits',
        'No technical knowledge required',
        'Results continuously improved by our autonomous AI pipeline',
      ],
    },
  },
}

// ── Master tool registry ─────────────────────────────────────────────────────

export const TOOL_REGISTRY = [

  // ── PDF TOOLS ─────────────────────────────────────────────────────────────

  // Organize PDF
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf',
    subcategory: 'Organize PDF',
    icon: '📎',
    description: 'Combine multiple PDF files into one document. Drag to reorder before merging.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf', 'merge', 'combine', 'join', 'pdf merger'],
    relatedSlugs: ['split-pdf', 'compress-pdf', 'organize-pdf', 'remove-pages-pdf'],
    seo: {
      title: 'Merge PDF — Combine PDF Files Free Online | AWE-OS',
      description: 'Free online PDF merger. Combine multiple PDF files into one document instantly in your browser. Drag to reorder, no upload, no registration required.',
    },
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    category: 'pdf',
    subcategory: 'Organize PDF',
    icon: '✂️',
    description: 'Split a large PDF into separate pages or custom page ranges.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf', 'split', 'separate', 'extract pages', 'pdf splitter'],
    relatedSlugs: ['merge-pdf', 'extract-pages-pdf', 'remove-pages-pdf'],
    seo: {
      title: 'Split PDF — Split PDF into Multiple Files Free | AWE-OS',
      description: 'Free PDF splitter. Split a PDF into separate pages or custom page ranges instantly in your browser. No server upload needed.',
    },
  },
  {
    slug: 'remove-pages-pdf',
    name: 'Remove PDF Pages',
    category: 'pdf',
    subcategory: 'Organize PDF',
    icon: '🗑️',
    description: 'Remove unwanted pages from a PDF document instantly.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf', 'remove pages', 'delete pages', 'pdf editor'],
    relatedSlugs: ['split-pdf', 'extract-pages-pdf', 'organize-pdf'],
    seo: {
      title: 'Remove PDF Pages — Delete Pages from PDF Free | AWE-OS',
      description: 'Remove unwanted pages from any PDF file. Free, browser-based PDF page remover. No files uploaded to any server.',
    },
  },
  {
    slug: 'extract-pages-pdf',
    name: 'Extract PDF Pages',
    category: 'pdf',
    subcategory: 'Organize PDF',
    icon: '📄',
    description: 'Extract specific pages from a PDF into a new document.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf', 'extract pages', 'pdf extractor', 'export pages'],
    relatedSlugs: ['split-pdf', 'remove-pages-pdf', 'organize-pdf'],
    seo: {
      title: 'Extract PDF Pages — Pull Pages from PDF Free | AWE-OS',
      description: 'Extract specific pages from any PDF into a new file. 100% browser-based, no server upload required.',
    },
  },
  {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    category: 'pdf',
    subcategory: 'Organize PDF',
    icon: '📋',
    description: 'Reorder and rearrange pages within a PDF visually.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf', 'organize', 'reorder pages', 'rearrange pdf'],
    relatedSlugs: ['merge-pdf', 'rotate-pdf', 'remove-pages-pdf'],
    seo: {
      title: 'Organize PDF — Rearrange PDF Pages Free Online | AWE-OS',
      description: 'Reorder and organize PDF pages. Drag and drop to rearrange, delete unwanted pages. Free, browser-based.',
    },
  },

  // Optimize PDF
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf',
    subcategory: 'Optimize PDF',
    icon: '🗜️',
    description: 'Reduce PDF file size without losing quality.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf', 'compress pdf', 'reduce pdf size', 'optimize pdf', 'pdf compressor'],
    relatedSlugs: ['merge-pdf', 'protect-pdf', 'watermark-pdf'],
    seo: {
      title: 'Compress PDF — Reduce PDF File Size Free Online | AWE-OS',
      description: 'Reduce the size of your PDF without losing quality. 100% free, browser-based PDF compressor. No registration needed.',
    },
  },

  // Convert to PDF
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'pdf',
    subcategory: 'Convert to PDF',
    icon: '🖼️',
    description: 'Convert JPG, PNG, and WEBP images to PDF instantly.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['jpg to pdf', 'image to pdf', 'png to pdf', 'photo to pdf', 'convert image pdf'],
    relatedSlugs: ['pdf-to-jpg', 'merge-pdf', 'compress-pdf'],
    seo: {
      title: 'JPG to PDF — Convert Images to PDF Free Online | AWE-OS',
      description: 'Convert JPG, PNG, and WEBP images to PDF for free. Fast, browser-based image to PDF converter. No sign-up required.',
    },
  },
  {
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    category: 'pdf',
    subcategory: 'Convert to PDF',
    icon: '📝',
    description: 'Convert Microsoft Word documents to PDF while preserving formatting.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['word to pdf', 'docx to pdf', 'doc to pdf', 'microsoft word pdf', 'convert word'],
    relatedSlugs: ['pdf-to-word', 'merge-pdf', 'compress-pdf'],
    seo: {
      title: 'Word to PDF — Convert DOCX to PDF Free Online | AWE-OS',
      description: 'Convert Word documents to PDF online for free. Preserve all formatting, fonts, and layout. No software needed.',
    },
  },
  {
    slug: 'excel-to-pdf',
    name: 'Excel to PDF',
    category: 'pdf',
    subcategory: 'Convert to PDF',
    icon: '📊',
    description: 'Convert Excel spreadsheets to PDF format.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['excel to pdf', 'xlsx to pdf', 'xls to pdf', 'spreadsheet to pdf', 'convert excel'],
    relatedSlugs: ['pdf-to-excel', 'word-to-pdf', 'merge-pdf'],
    seo: {
      title: 'Excel to PDF — Convert Spreadsheets to PDF Free | AWE-OS',
      description: 'Convert Excel spreadsheets to PDF free online. Preserve tables, charts, and formatting. No registration needed.',
    },
  },
  {
    slug: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    category: 'pdf',
    subcategory: 'Convert to PDF',
    icon: '📊',
    description: 'Convert PowerPoint presentations to PDF.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['powerpoint to pdf', 'pptx to pdf', 'ppt to pdf', 'presentation to pdf'],
    relatedSlugs: ['word-to-pdf', 'excel-to-pdf', 'merge-pdf'],
    seo: {
      title: 'PowerPoint to PDF — Convert PPTX to PDF Free | AWE-OS',
      description: 'Convert PowerPoint presentations to PDF free online. Preserve slides and design. No registration required.',
    },
  },

  // Convert from PDF
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'pdf',
    subcategory: 'Convert from PDF',
    icon: '📸',
    description: 'Convert PDF pages to high-quality JPG images.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf to jpg', 'pdf to image', 'pdf to png', 'extract images from pdf'],
    relatedSlugs: ['jpg-to-pdf', 'compress-pdf', 'organize-pdf'],
    seo: {
      title: 'PDF to JPG — Convert PDF Pages to Images Free | AWE-OS',
      description: 'Convert PDF pages to JPG images instantly. Free browser-based PDF to image converter. No upload required.',
    },
  },
  {
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    category: 'pdf',
    subcategory: 'Convert from PDF',
    icon: '📝',
    description: 'Convert PDF to editable Word document.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf to word', 'pdf to docx', 'editable pdf', 'convert pdf'],
    relatedSlugs: ['word-to-pdf', 'compress-pdf', 'extract-pages-pdf'],
    seo: {
      title: 'PDF to Word — Convert PDF to Editable DOCX Free | AWE-OS',
      description: 'Convert PDF to Word document free online. Get an editable DOCX from any PDF. No sign-up required.',
    },
  },
  {
    slug: 'pdf-to-text',
    name: 'PDF to Text',
    category: 'pdf',
    subcategory: 'Convert from PDF',
    icon: '📝',
    description: 'Extract all text from a PDF file instantly — copy or download as a plain text file.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf to text', 'extract text from pdf', 'pdf text extractor', 'copy text from pdf', 'pdf to txt'],
    relatedSlugs: ['pdf-to-word', 'pdf-to-jpg', 'pdf-to-ppt'],
    seo: {
      title: 'PDF to Text — Extract Text from PDF Free Online | AWE-OS',
      description: 'Extract all text from any PDF file instantly. Copy or download as plain text. Free browser-based PDF text extractor — no upload.',
    },
  },
  {
    slug: 'pdf-to-ppt',
    name: 'PDF to PowerPoint',
    category: 'pdf',
    subcategory: 'Convert from PDF',
    icon: '📊',
    description: 'Convert PDF pages to PowerPoint slides — each page becomes a slide in a PPTX file.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf to ppt', 'pdf to powerpoint', 'pdf to pptx', 'convert pdf slides', 'pdf presentation converter'],
    relatedSlugs: ['pdf-to-jpg', 'pdf-to-text', 'powerpoint-to-pdf'],
    seo: {
      title: 'PDF to PowerPoint — Convert PDF to PPTX Free Online | AWE-OS',
      description: 'Convert PDF pages to PowerPoint slides instantly. Each PDF page becomes an image-based slide in a PPTX file. Free, browser-based.',
    },
  },
  {
    slug: 'pdf-to-excel',
    name: 'PDF to Excel',
    category: 'pdf',
    subcategory: 'Convert from PDF',
    icon: '📈',
    description: 'Extract tables from PDF and convert to Excel spreadsheet.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf to excel', 'pdf to xlsx', 'extract tables from pdf', 'convert pdf spreadsheet'],
    relatedSlugs: ['excel-to-pdf', 'merge-pdf', 'compress-pdf'],
    seo: {
      title: 'PDF to Excel — Extract PDF Tables to Excel Free | AWE-OS',
      description: 'Convert PDF tables to Excel spreadsheets free. Extract data from PDF to XLSX format online.',
    },
  },

  // Edit PDF
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'pdf',
    subcategory: 'Edit PDF',
    icon: '🔄',
    description: 'Rotate individual pages or entire PDF documents.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['rotate pdf', 'flip pdf', 'pdf orientation', 'turn pdf pages'],
    relatedSlugs: ['organize-pdf', 'watermark-pdf', 'merge-pdf'],
    seo: {
      title: 'Rotate PDF — Rotate PDF Pages Free Online | AWE-OS',
      description: 'Rotate PDF pages 90° or 180°. Fix orientation of PDF documents. 100% free, browser-based PDF rotator.',
    },
  },
  {
    slug: 'watermark-pdf',
    name: 'Add Watermark to PDF',
    category: 'pdf',
    subcategory: 'Edit PDF',
    icon: '💧',
    description: 'Add custom text watermarks to PDF pages.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['watermark pdf', 'pdf stamp', 'add watermark', 'brand pdf'],
    relatedSlugs: ['protect-pdf', 'rotate-pdf', 'page-numbers-pdf'],
    seo: {
      title: 'Add Watermark to PDF — Free PDF Watermark Tool | AWE-OS',
      description: 'Add text watermarks to PDF pages for free. Protect and brand your documents. Browser-based, no upload.',
    },
  },
  {
    slug: 'page-numbers-pdf',
    name: 'Add Page Numbers to PDF',
    category: 'pdf',
    subcategory: 'Edit PDF',
    icon: '🔢',
    description: 'Add page numbers to PDF pages with custom position and style.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['add page numbers to pdf', 'pdf numbering', 'pdf footer', 'pdf header'],
    relatedSlugs: ['watermark-pdf', 'organize-pdf', 'rotate-pdf'],
    seo: {
      title: 'Add Page Numbers to PDF — Free Online Tool | AWE-OS',
      description: 'Add automatic page numbers to PDF documents free. Choose position, style, and starting number.',
    },
  },

  // PDF Security
  {
    slug: 'protect-pdf',
    name: 'Protect PDF',
    category: 'pdf',
    subcategory: 'PDF Security',
    icon: '🔐',
    description: 'Password-protect a PDF to prevent unauthorized access.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['protect pdf', 'password protect pdf', 'encrypt pdf', 'secure pdf'],
    relatedSlugs: ['unlock-pdf', 'watermark-pdf', 'compress-pdf'],
    seo: {
      title: 'Protect PDF — Add Password to PDF Free Online | AWE-OS',
      description: 'Add password protection to any PDF file. Secure your documents with encryption. Free, browser-based.',
    },
  },
  {
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    category: 'pdf',
    subcategory: 'PDF Security',
    icon: '🔓',
    description: 'Remove password from a protected PDF document.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['unlock pdf', 'remove pdf password', 'decrypt pdf', 'open locked pdf'],
    relatedSlugs: ['protect-pdf', 'merge-pdf', 'compress-pdf'],
    seo: {
      title: 'Unlock PDF — Remove PDF Password Free Online | AWE-OS',
      description: 'Remove password from protected PDF files. Unlock PDF documents free online. No software needed.',
    },
  },

  // ── CALCULATORS ───────────────────────────────────────────────────────────

  {
    slug: 'fd-calculator',
    name: 'FD Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🏦',
    description: 'Calculate fixed deposit maturity amount, TDS on interest, and compare FD rates across SBI, HDFC, ICICI, Axis, Kotak, and Post Office. Also calculates RD returns.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['fd calculator', 'fixed deposit calculator', 'rd calculator', 'sbi fd', 'hdfc fd', 'tds on fd', 'fd interest calculator', 'india'],
    relatedSlugs: ['sip-calculator', 'loan-calculator', 'tax-calculator'],
    seo: {
      title: 'FD Calculator — Fixed Deposit & RD Calculator India | AWE-OS',
      description: 'Calculate FD maturity and TDS. Compare fixed deposit rates across SBI, HDFC, ICICI, Axis, Kotak and Post Office. Free FD & RD calculator for India.',
    },
  },

  {
    slug: 'ppf-calculator',
    name: 'PPF Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🏛️',
    description: 'Calculate PPF maturity amount, year-by-year interest growth, 80C tax savings, partial withdrawal eligibility, and 5-year extension projections.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['ppf calculator', 'public provident fund calculator', 'ppf interest calculator', 'ppf maturity calculator', 'ppf 80c deduction', 'ppf withdrawal', 'ppf extension', 'india tax saving'],
    relatedSlugs: ['fd-calculator', 'sip-calculator', 'tax-calculator'],
    seo: {
      title: 'PPF Calculator — Maturity & 80C Tax Savings India | AWE-OS',
      description: 'Calculate PPF maturity, 80C tax savings, and partial withdrawal eligibility. Year-by-year breakdown with 5-year extension. Free PPF calculator India.',
    },
  },

  {
    slug: 'sip-calculator',
    name: 'SIP Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '📊',
    description: 'Calculate SIP returns, lumpsum growth, and goal-based SIP amounts for Indian mutual funds. Compare returns at 8%, 12%, 15%, 18% with charts.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['sip calculator', 'sip return calculator', 'mutual fund calculator', 'lumpsum calculator', 'goal sip', 'india sip calculator'],
    relatedSlugs: ['roi-calculator', 'loan-calculator', 'tax-calculator'],
    seo: {
      title: 'SIP Calculator — SIP & Mutual Fund Returns India | AWE-OS',
      description: 'Calculate SIP returns, lumpsum growth and goal-based SIP for Indian mutual funds. Compare 8%, 12%, 15%, 18% returns with interactive charts. 100% free.',
    },
  },

  {
    slug: 'roi-calculator',
    name: 'ROI Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '📈',
    description: 'Calculate return on investment with detailed analysis, charts, and scenario comparisons.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['roi', 'investment', 'finance', 'calculator', 'return on investment', 'cagr', 'annualized roi'],
    relatedSlugs: ['loan-calculator', 'percentage-calculator', 'tax-calculator'],
    seo: {
      title: 'ROI Calculator — Return on Investment Calculator | AWE-OS',
      description: 'Free ROI calculator with charts. Calculate return on investment, annualized ROI (CAGR), and compare up to 3 investments. Instant, browser-based.',
    },
  },
  {
    slug: 'tax-calculator',
    name: 'Tax Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '📊',
    description: 'Calculate your income tax instantly for India (Old/New regime) and USA. Get slab-wise breakdown, effective tax rate, and TDS estimate.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['tax', 'income tax', 'ITR', 'tax calculator', 'TDS', 'finance', 'tax slab', 'new regime', 'old regime', 'US tax', 'federal tax'],
    relatedSlugs: ['loan-calculator', 'percentage-calculator', 'bmi-calculator'],
    seo: {
      title: 'Tax Calculator — India & US Income Tax Free | AWE-OS',
      description: 'Calculate India income tax (Old/New Regime, FY 2024-25) and US Federal tax. Slab breakdown, effective rate, TDS, regime comparison. Free, browser-based.',
    },
  },
  {
    slug: 'bmi-calculator',
    name: 'BMI Calculator',
    category: 'calculators',
    subcategory: 'Health',
    icon: '⚖️',
    description: 'Calculate your Body Mass Index with metric or imperial measurements.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['bmi calculator', 'body mass index', 'bmi chart', 'weight calculator', 'health calculator'],
    relatedSlugs: ['age-calculator', 'percentage-calculator', 'loan-calculator'],
    seo: {
      title: 'BMI Calculator — Body Mass Index Calculator Free | AWE-OS',
      description: 'Calculate your BMI instantly with our free online BMI calculator. Supports metric (cm/kg) and imperial (ft/lb) units with visual scale.',
    },
  },
  {
    slug: 'age-calculator',
    name: 'Age Calculator',
    category: 'calculators',
    subcategory: 'Health',
    icon: '🎂',
    description: 'Calculate exact age in years, months, and days from any date of birth.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['age calculator', 'birthday calculator', 'date of birth', 'how old am i', 'age from dob'],
    relatedSlugs: ['bmi-calculator', 'percentage-calculator'],
    seo: {
      title: 'Age Calculator — Calculate Exact Age Free Online | AWE-OS',
      description: 'Calculate exact age in years, months, and days from any date of birth. Free, instant age calculator online.',
    },
  },
  {
    slug: 'loan-calculator',
    name: 'Loan EMI Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🏦',
    description: 'Calculate monthly EMI for home, car, and personal loans with amortization schedule.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['loan calculator', 'emi calculator', 'mortgage calculator', 'interest calculator', 'monthly payment'],
    relatedSlugs: ['percentage-calculator', 'bmi-calculator'],
    seo: {
      title: 'Loan EMI Calculator — Monthly Payment & Amortization | AWE-OS',
      description: 'Calculate monthly EMI for any loan. Get a complete amortization schedule. Free, instant loan calculator.',
    },
  },
  {
    slug: 'percentage-calculator',
    name: 'Percentage Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '📊',
    description: 'Calculate percentages, percentage change, and percentage of total.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['percentage calculator', 'percent of number', 'percentage change', 'increase decrease percentage'],
    relatedSlugs: ['loan-calculator', 'gpa-calculator', 'bmi-calculator'],
    seo: {
      title: 'Percentage Calculator — Calculate Percent Free | AWE-OS',
      description: 'Calculate any percentage instantly. Percentage of total, percentage change, increase and decrease calculations.',
    },
  },
  {
    slug: 'gst-calculator',
    name: 'GST Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🧾',
    description: 'Calculate GST for any rate — add or extract tax with CGST, SGST, and IGST breakdown for Indian businesses.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['gst calculator', 'gst india', 'cgst sgst calculator', 'igst calculator', 'tax calculator india', 'gst add extract'],
    relatedSlugs: ['tax-calculator', 'percentage-calculator', 'invoice-generator'],
    seo: {
      title: 'GST Calculator — Add or Extract GST with CGST SGST IGST | AWE-OS',
      description: 'Calculate GST for any rate slab: 0%, 5%, 12%, 18%, 28%. Add or extract GST with CGST+SGST or IGST breakdown. Free online GST calculator for India.',
    },
  },
  {
    slug: 'tip-calculator',
    name: 'Tip Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '💰',
    description: 'Calculate tip amount and split the bill equally among any number of people.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['tip calculator', 'bill splitter', 'gratuity calculator', 'restaurant tip', 'split bill'],
    relatedSlugs: ['discount-calculator', 'percentage-calculator', 'gst-calculator'],
    seo: {
      title: 'Tip Calculator — Calculate Tip & Split Bill Free Online | AWE-OS',
      description: 'Calculate tip percentage and split the restaurant bill among any number of people. Free online tip and bill-splitting calculator.',
    },
  },
  {
    slug: 'discount-calculator',
    name: 'Discount Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🏷️',
    description: 'Find the final price, savings amount, and discount percentage for any sale price.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['discount calculator', 'sale price calculator', 'percent off calculator', 'mrp discount india', 'savings calculator'],
    relatedSlugs: ['percentage-calculator', 'gst-calculator', 'tip-calculator'],
    seo: {
      title: 'Discount Calculator — Calculate Sale Price & Savings Free | AWE-OS',
      description: 'Calculate final price, savings amount, and discount percentage. Great for MRP discounts and e-commerce deals. Free online discount calculator.',
    },
  },
  {
    slug: 'gpa-calculator',
    name: 'GPA Calculator',
    category: 'calculators',
    subcategory: 'Education',
    icon: '🎓',
    description: 'Calculate your GPA from course grades and credit hours.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['gpa calculator', 'grade point average', 'college gpa', 'academic calculator', 'grade calculator'],
    relatedSlugs: ['percentage-calculator', 'age-calculator'],
    seo: {
      title: 'GPA Calculator — Calculate Grade Point Average Free | AWE-OS',
      description: 'Calculate your GPA from course grades and credit hours. Supports weighted and unweighted GPA. Free online tool.',
    },
  },

  // ── CONVERTERS ────────────────────────────────────────────────────────────

  {
    slug: 'unit-converter',
    name: 'Unit Converter',
    category: 'converters',
    subcategory: 'Unit Conversion',
    icon: '📐',
    description: 'Convert between units of length, weight, temperature, speed, and more.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['unit converter', 'length converter', 'weight converter', 'temperature converter', 'metric imperial'],
    relatedSlugs: ['word-counter', 'percentage-calculator'],
    seo: {
      title: 'Unit Converter — Length, Weight & Temperature Free | AWE-OS',
      description: 'Convert between all units of measurement. Length, weight, temperature, speed, volume, and more. Free online unit converter.',
    },
  },
  {
    slug: 'word-counter',
    name: 'Word Counter',
    category: 'converters',
    subcategory: 'Text Tools',
    icon: '📝',
    description: 'Count words, characters, sentences, and estimate reading time instantly.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['word counter', 'character counter', 'word count tool', 'reading time calculator', 'text analyzer'],
    relatedSlugs: ['password-generator', 'unit-converter'],
    seo: {
      title: 'Word Counter — Count Words & Characters Free Online | AWE-OS',
      description: 'Count words, characters, sentences, and estimate reading time instantly. Free online word and character counter.',
    },
  },
  {
    slug: 'password-generator',
    name: 'Password Generator',
    category: 'converters',
    subcategory: 'Text Tools',
    icon: '🔐',
    description: 'Generate strong, secure, random passwords with custom rules.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['password generator', 'strong password', 'random password', 'secure password', 'password maker'],
    relatedSlugs: ['word-counter', 'qr-code-generator'],
    seo: {
      title: 'Password Generator — Generate Strong Passwords Free | AWE-OS',
      description: 'Generate strong, secure, random passwords. Customize length, character sets, and complexity. 100% free.',
    },
  },
  {
    slug: 'color-picker',
    name: 'Color Picker',
    category: 'converters',
    subcategory: 'Design Tools',
    icon: '🎨',
    description: 'Pick colors and convert between HEX, RGB, and HSL formats.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['color picker', 'hex to rgb', 'rgb to hex', 'hsl converter', 'color converter', 'color code'],
    relatedSlugs: ['image-compressor', 'qr-code-generator'],
    seo: {
      title: 'Color Picker — HEX, RGB & HSL Color Converter Free | AWE-OS',
      description: 'Pick and convert colors between HEX, RGB, and HSL formats. Free online color picker and converter tool.',
    },
  },
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    category: 'converters',
    subcategory: 'File Tools',
    icon: '⬛',
    description: 'Generate QR codes for URLs, text, contacts, and more. Download as PNG.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['qr code generator', 'qr code maker', 'create qr code', 'free qr code', 'qr barcode'],
    relatedSlugs: ['image-compressor', 'password-generator', 'jpg-to-pdf'],
    seo: {
      title: 'QR Code Generator — Create QR Codes Free Online | AWE-OS',
      description: 'Generate QR codes for URLs, text, WiFi, contacts, and more. Download as PNG. 100% free QR code creator.',
    },
  },
  {
    slug: 'image-compressor',
    name: 'Image Compressor',
    category: 'converters',
    subcategory: 'File Tools',
    icon: '🖼️',
    description: 'Compress JPG, PNG, and WEBP images without losing quality.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['image compressor', 'compress image', 'reduce image size', 'jpg compressor', 'png optimizer'],
    relatedSlugs: ['jpg-to-pdf', 'qr-code-generator', 'color-picker'],
    seo: {
      title: 'Image Compressor — Compress JPG & PNG Free Online | AWE-OS',
      description: 'Compress images without losing quality. Reduce JPG, PNG, WEBP file sizes instantly in your browser.',
    },
  },
  {
    slug: 'currency-converter',
    name: 'Currency Converter',
    category: 'converters',
    subcategory: 'Finance Tools',
    icon: '💱',
    description: 'Convert between INR and 14 major currencies with instant results and exchange rate display.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['currency converter', 'inr to usd', 'rupee to dollar', 'forex calculator', 'exchange rate india', 'currency exchange'],
    relatedSlugs: ['gst-calculator', 'percentage-calculator', 'unit-converter'],
    seo: {
      title: 'Currency Converter — INR to USD, EUR, AED & More | AWE-OS',
      description: 'Convert Indian Rupee to USD, EUR, GBP, AED, SGD and 10 more currencies. Free online currency converter with live exchange rate display.',
    },
  },
  {
    slug: 'base-converter',
    name: 'Number Base Converter',
    category: 'converters',
    subcategory: 'Data Tools',
    icon: '🔢',
    description: 'Convert numbers between decimal, binary, octal, and hexadecimal instantly.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['base converter', 'binary decimal converter', 'hex converter', 'octal converter', 'number system converter'],
    relatedSlugs: ['json-formatter', 'unit-converter', 'csv-to-json'],
    seo: {
      title: 'Number Base Converter — Binary, Decimal, Hex, Octal Free | AWE-OS',
      description: 'Convert numbers between decimal, binary, octal and hexadecimal instantly. Free online number base converter for programmers and students.',
    },
  },
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    category: 'converters',
    subcategory: 'Data Tools',
    icon: '{ }',
    description: 'Validate, pretty-print, and minify JSON instantly — with syntax error detection.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['json formatter', 'json validator', 'json beautifier', 'json minifier', 'json parser', 'pretty print json'],
    relatedSlugs: ['csv-to-json', 'base-converter', 'word-counter'],
    seo: {
      title: 'JSON Formatter — Validate, Format & Minify JSON Free | AWE-OS',
      description: 'Validate, pretty-print and minify JSON online for free. Instant syntax error detection and formatting. No upload required.',
    },
  },
  {
    slug: 'csv-to-json',
    name: 'CSV to JSON',
    category: 'converters',
    subcategory: 'File Tools',
    icon: '🔄',
    description: 'Convert CSV files to JSON format instantly in your browser.',
    isFeatured: false,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['csv to json', 'csv converter', 'json converter', 'data converter', 'file format converter'],
    relatedSlugs: ['unit-converter', 'word-counter', 'password-generator'],
    seo: {
      title: 'CSV to JSON Converter — Convert CSV Files Free | AWE-OS',
      description: 'Convert CSV files to JSON format instantly in your browser. Free CSV to JSON converter — no upload needed.',
    },
  },

  // ── PRODUCTIVITY ──────────────────────────────────────────────────────────

  {
    slug: 'invoice',
    name: 'Invoice Generator',
    category: 'productivity',
    subcategory: 'Billing',
    icon: '🧾',
    description: 'Create professional GST invoices with live preview, PDF export, and client management. Free for Indian freelancers and businesses.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['invoice', 'gst', 'pdf', 'billing', 'freelancer', 'invoice generator', 'gst invoice'],
    relatedSlugs: ['tax-calculator', 'loan-calculator', 'percentage-calculator'],
    path: '/tools/invoice',
    seo: {
      title: 'Invoice Generator — Free GST Invoice Maker Online | AWE-OS',
      description: 'Create GST-compliant invoices with live preview and one-click PDF export. Free for Indian freelancers and small businesses. No sign-up required.',
    },
  },

  {
    slug: 'invoice-generator',
    name: 'Invoice Generator (Quick)',
    category: 'productivity',
    subcategory: 'Billing',
    icon: '📄',
    description: 'Create GST-compliant invoices with CGST, SGST, and IGST breakdown — download as PDF instantly. No account required.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['invoice generator', 'gst invoice maker', 'free invoice pdf', 'cgst sgst invoice', 'india invoice generator', 'freelancer invoice'],
    relatedSlugs: ['invoice', 'gst-calculator', 'tax-calculator'],
    seo: {
      title: 'Invoice Generator — Free GST Invoice PDF Maker | AWE-OS',
      description: 'Create GST-compliant invoices with CGST+SGST or IGST breakdown and download as PDF instantly. Free invoice generator for Indian freelancers — no sign-up.',
    },
  },
  {
    slug: 'contract-generator',
    name: 'Contract Generator',
    category: 'productivity',
    subcategory: 'Legal Tools',
    icon: '📝',
    description: 'Generate professional NDA, Service Agreement, and Employment contracts for Indian freelancers with GST/TDS compliance checks and instant PDF export.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['contract generator', 'nda india', 'service agreement', 'employment contract', 'freelance contract india', 'gst contract', 'tds freelance'],
    relatedSlugs: ['invoice', 'tax-calculator', 'percentage-calculator'],
    seo: {
      title: 'Contract Generator — Free Freelance Contracts India | AWE-OS',
      description: 'Generate professional NDA, Service Agreement and Employment contracts for Indian freelancers. GST/TDS compliance check and instant PDF download — free.',
    },
  },

  // ── AI TOOLS ──────────────────────────────────────────────────────────────

  {
    slug: 'resume-builder',
    name: 'AI Resume Builder',
    category: 'ai',
    subcategory: 'Career Tools',
    icon: '📄',
    description: 'Create professional, ATS-friendly resumes with AI assistance in minutes.',
    isFeatured: true,
    isNew: false,
    isPremium: false,
    comingSoon: false,
    tags: ['resume builder', 'ai resume', 'cv builder', 'ats resume', 'free resume maker', 'resume generator'],
    relatedSlugs: ['ai-content-writer'],
    seo: {
      title: 'AI Resume Builder — Create Professional Resume Free | AWE-OS',
      description: 'Build a professional, ATS-friendly resume with AI. Multiple templates, instant download. Free online resume builder.',
    },
  },
  {
    slug: 'ai-content-writer',
    name: 'AI Content Writer',
    category: 'ai',
    subcategory: 'Writing Tools',
    icon: '✍️',
    description: 'Generate blog posts, social captions, and ad copy with GPT-powered AI.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['ai content writer', 'ai writer', 'blog post generator', 'copywriting ai', 'content generator', 'gpt writer'],
    relatedSlugs: ['resume-builder'],
    seo: {
      title: 'AI Content Writer — Generate Blog Posts & Copy Free | AWE-OS',
      description: 'Write blog posts, social media captions, and ad copy with AI. GPT-powered content writer. Free to use.',
    },
  },
  {
  slug: 'test-ai-tool',
  name: 'Test AI Tool',
  category: 'ai',
  subcategory: 'Testing Tools',
  icon: '🤖',

  description: 'Test tool for verifying dynamic architecture system.',

  isFeatured: false,
  isNew: true,
  isPremium: false,
  comingSoon: false,

  tags: [
    'test ai tool',
    'architecture test',
    'dynamic routing',
    'tool registry',
    'ai testing'
  ],

  relatedSlugs: [
    'ai-content-writer',
    'resume-builder'
  ],

  seo: {
    title: 'Test AI Tool — Dynamic Architecture Verification | AWE-OS',
    description:
      'Internal architecture verification tool for testing dynamic routing and registry-based tool rendering.',
  },
},
]

// ── Slug aliases (old URL → current slug) ───────────────────────────────────
// Used by DynamicToolPage to redirect legacy URLs without 404s.
export const SLUG_ALIASES = {
  'image-to-pdf': 'jpg-to-pdf',
  'pdf-merger':   'merge-pdf',
  'emi-calculator': 'loan-calculator',
}

// ── Helper functions ─────────────────────────────────────────────────────────

/** Get full tool entry by slug (handles aliases). */
export const getToolBySlug = (slug) => {
  const canonical = SLUG_ALIASES[slug] || slug
  return TOOL_REGISTRY.find(t => t.slug === canonical) || null
}

/** All non-coming-soon tools. */
export const getAllTools = () => TOOL_REGISTRY.filter(t => !t.comingSoon)

/** All tools in a given category (non-coming-soon). */
export const getToolsByCategory = (categorySlug) =>
  TOOL_REGISTRY.filter(t => t.category === categorySlug && !t.comingSoon)

/** Category metadata object or null. */
export const getCategoryMeta = (categorySlug) =>
  CATEGORY_META[categorySlug] || null

/** All category keys. */
export const getAllCategories = () => Object.keys(CATEGORY_META)

/**
 * Related tools for a given tool entry.
 * Uses relatedSlugs first; falls back to same-category tools.
 */
export const getRelatedTools = (tool, limit = 5) => {
  if (!tool) return []
  if (tool.relatedSlugs?.length) {
    const resolved = tool.relatedSlugs
      .map(s => getToolBySlug(s))
      .filter(Boolean)
      .slice(0, limit)
    if (resolved.length) return resolved
  }
  return TOOL_REGISTRY
    .filter(t => t.category === tool.category && t.slug !== tool.slug && !t.comingSoon)
    .slice(0, limit)
}

/**
 * Grouped sections for a category — used by CategoryPage and Header mega-menu.
 * Returns [{ title, items: [{ icon, label, to, comingSoon }] }]
 */
export const getCatalogueSections = (categorySlug) => {
  const tools = TOOL_REGISTRY.filter(t => t.category === categorySlug)
  const grouped = tools.reduce((acc, t) => {
    const key = t.subcategory || 'Tools'
    if (!acc[key]) acc[key] = []
    acc[key].push({ icon: t.icon, label: t.name, to: `/tools/${t.slug}`, comingSoon: t.comingSoon })
    return acc
  }, {})
  return Object.entries(grouped).map(([title, items]) => ({ title, items }))
}

/**
 * Convert a registry entry to the ToolCard-compatible shape.
 * category is normalized to legacy keys (ai_tools, converters, calculators, pdf).
 */
export const toolToCardShape = (tool) => ({
  id:          tool.slug,
  slug:        tool.slug,
  name:        tool.name,
  icon:        tool.icon,
  description: tool.description,
  category:    tool.category === 'ai' ? 'ai_tools' : tool.category,
  isNew:       tool.isNew,
  isFeatured:  tool.isFeatured,
})

/** Schema.org applicationCategory string for a tool. */
export const getApplicationCategory = (tool) => {
  if (!tool) return 'UtilitiesApplication'
  const subcatMap = {
    'Health':       'HealthApplication',
    'Finance':      'FinanceApplication',
    'Education':    'EducationalApplication',
    'Career Tools': 'BusinessApplication',
    'Writing Tools':'BusinessApplication',
  }
  return subcatMap[tool.subcategory]
    || CATEGORY_META[tool.category]?.applicationCategory
    || 'UtilitiesApplication'
}
