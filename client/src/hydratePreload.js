/**
 * hydratePreload.js — batch 5.6b (docs/batches/batch-5.6b-hydration-race.md).
 *
 * Root cause (confirmed via dev-mode splice + Suspense-marker diff, see
 * the plan doc's implementation log): entry-server.jsx imports every page
 * directly (no lazy()), so its SSR output never actually suspends — the
 * client, however, MUST resolve one or more lazy() chunks (route-level via
 * routes.jsx's lazy$(), and for /tools/:slug a SECOND, sequential chunk
 * for the specific tool component) before it can render the equivalent
 * tree. lazy() always throws on its very first render call regardless of
 * whether the module is cached, so any real, non-zero resolution latency
 * lets that thrown-then-resolved promise "ping" its Suspense boundary
 * after hydration has started but before it has committed — "This
 * Suspense boundary received an update before it finished hydrating."
 * Tool pages' forced two-layer waterfall makes this happen on every load
 * (confirmed 10/10 deterministic); single-layer routes appear to hit the
 * same race only intermittently, under real contention.
 *
 * Fix: resolve every lazy import the matched route needs BEFORE
 * hydrateRoot is ever called (see main.jsx). Since hydrateRoot simply
 * isn't invoked until these awaits settle, this is correctness-
 * independent of network speed — there is nothing left to resolve
 * asynchronously once hydration starts, no matter how long the fetch
 * took to get there. The SSG'd HTML is already painted on screen for the
 * whole wait (that's the point of SSG), and the page wasn't interactive
 * before this chunk loaded anyway — no UX cost.
 */

import { STATIC_PATHS, CATEGORY_SLUGS, TOOL_SLUGS } from './ssgRoutes'
import { SLUG_ALIASES } from './data/toolRegistry'
import { ROUTE_IMPORTS } from './routeImports'
import { TOOL_COMPONENTS } from './pages/tools/toolComponentMap'

const CATEGORY_SLUG_SET = new Set(CATEGORY_SLUGS)
const TOOL_SLUG_SET = new Set(TOOL_SLUGS)

// pathname -> ROUTE_IMPORTS key, for the fixed static paths.
const STATIC_IMPORT_KEYS = {
  '/': 'home',
  '/tools': 'toolsIndex',
  '/tools/free': 'freeTools',
  '/blog': 'blog',
  '/about': 'about',
  '/contact': 'contact',
  '/privacy-policy': 'privacyPolicy',
  '/terms': 'terms',
  '/disclaimer': 'disclaimer',
  '/editorial-policy': 'editorialPolicy',
  '/tool-testing-policy': 'toolTestingPolicy',
  '/ai-content-policy': 'aiContentPolicy',
  '/corrections-policy': 'correctionsPolicy',
  '/advertising-policy': 'advertisingPolicy',
}

// Sanity check against ssgRoutes.js's own STATIC_PATHS at module load —
// catches drift if a static path is ever added there without a matching
// entry here (dev-only; a stale preload map just means a slightly less
// effective preload, never a correctness bug, so this doesn't throw).
if (import.meta.env.DEV) {
  for (const path of STATIC_PATHS) {
    if (!(path in STATIC_IMPORT_KEYS)) {
      console.warn(`[hydratePreload] STATIC_PATHS has "${path}" with no matching STATIC_IMPORT_KEYS entry — add one so hydration can preload it.`)
    }
  }
}

function normalize(pathname) {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

/**
 * Returns the list of import() calls (already invoked, i.e. Promises)
 * needed to render `pathname`'s matched route. Awaiting all of them
 * before hydrateRoot is what closes the race — see file header.
 */
function getPreloadImports(pathname) {
  const path = normalize(pathname)

  const staticKey = STATIC_IMPORT_KEYS[path]
  if (staticKey) return [ROUTE_IMPORTS[staticKey]()]

  const toolPathMatch = /^\/tools\/([a-z0-9-]+)$/.exec(path)
  if (toolPathMatch) {
    const slug = toolPathMatch[1]
    if (CATEGORY_SLUG_SET.has(slug)) return [ROUTE_IMPORTS.categoryPage()]
    if (TOOL_SLUG_SET.has(slug)) {
      const imports = [ROUTE_IMPORTS.dynamicToolPage()]
      const canonicalSlug = SLUG_ALIASES[slug] ?? slug
      const toolImportFn = TOOL_COMPONENTS[canonicalSlug]
      // Always defined in practice — entry-server.jsx's assertNoRouteDrift()
      // fails the build if TOOL_SLUGS and TOOL_COMPONENTS' keys ever
      // diverge — but guarded rather than assumed.
      if (toolImportFn) imports.push(toolImportFn())
      return imports
    }
    return []
  }

  const blogPostMatch = /^\/blog\/([a-z0-9-]+)$/.exec(path)
  if (blogPostMatch) return [ROUTE_IMPORTS.blogPost()]

  const compareMatch = /^\/compare\/([a-z0-9-]+)$/.exec(path)
  if (compareMatch) return [ROUTE_IMPORTS.compareToolPage()]

  const faqMatch = /^\/faq\/([a-z0-9-]+)$/.exec(path)
  if (faqMatch) return [ROUTE_IMPORTS.faqCategoryPage()]

  // City pages: /:toolSlug/:city (e.g. /gst-calculator/mumbai) — the last
  // pattern checked since it's the least specific (routes.jsx's own
  // comment notes this route ranks lowest for the same reason).
  const cityMatch = /^\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(path)
  if (cityMatch) return [ROUTE_IMPORTS.cityToolPage()]

  return []
}

export async function preloadForHydration(pathname) {
  const imports = getPreloadImports(pathname)
  if (imports.length === 0) return
  await Promise.all(imports)
}
