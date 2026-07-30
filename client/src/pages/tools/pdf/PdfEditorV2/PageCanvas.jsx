import { useEffect, useRef, useState } from 'react'
import AnnotationLayer from './AnnotationLayer'
import FormFieldLayer from './FormFieldLayer'
import { TOOLS, BOX_DRAG_TOOLS, FREEHAND_TOOLS, CLICK_TOOLS, DEFAULT_ANNOTATION_STYLE, RENDER_SCALE } from './constants'

const MIN_BOX_SIZE = 6

/**
 * One PDF.js-rendered page plus its annotation overlay. Owns pointer
 * handling for *creating* new annotations (drag-a-box, click-to-place,
 * freehand path); moving/editing existing ones is AnnotationLayer's job.
 */
export default function PageCanvas({ pageNumber, zoom, pdfDoc, annotationsApi, formFieldsApi, activeTool, pendingImage, croppingId, onApplyCrop, onCancelCrop, onAnnotationCreated }) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const dragRef = useRef(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [liveDraft, setLiveDraft] = useState(null)
  const [justCreatedId, setJustCreatedId] = useState(null)
  // Existing PDF text boxes for this page, for the Text tool's "click
  // existing text to cover-and-edit" path. A ref, not state — handlePointerDown
  // needs to read it synchronously; see the same reasoning as dragRef below.
  const textItemsRef = useRef([])

  // Depend on the specific stable values PageCanvas needs, not the whole
  // `pdfDoc` object — usePdfDoc() returns a fresh object every render, so
  // depending on `pdfDoc` itself re-fired this effect (and re-rendered the
  // canvas) on every unrelated state change in the app (every tool switch,
  // every keystroke), continuously racing the render-cancel guard above.
  // `renderPageToCanvas`/`isReady` are themselves stable (memoized on
  // `doc`), so destructuring them out of the dependency array fixes it.
  const { renderPageToCanvas, getTextItems, isReady } = pdfDoc

  useEffect(() => {
    let cancelled = false
    async function render() {
      const viewport = await renderPageToCanvas(pageNumber, canvasRef.current, RENDER_SCALE)
      if (!cancelled && viewport) setDims({ width: viewport.width, height: viewport.height })
      const items = await getTextItems(pageNumber)
      if (!cancelled) textItemsRef.current = items
    }
    if (isReady) render()
    return () => { cancelled = true }
  }, [renderPageToCanvas, getTextItems, isReady, pageNumber])

  // Outer wrapper is sized to the zoomed visual box; the inner layer (canvas +
  // annotations) stays at native `dims` and is scaled via CSS transform, so
  // dividing by zoom here maps a screen click back to RENDER_SCALE-space.
  function pointFromEvent(e) {
    const rect = wrapperRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }

  function handlePointerMove(e) {
    const state = dragRef.current
    if (!state) return
    const { x, y } = pointFromEvent(e)

    if (state.kind === 'box') {
      const box = {
        type: state.tool,
        x: Math.min(state.startX, x),
        y: Math.min(state.startY, y),
        w: Math.abs(x - state.startX),
        h: Math.abs(y - state.startY),
      }
      // Mutating the same object handlePointerDown put on dragRef.current —
      // a plain ref write, always synchronously current, unlike `liveDraft`
      // React state (see handlePointerUp below for why that distinction
      // matters here).
      state.current = box
      setLiveDraft(box) // still drives the dashed live-preview render
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
    setLiveDraft(null)

    if (!state) return

    if (state.kind === 'box') {
      // handlePointerUp is attached to `window` once at pointerdown time and
      // keeps running for the whole drag, so by mouseup its own closure over
      // `liveDraft` React state is stale (frozen at the render before the
      // drag started). Reading `state.current` instead — mutated in place on
      // dragRef.current by handlePointerMove above — is always synchronously
      // fresh, since ref writes aren't subject to React's render/state
      // scheduling at all. (An earlier version read this via setLiveDraft's
      // functional-update form instead; that also needs React to have
      // actually processed the update by the time it's read back, which
      // isn't guaranteed on the very next line, and nesting the
      // annotationsApi.addAnnotation call — a *different* component's
      // setState, since useAnnotations() is owned by index.jsx — inside that
      // updater triggered React's render-phase-update warning besides.)
      const draft = state.current
      const tooSmall = draft && draft.w < MIN_BOX_SIZE && draft.h < MIN_BOX_SIZE
      // A plain click (no drag, so handlePointerMove never ran and `draft`
      // is the zero-size box handlePointerDown seeded) with the Text tool
      // still places a default-sized box — every other box tool discards a
      // too-small drag as an accidental click.
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
    }
  }

  function handlePointerDown(e) {
    if (activeTool === TOOLS.SELECT) {
      annotationsApi.clearSelection()
      return
    }
    const { x, y } = pointFromEvent(e)

    if (activeTool === TOOLS.IMAGE && pendingImage) {
      const id = annotationsApi.addAnnotation({
        type: TOOLS.IMAGE,
        page: pageNumber,
        x, y,
        w: pendingImage.w,
        h: pendingImage.h,
        imageBytes: pendingImage.bytes,
        mimeType: pendingImage.mimeType,
        naturalWidth: pendingImage.naturalWidth,
        naturalHeight: pendingImage.naturalHeight,
        ...DEFAULT_ANNOTATION_STYLE[TOOLS.IMAGE],
      })
      annotationsApi.selectAnnotation(id)
      onAnnotationCreated?.(id)
      return
    }

    // Text tool on top of existing PDF text: cover it with a whiteout and
    // drop a pre-filled, editable text annotation at the same position —
    // this is NOT true content-stream text editing (pdf-lib has no API for
    // that; see docs/batches/batch-35-inline-text-plan.md), it's cover +
    // replace using the same mechanism Whiteout already uses, automated and
    // pre-filled so it looks and feels like inline editing. Clicking empty
    // space falls through to the normal blank-box placement below.
    if (activeTool === TOOLS.TEXT) {
      const hit = textItemsRef.current.find(
        (it) => x >= it.x && x <= it.x + it.width && y >= it.y && y <= it.y + it.height,
      )
      if (hit) {
        // Same fix v1 needed for its focus bug (see project memory): without
        // this, the browser's own default mousedown/click focus handling
        // fires after React's effect-driven .focus() below and silently
        // steals it back to <body>. The blank-box path avoids this by
        // deferring focus to pointerup (after the click's default behavior
        // already settled) — this path focuses immediately on pointerdown,
        // so it needs the preventDefault() explicitly instead.
        e.preventDefault()
        const ids = annotationsApi.addAnnotations([
          {
            type: TOOLS.WHITEOUT, page: pageNumber,
            x: hit.x, y: hit.y, w: hit.width, h: hit.height,
            ...DEFAULT_ANNOTATION_STYLE[TOOLS.WHITEOUT],
          },
          {
            type: TOOLS.TEXT, page: pageNumber,
            x: hit.x, y: hit.y, w: Math.max(hit.width, 60), h: Math.max(hit.height + 6, 22),
            text: hit.str,
            ...DEFAULT_ANNOTATION_STYLE[TOOLS.TEXT],
            fontSize: Math.max(8, Math.round(hit.height)),
          },
        ])
        const textId = ids[ids.length - 1]
        setJustCreatedId(textId)
        onAnnotationCreated?.(textId)
        return
      }
    }

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
      const initialBox = { type: activeTool, x, y, w: 0, h: 0 }
      dragRef.current = { kind: 'box', tool: activeTool, startX: x, startY: y, current: initialBox }
      setLiveDraft(initialBox)
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
      className="relative inline-block bg-white shadow-sm overflow-hidden"
      style={{
        width: dims.width * zoom,
        height: dims.height * zoom,
        cursor: activeTool === TOOLS.SELECT ? 'default' : 'crosshair',
      }}
      onPointerDown={handlePointerDown}
    >
      <div style={{ width: dims.width, height: dims.height, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <canvas ref={canvasRef} className="block" />
        <AnnotationLayer
          width={dims.width}
          height={dims.height}
          annotations={annotationsApi.getPageAnnotations(pageNumber)}
          liveDraft={liveDraft}
          selectedId={annotationsApi.selectedId}
          activeTool={activeTool}
          justCreatedId={justCreatedId}
          croppingId={croppingId}
          onSelect={annotationsApi.selectAnnotation}
          onUpdate={annotationsApi.updateAnnotation}
          onApplyCrop={onApplyCrop}
          onCancelCrop={onCancelCrop}
        />
        {formFieldsApi && (
          <FormFieldLayer
            fields={formFieldsApi.getPageFields(pageNumber)}
            values={formFieldsApi.values}
            onChange={formFieldsApi.setValue}
          />
        )}
      </div>
    </div>
  )
}
