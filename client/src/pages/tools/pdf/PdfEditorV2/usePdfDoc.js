import { useCallback, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Sets a property on the imported pdfjs module object — not a window/document
// read, so this is safe at module scope during SSR (mirrors v1's proven setup).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

/**
 * Owns the PDF.js document: load, page count, per-page render-to-canvas.
 * All canvas/DOM work happens inside callbacks invoked from effects or
 * event handlers, never at module scope.
 */
export function usePdfDoc() {
  const [doc, setDoc] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'error'
  const [error, setError] = useState('')
  const pageCache = useRef(new Map()) // pageNumber -> PDFPageProxy
  const renderTasks = useRef(new WeakMap()) // canvas element -> in-flight pdf.js RenderTask

  const loadFromBytes = useCallback(async (bytes, name = '') => {
    setStatus('loading')
    setError('')
    pageCache.current.clear()
    try {
      // pdf.js transfers the underlying ArrayBuffer to its worker for `data`
      // (a zero-copy optimization) — the caller's own `bytes` would be left
      // detached/zero-length afterward. index.jsx keeps `bytes` around in
      // originalBytesRef for the pdf-lib flatten-on-download step, so pdf.js
      // gets an independent copy here instead of the original.
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise
      setDoc(pdf)
      setPageCount(pdf.numPages)
      setFileName(name)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Failed to load PDF.')
    }
  }, [])

  const loadFromFile = useCallback(async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    await loadFromBytes(bytes, file.name)
    return bytes
  }, [loadFromBytes])

  const getPage = useCallback(async (pageNumber) => {
    if (!doc) return null
    if (pageCache.current.has(pageNumber)) return pageCache.current.get(pageNumber)
    const page = await doc.getPage(pageNumber)
    pageCache.current.set(pageNumber, page)
    return page
  }, [doc])

  // pdf.js throws "Cannot use the same canvas during multiple render()
  // operations" if a second render starts on a canvas before the first
  // finishes — which React 18 StrictMode's double-invoked effects trigger
  // on every mount in dev, and which a rapid pageNumber/zoom change could
  // trigger in production too. Cancelling any in-flight task for that exact
  // canvas before starting a new one make this safe either way.
  const renderPageToCanvas = useCallback(async (pageNumber, canvas, scale = 1) => {
    const page = await getPage(pageNumber)
    if (!page || !canvas) return null

    const inFlight = renderTasks.current.get(canvas)
    if (inFlight) {
      inFlight.cancel()
      await inFlight.promise.catch(() => {}) // expected RenderingCancelledException
    }

    const viewport = page.getViewport({ scale })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    const renderTask = page.render({ canvasContext: ctx, viewport })
    renderTasks.current.set(canvas, renderTask)
    try {
      await renderTask.promise
    } catch (err) {
      // A later call cancelled *this* task (see the guard above) — expected,
      // not an error. Any other rejection is a real failure and re-throws.
      if (err?.name === 'RenderingCancelledException') return null
      throw err
    } finally {
      if (renderTasks.current.get(canvas) === renderTask) renderTasks.current.delete(canvas)
    }
    return viewport
  }, [getPage])

  const reset = useCallback(() => {
    setDoc(null)
    setPageCount(0)
    setFileName('')
    setStatus('idle')
    setError('')
    pageCache.current.clear()
  }, [])

  return {
    doc,
    pageCount,
    fileName,
    status,
    error,
    isReady: status === 'ready',
    loadFromFile,
    loadFromBytes,
    getPage,
    renderPageToCanvas,
    reset,
  }
}
