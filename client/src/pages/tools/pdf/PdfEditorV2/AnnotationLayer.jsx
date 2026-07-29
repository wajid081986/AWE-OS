import { useEffect, useRef } from 'react'
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
  [TOOLS.STAMP]: StampShape,
  [TOOLS.NOTE]: NoteShape,
  [TOOLS.DRAW]: DrawShape,
  [TOOLS.SIGNATURE]: DrawShape,
  [TOOLS.ARROW]: ArrowShape,
}

// Text boxes own their pointer-down (so a click focuses the cursor instead of
// starting a move-drag) — dragging a text box is deferred to a later phase
// (a dedicated handle, once PropertiesPanel/Toolbar land). Every other shape
// is move-draggable by its body when the Select tool is active.
function AnnotationItem({ ann, isSelected, activeTool, justCreated, onSelect, onUpdate }) {
  const dragState = useRef(null)

  const handlePointerDown = (e) => {
    onSelect(ann.id)
    if (activeTool !== TOOLS.SELECT || ann.type === TOOLS.TEXT) return
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
        cursor: activeTool === TOOLS.SELECT && ann.type !== TOOLS.TEXT ? 'move' : 'auto',
        outline: isSelected && ann.type !== TOOLS.TEXT ? '2px solid #3b82f6' : 'none',
        outlineOffset: 2,
      }}
    >
      {ann.type === TOOLS.TEXT ? (
        <TextShape ann={ann} isSelected={isSelected} justCreated={justCreated} onUpdate={onUpdate} />
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
  onSelect,
  onUpdate,
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
          onSelect={onSelect}
          onUpdate={onUpdate}
        />
      ))}
      <LiveDraftPreview draft={liveDraft} />
    </div>
  )
}
