/**
 * PdfEditorStandalone
 *
 * Full-screen, no-shell PDF editor page that opens in a new tab.
 * The parent tab (PdfEditor with openNewTabOnUpload) stores the PDF
 * bytes in localStorage keyed by `?session=KEY`. This page reads that
 * key, decodes the bytes, and mounts PdfEditorTool in full-screen mode.
 *
 * localStorage entry is deleted after reading (one-time handshake).
 */

import { useState, useEffect } from 'react'
import { PdfEditorTool } from './PdfEditor'

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
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('session')
    if (!key) { setStatus('error'); return }

    const startTime = Date.now()
    const TIMEOUT   = 20_000 // 20 s — parent tab may still be encoding

    const tryLoad = () => {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) {
          // Parent tab hasn't finished encoding yet — poll every 300 ms
          if (Date.now() - startTime < TIMEOUT) {
            setTimeout(tryLoad, 300)
          } else {
            setStatus('error')
          }
          return
        }
        const { name, data } = JSON.parse(raw)
        localStorage.removeItem(key) // Clean up — single use
        setInitialBytes(base64ToUint8(data))
        setInitialFileName(name || 'document.pdf')
        setStatus('ready')
      } catch (e) {
        console.error('[pdf-editor-standalone] load error', e)
        setStatus('error')
      }
    }

    tryLoad()
  }, [])

  if (status === 'loading') return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading your PDF…</p>
      </div>
    </div>
  )

  if (status === 'error') return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
      <div className="text-center space-y-4">
        <div className="text-5xl">❌</div>
        <p className="text-white text-lg font-semibold">Session expired or not found</p>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Go back to the PDF Editor tab and re-upload your file to open a fresh editor.
        </p>
        <button
          onClick={() => window.close()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Close this tab
        </button>
      </div>
    </div>
  )

  // 'ready' — render the full-screen editor
  return (
    <PdfEditorTool
      initialBytes={initialBytes}
      initialFileName={initialFileName}
      fullScreen
    />
  )
}
