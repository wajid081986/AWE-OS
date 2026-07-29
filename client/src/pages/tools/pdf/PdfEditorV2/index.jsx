import { useCallback, useEffect, useRef, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import ToolPageShell from '../../ToolPageShell'
import PageCanvas from './PageCanvas'
import { usePdfDoc } from './usePdfDoc'
import { useAnnotations } from './useAnnotations'
import { TOOLS, KEYBOARD_SHORTCUTS, ZOOM_LEVELS, DEFAULT_ZOOM, RENDER_SCALE } from './constants'
import { downloadFile, isPdfFile } from '../pdfUtils'
import { TOOL_ABOUT } from '../../../../data/toolPageContent'
import { useToast } from '../../../../shared/components/ToastContext'

// Minimal, flat tool list for phase 3 — becomes Toolbar.jsx in a later phase
// once PagePanel/PropertiesPanel land (see docs/batches/batch-35-plan.md).
const TOOL_BUTTONS = [
  { id: TOOLS.SELECT, label: 'Select', icon: '↖', key: 'V' },
  { id: TOOLS.TEXT, label: 'Text', icon: 'T', key: 'T' },
  { id: TOOLS.HIGHLIGHT, label: 'Highlight', icon: '▮', key: 'H' },
  { id: TOOLS.UNDERLINE, label: 'Underline', icon: 'U', key: '' },
  { id: TOOLS.STRIKETHROUGH, label: 'Strike', icon: 'S̶', key: '' },
  { id: TOOLS.DRAW, label: 'Draw', icon: '✎', key: 'D' },
  { id: TOOLS.ARROW, label: 'Arrow', icon: '↗', key: 'A' },
  { id: TOOLS.RECTANGLE, label: 'Rectangle', icon: '▭', key: 'R' },
  { id: TOOLS.ELLIPSE, label: 'Ellipse', icon: '◯', key: 'E' },
  { id: TOOLS.NOTE, label: 'Note', icon: '🗒️', key: 'N' },
  { id: TOOLS.WHITEOUT, label: 'Whiteout', icon: '▢', key: 'W' },
  { id: TOOLS.STAMP, label: 'Stamp', icon: '⏹', key: 'S' },
  { id: TOOLS.SIGNATURE, label: 'Signature', icon: '✒', key: '' },
]

const STEPS = [
  'Upload a PDF — it never leaves your browser.',
  'Pick a tool from the toolbar (or its keyboard shortcut) and click or drag on the page to annotate.',
  'Select an existing annotation to move it, or press Delete to remove it. Ctrl+Z / Ctrl+Y undo and redo.',
  'Click Download to save a flattened copy with your annotations embedded as real PDF content.',
]
const FAQS = [
  { q: 'Is my PDF uploaded to any server?', a: 'No. The editor runs entirely in your browser using PDF.js and pdf-lib — your file is never transmitted anywhere.' },
  { q: 'Will my annotations survive a page refresh?', a: 'No — annotations live in memory for the current session only. Download before refreshing or closing the tab.' },
  { q: 'What does Whiteout do?', a: 'It draws a permanent white rectangle over the selected area. On download, pdf-lib embeds it as an opaque rectangle covering the original content underneath — the underlying text itself is not removed from the file.' },
]
const ABOUT = TOOL_ABOUT['pdf-editor']

async function pickStandardFont(pdfLibDoc, family, bold, italic) {
  const isTimes = family === 'Times New Roman' || family === 'Georgia'
  const isCourier = family === 'Courier New'
  if (isCourier) {
    return pdfLibDoc.embedFont(bold && italic ? StandardFonts.CourierBoldOblique
      : bold ? StandardFonts.CourierBold
      : italic ? StandardFonts.CourierOblique
      : StandardFonts.Courier)
  }
  if (isTimes) {
    return pdfLibDoc.embedFont(bold && italic ? StandardFonts.TimesRomanBoldItalic
      : bold ? StandardFonts.TimesRomanBold
      : italic ? StandardFonts.TimesRomanItalic
      : StandardFonts.TimesRoman)
  }
  // Helvetica, Verdana, Arial all fall back to Helvetica — pdf-lib only ships
  // the 14 standard PDF fonts, none of which are Verdana/Arial.
  return pdfLibDoc.embedFont(bold && italic ? StandardFonts.HelveticaBoldOblique
    : bold ? StandardFonts.HelveticaBold
    : italic ? StandardFonts.HelveticaOblique
    : StandardFonts.Helvetica)
}

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '').padEnd(6, '0')
  return rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255)
}

/** Draws one annotation onto its PDF page, converting from the fixed
 * RENDER_SCALE/top-left canvas space to PDF points/bottom-left page space. */
async function drawAnnotation(pdfLibDoc, page, ann) {
  const { height: pageH } = page.getSize()
  const toPt = (v) => v / RENDER_SCALE
  const x = toPt(ann.x)
  const w = toPt(ann.w ?? 0)
  const h = toPt(ann.h ?? 0)
  const yTop = pageH - toPt(ann.y) // PDF y of the box's top edge
  const yBottom = yTop - h

  switch (ann.type) {
    case TOOLS.RECTANGLE:
      page.drawRectangle({
        x, y: yBottom, width: w, height: h,
        borderColor: hexToRgb(ann.stroke), borderWidth: ann.strokeWidth ?? 2,
        color: ann.fill && ann.fill !== 'transparent' ? hexToRgb(ann.fill) : undefined,
        opacity: ann.opacity ?? 1,
      })
      break
    case TOOLS.ELLIPSE:
      page.drawEllipse({
        x: x + w / 2, y: yBottom + h / 2, xScale: w / 2, yScale: h / 2,
        borderColor: hexToRgb(ann.stroke), borderWidth: ann.strokeWidth ?? 2,
        color: ann.fill && ann.fill !== 'transparent' ? hexToRgb(ann.fill) : undefined,
        opacity: ann.opacity ?? 1,
      })
      break
    case TOOLS.HIGHLIGHT:
      page.drawRectangle({ x, y: yBottom, width: w, height: h, color: hexToRgb(ann.color), opacity: ann.opacity ?? 0.4 })
      break
    case TOOLS.UNDERLINE:
      page.drawRectangle({ x, y: yBottom, width: w, height: ann.strokeWidth ?? 2, color: hexToRgb(ann.color) })
      break
    case TOOLS.STRIKETHROUGH:
      page.drawRectangle({ x, y: yBottom + h / 2, width: w, height: ann.strokeWidth ?? 2, color: hexToRgb(ann.color) })
      break
    case TOOLS.WHITEOUT:
      page.drawRectangle({ x, y: yBottom, width: w, height: h, color: hexToRgb(ann.fill ?? '#ffffff') })
      break
    case TOOLS.NOTE:
      page.drawRectangle({ x, y: yBottom, width: w, height: h, color: hexToRgb(ann.color), opacity: 0.9 })
      break
    case TOOLS.STAMP: {
      const font = await pdfLibDoc.embedFont(StandardFonts.HelveticaBold)
      const size = 12
      page.drawRectangle({ x, y: yBottom, width: w, height: h, borderColor: hexToRgb(ann.color), borderWidth: 3 })
      page.drawText(ann.text ?? '', {
        x: x + 8, y: yBottom + h / 2 - size / 2, size, font, color: hexToRgb(ann.color), rotate: { type: 'degrees', angle: -6 },
      })
      break
    }
    case TOOLS.TEXT: {
      const font = await pickStandardFont(pdfLibDoc, ann.fontFamily, ann.bold, ann.italic)
      const size = toPt(ann.fontSize ?? 14)
      const lines = (ann.text ?? '').split('\n')
      lines.forEach((line, i) => {
        page.drawText(line, {
          x, y: yTop - size * (i + 1), size, font, color: hexToRgb(ann.color),
        })
      })
      break
    }
    case TOOLS.DRAW:
    case TOOLS.SIGNATURE:
    case TOOLS.ARROW: {
      const points = ann.type === TOOLS.ARROW
        ? [{ x: 0, y: 0 }, { x: ann.w, y: ann.h }]
        : (ann.points ?? [])
      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1]
        const to = points[i]
        page.drawLine({
          start: { x: x + toPt(from.x), y: yTop - toPt(from.y) },
          end: { x: x + toPt(to.x), y: yTop - toPt(to.y) },
          thickness: ann.strokeWidth ?? 2,
          color: hexToRgb(ann.color),
        })
      }
      break
    }
    default:
      break
  }
}

export default function PdfEditorV2() {
  const { showToast } = useToast()
  const pdfDoc = usePdfDoc()
  const annotationsApi = useAnnotations()
  const originalBytesRef = useRef(null)
  const fileInputRef = useRef(null)

  const [activeTool, setActiveTool] = useState(TOOLS.SELECT)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isPdfFile(file)) {
      showToast('Please choose a PDF file.', 'error')
      return
    }
    annotationsApi.reset()
    const bytes = await pdfDoc.loadFromFile(file)
    originalBytesRef.current = bytes
  }, [pdfDoc, annotationsApi, showToast])

  const zoomBy = useCallback((direction) => {
    setZoom((current) => {
      const idx = ZOOM_LEVELS.indexOf(current)
      const nextIdx = idx === -1 ? ZOOM_LEVELS.indexOf(DEFAULT_ZOOM) : idx + direction
      return ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, nextIdx))]
    })
  }, [])

  const handleDownload = useCallback(async () => {
    if (!originalBytesRef.current) return
    try {
      const pdfLibDoc = await PDFDocument.load(originalBytesRef.current)
      for (const ann of annotationsApi.annotations) {
        const page = pdfLibDoc.getPage(ann.page - 1)
        // eslint-disable-next-line no-await-in-loop -- annotations must draw in
        // creation order so overlapping shapes stack the same as on-screen
        await drawAnnotation(pdfLibDoc, page, ann)
      }
      const bytes = await pdfLibDoc.save()
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      downloadFile(bytes, `${baseName}-edited.pdf`)
      showToast('PDF downloaded.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to generate the PDF.', 'error')
    }
  }, [annotationsApi.annotations, pdfDoc.fileName, showToast])

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      const inTextField = tag === 'TEXTAREA' || tag === 'INPUT'

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        annotationsApi.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        annotationsApi.redo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleDownload()
        return
      }
      if (inTextField) return
      if (e.key === 'Escape') {
        annotationsApi.clearSelection()
        setActiveTool(TOOLS.SELECT)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        annotationsApi.deleteSelected()
        return
      }
      const tool = KEYBOARD_SHORTCUTS[e.key.toLowerCase()]
      if (tool) setActiveTool(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [annotationsApi, handleDownload])

  return (
    <ToolPageShell
      slug="pdf-editor"
      name="PDF Editor"
      icon="✏️"
      description="Edit PDFs online free — annotate, highlight, draw, sign, add stamps, and more. 100% browser-based."
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
      limitation="Adds new text, drawings, and highlights on top of the PDF — it cannot edit or delete the PDF's original text."
    >
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={handleFileChange} className="hidden" />

      {!pdfDoc.isReady ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-line rounded-m p-12 text-center text-ink-soft hover:border-cobalt hover:text-cobalt transition-colors"
        >
          {pdfDoc.status === 'loading' ? 'Loading…' : 'Choose a PDF file to edit'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-card border border-line rounded-m p-2">
            {TOOL_BUTTONS.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.key ? `${t.label} (${t.key})` : t.label}
                onClick={() => setActiveTool(t.id)}
                className={`px-2.5 py-1.5 rounded-s text-sm ${activeTool === t.id ? 'bg-cobalt text-white' : 'hover:bg-cobalt-tint'}`}
              >
                <span aria-hidden>{t.icon}</span>
                <span className="sr-only">{t.label}</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => zoomBy(-1)} className="px-2 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Zoom out">−</button>
              <span className="text-xs text-ink-soft w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => zoomBy(1)} className="px-2 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Zoom in">+</button>
              <button type="button" onClick={annotationsApi.undo} disabled={!annotationsApi.canUndo} className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40">Undo</button>
              <button type="button" onClick={annotationsApi.redo} disabled={!annotationsApi.canRedo} className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40">Redo</button>
              <button type="button" onClick={handleDownload} className="px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium">Download</button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 bg-canvas p-6 rounded-m overflow-auto">
            {Array.from({ length: pdfDoc.pageCount }, (_, i) => i + 1).map((pageNumber) => (
              <PageCanvas
                key={pageNumber}
                pageNumber={pageNumber}
                zoom={zoom}
                pdfDoc={pdfDoc}
                annotationsApi={annotationsApi}
                activeTool={activeTool}
                onAnnotationCreated={() => setActiveTool(TOOLS.SELECT)}
              />
            ))}
          </div>
        </div>
      )}
    </ToolPageShell>
  )
}
