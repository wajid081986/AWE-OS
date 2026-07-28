/**
 * textEditorUtils.js — export helpers for the Online Text Editor tool.
 * Converts the contenteditable DOM into .txt / .html / .docx, entirely
 * client-side (docx builds the OOXML in-memory, Packer.toBlob never
 * touches a server).
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, LevelFormat,
  ShadingType, ImageRun,
} from 'docx'

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Plain text ────────────────────────────────────────────────────────────────
export function exportTxt(editorEl, filename = 'document.txt') {
  downloadBlob(new Blob([editorEl.innerText], { type: 'text/plain' }), filename)
}

// ── Standalone HTML ──────────────────────────────────────────────────────────
export function exportHtml(editorEl, title = 'Document', filename = 'document.html') {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 794px; margin: 40px auto; line-height: 1.5; color: #111; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #999; padding: 4px 8px; }
  blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 16px; color: #555; }
</style>
</head>
<body>
${editorEl.innerHTML}
</body>
</html>`
  downloadBlob(new Blob([html], { type: 'text/html' }), filename)
}

// ── .docx (basic-fidelity OOXML via the `docx` package) ─────────────────────
// Table/image support is best-effort: images inserted by URL are embedded
// using the already-loaded <img>'s natural pixel size (scaled to fit the
// page); if a browser blocks reading the image data (cross-origin canvas
// taint), the image is replaced with a "[Image: url]" text run instead of
// failing the whole export.

const OLD_FONT_SIZE_PT = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 36 }
const ORDERED_LIST_REF = 'te-ordered-list'
const MAX_IMAGE_WIDTH_PX = 500

function normalizeColorToHex(str) {
  if (!str) return null
  const hexMatch = str.match(/^#?([0-9a-f]{6})$/i)
  if (hexMatch) return hexMatch[1].toUpperCase()
  const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) return [1, 2, 3].map(i => Number(rgbMatch[i]).toString(16).padStart(2, '0')).join('').toUpperCase()
  return null
}

function collectRuns(node, fmt, runs) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) runs.push({ ...fmt, text: node.textContent })
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const tag = node.tagName
  if (tag === 'BR') { runs.push({ ...fmt, text: '\n' }); return }
  if (tag === 'IMG') { runs.push({ ...fmt, image: node }); return }

  const next = { ...fmt }
  const style = node.style || {}
  if (tag === 'B' || tag === 'STRONG' || style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) next.bold = true
  if (tag === 'I' || tag === 'EM' || style.fontStyle === 'italic') next.italics = true
  if (tag === 'U') next.underline = true
  if (tag === 'S' || tag === 'STRIKE' || (style.textDecoration || '').includes('line-through')) next.strike = true
  if (tag === 'A') next.color = next.color || '0000FF'

  if (tag === 'FONT') {
    const colorAttr = node.getAttribute('color')
    if (colorAttr) next.color = normalizeColorToHex(colorAttr) || next.color
    const faceAttr = node.getAttribute('face')
    if (faceAttr) next.font = faceAttr.split(',')[0].trim()
    const sizeAttr = node.getAttribute('size')
    if (sizeAttr && OLD_FONT_SIZE_PT[sizeAttr]) next.sizePt = OLD_FONT_SIZE_PT[sizeAttr]
  }
  if (style.color) next.color = normalizeColorToHex(style.color) || next.color
  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    next.highlight = normalizeColorToHex(style.backgroundColor)
  }
  if (style.fontFamily) next.font = style.fontFamily.replace(/['"]/g, '').split(',')[0].trim()
  if (style.fontSize) next.sizePt = parseFloat(style.fontSize)

  for (const child of node.childNodes) collectRuns(child, next, runs)
}

async function buildRunElements(el) {
  const collected = []
  for (const child of el.childNodes) collectRuns(child, {}, collected)

  const elements = []
  for (const r of collected) {
    if (r.image) {
      const img = r.image
      const naturalW = img.naturalWidth || 300
      const naturalH = img.naturalHeight || 200
      const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / naturalW)
      const w = Math.round(naturalW * scale)
      const h = Math.round(naturalH * scale)
      try {
        const bytes = await imageElementToBytes(img)
        elements.push(new ImageRun({ data: bytes, transformation: { width: w, height: h } }))
      } catch {
        elements.push(new TextRun({ text: `[Image: ${img.getAttribute('src') || ''}]`, italics: true }))
      }
      continue
    }
    if (!r.text) continue
    elements.push(new TextRun({
      text: r.text,
      bold: r.bold || undefined,
      italics: r.italics || undefined,
      underline: r.underline || undefined,
      strike: r.strike || undefined,
      color: r.color || undefined,
      font: r.font || undefined,
      size: r.sizePt ? Math.round(r.sizePt * 2) : undefined,
      shading: r.highlight ? { type: ShadingType.CLEAR, fill: r.highlight } : undefined,
    }))
  }
  return elements.length ? elements : [new TextRun('')]
}

// Draws the already-rendered <img> onto a canvas to read its pixel bytes —
// avoids a second network fetch (which would also hit CORS for most
// external image hosts) since the browser already has the image decoded.
function imageElementToBytes(img) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 300
      canvas.height = img.naturalHeight || 200
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('canvas toBlob failed')); return }
        blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject)
      }, 'image/png')
    } catch (err) {
      reject(err)
    }
  })
}

function alignmentOf(el) {
  const ta = el.style?.textAlign
  if (ta === 'center') return AlignmentType.CENTER
  if (ta === 'right') return AlignmentType.RIGHT
  if (ta === 'justify') return AlignmentType.JUSTIFIED
  return AlignmentType.LEFT
}

async function blockToParagraphs(el) {
  const tag = el.tagName
  if (tag === 'HR') {
    return [new Paragraph({ border: { bottom: { color: 'auto', space: 1, style: BorderStyle.SINGLE, size: 6 } } })]
  }
  if (tag === 'TABLE') return [await tableToDocxTable(el)]
  if (tag === 'UL' || tag === 'OL') {
    const items = []
    for (const li of el.children) {
      if (li.tagName !== 'LI') continue
      const runs = await buildRunElements(li)
      items.push(new Paragraph(
        tag === 'UL'
          ? { children: runs, bullet: { level: 0 } }
          : { children: runs, numbering: { reference: ORDERED_LIST_REF, level: 0 } },
      ))
    }
    return items
  }
  const runs = await buildRunElements(el)
  const opts = { children: runs, alignment: alignmentOf(el) }
  if (tag === 'H1') opts.heading = HeadingLevel.HEADING_1
  else if (tag === 'H2') opts.heading = HeadingLevel.HEADING_2
  else if (tag === 'H3') opts.heading = HeadingLevel.HEADING_3
  else if (tag === 'BLOCKQUOTE') opts.indent = { left: 720 }
  return [new Paragraph(opts)]
}

async function tableToDocxTable(tableEl) {
  const rows = []
  for (const tr of tableEl.querySelectorAll('tr')) {
    const cells = []
    for (const td of tr.children) {
      const runs = await buildRunElements(td)
      cells.push(new TableCell({ children: [new Paragraph({ children: runs })] }))
    }
    rows.push(new TableRow({ children: cells }))
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
}

export async function buildDocxBlob(editorEl) {
  const children = []
  for (const block of editorEl.childNodes) {
    if (block.nodeType === Node.TEXT_NODE) {
      if (block.textContent.trim()) children.push(new Paragraph(block.textContent))
      continue
    }
    if (block.nodeType !== Node.ELEMENT_NODE) continue
    children.push(...await blockToParagraphs(block))
  }
  if (!children.length) children.push(new Paragraph(''))

  const doc = new Document({
    numbering: {
      config: [{
        reference: ORDERED_LIST_REF,
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{ children }],
  })
  return Packer.toBlob(doc)
}

export async function exportDocx(editorEl, filename = 'document.docx') {
  const blob = await buildDocxBlob(editorEl)
  downloadBlob(blob, filename)
}
