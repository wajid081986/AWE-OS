/**
 * PdfEditorStandalone — Full-screen, no-shell PDF editor tab.
 *
 * Flow:
 *  1. Main upload page (PdfEditor) encodes PDF → stores in localStorage[KEY]
 *  2. Opens /tools/pdf-editor/editor?session=KEY in new tab
 *  3. This page reads KEY → decodes bytes → loads PdfEditorTool in fullScreen mode
 *  4. localStorage entry deleted immediately after reading (one-shot handshake)
 *
 * localStorage is used (not sessionStorage) because:
 *  - localStorage is shared across all tabs of the same origin
 *  - sessionStorage is per-browsing-context and severed by window.open()
 */

import { useState, useEffect } from 'react'
import { PdfEditorTool } from './PdfEditor'
import EditorErrorBoundary from '../../../components/pdf-editor/EditorErrorBoundary'

// Decode base64 → Uint8Array
function base64ToUint8(b64) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

export default function PdfEditorStandalone() {
  const [initialBytes,    setInitialBytes]    = useState(null)
  const [initialFileName, setInitialFileName] = useState('')
  const [status,          setStatus]          = useState('loading') // 'loading' | 'ready' | 'error'
  const [loadError,       setLoadError]       = useState('')
  const [countdown,       setCountdown]       = useState(5)

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('session')

    // ── Phase 6B: Session expiry guard — auto-redirect if no key ─────────────
    if (!key) {
      setLoadError('No PDF session found. Please go back and upload your file again.')
      setStatus('error')

      // Countdown redirect back to upload page
      let n = 5
      const tick = setInterval(() => {
        n -= 1
        setCountdown(n)
        if (n <= 0) {
          clearInterval(tick)
          window.location.href = '/tools/pdf-editor'
        }
      }, 1000)
      return () => clearInterval(tick)
    }

    // ── Poll localStorage for payload (parent tab may still be encoding) ─────
    const startTime = Date.now()
    const TIMEOUT   = 20_000  // 20 s

    const tryLoad = () => {
      try {
        const raw = localStorage.getItem(key)

        if (!raw) {
          if (Date.now() - startTime < TIMEOUT) {
            setTimeout(tryLoad, 300)
          } else {
            setLoadError('Session timed out. The upload may have failed. Please go back and try again.')
            setStatus('error')
          }
          return
        }

        const { name, data, createdAt } = JSON.parse(raw)

        // Reject sessions older than 10 minutes (stale)
        if (Date.now() - createdAt > 10 * 60 * 1000) {
          localStorage.removeItem(key)
          setLoadError('Session expired. Please re-upload your PDF.')
          setStatus('error')
          return
        }

        localStorage.removeItem(key)   // One-shot — clean up immediately

        setInitialBytes(base64ToUint8(data))
        setInitialFileName(name || 'document.pdf')
        setStatus('ready')

      } catch (e) {
        console.error('[AWE PDF Standalone] load error:', e)
        setLoadError('Corrupted session data. Please go back and re-upload.')
        setStatus('error')
      }
    }

    tryLoad()
  }, [])

  // ── Loading state ─────────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-300 text-sm font-medium">Loading your PDF…</p>
        <p className="text-gray-500 text-xs">Decoding file data</p>
      </div>
    </div>
  )

  // ── Error state ───────────────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="text-5xl">❌</div>
        <h1 className="text-white text-lg font-semibold">Couldn't load PDF</h1>
        <p className="text-gray-400 text-sm leading-relaxed">{loadError}</p>

        {/* Auto-redirect countdown — only when no session key */}
        {countdown < 5 && (
          <p className="text-gray-500 text-xs">
            Redirecting to upload page in {countdown}s…
          </p>
        )}

        <div className="flex gap-3 justify-center mt-2">
          <button
            onClick={() => { window.location.href = '/tools/pdf-editor' }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Upload
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close Tab
          </button>
        </div>
      </div>
    </div>
  )

  // ── Ready — full-screen editor wrapped in error boundary ──────────────────
  return (
    <EditorErrorBoundary>
      <PdfEditorTool
        initialBytes={initialBytes}
        initialFileName={initialFileName}
        fullScreen
      />
    </EditorErrorBoundary>
  )
}
