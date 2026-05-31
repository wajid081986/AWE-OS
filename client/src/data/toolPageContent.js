/**
 * Shared SEO content (about text) for tool pages.
 * Imported by both the React page components (for the visible UI)
 * and by scripts/prerender.js (to inject into static HTML for crawlers).
 *
 * Keys match tool slugs from toolRegistry.js.
 */

export const TOOL_ABOUT = {
  'merge-pdf': [
    "AWE-OS Merge PDF is a free, browser-based tool that combines multiple PDF documents into a single file instantly. It is built for professionals, students, and everyday users who regularly work with multi-part documents — contract annexures, research paper appendices, scanned invoice sets, or multi-chapter reports that need to be submitted as one file.",
    "The tool uses pdf-lib, a pure JavaScript PDF manipulation library, to merge files entirely within your browser. This means zero server uploads, zero privacy risk, and zero waiting time for file transfers. Processing speed depends on your device hardware and the total file size — modern laptops typically merge 10 files in under 3 seconds.",
    "Page order control is built in. Before merging, you can drag file cards to rearrange the order of entire documents. For finer control over individual page order within each document, use the Organize PDF tool after merging. The ↑↓ arrow controls and drag handles work on both desktop and mobile browsers.",
    "AWE-OS Merge PDF works on all modern browsers including Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge — on Windows, macOS, Android, and iOS. No software installation, no browser extension, and no account registration is required. The tool is free to use with no watermarks added to the output file.",
  ],

  'bmi-calculator': {
    description: "AWE-OS BMI Calculator is a free online tool that instantly computes your Body Mass Index from height and weight inputs in either metric (cm/kg) or imperial (ft/lb) units. It is designed for Indian and South Asian users who need both the standard WHO BMI thresholds and the stricter Asian-specific thresholds recommended by the ICMR (Indian Council of Medical Research) and Asia-Pacific clinical guidelines, which set the overweight cutoff at BMI 23 rather than the Western standard of 25. The calculator uses the WHO formula — weight in kg divided by height in metres squared — and displays results with a colour-coded scale showing Underweight, Normal weight, Overweight, and Obese categories. Imperial inputs are automatically converted to metric before calculation. BMI is a widely used population screening tool, but does not differentiate between fat mass and muscle mass, nor account for abdominal obesity patterns common in South Asians. Always consult a qualified doctor for personalised health assessment.",
    features: [
      "Supports both metric (cm, kg) and imperial (ft, in, lb) unit inputs with automatic conversion",
      "Displays both WHO global thresholds and ICMR Asian-specific thresholds side by side",
      "Colour-coded BMI scale: Underweight (<18.5), Normal (18.5–22.9), Overweight (23–27.4), Obese (≥27.5) for Asian populations",
      "Instant calculation with no page reload — results appear as you type",
      "Includes health guidance notes based on ICMR and Asia-Pacific clinical guidelines",
      "Works offline once loaded — no internet connection needed for calculation",
    ],
    useCases: [
      "Individuals tracking their weight and health status for general awareness and annual health check-ups",
      "Fitness enthusiasts and gym-goers monitoring progress alongside their workout and diet programmes",
      "Parents and teachers checking BMI-for-age percentiles for children in school health programmes",
      "Healthcare students and professionals needing a quick reference tool for patient screening discussions",
    ],
    howToUse: [
      "Select your preferred unit system — Metric (cm and kg) or Imperial (feet, inches, and pounds)",
      "Enter your height in the appropriate fields — for metric, enter centimetres; for imperial, enter feet and inches separately",
      "Enter your weight — kilograms for metric, or pounds for imperial",
      "Click 'Calculate BMI' to see your result with the category label and colour indicator",
      "Review both the WHO and ICMR thresholds shown below your result to understand the Indian-specific risk levels",
    ],
    whyUseUs: [
      "India-specific ICMR thresholds shown alongside global WHO thresholds — most BMI calculators only show Western cutoffs, missing the clinically relevant 23 overweight threshold for South Asians",
      "100% browser-based and private — your height and weight data is never sent to any server and is discarded when you close the tab",
      "Free, instant, and mobile-friendly with no account required — use it on any device without installation",
    ],
    faqs: [
      { q: "What is a healthy BMI for Indians?", a: "According to ICMR and Asia-Pacific guidelines, a BMI of 18.5–22.9 is considered Normal weight for South Asians. A BMI of 23–27.4 is classified as Overweight, and 27.5 or above is Obese. These thresholds are stricter than the global WHO cutoffs (Overweight at 25, Obese at 30) because research shows Indians carry more visceral (abdominal) fat at lower BMI values, which increases the risk of diabetes and cardiovascular disease at a lower body weight than in Western populations." },
      { q: "Does BMI accurately reflect health for all body types?", a: "BMI has recognised limitations. It does not differentiate between fat mass and lean muscle mass, so athletes with high muscle mass may be misclassified as Overweight or Obese. It also does not account for fat distribution — waist circumference and waist-to-hip ratio are additional important indicators, especially for Indians who tend to accumulate abdominal fat. BMI should be used as one of several screening indicators alongside blood glucose, lipid panel, blood pressure, and waist measurement." },
      { q: "Is this tool a substitute for medical advice?", a: "No. The AWE-OS BMI Calculator is intended for general health awareness and informational purposes only. It is not a medical device and cannot diagnose any health condition. If you are concerned about your weight, BMI category, or overall health, please consult a qualified doctor, dietitian, or registered nutritionist who can evaluate your complete health profile." },
    ],
  },

  'sip-calculator': {
    description: "AWE-OS SIP Calculator is a free online tool for Indian investors to estimate the future value of Systematic Investment Plan (SIP) contributions in mutual funds. It supports three calculation modes — standard SIP (monthly investment to corpus), Lumpsum (one-time investment growth), and Goal-Based (required monthly SIP to reach a target amount) — making it suitable for a wide range of investment planning scenarios from retirement savings to children's education funds. The calculator uses the standard compound interest formula endorsed by AMFI (Association of Mutual Funds in India): FV = P × [(1 + r)^n – 1] ÷ r × (1 + r), where monthly compounding reflects rupee-cost averaging. Results include Total Invested, Estimated Returns, and Final Corpus alongside a year-by-year growth chart and a rate sensitivity table comparing outcomes at 8%, 12%, 15%, and 18% annual returns. SIP projections assume constant annual returns and full reinvestment. As mandated by SEBI, mutual fund investments are subject to market risks and past performance does not guarantee future returns. Consult a SEBI-registered investment advisor before making investment decisions.",
    features: [
      "Three calculation modes: SIP (monthly to corpus), Lumpsum (one-time growth), and Goal-Based (target-to-monthly SIP)",
      "Year-by-year corpus growth chart with area visualization for easy trend understanding",
      "Rate sensitivity table comparing results at 8%, 12%, 15%, and 18% annual returns simultaneously",
      "Displays Total Invested, Estimated Returns, and Final Corpus in Indian number format (lakhs/crores)",
      "Supports investment horizons from 1 to 40 years and monthly amounts from ₹500 upward",
      "SEBI-compliant disclaimer and AMFI-aligned formula for accurate mutual fund projections",
    ],
    useCases: [
      "Salaried professionals planning monthly SIP contributions for retirement corpus calculation over 20–30 year horizons",
      "Parents calculating the monthly SIP amount required today to fund their child's higher education in 15–18 years",
      "First-time investors in India comparing equity mutual fund SIP growth against FD and PPF alternatives",
      "NRIs planning lumpsum investments in Indian mutual funds through NRE/NRO accounts for wealth creation",
    ],
    howToUse: [
      "Select your calculation mode: 'SIP' for monthly investment to corpus, 'Lumpsum' for one-time investment, or 'Goal' to find required monthly SIP for a target",
      "Enter the relevant amount — monthly investment for SIP, principal for Lumpsum, or target corpus for Goal mode",
      "Set the investment duration in years and the expected annual return rate (historical long-term equity mutual fund returns in India: 12–15%)",
      "Click 'Calculate' to see the corpus breakdown with Total Invested, Returns Earned, and Final Corpus",
      "Review the year-by-year growth chart and rate sensitivity table to understand how different return scenarios affect your corpus",
    ],
    whyUseUs: [
      "Three calculation modes in one tool — most SIP calculators only offer standard SIP; our Goal-Based mode helps you work backwards from a target corpus, which is essential for goal-based financial planning",
      "Rate sensitivity table shows corpus at 8%, 12%, 15%, and 18% simultaneously — no need to recalculate manually for different market scenarios",
      "India-first design: Indian number formatting (₹ lakhs and crores), AMFI-aligned formula, SEBI-mandated disclaimers, and a return range calibrated to Indian mutual fund historical data",
    ],
    faqs: [
      { q: "What annual return rate should I use for SIP calculation in India?", a: "For long-term equity mutual fund SIPs (10+ years), Indian markets have historically delivered 12–15% CAGR. Large-cap funds have averaged 10–12%, mid-cap funds 13–16%, and small-cap funds 14–18% over 15-year periods, though with higher volatility. Conservative investors can use 8–10% for debt-oriented or balanced funds. It is prudent to run projections at 10%, 12%, and 15% to understand the range of outcomes, which is why our rate sensitivity table shows all four scenarios simultaneously." },
      { q: "Is SIP better than a Fixed Deposit (FD) for long-term savings in India?", a: "For long-term goals (7+ years), equity mutual fund SIPs have historically outperformed FDs significantly. A 15-year SIP at 12% grows more than twice as fast as an FD at 6.5–7%. However, SIP returns are market-linked and not guaranteed, while FD returns are fixed and guaranteed by the bank (up to ₹5 lakh per bank per depositor under DICGC insurance). SIPs are suitable for wealth creation goals where you can tolerate short-term market volatility. FDs are better for capital preservation and short-term goals." },
      { q: "How much SIP should I start with as a beginner in India?", a: "SEBI and AMFI allow SIP investments starting from ₹100–₹500 per month, depending on the fund. A common beginner rule is to invest at least 20% of your monthly income in SIPs. For example, on a ₹50,000 monthly salary, a ₹10,000 SIP in a diversified equity mutual fund started at age 25 and continued for 30 years at 12% annual returns would grow to approximately ₹3.5 crore — nearly 29× the total invested amount of ₹36 lakh. Start with whatever you can afford consistently and increase by 10–15% every year using the Step-Up SIP feature offered by most AMCs." },
    ],
  },

  'pdf-editor': {
    whatIsIt: 'AWE-OS PDF Editor is a free browser-based tool that lets you edit, annotate, and sign PDF files without uploading to any server. Open any PDF, add text boxes, draw freehand, highlight passages, insert rectangles, circles, arrows, sticky notes, images, and hand-drawn or typed signatures — then download the finished file instantly. Everything runs in your browser; your documents never leave your device.',
    howToUse: [
      'Click "Open PDF" or drag your PDF file into the editor — all pages are rendered as a scrollable canvas',
      'Select an annotation tool from the toolbar: Text, Draw, Highlight, Rectangle, Circle, Arrow, Line, Sticky Note, Image, or Signature',
      'Click or drag on any page to place or draw your annotation; drag to reposition, use corner handles to resize',
      'Use the page panel on the left to reorder, rotate, or delete individual pages',
      'Click "Download PDF" to save the fully annotated PDF to your device — no account required',
    ],
    whyUseUs: [
      '100% browser-based — your PDF is never uploaded to any server, keeping sensitive documents fully private',
      '10 annotation tools including freehand draw, highlight, sticky notes, shapes, arrows, and signature capture',
      'Drag, resize, and delete any annotation after placing it — full edit control at every step',
      'Undo/redo up to 20 steps so you can experiment without fear of making permanent mistakes',
      'Free with no watermarks, no file size limits, and no account registration required',
    ],
    faqs: [
      { q: 'Is the PDF Editor free to use?', a: 'Yes. AWE-OS PDF Editor is completely free — no account, no watermark, and no usage limits.' },
      { q: 'Is my PDF file safe when editing online?', a: 'Yes. All editing happens locally in your browser using JavaScript (PDF.js and pdf-lib). Your PDF is never uploaded to any server and is permanently discarded when you close the tab. This makes it safe to use with Aadhaar cards, bank statements, salary slips, contracts, and other sensitive documents.' },
      { q: 'Can I sign a PDF with this tool?', a: 'Yes. Select the Signature tool, then either draw your signature with a mouse or touchscreen, or type your name and choose a script font. Place the signature anywhere on the page, resize it, and download. The signature is embedded as an image in the final PDF.' },
      { q: 'Does the PDF Editor work on mobile?', a: 'Yes. The editor is responsive and works on Android and iOS in Chrome, Firefox, Safari, and Edge. Touch drawing and tap-to-place annotations are fully supported.' },
      { q: 'Can I reorder or delete pages?', a: 'Yes. The left sidebar shows thumbnail previews of all pages. Drag thumbnails to reorder pages, or use the rotate and delete icons on each thumbnail. Page changes are reflected in the downloaded PDF.' },
    ],
  },

  'compress-pdf': {
    whatIsIt: 'AWE-OS Compress PDF is a free, browser-based tool that reduces the file size of PDF documents without uploading them to any server. It is designed for Indian users who regularly hit file size limits on government portals (income tax portal, DigiLocker, university admission systems), email attachments, and WhatsApp document sharing — where limits of 2MB or 25MB are commonly enforced.',
    howToUse: [
      'Open the Compress PDF tool and click "Select PDF" or drag your file into the drop zone',
      'Choose a compression level — Medium is recommended for most documents, High for very large files',
      'Click "Compress PDF" and wait a few seconds for processing to complete in your browser',
      'Review the file size reduction shown, then click "Download" to save the compressed file',
    ],
    whyUseUs: [
      '100% free — no watermarks, no file limits, no hidden charges',
      'Private — your PDF is processed locally in your browser, never uploaded to any server',
      'No signup required — open and use instantly on any browser',
      'Works on Windows, macOS, Android, and iOS',
    ],
    faqs: [
      { q: 'Is Compress PDF free to use?', a: 'Yes. The AWE-OS PDF compressor is completely free with no usage limits, no watermarks, and no account required.' },
      { q: 'Is my PDF file safe when compressing online?', a: 'Yes. All compression happens locally in your browser using JavaScript. Your PDF is never uploaded to any server and is permanently discarded when you close the browser tab. This is especially important for sensitive documents like salary slips, bank statements, and tax returns.' },
      { q: 'Does Compress PDF work on mobile?', a: 'Yes. The tool works on Android and iOS in Chrome, Firefox, Safari, and Edge. No app download required.' },
      { q: 'How much will my PDF be compressed?', a: 'Compression results depend on the original content. PDFs with many high-resolution images typically compress by 60–80%. Text-heavy PDFs such as legal documents or reports usually compress by 20–40%. The tool shows the original and compressed file sizes so you can see the reduction before downloading.' },
    ],
  },

  'jpg-to-pdf': {
    whatIsIt: 'AWE-OS JPG to PDF converts JPEG and PNG images into a single PDF document entirely in your browser. It is widely used in India for creating a single PDF from multiple scanned documents (Aadhaar, PAN, marksheets), combining photos of handwritten notes for college submission, and consolidating multiple image receipts into one PDF for expense reporting or GST documentation.',
    howToUse: [
      'Click "Add Images" or drag JPEG, JPG, or PNG files into the tool — multiple files are supported',
      'Reorder images by dragging them into the correct sequence',
      'Select page size (A4 is standard for Indian documents) and orientation',
      'Click "Convert to PDF" and download the generated PDF immediately — no account needed',
    ],
    whyUseUs: [
      '100% free — no watermarks on the PDF output, no file count limits',
      'Private — images are converted locally in your browser, never uploaded to any server',
      'No signup required — works instantly without registration',
      'Supports batch conversion — combine multiple images into one PDF in one step',
    ],
    faqs: [
      { q: 'Is JPG to PDF free?', a: 'Yes. Completely free with no limits on number of images or conversions.' },
      { q: 'Are my images safe?', a: 'All processing happens in your browser. Images are never uploaded to any server, making it safe for Aadhaar scans, PAN cards, and other sensitive documents.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge. You can upload photos directly from your phone gallery.' },
      { q: 'What is the maximum number of images I can convert?', a: 'There is no enforced limit on the number of images. However, very large batches (50+ high-resolution images) may be slow depending on your device. For best results, combine images in batches of 10–20 if you have many files to process.' },
    ],
  },

  'pdf-to-jpg': {
    whatIsIt: 'AWE-OS PDF to JPG converts every page of a PDF into separate JPEG image files directly in your browser. It is commonly used to extract images from product catalogues, convert scanned PDF documents into shareable image format for WhatsApp, and prepare PDF slides as images for social media posts or presentations.',
    howToUse: [
      'Click "Select PDF" or drag your PDF file into the tool',
      'Choose the output image quality — High produces larger, clearer images; Medium is sufficient for most uses',
      'Click "Convert to JPG" — each PDF page is converted to a separate image',
      'Download individual page images or click "Download All" to get a ZIP file with all pages',
    ],
    whyUseUs: [
      '100% free — no watermarks, unlimited pages, no hidden charges',
      'Private — PDF pages are rendered locally using PDF.js, never uploaded to any server',
      'No signup required — open and convert instantly',
      'Download all pages as a ZIP file in one click',
    ],
    faqs: [
      { q: 'Is PDF to JPG free?', a: 'Yes. Completely free with no page limit and no watermarks on output images.' },
      { q: 'Is my PDF safe?', a: 'All conversion happens locally in your browser using PDF.js. Your file is never sent to any server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS browsers. Large PDFs may be slower on older mobile devices.' },
      { q: 'What image quality does the output have?', a: 'The tool offers three quality settings. High quality renders at 200 DPI — sharp enough for printing and detailed review. Medium (150 DPI) is suitable for screen viewing and document sharing. Low quality produces smaller file sizes suitable for quick previews and WhatsApp sharing where file size matters more than sharpness.' },
    ],
  },

  'word-to-pdf': {
    whatIsIt: 'AWE-OS Word to PDF converts .docx Microsoft Word documents into PDF format directly in your browser — no Microsoft Office installation required. It is essential for Indian job applications (most companies require PDF resumes), government form submissions (which mandate PDF uploads), university assignments, and client-facing documents that must retain their formatting across different devices and operating systems.',
    howToUse: [
      'Click "Select Word File" or drag your .docx file into the tool',
      'The tool automatically processes the document — no settings required for standard conversions',
      'Review the PDF preview to verify that formatting and layout are correct',
      'Click "Download PDF" to save the converted file to your device',
    ],
    whyUseUs: [
      '100% free — no Microsoft Office required, no account needed',
      'Private — document conversion happens in your browser, file never uploaded to external servers',
      'No signup required — convert instantly without registration',
      'Preserves formatting including fonts, tables, headers, and embedded images',
    ],
    faqs: [
      { q: 'Is Word to PDF conversion free?', a: 'Yes. Completely free with no conversion limits and no watermarks on the output PDF.' },
      { q: 'Is my document safe?', a: 'All conversion happens locally in your browser. Your Word document, which may contain sensitive business or personal information, is never uploaded to any external server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS browsers without any app install. You can upload .docx files from your phone storage or cloud drives like Google Drive.' },
      { q: 'Will the formatting be preserved exactly?', a: 'The converter preserves standard Word formatting including fonts, paragraph styles, tables, headings, and images. Documents using standard fonts (Calibri, Arial, Times New Roman) and basic formatting convert reliably. Very complex layouts with custom fonts, advanced text effects, or intricate table structures may have minor differences. Always review the PDF preview before downloading.' },
    ],
  },

  'split-pdf': {
    whatIsIt: 'AWE-OS Split PDF extracts specific pages or page ranges from a PDF document and saves them as a new, smaller PDF — entirely in your browser without uploading to any server. It is commonly used to extract a single chapter from an academic textbook, separate individual invoices from a combined monthly statement, extract a specific form from a multi-page government document, or share only the relevant section of a large report.',
    howToUse: [
      'Upload your PDF by clicking "Select PDF" or dragging the file into the tool',
      'Enter the page range you want to extract — for example, "1-5" for the first 5 pages or "3,7,12" for individual pages',
      'Click "Split PDF" to generate the new document with only your selected pages',
      'Download the resulting PDF immediately — no account or signup required',
    ],
    whyUseUs: [
      '100% free — no limits on page count or number of splits',
      'Private — PDF processing happens locally in your browser, files never uploaded',
      'No signup required — use immediately without registration',
      'Supports both page range extraction and individual page selection',
    ],
    faqs: [
      { q: 'Is Split PDF free?', a: 'Yes. Completely free with no limits on the size of the PDF or the number of times you split.' },
      { q: 'Is my PDF safe when splitting online?', a: 'All splitting happens locally in your browser. Your PDF, which may contain confidential content, is never uploaded to any server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in modern browsers without any app download.' },
      { q: 'Can I extract non-consecutive pages?', a: 'Yes. You can enter individual page numbers separated by commas (e.g., "1,5,9") to extract non-consecutive pages into a single PDF. You can also combine ranges and individual pages: "1-3,7,10-12" extracts pages 1 through 3, page 7, and pages 10 through 12 into one document.' },
    ],
  },

  'rotate-pdf': {
    whatIsIt: 'AWE-OS Rotate PDF fixes the orientation of PDF pages that are sideways or upside down — entirely in your browser without uploading to any server. Scanned documents often have incorrect orientations when the paper was placed at an angle in the scanner. This tool lets you rotate individual pages or the entire document by 90°, 180°, or 270° and download the corrected PDF instantly.',
    howToUse: [
      'Upload your PDF by clicking "Select PDF" or dropping the file into the tool',
      'Select which pages to rotate — all pages, or specific page numbers',
      'Choose the rotation direction: 90° clockwise, 90° counter-clockwise, or 180°',
      'Click "Rotate PDF" and download the corrected file with fixed orientation',
    ],
    whyUseUs: [
      '100% free — no limits, no watermarks on the corrected PDF',
      'Private — pages are rotated locally in your browser, file never uploaded',
      'No signup required — fix rotation instantly without an account',
      'Rotate individual pages or the entire document in one step',
    ],
    faqs: [
      { q: 'Is Rotate PDF free?', a: 'Yes. Free with no usage limits and no watermarks on the output.' },
      { q: 'Is my PDF safe?', a: 'All rotation processing happens locally in your browser. Your file is never transmitted to any server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS browsers including Chrome, Firefox, Safari, and Edge.' },
      { q: 'Can I rotate only specific pages in a multi-page PDF?', a: 'Yes. The tool lets you specify individual pages (e.g., page 3 only) or ranges (e.g., pages 1–5) to rotate, leaving all other pages in their original orientation. This is useful when a scanned document has a mix of correctly-oriented and rotated pages.' },
    ],
  },

  'watermark-pdf': {
    whatIsIt: 'AWE-OS Watermark PDF adds text watermarks to PDF documents directly in your browser. Text watermarks are commonly used to mark documents as CONFIDENTIAL, DRAFT, SAMPLE, or DO NOT COPY — protecting shared documents in corporate, legal, and academic contexts. Indian businesses frequently watermark client proposals, rate cards, and contract drafts before sharing them over email or WhatsApp.',
    howToUse: [
      'Upload your PDF by clicking "Select PDF" or dragging the file into the tool',
      'Enter the watermark text (e.g., "CONFIDENTIAL" or "DRAFT") and choose font size, colour, and opacity',
      'Set the watermark position — diagonal across the page is standard for most professional uses',
      'Click "Add Watermark" and download the watermarked PDF immediately',
    ],
    whyUseUs: [
      '100% free — no limits on pages or documents watermarked',
      'Private — watermarking happens locally in your browser, PDF never uploaded',
      'No signup required — use immediately without registration',
      'Customisable text, opacity, colour, and position',
    ],
    faqs: [
      { q: 'Is Watermark PDF free?', a: 'Yes. Completely free with no page limits and no secondary watermark added by AWE-OS.' },
      { q: 'Is my PDF safe?', a: 'All watermarking happens locally in your browser. Your confidential documents are never uploaded to any external server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'Can I remove a watermark I added?', a: 'A watermark added by this tool is embedded into the PDF page content and cannot be easily removed without specialist PDF editing software. Always keep the original un-watermarked file and watermark only the copies you share with clients or external parties.' },
    ],
  },

  'protect-pdf': {
    whatIsIt: 'AWE-OS Protect PDF adds password protection to PDF documents directly in your browser, requiring anyone who opens the file to enter the password you set. It is used by Indian professionals to secure salary slips before WhatsApp sharing, protect bank statements shared with landlords or loan applications, and restrict access to confidential business documents and client agreements sent over email.',
    howToUse: [
      'Upload your PDF by clicking "Select PDF" or dragging the file into the tool',
      'Enter the password you want to set — use a strong password of at least 8 characters',
      'Optionally restrict permissions such as printing or copying of the PDF content',
      'Click "Protect PDF" and download the password-protected file immediately',
    ],
    whyUseUs: [
      '100% free — no limits on document size or number of files protected',
      'Private — password encryption happens locally in your browser, PDF never uploaded',
      'No signup required — protect documents instantly without registration',
      'Uses AES-128 encryption — the standard recognised by PDF viewers worldwide',
    ],
    faqs: [
      { q: 'Is Protect PDF free?', a: 'Yes. Completely free with no watermarks and no limits on file size or number of documents you protect.' },
      { q: 'Is my PDF safe when adding password protection online?', a: 'All encryption happens locally in your browser. The PDF and your chosen password are never transmitted to any server. This is critical for sensitive documents — no external party ever sees your file or password.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge without any app download.' },
      { q: 'What happens if I forget the password?', a: 'Password-protected PDFs cannot be opened without the correct password. There is no master password or recovery option built into the PDF standard. If you forget the password, the document is permanently inaccessible. Always store passwords for important documents in a password manager. We recommend using a memorable but strong password for documents you will need to access again in the future.' },
    ],
  },

  'unlock-pdf': {
    whatIsIt: 'AWE-OS Unlock PDF removes password protection from a PDF document you already own, allowing it to be opened freely without entering a password each time. It is designed for users who have the password to their own document but want to remove the restriction — common with bank-issued statements, salary slips, and credit card PDFs that are automatically password-protected with your date of birth or account number.',
    howToUse: [
      'Upload your password-protected PDF by clicking "Select PDF" or dragging the file',
      'Enter the current password that unlocks the document',
      'Click "Unlock PDF" — the tool removes the password restriction from the file',
      'Download the unlocked PDF, which can now be opened without entering a password',
    ],
    whyUseUs: [
      '100% free — no limits on file size or number of PDFs unlocked',
      'Private — unlocking happens locally in your browser, PDF and password never uploaded',
      'No signup required — remove password protection instantly',
      'Works on PDFs issued by Indian banks including HDFC, ICICI, SBI, and Axis',
    ],
    faqs: [
      { q: 'Is Unlock PDF free?', a: 'Yes. Completely free with no limits and no watermarks on the unlocked PDF.' },
      { q: 'Is this legal?', a: 'Removing password protection from PDFs you own and have the password for is legal. This tool is designed for users who have legitimate access to the document. It should not be used to access documents you are not authorised to view.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'Why do Indian banks send password-protected PDFs?', a: 'Indian banks such as HDFC, ICICI, SBI, Axis, and Kotak typically protect emailed account statements and credit card PDFs with the account holder\'s date of birth (in DDMMYYYY format) or a combination of PAN and date of birth. This is a basic security measure so that if the email is intercepted, the statement cannot be read without the account holder\'s personal details. Once you have verified the content, removing the password using a browser-based tool is safe and convenient for long-term document storage.' },
    ],
  },

  'image-compressor': {
    description: 'AWE-OS Image Compressor reduces the file size of JPEG, PNG, and WebP images directly in your browser without uploading them to any server. It is essential for Indian users who need to compress profile photos for government portals (passport applications, college admissions, UPSC exam registrations), product images for e-commerce listings on Amazon India and Flipkart, and images shared on WhatsApp where large files load slowly on mobile data connections. The tool provides a real-time side-by-side preview showing the original and compressed image quality alongside exact file sizes, so you can fine-tune the quality slider before downloading. With a recommended starting point of 80% quality, most images reduce by 60–80% in size with minimal perceptible quality loss. The compressor works entirely within your browser using the HTML5 Canvas API — no files are ever sent to a remote server, making it completely private and safe for sensitive personal photographs and identity documents.',
    features: [
      'Supports JPEG, PNG, and WebP image formats with output in JPEG for maximum compression',
      'Adjustable quality slider from 10% to 100% with real-time preview of quality and file size changes',
      'Side-by-side before/after comparison showing original and compressed file sizes in KB/MB',
      'Batch compression — compress multiple images in sequence without page reload',
      'Works entirely offline once the page loads — no internet required for compression',
      'No file size limit — handles high-resolution DSLR photos, product shots, and scanned documents',
    ],
    useCases: [
      'Students and job seekers compressing passport-size photos to meet government portal file size limits (typically under 50KB or 100KB)',
      'E-commerce sellers on Amazon India and Flipkart optimising product images to improve page load speed and meet platform upload limits',
      'WhatsApp users reducing large photo files to send faster on mobile data connections without significant quality loss',
      'Web developers and designers optimising images for websites and mobile apps to improve Core Web Vitals and loading performance',
    ],
    howToUse: [
      'Click "Upload Image" or drag your JPEG, PNG, or WebP image into the drop zone',
      'Adjust the quality slider — 80% is the recommended starting point for most use cases',
      'Compare the before and after file sizes shown in the preview panel',
      'Move the slider lower if you need a smaller file, or higher to preserve more detail',
      'Click "Download" to save the compressed image to your device — no account needed',
    ],
    whyUseUs: [
      'Live side-by-side preview lets you see exactly what you are getting before downloading — no guessing about final quality unlike tools that compress first and show you afterwards',
      '100% browser-based and private — your images including personal photos and identity documents are never uploaded to any server and are discarded when you close the tab',
      'Free with no file size limits, no watermarks on output, and no account or signup required — works on any device instantly',
    ],
    faqs: [
      { q: 'What quality setting should I use for government portal uploads?', a: 'For government portal profile photo uploads (passport applications, UPSC, SSC, bank exam registrations): use 80–85% quality to maintain facial clarity while meeting the typical 50KB–100KB file size limits. For scanned document uploads (marksheets, certificates): use 85–90% to keep text readable. Always check the specific portal\'s requirements for file size, dimensions, and format before compressing.' },
      { q: 'Is my image safe when compressing online on AWE-OS?', a: 'Yes. All compression happens locally in your browser using the HTML5 Canvas API. Your images — including personal photos, product images, and identity documents — are never uploaded to any server and are permanently discarded when you close the browser tab. This makes AWE-OS Image Compressor safe for Aadhaar card photos, PAN card scans, and other sensitive documents.' },
      { q: 'Does Image Compressor work on mobile phones?', a: 'Yes. The tool works on Android and iOS in Chrome, Firefox, Safari, and Edge. You can upload images directly from your phone\'s camera roll or gallery. On mobile, we recommend compressing one image at a time for best performance. The quality slider is touch-friendly and the download works directly to your device storage.' },
    ],
  },

  'qr-code-generator': {
    description: 'AWE-OS QR Code Generator creates scannable QR codes for URLs, plain text, phone numbers, email addresses, and contact cards (vCard) — entirely in your browser with no signup required. QR codes are widely used across India for UPI payment links (Google Pay, PhonePe, Paytm), restaurant digital menus, business card contact sharing, product packaging traceability, and event or conference registrations linking to Google Forms or registration portals. The generator uses the qrcode.js library to render QR codes locally in your browser at high resolution, so the output PNG is suitable for both print and digital use. You can select the error correction level (Low, Medium, Quartile, or High) — High is recommended for printed QR codes that may get partially damaged or dirty. Generated QR codes are immediately downloadable as PNG images at up to 1024×1024 pixels, sharp enough for business cards, menus, posters, and product packaging.',
    features: [
      'Five QR code types: URL/Link, Plain Text, Phone Number, Email Address, and Contact Card (vCard format)',
      'Four error correction levels: Low (7%), Medium (15%), Quartile (25%), and High (30%) — High recommended for printed codes',
      'Adjustable output size from 128×128 to 1024×1024 pixels for use on screen, cards, and print',
      'Download as a high-resolution PNG image suitable for business cards, menus, and poster printing',
      'Instant generation — QR code updates in real time as you type content',
      'Foreground and background colour customisation for brand-consistent QR codes',
    ],
    useCases: [
      'Business owners and restaurants creating QR codes for UPI payment links (Google Pay/PhonePe) and digital menus for contactless ordering',
      'Freelancers and professionals adding a vCard QR code to business cards so contacts can save phone and email with a single scan',
      'Event organisers creating QR codes for registration forms, entry tickets, and session links at conferences and exhibitions',
      'E-commerce sellers adding product traceability QR codes to packaging that link to authenticity pages, user manuals, or warranty registration',
    ],
    howToUse: [
      'Select the QR code type from the dropdown: URL, Text, Phone, Email, or Contact Card (vCard)',
      'Enter the content — paste a URL, type a phone number with country code (+91 for India), or fill in the contact card fields',
      'Choose the error correction level — use High for QR codes that will be printed on paper or packaging',
      'Adjust the output size and optionally customise the foreground colour for brand matching',
      'Click "Generate QR Code" and download the PNG — scan it immediately with your phone camera to verify it works before printing',
    ],
    whyUseUs: [
      'Five content types in one tool — most free QR generators only support URLs; our generator handles vCard contacts and phone numbers natively without workarounds',
      'High error correction (30%) available for printed QR codes that must survive being partially damaged, dirty, or placed on curved surfaces like bottles and packaging',
      '100% browser-based and private — the URL, phone number, or contact details you encode are never sent to any server, critical for business data privacy',
    ],
    faqs: [
      { q: 'Is QR Code Generator free to use?', a: 'Yes. Completely free with no account required, no watermarks on generated QR codes, and no limit on how many QR codes you generate. There are no expiry dates on QR codes created with this tool — a URL-based QR code remains scannable for as long as the destination URL works.' },
      { q: 'What size should I use for a printed QR code?', a: 'For business cards: a minimum print size of 2cm × 2cm is recommended (use High error correction). For restaurant menus and table tents: 4cm × 4cm or larger for reliable scanning from 30–50cm distance. For A4 posters and flyers: 6cm × 6cm minimum. For outdoor signage and banners: 10cm × 10cm minimum to allow scanning from 1–2 metres away. Always test-scan the printed QR code before mass printing — lighting, print quality, and surface texture can affect scannability.' },
      { q: 'Will my QR code expire?', a: 'QR codes generated by AWE-OS do not expire — there is no AWE-OS server involved in the generation or tracking. However, if your QR code contains a URL, it will stop working if the destination URL is deleted, the domain expires, or the page returns a 404 error. For long-term use (product packaging, signage), consider using a URL shortener service that allows redirect updates so you can change the destination without reprinting the QR code.' },
    ],
  },

  'password-generator': {
    description: 'AWE-OS Password Generator creates cryptographically secure passwords using your browser\'s built-in random number generator (window.crypto.getRandomValues) — not a predictable mathematical formula. Generated passwords meet NIST SP 800-63B guidelines for length, character diversity, and randomness. Use it to create strong passwords for your income tax portal login, EPFO/UAN account, DigiLocker, net banking accounts at SBI/HDFC/ICICI, and any other account where a weak or reused password could cause financial or identity harm. The tool supports custom length from 8 to 128 characters and lets you include or exclude uppercase letters, lowercase letters, digits, and special characters to meet any site\'s password policy. All passwords are generated locally in your browser tab — they are never transmitted to any server, never logged, and permanently discarded when you close or refresh the page.',
    features: [
      'Cryptographically secure generation using window.crypto.getRandomValues — not the predictable Math.random()',
      'Adjustable password length from 8 to 128 characters with a recommended default of 16',
      'Character type controls: uppercase letters (A–Z), lowercase letters (a–z), digits (0–9), and special characters (!@#$%^&*)',
      'Strength meter showing entropy bits so you can see exactly how strong the generated password is',
      'One-click copy to clipboard for instant pasting without risk of typing errors',
      'Bulk generation — generate multiple passwords at once for setting up multiple accounts simultaneously',
    ],
    useCases: [
      'Salaried employees and students creating strong passwords for government portals like income tax e-filing, EPFO UAN, DigiLocker, and NPS accounts',
      'Professionals setting up new accounts on banking portals (SBI Net Banking, HDFC NetBanking, ICICI iMobile) where weak passwords risk financial loss',
      'IT administrators and developers generating secure API keys, temporary passwords, and service account credentials during system setup',
      'Individuals replacing weak or reused passwords across multiple accounts following a data breach notification or security audit',
    ],
    howToUse: [
      'Set the password length using the slider — 16 characters is the recommended minimum for sensitive accounts; use 20+ for banking and email',
      'Select the character types to include — enable all four (uppercase, lowercase, digits, special characters) for maximum strength',
      'Click "Generate Password" to create a new secure password — the strength meter shows the entropy in bits',
      'Click the "Copy" button to copy the password to your clipboard, then immediately paste it into the password field',
      'Store the password in a password manager (such as Bitwarden, free and open-source) before closing the tab — it will not be recoverable afterwards',
    ],
    whyUseUs: [
      'Cryptographically secure randomness — uses window.crypto.getRandomValues which is the browser\'s hardware-backed random number generator, not the guessable Math.random() used by many online generators',
      'Strength meter showing entropy bits gives you a quantifiable security measure, not just a vague "Weak/Strong" label — 60+ bits of entropy is good, 80+ bits is excellent for most purposes',
      '100% private — passwords are generated in your browser tab and never transmitted to any server, never logged, and permanently gone when you close the tab',
    ],
    faqs: [
      { q: 'How long should my password be?', a: 'NIST\'s 2024 guidelines (SP 800-63B) recommend a minimum of 15 characters for standard accounts and 20 characters for high-value accounts such as email, banking, and government portals. Length matters more than complexity — a 20-character password of mixed types is far stronger than a short but complex 8-character one. A 16-character random password (with all character types) has approximately 105 bits of entropy and would take hundreds of thousands of years to brute-force with current hardware.' },
      { q: 'Are the generated passwords stored anywhere?', a: 'No. Passwords are generated entirely within your browser tab using JavaScript and are never transmitted to any server. They exist only in your browser\'s memory until you navigate away or close the tab. AWE-OS has no server-side component for this tool and cannot see, log, or recover any generated password. For this reason, copy the password to a password manager immediately — once you close the tab, it is permanently gone.' },
      { q: 'Which password manager should I use to store generated passwords?', a: 'Bitwarden is recommended — it is free, open-source, end-to-end encrypted, and available on Windows, macOS, Android, and iOS. KeePass is a good offline-only alternative. For Indian bank accounts, use a password manager rather than the browser\'s built-in save feature, since browser-saved passwords are accessible to any other website or extension that can access your browser profile. Enable two-factor authentication (2FA) on your password manager account for an additional layer of security.' },
    ],
  },

  'word-counter': {
    whatIsIt: 'AWE-OS Word Counter tracks word count, character count, sentence count, paragraph count, and estimated reading time in real time as you type or paste text. It is used by students writing essays with strict word limits, UPSC and competitive exam candidates checking answer length, content writers billing by word count, and LinkedIn and Twitter users formatting posts within platform character limits.',
    howToUse: [
      'Type or paste your text into the text area — all counts update in real time instantly',
      'Check the word count, character count (with and without spaces), sentence count, and paragraph count',
      'Use the reading time estimate for blog posts and articles to verify expected reader engagement time',
      'Clear the text box and paste new content to count different documents',
    ],
    whyUseUs: [
      '100% free — no limits on text length, no account required',
      'Private — text is processed locally in your browser, never sent to any server',
      'Real-time counting — all metrics update instantly as you type or paste',
      'Multiple metrics: words, characters, sentences, paragraphs, and reading time',
    ],
    faqs: [
      { q: 'Is Word Counter free?', a: 'Yes. Completely free with no character limits and no account required.' },
      { q: 'Is my text stored anywhere?', a: 'No. All counting happens locally in your browser. Your text is never sent to any server and is discarded when you close the tab. This makes it safe for confidential documents, legal drafts, and business reports.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'How does the reading time estimate work?', a: 'Reading time is calculated at 200 words per minute — the average adult reading speed for comprehension of standard prose. Academic and technical texts are typically read at 150–180 wpm, so the estimate may be slightly optimistic for complex content. For a blog post targeting a "5-minute read" label, aim for 900–1000 words. For UPSC Mains, the guideline of approximately 150–200 words per 10-mark answer translates to about 1–1.5 minutes of reading time for the examiner.' },
    ],
  },

  'currency-converter': {
    whatIsIt: 'AWE-OS Currency Converter shows live INR exchange rates against 14 major currencies including USD, EUR, GBP, AED, SGD, CAD, AUD, JPY, CHF, HKD, SEK, NOK, NZD, and CNY. It is used by Indian professionals receiving international payments, NRIs sending remittances, students applying for foreign university courses, and travellers checking exchange rates before converting cash or booking hotels abroad.',
    howToUse: [
      'Select the source currency (e.g., INR) and the target currency (e.g., USD)',
      'Enter the amount you want to convert',
      'The converted amount updates instantly based on the latest exchange rate data',
      'Use the swap button to reverse the conversion direction in one click',
    ],
    whyUseUs: [
      '100% free — no fees, no account required, no limits on conversions',
      'Live rates — exchange rates are updated regularly for accuracy',
      'No signup required — check rates instantly without registration',
      'Covers 14 major currencies including INR, USD, EUR, GBP, and AED',
    ],
    faqs: [
      { q: 'Is Currency Converter free?', a: 'Yes. Completely free with no account required and no limits on conversions.' },
      { q: 'Is my data safe?', a: 'The currency converter only sends the rate request (currency codes) to retrieve exchange data. No personal or financial information is transmitted.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'How accurate are the exchange rates?', a: 'Rates are sourced from financial market data and updated regularly, closely reflecting the mid-market rate — the midpoint between the buy and sell prices banks use. However, the rates you actually receive when converting money depend on your provider: banks typically add a markup of 2–4% on top of the mid-market rate, while services like Wise or Remitly are generally closer to the mid-market rate with transparent fees. Use AWE-OS rates for reference and planning — always check your specific bank or remittance provider for the actual transaction rate.' },
    ],
  },

  'unit-converter': {
    whatIsIt: 'AWE-OS Unit Converter converts between measurement units across length, weight, temperature, speed, area, and volume — including Indian-specific units like bigha, marla, gunta, and cent for land area, and tola for gold weight. It is used for cooking recipes, school physics assignments, property research (square feet to bigha, acres to square metres), and international product specifications.',
    howToUse: [
      'Select the measurement category: length, weight, temperature, area, speed, or volume',
      'Choose the source unit and the target unit from the dropdown menus',
      'Enter the value to convert — the result updates instantly as you type',
      'Use the swap button to reverse the conversion direction',
    ],
    whyUseUs: [
      '100% free — no limits, no account required',
      'Includes Indian units: bigha, marla, gunta, cent, tola, and more',
      'Instant conversion — results update as you type with no delay',
      'Works offline once the page has loaded — no continuous internet required',
    ],
    faqs: [
      { q: 'Is Unit Converter free?', a: 'Yes. Completely free with no account required and no limits on conversions.' },
      { q: 'Is my data safe?', a: 'All conversions happen locally in your browser. No data is sent to any server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge. Results are optimised for mobile screens.' },
      { q: 'What Indian-specific units are supported?', a: 'For land area: the tool supports bigha (using the standard definition of 2529 sq metres common in UP, Bihar, and Rajasthan), marla (272.25 sq ft, used in Punjab and Haryana), gunta (1089 sq ft, used in Karnataka and Andhra Pradesh), and cent (435.6 sq ft, used in Tamil Nadu, Kerala, and Andhra Pradesh). For gold weight: tola (11.664 grams, the traditional Indian unit used by jewellers). Note that bigha varies significantly by state — always verify with local property registration records for legal transactions.' },
    ],
  },

  // ── NEW TOOLS ──────────────────────────────────────────────────────────────

  'gst-calculator': {
    description: 'AWE-OS GST Calculator is a free online tool that instantly computes Goods and Services Tax (GST) for any transaction in India. Introduced in July 2017, GST replaced a complex web of central and state taxes — VAT, service tax, excise duty, and octroi — with a unified four-slab indirect tax system at 0%, 5%, 12%, 18%, and 28%. The calculator supports both GST-exclusive mode (adding GST to a base price to find the total) and GST-inclusive mode (extracting the tax component from a final price that already includes GST). It automatically computes the CGST and SGST split for intra-state transactions (each is half the total GST rate) and the IGST amount for inter-state transactions. Results are displayed as a clean breakdown showing base amount, GST rate selected, CGST, SGST/IGST, and the final invoice amount — ready for use in GST-compliant invoices under the format mandated by the GSTN (Goods and Services Tax Network) for Indian financial year billing (April to March).',
    features: [
      'Supports all four GST slabs: 5%, 12%, 18%, and 28% plus the 0% exempt category',
      'GST-exclusive mode: add GST to a base price to calculate the total payable amount',
      'GST-inclusive mode: reverse-calculate to extract base price and GST from a GST-included total',
      'Automatic CGST and SGST split for intra-state supplies (each = GST rate ÷ 2)',
      'IGST calculation for inter-state transactions as per GST Act provisions',
      'Clean invoice-ready breakdown: base amount, GST %, CGST, SGST/IGST, and total — in Indian Rupee (₹) format',
    ],
    useCases: [
      'Small business owners and traders raising GST invoices for clients and needing accurate CGST/SGST breakdowns as required by GSTN',
      'Freelancers and consultants charging 18% GST on professional services who need to verify the tax amount before raising invoices',
      'Consumers and shoppers checking whether the GST charged on a bill is correct and corresponds to the applicable slab for that product or service',
      'Accounting students, CA inter students, and commerce graduates learning GST computation for examinations and practical training',
    ],
    howToUse: [
      'Enter the transaction amount in Indian Rupees (₹) — enter the base (pre-tax) price for GST-exclusive calculation, or the final price for GST-inclusive reverse calculation',
      'Select the applicable GST rate from the slab options: 0%, 5%, 12%, 18%, or 28%',
      'Choose the calculation mode: "Add GST" to compute tax on a base price, or "Remove GST" to extract tax from a GST-included amount',
      'Select the transaction type: Intra-state (within same state — CGST + SGST apply) or Inter-state (between different states — IGST applies)',
      'The calculator instantly displays the base amount, GST amount broken into CGST/SGST or IGST, and the final total — copy the values for your invoice',
    ],
    whyUseUs: [
      'Dual-mode calculation — both adding GST to a base price and reverse-extracting GST from an inclusive price in the same tool, which is essential for both invoicing and verifying bills received from vendors',
      'CGST/SGST/IGST automatic split — most basic GST calculators only show total GST; ours computes the correct split for both intra-state and inter-state transactions as required by the GST Act for GSTIN-compliant invoices',
      'Free, instant, and browser-based — no login, no spreadsheet, and no accounting software needed for quick GST computations during business hours',
    ],
    faqs: [
      { q: 'What are the GST slabs in India?', a: 'India\'s GST system has five slabs. 0% (exempt): basic food items like fresh vegetables, milk, bread, eggs, meat, salt, and cereals. 5%: edible oils, spices, tea, coffee, medicines, and certain transport services. 12%: processed foods, smartphones, computers, business-class air travel, and hotel rooms between ₹1,000–₹7,500/night. 18%: most services including restaurants (except those in hotels), telecom, IT services, financial services, hotel rooms above ₹7,500/night, and most manufactured goods. 28%: luxury goods, tobacco products, aerated drinks, automobiles, and certain entertainment services. Many items also attract a GST Compensation Cess on top of the 28% rate (e.g., cigarettes, luxury cars).' },
      { q: 'What is the difference between CGST, SGST, and IGST?', a: 'When a supplier and buyer are in the same state (intra-state transaction), GST is split equally between the Central Government (CGST) and the State Government (SGST). For example, on an 18% GST transaction, CGST = 9% and SGST = 9%. When the supplier and buyer are in different states (inter-state transaction), the full GST is charged as IGST (Integrated GST), which goes entirely to the Central Government and is then redistributed to the destination state. IGST = the full GST rate (e.g., 18% IGST on an inter-state supply).' },
      { q: 'When does a business need to register for GST in India?', a: 'GST registration is mandatory for businesses with an annual aggregate turnover exceeding ₹40 lakh (₹20 lakh for special category states like Himachal Pradesh, Uttarakhand, and northeastern states). For service providers, the threshold is ₹20 lakh (₹10 lakh for special category states). Businesses engaged in inter-state supply of goods, e-commerce operators, and businesses required to deduct TDS under GST must register regardless of turnover. Voluntary registration is also available for businesses below the threshold who wish to claim Input Tax Credit (ITC).' },
    ],
  },

  'tip-calculator': {
    description: 'AWE-OS Tip Calculator is a free online tool that calculates the tip amount and total bill for restaurant dining, hotel services, food delivery, and other service transactions. While tipping culture in India differs from Western countries — it is discretionary and not mandatory — it has become more common in urban restaurants, hotel restaurants, and food delivery contexts. The calculator lets you enter the bill amount, select a tip percentage (with common presets of 10%, 15%, 18%, and 20% and a custom input option), and specify the number of people splitting the bill. It instantly shows the tip amount per person, total bill per person, and the overall total including tip. It is particularly useful for corporate team lunches, college group outings, and family restaurant meals where splitting the bill fairly and adding a consistent tip requires quick mental arithmetic that is easy to get wrong.',
    features: [
      'Common tip percentage presets: 10%, 15%, 18%, and 20% with a custom percentage input option',
      'Bill splitting calculator showing per-person tip amount and per-person total for groups of 2 to 20',
      'Round-up option to round the per-person total to the nearest ₹10 or ₹100 for easier cash payment',
      'Tip quality guide showing what each percentage conventionally signals about service satisfaction',
      'Total bill breakdown: original amount, tip amount, and final total with tip clearly displayed',
      'Works with any currency — useful for Indian travellers calculating tips abroad in USD, GBP, or AED',
    ],
    useCases: [
      'Restaurant-goers in Indian cities wanting to add a fair tip for good service without slow mental arithmetic at the table',
      'Corporate teams and colleagues splitting a team lunch or dinner bill evenly with a consistent tip for all',
      'Indian travellers abroad in the US, UK, UAE, or Singapore where tipping etiquette and percentages differ from India',
      'Food delivery customers on Swiggy or Zomato calculating an appropriate cash tip for delivery partners at the door',
    ],
    howToUse: [
      'Enter the total restaurant bill amount in rupees (or any currency) in the bill field',
      'Select a tip percentage from the preset buttons — 10% for adequate service, 15% for good service, 20% for excellent service — or enter a custom percentage',
      'Enter the number of people splitting the bill (enter 1 if you are paying alone)',
      'The calculator instantly shows the tip amount, total bill with tip, and the per-person share of both',
      'Use the round-up toggle if you prefer to round each person\'s share to the nearest ₹10 for easier cash payment',
    ],
    whyUseUs: [
      'Bill splitting and tip calculation in a single step — enter the number of people and get per-person totals immediately, unlike basic tip calculators that only show the total',
      'Round-up feature makes cash payment easy — splits rounded to the nearest ₹10 avoid the need for exact change at the table',
      'Free, instant, and works entirely in your browser without any account or app installation required',
    ],
    faqs: [
      { q: 'What is the standard tip percentage in Indian restaurants?', a: 'Tipping is not obligatory in India and many restaurants already include a 5–10% "service charge" in the bill. If no service charge is added, a tip of 10% is considered adequate for standard service, 15% for good service, and 20% for exceptional service. Note that the Supreme Court and the Department of Consumer Affairs have clarified that service charges are not mandatory — you can request its removal from the bill if you feel service was unsatisfactory. For hotel restaurants and fine dining, a 10–15% tip is more commonly expected.' },
      { q: 'Should I tip food delivery partners on Swiggy and Zomato?', a: 'Tipping delivery partners is becoming more common in Indian cities, though it is not expected. A cash tip of ₹20–₹50 per delivery is appreciated, especially during difficult weather conditions (monsoon, extreme heat), for long-distance deliveries, or for night-time deliveries. Both Swiggy and Zomato also have in-app tipping options on Android and iOS where you can add a tip at the time of ordering or after delivery.' },
      { q: 'How does the bill splitting calculation work?', a: 'The tool divides the total bill (original amount + tip) equally by the number of people entered. For example: ₹2,000 bill with 15% tip = ₹300 tip, ₹2,300 total. Split 4 ways: ₹575 per person. With the round-up option enabled, each person pays ₹580 (rounded to nearest ₹10), and the extra ₹20 typically goes into the tip pool. For unequal splits where different people ordered different amounts, use the bill amount for just your share and the number of people as 1.' },
    ],
  },

  'ppf-calculator': {
    description: 'AWE-OS PPF Calculator is a free online tool for Indian investors to compute the maturity value of a Public Provident Fund (PPF) account. PPF is a government-backed, long-term savings scheme managed through Post Office and designated bank branches at State Bank of India (SBI), Punjab National Bank (PNB), Bank of Baroda, HDFC Bank, ICICI Bank, Axis Bank, and others. Introduced under the PPF Act 1968, it offers a tax-free return at the rate notified by the Ministry of Finance quarterly (currently 7.1% p.a. compounded annually for FY 2024-25) with a 15-year mandatory lock-in period, extendable in blocks of 5 years. Annual investments range from ₹500 (minimum) to ₹1.5 lakh (maximum). PPF enjoys Triple Tax Exemption (EEE status): investments qualify for Section 80C deduction (up to ₹1.5 lakh per year), interest earned is tax-free, and the maturity amount is fully exempt from income tax. The calculator shows year-by-year corpus growth, total interest earned, and the Section 80C tax benefit based on your income tax slab.',
    features: [
      'Calculates PPF maturity value using the government-notified compounding formula for annual deposits',
      'Year-by-year breakdown showing opening balance, annual deposit, interest for the year, and closing balance',
      'Section 80C tax benefit calculation showing actual tax saved based on your selected income tax slab (5%, 20%, 30%)',
      'Partial withdrawal and loan eligibility information displayed for each year (withdrawals allowed from Year 7)',
      'Extension calculation — shows corpus if the account is extended for 5 or 10 additional years after 15 years',
      'Comparison with FD returns at equivalent bank FD rates for the same tenure and deposit amount',
    ],
    useCases: [
      'Salaried employees in the 30% tax bracket maximising Section 80C deductions of ₹1.5 lakh annually through PPF for both tax saving and long-term wealth creation',
      'Parents opening a PPF account in their minor child\'s name to build a corpus for higher education 15–18 years away with guaranteed government-backed returns',
      'Self-employed professionals and freelancers without EPF/PF coverage using PPF as their primary retirement savings vehicle',
      'Conservative investors comparing PPF returns against Fixed Deposits and RBI Floating Rate Bonds for the same 15-year horizon',
    ],
    howToUse: [
      'Enter your planned annual PPF deposit amount — the minimum is ₹500 and maximum is ₹1.5 lakh per financial year (April to March)',
      'Select your investment start year and the calculator will project the 15-year maturity date accordingly',
      'The current PPF interest rate (7.1% for FY 2024-25, as notified by Ministry of Finance) is pre-filled but can be adjusted',
      'Select your income tax slab (0%, 5%, 20%, or 30%) to calculate the actual tax saved annually under Section 80C',
      'Review the year-by-year table showing your corpus growth, total interest earned, and cumulative tax savings over 15 years',
    ],
    whyUseUs: [
      'Section 80C tax benefit calculator included — shows actual rupee tax savings per year based on your tax slab, which basic PPF calculators never compute. The tax saving effectively boosts your net yield well above the nominal 7.1%',
      'Year-by-year amortisation table shows partial withdrawal eligibility (from Year 7) and loan-against-PPF eligibility (from Year 3), helping you understand the liquidity profile of your investment',
      'Uses the government-mandated annual compounding formula with the officially notified rate for the current financial year — accurate for Indian PPF accounting',
    ],
    faqs: [
      { q: 'What is the current PPF interest rate in India?', a: 'The PPF interest rate for FY 2024-25 (April 2024 to March 2025) is 7.1% per annum, compounded annually. The rate is notified by the Ministry of Finance quarterly and has been stable at 7.1% since April 2020. Historically, PPF rates have ranged from 4% (in the 1960s) to 12% (in the 1980s and 1990s). The rate was 8% in FY 2016-17, 7.9% in FY 2017-18, and gradually reduced to the current 7.1%. Changes to the rate, if any, are announced at the start of each quarter.' },
      { q: 'Can I withdraw money from PPF before 15 years?', a: 'PPF has a mandatory 15-year lock-in, but partial withdrawals are permitted from the 7th financial year of the account. You can withdraw up to 50% of the balance at the end of the 4th year (i.e., two years before the withdrawal date) or 50% of the balance at the end of the immediately preceding year — whichever is lower. Only one withdrawal is permitted per financial year. For medical emergencies and higher education, you can take a loan against PPF from the 3rd to the 6th year (loan amount = 25% of balance at end of 2nd preceding year).' },
      { q: 'Is PPF better than ELSS mutual funds for tax saving?', a: 'PPF and ELSS (Equity Linked Saving Scheme) are both popular Section 80C instruments but suit different investor profiles. PPF offers guaranteed, government-backed returns at 7.1% with a 15-year lock-in (partial withdrawal from Year 7) and full tax-free EEE status. ELSS invests in equity markets and has a shorter 3-year lock-in, but returns are market-linked — historically 12–15% CAGR over long periods, though not guaranteed. Long-term capital gains from ELSS above ₹1 lakh per year are taxed at 10%. PPF is better for risk-averse investors, while ELSS is better for those who can tolerate market volatility for potentially higher inflation-beating returns.' },
    ],
  },

  'tax-calculator': {
    description: 'AWE-OS Income Tax Calculator is a free online tool for Indian taxpayers to estimate their income tax liability for FY 2024-25 (Assessment Year 2025-26) under both the New Tax Regime (default regime as per Finance Act 2023) and the Old Tax Regime with deductions. The New Tax Regime offers lower tax rates but removes most deductions (HRA, 80C, 80D, home loan interest). The Old Tax Regime has higher base rates but allows deductions including Standard Deduction of ₹50,000, HRA exemption, Section 80C investments up to ₹1.5 lakh, Section 80D health insurance premium up to ₹25,000, and home loan interest under Section 24(b) up to ₹2 lakh. The calculator compares the tax payable under both regimes side by side, helping you decide which regime results in lower tax for your specific income and deduction profile. It incorporates the applicable surcharge for incomes above ₹50 lakh and ₹1 crore, and the 4% Health and Education Cess on total tax.',
    features: [
      'Side-by-side comparison of tax under New Tax Regime vs Old Tax Regime for FY 2024-25',
      'New regime slabs: 0% up to ₹3L, 5% from ₹3L–₹7L, 10% from ₹7L–₹10L, 15% from ₹10L–₹12L, 20% from ₹12L–₹15L, 30% above ₹15L',
      'Old regime deductions: Standard Deduction ₹50,000, Section 80C up to ₹1.5L, Section 80D up to ₹25,000, HRA, and home loan interest Section 24(b)',
      'Surcharge calculation for high incomes: 10% for ₹50L–₹1Cr, 15% for ₹1Cr–₹2Cr, and 25% for ₹2Cr–₹5Cr',
      '4% Health and Education Cess automatically added on total tax and surcharge',
      'Rebate under Section 87A for incomes up to ₹7 lakh under new regime (full tax rebate) and ₹5 lakh under old regime',
    ],
    useCases: [
      'Salaried employees comparing New vs Old tax regime before submitting their investment declaration to HR at the start of the financial year',
      'Freelancers and self-employed professionals with business income calculating advance tax liability under Section 208 for quarterly payment',
      'NRIs with Indian income sources (rent, dividends, capital gains) understanding their Indian tax obligation for the financial year',
      'Students and first-time earners who have just entered the workforce understanding their tax liability and planning investments for Section 80C deductions',
    ],
    howToUse: [
      'Enter your gross annual income (CTC for salaried, or total business income for self-employed) in Indian Rupees (₹)',
      'Under Old Regime, enter your deductions: HRA received, actual HRA paid, city type (metro/non-metro), Section 80C investments (PPF, ELSS, LIC, home loan principal), Section 80D health insurance premiums, and home loan interest',
      'The calculator automatically computes taxable income, tax payable, surcharge, cess, and net tax under both regimes',
      'Compare the two columns side by side — the regime with lower net tax is highlighted as the recommended choice for your income profile',
      'Use the result to make your regime declaration to your employer (Form 10-IEA if choosing old regime) at the start of the financial year',
    ],
    whyUseUs: [
      'New vs Old regime comparison in a single view — the most important decision Indian taxpayers face each year, answered instantly without separate spreadsheets or manual calculations',
      'Accurate surcharge and marginal relief calculation for high-income individuals above ₹50 lakh — most basic tax calculators ignore the surcharge which can significantly affect effective tax rates',
      'Section 87A rebate correctly applied for both regimes (₹25,000 rebate under new regime for income up to ₹7L; ₹12,500 under old regime for income up to ₹5L)',
    ],
    faqs: [
      { q: 'What are the income tax slabs under the New Tax Regime for FY 2024-25?', a: 'Under the New Tax Regime (default from FY 2023-24), the tax slabs are: Income up to ₹3 lakh — Nil; ₹3 lakh to ₹7 lakh — 5%; ₹7 lakh to ₹10 lakh — 10%; ₹10 lakh to ₹12 lakh — 15%; ₹12 lakh to ₹15 lakh — 20%; above ₹15 lakh — 30%. A Standard Deduction of ₹50,000 (₹75,000 from FY 2024-25 as per Budget 2024) is available under the New Regime for salaried employees. Section 87A rebate of ₹25,000 makes income up to ₹7 lakh effectively tax-free under the new regime.' },
      { q: 'Should I choose New Tax Regime or Old Tax Regime?', a: 'The New Regime is generally better if your total deductions under the old regime are less than the break-even threshold — approximately ₹3.75 lakh for incomes around ₹15 lakh. If your Section 80C investments (₹1.5L), health insurance (₹25,000), home loan interest (₹2L), and HRA exemption together exceed ₹3.75 lakh, the Old Regime may result in lower tax. The easiest approach is to use the AWE-OS tax calculator to compute both and compare the net tax payable with your actual deductions filled in.' },
      { q: 'What is the Indian financial year and when is the ITR filing deadline?', a: 'India\'s financial year (FY) runs from April 1st to March 31st. FY 2024-25 covers April 1, 2024 to March 31, 2025. The corresponding Assessment Year (AY) is AY 2025-26. The deadline for filing Income Tax Return (ITR) for salaried individuals is typically July 31st of the Assessment Year (July 31, 2025 for AY 2025-26). For businesses requiring audit, the deadline is October 31st. Revised returns can be filed up to December 31st of the assessment year. Late filing attracts a fee of ₹5,000 (₹1,000 if income is below ₹5 lakh) under Section 234F.' },
    ],
  },

  'discount-calculator': {
    description: 'AWE-OS Discount Calculator is a free online tool that instantly computes sale prices, discount amounts, and savings for any percentage or flat discount. It works in three modes: (1) Calculate the discounted price from an original price and discount percentage — useful for online shopping on Amazon, Flipkart, or Myntra where products show "40% off" or "Flat ₹500 off"; (2) Find what percentage discount you received — useful for comparing deals across platforms; and (3) Find the original price from a discounted price and the discount percentage — useful for checking whether a "sale price" is genuinely discounted or artificially inflated. The tool is simple, instant, and requires no account. It is particularly popular among Indian shoppers during Flipkart Big Billion Days, Amazon Great Indian Festival, Myntra End of Reason Sale, and other major sale events where comparing multiple discount structures across competing products can be time-consuming.',
    features: [
      'Three calculation modes: Discounted Price, Discount Percentage, and Original Price (reverse calculation)',
      'Percentage discount calculation: enter original price and discount % to see final price and amount saved',
      'Flat discount calculation: enter original price and flat discount amount to compute the effective percentage off',
      'Reverse discount: enter sale price and discount % to find what the original price was',
      'Stacked discount calculation: apply two successive discounts (e.g., 20% off then additional 10% off) to see effective total discount',
      'Savings amount and percentage displayed prominently alongside the final discounted price',
    ],
    useCases: [
      'Online shoppers on Amazon India, Flipkart, and Myntra comparing discount offers across multiple products during sale events to find the best deal',
      'Retail store owners and e-commerce sellers computing sale prices and ensuring advertised discounts are accurately reflected in billing',
      'Students and commerce trainees learning profit-loss and discount calculations for school and competitive exam problems',
      'Business procurement teams validating vendor invoice discounts against purchase order terms before approving payment',
    ],
    howToUse: [
      'Select the calculation mode: "Find Sale Price" to compute the discounted amount, "Find Discount %" to determine the percentage off, or "Find Original Price" for reverse calculation',
      'Enter the required values — for "Find Sale Price": original price and discount percentage; for "Find Discount %": original and sale prices; for "Find Original Price": sale price and discount percentage',
      'The result appears instantly — the discounted price, discount amount, and savings percentage are all displayed',
      'For stacked discounts (e.g., 20% off and then an additional 10% off on the discounted price), enter the first discounted price and apply the second discount to compute the final price',
      'Use the result for price comparison or to verify that a billing system has applied the correct discount',
    ],
    whyUseUs: [
      'Three calculation modes in one tool — find discounted price, find what percentage was applied, or reverse-calculate the original price, without switching between different tools',
      'Stacked discount support reveals why "20% + 10% off" is not the same as 30% off (it equals 28% total) — a common confusion that leads to incorrect price comparisons',
      'Free, instant, and mobile-friendly — works from any device during in-store shopping or while comparing deals on your phone',
    ],
    faqs: [
      { q: 'How do I calculate 30% off on a price?', a: 'To calculate 30% off, multiply the original price by 0.30 to get the discount amount, then subtract from the original price. For example: ₹2,500 original price × 0.30 = ₹750 discount. Final price = ₹2,500 − ₹750 = ₹1,750. Equivalently, multiply the original price by 0.70 (which is 1 − 0.30) to go directly to the final price: ₹2,500 × 0.70 = ₹1,750. The AWE-OS Discount Calculator does this computation instantly when you enter the original price and discount percentage.' },
      { q: 'Are stacked discounts the same as a combined discount?', a: 'No. Stacked (successive) discounts are not the same as a combined discount. For example, "20% off and then an additional 10% off" is not 30% off. The calculation is: first apply 20% discount: ₹1,000 × 0.80 = ₹800. Then apply 10% off on ₹800: ₹800 × 0.90 = ₹720. Total saving = ₹1,000 − ₹720 = ₹280, which is 28% — not 30%. This distinction matters when comparing deals during sale events where different platforms stack discounts in different ways.' },
      { q: 'How do I find the original price if I only know the sale price and discount percentage?', a: 'If you know the sale price and the discount percentage, the original price = Sale Price ÷ (1 − Discount/100). For example, if a product is selling at ₹840 after a 30% discount: Original Price = ₹840 ÷ (1 − 0.30) = ₹840 ÷ 0.70 = ₹1,200. This reverse calculation is useful for checking whether a seller has inflated the "original price" before applying a discount — a common practice during Indian online sale events.' },
    ],
  },

  'gpa-calculator': {
    description: 'AWE-OS GPA Calculator is a free online tool for Indian university and college students to calculate their Grade Point Average (GPA), Cumulative Grade Point Average (CGPA), and equivalent percentage. Most Indian universities including IITs, NITs, IIITs, BITS Pilani, DU, Mumbai University, Pune University, VTU, and Anna University use a 10-point grading scale where a CGPA of 10.0 is the highest. The calculator supports credit-weighted GPA computation — where subjects with more credits (typically core engineering or medical subjects) carry more weight than low-credit electives. Enter each subject\'s grade point and credit hours, and the calculator computes the weighted GPA for that semester. Add multiple semesters to compute your overall CGPA across all semesters. It also converts CGPA to percentage using the standard Indian formula (CGPA × 9.5 for Anna University, CGPA × 10 − 7.5 for most others) so you can express your academic score on job applications and university admission forms that ask for percentage.',
    features: [
      'Credit-weighted GPA and CGPA calculation on a 10-point scale as used by IITs, NITs, and most Indian universities',
      'Add unlimited subjects per semester with individual grade points (10, 9, 8, 7, etc.) and credit hours',
      'Multi-semester CGPA calculation — enter all semesters to get the overall cumulative GPA',
      'CGPA to percentage conversion using multiple formula options (Anna University, VTU, Mumbai University, general formula)',
      'Grade point to letter grade reference table for common Indian university grading systems (O, A+, A, B+, B, C, F)',
      'SGPA (Semester GPA) calculated per semester alongside the cumulative CGPA across all entered semesters',
    ],
    useCases: [
      'Engineering students at NITs and IITs tracking semester SGPA and overall CGPA for placement eligibility (most companies require minimum 6.5 or 7.0 CGPA)',
      'Medical and pharmacy students calculating CGPA for internship applications and postgraduate entrance exam eligibility',
      'Students applying to foreign universities (US, UK, Canada, Australia) who need to convert their Indian CGPA to a 4.0 GPA scale for applications',
      'MBA aspirants computing their undergraduate CGPA to meet the minimum eligibility criteria for IIM CAT and other business school applications',
    ],
    howToUse: [
      'Enter the number of subjects in your current semester and add each subject with its grade point (typically 4 to 10) and credit hours',
      'Click "Calculate SGPA" to see the Semester GPA computed as the weighted average: sum of (grade point × credits) divided by total credits',
      'Add additional semesters using the "Add Semester" button, entering subjects and grades for each semester',
      'Click "Calculate CGPA" to see the overall cumulative GPA across all semesters you have entered',
      'Select your university\'s percentage conversion formula to convert your CGPA to an equivalent percentage for applications and interviews',
    ],
    whyUseUs: [
      'Multi-semester CGPA tracking in one session — add all your semesters to get the true cumulative GPA without recalculating from scratch each time',
      'Multiple percentage conversion formulas for different Indian universities — Anna University uses CGPA × 9.5, VTU and many others use (CGPA × 10) − 7.5, avoiding the confusion of applying the wrong formula',
      'Free, instant, and works in any browser with no login — use it before placement drives, scholarship applications, or foreign university admissions to quickly verify your CGPA',
    ],
    faqs: [
      { q: 'How do I convert CGPA to percentage for Indian universities?', a: 'The conversion formula varies by university. Anna University (Chennai): Percentage = CGPA × 9.5. VTU (Karnataka) and many central universities: Percentage = (CGPA × 10) − 7.5. Mumbai University: Percentage = (CGPA − 0.5) × 10. IITs do not have a standard percentage conversion since their placement drives accept CGPA directly. For general purposes, the most commonly used formula in India is Percentage = CGPA × 9.5, which gives a percentage of 85.5% for a CGPA of 9.0 on the 10-point scale.' },
      { q: 'What CGPA is required for placements at top Indian companies?', a: 'Most large Indian companies (TCS, Infosys, Wipro) have a minimum CGPA cutoff of 6.0–6.5. Product-based companies (Google, Microsoft, Amazon, Flipkart, Adobe) typically require a minimum CGPA of 7.0–7.5 for shortlisting. Core engineering companies (L&T, BHEL, ISRO, DRDO) often require 6.5–7.0. Government sector PSUs through GATE have varying CGPA requirements but typically 6.0 minimum for graduation. MBA programmes like IIMs require a minimum graduation percentage of 50% (45% for reserved categories) — usually corresponding to a CGPA of approximately 5.5–6.0 on the 10-point scale.' },
      { q: 'How do I convert my 10-point Indian CGPA to a 4.0 GPA scale for US university applications?', a: 'US universities and the World Education Services (WES) typically convert Indian 10-point CGPA to a 4.0 GPA using the formula: GPA (4.0 scale) = (CGPA / 10) × 4. So a CGPA of 8.0 converts to 3.2 on the 4.0 scale, and a CGPA of 9.0 converts to 3.6. However, many top US universities (MIT, Stanford, Harvard) do their own holistic evaluation of international transcripts and do not blindly apply this formula. It is recommended to report your CGPA on the 10-point scale alongside the conversion rather than only reporting the 4.0 equivalent.' },
    ],
  },

  'fd-calculator': {
    description: 'AWE-OS FD Calculator is a free online tool for Indian investors to compute the maturity amount, total interest earned, and post-TDS returns on Fixed Deposit investments at any bank or NBFC. Fixed Deposits are one of the most popular savings instruments in India, offered by all scheduled commercial banks including State Bank of India (SBI), HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank, Punjab National Bank (PNB), Bank of Baroda, and small finance banks like AU Small Finance Bank and ESAF Small Finance Bank. The calculator supports all compounding frequencies — monthly, quarterly (standard for most Indian bank FDs), half-yearly, and annually — and displays both the gross maturity amount and the net amount after deducting TDS (Tax Deducted at Source) at 10% on interest income exceeding ₹40,000 per year (₹50,000 for senior citizens). Senior citizens receive a 0.25%–0.50% additional interest rate benefit, and the calculator includes a senior citizen rate toggle. For the Indian financial year (April to March), FD interest is taxable as "Income from Other Sources" at your applicable tax slab rate.',
    features: [
      'Computes FD maturity amount using compound interest for all compounding frequencies: monthly, quarterly, half-yearly, and annual',
      'TDS calculation: automatically deducts 10% TDS on interest above ₹40,000/year (₹50,000 for senior citizens) as per Income Tax Act',
      'Senior citizen rate toggle: adds 0.25%–0.50% additional interest (exact additional rate configurable) as offered by most Indian banks',
      'Effective annual yield (EAR) calculation to compare FDs with different compounding frequencies on a common basis',
      'Bank comparison table showing current FD rates at SBI, HDFC, ICICI, Axis, Kotak, and PNB for popular tenures',
      'Tax-saving FD calculation for 5-year lock-in FDs qualifying for Section 80C deduction up to ₹1.5 lakh',
    ],
    useCases: [
      'Retired individuals and senior citizens at SBI or HDFC Bank comparing FD interest rates across tenure options (1 year, 3 years, 5 years) to maximise post-tax returns on savings',
      'Salaried professionals in the 30% tax bracket evaluating whether a 5-year tax-saving FD (Section 80C) or ELSS mutual fund gives better net post-tax returns',
      'Investors comparing quarterly-compounding FDs against monthly-compounding recurring deposits using the effective annual yield to find the better deal',
      'Businesses parking surplus funds in short-term FDs (7 days to 1 year) and computing the expected interest income for cash flow planning',
    ],
    howToUse: [
      'Enter the FD principal amount — the amount you plan to deposit — in Indian Rupees (₹)',
      'Enter the annual interest rate offered by the bank (e.g., 6.5% for SBI 1-year FD, 7.1% for AU Small Finance Bank)',
      'Select the FD tenure in years and months, and the compounding frequency (quarterly is standard for most Indian bank FDs)',
      'Toggle the Senior Citizen rate if applicable — enter the additional rate (typically 0.25%–0.50%) offered by your bank',
      'The calculator shows the gross maturity amount, total interest earned, TDS deducted, and net maturity value after TDS',
    ],
    whyUseUs: [
      'TDS-aware calculation shows net post-TDS maturity value — most FD calculators show only gross returns, which is misleading since TDS of 10% is deducted at source on interest exceeding ₹40,000 per year, significantly reducing effective returns',
      'Senior citizen rate support with configurable additional rate — important since senior citizens receive 0.25%–0.50% extra across most banks, making a meaningful difference over 3–5 year FD tenures',
      'Effective Annual Rate (EAR) calculation lets you accurately compare monthly-compounding vs quarterly-compounding FDs, revealing that a 6.5% monthly-compounding FD yields more than a 6.5% quarterly-compounding FD',
    ],
    faqs: [
      { q: 'What are the current FD interest rates at major Indian banks?', a: 'FD interest rates vary by bank and tenure. As of early 2025, indicative rates for a 1-year FD are approximately: SBI 6.80%, HDFC Bank 6.60%, ICICI Bank 6.70%, Axis Bank 6.70%, Kotak Mahindra Bank 7.10%. Small Finance Banks offer higher rates: AU Small Finance Bank 7.50%, ESAF Small Finance Bank 7.75%, Jana Small Finance Bank 7.25%. Post Office Time Deposit (1 year) offers 6.90%. Rates change periodically and vary by tenure — always check your bank\'s official website for the current rate before investing.' },
      { q: 'How is TDS deducted on FD interest in India?', a: 'Banks deduct TDS (Tax Deducted at Source) at 10% on FD interest if the total interest income from that bank exceeds ₹40,000 in a financial year (₹50,000 for senior citizens). If your annual income is below the basic exemption limit, you can submit Form 15G (for those below 60 years) or Form 15H (for senior citizens 60+) to your bank at the start of each financial year to prevent TDS deduction. TDS is reflected in your Form 26AS and can be claimed as credit when filing your ITR. If your actual tax slab is higher than 10%, you must pay additional self-assessment tax.' },
      { q: 'Is a 5-year tax-saving FD worth it for Section 80C?', a: 'A 5-year tax-saving FD is eligible for Section 80C deduction up to ₹1.5 lakh per year. For someone in the 30% tax bracket, investing ₹1.5 lakh in a tax-saving FD at 6.5% saves ₹46,800 in tax immediately (plus 4% cess), effectively boosting the net return. However, the interest earned on tax-saving FDs is fully taxable each year, which erodes the benefit. Compare against ELSS mutual funds (same ₹1.5 lakh 80C limit, 3-year lock-in, historically higher returns but market-linked) and PPF (7.1% guaranteed, EEE tax status, 15-year lock-in) before deciding.' },
    ],
  },

  'roi-calculator': {
    description: 'AWE-OS ROI Calculator is a free online tool that computes Return on Investment (ROI) as a percentage for any investment — stocks, mutual funds, real estate, fixed deposits, business investment, or cryptocurrency. It calculates both simple ROI (total return percentage) and Annualized ROI (also called CAGR — Compound Annual Growth Rate) which adjusts for the holding period and allows fair comparison of investments held for different durations. For Indian investors, this tool is essential for comparing the return from a house purchased in 2018 with a mutual fund SIP started in the same year, or evaluating whether a lump-sum stock investment in Nifty 50 has outperformed an FD over the same period. Simply enter the initial investment amount, the current or exit value, and the investment duration in years. The tool displays simple ROI %, annualized CAGR %, and the absolute gain or loss in rupees — with clear indicators for profitable and loss-making scenarios.',
    features: [
      'Simple ROI calculation: (Final Value − Initial Investment) ÷ Initial Investment × 100',
      'Annualized ROI (CAGR): (Final Value ÷ Initial Value)^(1/years) − 1 for multi-year investment comparison',
      'Absolute gain/loss in rupees displayed alongside percentage return',
      'Multiple investment comparison — enter up to 4 investments side by side to identify the best performer',
      'Break-even analysis showing when an investment at a given return rate will double (Rule of 72)',
      'Investment growth projection showing what ₹1 lakh grows to over 5, 10, 15, and 20 years at the computed CAGR',
    ],
    useCases: [
      'Stock market investors calculating actual CAGR on Nifty 50, individual stocks, or sectoral funds from purchase date to current value',
      'Real estate investors computing annualized return on a property investment including purchase price, renovation costs, and current resale value',
      'Business owners measuring annual ROI on capital investments like machinery, IT infrastructure, or marketing campaigns',
      'Mutual fund investors comparing CAGR of different fund categories (large-cap, mid-cap, ELSS) over the same holding period to rebalance their portfolio',
    ],
    howToUse: [
      'Enter the initial investment amount in rupees — this is the total cost including any transaction fees or purchase costs',
      'Enter the current value or exit value of the investment — for ongoing investments, use the current market value',
      'Enter the investment duration in years and months',
      'Click "Calculate ROI" to see the simple ROI percentage, annualized CAGR, and absolute profit or loss',
      'Use the comparison table to enter up to 4 different investments and identify which has the highest annualized return',
    ],
    whyUseUs: [
      'CAGR calculation alongside simple ROI — simple ROI alone is misleading for investments held for different periods; CAGR normalises returns to an annual basis, enabling fair comparison between a 2-year and a 7-year investment',
      'Multi-investment comparison table lets you see up to 4 assets side by side — instantly shows which of your equity, debt, real estate, or gold investments has performed best',
      'Free, instant, browser-based tool with no login required — compute returns for any asset class without being locked into a brokerage or bank platform\'s analytics',
    ],
    faqs: [
      { q: 'What is the difference between ROI and CAGR?', a: 'ROI (Return on Investment) measures the total percentage gain or loss from the initial investment to the exit or current value, without regard for the time taken. CAGR (Compound Annual Growth Rate) is the annualized ROI — it expresses the same total return as if the investment had grown at a steady compounding rate each year. For example: an investment that doubled in 5 years has an ROI of 100% but a CAGR of approximately 14.9% per year. CAGR is more useful for comparing investments held for different durations, which is why it is the standard metric for mutual fund and equity return comparisons.' },
      { q: 'What is a good ROI for investments in India?', a: 'In India, long-term benchmarks are: Fixed Deposits 6–7.5% CAGR; PPF 7.1% (guaranteed); Nifty 50 historical long-term average approximately 12–14% CAGR; Nifty Midcap 100 approximately 14–17% CAGR; real estate in metros approximately 6–10% CAGR (varies widely by city, location, and market cycle); gold approximately 10–12% CAGR over 20-year periods in INR terms. For business investments, a minimum ROCE (Return on Capital Employed) of 15–20% is generally considered healthy for Indian businesses. Anything above the risk-free rate (currently approximately 6.5–7% for 10-year government bond yields) represents genuine value creation.' },
      { q: 'How do I calculate ROI on a real estate investment in India?', a: 'For real estate ROI: Total Initial Cost = Purchase Price + Stamp Duty and Registration (5–7% of property value) + Brokerage (1–2%) + Renovation or Interior Costs. Annual Rental Income = Monthly Rent × 12. Rental Yield = Annual Rental Income ÷ Total Initial Cost × 100. Capital Appreciation ROI = (Current Market Value − Total Initial Cost) ÷ Total Initial Cost × 100. Total ROI over N years = Capital Appreciation % + (Rental Yield × N years). Use the CAGR formula for the annualized return. Note that capital gains from property sold after 2 years are taxed as Long-Term Capital Gains (LTCG) at 12.5% without indexation benefit from FY 2024-25 onwards.' },
    ],
  },

  'age-calculator': {
    description: 'AWE-OS Age Calculator is a free online tool that computes your exact age in years, months, and days from your date of birth to today or any specified target date. It handles leap years correctly, accounts for varying month lengths (28, 29, 30, and 31 days), and provides multiple output formats including total days lived, weeks lived, months lived, and hours since birth. The tool is widely used in India for filling insurance proposal forms that require exact age at last birthday, passport and visa applications where age must be calculated to a specific date, retirement planning where the number of working years remaining needs to be precise, and Aadhaar or government form submissions that ask for date of birth verification. It also calculates the number of days until your next birthday and shows which day of the week you were born. A secondary Date Difference feature lets you calculate the gap between any two dates — useful for calculating contract duration, loan tenure, project timelines, and age gaps.',
    features: [
      'Exact age calculation in years, months, and days accounting for leap years and variable month lengths',
      'Multiple output formats: total days lived, weeks, months, and approximate hours since birth',
      'Next birthday countdown showing days remaining until the next birthday',
      'Day of week determination — shows which day of the week you were born',
      'Date difference calculator for computing duration between any two dates in years, months, and days',
      'Age on a future or past target date — calculate how old you will be on a specific date or how old you were on a historical date',
    ],
    useCases: [
      'Insurance applicants filling LIC, HDFC Life, or Max Life proposal forms that require exact age at last birthday for premium calculation and eligibility checks',
      'Job applicants checking exact age for government recruitment age limits (UPSC: 21–32 years for general category; SSC CGL: 18–32 years) calculated to the last date of application',
      'NRIs and travellers calculating the number of days spent in India for tax residency determination (183-day rule for NRI/RNOR/Resident status under Income Tax Act)',
      'Students and parents verifying age eligibility for school admissions where the cutoff date (June 1st for many CBSE schools) requires precise age at entry',
    ],
    howToUse: [
      'Enter your date of birth in the day, month, and year fields — or use the date picker to select from a calendar',
      'The calculator automatically uses today\'s date as the reference date, showing your current age in years, months, and days',
      'To find your age on a specific past or future date, toggle "Calculate age on a specific date" and enter the target date',
      'Check the additional outputs: total days lived, next birthday countdown, and the day of the week you were born',
      'Use the Date Difference tab to calculate the duration between any two dates — enter start and end dates to get the gap in years, months, and days',
    ],
    whyUseUs: [
      'Leap year-accurate calculation — many basic age calculators incorrectly handle birthdays on February 29 or calculate month boundaries incorrectly when the birth day is greater than the days in the current month',
      'Multiple output formats (days, weeks, months, years + months + days) in one view — eliminates the need to use separate date difference tools for insurance forms, visa applications, and government age eligibility checks',
      'Free, instant, and privacy-preserving — your date of birth is processed locally in your browser and never transmitted to any server',
    ],
    faqs: [
      { q: 'How is exact age calculated for insurance and government forms?', a: 'For LIC and most Indian life insurance policies, "age at last birthday" means the number of complete years since birth — so a person born on March 15, 2000 would be recorded as 24 years old on November 30, 2024, even though they will turn 25 in March 2025. For UPSC and government recruitments, age is typically calculated as of the last date for submitting applications, and candidates are required to have not exceeded the maximum age limit on that specific date. The AWE-OS Age Calculator computes age as of today by default, but you can specify any target date for eligibility checking.' },
      { q: 'How many days qualify me as an Indian resident for tax purposes?', a: 'Under the Income Tax Act, an individual is a Resident of India for a financial year if they spend 182 days or more in India during that year (April 1 to March 31). Previously, the threshold was 60 days in the current year plus 365 days across the preceding 4 years for certain categories, but this was simplified. NRIs earning income in India are taxed only on India-sourced income, while Residents are taxed on global income. The AWE-OS Date Difference calculator can help count the number of days spent in India during a financial year by calculating gaps between arrival and departure dates.' },
      { q: 'What day of the week was I born on?', a: 'The AWE-OS Age Calculator automatically displays the day of the week for your entered date of birth using the Tomohiko Sakamoto algorithm for day-of-week calculation. This works for any date from 1 January 0001 to 31 December 9999. It is a common fun trivia question at family gatherings but also has practical uses — some religions and cultures assign significance to the day of the week at birth, and certain historical event verification requires knowing the day.' },
    ],
  },

  'loan-calculator': {
    description: 'AWE-OS Loan Calculator (EMI Calculator) is a free online tool for Indian borrowers to compute the Equated Monthly Instalment (EMI) for home loans, car loans, personal loans, education loans, and gold loans. The EMI formula used is the standard reducing balance method: EMI = P × r × (1+r)^n ÷ [(1+r)^n − 1], where P is the principal, r is the monthly interest rate (annual rate ÷ 12), and n is the tenure in months. The calculator shows not just the EMI amount but also a full amortisation schedule — the month-by-month breakdown of principal repaid and interest paid for every EMI, plus the outstanding balance after each payment. This is particularly useful for home loan borrowers at SBI, HDFC Bank, ICICI Bank, Axis Bank, and Bank of Baroda who want to understand how much of their early EMIs goes toward interest versus principal, and for planning prepayments to reduce total interest outflow. The tool also includes a prepayment calculator showing how a one-time prepayment reduces tenure and total interest paid.',
    features: [
      'EMI calculation using the standard reducing balance formula as used by all RBI-regulated banks and NBFCs in India',
      'Full amortisation schedule showing principal, interest, and outstanding balance for every month of the loan tenure',
      'Total interest outflow over the full loan tenure — the often-shocking "true cost" of a long-term loan',
      'Prepayment impact calculator: enter a one-time prepayment amount to see the new tenure and total interest saved',
      'Multiple loan comparison: compute EMIs for 2–3 different loan amounts or rates side by side',
      'Eligibility indicator: shows the minimum monthly income required to qualify for the entered loan amount based on standard 40–50% EMI-to-income ratio rules',
    ],
    useCases: [
      'Home loan applicants at SBI, HDFC Bank, or ICICI Bank planning affordability before applying, comparing 15-year vs 20-year tenure, and understanding the total interest cost',
      'Car buyers at dealerships evaluating dealer-arranged auto loan EMIs against direct bank or HDFC/ICICI financing options',
      'Personal loan borrowers comparing multiple lenders (BAJAJ Finserv, Tata Capital, SBI Personal Loan) on EMI and total cost basis',
      'Existing home loan borrowers considering balance transfer to a lower-rate bank or planning lump-sum prepayments to reduce their loan tenure',
    ],
    howToUse: [
      'Enter the loan principal amount (e.g., ₹50 lakh for a home loan, ₹8 lakh for a car loan, ₹5 lakh for a personal loan)',
      'Enter the annual interest rate — as of 2025, indicative rates are: SBI Home Loan 8.50%, HDFC Bank Car Loan 8.75–9.00%, SBI Personal Loan 11.15–14.50%',
      'Enter the loan tenure in years (home loans: 5–30 years; car loans: 1–7 years; personal loans: 1–5 years)',
      'Click "Calculate EMI" to see the monthly instalment, total amount payable, and total interest over the full tenure',
      'Scroll down to the amortisation table to see month-by-month principal and interest breakdown, and use the prepayment field to calculate tenure savings',
    ],
    whyUseUs: [
      'Full amortisation schedule included — reveals that in the first years of a long home loan, over 80% of each EMI goes toward interest and barely any reduces the principal, which is critical information for prepayment planning',
      'Prepayment impact calculator shows exactly how many months and how many rupees of interest are saved by a one-time prepayment — most bank EMI calculators do not show this',
      'Uses the standard RBI-regulated reducing balance formula (not flat rate) — some lenders quote flat rate loans which appear lower but are actually more expensive; this calculator always uses reducing balance for accurate comparison',
    ],
    faqs: [
      { q: 'What is the EMI on a ₹50 lakh home loan at 8.5% for 20 years?', a: 'Using the standard reducing balance formula: EMI = ₹50,00,000 × (8.5%÷12) × (1 + 8.5%÷12)^240 ÷ [(1 + 8.5%÷12)^240 − 1] = approximately ₹43,391 per month. Total amount payable over 20 years = ₹43,391 × 240 = approximately ₹1.04 crore. Total interest paid = ₹1.04 crore − ₹50 lakh = approximately ₹54.1 lakh — more than the original loan amount. This is why prepayment whenever possible significantly reduces total cost.' },
      { q: 'What is the difference between a flat rate and reducing balance rate for loans?', a: 'In a flat rate loan, interest is calculated on the original principal throughout the tenure. In a reducing balance loan (standard for most Indian bank loans), interest is calculated only on the outstanding principal, which decreases with each EMI payment. A flat rate of 7% is actually equivalent to an effective reducing balance rate of approximately 12.5–13% — nearly double. Always check whether the quoted rate is flat or reducing balance. Indian banks regulated by RBI are required to quote the Effective Interest Rate (EIR), but some NBFCs and informal lenders still use flat rates.' },
      { q: 'How much home loan EMI can I afford on my salary?', a: 'The standard RBI-recommended guideline is that EMI should not exceed 40–50% of your net monthly income (take-home salary after taxes and PF deductions). Banks typically use a Fixed Obligation to Income Ratio (FOIR) of 40–55% — the total of all existing EMIs plus the new loan EMI should be within this range. For example, on a net monthly income of ₹1 lakh, maximum advisable EMI = ₹40,000–₹50,000. At 8.5% for 20 years, a ₹40,000 EMI corresponds to a loan of approximately ₹46 lakh. This is a guideline — actual bank sanctioned amount also depends on credit score (CIBIL ≥ 750 preferred), employment stability, and existing obligations.' },
    ],
  },

  'percentage-calculator': {
    description: 'AWE-OS Percentage Calculator is a free online tool that handles four distinct percentage computation problems in one place: (1) What is X% of a number — finding a fraction of a total (e.g., what is 15% of ₹2,400?); (2) X is what percentage of Y — finding what portion one number is of another (e.g., 360 is what % of 2,400?); (3) Percentage change (increase or decrease) between two values — computing the growth or decline percentage (e.g., a price changed from ₹500 to ₹650 — what is the % increase?); and (4) Find the original value after a percentage change — reverse-calculating the base before a known percentage was applied (e.g., after a 25% increase, the value is ₹625 — what was the original?). Each mode is clearly labelled and accepts any numerical inputs. Results are displayed instantly with the formula shown so users understand the calculation rather than just getting an answer.',
    features: [
      'Four calculation modes: Find X% of Y, X is what % of Y, Percentage Change, and Reverse Percentage',
      'Percentage increase and decrease detection — automatically shows whether a change is positive (increase) or negative (decrease)',
      'Formula display alongside results — shows the arithmetic formula used so students can learn the method',
      'Decimal precision control — results shown to 2 decimal places with option for whole number rounding',
      'Percentage point vs percentage difference distinction — clarifies this commonly confused concept',
      'Instant calculation with no submit button — results update in real time as numbers are entered',
    ],
    useCases: [
      'Students solving percentage problems in school maths, quantitative aptitude sections of CAT/GMAT/GRE, or UPSC Preliminary exams where percentages are a high-frequency topic',
      'Shoppers calculating what percentage discount they received on a purchase, or what the final price is after a stated discount percentage',
      'Business analysts and managers computing month-on-month or year-on-year growth percentages for sales, revenue, or traffic metrics',
      'Investors tracking portfolio gains — computing the percentage return on individual stocks, mutual fund NAV changes, or gold price movements',
    ],
    howToUse: [
      'Select the calculation type from the four modes: "What is X% of Y", "X is what % of Y", "Percentage Change", or "Reverse Percentage"',
      'Enter the required numbers in the input fields — the labels update dynamically based on the selected mode',
      'The result appears instantly alongside the formula used for the calculation',
      'Switch between modes to perform different types of percentage calculations on the same or different numbers',
      'Use the copy button to copy the result to clipboard for use in reports, messages, or spreadsheets',
    ],
    whyUseUs: [
      'Four calculation modes in one tool eliminate the need to remember different formulas for different percentage problems — find %, find value, find change %, and reverse-calculate original value all in the same interface',
      'Formula display alongside results makes this a learning tool, not just an answer machine — students preparing for competitive exams benefit from seeing the calculation method',
      'Instant real-time calculation with no submit button — faster than any other approach for quick percentage checks during shopping, meetings, or exam practice',
    ],
    faqs: [
      { q: 'How do I calculate percentage increase from one value to another?', a: 'Percentage Increase = [(New Value − Old Value) ÷ Old Value] × 100. For example, if a product price increased from ₹500 to ₹650: Percentage Increase = [(₹650 − ₹500) ÷ ₹500] × 100 = [₹150 ÷ ₹500] × 100 = 30%. If the new value is lower than the old value, the result is a percentage decrease. For example, from ₹500 to ₹400: [(₹400 − ₹500) ÷ ₹500] × 100 = −20% (a 20% decrease). The AWE-OS Percentage Calculator automatically detects and labels increase vs decrease.' },
      { q: 'What is the difference between percentage change and percentage point change?', a: 'Percentage change and percentage point change are often confused but measure different things. Percentage change is the relative change as a fraction of the original: if interest rates go from 6% to 8%, the percentage change is (8−6)÷6 × 100 = 33.3% increase. Percentage point change is the absolute arithmetic difference: 8% − 6% = 2 percentage points increase. Politicians and media sometimes use "percentage points" and "percent" interchangeably, which can be misleading. For exam purposes: "rates rose by 2 percentage points" is different from "rates rose by 2%" (which would be from 6% to 6.12%).' },
      { q: 'How do I find the original price if I know the discounted price and the discount percentage?', a: 'If the discounted price is known and the discount percentage is D%, the original price = Discounted Price ÷ (1 − D/100). For example, if a product costs ₹840 after a 30% discount: Original Price = ₹840 ÷ (1 − 0.30) = ₹840 ÷ 0.70 = ₹1,200. This is "Reverse Percentage" mode in the AWE-OS calculator. It is also useful for finding the pre-GST price from a GST-inclusive price: pre-GST price = GST-inclusive price ÷ (1 + GST Rate/100). For example, an 18% GST-inclusive price of ₹1,180 has a pre-GST base of ₹1,180 ÷ 1.18 = ₹1,000.' },
    ],
  },

  'color-picker': {
    description: 'AWE-OS Color Picker is a free online tool for web developers, graphic designers, UI/UX designers, and digital artists to pick, convert, and explore colours across all major colour models: HEX (hexadecimal), RGB (Red Green Blue), HSL (Hue Saturation Lightness), and CMYK (Cyan Magenta Yellow Key/Black). The tool provides a visual colour wheel and gradient picker for intuitive colour selection, and instantly converts the selected colour to all four formats simultaneously. For web developers, the HEX and RGB values are displayed as ready-to-copy CSS code. A shade and tint generator creates a full palette of 9 tones from the selected colour — lighter tints and darker shades — which is essential for building consistent UI design systems and component libraries. A colour contrast checker shows whether the selected colour meets WCAG 2.1 AA and AAA accessibility standards when used as text on white or black backgrounds, which is critical for building accessible websites and apps.',
    features: [
      'Visual colour wheel and gradient picker for intuitive colour selection without needing to know HEX codes',
      'Instant four-way colour format conversion: HEX, RGB, HSL, and CMYK displayed simultaneously',
      'CSS code generation — RGB and HSL values formatted as ready-to-copy CSS custom properties and utility classes',
      'Shade and tint generator: 9-step palette from darkest to lightest for the selected hue — essential for design systems',
      'WCAG contrast checker showing AA and AAA accessibility compliance for text on white and black backgrounds',
      'Saved colour palette: bookmark up to 10 colours in a session for building a cohesive brand colour kit',
    ],
    useCases: [
      'Web developers writing CSS stylesheets who need to convert a HEX colour from a design mockup (Figma, Sketch) to RGB or HSL for CSS variables and animations',
      'UI/UX designers and product designers building design systems who need a full shade palette (e.g., primary-100 through primary-900) from a single brand colour',
      'Graphic designers creating print materials who need CMYK values for the same colour used digitally in HEX or RGB to ensure colour consistency across digital and print',
      'Digital marketers and brand managers identifying the exact HEX codes of competitor brand colours from screenshots for competitive analysis or brand guideline documentation',
    ],
    howToUse: [
      'Click anywhere on the colour wheel or drag the selector to choose a hue, saturation, and lightness visually',
      'Alternatively, type a known HEX code (e.g., #1E90FF) or RGB values directly into the input fields — all other formats update automatically',
      'Copy any of the four format values (HEX, RGB, HSL, CMYK) to your clipboard using the copy button next to each field',
      'Scroll down to the Shade Generator to see a 9-step palette of tints and shades based on your selected colour — click any shade to make it the active colour',
      'Check the WCAG Contrast section to verify whether your selected colour meets accessibility standards for text use',
    ],
    whyUseUs: [
      'Four-format simultaneous display eliminates the need to visit separate converters for HEX-to-RGB and RGB-to-HSL — all formats update instantly from a single colour selection or input',
      'Shade generator with 9 steps produces a complete design system colour palette in one click — essential for Tailwind CSS projects, Material Design systems, and custom UI component libraries',
      'WCAG accessibility checker built in — ensures your chosen colour combinations meet AA or AAA contrast requirements before shipping, avoiding accessibility issues discovered late in development',
    ],
    faqs: [
      { q: 'What is the difference between HEX, RGB, and HSL colour formats?', a: 'HEX (hexadecimal) is a 6-character code like #1E90FF that represents the Red, Green, and Blue components in base-16 notation. It is the most common format in web design. RGB (Red, Green, Blue) expresses the same three channels as decimal numbers from 0 to 255 — rgb(30, 144, 255). HSL (Hue, Saturation, Lightness) is more intuitive for designers: Hue is the colour angle (0°–360°), Saturation is the intensity (0% grey to 100% vivid), and Lightness is the brightness (0% black to 100% white). HSL makes it easy to create shades and tints by adjusting only the Lightness value. CMYK (Cyan, Magenta, Yellow, Key) is used for print colour specification.' },
      { q: 'What is WCAG colour contrast and why does it matter?', a: 'WCAG (Web Content Accessibility Guidelines) defines minimum contrast ratios between text and background colours to ensure readability for users with low vision or colour blindness. WCAG 2.1 Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text. Level AAA requires 7:1 for normal text. In India, the Government of India\'s Guidelines for Indian Government Websites (GIGW) and the Rights of Persons with Disabilities Act 2016 (RPWD Act) mandate accessible web design for government websites. The AWE-OS Color Picker shows contrast ratios against both white and black backgrounds and flags AA/AAA compliance.' },
      { q: 'How do I find the HEX code of a colour I see on a website or image?', a: 'On a website: In Chrome or Firefox, right-click the element and choose "Inspect". In the Styles panel, find the color property — it is usually shown in HEX. Hover over the colour swatch to see a colour picker. On a screenshot or image: Use the browser\'s built-in eyedropper (available in Chrome and Edge DevTools), or use the AWE-OS Color Picker\'s HEX input to paste codes you find. For images on your device, tools like the Windows Snipping Tool (Windows 11) include a colour picker, and macOS Digital Colour Meter app can sample any pixel on screen. Many design tools like Figma, Adobe XD, and Canva show HEX codes in their properties panels.' },
    ],
  },
}
