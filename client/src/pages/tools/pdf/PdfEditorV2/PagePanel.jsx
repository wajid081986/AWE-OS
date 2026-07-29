import { useEffect, useRef } from 'react'

const THUMB_SCALE = 0.2

function Thumbnail({ pageNumber, pdfDoc, isActive, onClick }) {
  const canvasRef = useRef(null)
  // Depend on the specific stable values, not the whole `pdfDoc` object —
  // usePdfDoc() returns a fresh object every render, so depending on it
  // directly would re-fire this effect (and re-render the thumbnail) on
  // every unrelated app state change (see PageCanvas.jsx for the same fix
  // and the bug it caused when missed).
  const { renderPageToCanvas, isReady } = pdfDoc

  // Renders through the same guarded renderPageToCanvas as the main viewer
  // (usePdfDoc.js), keyed per-canvas — this thumbnail's own <canvas> element
  // never collides with the full-size PageCanvas rendering the same page.
  useEffect(() => {
    let cancelled = false
    async function render() {
      await renderPageToCanvas(pageNumber, canvasRef.current, THUMB_SCALE)
    }
    if (isReady && !cancelled) render()
    return () => { cancelled = true }
  }, [renderPageToCanvas, isReady, pageNumber])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full border-2 rounded-s overflow-hidden mb-2 ${isActive ? 'border-cobalt' : 'border-transparent hover:border-line'}`}
    >
      <canvas ref={canvasRef} className="w-full block" />
      <p className="text-[11px] text-center text-ink-soft py-0.5">{pageNumber}</p>
    </button>
  )
}

/** Left sidebar: collapsible page thumbnails, click to jump to that page. */
export default function PagePanel({ pdfDoc, pageCount, activePage, onJumpToPage, collapsed, onToggleCollapsed }) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label="Show page thumbnails"
        className="w-8 shrink-0 self-stretch bg-card border border-line rounded-m text-ink-soft hover:bg-cobalt-tint"
      >
        »
      </button>
    )
  }

  return (
    <aside className="w-32 shrink-0 bg-card border border-line rounded-m p-2 overflow-y-auto max-h-[75vh]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-ink-soft">Pages</p>
        <button type="button" onClick={onToggleCollapsed} aria-label="Hide page thumbnails" className="text-ink-soft hover:text-ink text-xs">«</button>
      </div>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
        <Thumbnail
          key={pageNumber}
          pageNumber={pageNumber}
          pdfDoc={pdfDoc}
          isActive={pageNumber === activePage}
          onClick={() => onJumpToPage(pageNumber)}
        />
      ))}
    </aside>
  )
}
