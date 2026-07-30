import { useEffect, useRef, useState } from 'react'
import { TOOLS } from './constants'

// ── Shape renderers ──────────────────────────────────────────────────────────
// Each takes (ann) and returns the type-specific visual content, sized to
// fill its parent shell (which is already positioned/sized by AnnotationItem).

function RectangleShape({ ann }) {
  return (
    <div
      className="w-full h-full"
      style={{
        border: `${ann.strokeWidth ?? 2}px solid ${ann.stroke ?? '#111827'}`,
        background: ann.fill && ann.fill !== 'transparent' ? ann.fill : 'transparent',
        opacity: ann.opacity ?? 1,
      }}
    />
  )
}

function EllipseShape({ ann }) {
  return (
    <div
      className="w-full h-full rounded-full"
      style={{
        border: `${ann.strokeWidth ?? 2}px solid ${ann.stroke ?? '#111827'}`,
        background: ann.fill && ann.fill !== 'transparent' ? ann.fill : 'transparent',
        opacity: ann.opacity ?? 1,
      }}
    />
  )
}

function HighlightShape({ ann }) {
  return <div className="w-full h-full" style={{ background: ann.color, opacity: ann.opacity ?? 0.4 }} />
}

function UnderlineShape({ ann }) {
  return (
    <div className="w-full h-full flex items-end">
      <div className="w-full" style={{ height: ann.strokeWidth ?? 2, background: ann.color }} />
    </div>
  )
}

function StrikethroughShape({ ann }) {
  return (
    <div className="w-full h-full flex items-center">
      <div className="w-full" style={{ height: ann.strokeWidth ?? 2, background: ann.color }} />
    </div>
  )
}

function WhiteoutShape({ ann }) {
  return <div className="w-full h-full" style={{ background: ann.fill ?? '#ffffff' }} />
}

// Solid, opaque black — deliberately ignores ann.opacity (there isn't one
// in DEFAULT_ANNOTATION_STYLE for TOOLS.REDACT and no control exposes it),
// same reasoning as constants.js: a see-through "redaction" defeats the point.
function RedactShape() {
  return <div className="w-full h-full" style={{ background: '#000000' }} />
}

function StampShape({ ann }) {
  return (
    <div
      className="w-full h-full grid place-items-center rounded-sm font-bold text-sm tracking-wide uppercase select-none"
      style={{ border: `3px solid ${ann.color}`, color: ann.color, transform: 'rotate(-6deg)' }}
    >
      {ann.text}
    </div>
  )
}

function NoteShape({ ann }) {
  return (
    <div
      className="w-full h-full grid place-items-center rounded-sm shadow-sm select-none"
      style={{ background: ann.color }}
      title={ann.text || 'Sticky note'}
    >
      <span aria-hidden>🗒️</span>
    </div>
  )
}

function pathPoints(ann) {
  return (ann.points || []).map((p) => `${p.x},${p.y}`).join(' ')
}

function DrawShape({ ann }) {
  return (
    <svg className="w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
      <polyline
        points={pathPoints(ann)}
        fill="none"
        stroke={ann.color}
        strokeWidth={ann.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ann.opacity ?? 1}
      />
    </svg>
  )
}

// Plain straight line, no arrowhead — the same box-to-line geometry as
// ArrowShape below, just without the head triangle.
function LineShape({ ann }) {
  const w = ann.w || 1
  const h = ann.h || 1
  return (
    <svg className="w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
      <line x1={0} y1={0} x2={w} y2={h} stroke={ann.color} strokeWidth={ann.strokeWidth ?? 2} />
    </svg>
  )
}

function ArrowShape({ ann }) {
  const w = ann.w || 1
  const h = ann.h || 1
  const angle = Math.atan2(h, w)
  const headLen = Math.min(14, Math.hypot(w, h) / 2)
  const tipX = w
  const tipY = h
  const leftX = tipX - headLen * Math.cos(angle - Math.PI / 6)
  const leftY = tipY - headLen * Math.sin(angle - Math.PI / 6)
  const rightX = tipX - headLen * Math.cos(angle + Math.PI / 6)
  const rightY = tipY - headLen * Math.sin(angle + Math.PI / 6)
  return (
    <svg className="w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
      <line x1={0} y1={0} x2={tipX} y2={tipY} stroke={ann.color} strokeWidth={ann.strokeWidth ?? 2} />
      <polygon
        points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={ann.color}
      />
    </svg>
  )
}

// Crop rect (`rect`) lives in the same display-space units as ann.w/ann.h
// (the box drawn on screen), initialized to the image's full bounds. Apply
// converts it to the source image's natural pixel space (index.jsx's
// handleApplyCrop) since that's what canvas drawImage/pdfUtils.cropImageToBytes
// need — this component only ever deals in display space.
function CropOverlay({ ann, src, onApplyCrop, onCancelCrop }) {
  const [rect, setRect] = useState({ x: 0, y: 0, w: ann.w, h: ann.h })

  // Re-initialize to the full image bounds only when a *different* image
  // annotation enters cropping mode — not on every ann.w/h change, since
  // Apply itself changes w/h and shouldn't immediately reopen a
  // full-bounds box on top of the just-cropped result.
  useEffect(() => {
    setRect({ x: 0, y: 0, w: ann.w, h: ann.h })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ann.id])

  const MIN_CROP = 20
  const CURSORS = { tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize' }

  function startHandleDrag(corner) {
    return (e) => {
      e.stopPropagation()
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const startRect = rect
      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        let { x, y, w, h } = startRect
        if (corner.includes('l')) { x = startRect.x + dx; w = startRect.w - dx }
        if (corner.includes('r')) { w = startRect.w + dx }
        if (corner.includes('t')) { y = startRect.y + dy; h = startRect.h - dy }
        if (corner.includes('b')) { h = startRect.h + dy }
        x = Math.max(0, Math.min(x, ann.w - MIN_CROP))
        y = Math.max(0, Math.min(y, ann.h - MIN_CROP))
        w = Math.max(MIN_CROP, Math.min(w, ann.w - x))
        h = Math.max(MIN_CROP, Math.min(h, ann.h - y))
        setRect({ x, y, w, h })
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
  }

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ pointerEvents: 'auto', cursor: 'default' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <img src={src} alt="" draggable={false} className="w-full h-full object-fill select-none" style={{ pointerEvents: 'none' }} />
        <div
          className="absolute border-2 border-cobalt"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
        >
          {Object.keys(CURSORS).map((corner) => (
            <div
              key={corner}
              onPointerDown={startHandleDrag(corner)}
              className="absolute w-3 h-3 bg-cobalt rounded-full"
              style={{
                cursor: CURSORS[corner],
                top: corner.includes('t') ? -6 : undefined,
                bottom: corner.includes('b') ? -6 : undefined,
                left: corner.includes('l') ? -6 : undefined,
                right: corner.includes('r') ? -6 : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div
        className="absolute -bottom-9 left-0 flex gap-2"
        style={{ pointerEvents: 'auto' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={() => onApplyCrop(ann, rect)} className="px-2.5 py-1 rounded-s bg-cobalt text-white text-xs font-medium">
          Apply crop
        </button>
        <button type="button" onClick={onCancelCrop} className="px-2.5 py-1 rounded-s bg-white border border-line text-xs">
          Cancel
        </button>
      </div>
    </>
  )
}

function ImageShape({ ann, isCropping, onApplyCrop, onCancelCrop }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!ann.imageBytes) return
    const url = URL.createObjectURL(new Blob([ann.imageBytes], { type: ann.mimeType || 'image/png' }))
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [ann.imageBytes, ann.mimeType])

  if (isCropping) {
    return <CropOverlay ann={ann} src={src} onApplyCrop={onApplyCrop} onCancelCrop={onCancelCrop} />
  }

  // object-fill (not object-contain): ann.w/ann.h always matches the image's
  // own aspect ratio (set at placement/crop time, and there's no resize
  // handle to throw it off — see docs/backlog.md), so a plain stretch-to-box
  // renders identically to pdf-lib's drawImage at download time, which has
  // no aspect-preserving mode of its own.
  return <img src={src} alt="" draggable={false} className="w-full h-full object-fill pointer-events-none select-none" />
}

function LinkShape({ ann }) {
  const label = ann.url || (ann.targetPage ? `Jumps to page ${ann.targetPage}` : 'Link — set a URL or page in the panel')
  return (
    <div
      className="w-full h-full flex items-center justify-center rounded-sm border-2 border-dashed"
      style={{ borderColor: '#3b82f6', background: 'rgba(59,130,246,0.08)' }}
      title={label}
    >
      <span aria-hidden className="text-xs">🔗</span>
    </div>
  )
}

// Speech-bubble text box with a leader line to a separately draggable
// anchor point — special-cased in AnnotationItem (like TextShape) rather
// than living in the generic SHAPES map, since it needs onUpdate/
// isSelected/justCreated. The leader line always starts at the box's own
// top-left corner (0,0 in this shell's local coordinate space); dragging
// the small circle handle updates anchorDx/anchorDy (an offset from that
// same corner, matching constants.js's DEFAULT_ANNOTATION_STYLE comment).
function CalloutShape({ ann, isSelected, justCreated, onUpdate }) {
  const ref = useRef(null)

  useEffect(() => {
    if (justCreated && ref.current) ref.current.focus()
  }, [justCreated])

  const anchorX = ann.anchorDx ?? -40
  const anchorY = ann.anchorDy ?? 40

  function startAnchorDrag(e) {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startDx = anchorX
    const startDy = anchorY
    function onMove(moveEvent) {
      onUpdate(ann.id, {
        anchorDx: startDx + (moveEvent.clientX - startX),
        anchorDy: startDy + (moveEvent.clientY - startY),
      })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1, pointerEvents: 'none' }}>
        <line x1={0} y1={0} x2={anchorX} y2={anchorY} stroke={ann.color ?? '#111827'} strokeWidth={2} />
      </svg>
      <div
        onPointerDown={startAnchorDrag}
        title="Drag to point the callout"
        className="absolute w-3 h-3 rounded-full bg-white border-2 cursor-move"
        style={{ left: anchorX - 6, top: anchorY - 6, borderColor: ann.color ?? '#111827', pointerEvents: 'auto' }}
      />
      <textarea
        ref={ref}
        value={ann.text ?? ''}
        placeholder="Callout text…"
        onChange={(e) => onUpdate(ann.id, { text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full h-full outline-none resize-none rounded-s px-2 py-1 text-sm"
        style={{
          color: ann.color ?? '#111827',
          background: ann.fill ?? '#fef9c3',
          border: `1.5px solid ${isSelected ? '#3b82f6' : (ann.color ?? '#111827')}`,
          fontSize: ann.fontSize ?? 12,
          pointerEvents: 'auto',
        }}
      />
    </>
  )
}

function TextShape({ ann, isSelected, justCreated, onUpdate }) {
  const ref = useRef(null)

  useEffect(() => {
    if (justCreated && ref.current) ref.current.focus()
  }, [justCreated])

  return (
    <textarea
      ref={ref}
      value={ann.text ?? ''}
      placeholder="Type here…"
      onChange={(e) => onUpdate(ann.id, { text: e.target.value })}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full h-full bg-transparent outline-none resize-none"
      style={{
        color: ann.color,
        fontSize: ann.fontSize,
        fontFamily: ann.fontFamily,
        fontWeight: ann.bold ? 700 : 400,
        fontStyle: ann.italic ? 'italic' : 'normal',
        border: isSelected ? '1px dashed #3b82f6' : '1px solid transparent',
        pointerEvents: 'auto',
      }}
    />
  )
}

const SHAPES = {
  [TOOLS.RECTANGLE]: RectangleShape,
  [TOOLS.ELLIPSE]: EllipseShape,
  [TOOLS.HIGHLIGHT]: HighlightShape,
  [TOOLS.UNDERLINE]: UnderlineShape,
  [TOOLS.STRIKETHROUGH]: StrikethroughShape,
  [TOOLS.WHITEOUT]: WhiteoutShape,
  [TOOLS.REDACT]: RedactShape,
  [TOOLS.LINK]: LinkShape,
  [TOOLS.STAMP]: StampShape,
  [TOOLS.NOTE]: NoteShape,
  [TOOLS.DRAW]: DrawShape,
  [TOOLS.SIGNATURE]: DrawShape,
  [TOOLS.ARROW]: ArrowShape,
  [TOOLS.LINE]: LineShape,
}

// Text (and Callout, same reasoning) own their pointer-down (so a click
// focuses the cursor instead of starting a move-drag) — dragging a text/
// callout box is deferred to a later phase (a dedicated handle, once
// PropertiesPanel/Toolbar land). Every other shape is move-draggable by its
// body when the Select tool is active.
const BODY_UNDRAGGABLE = new Set([TOOLS.TEXT, TOOLS.CALLOUT])

function AnnotationItem({ ann, isSelected, activeTool, justCreated, isCropping, onSelect, onUpdate, onApplyCrop, onCancelCrop }) {
  const dragState = useRef(null)

  const handlePointerDown = (e) => {
    onSelect(ann.id)
    if (activeTool !== TOOLS.SELECT || BODY_UNDRAGGABLE.has(ann.type)) return
    e.stopPropagation()
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: ann.x, originY: ann.y }

    const handleMove = (moveEvent) => {
      const { startX, startY, originX, originY } = dragState.current
      onUpdate(ann.id, {
        x: originX + (moveEvent.clientX - startX),
        y: originY + (moveEvent.clientY - startY),
      })
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      dragState.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const Shape = SHAPES[ann.type]

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute"
      style={{
        left: ann.x,
        top: ann.y,
        width: ann.w,
        height: ann.h,
        pointerEvents: 'auto',
        cursor: activeTool === TOOLS.SELECT && !BODY_UNDRAGGABLE.has(ann.type) ? 'move' : 'auto',
        outline: isSelected && !BODY_UNDRAGGABLE.has(ann.type) ? '2px solid #3b82f6' : 'none',
        outlineOffset: 2,
      }}
    >
      {ann.type === TOOLS.TEXT ? (
        <TextShape ann={ann} isSelected={isSelected} justCreated={justCreated} onUpdate={onUpdate} />
      ) : ann.type === TOOLS.CALLOUT ? (
        <CalloutShape ann={ann} isSelected={isSelected} justCreated={justCreated} onUpdate={onUpdate} />
      ) : ann.type === TOOLS.IMAGE ? (
        <ImageShape ann={ann} isCropping={isCropping} onApplyCrop={onApplyCrop} onCancelCrop={onCancelCrop} />
      ) : Shape ? (
        <Shape ann={ann} />
      ) : null}
    </div>
  )
}

function LiveDraftPreview({ draft }) {
  if (!draft) return null
  if (draft.points) {
    return (
      <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
        <polyline
          points={draft.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <div
      className="absolute border-2 border-dashed border-cobalt"
      style={{ left: draft.x, top: draft.y, width: draft.w, height: draft.h, pointerEvents: 'none' }}
    />
  )
}

/**
 * Pure render of one page's annotation state. Never mutates `annotations`
 * directly — `onSelect`/`onUpdate` are the only way state changes, so every
 * change flows back through useAnnotations.js and stays undoable.
 */
export default function AnnotationLayer({
  width,
  height,
  annotations,
  liveDraft,
  selectedId,
  activeTool,
  justCreatedId,
  croppingId,
  onSelect,
  onUpdate,
  onApplyCrop,
  onCancelCrop,
}) {
  return (
    <div className="absolute inset-0" style={{ width, height, pointerEvents: 'none' }}>
      {annotations.map((ann) => (
        <AnnotationItem
          key={ann.id}
          ann={ann}
          isSelected={ann.id === selectedId}
          activeTool={activeTool}
          justCreated={ann.id === justCreatedId}
          isCropping={ann.id === croppingId}
          onSelect={onSelect}
          onUpdate={onUpdate}
          onApplyCrop={onApplyCrop}
          onCancelCrop={onCancelCrop}
        />
      ))}
      <LiveDraftPreview draft={liveDraft} />
    </div>
  )
}
