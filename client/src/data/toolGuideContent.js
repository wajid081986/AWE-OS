/**
 * TOOL_GUIDE — Tips & Best Practices + Common Mistakes for every tool page.
 * Imported by ToolPageShell.jsx and rendered as dedicated guide sections.
 * Keys match tool slugs from toolRegistry.js.
 */

export const TOOL_GUIDE = {

  // ── PDF Tools ───────────────────────────────────────────────────────────────

  'merge-pdf': {
    tips: [
      'Add your PDF files in the exact order you want the pages to appear — the tool merges them sequentially, so arrange your list correctly before clicking Merge.',
      'Check each PDF for password protection before uploading. Encrypted files will cause the merge to fail silently. Use the Unlock PDF tool first to remove any password, then merge.',
      'For large batches of files (20+ PDFs or files totalling over 100 MB), use Chrome or Edge on a desktop computer for the most reliable performance and fastest processing.',
      'After merging, use the Compress PDF tool to reduce the file size if the combined document is too large to email or upload to a government portal with a 2 MB or 5 MB size limit.',
      'If you need to merge PDFs that contain images, ensure the originals are not excessively high resolution — merging several 50 MB scanned documents can result in a very large output file.',
      'Use the Organize PDF tool after merging if you need to rearrange individual pages within the merged document, such as moving a cover page to the front or removing blank separator pages.',
    ],
    mistakes: [
      'Uploading password-protected PDFs without unlocking them first — the merge will fail or skip those files. Always use Unlock PDF to remove encryption before merging.',
      'Ignoring file order before clicking Merge — the output PDF follows your upload list exactly. Reordering pages after merging requires the Organize PDF tool and extra steps.',
      'Trying to merge image files (JPG, PNG) directly — the tool only accepts PDF files. Convert your images to PDF using the JPG to PDF tool first, then merge.',
      'Closing the browser tab or window before the download completes — the merged PDF only exists in your browser session and will be permanently lost if the page reloads.',
      'Assuming the tool removes blank pages automatically — blank pages in any source PDF will appear in the merged output. Use Remove Pages PDF to delete unwanted pages afterward.',
      'Using very old or corrupted PDF files that do not conform to standard PDF specifications — these may cause parsing errors. Try re-saving the problem file from its source application first.',
    ],
  },

  'split-pdf': {
    tips: [
      'Check your PDF\'s total page count before splitting — open the PDF in a viewer or use the PDF Editor to see the page thumbnail strip and plan your page ranges accurately.',
      'Use precise page ranges like "1-5, 8, 11-15" to extract multiple non-consecutive sections in a single operation, rather than running separate splits for each range.',
      'For splitting a large document into chapters, make a note of the first page number of each chapter from the table of contents before using the tool to get clean splits.',
      'After splitting, verify the output by opening the extracted PDF to confirm the correct pages are included and the page order is preserved before sharing or submitting.',
      'If you need to split a password-protected PDF, unlock it first using the Unlock PDF tool and then perform the split — encrypted PDFs cannot be read or processed by the splitter.',
      'For academic papers and reports, use the Extract Pages PDF tool instead of Split PDF if you only need to pull out a few specific pages rather than define a continuous range.',
    ],
    mistakes: [
      'Entering page numbers that exceed the document\'s total page count — the tool will produce an error or return an empty file. Always verify the page count in the PDF first.',
      'Confusing 1-based and 0-based page numbering — the tool uses 1-based counting (page 1 is the first page), matching how PDF viewers and printers display page numbers.',
      'Forgetting to download the split file before refreshing or closing the page — the output only exists during your browser session and cannot be recovered after the page reloads.',
      'Trying to split image files saved as PDF but scanned at very low resolution — the split will work, but the output pages may be unreadable. Ensure original scan quality is at least 150 DPI.',
      'Expecting the tool to automatically detect logical sections such as chapters or bookmarks — you must specify the page ranges manually since the tool does not parse PDF bookmark structure.',
      'Using commas inside a single range like "1,5" when you mean pages 1 through 5 — use a hyphen for ranges: "1-5". Commas separate multiple distinct pages or ranges.',
    ],
  },

  'compress-pdf': {
    tips: [
      'Start with Medium compression and check the file size reduction before trying High — most text-heavy PDFs (reports, invoices, forms) achieve 50-70% size reduction at Medium with no visible quality loss.',
      'For PDFs with many high-resolution photographs or scanned images, High compression gives the best size reduction. For PDFs with only text and vector graphics, the size difference between levels is minimal.',
      'Before compressing a document for a government portal, check the exact file size limit specified on the portal (commonly 2 MB, 5 MB, or 10 MB) and target well below that limit to avoid upload failures.',
      'Compress PDFs containing scanned bank statements and salary slips before sending by email — a 10 MB scanned document typically compresses to 1-3 MB while remaining fully readable.',
      'If you need to compress a password-protected PDF, remove the password using the Unlock PDF tool first. The compressor cannot process encrypted files.',
      'After compression, always open the output file and visually inspect key pages — especially those with charts, tables, or small printed text — before submitting to ensure the text is still legible.',
    ],
    mistakes: [
      'Applying High compression to documents containing fine print, medical reports, or legal contracts — extreme compression can make small text or table borders difficult to read. Use Medium for these document types.',
      'Compressing an already compressed PDF multiple times — repeated compression of a lossy-compressed file degrades quality further without proportionally reducing file size. Compress from the original document whenever possible.',
      'Assuming compression removes document metadata or personal information — compression only reduces visual quality of images to reduce file size. It does not remove embedded names, revision history, or author metadata.',
      'Uploading a 200 MB PDF for compression on mobile data — the file upload itself will consume significant data and time. For very large files, use desktop Wi-Fi for the upload.',
      'Expecting lossless compression for image-heavy scanned PDFs — any significant size reduction for scanned documents involves some degree of image quality reduction. There is no free lunch for scanned content.',
      'Not checking whether the compressed file still meets the required minimum quality standards — some official submissions require a specific minimum DPI (commonly 200 DPI) for scanned pages.',
    ],
  },

  'jpg-to-pdf': {
    tips: [
      'Arrange your images in the correct order in the upload list before converting — the PDF pages follow the image order exactly. Use the drag handles to reorder if needed.',
      'Select A4 page size for standard documents like application forms, mark sheets, and certificates — it is the universally accepted size for official submissions in India.',
      'For passport-size photos or ID card scans, ensure the original image is at least 200 DPI resolution before converting to PDF to keep text and facial details sharp enough for official submissions.',
      'If converting multiple JPEG receipts for GST or expense reporting, compress each image to a reasonable file size before converting — many small images in one PDF can create a large output file.',
      'Use the "Fit to page" option to ensure images fill the entire A4 page cleanly without large white borders, especially for scanned documents and certificates.',
      'After generating the PDF, verify all pages are present and in the correct order by opening the output file before submitting to any portal, university, or recruiter.',
    ],
    mistakes: [
      'Uploading very low-resolution images (under 100 DPI) — the text and details will appear blurry in the PDF and may be rejected by government portals that require minimum resolution for document submissions.',
      'Forgetting to arrange image order before converting — if you upload multiple images at once, the order in the list becomes the page order in the PDF. Check and reorder before clicking Convert.',
      'Using PNG files with transparency — transparent areas are converted to white in PDF, which is usually acceptable, but verify the output looks correct for images with transparent backgrounds.',
      'Including images in landscape orientation mixed with portrait images without adjusting page orientation — the tool converts each image to the selected page size, which may crop landscape images.',
      'Uploading screenshots from mobile phones at compressed quality settings — mobile screenshot compression can degrade text readability. Use full-resolution exports from your gallery instead.',
      'Expecting OCR functionality — this tool converts images to PDF pages but does not make the text selectable or searchable. Use a dedicated OCR tool if you need searchable text in the output PDF.',
    ],
  },

  'pdf-to-jpg': {
    tips: [
      'Choose High quality output for PDFs that will be displayed on websites, presentations, or printed — High quality preserves text sharpness and image detail at a larger file size.',
      'Use Medium quality for PDFs converted to share on WhatsApp or social media where a smaller file size matters more and the slight quality reduction is not noticeable on mobile screens.',
      'For multi-page PDFs, each page is converted to a separate JPG file — download all files and check them in a viewer before sharing, especially for long documents.',
      'If converting a PDF containing charts, graphs, or text, choose the highest quality setting available — JPEG compression causes visible artefacts around sharp text edges at lower quality levels.',
      'For PDFs with white backgrounds and black text, the conversion quality is excellent even at Medium settings. For PDFs with complex colour imagery, always use High quality.',
      'After converting, compare a page from the output JPG with the original PDF page side by side to confirm quality is acceptable before using the images for their intended purpose.',
    ],
    mistakes: [
      'Using Low quality output for documents you will print or use in presentations — low quality JPEG compression introduces visible blurriness and artefacts around text that look unprofessional in print.',
      'Expecting vector-sharp text in the output JPG — JPEG is a raster format, so text edges will always have some anti-aliasing. For perfectly sharp digital text, keep documents in PDF format.',
      'Converting a scanned PDF (which is already an image) and expecting a text-quality output — scanned PDFs are already rasterised, so quality depends entirely on the original scan DPI.',
      'Forgetting to download all pages for multi-page PDFs — each page is a separate download and may require individual clicks. Check the total page count against your downloads.',
      'Trying to convert password-protected PDFs — the tool cannot access encrypted content. Remove the password with Unlock PDF first, then convert.',
      'Assuming converted JPGs can be easily edited as text documents — JPG is an image format. If you need to edit the text from a PDF, use the PDF to Word converter instead.',
    ],
  },

  'word-to-pdf': {
    tips: [
      'Accept all tracked changes and resolve all comments in your Word document before converting — tracked changes are visible when a PDF is created from a document in review mode, which can expose internal feedback to external recipients.',
      'Embed all fonts in your Word document before converting to ensure the PDF renders identically on any device, especially if you have used custom or corporate fonts that may not be installed on all computers.',
      'Remove sensitive metadata like author name, company name, and revision history from the Word file before converting if the PDF will be shared publicly — go to File > Info > Check for Issues > Inspect Document in Word.',
      'Convert your document from the most recent saved version — the converted PDF reflects the last saved state, not any unsaved changes. Always save your Word file before uploading for conversion.',
      'Check that hyperlinks in your Word document are preserved and functional in the PDF output — click each link in the converted PDF to verify they direct to the correct URLs before sending.',
      'For multi-section documents with different page orientations (portrait and landscape sections), verify the page layout is preserved correctly in the PDF output, as orientation changes sometimes render incorrectly.',
    ],
    mistakes: [
      'Converting a Word file without first accepting tracked changes — recipients of the PDF may see inline comments and strikethroughs from review mode, which can be embarrassing for professional documents.',
      'Using unusual fonts that are not embedded — if the recipient\'s device does not have the same fonts installed, the PDF may substitute default fonts and completely change the document\'s visual appearance.',
      'Converting a very large Word file with many embedded high-resolution images without first compressing images — the output PDF may be unnecessarily large and difficult to email or upload.',
      'Expecting perfect conversion of complex Word tables — advanced table styles, merged cells, and nested tables sometimes lose formatting. Always review the PDF output for table-heavy documents.',
      'Forgetting to check the final page count — the Word document\'s page count may differ from the PDF if the rendering engine interprets page margins or line spacing slightly differently.',
      'Using the converted PDF for further editing — PDF is not a suitable format for editing. Keep the original Word file and reconvert whenever changes are made rather than trying to edit the PDF.',
    ],
  },

  'pdf-to-word': {
    tips: [
      'Use the PDF to Word converter on PDFs that were originally created from digital text (not scanned documents) — digitally generated PDFs convert with high accuracy, while scanned PDFs produce poor results as they contain image data, not text.',
      'Review the converted Word document thoroughly for any formatting issues before editing — tables, multi-column layouts, and special characters sometimes require manual correction after conversion.',
      'Use the converted Word file as a starting draft and retype any complex sections (such as mathematical formulas or complex tables) from scratch rather than trying to correct conversion artefacts.',
      'If you need to edit only a specific section of a large PDF, first split the PDF to extract just those pages, then convert only that portion to Word — this typically produces a cleaner conversion result.',
      'After conversion, run a spelling check on the Word document — character recognition can sometimes misidentify similar characters, introducing spelling errors that appear correct visually but are wrong.',
      'Save the converted Word document immediately after checking it — do not assume the in-browser preview is the final output. Download and save before making edits.',
    ],
    mistakes: [
      'Trying to convert scanned PDFs and expecting editable text — scanned PDFs are images of pages, not digital text. Conversion produces an image in Word rather than editable text. Use OCR software for scanned documents.',
      'Editing the converted Word document without first checking for conversion artefacts — automatic character substitutions (like "0" for "O" or "I" for "l") in headings and important text can cause significant errors if left uncorrected.',
      'Converting a password-protected PDF — the converter cannot access encrypted content. Remove the password using the Unlock PDF tool first.',
      'Assuming complex charts and diagrams will convert faithfully — embedded graphics often convert as flat images in the Word document, losing any editable chart data or vector properties.',
      'Using converted Word files for final professional submissions without careful proofreading — even excellent conversion tools introduce some formatting discrepancies in complex documents.',
      'Expecting the conversion to preserve PDF form fields as editable Word form controls — fillable PDF form fields typically convert to static text in Word rather than interactive form elements.',
    ],
  },

  'pdf-to-excel': {
    tips: [
      'PDF to Excel conversion works best on PDFs that contain clearly defined, simple tables with visible borders — complex merged cells, multi-level headers, and tables without borders often require significant manual correction.',
      'After conversion, verify all numeric values in the Excel cells by spot-checking a sample against the original PDF — OCR-based conversion can occasionally misread numbers, which is critical for financial data.',
      'For PDFs containing multiple tables across many pages, convert the entire document and then delete the rows and columns that are not part of the tables you need rather than expecting the tool to isolate specific tables.',
      'Convert the PDF to Excel and then import the sheet into Google Sheets as a secondary check — sometimes Google Sheets displays data more clearly and helps identify conversion artefacts.',
      'If the PDF contains currency values, percentage signs, or Indian number formatting (lakhs and crores), verify these are preserved correctly as numeric data and not imported as text strings in Excel.',
      'Use the converted Excel file as a starting template and retype totals and formula-derived values from scratch rather than trusting that arithmetic formulas will be preserved — PDFs contain only final values, not formulas.',
    ],
    mistakes: [
      'Expecting a scanned table (image of a table in a PDF) to convert perfectly to editable Excel cells — scanned tables require OCR processing and typically produce rough output with significant manual cleanup needed.',
      'Trusting all extracted numbers without verification — a misread "8" as "6" in a financial table can produce serious errors. Always verify key figures against the original PDF.',
      'Converting a complex multi-section financial report and expecting each section to map cleanly to its own worksheet — most converters produce all content in a single sheet that you must then reorganise manually.',
      'Not checking for text-formatted numbers — monetary values and percentages sometimes import as text strings (left-aligned) rather than numbers (right-aligned), preventing arithmetic operations and pivot tables from working correctly.',
      'Overwriting the original PDF before verifying the conversion output — always keep the original PDF and the converted Excel file separately until the conversion quality has been confirmed for your use case.',
      'Using converted Excel data for final reports without a human review pass — treat PDF-to-Excel as a data extraction draft, not a final product.',
    ],
  },

  'pdf-to-text': {
    tips: [
      'Use PDF to Text conversion on digitally created PDFs (reports, e-books, articles) for clean plain-text extraction — the output is pure UTF-8 text that you can paste into any application or database.',
      'For PDFs with multiple columns (newspapers, journals), the text extraction will merge columns in reading order, which may require manual reformatting to separate column content correctly.',
      'If you need only specific sections of a long PDF, split the relevant pages first using the Split PDF tool, then extract text from just those pages to get a cleaner, shorter output.',
      'The extracted text preserves paragraphs and line breaks but loses all formatting, colours, fonts, and tables — use PDF to Word instead if you need to preserve document structure.',
      'For Indian language PDFs encoded in Unicode (Devanagari, Tamil, Telugu scripts), the text extraction preserves the Unicode characters correctly — verify the output in a text editor that supports multi-byte characters.',
      'Use the extracted text for full-text search, content analysis, or feeding into AI summarisation tools — plain text is the most compatible format for these downstream processing tasks.',
    ],
    mistakes: [
      'Trying to extract text from a scanned PDF — scanned PDFs are images and contain no machine-readable text. The output will be empty or contain garbled characters. Use OCR software for scanned documents.',
      'Expecting tables to extract as structured data — PDF text extraction produces flat sequential text, not rows and columns. Use PDF to Excel for tabular data extraction.',
      'Pasting extracted text into a word processor and expecting it to look like the original — plain text has no formatting, so paragraphs, headings, lists, and tables all appear as continuous plain text.',
      'Using the extracted text without checking for character encoding issues — some older PDFs use non-standard encoding that can produce garbled output for special characters and Indian currency symbols.',
      'Overlooking ligatures and special typographic characters — some PDFs use ligatures (combined letter forms like "fi" or "fl") that extract as single special characters rather than separate letters, causing spellcheck failures.',
      'Not reviewing the extracted text for line-break artefacts — PDF text extraction sometimes inserts hard line breaks at the end of each visual line rather than at paragraph boundaries, requiring manual cleanup.',
    ],
  },

  'pdf-to-ppt': {
    tips: [
      'PDF to PowerPoint conversion works best on presentation PDFs where each page corresponds to a single slide — the converter maps each PDF page to one PowerPoint slide.',
      'After conversion, resize and reposition text boxes and images on each slide, as the automatic layout may not perfectly match the original PDF spacing and alignment.',
      'Use the converted PPTX file as a starting structure and retype key text in proper PowerPoint text boxes rather than leaving all content as embedded images, which prevents text editing and animation.',
      'For slide decks converted from PDF, apply a consistent PowerPoint theme or master slide template after conversion to unify fonts and colours across all slides.',
      'If your PDF presentation contains bullet points, check whether they converted as editable text or as image-rendered text — editable text allows you to modify content and apply animations.',
      'For corporate presentations being repurposed, verify that your company logo and branding elements are positioned correctly on each slide after conversion.',
    ],
    mistakes: [
      'Expecting the converted PPTX to be immediately ready for presenting without editing — all PDFs convert with some layout shifts and text box positioning differences that require slide-by-slide review.',
      'Using the converted PowerPoint as the sole source and discarding the original PDF — always keep the original PDF as the authoritative version since conversion may alter some visual details.',
      'Converting a scanned PDF of a printed presentation — scanned slides become flat bitmap images in PowerPoint with no editable text, making them difficult to modify or reuse.',
      'Trying to animate the converted slide content without first converting embedded images to proper text boxes — animations require properly structured slide objects, not flat image exports.',
      'Ignoring font substitutions after conversion — if the original PDF used fonts not available on your system, PowerPoint will substitute similar fonts which may change text spacing and layout.',
      'Converting a very large slide deck (50+ slides) and expecting the browser to complete the conversion quickly — large PDFs take longer to process and may require more patience on slower connections.',
    ],
  },

  'excel-to-pdf': {
    tips: [
      'Set the print area in your Excel spreadsheet before converting — select the cells or sheets you want to include, go to Page Layout > Print Area > Set Print Area, then save before uploading for conversion.',
      'Adjust column widths and row heights to ensure no data is cut off at the right edge or bottom of pages — use Print Preview in Excel to verify the layout before converting to PDF.',
      'For large spreadsheets with many columns, consider using landscape page orientation in Excel\'s page setup to fit more columns on each page without cutting off data.',
      'Freeze panes in Excel for large spreadsheets and then use "Repeat Rows at Top" in Print Settings to ensure column headers appear on every page of the converted PDF.',
      'Remove any sensitive data, formulas, or internal notes from hidden rows and columns before converting — hidden cells are not included in the PDF output but it is good practice to clean up before sharing.',
      'For financial spreadsheets, verify that all currency symbols (₹), decimal places, and number formatting are correctly rendered in the PDF output before sharing with clients or filing.',
    ],
    mistakes: [
      'Not setting a print area — without a defined print area, Excel converts all non-empty cells including those far to the right or below your actual data, producing many blank pages in the PDF output.',
      'Ignoring column overflow — if column content is wider than the cell, text will be truncated in the PDF. Always verify that all columns are wide enough to display their content fully before converting.',
      'Converting a spreadsheet with merged cells spanning many columns — merged cells sometimes shift or split incorrectly during PDF rendering. Check all merged header rows carefully in the output.',
      'Forgetting that hidden rows and columns are excluded from the PDF — if you rely on hidden summary rows being visible in the PDF, unhide them before converting.',
      'Using relative cell reference formulas that produce errors when the sheet is rendered independently — ensure all formula cells display their calculated values correctly before converting.',
      'Not verifying charts and graphs — embedded Excel charts sometimes render at a different scale or with slightly different colours in PDF compared to the on-screen Excel view.',
    ],
  },

  'powerpoint-to-pdf': {
    tips: [
      'Before converting, review the presentation in PowerPoint\'s Print Preview mode to see exactly how each slide will render — this helps identify any text overflow or layout issues before they appear in the PDF.',
      'For presentations with slide notes, check whether you want to include the notes in the PDF output — most converters offer options for slides only, slides with notes, or notes pages.',
      'Remove any slide transitions and animation effects before converting if you plan to share the PDF as a handout — animations are not preserved in PDF and their absence can cause unexpected blank space.',
      'For corporate presentations, embed all custom fonts in the PowerPoint file (File > Options > Save > Embed Fonts) before converting to ensure text renders correctly in the PDF even on different systems.',
      'If your presentation uses a custom slide size (e.g., 4:3 vs 16:9), verify the page size and aspect ratio of the PDF output matches your original slide dimensions.',
      'After conversion, scroll through every slide in the PDF to check that no text has been clipped at edges, that background images are correctly positioned, and that all slides are present.',
    ],
    mistakes: [
      'Converting without removing animations — slides designed with entrance animations may appear with objects in their final position in the PDF, which can look visually unbalanced compared to the designed layout.',
      'Forgetting to check embedded video and audio — multimedia elements are not included in PDFs. If your presentation contains embedded videos, replace them with static screenshots before converting for a clean output.',
      'Not verifying slide numbers in the PDF — if your presentation uses a custom slide number offset (starting from slide 3 as page 1), verify whether the PDF preserves this numbering or resets to sequential page numbers.',
      'Using the converted PDF to re-edit the presentation — PDF is a presentation delivery format, not an editing format. Always edit from the original PPTX file and reconvert for any updates.',
      'Ignoring font rendering for non-standard fonts — if custom decorative fonts are used in title slides, verify they render correctly in the PDF output and are not substituted with generic system fonts.',
      'Converting a presentation containing confidential speaker notes without checking whether notes are included — always verify what notes content is embedded in the PDF output before sharing externally.',
    ],
  },

  'rotate-pdf': {
    tips: [
      'Use the "All Pages" option to rotate every page simultaneously when the entire document is in the wrong orientation — this is faster than rotating pages individually.',
      'For documents where only specific pages need rotation (for example, a landscape chart embedded in a portrait report), select individual pages to rotate rather than rotating the entire document.',
      'Rotate in increments of 90 degrees — most scanned documents that appear sideways need a single 90° rotation, while upside-down documents need 180°.',
      'After rotating, scroll through all pages in the downloaded PDF to confirm every page is in the correct orientation — occasionally a batch rotation misses pages that were already correctly oriented.',
      'If you have a PDF where alternating pages are rotated (common with double-sided document scans), rotate odd-numbered and even-numbered pages separately in two passes.',
      'For government document submissions requiring portrait orientation, use the rotate tool to fix any landscape-oriented pages before submitting — many portals reject PDFs with mixed orientation.',
    ],
    mistakes: [
      'Rotating the entire document when only specific pages need rotation — check which pages are incorrectly oriented before applying rotation to avoid rotating already correctly oriented pages.',
      'Using 270° rotation when 90° in the other direction would achieve the same result more efficiently — 270° clockwise is equivalent to 90° counter-clockwise. Use whichever feels more intuitive.',
      'Expecting the rotation to reflow or re-layout the content — rotation only changes the physical orientation of the page canvas. Text, images, and layout are not re-flowed or repositioned.',
      'Rotating a password-protected PDF without first unlocking it — the tool cannot process encrypted files. Remove the password using the Unlock PDF tool first.',
      'Not saving the rotated PDF with a meaningful filename — save the output with a clear name that distinguishes it from the original to avoid confusing the two versions later.',
      'Forgetting to rotate page thumbnails mentally when reading the page number list — if your PDF viewer shows thumbnail previews and a page appears sideways in the preview, note its page number before entering it in the rotation tool.',
    ],
  },

  'watermark-pdf': {
    tips: [
      'Use diagonal watermark placement at 45° for the most visually prominent result — diagonal watermarks are much harder to crop out of individual pages compared to corner or horizontal placement.',
      'Set opacity to 30-40% for watermarks that need to be visible but should not obscure the underlying document content — this is the standard used for DRAFT and CONFIDENTIAL watermarks in professional documents.',
      'Use uppercase text for status watermarks (CONFIDENTIAL, DRAFT, SAMPLE, COPY) as uppercase lettering is more visually distinct and harder to accidentally overlook when reviewing a document.',
      'For watermarks on documents being shared digitally (not printed), increase opacity to 50-60% since screen displays reduce perceived watermark visibility compared to printed paper.',
      'Add a watermark with your company name or logo text before sharing rate cards, proposals, and pricing documents with multiple prospects to prevent unauthorised redistribution.',
      'Test your watermark on one or two pages in the PDF viewer before distributing to ensure the opacity and positioning look professional and the watermark does not make underlying text illegible.',
    ],
    mistakes: [
      'Setting watermark opacity to 100% — a fully opaque watermark completely obscures the document content underneath, making the document unreadable. Keep opacity below 50% for usable documents.',
      'Using small font sizes for diagonal watermarks — small text at a diagonal angle becomes nearly invisible when printed at standard document size. Use at least 48pt font for A4-size documents.',
      'Placing the watermark in a corner or header area — corner watermarks are easily cropped from a screenshot or printed page without removing important document content. Use full-page diagonal placement for security.',
      'Watermarking a password-protected PDF without first unlocking it — the tool cannot process encrypted files. Always unlock the PDF first and re-protect it after watermarking if needed.',
      'Using a light-coloured watermark text on pages with light backgrounds — grey text on a white page disappears entirely when printed on a low-contrast printer. Use dark grey or blue for reliable printing.',
      'Adding a confidential watermark to a document and then forwarding the unlocked PDF along with the password in the same email — watermarks are not encryption; a determined recipient can still copy or edit the content.',
    ],
  },

  'protect-pdf': {
    tips: [
      'Use a password of at least 12 characters combining uppercase letters, lowercase letters, numbers, and symbols for strong PDF protection — weak passwords can be cracked by readily available PDF password removal software.',
      'Store the password in a password manager immediately after setting it — there is absolutely no way to recover or reset a forgotten PDF password. The document becomes permanently inaccessible without the password.',
      'For documents shared via email with multiple recipients, send the password through a different communication channel (WhatsApp, SMS, or a phone call) to prevent anyone who intercepts the email from accessing the PDF.',
      'Use PDF protection for salary slips, bank statements, medical reports, and legal documents before sharing over messaging apps like WhatsApp, where the file is stored on recipient devices automatically.',
      'For business contracts and NDAs, set both an opening password (to restrict who can read the document) and a permissions password (to prevent printing, copying, or editing) if the recipient\'s PDF viewer supports both.',
      'Verify the protection works by trying to open the PDF in a different browser or on a different device without the password — do this before sending to confirm the encryption was applied correctly.',
    ],
    mistakes: [
      'Using a simple, easily guessable password like "1234", "password", the recipient\'s name, or the document title — these are the first passwords any attacker will try. Use a randomly generated password.',
      'Forgetting the password after sharing — once forgotten, a PDF password cannot be recovered. Always record the password securely in a password manager or a secure note before sharing the document.',
      'Protecting a PDF and then sharing the password in the same message or email — the entire purpose of password protection is defeated if the password travels with the file.',
      'Expecting PDF password protection to be unbreakable forever — AES 128-bit encrypted PDFs (the standard level) provide good security but can be brute-forced over time. Avoid using the same password repeatedly across documents.',
      'Protecting a PDF on a public or shared computer without logging out — the file remains in browser memory during the session, potentially exposing it to other users on the same machine.',
      'Using the tool on a large file over a slow mobile data connection — password protection requires re-processing the entire PDF. For files over 50 MB, use a desktop Wi-Fi connection.',
    ],
  },

  'unlock-pdf': {
    tips: [
      'You must know the correct owner or user password to unlock a PDF — this tool removes a known password from an authorised file you own. It does not crack unknown passwords on files you do not have rights to access.',
      'After unlocking, save the unlocked PDF with a new filename that distinguishes it from the password-protected original — keeping both versions lets you restore protection later if needed.',
      'If you receive a password-protected salary slip, bank statement, or payslip by email, ask the sender for the password through a secure channel before unlocking — the sender sets the password to protect your sensitive information.',
      'Once a PDF is unlocked, it remains unprotected permanently. If you share the unlocked version, the recipient can access all content without any password. Re-protect it using the Protect PDF tool if needed.',
      'For PDFs unlocked to enable editing, verify you are legally permitted to modify the document before making changes — some locked PDFs are read-only for legal or contractual reasons.',
      'If the unlock fails with an error, try entering the password very carefully — PDF passwords are case-sensitive, and a single wrong character (e.g., capitalisation or special character) will cause the unlock to fail.',
    ],
    mistakes: [
      'Attempting to unlock PDFs where you do not know the original password — this tool requires the correct password and cannot bypass unknown encryption. You must have authorised access to the file.',
      'Unlocking and then sharing a document that was password-protected to restrict distribution — once unlocked, the file has no access restriction. Distribute unlocked files only to the intended recipients.',
      'Entering an incorrect password repeatedly — the password is case-sensitive and exact. "Pass@123" and "pass@123" are different passwords. Check the password source carefully before entering.',
      'Expecting to edit fillable form fields after unlocking — some PDFs are protected only against editing by the permissions password (not the opening password). Both types of restriction are removed on unlock.',
      'Using the unlocked PDF version and then discarding the protected original — always keep the original password-protected file in case you need to re-share it with the same or new recipients in the future.',
      'Unlocking a PDF shared by a bank or employer without realising the password was set to protect your personal data — keep unlocked versions of sensitive documents only in secure, private storage.',
    ],
  },

  'organize-pdf': {
    tips: [
      'Use the page thumbnail view to visually confirm the page content before reordering — reading page numbers alone is not sufficient for long documents where many pages look similar.',
      'Drag pages in small increments when reordering a long document — moving a page one position at a time is more accurate than large drags across many pages, reducing the risk of placement errors.',
      'After reordering, scroll through all pages from beginning to end in the output PDF viewer before closing the tool — verifying the complete sequence is the best way to catch accidental page swaps.',
      'Use Organize PDF after merging multiple PDFs to do a final page-order cleanup in one session, rather than re-merging with a different file order.',
      'For documents with a defined structure (cover page, table of contents, sections, appendices), lay out the pages in that exact order and verify against the planned structure before downloading.',
      'Remove blank pages inserted automatically by scanners or printers while in the Organize PDF tool — this reduces final document size and improves the reading experience.',
    ],
    mistakes: [
      'Reordering pages without first checking the page count in the thumbnail view — accidentally moving a page twice or skipping a page is easy in a long list. Always count and verify page totals.',
      'Dragging pages across a large distance in one motion — large drags are imprecise and can cause pages to land in the wrong position. Use small, incremental moves for accurate placement.',
      'Deleting pages before confirming the page content from the thumbnail — a thumbnail preview looks similar for many pages of text-heavy documents. Zoom in to read page content before deleting.',
      'Expecting the tool to automatically sort pages by content or date — the tool rearranges pages manually as directed by you. It does not detect or understand page content.',
      'Not saving the organised PDF immediately after downloading — the organised file only exists during your browser session and cannot be recreated if the page is accidentally closed.',
      'Using Organize PDF to remove a single page when Remove Pages PDF is faster and simpler — use the appropriate tool for the task rather than reorganising an entire document just to delete one page.',
    ],
  },

  'remove-pages-pdf': {
    tips: [
      'Review your page list carefully in a PDF viewer before entering page numbers — page numbering in the PDF file starts at 1 and matches the viewer\'s page counter in the bottom bar or navigation panel.',
      'Use comma-separated page numbers to remove multiple non-consecutive pages in a single operation: for example, enter "3, 7, 12" to remove three specific pages in one pass.',
      'For removing a continuous range of pages (such as an unwanted appendix), use a hyphen: "45-60" removes all pages from 45 through 60 inclusive in one operation.',
      'Download the output PDF immediately after processing and verify the correct pages have been removed by checking the page count and spot-reading key pages in the output file.',
      'If you need to remove pages from a password-protected PDF, unlock it first using the Unlock PDF tool, perform the removal, and re-protect it using the Protect PDF tool if needed.',
      'Keep the original PDF file until you are fully satisfied with the page-removed version — the removal is permanent and cannot be undone in the tool.',
    ],
    mistakes: [
      'Entering page numbers for the pages you want to KEEP instead of the pages you want to REMOVE — the tool removes the pages you specify. Double-check your page list before confirming.',
      'Not verifying the total page count of the output PDF — if you removed 5 pages from a 20-page document, the output should have 15 pages. A mismatch indicates an error in your page number input.',
      'Using 0-based page numbering — the tool uses 1-based page numbering where page 1 is the first page of the document, matching how PDF viewers display page numbers.',
      'Removing pages from a protected PDF without first unlocking it — encrypted PDFs cannot be processed. Use Unlock PDF first.',
      'Accidentally entering a page number that does not exist — entering a page number beyond the document\'s total page count will cause an error. Verify page count before entering range values.',
      'Overwriting the original file with the page-removed version before verifying the output — always save the reduced file as a separate document first and verify it before discarding the original.',
    ],
  },

  'extract-pages-pdf': {
    tips: [
      'Use Extract Pages to pull specific pages from a large document into a focused, smaller PDF — ideal for sharing one chapter of a textbook, one section of a report, or specific invoice pages from a monthly statement.',
      'Specify page ranges using hyphens for consecutive pages ("10-25") and commas for separate pages ("3, 7, 15-20") to extract complex page sets in a single operation.',
      'For PDFs where the printed page numbers differ from the PDF file page numbers (for example, a report starting at page 10 of the PDF but labelled as page 1 in the document), use the file page numbers shown in your PDF viewer\'s navigation bar, not the printed page labels.',
      'After extraction, verify the extracted PDF contains all the correct pages and is in the right order — open the output file and scroll through before sharing.',
      'Use Extract Pages before converting a PDF to another format (Word, Excel, Text) — converting only the relevant pages is faster and produces cleaner output than converting a large full document.',
      'For multi-chapter PDF books and textbooks, extract each chapter to a separate PDF to create a set of focused study materials without paying for chapter-by-chapter book content.',
    ],
    mistakes: [
      'Confusing page ranges for Remove Pages with Extract Pages — Remove Pages deletes the specified pages and keeps the rest; Extract Pages keeps only the specified pages and discards the rest. Verify which operation you intend.',
      'Expecting the tool to automatically detect logical sections like chapters — it extracts only the page numbers you specify. You must identify the correct page numbers for each section manually.',
      'Entering the wrong page range and extracting incorrect pages — always double-check the first and last page numbers of your target range by viewing the PDF before entering them.',
      'Not checking for cross-references in the extracted pages — extracting a chapter from a report may leave broken references to pages, figures, or tables that are in other parts of the document not included in your extract.',
      'Trying to extract pages from an encrypted PDF without first removing the password — use Unlock PDF first if the file is password-protected.',
      'Expecting hyperlinks to other pages in the document to work correctly in the extracted PDF — internal cross-reference links pointing to pages outside the extracted range will become broken links.',
    ],
  },

  'page-numbers-pdf': {
    tips: [
      'Set the starting page number correctly if the document already has a title page or table of contents that should not be counted — for example, set "Start numbering from 3" to skip the first two pages.',
      'Choose a consistent font size for page numbers — 10pt or 11pt is the standard size for A4 documents. Smaller sizes become difficult to read in print, especially at the bottom of the page.',
      'Position numbers in the bottom centre or bottom right for standard documents. Bottom right is conventional for most professional business reports and legal documents in India.',
      'For double-sided printing documents, place page numbers on the outer margins — right-aligned on odd pages and left-aligned on even pages — for a professional book-style layout.',
      'Test the page numbering on a small extracted section of your document first before applying to the full PDF, so you can verify positioning, size, and starting number without having to re-process the entire file.',
      'After adding page numbers, verify the output in both a PDF viewer and by printing a test page — on-screen positioning sometimes differs slightly from printed positioning.',
    ],
    mistakes: [
      'Setting the starting page number to 1 when your document has already been partially numbered — adding page numbers to a PDF that already has them creates duplicate page numbers. Check for existing numbering first.',
      'Choosing a font size that is too small (below 8pt) or too large (above 14pt) — very small numbers are illegible in print, and very large numbers can visually dominate the page footer and look unprofessional.',
      'Placing page numbers over content area — if your document has very small margins, the page number may overlap body text or footnotes. Ensure adequate margin space before applying numbering.',
      'Forgetting to specify an offset for documents where numbering should begin at a value other than 1 — if your report has a cover page and table of contents, the first numbered page should typically start at page 3 or later in the document.',
      'Applying page numbers before merging PDFs — if you need to merge multiple PDFs into one, merge first and then add page numbers to the combined document to ensure sequential numbering across all sections.',
      'Not downloading the output immediately and closing the browser tab — the numbered PDF only exists during your browser session.',
    ],
  },

  'pdf-editor': {
    tips: [
      'Use the text annotation tool to add notes and comments directly on the PDF rather than editing the underlying text — the editor is best suited for annotation, not full text rewriting.',
      'For signing contracts and agreements, use the signature tool to draw or upload your signature and place it precisely on the designated signature line, then flatten the PDF before sending.',
      'Save your work progressively — use the download button after completing each major edit section in case the browser session times out or is interrupted before you finish all annotations.',
      'Zoom in to 100-150% when placing text annotations to ensure your additions align precisely with the original document layout, especially for forms with small text fields.',
      'For adding text to blank form fields in a PDF, use the text box tool rather than trying to edit the existing printed text — text box additions are cleaner and do not alter the original document content.',
      'Before sharing an annotated PDF, flatten all annotation layers into the document so that the recipient cannot remove or alter your markups — look for a "Flatten" or "Save with annotations embedded" option.',
    ],
    mistakes: [
      'Expecting the PDF editor to function as a full word processor — PDF editors handle annotation, signatures, and form filling well, but wholesale paragraph rewriting or reformatting is difficult. Use Word or Google Docs for heavy editing and convert to PDF afterward.',
      'Trying to edit text in a scanned PDF — scanned PDFs contain images of pages, not editable text layers. Only natively digital PDFs allow text layer editing in a PDF editor.',
      'Not saving (downloading) the annotated file before closing the browser tab — all unsaved work is permanently lost when the browser session ends.',
      'Adding visible annotation markers that obscure important document content — resize and position text boxes and stamps so they complement the document rather than covering critical text or signatures.',
      'Signing a document with a low-resolution image of a signature — use a clean, high-contrast signature drawn on the editor\'s drawing pad or uploaded as a PNG with transparent background for a professional result.',
      'Editing a protected PDF without first removing the permissions password — PDFs with editing restrictions cannot be annotated. Use the Unlock PDF tool first if you are authorised to edit the file.',
    ],
  },

  // ── Calculators ─────────────────────────────────────────────────────────────

  'bmi-calculator': {
    tips: [
      'Weigh yourself in the morning before eating and after using the toilet for the most consistent and accurate BMI measurements — body weight fluctuates by 1-2 kg throughout the day depending on food, water, and clothing.',
      'Measure your height accurately using a wall-mounted measuring tape with your heels against the wall and head level — self-reported height estimates are often 1-3 cm higher than actual measured height, which shifts your BMI category.',
      'For Indian adults, use the ICMR threshold (overweight at BMI 23, obese at BMI 27.5) rather than the WHO threshold (overweight at 25) — South Asians carry more visceral fat at lower BMI values, creating higher metabolic risk.',
      'Track your BMI over 3-6 month intervals rather than weekly — short-term weight fluctuations from water retention, menstrual cycles, and seasonal changes make frequent BMI checks misleading.',
      'If your BMI places you near the boundary of two categories (e.g., 22.8 or 24.7), also measure your waist circumference — above 80 cm for women and 90 cm for men indicates abdominal obesity regardless of BMI category.',
      'BMI is a screening tool, not a diagnostic measure — always discuss your BMI result with a doctor who can assess it alongside blood glucose, lipid profile, blood pressure, and lifestyle factors.',
    ],
    mistakes: [
      'Using estimated or rounded height values — rounding 171 cm to 170 cm shifts BMI by 0.1-0.2 points, which can change your category if you are near a threshold. Use your exact measured height.',
      'Measuring weight wearing heavy clothing or shoes — footwear and heavy clothing add 0.5-2 kg. Weigh yourself in light clothing or use the standard practice of weighing without shoes.',
      'Assuming BMI is the only health indicator you need — bodybuilders and athletes with high muscle mass have elevated BMI despite low body fat. BMI is unreliable for assessing fitness professionals and trained athletes.',
      'Panicking over a BMI that falls just over a threshold — a BMI of 25.2 versus 24.8 is a difference of 1 kg for a 170 cm person. The boundaries are arbitrary cut-off points in a continuous scale, not sharp health transitions.',
      'Applying adult BMI thresholds to children or teenagers under 18 — paediatric BMI uses age-and-sex-specific percentile charts, not the fixed adult thresholds. Consult a paediatrician for children.',
      'Using BMI alone to make diet or exercise decisions without professional guidance — a doctor, dietitian, or certified fitness professional can provide a complete health assessment and personalised recommendations.',
    ],
  },

  'sip-calculator': {
    tips: [
      'Use the Goal-Based mode to work backwards from your target corpus — enter the amount you need (e.g., ₹50 lakh for education in 15 years) and the tool calculates the exact monthly SIP required at your expected return rate.',
      'Run your calculation at 10%, 12%, and 15% return rates simultaneously using the sensitivity table — this shows you a realistic range of outcomes and helps you plan for lower-than-expected market returns.',
      'Increase your SIP amount by 10-15% each year using the Step-Up SIP feature offered by most mutual fund AMCs — a ₹5,000 SIP growing at 10% annually produces nearly 2x the corpus of a flat ₹5,000 SIP over 20 years.',
      'Use the SIP calculator alongside the PPF and FD calculators to compare the after-tax returns on equity SIP vs debt instruments for the same investment period and amount.',
      'For SIPs started after April 1 (start of Indian financial year), add an extra month of investment to your duration calculation to account for the first investment in the new financial year.',
      'Always check your actual fund\'s NAV history to compare the historical CAGR of your chosen fund against the return rate you are assuming in the SIP calculator — past performance is not guaranteed but provides useful context.',
    ],
    mistakes: [
      'Assuming a fixed 15% or 18% annual return as your base case — Indian equity mutual funds have historically delivered 12-15% CAGR over long periods, but individual years can be -30% to +50%. Use 10-12% as a conservative planning rate.',
      'Calculating SIP maturity without accounting for inflation — if your goal is ₹1 crore in 20 years, that ₹1 crore will have the purchasing power of about ₹45-55 lakh in today\'s money at 3% inflation. Plan for inflation-adjusted goals.',
      'Stopping SIP during market downturns — market corrections are precisely when SIP\'s rupee-cost averaging works best by buying more units at lower prices. Stopping SIP during corrections reduces long-term returns significantly.',
      'Treating the SIP calculator result as a guaranteed outcome — all SIP return projections are mathematical estimates based on assumed rates. Actual returns depend on fund performance and market conditions.',
      'Starting a SIP without having an emergency fund in place — if you face a financial emergency and must stop or redeem your SIP early, you may incur exit loads and miss the compounding benefit. Maintain 3-6 months of expenses as liquid savings before starting a SIP.',
      'Ignoring expense ratio — a fund with 1.5% expense ratio versus 0.5% expense ratio (direct plan) produces significantly different final corpus over 20 years. Use direct plans through AMC websites or platforms like Coin or Kuvera.',
    ],
  },

  'ppf-calculator': {
    tips: [
      'Invest in PPF by the 5th of every month to earn interest for the full month — PPF interest is calculated on the minimum balance between the 5th and the last day of each month. Late investments lose a full month of interest.',
      'Invest the maximum ₹1.5 lakh annually to claim the full Section 80C deduction and maximise compound interest — partial contributions still earn 7.1% compounded annually but leave Section 80C savings unused.',
      'Consider investing the annual ₹1.5 lakh as a lump sum at the start of the financial year (April 5) rather than monthly instalments — this maximises months of interest compounding compared to spreading investment across 12 months.',
      'Open a PPF account in a child\'s name for education goals — a minor\'s PPF account falls within the parent\'s ₹1.5 lakh annual limit. The 15-year maturity aligns with college age for children born when the account is opened.',
      'After the initial 15-year maturity, extend in 5-year blocks with contributions to continue earning 7.1% tax-free compounded returns beyond maturity — the account can be extended indefinitely in 5-year increments.',
      'Use the loan-against-PPF facility (available from Year 3 to Year 6) as an emergency fund option — it offers a lower interest rate than personal loans (2% above PPF rate) and does not require any credit check.',
    ],
    mistakes: [
      'Investing after the 5th of the month — the interest calculation window runs from the 5th to the last day of the month. Investing even one day late loses a full month of interest on that instalment.',
      'Withdrawing the PPF amount at 15-year maturity without evaluating extension — at 7.1% compounded annually with EEE tax status, continuing to invest for an additional 5-10 years provides excellent tax-free returns. Do not exit prematurely without comparing alternatives.',
      'Opening a PPF account at a bank branch and ignoring the option to invest online — all public sector and private banks allow PPF investments through their net banking portals, making it easy to automate monthly investments without visiting a branch.',
      'Believing PPF interest is paid monthly — PPF interest is computed monthly but credited to the account only once per year on March 31. The interest statement shows the monthly computation for reference.',
      'Investing in PPF as the sole retirement corpus — while PPF is an excellent tax-efficient component, 15-year lock-in and 7.1% returns may not beat long-term inflation for retirement needs. Diversify with equity SIP and NPS for retirement.',
      'Confusing PPF with National Savings Certificate (NSC) — NSC has a fixed 5-year tenure with taxable interest (though reinvested interest qualifies for 80C), while PPF has a 15-year tenure with fully tax-free interest.',
    ],
  },

  'fd-calculator': {
    tips: [
      'Compare effective annual yield (EAR) rather than just the nominal interest rate when comparing FDs with different compounding frequencies — a 7% monthly-compounding FD yields more than a 7% quarterly-compounding FD despite the same stated rate.',
      'Choose quarterly compounding (standard for most Indian bank FDs) over annual compounding for the same rate — quarterly compounding delivers marginally more return through more frequent interest-on-interest cycles.',
      'Submit Form 15G (if below 60 years) or Form 15H (if 60 years or above) at the start of each financial year at your bank branch or net banking to prevent TDS deduction if your total income is below the taxable threshold.',
      'For tax-saving FDs under Section 80C, lock in at the current rate for 5 years and compare the effective post-tax return against PPF — if you are in the 30% tax slab, PPF\'s EEE status is typically superior to a tax-saving FD.',
      'Check Small Finance Banks like AU Small Finance, ESAF, and Jana for higher FD rates (0.5-1% above major bank rates), which are covered by DICGC insurance up to ₹5 lakh per depositor per bank — the same insurance protection as nationalised banks.',
      'Split large FD investments across multiple banks to stay within the ₹5 lakh DICGC insurance limit per bank per depositor — this ensures complete insurance coverage for large corpus investments.',
    ],
    mistakes: [
      'Comparing FD rates using only the nominal interest rate without accounting for compounding frequency — two FDs with the same stated rate but different compounding frequencies produce different maturity values over the same period.',
      'Not accounting for TDS when comparing FD returns with tax-free instruments like PPF or ELSS — a 7% FD in the 30% tax slab delivers a net yield of approximately 4.9% after TDS and tax, far below PPF\'s 7.1% tax-free return.',
      'Placing all savings in a single bank FD for safety — while FDs are very safe, keeping amounts above ₹5 lakh with a single bank creates uninsured exposure. Diversify across banks to stay within DICGC limits.',
      'Breaking an FD prematurely without calculating the penalty — most banks charge 0.5-1% interest penalty for premature withdrawal. For short-term liquidity needs, maintain a liquid fund or savings account buffer to avoid breaking FDs early.',
      'Reinvesting FD maturity amounts without comparing current rates — FD rates change quarterly, and the rate at renewal may be significantly different from your original rate. Always compare current rates across banks at renewal time.',
      'Not using the senior citizen rate toggle for investors aged 60 and above — most banks offer 0.25-0.5% additional interest to senior citizens. This adds up significantly over 3-5 year tenures.',
    ],
  },

  'tax-calculator': {
    tips: [
      'Run both Old Regime and New Regime calculations with your actual deductions before making your regime declaration to your employer — this takes 5 minutes with the calculator and can save thousands of rupees by choosing correctly.',
      'For the Old Regime, ensure you include all eligible deductions: Standard Deduction (₹50,000 for salaried), HRA exemption, 80C investments (PPF, ELSS, LIC, home loan principal), 80D health insurance, and Section 24(b) home loan interest up to ₹2 lakh.',
      'If your total Old Regime deductions are below ₹3.5 lakh (approximate break-even for a ₹15 lakh income), the New Regime is likely more beneficial — the exact break-even depends on your specific income level.',
      'For freelancers and self-employed professionals, include business expenses allowed under Section 44ADA (presumptive taxation scheme at 50% of gross receipts as taxable income) before calculating tax.',
      'Pay advance tax by December 15 and March 15 if your net tax liability exceeds ₹10,000 for the year — failing to pay advance tax on time attracts interest under Sections 234B and 234C at 1% per month.',
      'Use the calculator at the start of the financial year (April) to plan your investment declarations to HR rather than scrambling in February when most employers close the investment declaration cycle.',
    ],
    mistakes: [
      'Claiming HRA exemption under the Old Regime without keeping rent receipts and the landlord\'s PAN (for annual rent above ₹1 lakh) — the HRA exemption is subject to employer and ITD scrutiny, and missing documents can lead to tax demand notices.',
      'Forgetting to include all sources of income — interest from savings accounts (taxable above ₹10,000 per year under Section 80TTA), fixed deposit interest, rental income, and capital gains must all be included in gross income.',
      'Assuming you can switch between New and Old Regime freely every year — salaried individuals can switch regime every year when filing ITR; business income earners can switch only once.',
      'Missing the Section 87A rebate — if your taxable income (after all deductions under Old Regime) is at or below ₹5 lakh, or below ₹7 lakh under the New Regime, the full tax liability is rebated to zero. Many taxpayers miss this.',
      'Not accounting for surcharge — the calculator includes surcharge, but many taxpayers with incomes approaching ₹50 lakh or ₹1 crore are unaware of the significant additional tax liability from surcharge and marginal relief.',
      'Treating the calculator\'s output as a final tax return — the calculator gives a reliable estimate, but your actual ITR may differ based on exact deduction documentation, advance tax already paid, TDS credits, and any carryforward losses.',
    ],
  },

  'loan-calculator': {
    tips: [
      'Compare EMIs across multiple tenure options (15 years, 20 years, 25 years) using the calculator before choosing your loan tenure — a shorter tenure means higher EMI but dramatically lower total interest, while a longer tenure is more affordable monthly but far more expensive overall.',
      'Use the prepayment impact calculator to see how a one-time lump-sum prepayment (such as a bonus, maturity of an FD, or sale proceeds) reduces your remaining tenure and total interest — even a small prepayment in the first 3 years saves significant interest.',
      'Before approaching a bank for a home loan, calculate the EMI for your target loan amount and verify it stays within 40-50% of your net monthly take-home salary — this is the maximum EMI-to-income ratio most banks use for loan approval.',
      'Factor in processing fees, stamp duty, and registration charges when planning a home purchase — these can add 8-10% to the total cost beyond the loan amount and are typically not covered by the home loan.',
      'If you are comparing a home loan balance transfer to a lower-rate bank, use the loan calculator to compare total interest remaining at the current rate versus the new rate, and deduct the balance transfer processing fee to determine if the transfer is genuinely beneficial.',
      'Always ask for the loan\'s Effective Interest Rate (EIR) which includes processing fees and other charges — the stated interest rate alone does not capture the full cost of the loan.',
    ],
    mistakes: [
      'Calculating affordability based on gross salary (CTC) rather than net take-home salary — banks assess loan eligibility based on net take-home pay after PF, taxes, and other deductions. Use your actual in-hand salary for EMI-to-income calculations.',
      'Choosing the longest available tenure to minimise EMI without calculating total interest outflow — a ₹50 lakh home loan at 8.5% for 30 years versus 20 years pays ₹25+ lakh more in total interest for the convenience of a lower monthly EMI.',
      'Not accounting for EMI reset when floating interest rates change — floating rate home loans (the most common in India) change EMI or tenure when the RBI changes the repo rate. Build a buffer in your monthly budget for potential EMI increases.',
      'Using the loan calculator\'s amortisation table without understanding that early EMIs are almost entirely interest — in the first year of a 20-year home loan, over 85% of each EMI payment is interest. Very little principal is repaid in early years.',
      'Comparing home loan and car loan interest rates without noting the different compounding methods — home loans in India use monthly reducing balance, which is the most borrower-friendly method. Verify this when comparing loans from different lender types.',
      'Ignoring insurance requirements bundled with loans — many lenders require home loan insurance or link term insurance as a loan condition. These premiums add to the effective cost of borrowing.',
    ],
  },

  'roi-calculator': {
    tips: [
      'Always use CAGR (Compound Annual Growth Rate) — also called Annualized ROI — when comparing investments held for different time periods. Simple ROI without normalising for time is misleading for multi-year comparisons.',
      'For real estate ROI calculations, include all acquisition costs in your initial investment: stamp duty (5-7%), registration fees (1%), brokerage (1-2%), and renovation/interior costs — these significantly reduce the effective ROI.',
      'Run the multi-investment comparison for at least 4 asset classes simultaneously: equity (Nifty 50 index fund), gold, PPF/FD, and real estate using your actual purchase dates and values to see which has truly performed best for you.',
      'For stock investments, add dividends received to the current value in your ROI calculation — total return including dividends is higher than price appreciation alone, especially for dividend-yield stocks like FMCG, utilities, and PSU banks.',
      'When calculating ROI on a business investment, include the opportunity cost — the return you could have earned investing the same capital in a safe instrument like an FD or PPF. An investment that earns 8% CAGR is not creating value if an FD earns 7.5%.',
      'Adjust ROI for inflation to get the real (inflation-adjusted) return — a 10% CAGR investment in an environment of 6% inflation produces a real return of only about 3.8%, not 10%.',
    ],
    mistakes: [
      'Comparing investments using simple ROI without normalising for time — a 100% ROI over 5 years is a 14.9% annual CAGR, while a 100% ROI over 10 years is only 7.2% annual CAGR. Always convert to CAGR for fair comparison.',
      'Forgetting to include transaction costs in the initial investment base — brokerage, STT, and GST on equity trades reduce your effective purchase price and therefore reduce actual ROI from the stated purchase price.',
      'Ignoring taxation on capital gains when comparing asset classes — long-term capital gains from equity are taxed at 12.5% above ₹1.25 lakh per year, while PPF and Sukanya Samriddhi returns are tax-free. After-tax ROI is what matters.',
      'Using the CAGR from a brief exceptional period as the expected long-term return — Nifty 50 returned 20%+ CAGR in some 3-year periods. Using that as a planning assumption for the next 20 years leads to significant under-saving.',
      'Treating ROI as the sole investment decision criterion — volatility (standard deviation), maximum drawdown, and correlation with other assets in your portfolio are equally important factors that ROI alone does not capture.',
      'Not accounting for reinvested dividends in mutual fund NAV — mutual fund NAVs for growth option already include reinvested dividends, while dividend option NAVs do not. Compare like-for-like by using growth option NAVs.',
    ],
  },

  'gst-calculator': {
    tips: [
      'Use the "Remove GST" (GST-inclusive) mode to reverse-extract the base price and GST from a GST-inclusive amount you received — this is essential for verifying that the correct GST has been charged on vendor bills.',
      'Verify the correct GST slab for every product or service before raising an invoice — GST rates vary by item and incorrect slabs attract GST department notices, penalties, and require amendment of already filed GSTR-1 returns.',
      'Use the CGST/SGST split for intra-state supplies (within the same state) and IGST for inter-state supplies — the calculator automatically computes both. Verify which applies based on your supplier and buyer GST state codes (first 2 digits of GSTIN).',
      'For services attracting 18% GST (most professional services including IT, consulting, design, and finance), verify whether your service falls under the forward charge mechanism or reverse charge mechanism (RCM) — under RCM the buyer pays GST directly to the government.',
      'Save the calculated CGST/SGST/IGST breakdown to use in your GST-compliant invoice — the invoice must show the tax rate, CGST amount, SGST/IGST amount, and total tax separately as required by GSTN invoice format rules.',
      'For mixed supplies (goods with services bundled together), calculate GST using the rate of the principal supply — the highest rate in the bundle applies to the entire transaction under composite supply rules.',
    ],
    mistakes: [
      'Applying the wrong GST slab — common mistakes include 12% on items actually taxed at 18% (such as restaurant services in hotels above ₹7,500/night) or 18% on items in the 5% slab (such as certain food products). Always verify the HSN/SAC code and rate.',
      'Using GST-exclusive calculation (Add GST) when you actually received or paid a GST-inclusive amount — the two modes give completely different results. Verify which mode applies to your specific transaction.',
      'Confusing intra-state and inter-state transaction classification — if your customer\'s GSTIN starts with a different state code (first 2 digits) than yours, it is an inter-state supply requiring IGST, not CGST+SGST.',
      'Ignoring GST on advances received — advance payments for supply of goods (not services as of 2022) are taxable under GST at the time of receipt, not at the time of supply. Consult your CA for current advance payment rules.',
      'Raising a GST invoice without a valid GSTIN — if you are GST-registered, every B2B invoice must include your GSTIN and the customer\'s GSTIN. Missing GSTINs prevent the customer from claiming Input Tax Credit.',
      'Not maintaining records of GST invoices in the format required by GSTN — all GST-registered businesses must maintain invoices in the prescribed format and reconcile with their GSTR-1 monthly or quarterly filing.',
    ],
  },

  'tip-calculator': {
    tips: [
      'Always check your bill first for a service charge already added by the restaurant — many upscale and hotel restaurants in India add a 5-10% service charge automatically. Adding an additional tip on top of an existing service charge is not necessary.',
      'For corporate expense reimbursement, check your company\'s expense policy — most Indian corporate expense policies allow restaurant tips up to 10-15% of the bill. Keeping your tip within this range ensures smooth reimbursement approval.',
      'When splitting a bill with a large group, use the per-person calculation from the tip calculator and communicate the amount clearly — this avoids the awkward situation of people contributing different amounts and the tip shortfall.',
      'For food delivery tips on Swiggy or Zomato, a cash tip of ₹20-50 per delivery is appreciated and goes directly to the delivery partner, unlike in-app tips which may be subject to platform handling.',
      'When travelling internationally, research the local tipping culture before your trip — tipping is effectively mandatory in the US (15-20%), customary in the UK (10-12%), unnecessary in Japan (considered rude), and variable in Southeast Asia.',
      'For restaurant service where a child dropped your food or there was a kitchen error (not a server error), consider separating the tip decision — service failures outside the server\'s control are generally not penalised in tipping etiquette.',
    ],
    mistakes: [
      'Tipping on top of a service charge without checking whether the service charge goes to staff — in many Indian restaurants and hotels, service charges go to management, not directly to the waitstaff. Ask the manager if tipping staff directly is preferred.',
      'Calculating the tip percentage on the bill total including already-charged GST — tip percentage conventionally applies to the pre-tax subtotal in the US, though in India it is typically calculated on the total bill amount. Be aware of which is expected.',
      'Splitting the bill equally when group members ordered very different amounts — equal splits are simple but can cause discomfort. Use the total per-person option only when everyone ordered similar amounts and has agreed to an equal split.',
      'Assuming no tip is needed because payment is by card at a POS terminal — in Indian restaurants, card tips are often not passed directly to waitstaff. A small cash tip is often more direct and appreciated.',
      'Rounding up calculations manually and making arithmetic errors under social pressure — use the calculator for accurate results and avoid the embarrassment of shortchanging the tip when paying in a group.',
      'Tipping in Japan or South Korea — tipping in these countries is not customary and is sometimes considered impolite or even offensive. When travelling internationally, research local customs before tipping.',
    ],
  },

  'age-calculator': {
    tips: [
      'For government recruitment eligibility checks (UPSC, SSC, banking, railway), calculate your age as of the "last date for submitting applications" specified in the official notification — this is the legally recognised reference date for age determination.',
      'For insurance form submissions that ask for "age at last birthday", use the calculator with today\'s date and read the "years completed" figure — this is your last completed year of age, not your nearest birthday.',
      'Use the Date Difference feature to calculate the number of days you have spent in India for financial year residency determination (182-day rule) — enter your departure date as the start and arrival date as the end for each travel episode, then sum the periods.',
      'For marriage registration and passport applications, calculate the age from your official date of birth as recorded in your birth certificate, Aadhaar, or school leaving certificate — discrepancies between documents can cause issues.',
      'Parents checking school admission age eligibility should use the cutoff date specified by the school or state education board (June 1 or September 30 depending on the board) — your child must be the minimum age on that specific date.',
      'Save or screenshot the age calculation result along with the input date of birth for documentation purposes before submitting applications that require age proof calculations.',
    ],
    mistakes: [
      'Using today\'s date for government recruitment age eligibility when the form specifies a particular cutoff date — always use the "last date of application" as the reference date for age eligibility calculations, not today.',
      'Confusing age at last birthday with age at next birthday — insurance and medical forms typically use age at last birthday (completed years), not next birthday. The calculator clearly shows both.',
      'Entering a date of birth in the wrong format — verify whether the tool expects DD/MM/YYYY or YYYY-MM-DD format and enter accordingly. An incorrect date format produces a completely wrong age result.',
      'Using the calculator for a date of birth that has a discrepancy across documents — if your Aadhaar shows one date and your birth certificate shows another, resolve the document discrepancy officially before relying on any age calculation.',
      'Not accounting for the time zone when calculating age for international documents — age calculations are generally done in the local time zone of the issuing country, but verify requirements for internationally valid documents.',
      'Trusting an estimate of your birth date for official submissions — always use the date on your official documents (birth certificate, Aadhaar, passport) even if family recollection differs.',
    ],
  },

  'percentage-calculator': {
    tips: [
      'Use the "Find What Percentage" mode (Mode 2) to quickly determine what percentage a partial amount is of the total — useful for calculating your monthly savings rate, portfolio allocation, or exam score percentage.',
      'Use the "Percentage Change" mode to calculate month-on-month or year-on-year growth rates for business metrics — enter the previous period value as the base and the current period value as the new amount.',
      'For GST reverse calculation (finding the pre-GST price from a GST-inclusive amount), use the "Find Original Value" mode (Mode 4) with the GST percentage as the change — enter the inclusive price and the applicable GST rate.',
      'Memorise the key percentage equivalents for quick mental maths: 10% = divide by 10; 25% = divide by 4; 50% = divide by 2; 75% = three-quarters; 1% = divide by 100. These cover most everyday percentage needs.',
      'When working with large financial figures in lakhs and crores, verify the calculator result by doing a rough manual check — if 15% of ₹12 lakh should be ₹1.8 lakh, and you get ₹18 lakh, there is a decimal error.',
      'For exam mark calculations, use "X is what % of Y" mode to convert marks obtained out of any total (e.g., 345/500) to percentage (69%) for university applications that require percentage rather than marks.',
    ],
    mistakes: [
      'Confusing percentage change with percentage point change — if interest rates rise from 6% to 8%, that is a 2 percentage point increase but a 33.3% change. These measure different things and are not interchangeable.',
      'Adding percentages directly when they apply to different bases — "20% off plus an additional 10% off" is not 30% off. The second discount applies to the already-reduced price, giving 28% total savings.',
      'Using the wrong mode for the calculation type — "What is 20% of 500" (Mode 1 result: 100) is different from "500 is 20% of what" (Mode 4 result: 2500). Select the correct mode before entering values.',
      'Forgetting to express percentage change as positive or negative — a change from 80 to 60 is a 25% decrease (negative), not a 25% increase. Always verify the direction of the change.',
      'Calculating simple percentage without accounting for compounding over multiple periods — 10% growth for 3 years is not 30% total. It is 1.10 × 1.10 × 1.10 = 33.1% total compounded growth.',
      'Rounding intermediate results before the final calculation — rounding 33.333% to 33% in an intermediate step before multiplying by a large number introduces significant error. Let the calculator use full precision throughout.',
    ],
  },

  'gpa-calculator': {
    tips: [
      'Verify which CGPA-to-percentage conversion formula your university uses before applying it — Anna University uses CGPA × 9.5, VTU uses (CGPA × 10) − 7.5, and Mumbai University uses (CGPA − 0.5) × 10. Using the wrong formula produces incorrect percentage for university-specific applications.',
      'For placement eligibility, check the exact CGPA cutoff of each company you are targeting — most product companies require 7.0 CGPA minimum while large IT services companies like TCS and Infosys typically require 6.0 minimum. Verify before applying.',
      'Enter all subjects including optional and additional subjects if your university grades them — some universities include all graded subjects in CGPA computation while others exclude certain practicals or projects. Check your university\'s rules.',
      'For US university applications, convert your CGPA using the straightforward formula CGPA/10 × 4.0 as a rough indicator, but always mention your CGPA on the Indian 10-point scale alongside the conversion — US universities are familiar with both.',
      'Track your semester-by-semester SGPA progression to see which semesters dragged down your CGPA — identifying weak semesters helps you focus improvement efforts and provides context during campus interviews.',
      'For government PSU recruitment through GATE, verify whether the minimum CGPA requirement applies to overall CGPA or only to core engineering subjects — some PSUs have separate thresholds for aggregate and core subject performance.',
    ],
    mistakes: [
      'Using the wrong credit weightage for subjects — core subjects typically carry 4 credits, laboratory practicals 2 credits, and minor subjects 2 credits. Using equal weights for all subjects produces an inaccurate CGPA.',
      'Applying the Anna University percentage formula to a VTU transcript — each university has its own conversion method. Using the wrong formula can result in a stated percentage that is 5-8 percentage points away from the university-recognised value.',
      'Entering grade points instead of letter grades when the calculator expects grade points — some universities use letter grades (O, A+, A, B+, B, C, F) while others assign numeric grade points (10, 9, 8, 7, 6, 5, 0). Use the correct system for your university.',
      'Ignoring backlogs and failed subjects — subjects with an "F" grade carry 0 grade points but still count in the total credits, significantly dragging down CGPA. Include all subject attempts in the calculation for accuracy.',
      'Calculating CGPA only for one semester and treating it as your overall CGPA — companies and universities require the cumulative CGPA across all completed semesters, not just the most recent or best semester.',
      'Using a CGPA calculator app or tool that does not allow custom credit hours — most online CGPA calculators assume uniform 3 or 4 credits per subject. If your subjects have varying credits (2, 3, 4, or 5), use a calculator that accepts custom credit values.',
    ],
  },

  'discount-calculator': {
    tips: [
      'Use the "Find Original Price" mode (Mode 3) to reverse-calculate whether a sale price represents genuine savings — enter the sale price and the advertised discount percentage to find what the "original" price should be and compare it to the pre-sale price.',
      'For stacked discounts (e.g., "20% off + extra 10% off"), apply the first discount, then apply the second discount to the already-reduced price — the tool handles this in two passes. Never add the percentages together.',
      'Check whether a "flat ₹500 off" or a "20% off" gives better savings before checkout on large purchases — use the percentage discount mode to convert the flat discount to a percentage and compare.',
      'For B2B purchases requiring GST-inclusive discount verification, use the discount calculator to verify the discounted pre-GST base before applying GST — some sellers apply discounts on the taxable value before GST, others on the MRP.',
      'Save screenshots of the original price and sale price during online shopping events — use the Find Discount Percentage mode to verify that the stated discount percentage is correctly calculated before making a purchase decision.',
      'For purchase comparisons across platforms (Amazon vs Flipkart vs Meesho), convert all offers to a common base: calculate the final price after all applicable coupons and bank offers to find the genuinely cheapest option.',
    ],
    mistakes: [
      'Adding percentage discounts arithmetically — "20% off and then 10% off" is not 30% off. The effective total discount from stacking 20% and 10% is 28%, not 30%. Apply each discount sequentially.',
      'Calculating percentage discount on MRP when the vendor has already inflated the MRP — during Indian online sale events, some sellers inflate MRP before the sale period to make the discount appear larger. Use historical price tracking apps like Keepa or CamelCamelCamel to verify true pre-sale prices.',
      'Ignoring delivery charges when comparing discounted prices — a 25% discount but ₹200 delivery charge may not be better than 20% off with free delivery on a ₹1,000 item.',
      'Confusing the discounted price with the discount amount — if a ₹2,000 item is "₹500 off", the discounted price is ₹1,500, not ₹500. Use the calculator to avoid this confusion in high-pressure purchase decisions.',
      'Using the discount calculator without checking for coupon codes that can stack on top of the displayed sale price — additional coupon discounts apply to the already-discounted price, giving a compounded total saving beyond the advertised discount.',
      'Not factoring in EMI interest when evaluating "no cost EMI" offers — true no-cost EMI is fully subsidised by the seller. Verify whether the EMI interest is included in the product price before comparing against a full payment alternative.',
    ],
  },

  // ── Converters & Productivity ────────────────────────────────────────────────

  'image-compressor': {
    tips: [
      'Start at 80% quality for most compression tasks — this setting reduces file size by 60-70% for typical photographs while maintaining visual quality that is indistinguishable from the original at normal viewing distances.',
      'For government portal photo uploads (passport, UPSC, bank exam, Aadhaar), target a file size well below the portal\'s stated limit (e.g., compress to 40 KB if the limit is 50 KB) to avoid upload failures caused by size fluctuations.',
      'Use the side-by-side preview to compare original and compressed quality before downloading — zoom into faces, small text, and fine details to verify the compressed version is still acceptable for your use case.',
      'Compress images before converting to PDF using the JPG to PDF tool — smaller source images create smaller output PDFs, which is important for multi-image documents submitted to government portals.',
      'For product images on Amazon India or Flipkart, balance file size against visual quality — overly compressed product images with visible artefacts reduce click-through rates and conversions. Use 75-85% quality for marketplace listings.',
      'For WhatsApp profile photos and contact images, 70-75% compression is excellent — WhatsApp applies its own additional compression during upload, so starting with a smaller file size reduces double-compression artefacts.',
    ],
    mistakes: [
      'Setting quality below 50% for documents containing text, QR codes, or barcodes — extreme JPEG compression introduces blocking artefacts around sharp edges that make text illegible and QR codes unscannable.',
      'Compressing an image that has already been heavily compressed — repeatedly compressing a JPEG degrades quality cumulatively. Always compress from the original high-resolution source image, not from a previously compressed version.',
      'Using PNG output for photographs when JPEG would provide much better compression — PNG is lossless and ideal for graphics with sharp edges and flat colours, but produces much larger files for photographic content.',
      'Compressing a face photo for official documents below the minimum quality required — government portals for passport, visa, and exam registration have minimum DPI and resolution requirements. Check these before compressing.',
      'Not checking the compressed file size in the preview — the quality slider gives a quality percentage, not a target file size. Always check the displayed compressed file size against your target limit.',
      'Compressing the same source image multiple times with small adjustments instead of going back to the original — each compression cycle adds quality loss. Return to the original source image for each compression attempt.',
    ],
  },

  'qr-code-generator': {
    tips: [
      'Always test-scan a QR code with at least two different phone camera apps (Google Lens, Samsung camera, and a dedicated QR scanner app) before printing on business cards, menus, or packaging.',
      'Use High error correction level (30% damage tolerance) for any QR code that will be printed on physical materials — printed QR codes can get scratched, stained, or partially obscured, and High error correction maintains scannability under adverse conditions.',
      'For UPI payment QR codes, test the payment link by scanning with Google Pay, PhonePe, and Paytm separately before deploying — UPI deep-link format compatibility can vary slightly across payment apps.',
      'Print QR codes at a minimum size of 2.5 cm × 2.5 cm for business cards (scanning distance 10-15 cm) and at least 5 cm × 5 cm for restaurant menus (scanning distance 30-40 cm).',
      'For WhatsApp Business QR codes, use the format `https://wa.me/91XXXXXXXXXX?text=Hello` with your 10-digit phone number after the 91 country code — test across Android and iOS before printing.',
      'Download the QR code PNG at the maximum resolution (1024×1024 pixels) for any QR code intended for print — this provides sufficient DPI for clear printing at business card and menu sizes.',
    ],
    mistakes: [
      'Using Low error correction for printed QR codes — printed codes are exposed to physical damage. Low error correction fails with even minor surface damage. Always use High (H) for anything printed on physical materials.',
      'Printing a QR code too small — QR codes below 2 cm × 2 cm are unreliable even with modern phone cameras at close range. Increase size for any material intended to be scanned from more than 10 cm away.',
      'Not including a call-to-action near the QR code — users are less likely to scan a QR code without context. Add text like "Scan to pay" or "Scan for menu" next to the code.',
      'Creating a URL-type QR code pointing to a broken or temporary link — QR codes on printed materials cannot be updated. Use a URL shortener or redirect service so you can change the destination URL without reprinting.',
      'Placing a QR code on a curved or reflective surface without testing first — curved bottles, shiny packaging, and holographic materials can prevent reliable QR scanning. Test on the actual material before mass printing.',
      'Creating a QR code for a WiFi network using a non-standard format — WiFi QR codes follow the format WIFI:T:WPA;S:NetworkName;P:Password;; — using an incorrect format will cause the QR to fail on iOS or Android devices.',
    ],
  },

  'password-generator': {
    tips: [
      'Use a password length of at least 16 characters for all accounts — longer passwords are exponentially stronger than shorter ones regardless of complexity. A random 16-character password with mixed characters has over 100 bits of entropy.',
      'Enable all four character types (uppercase, lowercase, digits, special characters) to maximise the character pool and strength — reducing to only letters or only alphanumeric characters reduces entropy significantly.',
      'Copy the generated password to a password manager (Bitwarden, recommended — free and open-source) immediately before using it — once you close or navigate away from the generator, the password cannot be recovered.',
      'Generate a unique password for every account — reusing passwords across accounts means a single data breach exposes all your accounts. Password managers make unique passwords practical to maintain.',
      'For accounts that require periodic password changes (banking portals, corporate systems), generate a new password using the tool and update your password manager entry at the same time.',
      'Use the Bulk Generate feature to create several passwords at once for batch account setup, such as when onboarding new team members or creating multiple service accounts simultaneously.',
    ],
    mistakes: [
      'Using a generated password without storing it in a password manager — a strong password you cannot remember is not useful. Always save immediately to a password manager before using it.',
      'Choosing special characters that your target website does not accept — some banking websites, government portals, and older enterprise systems reject certain special characters. If you encounter a validation error, try regenerating with only alphanumeric characters.',
      'Thinking a short but complex password is strong — "P@5!" is a 4-character password and is not strong despite using all character types. Length is far more important than complexity for password strength.',
      'Not enabling 2FA after setting a strong password — even the strongest password can be stolen through phishing or data breaches. Enable two-factor authentication on every account that supports it to add a second line of defence.',
      'Generating passwords over a public Wi-Fi network — while passwords are generated locally in your browser and never transmitted, avoid any sensitive security actions on unsecured public networks as a general practice.',
      'Assuming that seeing a password once before typing it correctly constitutes "memorising" it — human memory is unreliable for long random strings. Always store in a password manager rather than relying on memory.',
    ],
  },

  'word-counter': {
    tips: [
      'Paste your complete text including headings and subheadings for an accurate total word count — some platforms count headings in the word limit and some do not; knowing the full count helps you plan where to trim.',
      'Use the Characters (no spaces) metric for platforms that specify character limits without spaces — this is the standard character count used for academic journal abstract limits and many social media post policies.',
      'For UPSC and competitive exam answers with strict word limits, check the word count after completing each section and keep a running total — this helps distribute your word budget across multiple answer parts.',
      'Compare the Reading Time estimate against your target content depth — a blog post reading in under 3 minutes (600 words) typically lacks depth for competitive keyword rankings; 1,500-2,500 words (7-12 minutes) is the SEO-optimised range for most topics.',
      'For email newsletters, keep the main body under 300 words (1.5-minute reading time) — research by Mailchimp and HubSpot shows click-through rates decline for emails requiring more than 2 minutes to read.',
      'When writing to a maximum word limit, leave a 5-10% buffer below the limit — word count tools vary slightly in how they count hyphenated words, contractions, and numbers, so staying under 90-95% of the limit provides safety margin.',
    ],
    mistakes: [
      'Pasting text that includes HTML tags, markdown formatting, or code blocks if you only want to count the visible prose — strip formatting before pasting if you need a pure prose word count.',
      'Using the tool for an estimate and then submitting without checking — always verify your final word count in the actual submission platform (Google Docs, the exam portal, the CMS) which may count words differently.',
      'Assuming word count equals content quality — a 2,000-word blog post padded with repetitive sentences ranks poorly. Prioritise information density and relevance over raw word count.',
      'Counting words in a draft and adding more to reach a minimum limit without regard for content quality — padding with filler phrases specifically to hit a minimum word count is detectable and devalues the content.',
      'Not accounting for words in image captions and headings if your target platform includes them in word count — some academic and journalistic style guides include all visible text in word limits.',
      'Relying solely on a word counter for social media post planning without checking character limits — Twitter (280 characters per tweet), LinkedIn (3,000 characters for posts), and Instagram (2,200 character caption limit) use character counts, not word counts.',
    ],
  },

  'currency-converter': {
    tips: [
      'Compare the mid-market rate shown in the converter against the rate your bank or money transfer service is offering — the difference (the spread) reveals the true cost of the conversion, which banks often bundle into the exchange rate rather than a transparent fee.',
      'For large international transfers (above ₹1 lakh equivalent), use the converter to compare rates across services like Wise, Remitly, Instarem, and your bank before transferring — a 0.5% rate difference on a ₹5 lakh transfer saves ₹2,500.',
      'When invoicing international clients in USD, use today\'s mid-market rate to calculate the INR equivalent for your GST invoice — the RBI Reference Rate is the official rate for INR equivalent calculation on foreign currency invoices.',
      'Check rates before airport currency exchange — airport counters typically offer rates 3-5% below the mid-market rate. Pre-ordering foreign currency from a bank or authorised money changer 2-3 days before travel gives better rates.',
      'For NRIs tracking remittance timing, monitor the USD/INR rate over 2-4 weeks before a large transfer — even a 50 paise improvement in rate on a ₹10 lakh transfer saves ₹5,000. Set a rate alert in your bank app if available.',
      'When comparing quotes from different remittance services, always compare the total amount your beneficiary receives in INR — service fees, exchange rate spreads, and intermediary bank charges all affect the final amount.',
    ],
    mistakes: [
      'Treating the mid-market rate shown in the converter as the rate you will actually get — banks, airports, and money changers all apply a spread above the mid-market rate. The converter shows the reference rate for planning, not the transactional rate.',
      'Converting large amounts based on a rate from earlier in the day without refreshing — currency rates fluctuate continuously. For significant transactions, check the current rate just before initiating the transfer.',
      'Ignoring transfer fees in addition to the exchange rate — some services offer better rates but charge higher flat fees that make them more expensive overall for small transfers. Always calculate the total cost including fees.',
      'Using a non-official rate for GST invoice RBI Reference Rate compliance — when generating a GST invoice in INR for a foreign currency transaction, use the RBI Reference Rate from the RBI\'s daily notification, not the converter\'s real-time market rate.',
      'Assuming all money transfer services offer the same exchange rates — rates vary significantly across banks, remittance apps, and payment processors. Never use the first rate you see for a large transfer without comparison.',
      'Forgetting FEMA (Foreign Exchange Management Act) reporting requirements for large transfers — transfers above certain thresholds (USD 250,000 per financial year under LRS) require RBI reporting through your bank. The converter is for rate reference, not compliance guidance.',
    ],
  },

  'unit-converter': {
    tips: [
      'For Indian land area conversions (bigha, katha, marla, cent, and ground), always verify which regional definition of bigha applies — bigha varies significantly by state: 1 bigha in Bengal ≈ 1,337 sq ft, while 1 bigha in Rajasthan ≈ 27,225 sq ft. Confirm with local land records.',
      'For gold weight conversions, the standard Indian tola = 11.664 grams (10 mashas = 1 tola). Use this for converting traditional gold measurements referenced in older jewellery valuations and inheritance documents.',
      'When converting temperature for cooking (especially for Indian recipes referencing Fahrenheit temperatures from international cookbooks), use the formula C = (F − 32) × 5/9, or use the converter for instant results.',
      'For fuel efficiency conversions between kmpl (Indian standard) and mpg (US/UK standard), note that US mpg ≈ kmpl × 2.35 and UK mpg ≈ kmpl × 2.82 — use the unit converter to avoid the different US and UK gallon definitions.',
      'For international parcel shipping, confirm the weight unit used by the courier — most Indian couriers (India Post, Delhivery, BlueDart) use kilograms, while USPS and FedEx US use pounds. Convert your shipment weight to the correct unit before booking.',
      'Bookmark specific conversions you use regularly — square feet to square metres for property measurements, km to miles for travel planning, and grams to ounces for recipe scaling save time on repeated lookups.',
    ],
    mistakes: [
      'Using a single national conversion factor for bigha without considering regional variation — Indian land measurements are not standardised nationally. Always confirm the local land record office\'s definition of bigha or cent for your specific state and district.',
      'Converting between US and UK units when the situation requires one specifically — US customary units (US gallon, US fluid ounce, US ton) differ from UK imperial equivalents. A US gallon is 3.785 litres while a UK gallon is 4.546 litres.',
      'Confusing mass (grams, kilograms) with weight (Newtons) — in everyday Indian usage, "weight" and "mass" are used interchangeably, but in physics, force and mass are distinct. For scientific conversions, use the correct quantity.',
      'Assuming temperature conversions are linear when they involve offsets — the Fahrenheit-to-Celsius conversion requires a subtraction (−32) before the multiplication (×5/9), not just a multiplication. Applying only the multiplication produces drastically wrong results.',
      'Rounding intermediate conversion results before the final calculation — converting from Indian bigha to acres to square metres by rounding each intermediate step introduces compounding errors. Let the converter calculate in one step whenever possible.',
      'Converting pressure or torque units without specifying the exact type — PSI (pounds per square inch) for tyre pressure is different from psi in engineering contexts, and Nm (Newton-metres) for torque is different from Newton-metres as a unit of energy. Verify context.',
    ],
  },

  'color-picker': {
    tips: [
      'Use the WCAG contrast checker built into the tool to verify that your chosen colour meets accessibility standards (4.5:1 contrast ratio for normal text, 3:1 for large text) before finalising any brand or website colour.',
      'When building a design system or Tailwind CSS colour palette, generate shades from your primary brand colour using the shade generator and name them 50/100/200/300/400/500/600/700/800/900 following standard design token conventions.',
      'For web design, prefer HSL format over HEX for CSS variables — HSL values are human-readable and easy to adjust: increasing the L (lightness) value creates a tint, decreasing creates a shade, making colour variations intuitive to calculate manually.',
      'Save your brand colours to the session palette (up to 10 colours) while working on a design project — this prevents you from having to re-enter brand HEX codes each time you need a related shade or tint.',
      'When matching a colour from a competitor\'s website or brand asset, use the browser DevTools eyedropper or the OS colour picker to sample the HEX code, then enter it in the AWE-OS colour picker to get its RGB, HSL, and CMYK equivalents in one step.',
      'For print design requiring CMYK values, be aware that the CMYK equivalent shown is a mathematical conversion and may not exactly match physical Pantone or spot colour values — always request colour proofs from your printer for critical brand colour matching.',
    ],
    mistakes: [
      'Choosing brand colours without checking contrast ratios against your background colour — a beautifully on-brand colour that fails WCAG AA contrast (4.5:1) creates accessibility issues and can expose your website to legal liability in jurisdictions with accessibility mandates.',
      'Assuming CMYK values from a digital HEX colour will match exactly in print — RGB and CMYK operate on different colour gamuts. Some vibrant digital colours cannot be physically reproduced in print. Always check with a printer\'s colour guide for critical brand colours.',
      'Using very similar colours for primary action buttons and disabled state — colours that appear distinct on a calibrated monitor may be indistinguishable to users with colour blindness (affecting approximately 8% of men). Use the contrast checker to verify.',
      'Copying HSL values from the colour picker into CSS without using the css() function or correct CSS syntax — CSS HSL requires `hsl(210, 100%, 50%)` syntax, not the decimal notation some colour pickers display. Verify the format matches your CSS specification.',
      'Using the shade generator output without testing across different display brightness settings — darker shades can appear nearly identical on high-brightness monitors, causing UX issues for users with lower-quality displays.',
      'Changing brand colours late in a project without updating all instances across the design system — use the palette feature to maintain a consistent set of approved colours and avoid ad-hoc colour additions.',
    ],
  },

  'csv-to-json': {
    tips: [
      'Always save your CSV file in UTF-8 encoding before uploading — CSV files exported from older Excel versions on Windows are often encoded in Windows-1252 (ANSI) which causes garbled output for Indian language text and special characters like the Rupee symbol ₹.',
      'Toggle the "First row is header" option based on your file structure — if your CSV has no header row (just data rows), turn off this option to prevent the tool from interpreting your first data row as column names.',
      'Use the minify output option when the JSON will be used as an API payload, localStorage value, or embedded in source code — minified JSON reduces payload size and is preferred by most APIs.',
      'After conversion, validate the output in the AWE-OS JSON Formatter to verify the structure is correct and all values are properly quoted, typed, and nested before using the JSON in a production application.',
      'For CSV files with numeric columns containing Indian number formatting (like "1,00,000" for one lakh), the converter will treat the commas as column delimiters. Remove Indian formatting and use plain numbers before uploading.',
      'If your CSV contains columns with embedded commas (such as addresses or descriptions), ensure the fields are properly wrapped in double quotes in the source file — the converter handles RFC 4180 quoted fields correctly.',
    ],
    mistakes: [
      'Uploading a CSV with Windows-1252 encoding containing Hindi, Tamil, or other Indian language text — the encoding mismatch causes garbled characters in the JSON output. Convert the file to UTF-8 in Notepad (File > Save As > Encoding: UTF-8) first.',
      'Using the wrong delimiter setting — semicolons (;) are the default delimiter in Excel exports from many European and Indian locale settings (where commas are used as decimal separators). Verify your delimiter before converting.',
      'Expecting arrays or nested objects in the JSON output from a flat CSV — CSV is inherently a flat tabular format. Each row produces a flat JSON object with no nesting. Manual post-processing is required to create nested structures.',
      'Not handling empty cells consistently — empty CSV cells are represented as empty strings in JSON by default. If you need null values for empty cells, verify whether the converter or your application handles this conversion.',
      'Converting a very large CSV file (above 10 MB) in a browser tab on mobile — large conversions require significant memory and may crash the browser tab on mobile devices. Use a desktop browser for large file conversions.',
      'Assuming all column values will be correctly typed automatically — the converter attempts type inference (converting "123" to number 123), but mixed columns containing both numbers and text strings may produce unexpected type assignments. Verify critical columns.',
    ],
  },

  'json-formatter': {
    tips: [
      'Use the Tree View for navigating complex, deeply nested JSON responses from APIs — you can collapse entire branches (like a "metadata" object) to focus on the specific data fields you are debugging.',
      'Click on any key or value in Tree View to copy its full JSON path (e.g., `response.data.items[2].price`) — use this path directly in your JavaScript (`obj.response.data.items[2].price`) or Python (`obj["response"]["data"]["items"][2]["price"]`) code.',
      'Paste minified (single-line) JSON directly from browser DevTools Network tab responses and click Beautify for instant readability — this is faster than any other debugging approach for API response inspection.',
      'Use the formatter to validate your hand-written JSON configuration files (package.json, tsconfig.json, AWS IAM policies) before committing to git — a single misplaced comma or missing brace breaks these files silently.',
      'Copy the formatted JSON output and paste it into Postman\'s Body tab (JSON mode) when constructing API test requests — clean formatting makes it easier to verify your request payload structure before sending.',
      'For JSON strings containing Unicode characters (Indian language text, Rupee symbol ₹, emoji), verify the escaped unicode representation (\\u20B9 for ₹) is correctly handled and displays properly after formatting.',
    ],
    mistakes: [
      'Using single quotes instead of double quotes for strings or keys — JSON strictly requires double quotes. Single-quoted JSON is a JavaScript syntax but invalid JSON. The formatter will flag this error with a precise location.',
      'Leaving trailing commas after the last item in an array or object — trailing commas are common in modern JavaScript (allowed in ES2017+) but are invalid in JSON. Remove the comma after the final array element or final object property.',
      'Adding JavaScript-style comments (// comment or /* comment */) inside JSON — JSON has no comment syntax. Remove all comments before parsing or formatting.',
      'Pasting a JavaScript object literal instead of a JSON string — `{key: "value"}` is a valid JS object literal but invalid JSON because the key is unquoted. All JSON keys must be double-quoted strings.',
      'Expecting the formatter to validate JSON Schema compliance — the formatter validates only JSON syntax (well-formedness), not your application\'s JSON schema (data types, required fields, enums). Use a dedicated JSON Schema validator for schema compliance.',
      'Treating all formatted JSON as ready-to-paste code — formatted JSON may still contain sensitive tokens, passwords, or private keys from API responses. Always review for sensitive data before copying to emails, tickets, or chat messages.',
    ],
  },

  'base-converter': {
    tips: [
      'Enable "Show Steps" to see the full division-remainder working for each conversion — this is essential when practising for GATE, university exams, or placement tests that require you to show the conversion method alongside the final answer.',
      'Use the nibble grouping option for binary output — large binary numbers grouped in sets of 4 bits (nibbles) are much easier to verify manually and directly correspond to hex digits (4 bits = 1 hex digit).',
      'For hexadecimal output, prefer uppercase A-F in professional programming contexts (CSS colour codes, memory addresses in documentation) and lowercase a-f in code strings where lowercase is more readable.',
      'Verify your manual calculation against the converter for GATE practice — if your calculated binary output for a given decimal does not match the converter, trace back through the division steps shown in "Show Steps" to find the error.',
      'Use the custom base option (Base 36) for URL shortener and alphanumeric ID generation scenarios — Base 36 (digits 0-9 plus letters a-z) is a compact encoding widely used in short URL tokens and database ID obfuscation.',
      'For fractional binary conversion (decimal points), take your time verifying the repeated multiplication steps — fractional conversions are the most error-prone part of number system questions in competitive examinations.',
    ],
    mistakes: [
      'Entering invalid digits for the selected input base — only digits 0-1 are valid in binary, 0-7 in octal, 0-9 in decimal, and 0-9 and A-F in hexadecimal. Entering "9" in a binary input or "G" in a hex input is an error the converter will flag.',
      'Reading the division-remainder steps in the wrong direction — when converting decimal to binary using repeated division, the binary number is read from the last remainder to the first (bottom to top). Reading top-to-bottom gives the wrong answer.',
      'Confusing hexadecimal digit values — A=10, B=11, C=12, D=13, E=14, F=15. A common mistake is treating hex A as 1 rather than 10 when doing manual conversions from hex to decimal.',
      'Attempting to convert a negative number without understanding how two\'s complement works — the base converter handles positive integers. Negative number representation in binary (two\'s complement) requires additional steps not handled by a simple base converter.',
      'Applying integer conversion steps to fractional numbers — fractional parts of a number (everything after the decimal point) require the repeated multiplication method, not the repeated division method used for integer parts.',
      'Not using groupings when verifying hex-to-binary conversions — always convert each hex digit to its 4-bit binary equivalent individually and concatenate (e.g., hex 2FA = 0010 1111 1010 in binary). Missing leading zeros in any group is a common error.',
    ],
  },

  'invoice-generator': {
    tips: [
      'Include your 15-digit GSTIN on every GST invoice for B2B transactions — without a valid GSTIN, your buyer cannot claim Input Tax Credit (ITC) on the purchase, which is a significant commercial disadvantage for business-to-business transactions.',
      'Use the correct HSN (Harmonized System of Nomenclature) code for goods or SAC (Services Accounting Code) for services — incorrect codes attract GST department queries and may require amendment of your filed GSTR-1 return.',
      'Set a unique invoice number for each invoice and maintain a sequential numbering system — GST law requires invoice numbers to be unique and sequential within each financial year. Starting fresh each April 1 is the standard practice.',
      'Specify the "Place of Supply" accurately — for intra-state supplies, place of supply is the same state as delivery, attracting CGST+SGST. For inter-state supplies, place of supply is the destination state, attracting IGST.',
      'For advance payment invoices (proforma invoices), clearly mark them as "PROFORMA INVOICE" — these are not valid GST tax invoices and do not need to be reported in GSTR-1. Raise a proper tax invoice when the supply is made.',
      'Add bank account details (bank name, branch, IFSC code, account number) to the invoice for faster payment — Indian business buyers commonly pay by NEFT or RTGS, and having banking details on the invoice removes a friction point.',
    ],
    mistakes: [
      'Raising a GST invoice without being GST-registered — only businesses with a valid GSTIN can issue GST invoices and collect GST from customers. Issuing a GST invoice without registration attracts penalties under Section 122 of the CGST Act.',
      'Using the wrong GST rate for your service or product — every taxable supply has a specific rate under the GST tariff schedule. Using 18% for a 12% item (or vice versa) creates a GST mismatch and requires a credit note and revised invoice.',
      'Forgetting to mention the invoice date — the GST invoice date determines which GST return period the invoice belongs to. Missing dates can cause inclusion in the wrong filing period during audits.',
      'Not including the Place of Supply field — this field determines whether CGST+SGST or IGST applies and is mandatory under GST Invoice Rules for tax invoices. Omitting it makes the invoice technically non-compliant.',
      'Using the same invoice number for multiple invoices or reusing numbers from the previous financial year — GST law requires unique sequential invoice numbers within each financial year. Duplicates cause reconciliation failures in GSTR-1 vs GSTR-2A matching.',
      'Issuing a bill of supply when a tax invoice is required (for regular GST-registered suppliers of taxable goods/services) — a bill of supply is only for exempt supplies and composition scheme taxpayers. Using the wrong document type is a compliance error.',
    ],
  },

  'contract-generator': {
    tips: [
      'Be extremely specific in the Scope of Work — list exact deliverables by name (e.g., "5 responsive HTML/CSS pages" not "a website"), include the number of revision rounds, specify file formats, and define acceptance criteria that both parties can objectively verify.',
      'Add a late payment interest clause of 1.5-2% per month on outstanding invoices — this is standard in Indian freelance contracts, provides a contractual remedy for late payment, and creates a financial incentive for clients to pay on time.',
      'Specify IP ownership explicitly — if the client owns all deliverables (work-for-hire), state that ownership transfers only upon receipt of full payment. This protects your IP until payment is complete.',
      'Include a Change Order clause specifying how scope additions are handled — any work beyond the original scope should require a written amendment with revised pricing before work begins to prevent scope creep disputes.',
      'Specify the governing law and jurisdiction as your city — "disputes will be resolved under the laws of India and the jurisdiction of courts in [Your City]" gives you home advantage in any litigation and is enforceable under Indian law.',
      'For contracts with international clients, include a currency clause specifying whether payment is in USD, GBP, or INR and which exchange rate applies for INR conversion to avoid disputes from exchange rate fluctuations.',
    ],
    mistakes: [
      'Using vague deliverable descriptions like "a professional website" or "content writing" without specifying scope, volume, formats, and quality standards — vague deliverables are the single most common cause of freelance disputes in India.',
      'Not including a termination clause — without a termination clause, either party can exit the engagement without compensation. Specify notice periods (typically 2-4 weeks) and payment obligations for work completed at termination.',
      'Forgetting to include confidentiality provisions — if you will have access to the client\'s business plans, customer data, or pricing strategies, a mutual NDA clause protects both parties and shows professionalism.',
      'Signing a contract without reading all clauses, especially indemnification and limitation of liability — some templates contain broad indemnification clauses that make the freelancer liable for client business losses. Review carefully.',
      'Using a US or UK contract template without adapting it to Indian law — foreign contracts reference legal frameworks (UCC, UK Sale of Goods Act) that are not applicable in India. Always use Indian law (Indian Contract Act 1872) as the governing law.',
      'Delivering work before the contract is signed by both parties — starting work without a signed contract means you have no written protection if the client changes scope, delays payment, or disputes the deliverables.',
    ],
  },

  'resume-builder': {
    tips: [
      'Tailor your resume for each job application by including keywords from the job description in your skills and experience sections — ATS systems score resumes based on keyword match percentage against the job requirements.',
      'Quantify your achievements wherever possible — "Reduced API response time by 40%" and "Managed a team of 8 engineers" are far more impactful than "Improved performance" and "Led a team". Numbers attract recruiter attention.',
      'For freshers applying to IT companies, place your Projects section prominently — companies like TCS, Infosys, and Wipro evaluate final-year projects heavily for campus placements when work experience is absent.',
      'Use standard section headings (Experience, Education, Skills, Projects) rather than creative labels like "My Journey" or "What I Know" — ATS systems are trained to recognise standard headings; creative labels cause parsing failures.',
      'Keep your resume in Times New Roman, Arial, or Calibri (10-12pt) — avoid decorative or uncommon fonts that might not be installed on the recruiter\'s computer and can cause display corruption when the file is opened on a different system.',
      'Run your final resume through an online ATS simulation tool (like Jobscan) to verify it parses correctly before submitting to company career portals — what looks good on screen may parse poorly when the ATS strips formatting.',
    ],
    mistakes: [
      'Including personal information like religion, caste, marital status, and date of birth on a resume for private sector IT or startup applications — this information is not relevant to job performance and its inclusion can inadvertently expose you to bias.',
      'Using tables, text boxes, or multi-column layouts — ATS systems often read table cells in the wrong order or skip text box content entirely, causing your experience and skills to be misread or missed.',
      'Listing soft skills like "Team player", "Hard working", and "Good communicator" without supporting evidence — these phrases are on almost every resume and add no differentiation. Replace with specific examples of collaboration, initiative, or communication in your project or work descriptions.',
      'Using a generic objective statement — "To obtain a challenging position in a growth-oriented company" appears on millions of resumes. Use a specific professional summary mentioning your technology stack, years of experience, and career goal.',
      'Extending your resume to 3-4 pages as a fresher — for engineers with less than 3 years of experience, one page is the expected length. Recruiters spend an average of 7 seconds on an initial resume review; conciseness is essential.',
      'Using the same resume version for every application without updating it for the specific job requirements — a generic resume submitted to 100 companies is less effective than a tailored resume submitted to 20 relevant opportunities.',
    ],
  },

  'ai-content-writer': {
    tips: [
      'Provide specific context in your prompt — "500-word blog post about Diwali gift ideas for corporate clients in Mumbai under ₹2,000 budget" produces far better output than "write about Diwali gifts".',
      'Use the generated content as a first draft, not a finished product — add specific local statistics, brand-specific details, customer testimonials, and your own business expertise to make the content uniquely yours and more useful to readers.',
      'Select the correct tone for your audience — Professional for B2B proposals and technical documentation, Conversational for social media and WhatsApp broadcasts, and Persuasive for product landing pages and sales emails.',
      'For product descriptions on Amazon India and Flipkart, include the target keywords from Amazon\'s search bar autocomplete in your prompt — these are the exact terms buyers use, and including them in your content brief produces SEO-optimised listing copy.',
      'Review all AI-generated factual claims before publishing — AI content writers can confidently state incorrect statistics, wrong dates, or inaccurate regulatory details. Always fact-check any specific claims about regulations, prices, statistics, and current events.',
      'For blog posts, use the generated outline as a structure and expand each section with real examples, case studies, and local Indian data rather than publishing the AI draft directly — original research and local examples significantly outperform generic AI content in search rankings.',
    ],
    mistakes: [
      'Publishing AI-generated content without reviewing and editing — unedited AI content often contains factual errors, generic statements, and phrases that are obvious to experienced readers. Always human-review before publishing.',
      'Using AI content without adding original insights — Google\'s Helpful Content guidelines reward content that adds genuine value beyond what is already widely published. Purely generic AI content with no unique insights performs poorly in search rankings.',
      'Expecting AI to know your specific business details — the tool does not know your prices, your customers\' names, your service area, or your unique selling proposition. Always fill in these business-specific details after generation.',
      'Relying on AI for content requiring legal, medical, or financial accuracy — AI content in these domains requires expert review before publication. Inaccurate legal or medical information can create serious liability.',
      'Ignoring content plagiarism checking — while AI-generated text is generally not directly plagiarised, run important content through a plagiarism checker (like Grammarly or Copyscape) to verify originality before publishing on your website.',
      'Using AI-generated content in academic submissions — most Indian universities and competitive exam boards explicitly prohibit AI-generated content in assignments, research papers, and examination answers. Verify your institution\'s AI policy before using AI writing assistance.',
    ],
  },

  // ── Batch 19 ──────────────────────────────────────────────────────────────

  'hra-calculator': {
    tips: [
      'Use your exact monthly Basic Salary, not your gross or CTC figure — the 50%/40% and 10% conditions in the HRA formula are legally defined against Basic Salary only, and using gross salary will overstate your exemption.',
      'If your rent varies month to month (a new lease, a rent hike mid-year), calculate the exemption separately for each period at the applicable rent and salary figures rather than using a single annual average, since your employer\'s payroll does the same month-by-month.',
      'Keep rent receipts and, for annual rent above ₹1 lakh, your landlord\'s PAN — without these your employer may not process the exemption in monthly TDS, forcing you to claim it directly (and prove it) at ITR filing time instead.',
      'If you\'re comparing Old vs New Tax Regime, run your numbers through the AWE-OS Tax Calculator twice — once including your HRA exemption (Old Regime) and once without any exemptions (New Regime) — since HRA exemption is not available under the New Regime at all.',
      'Double-check your city classification — only Delhi, Mumbai, Chennai, and Kolkata qualify for the 50% metro rate; every other city, including Bengaluru, Hyderabad, and Pune, uses the 40% non-metro rate regardless of local rents.',
    ],
    mistakes: [
      'Entering gross salary or CTC instead of Basic Salary — this is the single most common HRA calculation error and always overstates your exemption relative to what your employer\'s payroll or the tax department will accept.',
      'Assuming you can claim HRA exemption while paying no rent, or paying rent to a spouse — HRA exemption requires an actual, provable rent payment, and rent paid to a spouse is generally not accepted as a genuine landlord-tenant arrangement.',
      'Forgetting that HRA exemption disappears entirely under the New Tax Regime — if your employer defaults you into the New Regime, any HRA exemption you expect to claim will not apply unless you actively opt for the Old Regime.',
      'Not retaining rent receipts because your employer didn\'t ask for them — if the exemption is later questioned during ITR processing or scrutiny, you need documentary proof of rent paid, not just this calculator\'s output.',
      'Using the wrong metro/non-metro classification for a city you recently moved to or from — the 50%/40% distinction applies based on your actual place of residence during the period the salary and rent relate to, not your permanent address.',
    ],
  },

  'nps-calculator': {
    tips: [
      'Model at least two scenarios — a conservative return rate (8-9%) and your realistically expected rate (11-12% for equity-heavy allocations) — rather than relying on a single projection, since NPS returns are market-linked and vary with your chosen fund manager and asset mix.',
      'Increase your annuity rate slider above the 40% PFRDA minimum if you don\'t expect significant other retirement income sources (pension, rental income, other investments) — a larger guaranteed monthly pension reduces longevity risk even though it lowers your immediate lump sum.',
      'Claim the additional ₹50,000 deduction under Section 80CCD(1B) for NPS contributions — this is over and above the ₹1.5 lakh Section 80C limit and is one of the few remaining exclusive tax benefits available only through NPS.',
      'Revisit your projection every few years as you get closer to retirement and your NPS fund\'s actual annual statement (available from the CRA — Central Recordkeeping Agency) becomes available — replace the assumed return rate with your fund\'s actual trailing CAGR for a more accurate later-stage projection.',
      'Remember the annuity return rate you select should reflect what insurers are actually offering today, not a hoped-for figure — check current annuity rates from PFRDA-empanelled insurers (LIC, SBI Life, HDFC Life and others) before finalising your retirement income assumptions.',
    ],
    mistakes: [
      'Assuming NPS returns are guaranteed like a fixed deposit — NPS is a market-linked instrument, and the expected return rate in this calculator is an assumption you control, not a promised outcome.',
      'Ignoring the compulsory 40% minimum annuitization rule and assuming you can withdraw the entire corpus as a lump sum at 60 — only up to 60% can ever be withdrawn as a lump sum; the rest must purchase an annuity by law.',
      'Forgetting that the monthly annuity/pension income is fully taxable at your slab rate — only the 60% lump-sum withdrawal is tax-free; don\'t plan your post-retirement budget assuming the monthly pension arrives tax-free too.',
      'Not accounting for inflation when interpreting the projected corpus and monthly pension — a corpus or pension figure that looks large today in nominal rupees will have materially lower purchasing power 20-30 years from now.',
      'Treating the annuity return rate as fixed for life — insurers set annuity rates based on prevailing interest rates at the time you actually purchase the annuity at retirement, which may differ meaningfully from the rate you assumed years earlier while planning.',
    ],
  },

  'capital-gains-calculator': {
    tips: [
      'Confirm your actual sale date before relying on the tax rate shown — the Budget 2024 rate change (12.5% no-indexation LTCG) applies only to transfers on or after 23 July 2024; sales before that date follow the older 20%-with-indexation rule for real estate and gold.',
      'For equity, remember the ₹1.25 lakh LTCG exemption is an annual limit across all your equity gains combined, not per transaction — if you have multiple sales in the same financial year, total them first before applying the exemption once.',
      'For real estate, always include Stamp Duty & Registration in your purchase cost — this is a legitimate addition to your cost base under the Income Tax Act and directly reduces your taxable gain, yet it\'s frequently forgotten when estimating tax liability.',
      'If you\'re close to the STCG/LTCG holding-period threshold (12 months for equity, 24 months for real estate and gold), check whether waiting a few extra weeks moves you into the long-term category — the rate difference (20% vs 12.5% for equity, slab vs 12.5% for real estate/gold) can be substantial.',
      'For debt mutual funds, don\'t search for a "debt fund LTCG rate" — since April 2023 there isn\'t one; budget for the gain to be taxed at your full income tax slab rate when planning your after-tax return.',
    ],
    mistakes: [
      'Assuming the pre-Budget-2024 20%-with-indexation rate still applies to a real estate or gold sale made after 23 July 2024 — the applicable rate for these assets is now a flat 12.5% without indexation.',
      'Forgetting that capital losses can offset gains — this calculator computes a single transaction in isolation and does not apply carry-forward losses or intra-year set-offs; add those manually before arriving at your final liability.',
      'Ignoring reinvestment exemptions like Section 54, 54EC, or 54F on property sales — these can substantially reduce your actual real estate capital gains tax but are not modelled by this calculator, which shows the pre-exemption tax only.',
      'Using the indexed-cost "reference" figure as if it were the applicable tax on a post-Budget-2024 real estate sale — it is shown for historical comparison only; the 12.5% no-indexation figure is what actually applies today.',
      'Not distinguishing debt mutual fund units bought before vs after 1 April 2023 — only units acquired on or after that date lose LTCG treatment and indexation entirely; older units may still follow the previous rules depending on your specific holding.',
    ],
  },

  'text-editor': {
    tips: [
      'Download your document regularly while working on something long — this editor keeps your draft only in the browser tab\'s memory, so an accidental refresh or closed tab loses anything not yet exported.',
      'Use Heading styles (H1/H2/H3) instead of just making text bold and bigger — headings carry real structure into the .docx and .html exports, making the document easier to navigate and reformat later in Word.',
      'When inserting an image by URL, use a direct link to the image file itself (ending in .jpg/.png/etc.), not a link to the webpage that contains it — a webpage URL will fail to render as an image.',
      'If you plan to convert your final draft to PDF, format and proofread it fully in this editor first, download the .docx, then use the AWE-OS Word to PDF tool for the conversion.',
      'For a document you\'ll edit further in Microsoft Word, export as .docx rather than .html — the .docx keeps fonts, colors, and list structure in a format Word expects, while .html can render slightly differently when reopened in Word.',
    ],
    mistakes: [
      'Closing the browser tab without downloading — since nothing is auto-saved to a server, this is the single most common way to lose an unfinished document in this editor.',
      'Expecting uploaded images to work — this editor only accepts images by URL, by design, since AWE-OS never uploads files to a server; a local photo on your device needs to be hosted somewhere first, or added after exporting to Word.',
      'Relying on the "Page N of M" counter as an exact print preview — it is a height-based estimate, not a real pagination engine, so always check your printer\'s own print-preview screen before printing a multi-page document.',
      'Formatting a whole paragraph as one giant bold/colored block instead of using headings and structure — this makes the exported document harder to skim and loses the semantic structure that Word and screen readers rely on.',
      'Trying to open an existing Word document in this editor — it composes new documents only; there is no import feature in this release, so start with a blank page rather than expecting to load a .docx file.',
    ],
  },
}
