/**
 * ssgRoutes.js — single source of truth for the SSG'd (prerendered) route
 * shape: which static/category/tool slugs exist.
 *
 * Consumed by:
 *   - entry-server.jsx (Node SSR bundle) — asserts its own hardcoded
 *     TOOL_PAGE_COMPONENTS/CATEGORY_ROUTES stay in sync with these lists,
 *     failing the build loudly instead of silently drifting.
 *   - scripts/generate-ssg-routes.js (Node prebuild step) — merges these
 *     with the blog/city/comparison/faq data files into the full flat path
 *     manifest (src/ssgRoutes.generated.js).
 *   - main.jsx (browser bundle) — decides hydrateRoot vs createRoot.
 *
 * Deliberately excludes the blog/city/comparison/faq data files: those are
 * large (blogPosts.js alone is ~112KB gzipped, see docs/backlog.md) and
 * must not end up in main.jsx's eager entry bundle just to answer "is this
 * pathname prerendered." generate-ssg-routes.js folds them into the
 * manifest at build time instead.
 */

export const STATIC_PATHS = [
  '/', '/tools', '/tools/free', '/blog',
  '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer',
  '/editorial-policy', '/tool-testing-policy', '/ai-content-policy',
  '/corrections-policy', '/advertising-policy',
]

export const CATEGORY_SLUGS = ['pdf', 'calculators', 'converters', 'ai', 'productivity']

// Must exactly match entry-server.jsx's TOOL_PAGE_COMPONENTS keys —
// entry-server.jsx asserts this at build time and throws if they diverge.
export const TOOL_SLUGS = [
  'merge-pdf', 'split-pdf', 'compress-pdf', 'rotate-pdf', 'remove-pages-pdf', 'extract-pages-pdf',
  'organize-pdf', 'jpg-to-pdf', 'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf', 'pdf-to-jpg',
  'pdf-to-word', 'pdf-to-excel', 'pdf-to-text', 'pdf-to-ppt', 'watermark-pdf', 'page-numbers-pdf',
  'pdf-editor', 'protect-pdf', 'unlock-pdf', 'age-calculator', 'bmi-calculator', 'discount-calculator',
  'gpa-calculator', 'gst-calculator', 'loan-calculator', 'percentage-calculator', 'roi-calculator',
  'sip-calculator', 'tax-calculator', 'tip-calculator', 'base-converter', 'color-picker', 'csv-to-json',
  'currency-converter', 'image-compressor', 'json-formatter', 'password-generator', 'qr-code-generator',
  'unit-converter', 'word-counter', 'ai-content-writer', 'resume-builder', 'contract-generator',
  'invoice-generator', 'fd-calculator', 'ppf-calculator',
]

export function buildBaseSsgPaths() {
  const paths = new Set(STATIC_PATHS)
  for (const slug of CATEGORY_SLUGS) paths.add(`/tools/${slug}`)
  for (const slug of TOOL_SLUGS) paths.add(`/tools/${slug}`)
  return paths
}

function normalize(pathname) {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

/**
 * `knownPaths` is an iterable of path strings — pass
 * ssgRoutes.generated.js's SSG_PATHS in the browser, or a freshly-built set
 * in Node. Kept as a parameter (not a module-level import of the generated
 * file) so this module has zero build-order dependencies of its own.
 */
export function isSsgRoute(pathname, knownPaths) {
  const set = knownPaths instanceof Set ? knownPaths : new Set(knownPaths)
  return set.has(normalize(pathname))
}

/**
 * Category-level hydrateRoot allowlist. Originally (Batch 5.6, per a 3-run
 * determination sweep) excluded individual /tools/:slug pages (48/48 failed)
 * and the whole /blog family (38/41 passed 3/3, but excluded as a category
 * since "an individual passing blog post today may fail tomorrow"). Both
 * exclusions REMOVED in Batch 5.6b (docs/batches/batch-5.6b-hydration-race.md)
 * after isolating and fixing two real, independent bugs:
 *   (a) tool pages: entry-server.jsx never rendered ChunkErrorBoundary/
 *       ToolErrorBoundary around tool components, but ToolErrorBoundary's
 *       non-error render path returns a real host element
 *       (<div style={{display:'contents'}}>) — a deterministic hydration
 *       mismatch on every tool page. Fixed by wrapping entry-server.jsx's
 *       tool routes in the same boundaries the client uses.
 *   (b) the underlying lazy()-vs-hydration timing race (React #421,
 *       intermittent on home/category/city pages, ~100% on tool pages'
 *       double-lazy waterfall) — fixed by hydratePreload.js resolving
 *       every route's lazy import(s) before hydrateRoot is ever called.
 * Re-validated after both fixes: force-hydrate stress tests 10/10 clean on
 * 3 heavy tool pages + 2 blog posts + homepage + a previously-flaky city
 * page, plus 5/5 full-site sweeps (3x concurrency=2, 2x concurrency=1).
 *
 * This does NOT affect ssg-build.js — every SSG_PATHS route still gets
 * prerendered static HTML regardless; this only gates the CLIENT'S
 * hydrateRoot-vs-createRoot choice.
 */
export function isHydrationSafe(_pathname) {
  return true
}
