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

  'bmi-calculator': [
    "AWE-OS BMI Calculator is a free online tool that instantly computes your Body Mass Index from height and weight inputs in either metric or imperial units. It is designed for Indian and South Asian users who need both the standard WHO BMI thresholds and the stricter Asian-specific thresholds recommended by the ICMR and Asia-Pacific clinical guidelines, which set the overweight cutoff at BMI 23 rather than the Western standard of 25.",
    "The calculator uses the standard WHO BMI formula: weight (kg) divided by height (m) squared. Results are displayed with a colour-coded visual scale showing four categories — Underweight, Normal weight, Overweight, and Obese — using both WHO and ICMR thresholds side by side. Imperial inputs (feet, inches, pounds) are automatically converted to metric before calculation, so results are always consistent regardless of the unit system chosen.",
    "BMI is a widely used population screening tool, but it has recognised limitations. It does not differentiate between fat mass and muscle mass, does not account for fat distribution patterns such as abdominal obesity, and may not accurately reflect health risks in athletes, elderly individuals, or people with high muscle mass. The Indian Council of Medical Research notes that Indians tend to have higher visceral fat at lower BMI values, which is why the 23 cutoff is clinically more relevant for South Asian populations.",
    "This tool is intended for general health awareness and informational purposes only. It is not a substitute for professional medical advice, clinical assessment, or diagnosis. If you are concerned about your weight or health status, please consult a qualified doctor, dietitian, or healthcare provider who can evaluate your complete health profile including waist measurement, blood glucose, lipid panel, and other relevant indicators.",
  ],

  'sip-calculator': [
    "AWE-OS SIP Calculator is a free online tool for Indian investors to estimate the future value of Systematic Investment Plan (SIP) contributions in mutual funds. It supports three calculation modes — standard SIP (monthly investment to corpus), Lumpsum (one-time investment growth), and Goal-Based (required monthly SIP to reach a target) — making it suitable for a wide range of investment planning scenarios from retirement planning to children's education funds.",
    "The calculator uses the standard compound interest formula endorsed by AMFI (Association of Mutual Funds in India): FV = P × [(1 + r)^n – 1] ÷ r × (1 + r), where rupee-cost averaging is implicit in the monthly compounding structure. Results are displayed as three summary cards (Total Invested, Estimated Returns, Final Corpus) alongside a year-by-year corpus growth chart and a rate sensitivity table comparing outcomes at 8%, 12%, 15%, and 18% annual returns.",
    "SIP projections assume constant annual returns, no fund expense ratios, and full reinvestment of all returns. In practice, equity mutual fund returns vary significantly year to year based on market conditions. The SEBI-mandated disclaimer applies: mutual fund investments are subject to market risks and past performance does not guarantee future returns. The return rate range shown (8–18%) reflects the historical long-term performance band of different mutual fund categories in India, from conservative debt funds to aggressive small-cap equity funds.",
    "This tool is designed for financial awareness and preliminary investment planning. It is not registered investment advice. Before starting or modifying a SIP, consult a SEBI-registered investment advisor (RIA) or a certified financial planner (CFP) who can evaluate your complete financial profile including risk tolerance, tax situation, existing investments, insurance coverage, and specific financial goals.",
  ],

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
    whatIsIt: 'AWE-OS Image Compressor reduces the file size of JPEG, PNG, and WebP images directly in your browser without uploading them to any server. It is essential for Indian users who need to compress profile photos for government portals (passport applications, college admissions, exam registrations), product images for e-commerce listings on Amazon and Flipkart, and images shared on WhatsApp where large files load slowly on mobile data.',
    howToUse: [
      'Click "Upload Image" or drag your JPEG, PNG, or WebP image into the tool',
      'Adjust the quality slider — 80% is the recommended starting point for most images',
      'A real-time preview shows the before and after file sizes side by side',
      'If the compressed result looks good, click "Download" to save it to your device',
    ],
    whyUseUs: [
      '100% free — no watermarks, no file count limits, no hidden charges',
      'Private — images are compressed locally in your browser, never uploaded to any server',
      'No signup required — compress images instantly without registration',
      'Live preview shows quality and file size before you download',
    ],
    faqs: [
      { q: 'Is Image Compressor free?', a: 'Yes. Completely free with no limits on image size or number of compressions. No watermarks are added to compressed images.' },
      { q: 'Is my image safe?', a: 'All compression happens locally in your browser using JavaScript. Images — including personal photos, product images, and documents — are never uploaded to any server and are discarded when you close the browser tab.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge. You can upload images directly from your phone camera roll.' },
      { q: 'What quality setting should I use?', a: 'For government portal uploads (passport, exam registration): use 80–85% quality to maintain document clarity while meeting size limits. For WhatsApp sharing: 60–70% produces fast-loading images with minimal visible quality loss. For e-commerce product images: 75–80% is the industry standard — images look sharp on product pages but load quickly. For email attachments: 70–75% typically reduces a 3MB photo to under 500KB while remaining clearly readable. Always check the live preview before downloading.' },
    ],
  },

  'qr-code-generator': {
    whatIsIt: 'AWE-OS QR Code Generator creates scannable QR codes for URLs, plain text, phone numbers, email addresses, and contact cards (vCard) — entirely in your browser with no signup required. QR codes are widely used in India for UPI payment links, restaurant menus, business card digital contact sharing, product packaging, and event registrations that link to Google Forms or registration portals.',
    howToUse: [
      'Select the QR code type: URL, Text, Phone, Email, or Contact Card (vCard)',
      'Enter the content — for a URL, paste the link; for a contact, fill in the name and number fields',
      'Choose the size and error correction level — High is recommended for printed QR codes',
      'Click "Generate QR Code" and download as a high-resolution PNG suitable for print and screen use',
    ],
    whyUseUs: [
      '100% free — no limits on QR codes generated, no watermarks on the image',
      'Private — QR codes are generated locally in your browser, content never uploaded',
      'No signup required — generate and download instantly',
      'High-resolution PNG output suitable for business cards, menus, and packaging',
    ],
    faqs: [
      { q: 'Is QR Code Generator free?', a: 'Yes. Completely free with no account required, no watermarks, and no limit on how many QR codes you generate.' },
      { q: 'Is my data safe?', a: 'All QR codes are generated locally in your browser. The URL, contact details, or text you encode is never sent to any server.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge. You can immediately scan the generated QR code with another device to test it.' },
      { q: 'What size should I use for a printed QR code?', a: 'For business cards: a minimum of 2cm × 2cm is recommended. For restaurant menus and table tents: 4cm × 4cm or larger for reliable scanning from a standard table distance. For outdoor signage and posters: 10cm × 10cm minimum to allow scanning from 1–2 metres away. The High error correction setting is recommended for printed codes as it maintains scannability even if part of the code is damaged or smudged.' },
    ],
  },

  'password-generator': {
    whatIsIt: 'AWE-OS Password Generator creates cryptographically secure passwords using your browser\'s built-in random number generator (window.crypto.getRandomValues) — not a predictable mathematical formula. It generates passwords that meet NIST SP 800-63B guidelines for length and character diversity. Use it for banking portals, income tax login, PF accounts, DigiLocker, and any account where a weak password could cause financial or identity harm.',
    howToUse: [
      'Set the password length — 16 characters is recommended as a minimum for sensitive accounts',
      'Select which character types to include: uppercase, lowercase, numbers, and special characters',
      'Click "Generate" to create a new password — click again for a different one',
      'Click "Copy" to copy to clipboard, then paste directly into the password field of the site',
    ],
    whyUseUs: [
      '100% free — unlimited password generation with no account required',
      'Cryptographically secure — uses window.crypto.getRandomValues, not Math.random()',
      'Private — passwords are generated entirely in your browser and never transmitted anywhere',
      'Customisable — set length and character types to meet any site\'s requirements',
    ],
    faqs: [
      { q: 'Is Password Generator free?', a: 'Yes. Completely free with no limits. Generate as many passwords as you need.' },
      { q: 'Are generated passwords stored anywhere?', a: 'No. Passwords are generated locally in your browser and are never transmitted to any server. They exist only in your browser tab until you copy them. For security, use a password manager to store generated passwords — do not leave them in the browser tab.' },
      { q: 'Does it work on mobile?', a: 'Yes. Works on Android and iOS in Chrome, Firefox, Safari, and Edge.' },
      { q: 'How long should my password be?', a: 'NIST\'s 2024 guidelines recommend a minimum of 15 characters for regular accounts and 20 characters for financial and government accounts. Longer passwords are significantly harder to crack — a 16-character random password would take hundreds of thousands of years to brute-force with current hardware, while an 8-character password can be cracked in hours. For critical accounts like income tax login, net banking, and email (which controls account recovery for everything else), use 20+ character passwords and store them in a password manager such as Bitwarden (free and open-source).' },
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
}
