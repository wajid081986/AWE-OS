import { useCallback, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'

let keyCounter = 0
const nextKey = () => `pg_${Date.now().toString(36)}_${(keyCounter++).toString(36)}`

/**
 * Owns page structure (order, inserts, duplicates, deletes) as a
 * `{ key, kind, srcIndex }` array — `key` is stable across rebuilds so
 * index.jsx can remap annotations by identity rather than position.
 * `kind`/`srcIndex` only matter transiently while building the *next*
 * document: once a rebuild is saved, `originalBytesRef.current` IS that new
 * document, so every entry gets normalized back to
 * `{ kind: 'existing', srcIndex: <its own new position> }` — a page inserted
 * blank a moment ago is now just an ordinary existing page of the current
 * base document. This keeps `srcIndex` always valid against whatever bytes
 * `originalBytesRef.current` currently holds, instead of silently going
 * stale the moment a second structural edit happens.
 */
export function usePageManager({ originalBytesRef, pdfDoc }) {
  const [pageOrder, setPageOrder] = useState([])
  const pageOrderRef = useRef([])

  const initFromPageCount = useCallback((count) => {
    const order = Array.from({ length: count }, (_, i) => ({ key: nextKey(), kind: 'existing', srcIndex: i }))
    setPageOrder(order)
    pageOrderRef.current = order
  }, [])

  const buildPdfFromOrder = useCallback(async (order, sourceBytes) => {
    const srcPdf = await PDFDocument.load(sourceBytes)
    const newPdf = await PDFDocument.create()
    const defaultSize = srcPdf.getPageCount() > 0 ? srcPdf.getPage(0).getSize() : { width: 595.28, height: 841.89 }
    for (const entry of order) {
      if (entry.kind === 'blank') {
        newPdf.addPage([defaultSize.width, defaultSize.height])
      } else {
        // eslint-disable-next-line no-await-in-loop -- pages must copy in order to land in the right sequence
        const [copied] = await newPdf.copyPages(srcPdf, [entry.srcIndex])
        newPdf.addPage(copied)
      }
    }
    return newPdf
  }, [])

  // Every mutating action funnels through here: build the candidate order,
  // save it as the new base document, reload pdf.js from those bytes, and
  // normalize the stored order to match the fresh document's real layout.
  // Returns {oldOrder, newOrder} (both keyed) so the caller can compute an
  // old-page-number -> new-page-number map for annotations.
  const rebuild = useCallback(async (candidateOrder) => {
    const oldOrder = pageOrderRef.current
    const newPdf = await buildPdfFromOrder(candidateOrder, originalBytesRef.current)
    const bytes = await newPdf.save()
    originalBytesRef.current = bytes
    await pdfDoc.loadFromBytes(bytes, pdfDoc.fileName)
    const newOrder = candidateOrder.map((entry, i) => ({ key: entry.key, kind: 'existing', srcIndex: i }))
    setPageOrder(newOrder)
    pageOrderRef.current = newOrder
    return { oldOrder, newOrder }
  }, [buildPdfFromOrder, originalBytesRef, pdfDoc])

  const insertBlankPage = useCallback(async (position0) => {
    const next = pageOrderRef.current.slice()
    next.splice(position0, 0, { key: nextKey(), kind: 'blank' })
    return rebuild(next)
  }, [rebuild])

  const duplicatePage = useCallback(async (position0) => {
    const order = pageOrderRef.current
    const source = order[position0]
    const next = order.slice()
    next.splice(position0 + 1, 0, { key: nextKey(), kind: source.kind, srcIndex: source.srcIndex })
    const result = await rebuild(next)
    return { ...result, newPosition: position0 + 2 } // 1-indexed page number of the new copy
  }, [rebuild])

  const deletePage = useCallback(async (position0) => {
    const order = pageOrderRef.current
    if (order.length <= 1) throw new Error("Can't delete the only page.")
    const next = order.slice()
    next.splice(position0, 1)
    return rebuild(next)
  }, [rebuild])

  const movePage = useCallback(async (from0, to0) => {
    const next = pageOrderRef.current.slice()
    const [moved] = next.splice(from0, 1)
    next.splice(to0, 0, moved)
    return rebuild(next)
  }, [rebuild])

  // Builds a standalone PDFDocument containing just `positions0` (0-indexed
  // into the current pageOrder) — used by Extract/Split, which download a
  // one-off file and never touch the live editor's pageOrder/pdf.js state.
  // Returns oldPageNumbers[i] (1-indexed) so the caller can look up and
  // flatten annotations belonging to newPdf.getPage(i).
  const buildSubsetPdf = useCallback(async (positions0) => {
    const order = pageOrderRef.current
    const srcPdf = await PDFDocument.load(originalBytesRef.current)
    const newPdf = await PDFDocument.create()
    const oldPageNumbers = []
    for (const pos of positions0) {
      // eslint-disable-next-line no-await-in-loop -- pages must copy in order
      const [copied] = await newPdf.copyPages(srcPdf, [order[pos].srcIndex])
      newPdf.addPage(copied)
      oldPageNumbers.push(pos + 1)
    }
    return { pdfLibDoc: newPdf, oldPageNumbers }
  }, [originalBytesRef])

  return {
    pageOrder,
    initFromPageCount,
    insertBlankPage,
    duplicatePage,
    deletePage,
    movePage,
    buildSubsetPdf,
  }
}

// Old 1-indexed page number -> new 1-indexed page number (or null if that
// page's key no longer exists, i.e. it was deleted) — matches keys across a
// rebuild rather than positions, since positions shift under insert/delete.
export function buildPageRemap(oldOrder, newOrder) {
  const newPosByKey = new Map(newOrder.map((entry, i) => [entry.key, i + 1]))
  return (oldPageNumber) => {
    const entry = oldOrder[oldPageNumber - 1]
    if (!entry) return null
    return newPosByKey.get(entry.key) ?? null
  }
}
