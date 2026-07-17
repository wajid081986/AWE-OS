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
 *    ToolErrorBoundary → render errors inside the tool
 *
 * No local <Suspense> here (batch 5.6b, docs/batches/batch-5.6b-hydration-race.md)
 * — this used to wrap a SECOND, nested Suspense boundary inside routes.jsx's
 * own route-level one, and entry-server.jsx manually mirrored it for SSR.
 * Two adjacent Suspense boundaries with nothing between them made React's
 * hydration algorithm mis-consume the inner boundary's markers once both
 * lazy layers started resolving synchronously (thanks to Option A's
 * preload) instead of across a staged async gap — a structural mismatch
 * (React error #422), confirmed via DOM diff and reproduced identically
 * on split-pdf. Removing this boundary gives tool pages the same single-
 * Suspense shape every other hydrated route already has; ToolComponent /
 * ToolDetailPage now suspend up to routes.jsx's route-level boundary
 * instead, which already covers this same visual area during client-side
 * navigation too (ToolComponent renders ToolPageShell itself, so the
 * "loading" zone was always the whole page either way — see plan doc).
 */

import { lazy } from 'react'
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
      {ToolComponent ? (
        <ToolErrorBoundary toolName={slug}>
          <ToolComponent />
        </ToolErrorBoundary>
      ) : (
        <ToolDetailPage />
      )}
    </ChunkErrorBoundary>
  )
}
