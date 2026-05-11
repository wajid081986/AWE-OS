/**
 * DynamicToolPage — unified entry point for all /tools/:slug routes.
 *
 * Resolution chain:
 *  1. Slug is in TOOL_COMPONENTS map  → render dedicated React component (lazy)
 *  2. Slug is a known alias           → render component for canonical slug
 *  3. No component found              → fall back to API-driven ToolDetailPage
 *
 * Error isolation layers (outermost → innermost):
 *  ChunkErrorBoundary → catches chunk download failures (network, post-deploy 404)
 *    Suspense → handles lazy loading state
 *      ToolErrorBoundary → catches render errors inside individual tools
 *        <Component />
 */

import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { SLUG_ALIASES } from '../../data/toolRegistry'
import { ChunkErrorBoundary, ToolErrorBoundary } from '../../components/errors'

const TOOL_COMPONENTS = {
  // PDF — Organize
  'merge-pdf':           lazy(() => import('./pdf/MergePDF')),
  'split-pdf':           lazy(() => import('./pdf/SplitPDF')),
  'compress-pdf':        lazy(() => import('./pdf/CompressPDF')),
  'rotate-pdf':          lazy(() => import('./pdf/RotatePDF')),
  'remove-pages-pdf':    lazy(() => import('./pdf/RemovePagesPDF')),
  'extract-pages-pdf':   lazy(() => import('./pdf/ExtractPagesPDF')),
  'organize-pdf':        lazy(() => import('./pdf/OrganizePDF')),
  'test-ai-tool':        lazy(() => import('../tools/TestAiTool')),

  // PDF — Convert to PDF
  'jpg-to-pdf':          lazy(() => import('./pdf/JPGtoPDF')),
  'word-to-pdf':         lazy(() => import('./pdf/WordToPDF')),
  'excel-to-pdf':        lazy(() => import('./pdf/ExcelToPDF')),
  'powerpoint-to-pdf':   lazy(() => import('./pdf/PowerPointToPDF')),

  // PDF — Convert from PDF
  'pdf-to-jpg':          lazy(() => import('./pdf/PDFtoJPG')),
  'pdf-to-word':         lazy(() => import('./pdf/PDFtoWord')),
  'pdf-to-excel':        lazy(() => import('./pdf/PDFtoExcel')),

  // PDF — Edit
  'watermark-pdf':       lazy(() => import('./pdf/WatermarkPDF')),
  'page-numbers-pdf':    lazy(() => import('./pdf/PageNumbersPDF')),

  // PDF — Security
  'protect-pdf':         lazy(() => import('./pdf/ProtectPDF')),
  'unlock-pdf':          lazy(() => import('./pdf/UnlockPDF')),

  // Calculators
  'bmi-calculator':        lazy(() => import('./BMICalculator')),
  'age-calculator':        lazy(() => import('./AgeCalculator')),
  'loan-calculator':       lazy(() => import('./LoanCalculator')),
  'percentage-calculator': lazy(() => import('./PercentageCalculator')),
  'gpa-calculator':        lazy(() => import('./GPACalculator')),

  // Converters
  'unit-converter':     lazy(() => import('./UnitConverter')),
  'word-counter':       lazy(() => import('./WordCounter')),
  'password-generator': lazy(() => import('./PasswordGenerator')),
  'color-picker':       lazy(() => import('./ColorPicker')),
  'qr-code-generator':  lazy(() => import('./QRCodeGenerator')),
  'image-compressor':   lazy(() => import('./ImageCompressor')),
  'csv-to-json':        lazy(() => import('./CSVtoJSON')),

  // AI Tools
  'resume-builder':     lazy(() => import('./ai/ResumeBuilder')),
  'ai-content-writer':  lazy(() => import('./ai/ContentWriter')),
}

const ALIAS_COMPONENT_MAP = Object.fromEntries(
  Object.entries(SLUG_ALIASES).map(([alias, canonical]) => [alias, TOOL_COMPONENTS[canonical]])
)

const ALL_COMPONENTS = { ...TOOL_COMPONENTS, ...ALIAS_COMPONENT_MAP }

const ToolDetailPage = lazy(() => import('../ToolDetailPage'))

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

export default function DynamicToolPage() {
  const { slug } = useParams()
  const Component = ALL_COMPONENTS[slug]

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {Component
          ? (
            <ToolErrorBoundary toolName={slug}>
              <Component />
            </ToolErrorBoundary>
          )
          : <ToolDetailPage />
        }
      </Suspense>
    </ChunkErrorBoundary>
  )
}
