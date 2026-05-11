import React from 'react'
import { reportError } from '../../monitoring/errorReporter'

/**
 * Chunk-load failure boundary.
 * Catches errors that occur when a lazy-imported chunk fails to download
 * (network hiccup, CDN miss after deployment, browser offline, etc.)
 *
 * For chunk errors: shows a "Reload Page" prompt — the browser will
 * re-request the chunk, typically succeeding on a second attempt.
 * For other errors: shows a generic fallback (global boundary handles the rest).
 *
 * Place this OUTSIDE the Suspense boundary that wraps lazy components.
 */

function isChunkError(error) {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.name === 'ChunkLoadError' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

export class ChunkErrorBoundary extends React.Component {
  state = { hasError: false, isChunkError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkError(error) }
  }

  componentDidCatch(error, info) {
    reportError(error, {
      boundary: 'ChunkErrorBoundary',
      isChunk:  isChunkError(error),
      component: info.componentStack?.split('\n')[1]?.trim(),
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.state.isChunkError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center">
          <p className="text-5xl mb-4">📦</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Page failed to load</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-sm">
            A resource couldn&apos;t be downloaded — this usually fixes itself on reload.
            Check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Reload Page
          </button>
        </div>
      )
    }

    // Non-chunk error — show a minimal fallback (global boundary handles retries)
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm mb-5 max-w-sm">
          An unexpected error occurred while loading this page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Reload Page
        </button>
      </div>
    )
  }
}
