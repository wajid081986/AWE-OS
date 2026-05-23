import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import { downloadFile } from './pdfUtils'
import { TOOL_ABOUT } from '../../../data/toolPageContent'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function hex2rgb(hex) {
  const h = (hex || '#000000').replace('#', '').padEnd(6, '0')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PALETTE = [
  '#111827', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#1e3a8a', '#065f46', '#fef08a', '#ffffff',
]
const FONT_SIZES   = [8, 10, 12, 14, 16, 18, 24, 32, 48]
const STROKE_WIDTHS = [1, 2, 4, 6]
const ZOOM_LEVELS  = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const HL_COLORS    = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa', '#f5d0fe', '#ccfbf1']
const HL_OPACITIES = [0.25, 0.5, 0.75, 1.0]

const TOOL_GROUPS = [
  { label: 'Annotate', tools: [
    { id: 'text',      icon: 'T',   label: 'Text',      key: 'T' },
    { id: 'highlight', icon: 'H',   label: 'Highlight', key: 'H' },
    { id: 'note',      icon: '📝',  label: 'Note',      key: 'N' },
  ]},
  { label: 'Draw', tools: [
    { id: 'draw',  icon: '✏️', label: 'Draw',  key: 'D' },
    { id: 'arrow', icon: '↗',  label: 'Arrow', key: 'A' },
    { id: 'line',  icon: '—',  label: 'Line',  key: '' },
  ]},
  { label: 'Shapes', tools: [
    { id: 'rect',   icon: '▭', label: 'Rect',   key: 'R' },
    { id: 'circle', icon: '◯', label: 'Circle', key: '' },
  ]},
  { label: 'Insert', tools: [
    { id: 'image',     icon: '🖼️', label: 'Image', key: '' },
    { id: 'signature', icon: '✍️', label: 'Sign',  key: '' },
  ]},
]

const CURSORS = {
  text: 'text', draw: 'crosshair', highlight: 'crosshair',
  rect: 'crosshair', circle: 'crosshair', arrow: 'crosshair',
  line: 'crosshair', note: 'copy', image: 'copy', signature: 'copy',
}

// ── Signature Modal ───────────────────────────────────────────────────────────

function SignatureModal({ onInsert, onClose }) {
  const [tab, setTab] = useState('draw')
  const [typed, setTyped] = useState('')
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPt = useRef(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [tab])

  const pt = (e, c) => {
    const r = c.getBoundingClientRect()
    const src = e.touches?.[0] || e
    return { x: (src.clientX - r.left) * (c.width / r.width), y: (src.clientY - r.top) * (c.height / r.height) }
  }
  const onDown = (e) => { e.preventDefault(); drawing.current = true; lastPt.current = pt(e, canvasRef.current) }
  const onMove = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    const p = pt(e, c)
    ctx.beginPath(); ctx.moveTo(lastPt.current.x, lastPt.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    lastPt.current = p
  }
  const onUp = () => { drawing.current = false }
  const clear = () => {
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
  }

  const insert = () => {
    if (tab === 'draw') {
      onInsert(canvasRef.current.toDataURL('image/png'))
    } else {
      if (!typed.trim()) return
      const c = document.createElement('canvas')
      c.width = 400; c.height = 100
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 100)
      ctx.fillStyle = '#1e3a8a'; ctx.font = 'italic 52px Georgia,serif'
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
      ctx.fillText(typed, 200, 50)
      onInsert(c.toDataURL('image/png'))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Add Signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="flex border-b">
          {['draw', 'type'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'draw' ? '✍️ Draw' : '⌨️ Type'}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'draw' ? (
            <>
              <p className="text-xs text-gray-500 mb-2">Draw your signature below</p>
              <canvas ref={canvasRef} width={440} height={130}
                className="border-2 border-dashed border-gray-300 rounded-lg w-full touch-none cursor-crosshair"
                onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} />
              <button onClick={clear} className="mt-2 text-xs text-red-500 hover:underline">Clear</button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-2">Type your name</p>
              <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Your name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: 28 }} />
            </>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={insert} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Insert</button>
        </div>
      </div>
    </div>
  )
}

// ── Selection Handles ─────────────────────────────────────────────────────────

function ResizeHandles({ onResize, onDelete }) {
  return (
    <>
      <div className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none" style={{ zIndex: 1 }} />
      {['nw', 'ne', 'sw', 'se'].map(h => (
        <div key={h}
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm"
          style={{
            zIndex: 2,
            top:    h.startsWith('n') ? -5  : undefined,
            bottom: h.startsWith('s') ? -5  : undefined,
            left:   h.endsWith('w')   ? -5  : undefined,
            right:  h.endsWith('e')   ? -5  : undefined,
            cursor: `${h}-resize`,
          }}
          onMouseDown={e => { e.stopPropagation(); onResize(e, h) }}
        />
      ))}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        onMouseDown={e => e.stopPropagation()}
        className="absolute flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px]"
        style={{ top: -10, right: -10, zIndex: 3 }}
        title="Delete">✕</button>
    </>
  )
}

// ── Annotation Element ────────────────────────────────────────────────────────

function AnnotationEl({ ann, zoom, pageW, pageH, selected, onSelect, onDragStart, onResizeStart, onDelete, onChange }) {
  const L = ann.x * pageW * zoom
  const T = ann.y * pageH * zoom
  const W = Math.max(4, ann.w * pageW * zoom)
  const H = Math.max(4, ann.h * pageH * zoom)
  const base = { position: 'absolute', left: L, top: T, width: W, height: H, zIndex: selected ? 15 : 5, cursor: 'move', boxSizing: 'border-box' }
  const onDown = e => { e.stopPropagation(); onSelect(); onDragStart(e) }

  if (ann.type === 'highlight') return (
    <div style={{ ...base, background: ann.color || '#fef08a', opacity: ann.opacity ?? 0.5 }} onMouseDown={onDown}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  if (ann.type === 'rect') return (
    <div style={{ ...base, border: `${ann.strokeWidth || 2}px solid ${ann.strokeColor || '#1e3a8a'}`, background: ann.fillColor || 'transparent' }} onMouseDown={onDown}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  if (ann.type === 'circle') return (
    <div style={{ ...base, border: `${ann.strokeWidth || 2}px solid ${ann.strokeColor || '#1e3a8a'}`, background: ann.fillColor || 'transparent', borderRadius: '50%' }} onMouseDown={onDown}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  if (ann.type === 'line' || ann.type === 'arrow') {
    const dx = (ann.x2f - ann.x) * pageW * zoom
    const dy = (ann.y2f - ann.y) * pageH * zoom
    const ox = dx < 0 ? -dx : 0
    const oy = dy < 0 ? -dy : 0
    const angle = Math.atan2(dy, dx)
    const ah = 12
    return (
      <div style={{ position: 'absolute', left: L, top: T, zIndex: selected ? 15 : 5, overflow: 'visible', pointerEvents: 'none' }}>
        <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'all', cursor: 'move' }} onMouseDown={onDown}>
          <line x1={ox} y1={oy} x2={ox + dx} y2={oy + dy} stroke={ann.strokeColor || '#1e3a8a'} strokeWidth={ann.strokeWidth || 2} />
          {ann.type === 'arrow' && <>
            <line x1={ox + dx} y1={oy + dy} x2={ox + dx + Math.cos(angle + 2.4) * ah} y2={oy + dy + Math.sin(angle + 2.4) * ah} stroke={ann.strokeColor || '#1e3a8a'} strokeWidth={ann.strokeWidth || 2} />
            <line x1={ox + dx} y1={oy + dy} x2={ox + dx + Math.cos(angle - 2.4) * ah} y2={oy + dy + Math.sin(angle - 2.4) * ah} stroke={ann.strokeColor || '#1e3a8a'} strokeWidth={ann.strokeWidth || 2} />
          </>}
        </svg>
        {selected && <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px]"
          style={{ top: -10, right: -10, zIndex: 3 }}>✕</button>}
      </div>
    )
  }

  if (ann.type === 'draw' || ann.type === 'image' || ann.type === 'signature') return (
    <div style={{ ...base }} onMouseDown={onDown}>
      {ann.imageUrl && <img src={ann.imageUrl} alt="" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />}
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  if (ann.type === 'text') return (
    <div style={{ ...base, minWidth: 60, minHeight: 18 }} onMouseDown={onDown}>
      <textarea
        defaultValue={ann.text}
        key={ann.id}
        onChange={e => onChange({ text: e.target.value })}
        onMouseDown={e => e.stopPropagation()}
        placeholder="Type here…"
        style={{
          width: '100%', height: '100%',
          fontSize: `${(ann.fontSize || 14) * zoom * 0.85}px`,
          color: ann.fontColor || '#111827',
          fontWeight: ann.bold ? 'bold' : 'normal',
          fontStyle: ann.italic ? 'italic' : 'normal',
          background: 'rgba(255,255,255,0.85)',
          border: selected ? '2px solid #3b82f6' : '1px dashed #93c5fd',
          borderRadius: 3, resize: 'none', padding: '2px 4px', cursor: 'text', outline: 'none', overflow: 'hidden',
        }}
      />
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  if (ann.type === 'note') return (
    <div style={{ ...base, background: ann.fillColor || '#fef9c3', border: '1px solid #d97706', borderRadius: 3, boxShadow: '2px 2px 6px rgba(0,0,0,0.18)' }} onMouseDown={onDown}>
      <div style={{ height: `${14 * zoom}px`, background: 'rgba(234,179,8,0.35)', borderRadius: '2px 2px 0 0', display: 'flex', alignItems: 'center', padding: '0 4px', userSelect: 'none' }}>
        <span style={{ fontSize: `${9 * zoom}px` }}>📝</span>
      </div>
      <textarea
        defaultValue={ann.text} key={ann.id}
        onChange={e => onChange({ text: e.target.value })}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%', height: `calc(100% - ${14 * zoom}px)`,
          fontSize: `${(ann.fontSize || 11) * zoom * 0.85}px`,
          color: ann.fontColor || '#78350f', background: 'transparent',
          border: 'none', resize: 'none', padding: '2px 4px', cursor: 'text', outline: 'none',
        }}
      />
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  return null
}

// ── Draw Preview (rubber-band) ────────────────────────────────────────────────

function DrawPreview({ tool, start, end, pageW, pageH, zoom, strokeColor, fillColor, strokeWidth, highlightColor, opacity }) {
  if (!start || !end) return null
  const x = Math.min(start.xf, end.xf) * pageW * zoom
  const y = Math.min(start.yf, end.yf) * pageH * zoom
  const w = Math.abs(end.xf - start.xf) * pageW * zoom
  const h = Math.abs(end.yf - start.yf) * pageH * zoom
  const base = { position: 'absolute', left: x, top: y, width: w, height: h, zIndex: 18, pointerEvents: 'none' }

  if (tool === 'highlight') return <div style={{ ...base, background: highlightColor, opacity }} />
  if (tool === 'rect')      return <div style={{ ...base, border: `${strokeWidth}px solid ${strokeColor}`, background: fillColor }} />
  if (tool === 'circle')    return <div style={{ ...base, border: `${strokeWidth}px solid ${strokeColor}`, background: fillColor, borderRadius: '50%' }} />

  if (tool === 'line' || tool === 'arrow') {
    const dx = (end.xf - start.xf) * pageW * zoom
    const dy = (end.yf - start.yf) * pageH * zoom
    const ox = dx < 0 ? -dx : 0; const oy = dy < 0 ? -dy : 0
    const angle = Math.atan2(dy, dx); const ah = 12
    return (
      <div style={{ position: 'absolute', left: start.xf * pageW * zoom, top: start.yf * pageH * zoom, zIndex: 18, overflow: 'visible', pointerEvents: 'none' }}>
        <svg style={{ overflow: 'visible' }}>
          <line x1={ox} y1={oy} x2={ox + dx} y2={oy + dy} stroke={strokeColor} strokeWidth={strokeWidth} />
          {tool === 'arrow' && <>
            <line x1={ox + dx} y1={oy + dy} x2={ox + dx + Math.cos(angle + 2.4) * ah} y2={oy + dy + Math.sin(angle + 2.4) * ah} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={ox + dx} y1={oy + dy} x2={ox + dx + Math.cos(angle - 2.4) * ah} y2={oy + dy + Math.sin(angle - 2.4) * ah} stroke={strokeColor} strokeWidth={strokeWidth} />
          </>}
        </svg>
      </div>
    )
  }
  return null
}

// ── Annotation embedder (shared by all-pages + single-page download) ──────────

async function embedAnnotation(page, ann, W, H, font, fontB, pdfDoc) {
  const xPt = ann.x * W
  const yBL = (1 - ann.y - ann.h) * H
  const wPt = ann.w * W
  const hPt = ann.h * H
  const sc  = hex2rgb(ann.strokeColor || '#000000')
  const fc  = hex2rgb(ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : '#ffffff')

  if (ann.type === 'text' || ann.type === 'note') {
    const f    = ann.bold ? fontB : font
    const size = ann.fontSize || (ann.type === 'note' ? 11 : 14)
    const tc   = hex2rgb(ann.fontColor || (ann.type === 'note' ? '#78350f' : '#000000'))
    if (ann.type === 'note') {
      const nc = hex2rgb(ann.fillColor || '#fef9c3')
      page.drawRectangle({ x: xPt, y: yBL, width: wPt, height: hPt, color: rgb(nc.r, nc.g, nc.b), borderColor: rgb(0.85, 0.6, 0.1), borderWidth: 1 })
    }
    const lines = (ann.text || '').split('\n')
    let ly = yBL + hPt - size * 1.4
    for (const line of lines) {
      if (!line.trim()) { ly -= size * 1.2; continue }
      page.drawText(line, { x: xPt + 3, y: Math.max(2, ly), size, font: f, color: rgb(tc.r, tc.g, tc.b), maxWidth: wPt - 6 })
      ly -= size * 1.4
      if (ly < yBL) break
    }
  } else if (ann.type === 'highlight') {
    const c = hex2rgb(ann.color || '#fef08a')
    page.drawRectangle({ x: xPt, y: yBL, width: wPt, height: hPt, color: rgb(c.r, c.g, c.b), opacity: ann.opacity ?? 0.5 })
  } else if (ann.type === 'rect') {
    const opts = { x: xPt, y: yBL, width: wPt, height: hPt, borderColor: rgb(sc.r, sc.g, sc.b), borderWidth: ann.strokeWidth || 2 }
    if (ann.fillColor && ann.fillColor !== 'transparent') opts.color = rgb(fc.r, fc.g, fc.b)
    page.drawRectangle(opts)
  } else if (ann.type === 'circle') {
    const opts = { x: xPt + wPt / 2, y: yBL + hPt / 2, xScale: wPt / 2, yScale: hPt / 2, borderColor: rgb(sc.r, sc.g, sc.b), borderWidth: ann.strokeWidth || 2 }
    if (ann.fillColor && ann.fillColor !== 'transparent') opts.color = rgb(fc.r, fc.g, fc.b)
    page.drawEllipse(opts)
  } else if (ann.type === 'line' || ann.type === 'arrow') {
    const x1 = ann.x * W, y1 = (1 - ann.y) * H
    const x2 = (ann.x2f ?? (ann.x + ann.w)) * W, y2 = (1 - (ann.y2f ?? (ann.y + ann.h))) * H
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: ann.strokeWidth || 2, color: rgb(sc.r, sc.g, sc.b) })
    if (ann.type === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1), ah = 14
      page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2 + Math.cos(angle + 2.4) * ah, y: y2 + Math.sin(angle + 2.4) * ah }, thickness: ann.strokeWidth || 2, color: rgb(sc.r, sc.g, sc.b) })
      page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2 + Math.cos(angle - 2.4) * ah, y: y2 + Math.sin(angle - 2.4) * ah }, thickness: ann.strokeWidth || 2, color: rgb(sc.r, sc.g, sc.b) })
    }
  } else if ((ann.type === 'draw' || ann.type === 'image' || ann.type === 'signature') && ann.imageUrl) {
    const b64   = ann.imageUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const img   = ann.imageUrl.startsWith('data:image/png')
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes)
    page.drawImage(img, { x: xPt, y: yBL, width: Math.max(1, wPt), height: Math.max(1, hPt) })
  }
}

// ── Main Editor ───────────────────────────────────────────────────────────────

function PdfEditorTool() {
  // ── File state ────────────────────────────────────────────────────────────
  const [pdfFile, setPdfFile]           = useState(null)
  const [pdfBytes, setPdfBytes]         = useState(null)
  const [pdfjsDoc, setPdfjsDoc]         = useState(null)
  const [pageDims, setPageDims]         = useState([])
  const [pageOrder, setPageOrder]       = useState([])
  const [pageRotations, setPageRotations] = useState({})
  const [phase, setPhase]               = useState('idle')

  // ── View state ────────────────────────────────────────────────────────────
  const [zoom, setZoom]           = useState(1.0)
  const [currentPage, setCurrentPage] = useState(0)
  const [thumbLarge, setThumbLarge]   = useState(false)
  const [activeTool, setActiveTool]   = useState(null)

  // ── Tool properties ───────────────────────────────────────────────────────
  const [fontColor, setFontColor]       = useState('#111827')
  const [fontSize, setFontSize]         = useState(14)
  const [bold, setBold]                 = useState(false)
  const [italic, setItalic]             = useState(false)
  const [strokeColor, setStrokeColor]   = useState('#1e3a8a')
  const [fillColor, setFillColor]       = useState('#ffffff')
  const [hasFill, setHasFill]           = useState(false)
  const [strokeWidth, setStrokeWidth]   = useState(2)
  const [highlightColor, setHighlightColor] = useState('#fef08a')
  const [hlOpacity, setHlOpacity]       = useState(0.5)

  // ── Annotations ───────────────────────────────────────────────────────────
  const [annotations, setAnnotations]   = useState({})
  const [selectedId, setSelectedId]     = useState(null)
  const [past, setPast]                 = useState([])
  const [future, setFuture]             = useState([])

  // ── Drawing ───────────────────────────────────────────────────────────────
  const [isDrawing, setIsDrawing]   = useState(false)
  const [drawPage, setDrawPage]     = useState(null)
  const [drawStart, setDrawStart]   = useState(null)
  const [drawEnd, setDrawEnd]       = useState(null)

  // ── Modals / overlays ─────────────────────────────────────────────────────
  const [sigOpen, setSigOpen]         = useState(false)
  const [pendingSig, setPendingSig]   = useState(null)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloadName, setDownloadName] = useState('')

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRefs    = useRef({})
  const thumbRefs     = useRef({})
  const drawRefs      = useRef({})
  const pageElRefs    = useRef({})
  const dragRef       = useRef(null)
  const resizeRef     = useRef(null)
  const imageInputRef = useRef(null)
  const pendingImg    = useRef(null)
  const centerRef     = useRef(null)
  const downloadRef   = useRef(null)

  // Close download dropdown on outside click
  useEffect(() => {
    if (!downloadOpen) return
    function handleClick(e) {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setDownloadOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [downloadOpen])

  // ── Load PDF ──────────────────────────────────────────────────────────────

  async function handleFile(file) {
    setPhase('loading')
    try {
      const ab  = await file.arrayBuffer()
      const buf = new Uint8Array(ab)
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise
      const dims = []
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i)
        const vp = pg.getViewport({ scale: 1 })
        dims.push({ width: vp.width, height: vp.height })
      }
      setPdfBytes(buf)
      setPdfjsDoc(doc)
      setPageDims(dims)
      setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i))
      setPageRotations({})
      setAnnotations({})
      setPast([]); setFuture([])
      setPdfFile(file)
      setCurrentPage(0)
      setDownloadName(file.name.replace(/\.pdf$/i, '') + '-edited')
      setPhase('ready')
    } catch (err) {
      console.error('[pdf-editor] load error', err)
      setPhase('idle')
    }
  }

  // ── Render pages ──────────────────────────────────────────────────────────

  const renderPage = useCallback(async (pi) => {
    const canvas = canvasRefs.current[pi]
    if (!canvas || !pdfjsDoc) return
    try {
      const pg  = await pdfjsDoc.getPage(pi + 1)
      const rot = pageRotations[pi] || 0
      const vp  = pg.getViewport({ scale: zoom, rotation: rot })
      canvas.width  = Math.round(vp.width)
      canvas.height = Math.round(vp.height)
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      await pg.render({ canvasContext: ctx, viewport: vp }).promise
    } catch {}
  }, [pdfjsDoc, zoom, pageRotations])

  useEffect(() => {
    if (phase !== 'ready') return
    pageOrder.forEach(pi => renderPage(pi))
  }, [phase, pageOrder, zoom, pageRotations, renderPage])

  const renderThumb = useCallback(async (pi) => {
    const canvas = thumbRefs.current[pi]
    if (!canvas || !pdfjsDoc) return
    try {
      const pg = await pdfjsDoc.getPage(pi + 1)
      const vp = pg.getViewport({ scale: 0.18 })
      canvas.width  = Math.round(vp.width)
      canvas.height = Math.round(vp.height)
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    } catch {}
  }, [pdfjsDoc])

  useEffect(() => {
    if (phase !== 'ready') return
    pageOrder.forEach(pi => renderThumb(pi))
  }, [phase, pdfjsDoc, pageOrder, renderThumb])

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  const pushHistory = useCallback((snap) => {
    setPast(p => [...p.slice(-19), snap])
    setFuture([])
  }, [])

  const undo = useCallback(() => {
    setPast(p => {
      if (!p.length) return p
      const snap = p[p.length - 1]
      setFuture(f => [annotations, ...f])
      setAnnotations(snap)
      setSelectedId(null)
      return p.slice(0, -1)
    })
  }, [annotations])

  const redo = useCallback(() => {
    setFuture(f => {
      if (!f.length) return f
      setPast(p => [...p, annotations])
      setAnnotations(f[0])
      setSelectedId(null)
      return f.slice(1)
    })
  }, [annotations])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e) => {
      const meta = e.ctrlKey || e.metaKey
      const tag  = document.activeElement?.tagName

      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }

      if (e.key === 'Escape') {
        setDownloadOpen(false)
        setSelectedId(null)
        setActiveTool(null)
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault(); deleteAnn(selectedId)
        }
        return
      }

      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        const toolKeys = { t: 'text', h: 'highlight', d: 'draw', n: 'note', a: 'arrow', r: 'rect' }
        const k = e.key.toLowerCase()
        if (toolKeys[k] && !meta) {
          e.preventDefault()
          setActiveTool(prev => prev === toolKeys[k] ? null : toolKeys[k])
          return
        }
        if ((e.key === '+' || e.key === '=') && !meta) { e.preventDefault(); setZoom(z => Math.min(3.0, +(z + 0.25).toFixed(2))); return }
        if (e.key === '-' && !meta) { e.preventDefault(); setZoom(z => Math.max(0.3, +(z - 0.25).toFixed(2))); return }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [undo, redo, selectedId])

  // ── Annotation helpers ────────────────────────────────────────────────────

  function addAnn(pi, ann) {
    pushHistory(annotations)
    setAnnotations(prev => ({ ...prev, [pi]: [...(prev[pi] || []), ann] }))
    setSelectedId(ann.id)
  }

  function updateAnn(pi, id, upd) {
    setAnnotations(prev => ({
      ...prev,
      [pi]: (prev[pi] || []).map(a => a.id === id ? { ...a, ...upd } : a),
    }))
  }

  function deleteAnn(id) {
    pushHistory(annotations)
    setAnnotations(prev => {
      const next = {}
      for (const [k, arr] of Object.entries(prev)) next[k] = arr.filter(a => a.id !== id)
      return next
    })
    setSelectedId(null)
  }

  function duplicateAnn(id) {
    const ann = Object.values(annotations).flat().find(a => a.id === id)
    if (!ann) return
    pushHistory(annotations)
    const newAnn = { ...ann, id: uid(), x: Math.min(0.9, ann.x + 0.02), y: Math.min(0.9, ann.y + 0.02) }
    setAnnotations(prev => ({ ...prev, [ann.page]: [...(prev[ann.page] || []), newAnn] }))
    setSelectedId(newAnn.id)
  }

  // ── Position helper ───────────────────────────────────────────────────────

  function posFrac(e, pi) {
    const el = pageElRefs.current[pi]
    if (!el) return { xf: 0, yf: 0 }
    const r   = el.getBoundingClientRect()
    const dim = pageDims[pi] || { width: 595, height: 842 }
    const pxW = dim.width * zoom, pxH = dim.height * zoom
    return {
      xf: clamp((e.clientX - r.left) * (pxW / r.width)  / pxW, 0, 1),
      yf: clamp((e.clientY - r.top)  * (pxH / r.height) / pxH, 0, 1),
    }
  }

  // ── Page interaction ──────────────────────────────────────────────────────

  function onPageDown(e, pi) {
    if (!activeTool) return
    e.stopPropagation()
    const { xf, yf } = posFrac(e, pi)

    if (activeTool === 'text') {
      addAnn(pi, { id: uid(), type: 'text', page: pi, x: xf, y: yf, w: 0.25, h: 0.05, text: '', fontSize, fontColor, bold, italic })
      return
    }
    if (activeTool === 'note') {
      addAnn(pi, { id: uid(), type: 'note', page: pi, x: xf, y: yf, w: 0.2, h: 0.15, text: 'Click to edit note…', fontSize: 11, fontColor: '#78350f', fillColor: '#fef9c3' })
      return
    }
    if (activeTool === 'image') {
      pendingImg.current = { pi, xf, yf }
      imageInputRef.current?.click()
      return
    }
    if (activeTool === 'signature') {
      setPendingSig({ pi, xf, yf })
      setSigOpen(true)
      return
    }

    setIsDrawing(true)
    setDrawPage(pi)
    setDrawStart({ xf, yf })
    setDrawEnd({ xf, yf })

    if (activeTool === 'draw') {
      const drawCanvas = drawRefs.current[pi]
      if (drawCanvas) {
        const dim = pageDims[pi] || { width: 595, height: 842 }
        drawCanvas.width  = Math.round(dim.width  * zoom)
        drawCanvas.height = Math.round(dim.height * zoom)
        const ctx = drawCanvas.getContext('2d')
        ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height)
        ctx.strokeStyle = strokeColor
        ctx.lineWidth   = strokeWidth
        ctx.lineCap     = 'round'; ctx.lineJoin = 'round'
        const r   = pageElRefs.current[pi].getBoundingClientRect()
        const pxW = dim.width * zoom, pxH = dim.height * zoom
        const x   = (e.clientX - r.left) * (pxW / r.width)
        const y   = (e.clientY - r.top)  * (pxH / r.height)
        ctx.beginPath(); ctx.moveTo(x, y)
        drawCanvas._lastX = x; drawCanvas._lastY = y
      }
    }
  }

  function onPageMove(e, pi) {
    if (!isDrawing || drawPage !== pi) return
    const { xf, yf } = posFrac(e, pi)
    setDrawEnd({ xf, yf })

    if (activeTool === 'draw') {
      const drawCanvas = drawRefs.current[pi]
      if (!drawCanvas) return
      const dim = pageDims[pi] || { width: 595, height: 842 }
      const r   = pageElRefs.current[pi].getBoundingClientRect()
      const pxW = dim.width * zoom, pxH = dim.height * zoom
      const x   = (e.clientX - r.left) * (pxW / r.width)
      const y   = (e.clientY - r.top)  * (pxH / r.height)
      const ctx = drawCanvas.getContext('2d')
      ctx.beginPath()
      ctx.moveTo(drawCanvas._lastX ?? x, drawCanvas._lastY ?? y)
      ctx.lineTo(x, y); ctx.stroke()
      drawCanvas._lastX = x; drawCanvas._lastY = y
    }
  }

  function onPageUp(e, pi) {
    if (!isDrawing || drawPage !== pi) { setIsDrawing(false); return }
    setIsDrawing(false)
    const s = drawStart, en = drawEnd || drawStart
    if (!s) return

    if (activeTool === 'draw') {
      const dc = drawRefs.current[pi]
      if (!dc) return
      const dataUrl = dc.toDataURL('image/png')
      addAnn(pi, { id: uid(), type: 'draw', page: pi, x: 0, y: 0, w: 1, h: 1, imageUrl: dataUrl })
      const ctx = dc.getContext('2d'); ctx.clearRect(0, 0, dc.width, dc.height)
      setDrawStart(null); setDrawEnd(null)
      return
    }

    const xf = Math.min(s.xf, en.xf), yf = Math.min(s.yf, en.yf)
    const wf = Math.abs(en.xf - s.xf), hf = Math.abs(en.yf - s.yf)
    if (wf < 0.005 && hf < 0.005) { setDrawStart(null); setDrawEnd(null); return }

    const base = { id: uid(), page: pi, x: xf, y: yf, w: wf, h: hf }

    if (activeTool === 'highlight') addAnn(pi, { ...base, type: 'highlight', color: highlightColor, opacity: hlOpacity })
    else if (activeTool === 'rect')   addAnn(pi, { ...base, type: 'rect',   strokeColor, fillColor: hasFill ? fillColor : 'transparent', strokeWidth })
    else if (activeTool === 'circle') addAnn(pi, { ...base, type: 'circle', strokeColor, fillColor: hasFill ? fillColor : 'transparent', strokeWidth })
    else if (activeTool === 'line')   addAnn(pi, { ...base, type: 'line',   x: s.xf, y: s.yf, w: wf, h: hf, x2f: en.xf, y2f: en.yf, strokeColor, strokeWidth })
    else if (activeTool === 'arrow')  addAnn(pi, { ...base, type: 'arrow',  x: s.xf, y: s.yf, w: wf, h: hf, x2f: en.xf, y2f: en.yf, strokeColor, strokeWidth })

    setDrawStart(null); setDrawEnd(null)
  }

  // ── Global drag / resize ──────────────────────────────────────────────────

  useEffect(() => {
    const onMove = (e) => {
      if (dragRef.current) {
        const { id, pi, sx, sy, ox, oy } = dragRef.current
        const dim = pageDims[pi] || { width: 595, height: 842 }
        const pxW = dim.width * zoom, pxH = dim.height * zoom
        updateAnn(pi, id, {
          x: clamp(ox + (e.clientX - sx) / pxW, 0, 0.98),
          y: clamp(oy + (e.clientY - sy) / pxH, 0, 0.98),
        })
      }
      if (resizeRef.current) {
        const { id, pi, handle, sx, sy, ox, oy, ow, oh } = resizeRef.current
        const dim = pageDims[pi] || { width: 595, height: 842 }
        const pxW = dim.width * zoom, pxH = dim.height * zoom
        const dx = (e.clientX - sx) / pxW, dy = (e.clientY - sy) / pxH
        let nx = ox, ny = oy, nw = ow, nh = oh
        if (handle.includes('e')) nw = Math.max(0.02, ow + dx)
        if (handle.includes('s')) nh = Math.max(0.01, oh + dy)
        if (handle.includes('w')) { nx = ox + dx; nw = Math.max(0.02, ow - dx) }
        if (handle.includes('n')) { ny = oy + dy; nh = Math.max(0.01, oh - dy) }
        updateAnn(pi, id, { x: nx, y: ny, w: nw, h: nh })
      }
    }
    const onUp = () => { dragRef.current = null; resizeRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [pageDims, zoom])

  // ── Image insert ──────────────────────────────────────────────────────────

  function onImageSelect(e) {
    const file = e.target.files[0]
    if (!file || !pendingImg.current) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { pi, xf, yf } = pendingImg.current
      addAnn(pi, { id: uid(), type: 'image', page: pi, x: xf, y: yf, w: 0.22, h: 0.18, imageUrl: ev.target.result })
      pendingImg.current = null
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Signature insert ──────────────────────────────────────────────────────

  function onSigInsert(dataUrl) {
    if (!pendingSig) return
    const { pi, xf, yf } = pendingSig
    addAnn(pi, { id: uid(), type: 'signature', page: pi, x: xf, y: yf, w: 0.28, h: 0.09, imageUrl: dataUrl })
    setSigOpen(false); setPendingSig(null)
  }

  // ── Page operations ───────────────────────────────────────────────────────

  function rotatePage(pi, dir) {
    pushHistory(annotations)
    setPageRotations(prev => ({ ...prev, [pi]: ((prev[pi] || 0) + (dir === 'cw' ? 90 : 270)) % 360 }))
  }

  function deletePage(pi) {
    if (pageOrder.length <= 1) return
    pushHistory(annotations)
    setPageOrder(prev => prev.filter(i => i !== pi))
    setAnnotations(prev => { const n = { ...prev }; delete n[pi]; return n })
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function goToPage(di) {
    const clamped = Math.max(0, Math.min(pageOrder.length - 1, di))
    setCurrentPage(clamped)
    const pi = pageOrder[clamped]
    pageElRefs.current[pi]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Fit helpers ───────────────────────────────────────────────────────────

  function fitToWidth() {
    if (!pageDims.length || !centerRef.current) return
    const dim = pageDims[pageOrder[currentPage]] || pageDims[0]
    const avail = centerRef.current.clientWidth - 40
    setZoom(Math.max(0.3, Math.min(3.0, +(avail / dim.width).toFixed(2))))
  }

  function fitToPage() {
    if (!pageDims.length || !centerRef.current) return
    const dim = pageDims[pageOrder[currentPage]] || pageDims[0]
    const w = centerRef.current.clientWidth - 40
    const h = centerRef.current.clientHeight - 40
    setZoom(Math.max(0.3, Math.min(3.0, +(Math.min(w / dim.width, h / dim.height)).toFixed(2))))
  }

  // ── Download ──────────────────────────────────────────────────────────────

  async function handleDownload() {
    if (!pdfBytes) return
    setPhase('saving')
    setDownloadOpen(false)
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
      const font   = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const pages  = pdfDoc.getPages()
      for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi]
        const { width: W, height: H } = page.getSize()
        const rot = pageRotations[pi] || 0
        if (rot) page.setRotation(degrees(rot))
        for (const ann of (annotations[pi] || [])) {
          try { await embedAnnotation(page, ann, W, H, font, fontB, pdfDoc) }
          catch (e2) { console.warn('[pdf-editor] embed error', ann.type, e2.message) }
        }
      }
      const out  = await pdfDoc.save()
      downloadFile(out, `${downloadName || pdfFile.name.replace(/\.pdf$/i, '') + '-edited'}.pdf`)
    } catch (err) {
      console.error('[pdf-editor] download error', err)
    }
    setPhase('ready')
  }

  async function handleDownloadCurrentPage() {
    if (!pdfBytes) return
    setPhase('saving')
    setDownloadOpen(false)
    try {
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
      const newDoc = await PDFDocument.create()
      const pi     = pageOrder[currentPage]
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pi])
      newDoc.addPage(copiedPage)
      const font  = await newDoc.embedFont(StandardFonts.Helvetica)
      const fontB = await newDoc.embedFont(StandardFonts.HelveticaBold)
      const page  = newDoc.getPages()[0]
      const { width: W, height: H } = page.getSize()
      const rot = pageRotations[pi] || 0
      if (rot) page.setRotation(degrees(rot))
      for (const ann of (annotations[pi] || [])) {
        try { await embedAnnotation(page, ann, W, H, font, fontB, newDoc) } catch {}
      }
      const out = await newDoc.save()
      downloadFile(out, `${downloadName || 'edited'}-p${pi + 1}.pdf`)
    } catch (err) {
      console.error('[pdf-editor] page download error', err)
    }
    setPhase('ready')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalAnns = Object.values(annotations).reduce((s, a) => s + a.length, 0)
  const selAnn    = selectedId ? Object.values(annotations).flat().find(a => a.id === selectedId) : null

  if (phase === 'idle' || phase === 'loading') {
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gray-50 hover:border-blue-400 transition-colors"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f) }}>
        {phase === 'loading' ? (
          <div className="space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm">Loading PDF…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-5xl">✏️</div>
            <div>
              <p className="text-lg font-semibold text-gray-800">Upload PDF to Edit</p>
              <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse. Your file stays in your browser — never uploaded.</p>
            </div>
            <label className="inline-block cursor-pointer">
              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) handleFile(f) }} />
              <span className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors">Choose PDF File</span>
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onImageSelect} />

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-900 border-b border-gray-700 min-h-[44px] flex-wrap">

        <button
          onClick={() => { setPdfFile(null); setPhase('idle') }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0">
          📂 <span className="hidden sm:inline">New</span>
        </button>

        <div className="h-4 w-px bg-gray-700 mx-0.5 flex-shrink-0" />

        <div className="hidden sm:flex items-center gap-1.5 text-xs min-w-0 flex-shrink">
          <span className="text-gray-300 truncate max-w-[130px] font-medium">{pdfFile?.name}</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500 whitespace-nowrap">{pageDims.length}p</span>
          {totalAnns > 0 && (
            <span className="bg-blue-900/70 text-blue-300 rounded-full px-1.5 py-0.5 text-[10px] whitespace-nowrap">{totalAnns}</span>
          )}
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}
            title="Previous page"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors text-lg leading-none">‹</button>
          <span className="text-xs text-gray-400 px-1 whitespace-nowrap select-none">
            {currentPage + 1} / {pageOrder.length}
          </span>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageOrder.length - 1}
            title="Next page"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors text-lg leading-none">›</button>
        </div>

        <div className="h-4 w-px bg-gray-700 mx-0.5 flex-shrink-0" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.25).toFixed(2)))}
            title="Zoom out (−)"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 font-bold text-base transition-colors">−</button>
          <select
            value={ZOOM_LEVELS.includes(zoom) ? zoom : ZOOM_LEVELS.reduce((a, b) => Math.abs(b - zoom) < Math.abs(a - zoom) ? b : a)}
            onChange={e => setZoom(+e.target.value)}
            className="bg-gray-800 border border-gray-600 text-gray-300 rounded text-xs px-1 py-1 cursor-pointer w-[58px] text-center">
            {ZOOM_LEVELS.map(z => (
              <option key={z} value={z}>{Math.round(z * 100)}%</option>
            ))}
          </select>
          <button onClick={() => setZoom(z => Math.min(3.0, +(z + 0.25).toFixed(2)))}
            title="Zoom in (+)"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 font-bold text-base transition-colors">+</button>
          <button onClick={fitToWidth} title="Fit to width"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm">⊡</button>
          <button onClick={fitToPage} title="Fit to page"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm">⊞</button>
        </div>

        <div className="h-4 w-px bg-gray-700 mx-0.5 flex-shrink-0" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors text-base">↩</button>
          <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-colors text-base">↪</button>
        </div>

        {/* Download dropdown */}
        <div ref={downloadRef} className="relative ml-1 flex-shrink-0">
          <button
            onClick={() => setDownloadOpen(v => !v)}
            disabled={phase === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors">
            {phase === 'saving'
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : '⬇️'}
            <span className="hidden sm:inline">Save</span>
            <span className="opacity-60 text-[10px]">▾</span>
          </button>
          {downloadOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50">
              <p className="text-[11px] font-semibold text-gray-700 mb-2">Download PDF</p>
              <div className="mb-2.5">
                <label className="text-[10px] text-gray-500 block mb-1">Filename</label>
                <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                  <input
                    value={downloadName}
                    onChange={e => setDownloadName(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    className="flex-1 px-2 py-1 text-xs text-gray-800 outline-none"
                    placeholder="filename"
                  />
                  <span className="px-2 text-[10px] text-gray-400 bg-gray-50 border-l border-gray-200 select-none">.pdf</span>
                </div>
              </div>
              <button onClick={handleDownload}
                className="w-full py-1.5 mb-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
                ⬇️ All {pageOrder.length} page{pageOrder.length !== 1 ? 's' : ''}
              </button>
              <button onClick={handleDownloadCurrentPage}
                className="w-full py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors">
                ⬇️ Page {currentPage + 1} only
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TOOL BAR ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center px-2 py-1 bg-gray-800 border-b border-gray-700 overflow-x-auto gap-0.5">
        {TOOL_GROUPS.map((group, gi) => (
          <div key={group.label} className={`flex items-center gap-0.5 flex-shrink-0 ${gi > 0 ? 'border-l border-gray-600 ml-1.5 pl-2' : ''}`}>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mr-1 hidden lg:block select-none">{group.label}</span>
            {group.tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(prev => prev === tool.id ? null : tool.id)}
                title={tool.key ? `${tool.label} (${tool.key})` : tool.label}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-sm font-medium transition-all ${
                  activeTool === tool.id
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}>
                <span className={tool.id === 'text' || tool.id === 'highlight' ? 'font-bold text-xs' : ''}>{tool.icon}</span>
                <span className="hidden xl:inline text-xs">{tool.label}</span>
                {tool.key && (
                  <span className={`hidden 2xl:inline text-[9px] ml-0.5 ${activeTool === tool.id ? 'opacity-70' : 'opacity-35'}`}>{tool.key}</span>
                )}
              </button>
            ))}
          </div>
        ))}
        {activeTool && (
          <button
            onClick={() => setActiveTool(null)}
            title="Cancel (Esc)"
            className="ml-auto text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded hover:bg-gray-700 transition-colors flex-shrink-0 whitespace-nowrap">
            ✕ <span className="hidden sm:inline">Cancel</span>
          </button>
        )}
      </div>

      {/* ── 3-COLUMN LAYOUT ──────────────────────────────────────────────────── */}
      <div className="flex" style={{ height: 600 }}>

        {/* Left: Thumbnails */}
        <div className={`flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-200 ${thumbLarge ? 'w-36' : 'w-24 sm:w-28'}`}>
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-gray-100 flex-shrink-0">
            <span className="text-[10px] font-semibold text-gray-500 select-none">Pages ({pageOrder.length})</span>
            <button
              onClick={() => setThumbLarge(v => !v)}
              title="Toggle thumbnail size"
              className="text-gray-400 hover:text-gray-700 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors">
              {thumbLarge ? '⊡' : '⊞'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
            {pageOrder.map((pi, di) => {
              const dim = pageDims[pi] || { width: 100, height: 130 }
              const annCount = annotations[pi]?.length || 0
              return (
                <div key={pi}
                  className={`relative group cursor-pointer rounded transition-all ${currentPage === di ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-gray-400 hover:ring-offset-1'}`}
                  onClick={() => { setCurrentPage(di); pageElRefs.current[pi]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                  <div className="w-full bg-white border border-gray-300 rounded shadow-sm overflow-hidden relative"
                    style={{ paddingBottom: `${(dim.height / dim.width) * 100}%` }}>
                    <canvas ref={el => { if (el) { thumbRefs.current[pi] = el; renderThumb(pi) } }} className="absolute inset-0 w-full h-full" />
                  </div>
                  <p className="text-center text-[10px] text-gray-500 mt-0.5 select-none">{di + 1}</p>
                  {annCount > 0 && (
                    <div className="absolute bottom-5 left-0.5 bg-blue-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold select-none">
                      {annCount > 9 ? '9+' : annCount}
                    </div>
                  )}
                  <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); rotatePage(pi, 'cw') }} title="Rotate CW"
                      className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] flex items-center justify-center shadow">↻</button>
                    <button onClick={e => { e.stopPropagation(); rotatePage(pi, 'ccw') }} title="Rotate CCW"
                      className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] flex items-center justify-center shadow">↺</button>
                    {pageOrder.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); deletePage(pi) }} title="Delete page"
                        className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] flex items-center justify-center shadow">✕</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: Canvas */}
        <div ref={centerRef} className="flex-1 overflow-auto bg-gray-300 p-4" onClick={() => setSelectedId(null)}>
          <div className="flex flex-col items-center gap-8">
            {pageOrder.map((pi, di) => {
              const dim = pageDims[pi] || { width: 595, height: 842 }
              const rot = pageRotations[pi] || 0
              const isR = rot === 90 || rot === 270
              const pxW = Math.round((isR ? dim.height : dim.width)  * zoom)
              const pxH = Math.round((isR ? dim.width  : dim.height) * zoom)
              const pageAnns = annotations[pi] || []

              return (
                <div key={pi}>
                  <div className="text-center text-xs text-gray-400 mb-2 font-medium select-none drop-shadow-sm">
                    Page {di + 1}
                    {pageAnns.length > 0 && (
                      <span className="ml-1.5 text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5">{pageAnns.length}</span>
                    )}
                  </div>
                  <div ref={el => { if (el) pageElRefs.current[pi] = el }}
                    className="relative bg-white shadow-2xl"
                    style={{ width: pxW, height: pxH }}
                    onClick={e => e.stopPropagation()}>

                    <canvas ref={el => { if (el) { canvasRefs.current[pi] = el; renderPage(pi) } }}
                      className="absolute inset-0" style={{ display: 'block' }} />

                    <canvas ref={el => { if (el) drawRefs.current[pi] = el }}
                      width={pxW} height={pxH}
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 12 }} />

                    {pageAnns.map(ann => (
                      <AnnotationEl key={ann.id} ann={ann} zoom={zoom}
                        pageW={dim.width} pageH={dim.height}
                        selected={selectedId === ann.id}
                        onSelect={() => setSelectedId(ann.id)}
                        onDelete={() => deleteAnn(ann.id)}
                        onDragStart={e => {
                          e.stopPropagation()
                          setSelectedId(ann.id)
                          dragRef.current = { id: ann.id, pi, sx: e.clientX, sy: e.clientY, ox: ann.x, oy: ann.y }
                        }}
                        onResizeStart={(e, handle) => {
                          e.stopPropagation()
                          resizeRef.current = { id: ann.id, pi, handle, sx: e.clientX, sy: e.clientY, ox: ann.x, oy: ann.y, ow: ann.w, oh: ann.h }
                        }}
                        onChange={upd => { pushHistory(annotations); updateAnn(pi, ann.id, upd) }}
                      />
                    ))}

                    {isDrawing && drawPage === pi && activeTool !== 'draw' && (
                      <DrawPreview tool={activeTool} start={drawStart} end={drawEnd}
                        pageW={dim.width} pageH={dim.height} zoom={zoom}
                        strokeColor={strokeColor} fillColor={hasFill ? fillColor : 'transparent'}
                        strokeWidth={strokeWidth} highlightColor={highlightColor} opacity={hlOpacity} />
                    )}

                    <div
                      className="absolute inset-0"
                      style={{ zIndex: activeTool ? 20 : 0, cursor: activeTool ? (CURSORS[activeTool] || 'crosshair') : 'default', pointerEvents: activeTool ? 'auto' : 'none' }}
                      onMouseDown={e => onPageDown(e, pi)}
                      onMouseMove={e => onPageMove(e, pi)}
                      onMouseUp={e => onPageUp(e, pi)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Properties */}
        <div className="w-44 sm:w-48 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100 flex-shrink-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Properties</p>
          </div>

          <div className="flex-1 px-3 py-2.5 space-y-3 overflow-y-auto min-h-0">

            {/* Text / Note */}
            {(activeTool === 'text' || activeTool === 'note') && (<>
              <PropSection label="Color">
                <ColorGrid value={fontColor} onChange={setFontColor} />
              </PropSection>
              <PropSection label="Font Size">
                <select value={fontSize} onChange={e => setFontSize(+e.target.value)}
                  className="w-full border border-gray-200 rounded text-xs px-2 py-1.5 bg-white">
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
              </PropSection>
              <PropSection label="Style">
                <div className="flex gap-1.5">
                  <button onClick={() => setBold(v => !v)}
                    className={`flex-1 py-1.5 text-xs rounded border font-bold transition-colors ${bold ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>B</button>
                  <button onClick={() => setItalic(v => !v)}
                    className={`flex-1 py-1.5 text-xs rounded border italic transition-colors ${italic ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>I</button>
                </div>
              </PropSection>
            </>)}

            {/* Rect / Circle */}
            {(activeTool === 'rect' || activeTool === 'circle') && (<>
              <PropSection label="Stroke Color">
                <ColorGrid value={strokeColor} onChange={setStrokeColor} />
              </PropSection>
              <PropSection label="Stroke Width">
                <WidthPicker value={strokeWidth} onChange={setStrokeWidth} />
              </PropSection>
              <PropSection label="Fill">
                <div className="flex items-center gap-2 mb-1.5">
                  <input type="checkbox" id="hf" checked={hasFill} onChange={e => setHasFill(e.target.checked)} className="w-3.5 h-3.5 rounded accent-blue-600" />
                  <label htmlFor="hf" className="text-[11px] text-gray-500 cursor-pointer select-none">Fill color</label>
                </div>
                {hasFill && <ColorGrid value={fillColor} onChange={setFillColor} />}
              </PropSection>
            </>)}

            {/* Draw / Arrow / Line */}
            {(activeTool === 'draw' || activeTool === 'arrow' || activeTool === 'line') && (<>
              <PropSection label="Color">
                <ColorGrid value={strokeColor} onChange={setStrokeColor} />
              </PropSection>
              <PropSection label="Stroke Width">
                <WidthPicker value={strokeWidth} onChange={setStrokeWidth} />
              </PropSection>
            </>)}

            {/* Highlight */}
            {activeTool === 'highlight' && (<>
              <PropSection label="Color">
                <div className="flex flex-wrap gap-1">
                  {HL_COLORS.map(c => (
                    <button key={c} onClick={() => setHighlightColor(c)}
                      style={{ background: c }}
                      className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${highlightColor === c ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                      title={c} />
                  ))}
                </div>
              </PropSection>
              <PropSection label="Opacity">
                <div className="flex gap-1">
                  {HL_OPACITIES.map(o => (
                    <button key={o} onClick={() => setHlOpacity(o)}
                      className={`flex-1 py-1 text-[11px] rounded border transition-colors ${hlOpacity === o ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {Math.round(o * 100)}%
                    </button>
                  ))}
                </div>
              </PropSection>
            </>)}

            {!activeTool && !selAnn && (
              <p className="text-[11px] text-gray-400 text-center leading-relaxed pt-2">Select a tool above to annotate</p>
            )}

            {/* Selected annotation actions */}
            {selAnn && (
              <div className="border border-gray-200 rounded-lg p-2 space-y-1.5 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-600 capitalize">{selAnn.type}</p>
                  <button onClick={() => setSelectedId(null)} className="text-[10px] text-gray-400 hover:text-gray-600 leading-none">✕</button>
                </div>
                <button onClick={() => duplicateAnn(selectedId)}
                  className="w-full py-1.5 text-[11px] bg-white hover:bg-gray-100 text-gray-600 rounded border border-gray-200 transition-colors">
                  ⧉ Duplicate
                </button>
                <button onClick={() => deleteAnn(selectedId)}
                  className="w-full py-1.5 text-[11px] bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 transition-colors">
                  🗑 Delete
                </button>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts */}
          <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50 flex-shrink-0">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Shortcuts</p>
            <div className="space-y-0.5">
              {[
                ['T', 'Text'],      ['H', 'Highlight'],
                ['D', 'Draw'],      ['N', 'Note'],
                ['A', 'Arrow'],     ['R', 'Rect'],
                ['Esc', 'Cancel'],  ['Del', 'Delete'],
                ['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'],
                ['+/−', 'Zoom'],
              ].map(([k, desc]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{desc}</span>
                  <kbd className="text-[9px] bg-gray-200 text-gray-600 rounded px-1 py-0.5 font-mono">{k}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {sigOpen && <SignatureModal onInsert={onSigInsert} onClose={() => { setSigOpen(false); setPendingSig(null) }} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ColorGrid({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1 mb-1.5">
        {PALETTE.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            style={{
              background: c,
              boxShadow: value === c
                ? '0 0 0 2px #3b82f6'
                : c === '#ffffff' ? '0 0 0 1px #d1d5db' : 'none',
            }}
            className="w-6 h-6 rounded hover:scale-110 transition-transform" />
        ))}
      </div>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-7 rounded cursor-pointer border border-gray-200"
        title="Custom colour" />
    </div>
  )
}

function WidthPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {STROKE_WIDTHS.map(w => (
        <button key={w} onClick={() => onChange(w)}
          className={`flex-1 py-1 text-xs rounded border font-medium transition-colors ${value === w ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          {w}px
        </button>
      ))}
    </div>
  )
}

function PropSection({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ── Page Shell ────────────────────────────────────────────────────────────────

const STEPS = [
  'Upload your PDF by clicking "Choose PDF File" or dragging it into the upload area.',
  'Select an annotation tool from the toolbar — grouped into Annotate, Draw, Shapes, and Insert sections. Keyboard shortcuts (T, H, D, N, A, R) activate tools instantly.',
  'Click or drag on the PDF page to place your annotation. Text and Note tools place a box on click; shape and drawing tools require a drag.',
  'Drag any annotation to reposition it. Use the corner handles to resize. Press Delete or click the ✕ button to remove it. Use Duplicate in the Properties panel to copy it.',
  'Use the thumbnail sidebar to navigate between pages. Hover a thumbnail to rotate or delete that page. Click thumbnails or use the page navigation arrows to jump between pages.',
  'Click "Save ▾" to open download options — edit the filename, download all pages, or download only the current page.',
]

const FAQS = [
  { q: 'Is my PDF uploaded to any server?', a: 'No. The AWE-OS PDF Editor processes your file entirely in your browser using PDF.js and pdf-lib JavaScript libraries. Your PDF is never transmitted to any server and is permanently discarded when you close the tab — making it completely private even for sensitive documents.' },
  { q: 'Can I add Hindi or regional language text?', a: 'The PDF Editor uses standard browser fonts for on-screen display (which render all Unicode including Devanagari), but the PDF download uses Helvetica (Latin only) due to browser-side font embedding limitations. For saving non-Latin text in the downloaded PDF, use the Draw tool to write by hand, or use the Signature tool to insert a typed name.' },
  { q: 'How do I sign a PDF using this tool?', a: 'Select the ✍️ Sign tool and click anywhere on the page. A modal opens with two options: draw your signature with a mouse or touch, or type your name in cursive. Click "Insert" to place the signature. You can then drag it to the correct position and resize using the corner handles.' },
  { q: 'Will the annotations be saved if I close the browser?', a: 'No — annotations are stored in browser memory only for the current session. Always download your edited PDF before closing or refreshing the page. There is no account, cloud save, or session persistence.' },
  { q: 'What happens when I click "Save"?', a: 'The tool uses pdf-lib to process your original PDF and embed all annotations — text, shapes, highlights, images, and signatures — into the PDF file. You can download all pages or just the current page. The result is saved as a new file; your original is not modified.' },
]

const ABOUT = TOOL_ABOUT['pdf-editor']

export default function PdfEditor() {
  return (
    <ToolPageShell
      slug="pdf-editor"
      name="PDF Editor"
      icon="✏️"
      description="Edit PDFs online free — add text, draw, highlight, sign, annotate, and insert images. 100% browser-based, no server upload."
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <PdfEditorTool />
    </ToolPageShell>
  )
}
