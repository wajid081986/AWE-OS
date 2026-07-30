import { useEffect, useRef, useState } from 'react'
import { TOOLS } from './constants'

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
  { id: TOOLS.CALLOUT, label: 'Callout', icon: '💬', key: 'C' },
  { id: TOOLS.LINK, label: 'Link', icon: '🔗', key: 'L' },
  { id: TOOLS.WHITEOUT, label: 'Whiteout', icon: '▢', key: 'W' },
  { id: TOOLS.REDACT, label: 'Redact', icon: '⬛', key: 'X' },
  { id: TOOLS.STAMP, label: 'Stamp', icon: '⏹', key: 'S' },
  { id: TOOLS.SIGNATURE, label: 'Signature', icon: '✒', key: '' },
]

/** Dropdown menu for the AI Tools button — Summarize/Translate/Extract Tables
 * are the only PdfEditorV2 features that send anything to a server, hence a
 * single menu instead of 3 more buttons in an already-dense tool row. */
function AiToolsMenu({ disabled, onSummarize, onTranslateHindi, onTranslateUrdu, onExtractTables, onExtractTablesXlsx }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function pick(action) {
    setOpen(false)
    action()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-s text-sm whitespace-nowrap text-ink hover:bg-cobalt-tint disabled:opacity-40"
      >
        <span aria-hidden>✨</span>
        <span>AI Tools</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-line rounded-m shadow-card z-20 py-1">
          <button type="button" onClick={() => pick(onSummarize)} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Summarize</button>
          <button type="button" onClick={() => pick(onTranslateHindi)} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Translate to Hindi</button>
          <button type="button" onClick={() => pick(onTranslateUrdu)} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Translate to Urdu</button>
          <button type="button" onClick={() => pick(onExtractTables)} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Extract Tables (CSV)</button>
          <button type="button" onClick={() => pick(onExtractTablesXlsx)} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Extract Tables (Excel)</button>
        </div>
      )}
    </div>
  )
}

/** Dropdown menu for whole-document operations (Phase 8) — Page Numbers,
 * Header/Footer, Watermark, Bates Numbering each open DocumentToolsModal in
 * the matching mode. Same idiom as AiToolsMenu above. */
function DocumentToolsMenu({ onPick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function pick(mode) {
    setOpen(false)
    onPick(mode)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-s text-sm whitespace-nowrap text-ink hover:bg-cobalt-tint"
      >
        <span aria-hidden>📄</span>
        <span>Document</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-line rounded-m shadow-card z-20 py-1">
          <button type="button" onClick={() => pick('page-numbers')} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Page Numbers</button>
          <button type="button" onClick={() => pick('header-footer')} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Header / Footer</button>
          <button type="button" onClick={() => pick('watermark')} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Watermark</button>
          <button type="button" onClick={() => pick('bates')} className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cobalt-tint">Bates Numbering</button>
        </div>
      )}
    </div>
  )
}

/** Sticky top toolbar: tool selection, zoom, undo/redo, download, fullscreen. */
export default function Toolbar({
  activeTool, onToolChange, zoom, onZoomIn, onZoomOut, onFitWidth, viewMode, onViewModeChange, canUndo, canRedo, onUndo, onRedo, onDownload,
  isFullscreen, onToggleFullscreen, fullscreenBtnRef, onInsertImageClick,
  aiLoading, onSummarize, onTranslateHindi, onTranslateUrdu, onExtractTables, onExtractTablesXlsx,
  onFindReplaceClick, onExportWord, onDocumentToolPick, onProtectClick,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-card border border-line rounded-m p-2">
      {TOOL_BUTTONS.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.key ? `${t.label} (${t.key})` : t.label}
          onClick={() => onToolChange(t.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-s text-sm whitespace-nowrap ${activeTool === t.id ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
        >
          <span aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
          {t.key && <span className={activeTool === t.id ? 'text-white/70' : 'text-ink-soft'}>({t.key})</span>}
        </button>
      ))}
      {/* Not a plain onToolChange button — picking a file arms the tool
          (see index.jsx's handleImageFileChange), so this opens the hidden
          file input instead of switching tools directly. */}
      <button
        type="button"
        title="Insert Image"
        onClick={onInsertImageClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-s text-sm whitespace-nowrap ${activeTool === TOOLS.IMAGE ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
      >
        <span aria-hidden>🖼️</span>
        <span>Image</span>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={onZoomOut} className="px-2 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Zoom out">−</button>
        <span className="text-xs text-ink-soft w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={onZoomIn} className="px-2 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Zoom in">+</button>
        <button type="button" onClick={onFitWidth} title="Fit width" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint text-sm whitespace-nowrap">Fit Width</button>
        <div className="flex rounded-s border border-line overflow-hidden" role="group" aria-label="Page view mode">
          <button
            type="button"
            onClick={() => onViewModeChange('single')}
            title="Single page"
            aria-pressed={viewMode === 'single'}
            className={`px-2 py-1.5 text-sm ${viewMode === 'single' ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
          >
            <span aria-hidden>📄</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('two-page')}
            title="Two-page view"
            aria-pressed={viewMode === 'two-page'}
            className={`px-2 py-1.5 text-sm ${viewMode === 'two-page' ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
          >
            <span aria-hidden>📑</span>
          </button>
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo} className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40">Undo</button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40">Redo</button>
        <button type="button" onClick={onFindReplaceClick} title="Find & Replace (Ctrl+F)" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Find & Replace">
          <span aria-hidden>🔍</span>
        </button>
        <DocumentToolsMenu onPick={onDocumentToolPick} />
        {/* Ends the editing session with an encrypted download (see
            SecurityModal.jsx) rather than baking into the live document like
            DocumentToolsMenu — kept as its own button, not folded into that
            menu, so the two different mental models (keep editing vs. final
            encrypted export) aren't implied to behave the same way. */}
        <button type="button" onClick={onProtectClick} title="Password protect / permissions" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Protect PDF">
          <span aria-hidden>🔐</span>
        </button>
        <AiToolsMenu
          disabled={aiLoading}
          onSummarize={onSummarize}
          onTranslateHindi={onTranslateHindi}
          onTranslateUrdu={onTranslateUrdu}
          onExtractTables={onExtractTables}
          onExtractTablesXlsx={onExtractTablesXlsx}
        />
        {/* Client-side only (no server call, no consent needed) — text-only
            reflow via docx, unlike the AI Tools menu's server-backed items. */}
        <button type="button" onClick={onExportWord} title="Export to Word (text only, no layout)" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint text-sm whitespace-nowrap">
          Export Word
        </button>
        <button type="button" onClick={onDownload} className="px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium">Download</button>
        <button
          ref={fullscreenBtnRef}
          type="button"
          onClick={onToggleFullscreen}
          className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <span aria-hidden>{isFullscreen ? '✕' : '⛶'}</span>
        </button>
      </div>
    </div>
  )
}
