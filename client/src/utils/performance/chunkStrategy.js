/**
 * Chunk strategy reference.
 * Mirrors the manualChunks configuration in vite.config.js.
 *
 * Use CHUNK_NAMES when you need to reference vendor chunk identifiers
 * for build analysis, preload hints, or dynamic import tracking.
 *
 * Tool groupings show which vendor chunks each tool category pulls in —
 * useful for deciding which categories to preload together.
 */

export const CHUNK_NAMES = {
  REACT:        'vendor-react',
  PDF_LIB:      'vendor-pdf-lib',   // pdf-lib: PDF manipulation
  PDFJS:        'vendor-pdfjs',     // pdfjs-dist: PDF rendering/parsing
  JSPDF:        'vendor-jspdf',     // jspdf: PDF generation
  MAMMOTH:      'vendor-mammoth',   // mammoth: Word → HTML conversion
  HTML2CANVAS:  'vendor-html2canvas', // html2canvas: DOM → canvas
  XLSX:         'vendor-xlsx',      // xlsx: Excel read/write
  JSZIP:        'vendor-jszip',     // jszip: zip archives
  CHARTS:       'vendor-charts',    // recharts: admin dashboard charts
}

// Tools grouped by their heavy vendor dependency.
// Load these groups together when a user navigates to a category.
export const PDF_VIEWER_TOOLS = [
  'compress-pdf', 'rotate-pdf', 'split-pdf',
  'extract-pages-pdf', 'remove-pages-pdf', 'organize-pdf',
  'pdf-to-jpg', 'pdf-to-word', 'pdf-to-excel',
  'watermark-pdf', 'page-numbers-pdf', 'protect-pdf', 'unlock-pdf',
]

export const PDF_BUILDER_TOOLS = [
  'merge-pdf', 'jpg-to-pdf', 'excel-to-pdf',
  'powerpoint-to-pdf', 'word-to-pdf',
]

export const MAMMOTH_TOOLS  = ['word-to-pdf']
export const XLSX_TOOLS     = ['excel-to-pdf', 'pdf-to-excel', 'csv-to-json']
export const JSPDF_TOOLS    = ['resume-builder']
export const HTML2C_TOOLS   = ['page-numbers-pdf', 'watermark-pdf']
