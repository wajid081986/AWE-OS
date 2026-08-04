/**
 * Vercel Routing Middleware — real 404s for a fixed set of dead URLs.
 *
 * vercel.json's SPA fallback (`"/(.*)" -> "/index.html"`) serves the
 * homepage with a 200 status for any path that isn't a real static file —
 * correct for legitimate client-rendered routes (dashboard, admin,
 * /tools/:slug for tools that exist or may exist later via the autonomous
 * tool pipeline, /:toolSlug/:city for city pages), but wrong for URLs that
 * were never real pages at all. Google Search Console flagged the paths
 * below as "soft 404s" because of this.
 *
 * These 9 paths are confirmed dead — not in TOOL_COMPONENTS, TOOL_REGISTRY,
 * SLUG_ALIASES, CITY_PAGES, or the generated SSG_PATHS manifest. The 8
 * /tools/* ones exist only as decorative "related tool" links inside blog
 * post body copy (src/data/blogPosts.js) for tools that were referenced in
 * writing but never built. /bmi-calculator/bhopa is a typo of the real
 * /bmi-calculator/bhopal redirect entry in vercel.json's `redirects` array.
 *
 * Deliberately an exact-path matcher, not a pattern like `/tools/(.*)`  —
 * this must never intercept a real or future /tools/:slug. There is no
 * static way to distinguish "doesn't exist yet" from "doesn't exist and
 * never will" for that general pattern without a live API call, which this
 * file does not make. If a new decorative/phantom link like this shows up
 * again, add it here explicitly rather than widening the matcher.
 */

const DEAD_PATHS = new Set([
  '/tools/investment-growth-calculator',
  '/tools/file-converter',
  '/tools/retirement-planner',
  '/tools/grammar-checker',
  '/tools/time-zone-converter',
  '/tools/retirement-calculator',
  '/tools/savings-calculator',
  '/tools/barcode-generator',
  '/bmi-calculator/bhopa',
])

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Not Found — AWE-OS</title>
<meta name="robots" content="noindex">
<style>
  body{font-family:system-ui,sans-serif;max-width:640px;margin:80px auto;padding:0 20px;color:#1a1a1a;text-align:center}
  h1{font-size:2rem;margin-bottom:.5rem}
  p{color:#6b7280}
  a{color:#2563eb;text-decoration:none;font-weight:500}
</style>
</head>
<body>
  <h1>404 — Page Not Found</h1>
  <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
  <p><a href="https://www.awe-os.com/tools">Browse all tools →</a></p>
</body>
</html>
`

export default function middleware(request) {
  const { pathname } = new URL(request.url)
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (DEAD_PATHS.has(normalized)) {
    return new Response(NOT_FOUND_HTML, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }
  // Not one of the dead paths (matcher should make this unreachable) —
  // fall through to normal Vercel routing unchanged.
}

export const config = {
  matcher: [
    '/tools/investment-growth-calculator',
    '/tools/file-converter',
    '/tools/retirement-planner',
    '/tools/grammar-checker',
    '/tools/time-zone-converter',
    '/tools/retirement-calculator',
    '/tools/savings-calculator',
    '/tools/barcode-generator',
    '/bmi-calculator/bhopa',
  ],
  runtime: 'edge',
}
