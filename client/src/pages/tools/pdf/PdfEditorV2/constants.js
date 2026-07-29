// PdfEditorV2 — shared constants: tool ids, defaults, keyboard map, presets.
// See docs/batches/batch-35-plan.md for the overall architecture.

export const TOOLS = {
  SELECT: 'select',
  TEXT: 'text',
  HIGHLIGHT: 'highlight',
  UNDERLINE: 'underline',
  STRIKETHROUGH: 'strikethrough',
  DRAW: 'draw',
  ARROW: 'arrow',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  NOTE: 'note',
  WHITEOUT: 'whiteout',
  STAMP: 'stamp',
  SIGNATURE: 'signature',
}

// Tools that draw by dragging a bounding box (as opposed to a single click,
// like NOTE/STAMP, or a freehand path, like DRAW/SIGNATURE).
export const BOX_DRAG_TOOLS = new Set([
  TOOLS.TEXT, TOOLS.HIGHLIGHT, TOOLS.UNDERLINE, TOOLS.STRIKETHROUGH,
  TOOLS.ARROW, TOOLS.RECTANGLE, TOOLS.ELLIPSE, TOOLS.WHITEOUT,
])

export const FREEHAND_TOOLS = new Set([TOOLS.DRAW, TOOLS.SIGNATURE])
export const CLICK_TOOLS = new Set([TOOLS.NOTE, TOOLS.STAMP])

// key -> tool id. Checked only when focus isn't inside a text input/textarea.
export const KEYBOARD_SHORTCUTS = {
  v: TOOLS.SELECT,
  t: TOOLS.TEXT,
  h: TOOLS.HIGHLIGHT,
  d: TOOLS.DRAW,
  a: TOOLS.ARROW,
  r: TOOLS.RECTANGLE,
  e: TOOLS.ELLIPSE,
  w: TOOLS.WHITEOUT,
  s: TOOLS.STAMP,
  n: TOOLS.NOTE,
}

export const PALETTE = [
  '#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#1e3a8a', '#065f46', '#fef08a', '#ffffff',
]

export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]
export const FONT_FAMILIES = ['Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Arial']
export const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12]
export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0]
export const DEFAULT_ZOOM = 1.0

export const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa', '#f5d0fe', '#ccfbf1',
]

export const STAMP_PRESETS = ['APPROVED', 'REJECTED', 'CONFIDENTIAL', 'DRAFT', 'REVISED', 'VOID', 'COPY', 'FINAL']
export const STAMP_COLORS = { red: '#dc2626', blue: '#1d4ed8', green: '#15803d', purple: '#7c3aed' }

// Per-tool default style applied when a new annotation of that type is created.
export const DEFAULT_ANNOTATION_STYLE = {
  [TOOLS.TEXT]: { color: '#111827', fontSize: 14, fontFamily: FONT_FAMILIES[0], bold: false, italic: false },
  [TOOLS.HIGHLIGHT]: { color: HIGHLIGHT_COLORS[0], opacity: 0.4 },
  [TOOLS.UNDERLINE]: { color: '#ef4444', strokeWidth: 2 },
  [TOOLS.STRIKETHROUGH]: { color: '#ef4444', strokeWidth: 2 },
  [TOOLS.DRAW]: { color: '#111827', strokeWidth: 2, opacity: 1 },
  [TOOLS.ARROW]: { color: '#111827', strokeWidth: 2 },
  [TOOLS.RECTANGLE]: { stroke: '#111827', fill: 'transparent', strokeWidth: 2, opacity: 1 },
  [TOOLS.ELLIPSE]: { stroke: '#111827', fill: 'transparent', strokeWidth: 2, opacity: 1 },
  [TOOLS.NOTE]: { color: HIGHLIGHT_COLORS[0], text: '' },
  [TOOLS.WHITEOUT]: { fill: '#ffffff' },
  [TOOLS.STAMP]: { text: STAMP_PRESETS[0], color: STAMP_COLORS.red },
  [TOOLS.SIGNATURE]: { color: '#111827', strokeWidth: 2 },
}

export const MAX_PDF_SIZE_MB = 25

// Fixed internal render/coordinate scale — annotation x/y/w/h are always
// stored in this space regardless of the visual zoom level (PageCanvas.jsx
// applies zoom as a pure CSS transform), so the pdf-lib flatten step
// (index.jsx) has one unambiguous scale to convert from.
export const RENDER_SCALE = 1.5
