/**
 * DynamicToolPage — unified entry point for all /tools/:slug routes.
 *
 * AUTO-REGISTRATION: To add a new tool, add ONE line to TOOL_COMPONENTS:
 *   'your-slug': () => import('./YourComponent')
 * No other changes needed — lazy() wrapping, aliases, and fallback are
 * all handled automatically.
 *
 * Resolution chain:
 *  1. Slug found in TOOL_COMPONENTS (or via SLUG_ALIASES) → lazy-render component
 *  2. No component found → fall back to API-driven ToolDetailPage
 *
 * Error isolation (outermost → innermost):
 *  ChunkErrorBoundary → chunk download failures (network, post-deploy 404)
 *    Suspense → lazy loading state
 *      ToolErrorBoundary → render errors inside the tool
 */

import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { SLUG_ALIASES } from '../../data/toolRegistry'
import { ChunkErrorBoundary, ToolErrorBoundary } from '../../components/errors'

// ── Tool import registry ───────────────────────────────────────────────────
// Add new tools here: 'slug': () => import('./ComponentFile')
// lazy() is applied on first access and cached — do NOT wrap in lazy() here.

const TOOL_COMPONENTS = {
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

// Module-level cache: slug → lazy component.
// Ensures the same lazy() instance is returned for a given slug across renders,
// preventing unnecessary remounts.
const _lazyCache = {}

function getOrCreateLazy(slug, importFn) {
  if (!_lazyCache[slug]) {
    _lazyCache[slug] = lazy(importFn)
  }
  return _lazyCache[slug]
}

// ── Loading spinner ────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div
      className="flex items-center justify-center min-h-[40vh]"
      role="status"
      aria-label="Loading tool"
    >
      <div
        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

// ── Lazy fallback (API-driven tools) ───────────────────────────────────────

const ToolDetailPage = lazy(() => import('../ToolDetailPage'))

// ── Main component ─────────────────────────────────────────────────────────

export default function DynamicToolPage() {
  const { slug } = useParams()

  // Resolve alias first, then look up import function
  const canonicalSlug = SLUG_ALIASES[slug] ?? slug
  const importFn      = TOOL_COMPONENTS[canonicalSlug]
  const ToolComponent = importFn ? getOrCreateLazy(canonicalSlug, importFn) : null

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {ToolComponent ? (
          <ToolErrorBoundary toolName={slug}>
            <ToolComponent />
          </ToolErrorBoundary>
        ) : (
          <ToolDetailPage />
        )}
      </Suspense>
    </ChunkErrorBoundary>
  )
}
