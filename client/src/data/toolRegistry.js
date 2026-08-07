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
      body: 'AWE-OS PDF tools are free, browser-based utilities that handle every PDF task professionals and students face daily. From merging multiple documents into one file, to compressing oversized PDFs for email attachments, to converting between PDF and Word, Excel, JPG, and PowerPoint formats — all 20+ PDF tools work entirely in your browser. Your files never leave your device. No server upload, no account required, no watermarks on output files.\n\nIndian government portals, university submission systems, and corporate HR platforms all require PDF format for document submission. AWE-OS PDF tools are built specifically for these workflows — compress a PDF to meet a 2MB portal limit, protect a sensitive document with a password before emailing it, or extract specific pages from a large report without downloading any software. Every tool works on Windows, macOS, Android, and iOS in any modern browser.\n\nThe tools use pdf-lib, a pure JavaScript PDF library that processes your files locally. This means zero privacy risk — your contracts, tax documents, salary slips, and personal documents never touch any external server. Processing happens at hardware speed in your browser, typically completing in under 5 seconds for files up to 50MB.',
      whyTitle: 'Why use AWE-OS PDF Tools?',
      whyPoints: [
        '100% browser-based — files never leave your device',
        'No account required — open and use instantly',
        'Supports all PDF versions including password-protected files',
        'Works on Windows, macOS, Android, and iOS',
        'No watermarks added to any output file',
        'Free with no usage limits or file count restrictions',
      ],
      faqs: [
        { q: 'Are AWE-OS PDF tools completely free?', a: 'Yes. Every PDF tool on AWE-OS is free to use with no usage limits, no watermarks, and no file size restrictions for standard operations. No account or subscription is required.' },
        { q: 'Are my PDF files safe when using these tools?', a: 'Completely safe. All PDF processing happens locally in your browser using the pdf-lib JavaScript library. Your files are never uploaded to any server and are permanently discarded when you close the browser tab.' },
        { q: 'Do AWE-OS PDF tools work on mobile phones?', a: 'Yes. All PDF tools are fully responsive and work on Android and iOS browsers including Chrome, Firefox, Safari, and Edge. No app download or installation required.' },
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
      heading: 'Free Online Calculators — Built for India',
      body: 'AWE-OS financial and health calculators are designed specifically for Indian users — using Indian number formats (₹ symbol, lakh and crore notation), Indian regulatory standards (SEBI, RBI, ICMR), and Indian-specific scenarios like SIP investments, PPF accounts, GST calculations, and income tax under both Old and New regimes.\n\nEach calculator runs instantly in your browser with no signup required. The SIP Calculator uses AMFI-standard compound interest formulas and shows returns at 8%, 12%, 15%, and 18% rates with a year-by-year chart. The Income Tax Calculator covers FY 2025-26 slabs for both regimes, the PPF Calculator shows 15-year maturity with withdrawal eligibility, and the FD Calculator compares rates across SBI, HDFC, ICICI, Axis, and Post Office.\n\nFor health, the BMI Calculator applies ICMR thresholds (overweight at 23, not 25 as per Western standards) alongside WHO standards — making it accurate for Indian body types. The Loan EMI Calculator covers home loans, car loans, and personal loans with a complete amortisation schedule showing exactly how much of each EMI goes to principal versus interest.',
      whyTitle: 'Why use AWE-OS Calculators?',
      whyPoints: [
        'Built for Indian users — ₹ format, lakh/crore notation',
        'Uses SEBI, RBI, AMFI, and ICMR standards',
        'FY 2025-26 income tax slabs — Old and New regime',
        'Instant results with explanatory charts and tables',
        'All calculations happen in browser — no data stored',
        'No registration or app download required',
      ],
      faqs: [
        { q: 'Are these calculators accurate for Indian users?', a: 'Yes. All financial calculators use Indian standards — ₹ rupee format, lakh and crore notation, SEBI-specified SIP formulas, RBI PPF rate (7.1%), and FY 2025-26 income tax slabs for both Old and New regimes. The BMI Calculator applies ICMR thresholds (overweight at BMI 23) rather than the Western WHO standard of 25.' },
        { q: 'Do the calculators store my financial data?', a: 'No. All calculations happen entirely in your browser. Your income, investment amounts, loan details, and health data are never sent to any server. When you close the browser tab, all data is permanently discarded.' },
        { q: 'Can I use these calculators on my mobile phone?', a: 'Yes. All calculators are mobile-optimised and work on Android and iOS in Chrome, Firefox, Safari, and Edge. No app download required. Results, charts, and tables are all readable on small screens.' },
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
      body: 'AWE-OS converter and generator tools handle the everyday conversion tasks that professionals, students, and developers encounter across formats and measurement systems. The Unit Converter covers length, weight, temperature, speed, and area — including Indian-specific units like bigha, marla, and gunta for land measurement alongside standard metric and imperial units. The Currency Converter shows live INR exchange rates against 14 major currencies.\n\nThe QR Code Generator creates print-ready QR codes for URLs, plain text, contact cards, and WiFi credentials — downloaded as high-resolution PNG suitable for business cards, menus, and packaging. The Password Generator uses cryptographically secure randomness (window.crypto.getRandomValues) to create passwords that meet NIST guidelines for length and character diversity.\n\nThe JSON Formatter validates and pretty-prints JSON instantly — detecting syntax errors with line-specific error messages. The Word Counter tracks words, characters, sentences, paragraphs, and reading time in real time — useful for UPSC answer limits, LinkedIn posts, and academic word count requirements.',
      whyTitle: 'Why use AWE-OS Converters?',
      whyPoints: [
        'No file uploads — all processing happens in your browser',
        'Includes Indian units: bigha, marla, gunta, tola for land and gold',
        'Live INR exchange rates for 14 major currencies',
        'Cryptographically secure password generation (NIST-compliant)',
        'Mobile-friendly — works on any device and browser',
        'Free with no usage limits or registration required',
      ],
      faqs: [
        { q: 'Are generated passwords stored anywhere?', a: 'No. Passwords are generated locally using your browser\'s cryptographic random number generator (window.crypto.getRandomValues). They are never transmitted to any server and are discarded when you close the tab.' },
        { q: 'How accurate is the currency converter?', a: 'The Currency Converter uses live exchange rate data updated regularly. Rates reflect the mid-market rate. For critical financial transactions, always verify with your bank\'s official rates as banks add a markup of 2-4%.' },
        { q: 'Do converter tools work offline?', a: 'Most converters (unit, percentage, base, word counter) work fully offline once loaded. The currency converter requires an internet connection for live rates.' },
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
      heading: 'Free Productivity Tools for Freelancers & Indian Businesses',
      body: 'AWE-OS productivity tools are built for Indian freelancers, consultants, and small businesses who need professional documents without expensive software subscriptions. The Invoice Generator creates GST-compliant invoices with CGST, SGST, and IGST breakdown — mandatory for registered businesses under India\'s GST framework. Download invoices as PDF instantly, with no account or subscription.\n\nThe Contract Generator produces legally-structured NDA, Service Agreement, and Employment Contract templates with Indian law references and GST/TDS compliance provisions — covering the most common agreements freelancers and agencies need when onboarding clients. The AI Resume Builder creates ATS-optimised, single-column resumes using action verbs and quantified achievements, exported directly to PDF in a format compatible with Naukri.com, LinkedIn, and major corporate ATS systems.\n\nThe productivity tools suite is especially valuable for India\'s rapidly growing freelance economy — with over 15 million gig workers on platforms like Upwork, Fiverr, and Freelancer.com. A professionally formatted invoice with GSTIN, HSN codes, and correct IGST breakdown signals credibility and ensures both GST compliance and faster payment from clients. The NDA template provides legal protection when sharing proprietary information during client proposals, a step that solo operators frequently overlook. The Service Agreement template establishes clear deliverables, payment milestones, and intellectual property ownership — avoiding the disputes that plague informal freelance engagements.\n\nAll productivity tools work fully offline once loaded and save draft data locally in your browser. Return to an in-progress invoice or contract without losing your work. Export final documents as PDF directly from the browser — ready to email, sign digitally, or upload to client portals.',
      whyTitle: 'Why use AWE-OS Productivity Tools?',
      whyPoints: [
        'GST-compliant invoicing — CGST, SGST, IGST breakdown included',
        'No subscription — free for freelancers and small businesses',
        'PDF export in one click — ready to email or upload to portals',
        'No watermarks on any exported document',
        'Draft auto-saved in browser — return and continue anytime',
        'No account required — open and start working immediately',
      ],
      faqs: [
        { q: 'Are the invoice and contract templates legally valid in India?', a: 'The templates follow Indian GST framework structure and standard commercial contract conventions. For legally binding agreements in complex situations, consult a qualified lawyer. The templates are suitable for routine freelance and business transactions.' },
        { q: 'Is the AI Resume Builder ATS-compatible?', a: 'Yes. The resume builder generates single-column, plainly formatted resumes with standard section headings — the format that ATS systems parse most reliably. No decorative elements, tables, or graphics that confuse automated scanners.' },
        { q: 'Can I save invoices for repeated use?', a: 'The Invoice Generator saves client details locally in your browser for repeated use. No cloud account is needed — your business name, GSTIN, and bank details auto-fill each time you create a new invoice.' },
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
      heading: 'Free AI-Powered Tools — Resume, Content & More',
      body: 'AWE-OS AI tools use GPT-powered models to handle content creation and document generation tasks that previously required expensive software or professional services. Both tools are free to use with no account required — the AI processing runs on the backend and returns results directly in the browser.\n\nThe AI Content Writer generates structured blog posts, social media captions, ad copy, and product descriptions in seconds. Specify the topic, tone, target audience, and word count — the AI produces a structured draft with headings, bullet points, and a conclusion. Use it to accelerate content production, not replace editing: review the output, add your own expertise, and publish when it meets your standards.\n\nThe AI Resume Builder takes your raw experience — job titles, responsibilities, achievements — and rewrites it using industry action verbs and quantified accomplishments. The five-step form guides you through personal details, work experience, education, skills, and generation. Output is a clean PDF ready for immediate submission.\n\nFor Indian freelancers and content creators, the AI Content Writer removes the blank-page problem. Whether you are writing a product description for a Meesho listing, a LinkedIn post for professional branding, or an article for a digital marketing agency — the tool produces a structured first draft in under 30 seconds that you can refine and publish. It handles English content optimised for Indian professional audiences, understanding the local business and cultural context.\n\nFor job seekers on Naukri.com, LinkedIn, and company career portals, the AI Resume Builder addresses one of the most common obstacles — knowing how to present experience convincingly. Many talented Indian professionals undervalue their work history by writing weak descriptions. The AI transforms generic phrasing into achievement-focused language with metrics and impact statements — the format that ATS systems and hiring managers consistently respond to best.',
      whyTitle: 'Why use AWE-OS AI Tools?',
      whyPoints: [
        'Powered by GPT-4 — state-of-the-art AI language model',
        'ATS-optimised resume output for Naukri.com and LinkedIn',
        'No technical knowledge required — guided step-by-step',
        'Free tier available — no credit card required',
        'Outputs are editable and exportable as PDF',
        'Your inputs are never stored or used to train AI models',
      ],
      faqs: [
        { q: 'Is the AI content original and plagiarism-free?', a: 'AI-generated content is original in the sense that it is not copied from any specific source. However, always review AI output before publishing — verify facts, add your own expertise, and ensure the content meets your quality standards.' },
        { q: 'What AI model powers these tools?', a: 'AWE-OS AI tools use GPT-based language models for content generation. The models are accessed via API — your inputs are processed to generate the response and are not stored or used to train future models.' },
        { q: 'Are there usage limits on the AI tools?', a: 'AWE-OS AI tools are free with standard fair-use limits. No subscription is required for regular use. Heavy or automated use may be subject to rate limiting.' },
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

  {
    slug: 'pdf-editor',
    name: 'PDF Editor',
    description: 'Edit PDFs online free — add text, draw, highlight, sign, and annotate PDF files instantly in your browser.',
    category: 'pdf',
    subcategory: 'Edit PDF',
    icon: '✏️',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['pdf editor', 'edit pdf', 'annotate pdf', 'pdf annotator', 'sign pdf', 'fill pdf form'],
    relatedSlugs: ['watermark-pdf', 'protect-pdf', 'merge-pdf'],
    seo: {
      title: 'PDF Editor — Edit PDF Online Free | AWE-OS',
      description: 'Free online PDF editor. Add text, draw, highlight, sign and annotate PDF files in your browser. No upload, no signup.',
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
      title: 'Online EMI Calculator — Personal, Home & Car Loan | AWE-OS',
      description: 'Calculate personal, home & car loan EMI online — instant monthly payment, interest breakdown & full amortization schedule. 100% free.',
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

  {
    slug: 'hra-calculator',
    name: 'HRA Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🏠',
    description: 'Calculate your HRA tax exemption under Section 10(13A) — compares actual HRA received, 50%/40% of basic salary, and rent paid minus 10% of basic to find your exempt amount.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['hra calculator', 'house rent allowance', 'section 10(13a)', 'hra exemption india', 'hra tax exemption calculator'],
    relatedSlugs: ['tax-calculator', 'gst-calculator', 'percentage-calculator'],
    seo: {
      title: 'HRA Calculator — House Rent Allowance Exemption India | AWE-OS',
      description: 'Calculate your HRA tax exemption under Section 10(13A). Compares all 3 conditions — actual HRA, 50%/40% of basic salary, and rent minus 10% of basic. Free HRA calculator for India.',
    },
  },

  {
    slug: 'nps-calculator',
    name: 'NPS Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '🧓',
    description: 'Calculate your National Pension System (NPS) retirement corpus, tax-free lump sum withdrawal, and monthly pension based on contribution, expected returns, and annuity rate.',
    isFeatured: false,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['nps calculator', 'national pension system', 'nps returns calculator', 'nps maturity calculator', 'nps pension calculator india'],
    relatedSlugs: ['ppf-calculator', 'sip-calculator', 'tax-calculator'],
    seo: {
      title: 'NPS Calculator — Pension, Annuity & Returns (India) | AWE-OS',
      description: 'Calculate NPS pension, annuity payout, tax-free lump sum & retirement corpus — for govt employees & private investors. Free NPS calculator for India.',
    },
  },

  {
    slug: 'capital-gains-calculator',
    name: 'Capital Gains Calculator',
    category: 'calculators',
    subcategory: 'Finance',
    icon: '📈',
    description: 'Calculate capital gains tax on equity, debt mutual funds, real estate, and gold — FY 2025-26 rates per Finance Act 2024, with STCG/LTCG classification and effective tax rate.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['capital gains calculator india', 'ltcg stcg calculator', 'capital gains tax 2025', 'equity capital gains calculator', 'property capital gains india'],
    relatedSlugs: ['tax-calculator', 'sip-calculator', 'roi-calculator'],
    seo: {
      title: 'LTCG & STCG Calculator — Capital Gains Tax India 2025 | AWE-OS',
      description: 'Calculate capital gains tax on mutual funds, equity, property & gold with indexation — FY 2025-26 rates. LTCG/STCG classification & net profit. Free for India.',
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
      title: 'QR Code Generator Free — UPI, WhatsApp, Business Cards | AWE-OS',
      description: 'Generate QR codes free for UPI payment, WhatsApp, URL, text and business cards. Download as PNG instantly. No signup, works in browser.',
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
      title: 'Image Compressor — Compress JPG, PNG Free Online India | AWE-OS',
      description: 'Compress JPG, PNG and WEBP images free online. Reduce file size without losing quality. No upload to server, works in browser. Free, no signup.',
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

  {
    slug: 'text-editor',
    name: 'Online Text Editor',
    category: 'productivity',
    subcategory: 'Document Tools',
    icon: '📝',
    description: 'A free, browser-based rich text editor — format documents and export as .txt, .html, or .docx. No upload, no account.',
    isFeatured: true,
    isNew: true,
    isPremium: false,
    comingSoon: false,
    tags: ['online text editor', 'free word processor online', 'ms word alternative free', 'online document editor', 'rich text editor online india'],
    relatedSlugs: ['pdf-editor', 'word-to-pdf', 'invoice', 'word-counter'],
    seo: {
      title: 'Online Text Editor — Free Word Processor Online | AWE-OS',
      description: 'Free online text editor and word processor. Format, tabulate, and export documents as .txt, .html, or .docx — 100% browser-based, no upload, no sign-up.',
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
    isPremium: true,
    comingSoon: false,
    tags: ['resume builder', 'ai resume', 'cv builder', 'ats resume', 'resume maker', 'resume generator'],
    relatedSlugs: ['ai-content-writer', 'word-to-pdf', 'word-counter', 'protect-pdf'],
    seo: {
      title: 'AI Resume Builder — Create a Professional Resume | AWE-OS',
      description: 'Build a professional, ATS-friendly resume with AI. Multiple templates, instant download. Free account required; pay-per-use or Pro plan for generation.',
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
    isPremium: true,
    comingSoon: false,
    tags: ['ai content writer', 'ai writer', 'blog post generator', 'copywriting ai', 'content generator', 'gpt writer'],
    relatedSlugs: ['resume-builder', 'word-counter', 'word-to-pdf', 'contract-generator'],
    seo: {
      title: 'AI Content Writer — Generate Blog Posts & Copy | AWE-OS',
      description: 'Write blog posts, social media captions, and ad copy with AI. GPT-powered content writer. Free account required; pay-per-use or Pro plan for generation.',
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
