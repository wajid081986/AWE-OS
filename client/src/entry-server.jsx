/**
 * entry-server.jsx — Batch 0B SSG entry point (all public routes).
 *
 * Parallel render path — does not import main.jsx, App.jsx, routes.jsx, or
 * AppProviders. Those stay untouched; the existing SPA/prerender.js pipeline
 * is unaffected by this file's existence (see scripts/prerender.js and
 * scripts/ssg-build.js:build:prerender-legacy for the old path).
 *
 * Why not reuse App.jsx: App.jsx gates its whole tree behind
 * useAuth().isLoading, which starts true and only flips inside a
 * useEffect (never runs during renderToString) — reusing it here would
 * render only the "Loading AWE-OS…" splash.
 *
 * Why <Routes>/<Route> instead of rendering pages directly: parameterized
 * pages (BlogPostPage, CityToolPage, CompareToolPage, FaqCategoryPage) read
 * their slug via useParams(), which only resolves inside a matched Route.
 * StaticRouter alone (no Routes) would leave useParams() empty.
 *
 * Route list is derived from the SAME static data files scripts/prerender.js
 * already uses (toolRegistry, blogPosts, cityPages, comparisonPages,
 * faqPages) — single source of truth, no hand-duplicated route list.
 *
 * Explicitly excluded (see Batch 0B plan): /store/*, /calculators/*,
 * /tools/resume, /tools/pdf-editor/editor, /payment/success, /dashboard/*,
 * /admin/*, /login, /404 — none of these are in architecture.md's frozen
 * route table and/or have no unique static content to prerender.
 *
 * Batch 5.6 — tree parity with the client (required for hydrateRoot):
 *
 * 1. ROOT CAUSE, confirmed via a hybrid dev-mode hydration probe (real
 *    dev-build React run against the real SSG'd HTML): AppProviders.jsx
 *    wraps every client page in <ToastProvider>, which unconditionally
 *    renders a toast-container <div> as a trailing sibling — this file
 *    never included ToastProvider at all, so that div had zero
 *    counterpart in the SSG'd HTML. React's exact warning: "Expected
 *    server HTML to contain a matching <div> in <div>." Because
 *    ToastProvider sits above PublicLayout/Routes in the tree, this broke
 *    hydration for the ENTIRE page on every single route identically —
 *    explains why even the simplest static pages failed. Fixed by adding
 *    <ToastProvider> here, matching AppProviders.jsx's structure.
 * 2. Secondary, real but not the primary cause: routes.jsx wraps EVERY
 *    route element in a client-side <Suspense> (its lazy$() helper, for
 *    route-level code-splitting), which renderToString never emitted
 *    boundary markers for. Fixed by switching to renderToPipeableStream
 *    (which does emit them) and wrapping each rendered route element in a
 *    matching <Suspense> here. Tool routes need a SECOND, nested
 *    <Suspense> too: DynamicToolPage.jsx (the client's /tools/:slug
 *    renderer, bypassed here since components are imported directly —
 *    see TOOL_PAGE_COMPONENTS below) wraps its resolved component in its
 *    own internal <Suspense>, so tool routes get two nested layers to
 *    match; every other route gets one.
 *
 * See docs/batches/batch-5.6-ssg-hydration.md.
 */

import { Suspense } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { Writable } from 'node:stream'
import { StaticRouter } from 'react-router'
import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './modules/auth/context/AuthContext'
import { ToastProvider } from './shared/components/ToastContext'
import PublicLayout from './components/PublicLayout'
import { STATIC_PATHS, CATEGORY_SLUGS, TOOL_SLUGS } from './ssgRoutes'

// ── Static pages ─────────────────────────────────────────────────────────────
import Home from './pages/Home'
import ToolsPage from './pages/ToolsPage'
import FreeToolsPage from './pages/FreeToolsPage'
import CategoryPage from './pages/CategoryPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'
import Disclaimer from './pages/Disclaimer'
import BlogPage from './pages/BlogPage'
import BlogPostPage from './pages/BlogPostPage'
import CityToolPage from './pages/CityToolPage'
import CompareToolPage from './pages/CompareToolPage'
import FaqCategoryPage from './pages/FaqCategoryPage'

// ── Data (same source prerender.js already reads) ───────────────────────────
import { BLOG_POSTS } from './data/blogPosts'
import { CITY_PAGES } from './data/cityPages'
import { COMPARISON_PAGES } from './data/comparisonPages'
import { FAQ_PAGES } from './data/faqPages'

// ── 49 registered tool components — direct static imports.                  ──
// Mirrors DynamicToolPage's TOOL_COMPONENTS map, but resolved synchronously
// (no lazy()/Suspense) since this only runs at build time in Node, never
// shipped to the browser bundle.
import MergePDF from './pages/tools/pdf/MergePDF'
import SplitPDF from './pages/tools/pdf/SplitPDF'
import CompressPDF from './pages/tools/pdf/CompressPDF'
import RotatePDF from './pages/tools/pdf/RotatePDF'
import RemovePagesPDF from './pages/tools/pdf/RemovePagesPDF'
import ExtractPagesPDF from './pages/tools/pdf/ExtractPagesPDF'
import OrganizePDF from './pages/tools/pdf/OrganizePDF'
import JPGtoPDF from './pages/tools/pdf/JPGtoPDF'
import WordToPDF from './pages/tools/pdf/WordToPDF'
import ExcelToPDF from './pages/tools/pdf/ExcelToPDF'
import PowerPointToPDF from './pages/tools/pdf/PowerPointToPDF'
import PDFtoJPG from './pages/tools/pdf/PDFtoJPG'
import PDFtoWord from './pages/tools/pdf/PDFtoWord'
import PDFtoExcel from './pages/tools/pdf/PDFtoExcel'
import PDFtoText from './pages/tools/pdf/PDFtoText'
import PDFtoPPT from './pages/tools/pdf/PDFtoPPT'
import WatermarkPDF from './pages/tools/pdf/WatermarkPDF'
import PageNumbersPDF from './pages/tools/pdf/PageNumbersPDF'
import PdfEditor from './pages/tools/pdf/PdfEditor'
import ProtectPDF from './pages/tools/pdf/ProtectPDF'
import UnlockPDF from './pages/tools/pdf/UnlockPDF'
import AgeCalculator from './pages/tools/AgeCalculator'
import BMICalculator from './pages/tools/BMICalculator'
import DiscountCalculator from './pages/tools/DiscountCalculator'
import GPACalculator from './pages/tools/GPACalculator'
import GSTCalculator from './pages/tools/GSTCalculator'
import LoanCalculator from './pages/tools/LoanCalculator'
import PercentageCalculator from './pages/tools/PercentageCalculator'
import ROICalculator from './pages/tools/ROICalculator'
import SIPCalculator from './pages/tools/SIPCalculator'
import TaxCalculator from './pages/tools/TaxCalculator'
import TipCalculator from './pages/tools/TipCalculator'
import BaseConverter from './pages/tools/BaseConverter'
import ColorPicker from './pages/tools/ColorPicker'
import CSVtoJSON from './pages/tools/CSVtoJSON'
import CurrencyConverter from './pages/tools/CurrencyConverter'
import ImageCompressor from './pages/tools/ImageCompressor'
import JSONFormatter from './pages/tools/JSONFormatter'
import PasswordGenerator from './pages/tools/PasswordGenerator'
import QRCodeGenerator from './pages/tools/QRCodeGenerator'
import UnitConverter from './pages/tools/UnitConverter'
import WordCounter from './pages/tools/WordCounter'
import ContentWriter from './pages/tools/ai/ContentWriter'
import ResumeBuilder from './pages/tools/ai/ResumeBuilder'
import ContractGenerator from './pages/tools/ContractGenerator'
import InvoiceGenerator from './pages/tools/InvoiceGenerator'
import FDCalculator from './pages/tools/FDCalculator'
import PPFCalculator from './pages/tools/PPFCalculator'

const TOOL_PAGE_COMPONENTS = {
  'merge-pdf': MergePDF, 'split-pdf': SplitPDF, 'compress-pdf': CompressPDF,
  'rotate-pdf': RotatePDF, 'remove-pages-pdf': RemovePagesPDF, 'extract-pages-pdf': ExtractPagesPDF,
  'organize-pdf': OrganizePDF, 'jpg-to-pdf': JPGtoPDF, 'word-to-pdf': WordToPDF,
  'excel-to-pdf': ExcelToPDF, 'powerpoint-to-pdf': PowerPointToPDF, 'pdf-to-jpg': PDFtoJPG,
  'pdf-to-word': PDFtoWord, 'pdf-to-excel': PDFtoExcel, 'pdf-to-text': PDFtoText,
  'pdf-to-ppt': PDFtoPPT, 'watermark-pdf': WatermarkPDF, 'page-numbers-pdf': PageNumbersPDF,
  'pdf-editor': PdfEditor, 'protect-pdf': ProtectPDF, 'unlock-pdf': UnlockPDF,
  'age-calculator': AgeCalculator, 'bmi-calculator': BMICalculator, 'discount-calculator': DiscountCalculator,
  'gpa-calculator': GPACalculator, 'gst-calculator': GSTCalculator, 'loan-calculator': LoanCalculator,
  'percentage-calculator': PercentageCalculator, 'roi-calculator': ROICalculator, 'sip-calculator': SIPCalculator,
  'tax-calculator': TaxCalculator, 'tip-calculator': TipCalculator, 'base-converter': BaseConverter,
  'color-picker': ColorPicker, 'csv-to-json': CSVtoJSON, 'currency-converter': CurrencyConverter,
  'image-compressor': ImageCompressor, 'json-formatter': JSONFormatter, 'password-generator': PasswordGenerator,
  'qr-code-generator': QRCodeGenerator, 'unit-converter': UnitConverter, 'word-counter': WordCounter,
  'ai-content-writer': ContentWriter, 'resume-builder': ResumeBuilder, 'contract-generator': ContractGenerator,
  'invoice-generator': InvoiceGenerator, 'fd-calculator': FDCalculator, 'ppf-calculator': PPFCalculator,
}

const CATEGORY_ROUTES = [
  { slug: 'pdf',          category: 'pdf' },
  { slug: 'calculators',  category: 'calculators' },
  { slug: 'converters',   category: 'converters' },
  { slug: 'ai',           category: 'ai' },
  { slug: 'productivity', category: 'productivity' },
]

// Guards against ssgRoutes.js (the manifest main.jsx uses to decide
// hydrateRoot vs createRoot) silently drifting from what this file
// actually prerenders — see docs/batches/batch-5.6-ssg-hydration.md.
// Fails the build loudly instead of shipping a mismatch.
function assertNoRouteDrift() {
  const errors = []
  const toolKeys = Object.keys(TOOL_PAGE_COMPONENTS).sort()
  const expectedTools = [...TOOL_SLUGS].sort()
  if (JSON.stringify(toolKeys) !== JSON.stringify(expectedTools)) {
    errors.push(`TOOL_PAGE_COMPONENTS keys != ssgRoutes.js TOOL_SLUGS.\n  got: ${toolKeys.join(', ')}\n  expected: ${expectedTools.join(', ')}`)
  }
  const categoryKeys = CATEGORY_ROUTES.map(r => r.slug).sort()
  const expectedCategories = [...CATEGORY_SLUGS].sort()
  if (JSON.stringify(categoryKeys) !== JSON.stringify(expectedCategories)) {
    errors.push(`CATEGORY_ROUTES slugs != ssgRoutes.js CATEGORY_SLUGS.\n  got: ${categoryKeys.join(', ')}\n  expected: ${expectedCategories.join(', ')}`)
  }
  const staticPaths = ['/', '/tools', '/tools/free', '/blog', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer'].sort()
  const expectedStatic = [...STATIC_PATHS].sort()
  if (JSON.stringify(staticPaths) !== JSON.stringify(expectedStatic)) {
    errors.push(`Static route paths != ssgRoutes.js STATIC_PATHS.\n  got: ${staticPaths.join(', ')}\n  expected: ${expectedStatic.join(', ')}`)
  }
  if (errors.length) {
    throw new Error(`entry-server.jsx / ssgRoutes.js route-list drift:\n\n${errors.join('\n\n')}`)
  }
}
assertNoRouteDrift()

// ── Build the full route list ───────────────────────────────────────────────
export function buildRoutes() {
  const routes = []

  routes.push({ path: '/',           pattern: '/',           element: <Home />,          outFile: 'index.html' })
  routes.push({ path: '/tools',      pattern: '/tools',      element: <ToolsPage />,     outFile: 'tools/index.html' })
  routes.push({ path: '/tools/free', pattern: '/tools/free', element: <FreeToolsPage />, outFile: 'tools/free/index.html' })

  for (const { slug, category } of CATEGORY_ROUTES) {
    routes.push({
      path: `/tools/${slug}`, pattern: `/tools/${slug}`,
      element: <CategoryPage category={category} />, outFile: `tools/${slug}/index.html`,
    })
  }

  for (const [slug, Comp] of Object.entries(TOOL_PAGE_COMPONENTS)) {
    routes.push({
      path: `/tools/${slug}`, pattern: `/tools/${slug}`,
      // Inner Suspense matches DynamicToolPage.jsx's own boundary around
      // the resolved tool component (client-side) — see file header.
      element: <Suspense fallback={null}><Comp /></Suspense>, outFile: `tools/${slug}/index.html`,
    })
  }

  routes.push({ path: '/blog', pattern: '/blog', element: <BlogPage />, outFile: 'blog/index.html' })
  for (const post of BLOG_POSTS) {
    routes.push({
      path: `/blog/${post.slug}`, pattern: '/blog/:slug',
      element: <BlogPostPage />, outFile: `blog/${post.slug}/index.html`,
      noindex: !!post.noindex,
    })
  }

  routes.push({ path: '/about',          pattern: '/about',          element: <AboutPage />,    outFile: 'about/index.html' })
  routes.push({ path: '/contact',        pattern: '/contact',        element: <ContactPage />,  outFile: 'contact/index.html' })
  routes.push({ path: '/privacy-policy', pattern: '/privacy-policy', element: <PrivacyPolicy />, outFile: 'privacy-policy/index.html' })
  routes.push({ path: '/terms',          pattern: '/terms',          element: <Terms />,        outFile: 'terms/index.html' })
  routes.push({ path: '/disclaimer',     pattern: '/disclaimer',     element: <Disclaimer />,   outFile: 'disclaimer/index.html' })

  for (const page of CITY_PAGES) {
    routes.push({
      path: `/${page.slug}`, pattern: '/:toolSlug/:city',
      element: <CityToolPage />, outFile: `${page.slug}/index.html`,
    })
  }
  for (const page of COMPARISON_PAGES) {
    routes.push({
      path: `/compare/${page.slug}`, pattern: '/compare/:slug',
      element: <CompareToolPage />, outFile: `compare/${page.slug}/index.html`,
    })
  }
  for (const page of FAQ_PAGES) {
    routes.push({
      path: `/faq/${page.slug}`, pattern: '/faq/:slug',
      element: <FaqCategoryPage />, outFile: `faq/${page.slug}/index.html`,
    })
  }

  return routes
}

// Returns a Promise<{ html, helmet }> — renderToPipeableStream is
// inherently async (even though nothing here actually suspends; every
// TOOL_PAGE_COMPONENTS/page component is imported directly, not lazy()).
// It's used instead of the old renderToString specifically because it
// emits the Suspense-boundary comment markers hydrateRoot needs — see the
// file header comment.
export function renderRoute({ path, pattern, element }) {
  const helmetContext = {}

  return new Promise((resolve, reject) => {
    const chunks = []
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk)
        callback()
      },
    })
    sink.on('finish', () => {
      resolve({ html: Buffer.concat(chunks).toString('utf-8'), helmet: helmetContext.helmet })
    })
    sink.on('error', reject)

    const { pipe } = renderToPipeableStream(
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={path}>
          <AuthProvider>
            {/* Matches AppProviders.jsx's <ToastProvider> — see file
                header comment (root cause #1). */}
            <ToastProvider>
              <PublicLayout>
                <Routes>
                  {/* Outer Suspense matches routes.jsx's lazy$() boundary,
                      present around every route on the client — see file
                      header comment (root cause #2). */}
                  <Route path={pattern} element={<Suspense fallback={null}>{element}</Suspense>} />
                </Routes>
              </PublicLayout>
            </ToastProvider>
          </AuthProvider>
        </StaticRouter>
      </HelmetProvider>,
      {
        // onAllReady (not onShellReady): this is a one-shot static build,
        // not a live response stream — wait for the complete tree, not
        // just the initial shell, before capturing the HTML.
        onAllReady() { pipe(sink) },
        onShellError: reject,
        onError(err) { console.error(`SSR render error for ${path}:`, err) },
      }
    )
  })
}
