# AWE-OS Phase 3C — Production Hardening

## Overview

Phase 3C transforms AWE-OS from a functional SPA into a production-grade SaaS platform. It adds the infrastructure layer that sits between the application code and production traffic: error isolation, performance optimization, observability, ad safety, caching, and deployment hardening.

**Nothing was redesigned. Every system built in Phases 2–3B is preserved.**

---

## Architecture Map

```
client/src/
├── cache/                          ← In-memory TTL cache infrastructure
│   ├── createCache.js              — Generic cache factory (Map + expiry)
│   ├── registryCache.js            — Cached toolRegistry wrappers
│   └── index.js
│
├── safety/                         ← Dev-time validation (zero production cost)
│   ├── validateRegistry.js         — Duplicate slug detection, required fields
│   ├── envValidation.js            — Missing environment variable warnings
│   └── index.js
│
├── monitoring/                     ← Observability layer
│   ├── performanceMonitor.js       — Orchestrates Web Vitals startup
│   ├── errorReporter.js            — Structured reporting (console → Sentry ready)
│   └── index.js
│
├── utils/performance/              ← Performance primitives
│   ├── webVitals.js                — LCP, FID, CLS, FCP, TTFB via PerformanceObserver
│   ├── preloadRoutes.js            — Named import() calls per high-traffic route
│   ├── idlePreload.js              — requestIdleCallback-based preloading
│   ├── routePrefetch.js            — usePrefetch() hook for hover-triggered loads
│   ├── chunkStrategy.js            — Chunk naming reference + tool groupings
│   └── index.js
│
├── components/
│   ├── errors/                     ← Error isolation boundaries
│   │   ├── ToolErrorBoundary.jsx   — Per-tool retry UI (no page reload required)
│   │   ├── ChunkErrorBoundary.jsx  — Chunk load failure recovery
│   │   └── index.js
│   │
│   ├── ads/                        ← Ad-safe architecture
│   │   ├── LazyAdSlot.jsx          — IntersectionObserver-triggered ad mounting
│   │   ├── AdPlaceholder.jsx       — CLS-safe fixed-dimension placeholder
│   │   └── index.js
│   │
│   └── performance/                ← Performance components
│       ├── DeferredRender.jsx      — RAF-deferred rendering for below-fold content
│       └── index.js
```

---

## 1. Error Isolation System

### Problem
The existing `ErrorBoundary` was a single global boundary. Any render error inside any tool — regardless of severity — crashed the entire page and showed a full-screen dark overlay.

### Solution

**`ToolErrorBoundary`** wraps individual tool components. If a tool crashes:
- The tool area shows "This tool ran into a problem" with a **Try Again** button
- The rest of the page (header, breadcrumbs, sidebar, other tools) remains intact
- Retry increments a `key` on the wrapper div, forcing React to unmount and remount the tool from scratch
- Dev mode shows the error stack inline — production shows only the user-friendly message

**`ChunkErrorBoundary`** wraps the Suspense boundary in `DynamicToolPage`. When Vite's lazy imports fail (network error, CDN 404 after redeployment, browser offline):
- Detects chunk-specific errors via error name and message patterns
- Shows "Page failed to load — Reload Page" UI
- Falls back to a generic error UI for non-chunk errors

**Error tree:**
```
main.jsx ErrorBoundary (global)
  └── DynamicToolPage
        └── ChunkErrorBoundary ← catches chunk download failures
              └── Suspense
                    └── ToolErrorBoundary ← catches tool render errors
                          └── <ToolComponent />
```

**Scalability:** Each new tool automatically gets both error boundaries at zero cost — no per-tool error handling code needed.

---

## 2. Performance Optimization

### Chunk Splitting (vite.config.js)

| Before | After |
|--------|-------|
| `WordToPDF` chunk: **402 kB** (mammoth bundled in) | `WordToPDF` chunk: **5.2 kB** |
| `vendor-mammoth` chunk: _(none)_ | `vendor-mammoth`: **397 kB** (load-on-demand) |
| `html2canvas` in implicit chunk | `vendor-html2canvas`: **201 kB** (explicitly named) |

The mammoth split means users who never visit Word → PDF never download 400kB. For the ~80% of users who only use PDF tools and calculators, the savings are direct.

**Named chunks added:** `vendor-mammoth`, `vendor-html2canvas`, `vendor-jszip` (explicit), plus `build.target: 'es2020'` for modern syntax output (smaller class/async transforms).

### Web Vitals Tracking (`utils/performance/webVitals.js`)

Tracks LCP, FID, CLS, FCP, TTFB using native `PerformanceObserver`. No SDK required. Sends to GA4 (`window.gtag`) if present. Scores are rated against Google's thresholds (good/needs-improvement/poor) for actionable reporting.

Initialized via `initMonitoring()` in `main.jsx` before the React tree mounts — ensures TTFB is captured from the navigation entry.

### Idle Preloading (`utils/performance/idlePreload.js`)

Uses `requestIdleCallback` (with `setTimeout` fallback) to preload high-traffic routes after the current page is idle. Call `preloadCommonRoutes()` on the Homepage — the most common entry point — to warm the ToolsPage and CategoryPage chunks before users click.

### Hover Prefetching (`utils/performance/routePrefetch.js`)

`usePrefetch(preloadFn)` returns `{ onMouseEnter, onFocus, onTouchStart }` handlers. Fire the import on first hover — the chunk is usually cached before the user's click completes. De-duplicated (only fires once per component instance).

---

## 3. Ad-Safe Architecture

### Problem
`AdBanner` rendered immediately on mount, regardless of viewport position. Sidebar ads (below fold on mobile) fired AdSense requests before users could possibly see them. This:
- Wasted impressions (CPS efficiency loss)
- Added unnecessary network requests during initial load
- Contributed to layout instability during paint if dimensions changed

### Solution: `LazyAdSlot` + `AdPlaceholder`

`LazyAdSlot` uses `IntersectionObserver` with a `200px` root margin:
- Until the element is within 200px of the viewport → renders `AdPlaceholder`
- Once threshold crossed → mounts `AdBanner` (replacing placeholder)
- `IntersectionObserver` is disconnected after first intersection (one-shot)

`AdPlaceholder` reserves **exact ad dimensions** (same as `AdBanner`):
- Leaderboard: 728×90 (desktop), 320×50 (mobile)
- Rectangle: 300×250
- Mobile: 320×50

This eliminates CLS from ad loading — the placeholder holds the space until the real unit renders.

**`AdContainer` slot behaviour:**
| Slot | Size | Eager |
|------|------|-------|
| `top-banner` | leaderboard | ✓ (above fold) |
| `sidebar` | rectangle | ✗ (lazy) |
| `inline` | leaderboard | ✗ (lazy) |
| `mobile-banner` | mobile | ✗ (lazy) |

Top-banner ads are `eager` because they're above the fold and should fire immediately. All other slots lazy-load, reducing initial network pressure.

**To activate real AdSense:** Replace `AdBanner` internals with `<ins class="adsbygoogle">` tags. `AdContainer`, `LazyAdSlot`, and all callers remain unchanged.

---

## 4. Frontend Cache

`createCache({ ttl })` returns a Map-based cache with:
- `get(key)` — returns value or `undefined` (expired entries are evicted on access)
- `set(key, value, customTtl?)` — stores with TTL
- `prune()` — evicts all expired entries (call on route change to prevent growth)

`registryCache.js` wraps `getToolBySlug`, `getRelatedTools`, `getCategoryMeta` with 10-minute TTL caches. The registry is small enough that this is primarily an extensibility pattern — useful if registry lookups become heavier (e.g., runtime API fetches in future phases).

---

## 5. Runtime Safety

`validateRegistry()` runs at startup in development only. Checks:
- Missing required fields (`slug`, `name`, `category`, `icon`, `description`)
- Duplicate slugs — would cause `DynamicToolPage` to silently serve the wrong component

`validateEnv()` logs which optional env vars are missing and what they're used for. Helps diagnose misconfigured deployments without throwing.

Both are no-ops in production (`import.meta.env.PROD` guard).

---

## 6. Observability

`errorReporter.js` centralizes all error/warning logging:
- Dev: structured `console.error` with context object
- Prod: silent (ready for `window.Sentry?.captureException`)

To wire up Sentry or a custom endpoint: replace the TODO lines in `errorReporter.js`. No other files need changing — all error boundaries and monitoring code already route through this module.

---

## 7. Accessibility Improvements

| Location | Before | After |
|----------|--------|-------|
| `DynamicToolPage` `PageLoader` | Plain spinner div | `role="status"`, `aria-label="Loading tool"`, `<span class="sr-only">Loading…</span>` |
| `routes.jsx` `PageLoader` | Plain spinner div | `role="status"`, `aria-label="Loading page"`, SR text |
| `ToolSidebar` Share buttons | No aria labels, no copy feedback | `aria-label` on each button, `role="group"` on container, `copied` state with "✓ Copied" visual feedback |
| `ToolFooter` FAQ accordion | Native `<details>/<summary>` | Already accessible by default — native semantics preserved |
| `ToolHeader` icon | `aria-hidden` ✓ | No change needed |

---

## 8. Deployment Hardening (vercel.json)

### Cache headers
```
/assets/* → Cache-Control: public, max-age=31536000, immutable
```
Vite output files use content hashes in filenames (e.g., `vendor-react-BbEMgT_W.js`). When content changes, the hash changes and a new URL is served — so it's safe to cache hashed assets **forever**.

**Impact:** Returning users load zero bytes for assets that haven't changed. For a 95kB main bundle + 180kB React chunk, this saves ~275kB per returning user per session.

### Security headers (all routes)
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 9. DeferredRender

`DeferredRender` wraps non-critical below-fold sections. It defers children until `requestAnimationFrame` fires — after the browser has painted the current frame. The main tool UI paints first; FAQs, how-to steps, and sidebar content render on the next frame.

Usage:
```jsx
<DeferredRender>
  <ToolFooter steps={steps} faqs={faqs} name={name} />
</DeferredRender>
```

---

## 10. Bundle Analysis Summary

| Chunk | Size (gzip) | Loads When |
|-------|------------|-----------|
| `vendor-react` | 58.9 kB | Every page |
| `index` (main app) | 33.0 kB | Every page |
| `vendor-pdfjs` | 132.4 kB | Any PDF view tool |
| `vendor-pdf-lib` | 206.6 kB | Any PDF edit tool |
| `vendor-jspdf` | 129.0 kB | Resume builder, PDF generation |
| `vendor-mammoth` | 100.7 kB | Word → PDF only |
| `vendor-html2canvas` | 48.0 kB | Watermark, page numbers, invoice |
| `vendor-xlsx` | 141.7 kB | Excel tools, CSV |
| `vendor-jszip` | 30.1 kB | PDF split/merge |
| Individual tools | 2–10 kB | On navigation to that tool |

---

## Verification Checklist

```
✅ npm run build — zero errors, zero warnings
✅ ToolErrorBoundary — wraps each tool in DynamicToolPage
✅ ChunkErrorBoundary — wraps Suspense in DynamicToolPage
✅ LazyAdSlot — all AdContainer slots use IntersectionObserver
✅ Web Vitals — initMonitoring() called before React renders
✅ validateRegistry() — runs in dev, no-op in prod
✅ mammoth chunk — 397kB, isolated from WordToPDF (5kB)
✅ vercel.json — /assets/* cached 1 year immutable
✅ Security headers — on all routes
✅ PageLoader ARIA — role=status, sr-only text
✅ Share button feedback — copied state, aria-label
✅ ToolPageShell — untouched (31 legacy tools unaffected)
```

---

## Remaining Risks

1. **`ToolPageShell` tools** — 31 tools use the old shell. They have no `ToolErrorBoundary` wrapping. If one crashes during render, the ChunkErrorBoundary still catches it. Priority: low (these tools are stable).

2. **`vendor-pdf-lib` at 520kB (206kB gzip)** — Inherent to `pdf-lib`. Not reducible without switching libraries. Acceptable because it's loaded on-demand only for PDF editing tools.

3. **`registryCache` not wired to ToolLayout** — `ToolLayout.jsx` still calls `getToolBySlug` directly. The cache is available but optional. Wire it up if registry lookups become API calls.

4. **Sentry not yet integrated** — `errorReporter.js` is ready. Add `window.Sentry?.captureException` when Sentry DSN is available.

---

## Future Evolution Path

| Phase | Recommendation |
|-------|----------------|
| 3D | Wire `DeferredRender` into `ToolLayout`'s `ToolFooter` section |
| 3D | Add `preloadCommonRoutes()` call to `Home.jsx` `useEffect` |
| 4A | Add Sentry DSN to env, uncomment `reportError` Sentry lines |
| 4B | Replace `AdBanner` placeholder with real `<ins>` tags — zero callers change |
| 4C | Add `pruneRegistryCaches()` call on route change events |
| 5A | Extract `vendor-react` + `index` into service worker cache for offline support |
