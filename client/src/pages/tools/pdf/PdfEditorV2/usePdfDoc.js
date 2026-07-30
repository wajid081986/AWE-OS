import { useCallback, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { RENDER_SCALE } from './constants'

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
  const textItemsCache = useRef(new Map()) // pageNumber -> converted text item boxes
  const pageTextCache = useRef(new Map()) // pageNumber -> flowing reading-order text

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

  // Existing text runs on the page, converted to RENDER_SCALE canvas-pixel
  // boxes — used to detect a click on existing PDF text (for the Text
  // tool's "click existing text to cover-and-edit" path). Same transform
  // math pdf.js's own TextLayerBuilder uses internally (viewport.transform
  // combined with each item's own transform via Util.transform), so this
  // lines up with where the text actually renders. Only reliable for
  // unrotated text — items with a non-zero angle are skipped rather than
  // mis-measured, since supporting rotated-text hit-boxes correctly needs
  // more than this approximation.
  const getTextItems = useCallback(async (pageNumber) => {
    if (textItemsCache.current.has(pageNumber)) return textItemsCache.current.get(pageNumber)
    const page = await getPage(pageNumber)
    if (!page) return []
    const [textContent, viewport] = await Promise.all([
      page.getTextContent(),
      Promise.resolve(page.getViewport({ scale: RENDER_SCALE })),
    ])
    const items = []
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
      const angle = Math.atan2(tx[1], tx[0])
      if (Math.abs(angle) > 0.01) continue // skip rotated/skewed runs
      const fontHeight = Math.hypot(tx[2], tx[3])
      items.push({
        str: item.str,
        x: tx[4],
        y: tx[5] - fontHeight,
        width: item.width * viewport.scale,
        height: fontHeight,
      })
    }
    textItemsCache.current.set(pageNumber, items)
    return items
  }, [getPage])

  // Flowing reading-order text for one page — distinct from getTextItems
  // (positioned boxes for the Text tool's click-to-edit hit-testing). Used by
  // the AI Tools feature (index.jsx's useAiTools.js), which needs plain text
  // to send to the summarize/translate/extract-tables endpoints.
  const getPageText = useCallback(async (pageNumber) => {
    if (pageTextCache.current.has(pageNumber)) return pageTextCache.current.get(pageNumber)
    const page = await getPage(pageNumber)
    if (!page) return ''
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item) => item.str).join(' ')
    pageTextCache.current.set(pageNumber, text)
    return text
  }, [getPage])

  const getAllText = useCallback(async () => {
    const texts = []
    for (let i = 1; i <= pageCount; i++) {
      // eslint-disable-next-line no-await-in-loop -- pages must join in order
      texts.push(await getPageText(i))
    }
    return texts.join('\n\n')
  }, [pageCount, getPageText])

  const reset = useCallback(() => {
    setDoc(null)
    setPageCount(0)
    setFileName('')
    setStatus('idle')
    setError('')
    pageCache.current.clear()
    textItemsCache.current.clear()
    pageTextCache.current.clear()
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
    getTextItems,
    getPageText,
    getAllText,
    renderPageToCanvas,
    reset,
  }
}
