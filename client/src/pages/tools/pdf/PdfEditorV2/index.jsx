import { useCallback, useEffect, useRef, useState } from 'react'
import { PDFDocument, StandardFonts, rgb, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFString } from 'pdf-lib'
import ToolPageShell from '../../ToolPageShell'
import PageCanvas from './PageCanvas'
import RibbonToolbar from './RibbonToolbar'
import PagePanel from './PagePanel'
import PropertiesPanel from './PropertiesPanel'
import ProfileModal from './ProfileModal'
import AiConsentModal from './AiConsentModal'
import AiResultModal from './AiResultModal'
import FindReplaceBar from './FindReplaceBar'
import ConfirmModal from './ConfirmModal'
import DocumentToolsModal from './DocumentToolsModal'
import { usePdfDoc } from './usePdfDoc'
import { useAnnotations } from './useAnnotations'
import { useFormFields } from './useFormFields'
import { useAutoFillProfile } from './useAutoFillProfile'
import { useAiTools } from './useAiTools'
import { useFindReplace } from './useFindReplace'
import { usePageManager, buildPageRemap } from './usePageManager'
import { useDocumentTools } from './useDocumentTools'
import { exportPdfToDocx, exportTablesToXlsx } from './pdfExport'
import { TOOLS, KEYBOARD_SHORTCUTS, ZOOM_LEVELS, DEFAULT_ZOOM, RENDER_SCALE, DEFAULT_ANNOTATION_STYLE, MAX_IMAGE_SIZE_MB } from './constants'
import { downloadFile, downloadBlob, isPdfFile, isImageFile, readImageDimensions, cropImageToBytes, tablesToCsv } from '../pdfUtils'
import { TOOL_ABOUT } from '../../../../data/toolPageContent'
import { useToast } from '../../../../shared/components/ToastContext'

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
    case TOOLS.REDACT:
      // Always fully opaque solid black — ignores ann.opacity/ann.color on
      // purpose (see constants.js/PropertiesPanel.jsx), unlike every other
      // shape here which respects the user's chosen style.
      page.drawRectangle({ x, y: yBottom, width: w, height: h, color: rgb(0, 0, 0), opacity: 1 })
      break
    case TOOLS.CALLOUT: {
      const font = await pdfLibDoc.embedFont(StandardFonts.Helvetica)
      const size = toPt(ann.fontSize ?? 12)
      page.drawRectangle({
        x, y: yBottom, width: w, height: h,
        color: hexToRgb(ann.fill ?? '#fef9c3'),
        borderColor: hexToRgb(ann.color ?? '#111827'), borderWidth: 1.5,
      })
      const lines = (ann.text ?? '').split('\n')
      lines.forEach((line, i) => {
        page.drawText(line, { x: x + 6, y: yTop - size * (i + 1) - 2, size, font, color: hexToRgb(ann.color ?? '#111827') })
      })
      // Leader line to the anchor point — anchorDx/anchorDy are an offset
      // from the box's own top-left corner in canvas/display units
      // (constants.js), so they go through the same toPt conversion as
      // every other coordinate here before becoming a PDF-space point.
      const anchorX = toPt(ann.x + (ann.anchorDx ?? -40))
      const anchorY = pageH - toPt(ann.y + (ann.anchorDy ?? 40))
      page.drawLine({ start: { x, y: yTop }, end: { x: anchorX, y: anchorY }, thickness: 1.5, color: hexToRgb(ann.color ?? '#111827') })
      break
    }
    case TOOLS.LINK: {
      // Low-level pdf-lib annotation API — there's no high-level "add a
      // link" helper (only PDFForm's widget helpers reach this deep
      // elsewhere in the codebase). Border [0,0,0] keeps it fully invisible
      // in the exported PDF; it's a real clickable hotspot, not a visible
      // box, matching the on-canvas dashed-outline being edit-only chrome.
      const rect = pdfLibDoc.context.obj([x, yBottom, x + w, yTop])
      let action = null
      if (ann.url) {
        action = pdfLibDoc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(ann.url) })
      } else if (ann.targetPage >= 1 && ann.targetPage <= pdfLibDoc.getPageCount()) {
        const targetRef = pdfLibDoc.getPage(ann.targetPage - 1).ref
        action = pdfLibDoc.context.obj({ Type: 'Action', S: 'GoTo', D: [targetRef, 'XYZ', null, null, null] })
      }
      if (action) {
        const annotDict = pdfLibDoc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: rect, Border: [0, 0, 0], A: action })
        page.node.addAnnot(pdfLibDoc.context.register(annotDict))
      }
      break
    }
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
    case TOOLS.ARROW:
    case TOOLS.LINE: {
      // ARROW/LINE are box-drag tools (a straight segment from the box's
      // corner to its opposite corner) and never have ann.points — only
      // DRAW/SIGNATURE are freehand and carry a real points array.
      const points = ann.type === TOOLS.ARROW || ann.type === TOOLS.LINE
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
    case TOOLS.IMAGE: {
      const image = ann.mimeType === 'image/jpeg' || ann.mimeType === 'image/jpg'
        ? await pdfLibDoc.embedJpg(ann.imageBytes)
        : await pdfLibDoc.embedPng(ann.imageBytes)
      page.drawImage(image, { x, y: yBottom, width: w, height: h, opacity: ann.opacity ?? 1 })
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
  const formFieldsApi = useFormFields()
  const autoFillApi = useAutoFillProfile()
  const aiApi = useAiTools()
  const findReplace = useFindReplace(pdfDoc)
  const originalBytesRef = useRef(null)
  const pageManagerApi = usePageManager({ originalBytesRef, pdfDoc })
  const documentToolsApi = useDocumentTools({ originalBytesRef, pdfDoc, formFieldsApi })
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const viewerRef = useRef(null)
  const overlayRef = useRef(null)
  const fullscreenBtnRef = useRef(null)

  const [activeTool, setActiveTool] = useState(TOOLS.SELECT)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [activePage, setActivePage] = useState(1)
  const [pagePanelCollapsed, setPagePanelCollapsed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOnboardingHint, setShowOnboardingHint] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  // Set once a file is picked via Toolbar's Insert Image button — arms
  // TOOLS.IMAGE so the next canvas click places it (PageCanvas.jsx).
  const [pendingImage, setPendingImage] = useState(null)
  const [croppingId, setCroppingId] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [extractSelected, setExtractSelected] = useState(new Set())
  const [pendingDeletePosition, setPendingDeletePosition] = useState(null)
  const [documentToolMode, setDocumentToolMode] = useState(null)
  const [documentToolLoading, setDocumentToolLoading] = useState(false)

  // localStorage read — effect, not render body, so it never runs during SSR.
  useEffect(() => { autoFillApi.load() }, [])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isPdfFile(file)) {
      showToast('Please choose a PDF file.', 'error')
      return
    }
    annotationsApi.reset()
    formFieldsApi.reset()
    setActivePage(1)
    setExtractSelected(new Set())
    setViewRotation(0)
    const bytes = await pdfDoc.loadFromFile(file)
    originalBytesRef.current = bytes
    await formFieldsApi.detect(bytes)
    const tmpDoc = await PDFDocument.load(bytes.slice())
    pageManagerApi.initFromPageCount(tmpDoc.getPageCount())
    setIsFullscreen(true)
    setShowOnboardingHint(true)
  }, [pdfDoc, annotationsApi, formFieldsApi, pageManagerApi, showToast])

  const armImage = useCallback(async (file) => {
    if (!isImageFile(file)) {
      showToast('Please choose a PNG or JPEG image.', 'error')
      return
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      showToast(`Image is too large (max ${MAX_IMAGE_SIZE_MB}MB).`, 'error')
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const mimeType = file.type || (/\.png$/i.test(file.name) ? 'image/png' : 'image/jpeg')
    try {
      const { width, height } = await readImageDimensions(bytes, mimeType)
      const w = Math.min(240, width)
      const h = w * (height / width)
      setPendingImage({ bytes, mimeType, naturalWidth: width, naturalHeight: height, w, h })
      setActiveTool(TOOLS.IMAGE)
    } catch {
      showToast('Failed to read that image.', 'error')
    }
  }, [showToast])

  const handleImageFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await armImage(file)
  }, [armImage])

  // Ctrl+V: places an image directly on the active page at a default
  // position — unlike the toolbar's insert flow, paste has no "click point"
  // to arm-and-wait-for, so it places immediately (matches normal paste UX).
  useEffect(() => {
    async function onPaste(e) {
      if (!pdfDoc.isReady) return
      const tag = document.activeElement?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return
      const item = Array.from(e.clipboardData?.items || []).find((it) => it.type.startsWith('image/'))
      if (!item) return
      e.preventDefault()
      const file = item.getAsFile()
      if (!file || file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        if (file) showToast(`Image is too large (max ${MAX_IMAGE_SIZE_MB}MB).`, 'error')
        return
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      const mimeType = file.type || 'image/png'
      try {
        const { width, height } = await readImageDimensions(bytes, mimeType)
        const w = Math.min(240, width)
        const h = w * (height / width)
        annotationsApi.addAnnotation({
          type: TOOLS.IMAGE, page: activePage,
          x: 40, y: 40, w, h,
          imageBytes: bytes, mimeType, naturalWidth: width, naturalHeight: height,
          ...DEFAULT_ANNOTATION_STYLE[TOOLS.IMAGE],
        })
        showToast('Image pasted.', 'success')
      } catch {
        showToast('Failed to paste that image.', 'error')
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pdfDoc.isReady, activePage, annotationsApi, showToast])

  const handleApplyCrop = useCallback(async (ann, displayRect) => {
    try {
      const scaleX = (ann.naturalWidth ?? ann.w) / ann.w
      const scaleY = (ann.naturalHeight ?? ann.h) / ann.h
      const naturalRect = {
        x: displayRect.x * scaleX,
        y: displayRect.y * scaleY,
        width: displayRect.w * scaleX,
        height: displayRect.h * scaleY,
      }
      const { bytes, width, height } = await cropImageToBytes(ann.imageBytes, ann.mimeType, naturalRect)
      annotationsApi.updateAnnotation(ann.id, {
        imageBytes: bytes,
        mimeType: 'image/png',
        naturalWidth: width,
        naturalHeight: height,
        x: ann.x + displayRect.x,
        y: ann.y + displayRect.y,
        w: displayRect.w,
        h: displayRect.h,
      })
    } catch (err) {
      showToast(err?.message || 'Failed to crop image.', 'error')
    } finally {
      setCroppingId(null)
    }
  }, [annotationsApi, showToast])

  const handleSummarize = useCallback(async () => {
    try {
      const text = await pdfDoc.getAllText()
      const result = await aiApi.summarize(text)
      if (result) setAiResult({ title: 'Summary', content: result })
    } catch (err) {
      showToast(err?.message || 'Failed to summarize.', 'error')
    }
  }, [pdfDoc, aiApi, showToast])

  const handleTranslate = useCallback(async (targetLang) => {
    try {
      const text = await pdfDoc.getAllText()
      const result = await aiApi.translate(text, targetLang)
      if (result) setAiResult({ title: targetLang === 'hi' ? 'Translation (Hindi)' : 'Translation (Urdu)', content: result })
    } catch (err) {
      showToast(err?.message || 'Failed to translate.', 'error')
    }
  }, [pdfDoc, aiApi, showToast])

  const handleExtractTables = useCallback(async () => {
    try {
      const text = await pdfDoc.getAllText()
      const result = await aiApi.extractTables(text)
      if (!result) return
      if (!result.tables?.length) {
        showToast('No tables found in this PDF.', 'info')
        return
      }
      const csv = tablesToCsv(result.tables)
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      downloadBlob(new Blob([csv], { type: 'text/csv' }), `${baseName}-tables.csv`)
      showToast(`${result.tables.length} table(s) exported.`, 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to extract tables.', 'error')
    }
  }, [pdfDoc, aiApi, showToast])

  // Fully client-side (no server call, no consent needed) — best-effort text
  // reflow via the already-installed `docx` package, no layout/table/image
  // fidelity. See docs/batches/batch-36-plan.md's Phase 5.
  const handleExportWord = useCallback(async () => {
    try {
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      await exportPdfToDocx(pdfDoc, baseName)
      showToast('Word document downloaded.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to export to Word.', 'error')
    }
  }, [pdfDoc, showToast])

  // Reuses the same server-side table detection as Extract Tables (CSV) —
  // only the output format differs (a real .xlsx via the already-installed
  // `xlsx` package instead of plain CSV text).
  const handleExtractTablesXlsx = useCallback(async () => {
    try {
      const text = await pdfDoc.getAllText()
      const result = await aiApi.extractTables(text)
      if (!result) return
      if (!result.tables?.length) {
        showToast('No tables found in this PDF.', 'info')
        return
      }
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      exportTablesToXlsx(result.tables, baseName)
      showToast(`${result.tables.length} table(s) exported.`, 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to extract tables.', 'error')
    }
  }, [pdfDoc, aiApi, showToast])

  // Replace All reuses the exact same whiteout+pre-filled-text-overlay trick
  // the Text tool's click-to-edit path already uses (PageCanvas.jsx) — this
  // is NOT true content-stream text editing (pdf-lib has no API for that;
  // see docs/batches/batch-35-inline-text-plan.md), just automated cover +
  // replace, applied to every match instead of one clicked item. All matches
  // are recorded as a single addAnnotations call, so one Ctrl+Z undoes the
  // whole Replace All.
  const handleReplaceAll = useCallback(async (searchTerm, replacement) => {
    const matches = await findReplace.findMatches(searchTerm)
    if (!matches.length) {
      showToast('No matches found.', 'info')
      setShowFindReplace(false)
      return
    }
    const pattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const partials = []
    for (const { page, item } of matches) {
      partials.push({
        type: TOOLS.WHITEOUT, page,
        x: item.x, y: item.y, w: item.width, h: item.height,
        ...DEFAULT_ANNOTATION_STYLE[TOOLS.WHITEOUT],
      })
      partials.push({
        type: TOOLS.TEXT, page,
        x: item.x, y: item.y, w: Math.max(item.width, 60), h: Math.max(item.height + 6, 22),
        text: item.str.replace(pattern, replacement),
        ...DEFAULT_ANNOTATION_STYLE[TOOLS.TEXT],
        fontSize: Math.max(8, Math.round(item.height)),
      })
    }
    annotationsApi.addAnnotations(partials)
    setShowFindReplace(false)
    showToast(`Replaced ${matches.length} match(es).`, 'success')
  }, [findReplace, annotationsApi, showToast])

  // Shared tail of every page-management op (insert/duplicate/delete/move):
  // remaps annotations to follow their page across the rebuild, re-detects
  // AcroForm fields from the rebuilt bytes (positions may have shifted) while
  // preserving whatever the user had already typed — detect() itself always
  // resets values to the fresh document's own defaults, which would
  // otherwise silently wipe in-progress form input — and clamps activePage
  // back into range if the page count shrank.
  const afterRebuild = useCallback(async (oldOrder, newOrder) => {
    const mapFn = buildPageRemap(oldOrder, newOrder)
    const hadHistory = annotationsApi.canUndo || annotationsApi.canRedo
    annotationsApi.remapPages(mapFn)
    const prevValues = formFieldsApi.values
    await formFieldsApi.detect(originalBytesRef.current)
    formFieldsApi.setValuesBulk(prevValues)
    setActivePage((p) => Math.min(p, newOrder.length))
    if (hadHistory) showToast('Page structure changed — undo history for annotations was cleared.', 'info')
  }, [annotationsApi, formFieldsApi, showToast])

  const handleInsertBlank = useCallback(async (position0) => {
    try {
      const { oldOrder, newOrder } = await pageManagerApi.insertBlankPage(position0)
      await afterRebuild(oldOrder, newOrder)
      showToast('Blank page inserted.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to insert page.', 'error')
    }
  }, [pageManagerApi, afterRebuild, showToast])

  // Also clones the source page's own annotations onto the new copy — pdf-lib
  // only duplicates the page's original content; without this, "duplicate"
  // would visibly drop whatever the user had already drawn on that page.
  const handleDuplicatePage = useCallback(async (position0) => {
    const sourceAnnotations = annotationsApi.getPageAnnotations(position0 + 1)
    try {
      const { oldOrder, newOrder, newPosition } = await pageManagerApi.duplicatePage(position0)
      await afterRebuild(oldOrder, newOrder)
      if (sourceAnnotations.length) {
        annotationsApi.addAnnotations(sourceAnnotations.map(({ id, ...rest }) => ({ ...rest, page: newPosition })))
      }
      showToast('Page duplicated.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to duplicate page.', 'error')
    }
  }, [annotationsApi, pageManagerApi, afterRebuild, showToast])

  const handleMovePage = useCallback(async (from0, to0) => {
    if (from0 === to0 || to0 < 0 || to0 >= pageManagerApi.pageOrder.length) return
    try {
      const { oldOrder, newOrder } = await pageManagerApi.movePage(from0, to0)
      await afterRebuild(oldOrder, newOrder)
    } catch (err) {
      showToast(err?.message || 'Failed to move page.', 'error')
    }
  }, [pageManagerApi, afterRebuild, showToast])

  const performDeletePage = useCallback(async (position0) => {
    try {
      const { oldOrder, newOrder } = await pageManagerApi.deletePage(position0)
      await afterRebuild(oldOrder, newOrder)
      showToast('Page deleted.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to delete page.', 'error')
    } finally {
      setPendingDeletePosition(null)
    }
  }, [pageManagerApi, afterRebuild, showToast])

  // Skips the confirm dialog entirely for an empty page — it's only there to
  // stop an accidental click from silently discarding a page the user has
  // actually annotated.
  const requestDeletePage = useCallback((position0) => {
    if (pageManagerApi.pageOrder.length <= 1) {
      showToast("Can't delete the only page.", 'error')
      return
    }
    const count = annotationsApi.getPageAnnotations(position0 + 1).length
    if (count > 0) setPendingDeletePosition(position0)
    else performDeletePage(position0)
  }, [pageManagerApi, annotationsApi, performDeletePage, showToast])

  const toggleExtractSelect = useCallback((position0) => {
    setExtractSelected((prev) => {
      const next = new Set(prev)
      if (next.has(position0)) next.delete(position0)
      else next.add(position0)
      return next
    })
  }, [])

  // Shared by Extract and Split: builds a standalone PDFDocument for the
  // given (0-indexed) positions and flattens each extracted page's own
  // annotations onto it — same drawAnnotation used by the main Download
  // button, so an extracted/split file isn't silently missing whatever the
  // user has drawn on those pages.
  const buildFlattenedSubsetPdf = useCallback(async (positions0) => {
    const { pdfLibDoc: newPdf, oldPageNumbers } = await pageManagerApi.buildSubsetPdf(positions0)
    for (let i = 0; i < oldPageNumbers.length; i++) {
      const page = newPdf.getPage(i)
      const anns = annotationsApi.getPageAnnotations(oldPageNumbers[i])
      for (const ann of anns) {
        // eslint-disable-next-line no-await-in-loop -- annotations must draw in creation order, same as handleDownload
        await drawAnnotation(newPdf, page, ann)
      }
    }
    return newPdf.save()
  }, [pageManagerApi, annotationsApi])

  const handleExtractSelected = useCallback(async () => {
    const positions0 = [...extractSelected].sort((a, b) => a - b)
    if (!positions0.length) return
    try {
      const bytes = await buildFlattenedSubsetPdf(positions0)
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      downloadFile(bytes, `${baseName}-extracted.pdf`)
      setExtractSelected(new Set())
      showToast(`${positions0.length} page(s) extracted.`, 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to extract pages.', 'error')
    }
  }, [extractSelected, buildFlattenedSubsetPdf, pdfDoc.fileName, showToast])

  // Pages ribbon's "Extract" button — extracts just the currently-active
  // page, unlike handleExtractSelected which operates on PagePanel's
  // checkbox selection. Reuses the same buildFlattenedSubsetPdf as every
  // other extract/split path.
  const handleExtractCurrentPage = useCallback(async () => {
    try {
      const bytes = await buildFlattenedSubsetPdf([activePage - 1])
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      downloadFile(bytes, `${baseName}-page${activePage}.pdf`)
      showToast('Page extracted.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to extract page.', 'error')
    }
  }, [activePage, buildFlattenedSubsetPdf, pdfDoc.fileName, showToast])

  const handleSplitAfter = useCallback(async (position0) => {
    const total = pageManagerApi.pageOrder.length
    if (position0 >= total - 1) {
      showToast('Choose a page that is not the last page.', 'error')
      return
    }
    try {
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      const firstBytes = await buildFlattenedSubsetPdf(Array.from({ length: position0 + 1 }, (_, i) => i))
      downloadFile(firstBytes, `${baseName}-part1.pdf`)
      const secondBytes = await buildFlattenedSubsetPdf(Array.from({ length: total - position0 - 1 }, (_, i) => position0 + 1 + i))
      downloadFile(secondBytes, `${baseName}-part2.pdf`)
      showToast('PDF split into 2 files.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to split PDF.', 'error')
    }
  }, [pageManagerApi, buildFlattenedSubsetPdf, pdfDoc.fileName, showToast])

  // Whole-document tools (page numbers/header-footer/watermark/Bates) bake
  // straight into the base document — no page-count change, so unlike Phase
  // 7's ops this needs no annotation/page remap, just a toast that it isn't
  // undoable (documentToolsApi.applyX already handled reloading pdfDoc and
  // re-detecting form fields).
  const handleApplyDocumentTool = useCallback(async (settings) => {
    const apply = {
      'page-numbers': documentToolsApi.applyPageNumbers,
      bates: documentToolsApi.applyBatesNumbering,
      'header-footer': documentToolsApi.applyHeaderFooter,
      watermark: documentToolsApi.applyWatermark,
    }[documentToolMode]
    setDocumentToolLoading(true)
    try {
      await apply(settings)
      setDocumentToolMode(null)
      showToast('Applied — download to save a copy.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to apply.', 'error')
    } finally {
      setDocumentToolLoading(false)
    }
  }, [documentToolMode, showToast, documentToolsApi])

  // Dismiss the "click a tool to start editing" hint automatically once the
  // user has actually placed one — it's only useful before their first move.
  useEffect(() => {
    if (annotationsApi.annotations.length > 0) setShowOnboardingHint(false)
  }, [annotationsApi.annotations.length])

  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), [])

  // Body scroll lock while the fullscreen overlay is open — matches
  // Header.jsx's existing mobile-nav-sheet pattern.
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isFullscreen])

  // Focus the dialog on entering fullscreen, trap Tab within it, and return
  // focus to the toggle button on exit — same idiom as Header.jsx's mobile
  // nav sheet. Escape is deliberately NOT bound here: it already has a job
  // (deselect / reset tool, in the keydown handler below) and overloading it
  // to also close fullscreen would surprise a user mid-edit. Closing is via
  // the toggle button only.
  useEffect(() => {
    if (!isFullscreen) return
    const overlay = overlayRef.current
    if (!overlay) return
    overlay.focus()

    function getFocusable() {
      return Array.from(
        overlay.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => el.offsetParent !== null)
    }

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      fullscreenBtnRef.current?.focus()
    }
  }, [isFullscreen])

  const [viewMode, setViewMode] = useState('single')
  // Display-only page rotation (View ribbon tab) — never baked into the
  // downloaded PDF. Interaction (drawing/selecting/typing) is disabled
  // while rotated (PageCanvas's `locked` prop skips rendering the
  // annotation/form layers entirely) rather than trying to make the
  // drag/crop/anchor pointer math rotation-aware, which would otherwise be
  // a real source of silently-wrong annotation placement.
  const [viewRotation, setViewRotation] = useState(0)
  const PAGE_ROW_GAP = 24 // matches the viewer div's gap-6 (used both ways)

  // Shared by the auto-fit effect below and the toolbar's explicit "Fit
  // Width"/"Fit Page" buttons — `pagesPerRow` accounts for two-page view
  // needing to fit N page widths plus the gaps between them, not just one
  // page; `mode` picks whether height is also constrained (Fit Page) or
  // only width (Fit Width, the existing default). Destructures
  // `getPage`/`isReady` (not the whole `pdfDoc` object) for the same reason
  // PageCanvas.jsx does — usePdfDoc() returns a fresh object every render,
  // which would otherwise re-fire this on every unrelated state change.
  const { isReady, getPage } = pdfDoc
  const computeFit = useCallback(async (pagesPerRow, mode) => {
    const page = await getPage(1)
    const container = viewerRef.current
    if (!page || !container) return null
    const viewport = page.getViewport({ scale: RENDER_SCALE })
    const availableWidth = container.clientWidth - 48 - PAGE_ROW_GAP * (pagesPerRow - 1) // p-6 padding, 24px each side
    if (availableWidth <= 0 || viewport.width <= 0) return null
    const widthZoom = availableWidth / (viewport.width * pagesPerRow)
    let fitZoom = widthZoom
    if (mode === 'page') {
      const availableHeight = container.clientHeight - 48
      if (availableHeight <= 0 || viewport.height <= 0) return null
      fitZoom = Math.min(widthZoom, availableHeight / viewport.height)
    }
    return Math.max(ZOOM_LEVELS[0], Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], fitZoom))
  }, [getPage])

  const handleFitWidth = useCallback(async () => {
    const fitZoom = await computeFit(viewMode === 'two-page' ? 2 : 1, 'width')
    if (fitZoom != null) setZoom(fitZoom)
  }, [computeFit, viewMode])

  const handleFitPage = useCallback(async () => {
    const fitZoom = await computeFit(viewMode === 'two-page' ? 2 : 1, 'page')
    if (fitZoom != null) setZoom(fitZoom)
  }, [computeFit, viewMode])

  const handleRotateView = useCallback(() => {
    setViewRotation((r) => (r + 90) % 360)
  }, [])

  // Fit-to-width default zoom: 100% was routinely wider than the available
  // viewer column (see the items-start comment below), leaving the page
  // "cut off" on the right with no visible way to discover the horizontal
  // scrollbar. Depends on isFullscreen and viewMode too — re-fits when
  // toggling either, since the available-width-per-page changes a lot
  // between embedded/fullscreen and single/two-page (this does mean a
  // manual zoom resets on toggling either; accepted tradeoff for always
  // landing on a sane default). Always fits to width, not page, on
  // auto-fit — Fit Page stays an explicit opt-in from the View ribbon.
  useEffect(() => {
    if (!isReady) return
    let cancelled = false
    computeFit(viewMode === 'two-page' ? 2 : 1, 'width').then((fitZoom) => {
      if (!cancelled && fitZoom != null) setZoom(fitZoom)
    })
    return () => { cancelled = true }
  }, [isReady, isFullscreen, viewMode, computeFit])

  const zoomBy = useCallback((direction) => {
    setZoom((current) => {
      const idx = ZOOM_LEVELS.indexOf(current)
      const nextIdx = idx === -1 ? ZOOM_LEVELS.indexOf(DEFAULT_ZOOM) : idx + direction
      return ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, nextIdx))]
    })
  }, [])

  const jumpToPage = useCallback((pageNumber) => {
    setActivePage(pageNumber)
    // Not target.scrollIntoView() — that bubbles up through every scrollable
    // ancestor including the window itself, so clicking a thumbnail scrolled
    // the whole page and hid the sticky Toolbar above the viewer entirely.
    // Scrolling viewerRef's own scrollTop by the measured delta keeps the
    // jump contained to this panel.
    const container = viewerRef.current
    const target = document.getElementById(`pdf-editor-page-${pageNumber}`)
    if (container && target) {
      const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top
      container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' })
    }
  }, [])

  // Edit ribbon's "Form Fill" button — jumps to the first fillable field's
  // page (fields are always fillable in place already, via FormFieldLayer;
  // this just makes them discoverable from the ribbon instead of only via
  // the contextual "this PDF has N fillable field(s)" banner).
  const handleJumpToFirstField = useCallback(() => {
    if (!formFieldsApi.hasFields) {
      showToast('This PDF has no fillable form fields.', 'info')
      return
    }
    const firstPage = formFieldsApi.fields[0]?.page
    if (firstPage) jumpToPage(firstPage)
  }, [formFieldsApi.hasFields, formFieldsApi.fields, jumpToPage, showToast])

  // Shared by Download and Protect (Phase 9): loads a fresh pdf-lib doc from
  // the pristine source, draws every annotation in creation order, and
  // fills+flattens any AcroForm values — everything short of the final
  // `.save()`, since Download saves plain and Protect additionally calls
  // `.encrypt()` first.
  const buildFlattenedPdfLibDoc = useCallback(async () => {
    const pdfLibDoc = await PDFDocument.load(originalBytesRef.current)
    for (const ann of annotationsApi.annotations) {
      const page = pdfLibDoc.getPage(ann.page - 1)
      // eslint-disable-next-line no-await-in-loop -- annotations must draw in
      // creation order so overlapping shapes stack the same as on-screen
      await drawAnnotation(pdfLibDoc, page, ann)
    }
    if (formFieldsApi.hasFields) {
      const form = pdfLibDoc.getForm()
      for (const [name, value] of Object.entries(formFieldsApi.values)) {
        try {
          const field = form.getField(name)
          if (field instanceof PDFTextField) field.setText(value ? String(value) : undefined)
          else if (field instanceof PDFCheckBox) { if (value) field.check(); else field.uncheck() }
          else if ((field instanceof PDFRadioGroup || field instanceof PDFDropdown) && value) field.select(value)
        } catch {
          // A field detected on-screen that pdf-lib's own getField(name)
          // can't find (shouldn't happen, but this is user-facing data
          // loss territory) — skip that one field rather than abort the
          // whole download.
        }
      }
      // Matches the annotation-flatten philosophy already used for
      // drawAnnotation above (batch-36-plan.md's Phase 1 decision):
      // filled values become permanent static content.
      form.flatten()
    }
    return pdfLibDoc
  }, [annotationsApi.annotations, formFieldsApi.hasFields, formFieldsApi.values])

  const handleDownload = useCallback(async () => {
    if (!originalBytesRef.current) return
    try {
      const pdfLibDoc = await buildFlattenedPdfLibDoc()
      const bytes = await pdfLibDoc.save()
      const baseName = (pdfDoc.fileName || 'document').replace(/\.pdf$/i, '')
      downloadFile(bytes, `${baseName}-edited.pdf`)
      showToast('PDF downloaded.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to generate the PDF.', 'error')
    }
  }, [buildFlattenedPdfLibDoc, pdfDoc.fileName, showToast])

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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setShowFindReplace(true)
        return
      }
      if (inTextField) return
      if (e.key === 'Escape') {
        annotationsApi.clearSelection()
        setActiveTool(TOOLS.SELECT)
        setPendingImage(null)
        setCroppingId(null)
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

  const pagesPerRow = viewMode === 'two-page' ? 2 : 1
  const pageRows = []
  for (let n = 1; n <= pdfDoc.pageCount; n += pagesPerRow) {
    pageRows.push(Array.from({ length: Math.min(pagesPerRow, pdfDoc.pageCount - n + 1) }, (_, i) => n + i))
  }

  const editorBody = (
    <div className="space-y-4">
      <RibbonToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        zoom={zoom}
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewRotation={viewRotation}
        onRotateView={handleRotateView}
        canUndo={annotationsApi.canUndo}
        canRedo={annotationsApi.canRedo}
        onUndo={annotationsApi.undo}
        onRedo={annotationsApi.redo}
        onDownload={handleDownload}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        fullscreenBtnRef={fullscreenBtnRef}
        onInsertImageClick={() => imageInputRef.current?.click()}
        aiLoading={aiApi.loading}
        onSummarize={handleSummarize}
        onTranslateHindi={() => handleTranslate('hi')}
        onTranslateUrdu={() => handleTranslate('ur')}
        onExtractTables={handleExtractTables}
        onExtractTablesXlsx={handleExtractTablesXlsx}
        onFindReplaceClick={() => setShowFindReplace(true)}
        onExportWord={handleExportWord}
        onDocumentToolPick={setDocumentToolMode}
        fileName={pdfDoc.fileName}
        activePage={activePage}
        pageCount={pdfDoc.pageCount}
        onInsertBlank={handleInsertBlank}
        onDuplicate={handleDuplicatePage}
        onRequestDelete={requestDeletePage}
        onMovePage={handleMovePage}
        onSplitAfter={handleSplitAfter}
        onExtractCurrentPage={handleExtractCurrentPage}
        hasFormFields={formFieldsApi.hasFields}
        onFormFillClick={handleJumpToFirstField}
        onAutoFillClick={() => setShowProfileModal(true)}
      />

      {viewRotation !== 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 text-amber-700 text-sm rounded-m px-4 py-2 border border-amber-200">
          <span>🔄 Viewing rotated {viewRotation}° — display-only (not saved to the PDF). Annotations and form fields are hidden while rotated; reset to 0° to edit.</span>
          <button
            type="button"
            onClick={() => setViewRotation(0)}
            className="shrink-0 px-3 py-1 rounded-s bg-amber-600 text-white text-xs font-medium whitespace-nowrap"
          >
            Reset rotation
          </button>
        </div>
      )}

      {showOnboardingHint && (
        <div className="flex items-center justify-between gap-3 bg-cobalt-tint text-cobalt text-sm rounded-m px-4 py-2">
          <span>👆 Click a tool above to start editing — drag on the page to draw, or click to place text, notes, and stamps.</span>
          <button
            type="button"
            onClick={() => setShowOnboardingHint(false)}
            aria-label="Dismiss hint"
            className="shrink-0 hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {formFieldsApi.hasFields && (
        <div className="flex items-center justify-between gap-3 bg-cobalt-tint text-cobalt text-sm rounded-m px-4 py-2">
          <span>
            📝 This PDF has {new Set(formFieldsApi.fields.map((f) => f.name)).size} fillable field(s) —
            fill them directly on the page, or use your saved profile.
          </span>
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="shrink-0 px-3 py-1 rounded-s bg-cobalt text-white text-xs font-medium whitespace-nowrap"
          >
            Autofill
          </button>
        </div>
      )}

      <div className="flex gap-4 items-start">
        <PagePanel
          pdfDoc={pdfDoc}
          pageCount={pdfDoc.pageCount}
          activePage={activePage}
          onJumpToPage={jumpToPage}
          collapsed={pagePanelCollapsed}
          onToggleCollapsed={() => setPagePanelCollapsed((c) => !c)}
          selectedForExtract={extractSelected}
          onToggleExtractSelect={toggleExtractSelect}
          onExtractSelected={handleExtractSelected}
          onInsertBlank={handleInsertBlank}
          onDuplicate={handleDuplicatePage}
          onRequestDelete={requestDeletePage}
          onMovePage={handleMovePage}
          onSplitAfter={handleSplitAfter}
        />

        {/* items-start (not items-center): center-alignment on an
            overflowing child scrolls symmetrically, which started the view
            mid-page rather than at its left edge whenever the page was
            wider than the available column. The fit-to-width effect above
            now sizes the default zoom to actually fit, but items-start
            stays as the fallback for whatever doesn't (very narrow windows,
            a manual zoom-in past the fit level). */}
        <div ref={viewerRef} className="flex-1 flex flex-col items-start gap-6 bg-canvas p-6 rounded-m overflow-auto max-h-[75vh]">
          {/* Two-page mode groups pages into side-by-side rows (1-2, 3-4, ...
              — no book-style cover-page offset, see docs/batches/batch-40-plan.md);
              single mode is the same one-page-per-row shape as before. Every
              page keeps its own id="pdf-editor-page-N" wrapper regardless of
              mode, so jumpToPage's scroll targeting needs no changes. */}
          {pageRows.map((row) => (
            <div key={row[0]} className="flex items-start gap-6">
              {row.map((pageNumber) => (
                <div
                  key={pageNumber}
                  id={`pdf-editor-page-${pageNumber}`}
                  style={viewRotation ? { transform: `rotate(${viewRotation}deg)` } : undefined}
                >
                  <PageCanvas
                    pageNumber={pageNumber}
                    zoom={zoom}
                    pdfDoc={pdfDoc}
                    annotationsApi={annotationsApi}
                    formFieldsApi={formFieldsApi}
                    activeTool={activeTool}
                    pendingImage={pendingImage}
                    croppingId={croppingId}
                    onApplyCrop={handleApplyCrop}
                    onCancelCrop={() => setCroppingId(null)}
                    onAnnotationCreated={() => { setActiveTool(TOOLS.SELECT); setPendingImage(null) }}
                    locked={viewRotation !== 0}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <PropertiesPanel
          annotation={annotationsApi.selected}
          onChange={annotationsApi.updateAnnotation}
          onDelete={annotationsApi.deleteAnnotation}
          isCropping={annotationsApi.selected?.id === croppingId}
          onToggleCrop={() => setCroppingId((id) => (id === annotationsApi.selected?.id ? null : annotationsApi.selected?.id))}
        />
      </div>
    </div>
  )

  return (
    <>
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
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" onChange={handleImageFileChange} className="hidden" />

      {!pdfDoc.isReady ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-line rounded-m p-12 text-center text-ink-soft hover:border-cobalt hover:text-cobalt transition-colors"
          >
            {pdfDoc.status === 'loading' ? 'Loading…' : 'Choose a PDF file to edit'}
          </button>
          <p className="text-sm text-ink-soft text-center">
            Once uploaded, the editor opens full-screen with tools to highlight, draw, add text, sign, and more —
            then download your edited copy. Nothing is uploaded to a server.
          </p>
        </div>
      ) : isFullscreen ? (
        // Reuses Header.jsx's exact full-screen-overlay idiom (fixed inset-0,
        // z-[var(--z-modal)], dialog semantics) rather than a new pattern —
        // see docs/backlog.md for why this exists outside Blueprint §10's
        // closed Phase-1 component list.
        <div
          ref={overlayRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="PDF Editor — fullscreen"
          className="fixed inset-0 z-[var(--z-modal)] bg-paper overflow-y-auto p-4"
        >
          {editorBody}
        </div>
      ) : (
        editorBody
      )}
    </ToolPageShell>
    {showProfileModal && (
      <ProfileModal
        profile={autoFillApi.profile}
        onSave={autoFillApi.save}
        onSaveAndAutofill={(draft) => {
          autoFillApi.save(draft)
          const patch = autoFillApi.matchFields(formFieldsApi.fields, draft)
          formFieldsApi.setValuesBulk(patch)
          setShowProfileModal(false)
          showToast('Profile applied — check the filled fields.', 'success')
        }}
        onClose={() => setShowProfileModal(false)}
      />
    )}
    {aiApi.showConsent && (
      <AiConsentModal onAccept={aiApi.onAcceptConsent} onClose={aiApi.onCancelConsent} />
    )}
    {aiResult && (
      <AiResultModal title={aiResult.title} content={aiResult.content} onClose={() => setAiResult(null)} />
    )}
    {showFindReplace && (
      <FindReplaceBar onReplaceAll={handleReplaceAll} onClose={() => setShowFindReplace(false)} />
    )}
    {pendingDeletePosition != null && (
      <ConfirmModal
        title="Delete this page?"
        message={`This page has ${annotationsApi.getPageAnnotations(pendingDeletePosition + 1).length} annotation(s) on it — they will be deleted along with the page. This can't be undone.`}
        confirmLabel="Delete page"
        onConfirm={() => performDeletePage(pendingDeletePosition)}
        onCancel={() => setPendingDeletePosition(null)}
      />
    )}
    {documentToolMode && (
      <DocumentToolsModal
        mode={documentToolMode}
        loading={documentToolLoading}
        onApply={handleApplyDocumentTool}
        onClose={() => setDocumentToolMode(null)}
      />
    )}
    </>
  )
}
