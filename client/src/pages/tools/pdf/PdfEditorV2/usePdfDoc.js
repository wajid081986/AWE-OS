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

  const loadFromBytes = useCallback(async (bytes, name = '') => {
    setStatus('loading')
    setError('')
    pageCache.current.clear()
    try {
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
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

  const renderPageToCanvas = useCallback(async (pageNumber, canvas, scale = 1) => {
    const page = await getPage(pageNumber)
    if (!page || !canvas) return null
    const viewport = page.getViewport({ scale })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
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
