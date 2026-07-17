/**
 * DynamicToolPage — unified entry point for all /tools/:slug routes.
 *
 * AUTO-REGISTRATION: To add a new tool, add ONE line to
 * toolComponentMap.js's TOOL_COMPONENTS:
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
// Slug -> import() map, hoisted to toolComponentMap.js (batch 5.6b) so
// hydratePreload.js can await the same closures before hydrateRoot runs
// without importing this file's React/JSX into main.jsx's eager bundle.
// Add new tools there, not here.
import { TOOL_COMPONENTS } from './toolComponentMap'

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
