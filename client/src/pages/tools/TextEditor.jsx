import { useState, useRef, useCallback, useEffect } from 'react'
import ToolPageShell from './ToolPageShell'
import { exportTxt, exportHtml, exportDocx } from './textEditorUtils'
import { TOOL_ABOUT } from '../../data/toolPageContent'

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]
const LINE_HEIGHTS = [
  { label: 'Single', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: 'Double', value: '2' },
  { label: '2.5', value: '2.5' },
]
const PAGE_HEIGHT_PX = 1123
const PALETTE = ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#6b7280']

const escapeAttr = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeHtml = escapeAttr

// ── Toolbar button ────────────────────────────────────────────────────────────
function ToolbarBtn({ onClick, active, title, children, className = '' }) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />
}

// ── Insert Table modal ────────────────────────────────────────────────────────
function TableModal({ onInsert, onClose }) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Insert Table</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Rows</label>
              <input type="number" min={1} max={20} value={rows} onChange={e => setRows(Math.max(1, Math.min(20, +e.target.value)))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Columns</label>
              <input type="number" min={1} max={10} value={cols} onChange={e => setCols(Math.max(1, Math.min(10, +e.target.value)))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onInsert(rows, cols)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Insert</button>
        </div>
      </div>
    </div>
  )
}

// ── Insert Link modal ─────────────────────────────────────────────────────────
function LinkModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Insert Link</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display text</label>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Link text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => url && onInsert(url, text || url)} disabled={!url}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">Insert</button>
        </div>
      </div>
    </div>
  )
}

// ── Insert Image (URL only) modal ────────────────────────────────────────────
function ImageModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Insert Image</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
            🔒 Image-by-URL only — no file upload, consistent with AWE-OS's no-server-upload promise.
          </p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Image URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Alt text (optional)</label>
            <input value={alt} onChange={e => setAlt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => url && onInsert(url, alt)} disabled={!url}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">Insert</button>
        </div>
      </div>
    </div>
  )
}

// ── Find & Replace modal ──────────────────────────────────────────────────────
function FindReplaceModal({ onReplaceAll, onClose }) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [count, setCount] = useState(null)
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Find &amp; Replace</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Find</label>
            <input value={find} onChange={e => { setFind(e.target.value); setCount(null) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Replace with</label>
            <input value={replace} onChange={e => setReplace(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {count !== null && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Replaced {count} occurrence{count !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Close</button>
          <button onClick={() => find && setCount(onReplaceAll(find, replace))} disabled={!find}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">Replace All</button>
        </div>
      </div>
    </div>
  )
}

// ── Main editor tool ──────────────────────────────────────────────────────────
function TextEditorTool() {
  const editorRef = useRef(null)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [pageCount, setPageCount] = useState(1)
  const [tableOpen, setTableOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)

  const updateStats = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const text = el.innerText || ''
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    setWordCount(words)
    setCharCount(text.length)
    setPageCount(Math.max(1, Math.ceil(el.offsetHeight / PAGE_HEIGHT_PX)))
  }, [])

  useEffect(() => {
    const onSelectionChange = () => {
      const el = editorRef.current
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return
      const preRange = document.createRange()
      preRange.selectNodeContents(el)
      preRange.setEnd(sel.focusNode, sel.focusOffset)
      const lines = preRange.toString().split('\n')
      setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    updateStats()
  }, [updateStats])

  // execCommand('fontSize') only supports legacy sizes 1-7 — apply it as a
  // marker then rewrite the resulting <font size="7"> spans to a precise px
  // value (standard workaround, no native px-accurate execCommand exists).
  const applyFontSize = useCallback((px) => {
    editorRef.current?.focus()
    document.execCommand('fontSize', false, '7')
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      el.removeAttribute('size')
      el.style.fontSize = `${px}px`
    })
    updateStats()
  }, [updateStats])

  const applyLineHeight = useCallback((value) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    let node = sel.anchorNode
    while (node && node !== editorRef.current && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE']
    while (node && node !== editorRef.current && !blockTags.includes(node.tagName)) node = node.parentNode
    if (node && node !== editorRef.current) node.style.lineHeight = value
    else if (editorRef.current) editorRef.current.style.lineHeight = value
  }, [])

  const insertHtml = useCallback((html) => exec('insertHTML', html), [exec])

  const insertTable = (rows, cols) => {
    let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0;">'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) html += '<td style="border:1px solid #999;padding:6px 10px;min-width:48px;">&nbsp;</td>'
      html += '</tr>'
    }
    html += '</table><p><br></p>'
    insertHtml(html)
    setTableOpen(false)
  }

  const insertLink = (url, text) => {
    insertHtml(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`)
    setLinkOpen(false)
  }

  const insertImage = (url, alt) => {
    insertHtml(`<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" style="max-width:100%;height:auto;" />`)
    setImageOpen(false)
  }

  const replaceAll = (find, replace) => {
    const el = editorRef.current
    if (!el) return 0
    let count = 0
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const nodes = []
    let n
    // eslint-disable-next-line no-cond-assign
    while ((n = walker.nextNode())) nodes.push(n)
    for (const textNode of nodes) {
      const occurrences = textNode.textContent.split(find).length - 1
      if (occurrences > 0) {
        textNode.textContent = textNode.textContent.split(find).join(replace)
        count += occurrences
      }
    }
    updateStats()
    return count
  }

  const handlePrint = () => window.print()

  return (
    <div className="text-editor-root">
      <style>{`
        .te-print-page:empty::before {
          content: 'Start typing your document…';
          color: #9ca3af;
          pointer-events: none;
        }
        @media print {
          body * { visibility: hidden; }
          .te-print-page, .te-print-page * { visibility: visible; }
          .te-print-page { position: absolute; left: 0; top: 0; width: auto; min-height: 0; box-shadow: none; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white border border-gray-200 rounded-t-xl px-2 py-2 flex flex-wrap items-center gap-1">
        <ToolbarBtn title="Undo" onClick={() => exec('undo')}>↩</ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => exec('redo')}>↪</ToolbarBtn>
        <Divider />

        <select onChange={e => { exec('formatBlock', `<${e.target.value}>`); e.target.value = '' }}
          defaultValue="" className="h-8 text-xs border border-gray-200 rounded-lg px-1.5 bg-white" title="Paragraph style">
          <option value="" disabled>Style</option>
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <select onChange={e => exec('fontName', e.target.value)} defaultValue=""
          className="h-8 text-xs border border-gray-200 rounded-lg px-1.5 bg-white w-[130px]" title="Font family">
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select onChange={e => applyFontSize(+e.target.value)} defaultValue="14"
          className="h-8 text-xs border border-gray-200 rounded-lg px-1 bg-white w-[58px]" title="Font size">
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Divider />

        <ToolbarBtn title="Bold" onClick={() => exec('bold')}><b>B</b></ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => exec('italic')}><i>I</i></ToolbarBtn>
        <ToolbarBtn title="Underline" onClick={() => exec('underline')}><span className="underline">U</span></ToolbarBtn>
        <ToolbarBtn title="Strikethrough" onClick={() => exec('strikeThrough')}><span className="line-through">S</span></ToolbarBtn>
        <Divider />

        <label className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 cursor-pointer flex-shrink-0" title="Text color">
          <input type="color" defaultValue="#111827" className="w-full h-full cursor-pointer border-0"
            onChange={e => exec('foreColor', e.target.value)} />
        </label>
        <label className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 cursor-pointer flex-shrink-0" title="Highlight color">
          <input type="color" defaultValue="#fef08a" className="w-full h-full cursor-pointer border-0"
            onChange={e => { editorRef.current?.focus(); document.execCommand('hiliteColor', false, e.target.value) || document.execCommand('backColor', false, e.target.value); updateStats() }} />
        </label>
        <Divider />

        <ToolbarBtn title="Align left" onClick={() => exec('justifyLeft')}>⯇</ToolbarBtn>
        <ToolbarBtn title="Align center" onClick={() => exec('justifyCenter')}>≡</ToolbarBtn>
        <ToolbarBtn title="Align right" onClick={() => exec('justifyRight')}>⯈</ToolbarBtn>
        <ToolbarBtn title="Justify" onClick={() => exec('justifyFull')}>☰</ToolbarBtn>

        <select onChange={e => applyLineHeight(e.target.value)} defaultValue=""
          className="h-8 text-xs border border-gray-200 rounded-lg px-1.5 bg-white" title="Line height">
          <option value="" disabled>Line height</option>
          {LINE_HEIGHTS.map(lh => <option key={lh.value} value={lh.value}>{lh.label}</option>)}
        </select>
        <Divider />

        <ToolbarBtn title="Bullet list" onClick={() => exec('insertUnorderedList')}>• ≡</ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => exec('insertOrderedList')}>1. ≡</ToolbarBtn>
        <ToolbarBtn title="Indent" onClick={() => exec('indent')}>⇥</ToolbarBtn>
        <ToolbarBtn title="Outdent" onClick={() => exec('outdent')}>⇤</ToolbarBtn>
        <ToolbarBtn title="Blockquote" onClick={() => exec('formatBlock', '<blockquote>')}>❝</ToolbarBtn>
        <Divider />

        <ToolbarBtn title="Insert table" onClick={() => setTableOpen(true)}>▦</ToolbarBtn>
        <ToolbarBtn title="Insert horizontal rule" onClick={() => exec('insertHorizontalRule')}>―</ToolbarBtn>
        <ToolbarBtn title="Insert link" onClick={() => setLinkOpen(true)}>🔗</ToolbarBtn>
        <ToolbarBtn title="Insert image (URL)" onClick={() => setImageOpen(true)}>🖼</ToolbarBtn>
        <ToolbarBtn title="Find & Replace" onClick={() => setFindOpen(true)}>🔍</ToolbarBtn>
      </div>

      {/* Export bar */}
      <div className="border-x border-b border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 font-medium">🔒 Never uploaded — stays in your browser</span>
        <div className="flex-1" />
        <button onClick={() => exportTxt(editorRef.current)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Download .txt</button>
        <button onClick={() => exportHtml(editorRef.current)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Download .html</button>
        <button onClick={() => exportDocx(editorRef.current)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-100">Download .docx</button>
        <button onClick={handlePrint} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Print</button>
      </div>

      {/* Editor page */}
      <div className="bg-gray-200 rounded-b-xl p-8 flex justify-center overflow-x-auto">
        <div
          ref={editorRef}
          className="te-print-page bg-white shadow-lg"
          style={{ width: 794, minHeight: PAGE_HEIGHT_PX, padding: 96, boxSizing: 'border-box' }}
          contentEditable
          suppressContentEditableWarning
          onInput={updateStats}
          role="textbox"
          aria-multiline="true"
          aria-label="Document editor"
        />
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 text-xs text-gray-500 border-x border-b border-gray-200 rounded-b-xl bg-white">
        <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
        <span>{charCount} character{charCount !== 1 ? 's' : ''}</span>
        <span>Line {cursorPos.line}, Col {cursorPos.col}</span>
        <span className="ml-auto">Page 1 of {pageCount}</span>
      </div>

      {tableOpen && <TableModal onInsert={insertTable} onClose={() => setTableOpen(false)} />}
      {linkOpen && <LinkModal onInsert={insertLink} onClose={() => setLinkOpen(false)} />}
      {imageOpen && <ImageModal onInsert={insertImage} onClose={() => setImageOpen(false)} />}
      {findOpen && <FindReplaceModal onReplaceAll={replaceAll} onClose={() => setFindOpen(false)} />}
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────
const STEPS = [
  'Start typing directly in the page area — no upload, no account, and no server round-trip. Everything you type stays in your browser.',
  'Use the toolbar to format text: font, size, color, headings, alignment, lists, tables, links, and images (inserted by URL only).',
  'Check live word and character counts, and your cursor position, in the status bar at the bottom of the editor.',
  'When you are done, download your document as .txt, .html, or .docx, or send it straight to your printer.',
]
const FAQS = [
  { q: 'Is my document uploaded anywhere while I type?', a: 'No. The AWE-OS Text Editor runs entirely in your browser using a contenteditable page and the docx library for exports — nothing you type is ever transmitted to any server.' },
  { q: 'Can I open an existing Word document in this editor?', a: 'Not yet — this version supports composing a new document and exporting it as .txt, .html, or .docx. Importing an existing .docx file is not supported in this release.' },
  { q: 'Will my formatting (colors, tables, images) be preserved in the .docx export?', a: 'Text formatting (bold, italic, underline, color, highlight, font, size, alignment, headings, lists) and tables are preserved in the exported .docx. Images inserted by URL are embedded using the browser\'s already-loaded copy — if your browser blocks reading a specific image\'s pixel data (some cross-origin image hosts do this), that image is replaced with a text placeholder in the .docx instead of breaking the export.' },
  { q: 'Can I upload an image file instead of pasting a URL?', a: 'No — by design. AWE-OS never uploads files to a server, and supporting local image uploads inside a document editor would blur that promise. Paste a URL to a publicly hosted image instead.' },
  { q: 'Does the page count reflect exactly how many pages will print?', a: 'The "Page N of M" counter is an approximation based on content height against a standard A4 page height — real pagination depends on your printer, margins, and browser print settings, so treat it as a guide, not an exact print preview.' },
]
// about.howToUse/about.faqs dropped — STEPS/FAQS above are the single rendered source for those sections
const { howToUse: _aboutHowToUse, faqs: _aboutFaqs, ...ABOUT } = TOOL_ABOUT['text-editor']

export default function TextEditor() {
  return (
    <ToolPageShell slug="text-editor" name="Online Text Editor" icon="📝"
      description="A free, browser-based rich text editor — format, tabulate, and export documents as .txt, .html, or .docx. No upload, no account."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={'The "Page N of M" count is an approximation (content height ÷ standard A4 height), not true print pagination — and this editor composes new documents only; it cannot open an existing .docx file.'}>
      <TextEditorTool />
    </ToolPageShell>
  )
}
