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

const TOOL_SLUG_SET = new Set(TOOL_SLUGS)

/**
 * Category-level hydrateRoot allowlist, per the batch's 3-run determination
 * sweep (docs/batches/batch-5.6-ssg-hydration.md): individual /tools/:slug
 * pages (all 48/48 failed — an early-effect-vs-Suspense-hydration race, root
 * cause not yet isolated) and the whole /blog family (38/41 passed 3/3, but
 * "an individual passing blog post today may fail tomorrow" per the flaky
 * members — excluded as a category, not a per-URL allowlist) still need
 * createRoot. Everything else in SSG_PATHS (home, tool category/index pages,
 * static pages, all 24 city pages, compare, faq) passed 3/3 clean.
 *
 * This does NOT affect ssg-build.js — excluded routes still get prerendered
 * static HTML (SEO/first-paint benefit unchanged); only the CLIENT'S
 * hydrateRoot-vs-createRoot choice is gated by this.
 */
export function isHydrationSafe(pathname) {
  const normalized = normalize(pathname)
  if (normalized === '/blog' || normalized.startsWith('/blog/')) return false
  const toolSlugMatch = /^\/tools\/([a-z0-9-]+)$/.exec(normalized)
  if (toolSlugMatch && TOOL_SLUG_SET.has(toolSlugMatch[1])) return false
  return true
}
