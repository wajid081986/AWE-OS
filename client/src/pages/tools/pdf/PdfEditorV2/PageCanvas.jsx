import { useEffect, useRef, useState } from 'react'
import AnnotationLayer from './AnnotationLayer'
import { TOOLS, BOX_DRAG_TOOLS, FREEHAND_TOOLS, CLICK_TOOLS, DEFAULT_ANNOTATION_STYLE } from './constants'

const MIN_BOX_SIZE = 6

/**
 * One PDF.js-rendered page plus its annotation overlay. Owns pointer
 * handling for *creating* new annotations (drag-a-box, click-to-place,
 * freehand path); moving/editing existing ones is AnnotationLayer's job.
 */
export default function PageCanvas({ pageNumber, scale, pdfDoc, annotationsApi, activeTool, onAnnotationCreated }) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const dragRef = useRef(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [liveDraft, setLiveDraft] = useState(null)
  const [justCreatedId, setJustCreatedId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const viewport = await pdfDoc.renderPageToCanvas(pageNumber, canvasRef.current, scale)
      if (!cancelled && viewport) setDims({ width: viewport.width, height: viewport.height })
    }
    if (pdfDoc.isReady) render()
    return () => { cancelled = true }
  }, [pdfDoc, pageNumber, scale])

  function pointFromEvent(e) {
    const rect = wrapperRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerMove(e) {
    const state = dragRef.current
    if (!state) return
    const { x, y } = pointFromEvent(e)

    if (state.kind === 'box') {
      setLiveDraft({
        type: state.tool,
        x: Math.min(state.startX, x),
        y: Math.min(state.startY, y),
        w: Math.abs(x - state.startX),
        h: Math.abs(y - state.startY),
      })
    } else if (state.kind === 'freehand') {
      state.points.push({ x: x - state.originX, y: y - state.originY })
      setLiveDraft({ type: state.tool, points: state.points.map((p) => ({ x: p.x + state.originX, y: p.y + state.originY })) })
    }
  }

  function handlePointerUp() {
    const state = dragRef.current
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    dragRef.current = null

    if (!state) return

    if (state.kind === 'box') {
      setLiveDraft((draft) => {
        const tooSmall = draft && draft.w < MIN_BOX_SIZE && draft.h < MIN_BOX_SIZE
        // A plain click (no drag) with the Text tool still places a
        // default-sized box — every other box tool discards a too-small drag
        // as an accidental click.
        if (draft && (!tooSmall || state.tool === TOOLS.TEXT)) {
          const id = annotationsApi.addAnnotation({
            type: state.tool,
            page: pageNumber,
            x: draft.x,
            y: draft.y,
            w: tooSmall ? 160 : draft.w,
            h: tooSmall ? 32 : draft.h,
            ...DEFAULT_ANNOTATION_STYLE[state.tool],
          })
          if (state.tool === TOOLS.TEXT) {
            setJustCreatedId(id)
            onAnnotationCreated?.(id)
          }
        }
        return null
      })
    } else if (state.kind === 'freehand' && state.points.length > 1) {
      const xs = state.points.map((p) => p.x + state.originX)
      const ys = state.points.map((p) => p.y + state.originY)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)
      annotationsApi.addAnnotation({
        type: state.tool,
        page: pageNumber,
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        points: state.points.map((p) => ({ x: p.x + state.originX - minX, y: p.y + state.originY - minY })),
        ...DEFAULT_ANNOTATION_STYLE[state.tool],
      })
      setLiveDraft(null)
    } else {
      setLiveDraft(null)
    }
  }

  function handlePointerDown(e) {
    if (activeTool === TOOLS.SELECT) {
      annotationsApi.clearSelection()
      return
    }
    const { x, y } = pointFromEvent(e)

    if (CLICK_TOOLS.has(activeTool)) {
      const id = annotationsApi.addAnnotation({
        type: activeTool,
        page: pageNumber,
        x,
        y,
        w: activeTool === TOOLS.STAMP ? 140 : 32,
        h: activeTool === TOOLS.STAMP ? 44 : 32,
        ...DEFAULT_ANNOTATION_STYLE[activeTool],
      })
      annotationsApi.selectAnnotation(id)
      return
    }

    if (BOX_DRAG_TOOLS.has(activeTool)) {
      dragRef.current = { kind: 'box', tool: activeTool, startX: x, startY: y }
      setLiveDraft({ type: activeTool, x, y, w: 0, h: 0 })
    } else if (FREEHAND_TOOLS.has(activeTool)) {
      dragRef.current = { kind: 'freehand', tool: activeTool, points: [{ x: 0, y: 0 }], originX: x, originY: y }
      setLiveDraft({ type: activeTool, points: [{ x, y }] })
    } else {
      return
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block bg-white shadow-sm"
      style={{ cursor: activeTool === TOOLS.SELECT ? 'default' : 'crosshair' }}
      onPointerDown={handlePointerDown}
    >
      <canvas ref={canvasRef} className="block" />
      <AnnotationLayer
        width={dims.width}
        height={dims.height}
        annotations={annotationsApi.getPageAnnotations(pageNumber)}
        liveDraft={liveDraft}
        selectedId={annotationsApi.selectedId}
        activeTool={activeTool}
        justCreatedId={justCreatedId}
        onSelect={annotationsApi.selectAnnotation}
        onUpdate={annotationsApi.updateAnnotation}
      />
    </div>
  )
}
