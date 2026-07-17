/**
 * toolComponentMap.js — slug -> import() closure for every dedicated tool
 * component, batch 5.6b (docs/batches/batch-5.6b-hydration-race.md).
 *
 * Hoisted out of DynamicToolPage.jsx so hydratePreload.js can await the
 * exact same import closure BEFORE hydrateRoot runs, without importing
 * DynamicToolPage.jsx's own React/JSX code into main.jsx's eager bundle.
 * lazy() is applied where this is consumed (DynamicToolPage.jsx) — do NOT
 * wrap in lazy() here.
 *
 * AUTO-REGISTRATION: To add a new tool, add ONE line here:
 *   'your-slug': () => import('./YourComponent')
 * No other changes needed.
 */

export const TOOL_COMPONENTS = {
  // PDF — Organize
  'merge-pdf':           () => import('./pdf/MergePDF'),
  'split-pdf':           () => import('./pdf/SplitPDF'),
  'compress-pdf':        () => import('./pdf/CompressPDF'),
  'rotate-pdf':          () => import('./pdf/RotatePDF'),
  'remove-pages-pdf':    () => import('./pdf/RemovePagesPDF'),
  'extract-pages-pdf':   () => import('./pdf/ExtractPagesPDF'),
  'organize-pdf':        () => import('./pdf/OrganizePDF'),
  'test-ai-tool':        () => import('../tools/TestAiTool'),

  // PDF — Convert to PDF
  'jpg-to-pdf':          () => import('./pdf/JPGtoPDF'),
  'word-to-pdf':         () => import('./pdf/WordToPDF'),
  'excel-to-pdf':        () => import('./pdf/ExcelToPDF'),
  'powerpoint-to-pdf':   () => import('./pdf/PowerPointToPDF'),

  // PDF — Convert from PDF
  'pdf-to-jpg':          () => import('./pdf/PDFtoJPG'),
  'pdf-to-word':         () => import('./pdf/PDFtoWord'),
  'pdf-to-excel':        () => import('./pdf/PDFtoExcel'),
  'pdf-to-text':         () => import('./pdf/PDFtoText'),
  'pdf-to-ppt':          () => import('./pdf/PDFtoPPT'),

  // PDF — Edit
  'watermark-pdf':       () => import('./pdf/WatermarkPDF'),
  'page-numbers-pdf':    () => import('./pdf/PageNumbersPDF'),
  'pdf-editor':          () => import('./pdf/PdfEditor'),

  // PDF — Security
  'protect-pdf':         () => import('./pdf/ProtectPDF'),
  'unlock-pdf':          () => import('./pdf/UnlockPDF'),

  // Calculators
  'age-calculator':        () => import('./AgeCalculator'),
  'bmi-calculator':        () => import('./BMICalculator'),
  'discount-calculator':   () => import('./DiscountCalculator'),
  'gpa-calculator':        () => import('./GPACalculator'),
  'gst-calculator':        () => import('./GSTCalculator'),
  'loan-calculator':       () => import('./LoanCalculator'),
  'percentage-calculator': () => import('./PercentageCalculator'),
  'roi-calculator':        () => import('./ROICalculator'),
  'sip-calculator':        () => import('./SIPCalculator'),
  'tax-calculator':        () => import('./TaxCalculator'),
  'tip-calculator':        () => import('./TipCalculator'),

  // Converters & Utilities
  'base-converter':        () => import('./BaseConverter'),
  'color-picker':          () => import('./ColorPicker'),
  'csv-to-json':           () => import('./CSVtoJSON'),
  'currency-converter':    () => import('./CurrencyConverter'),
  'image-compressor':      () => import('./ImageCompressor'),
  'json-formatter':        () => import('./JSONFormatter'),
  'password-generator':    () => import('./PasswordGenerator'),
  'qr-code-generator':     () => import('./QRCodeGenerator'),
  'unit-converter':        () => import('./UnitConverter'),
  'word-counter':          () => import('./WordCounter'),

  // AI Tools
  'ai-content-writer':     () => import('./ai/ContentWriter'),
  'resume-builder':        () => import('./ai/ResumeBuilder'),

  // Productivity / Legal
  'contract-generator':    () => import('./ContractGenerator'),
  'invoice-generator':     () => import('./InvoiceGenerator'),

  // Finance
  'fd-calculator':         () => import('./FDCalculator'),
  'ppf-calculator':        () => import('./PPFCalculator'),
}
