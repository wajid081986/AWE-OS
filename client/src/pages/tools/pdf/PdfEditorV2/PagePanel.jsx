import { useEffect, useRef, useState } from 'react'

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
      className={`block w-full border-2 rounded-s overflow-hidden ${isActive ? 'border-cobalt' : 'border-transparent hover:border-line'}`}
    >
      <canvas ref={canvasRef} className="w-full block" />
      <p className="text-[11px] text-center text-ink-soft py-0.5">{pageNumber}</p>
    </button>
  )
}

/** Small "⋮" dropdown of page-management actions for one thumbnail —
 * same click-outside-to-close idiom as Toolbar.jsx's AiToolsMenu, but
 * rendered `w-full` (not a fixed width) so it never overflows the 128px
 * sidebar column PagePanel is constrained to. */
function PageActionsMenu({ position0, pageCount, onInsertBlank, onDuplicate, onRequestDelete, onSplitAfter }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function pick(action) {
    setOpen(false)
    action()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Page ${position0 + 1} actions`}
        className="w-5 h-5 rounded-s text-xs text-ink-soft hover:bg-cobalt-tint hover:text-ink leading-none"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[140px] bg-card border border-line rounded-s shadow-card z-20 py-1">
          <button type="button" onClick={() => pick(() => onInsertBlank(position0))} className="w-full text-left px-2.5 py-1.5 text-xs text-ink hover:bg-cobalt-tint whitespace-nowrap">Insert blank above</button>
          <button type="button" onClick={() => pick(() => onInsertBlank(position0 + 1))} className="w-full text-left px-2.5 py-1.5 text-xs text-ink hover:bg-cobalt-tint whitespace-nowrap">Insert blank below</button>
          <button type="button" onClick={() => pick(() => onDuplicate(position0))} className="w-full text-left px-2.5 py-1.5 text-xs text-ink hover:bg-cobalt-tint whitespace-nowrap">Duplicate page</button>
          {position0 < pageCount - 1 && (
            <button type="button" onClick={() => pick(() => onSplitAfter(position0))} className="w-full text-left px-2.5 py-1.5 text-xs text-ink hover:bg-cobalt-tint whitespace-nowrap">Split after this page</button>
          )}
          <button type="button" onClick={() => pick(() => onRequestDelete(position0))} className="w-full text-left px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 whitespace-nowrap">Delete page</button>
        </div>
      )}
    </div>
  )
}

function PageRow({
  pageNumber, pdfDoc, isActive, isSelected, pageCount, onClick, onToggleSelect,
  onInsertBlank, onDuplicate, onRequestDelete, onMoveUp, onMoveDown, onSplitAfter,
  onDragStart, onDragOver, onDrop, isDragOver,
}) {
  const position0 = pageNumber - 1
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, position0)}
      onDragOver={(e) => onDragOver(e, position0)}
      onDrop={(e) => onDrop(e, position0)}
      className={`mb-2 rounded-s ${isDragOver ? 'ring-2 ring-cobalt' : ''}`}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(position0)}
          aria-label={`Select page ${pageNumber} for extract`}
          className="w-3.5 h-3.5"
        />
        <span className="text-[10px] text-ink-soft flex-1">drag to reorder</span>
        <button type="button" onClick={() => onMoveUp(position0)} disabled={position0 === 0} aria-label="Move page up" className="w-4 h-4 text-[10px] text-ink-soft hover:text-ink disabled:opacity-25 leading-none">↑</button>
        <button type="button" onClick={() => onMoveDown(position0)} disabled={position0 === pageCount - 1} aria-label="Move page down" className="w-4 h-4 text-[10px] text-ink-soft hover:text-ink disabled:opacity-25 leading-none">↓</button>
        <PageActionsMenu
          position0={position0}
          pageCount={pageCount}
          onInsertBlank={onInsertBlank}
          onDuplicate={onDuplicate}
          onRequestDelete={onRequestDelete}
          onSplitAfter={onSplitAfter}
        />
      </div>
      <Thumbnail pageNumber={pageNumber} pdfDoc={pdfDoc} isActive={isActive} onClick={onClick} />
    </div>
  )
}

/** Left sidebar: page thumbnails with navigation, drag-and-drop reorder, and
 * page-management actions (insert/duplicate/delete/move/extract/split). */
export default function PagePanel({
  pdfDoc, pageCount, activePage, onJumpToPage, collapsed, onToggleCollapsed,
  selectedForExtract, onToggleExtractSelect, onExtractSelected,
  onInsertBlank, onDuplicate, onRequestDelete, onMovePage, onSplitAfter,
}) {
  const dragFromRef = useRef(null)
  const [dragOverPos, setDragOverPos] = useState(null)

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

  function handleDragStart(e, position0) {
    dragFromRef.current = position0
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e, position0) {
    e.preventDefault()
    if (dragOverPos !== position0) setDragOverPos(position0)
  }
  function handleDrop(e, position0) {
    e.preventDefault()
    setDragOverPos(null)
    const from = dragFromRef.current
    dragFromRef.current = null
    if (from == null || from === position0) return
    onMovePage(from, position0)
  }

  return (
    <aside className="w-32 shrink-0 bg-card border border-line rounded-m p-2 overflow-y-auto max-h-[75vh]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-ink-soft">Pages</p>
        <button type="button" onClick={onToggleCollapsed} aria-label="Hide page thumbnails" className="text-ink-soft hover:text-ink text-xs">«</button>
      </div>

      {selectedForExtract.size > 0 && (
        <button
          type="button"
          onClick={onExtractSelected}
          className="w-full mb-2 px-2 py-1 rounded-s bg-cobalt text-white text-[11px] font-medium"
        >
          Extract {selectedForExtract.size} page{selectedForExtract.size > 1 ? 's' : ''}
        </button>
      )}

      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
        <PageRow
          key={pageNumber}
          pageNumber={pageNumber}
          pdfDoc={pdfDoc}
          isActive={pageNumber === activePage}
          isSelected={selectedForExtract.has(pageNumber - 1)}
          pageCount={pageCount}
          onClick={() => onJumpToPage(pageNumber)}
          onToggleSelect={onToggleExtractSelect}
          onInsertBlank={onInsertBlank}
          onDuplicate={onDuplicate}
          onRequestDelete={onRequestDelete}
          onMoveUp={(pos) => onMovePage(pos, pos - 1)}
          onMoveDown={(pos) => onMovePage(pos, pos + 1)}
          onSplitAfter={onSplitAfter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragOver={dragOverPos === pageNumber - 1}
        />
      ))}
    </aside>
  )
}
