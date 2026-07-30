import { useState } from 'react'
import { TOOLS } from './constants'

const TABS = [
  { id: 'annotate', label: 'Annotate' },
  { id: 'draw', label: 'Draw' },
  { id: 'insert', label: 'Insert' },
  { id: 'edit', label: 'Edit' },
  { id: 'pages', label: 'Pages' },
  { id: 'security', label: 'Security' },
  { id: 'view', label: 'View' },
  { id: 'ai', label: 'AI Tools' },
]

function Divider() {
  return <div className="w-px self-stretch bg-line mx-1" aria-hidden />
}

/** Ribbon-style tool button: big icon on top, label below, optional
 * shortcut-key badge in the corner. Used by every per-tab *Ribbon
 * component below — one shared shape for the whole ribbon. */
function RibbonButton({ label, icon, shortcut, desc, active, disabled, onClick }) {
  return (
    <button
      type="button"
      title={desc}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 w-20 h-16 rounded-s shrink-0 text-center
        ${active ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}
        disabled:opacity-40 disabled:hover:bg-transparent`}
    >
      {shortcut && (
        <span className={`absolute top-1 right-1 text-[9px] leading-none px-1 rounded-sm ${active ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink-soft'}`}>
          {shortcut}
        </span>
      )}
      <span className="text-3xl leading-none" aria-hidden>{icon}</span>
      <span className="text-[11px] leading-tight px-1">{label}</span>
    </button>
  )
}

function AnnotateRibbon({ activeTool, onToolChange }) {
  const items = [
    { id: TOOLS.TEXT, label: 'Text Box', icon: 'T', key: 'T', desc: 'Insert an editable text box, or click existing PDF text to cover-and-edit it' },
    { id: TOOLS.HIGHLIGHT, label: 'Highlight', icon: '▮', key: 'H', desc: 'Highlight text or an area with a translucent color' },
    { id: TOOLS.UNDERLINE, label: 'Underline', icon: 'U', key: '', desc: 'Draw a line under text' },
    { id: TOOLS.STRIKETHROUGH, label: 'Strike', icon: 'S̶', key: '', desc: 'Draw a line through text' },
    { id: TOOLS.NOTE, label: 'Note', icon: '🗒️', key: 'N', desc: 'Drop a sticky note with your own text' },
    { id: TOOLS.CALLOUT, label: 'Callout', icon: '💬', key: 'C', desc: 'Add a text bubble with a pointer line to something on the page' },
    { id: TOOLS.LINK, label: 'Link', icon: '🔗', key: 'L', desc: 'Add a clickable link to a URL or another page (invisible hotspot in the downloaded PDF)' },
    { id: TOOLS.STAMP, label: 'Stamp', icon: '⏹', key: 'S', desc: 'Add a preset stamp like APPROVED or CONFIDENTIAL' },
  ]
  return items.map((t) => (
    <RibbonButton key={t.id} label={t.label} icon={t.icon} shortcut={t.key} desc={t.desc} active={activeTool === t.id} onClick={() => onToolChange(t.id)} />
  ))
}

function DrawRibbon({ activeTool, onToolChange }) {
  const items = [
    { id: TOOLS.DRAW, label: 'Pencil', icon: '✎', key: 'D', desc: 'Freehand pencil drawing' },
    { id: TOOLS.ARROW, label: 'Arrow', icon: '↗', key: 'A', desc: 'Draw a straight arrow' },
    { id: TOOLS.RECTANGLE, label: 'Rectangle', icon: '▭', key: 'R', desc: 'Draw a rectangle, filled or outlined' },
    { id: TOOLS.ELLIPSE, label: 'Ellipse', icon: '◯', key: 'E', desc: 'Draw an ellipse or circle, filled or outlined' },
    { id: TOOLS.LINE, label: 'Line', icon: '╱', key: '', desc: 'Draw a plain straight line (no arrowhead)' },
    { id: TOOLS.SIGNATURE, label: 'Signature', icon: '✒', key: '', desc: 'Freehand signature, drawn like the Draw tool' },
  ]
  return items.map((t) => (
    <RibbonButton key={t.id} label={t.label} icon={t.icon} shortcut={t.key} desc={t.desc} active={activeTool === t.id} onClick={() => onToolChange(t.id)} />
  ))
}

// Not a plain onToolChange button for Image — picking a file arms the tool
// (see index.jsx's handleImageFileChange), so it opens the hidden file
// input instead of switching tools directly. Page Number/Header/Footer/
// Watermark/Bates open DocumentToolsModal in the matching mode (Header and
// Footer both open the same 'header-footer' mode — that modal already
// edits both fields together, so there's no second modal to build).
function InsertRibbon({ activeTool, onInsertImageClick, onDocumentToolPick }) {
  return (
    <>
      <button
        type="button"
        title="Insert a PNG or JPEG image"
        onClick={onInsertImageClick}
        className={`relative flex flex-col items-center justify-center gap-1 w-20 h-16 rounded-s shrink-0 ${activeTool === TOOLS.IMAGE ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
      >
        <span className="text-3xl leading-none" aria-hidden>🖼️</span>
        <span className="text-[11px] leading-tight">Image</span>
      </button>
      <Divider />
      <RibbonButton label="Page Number" icon="🔢" desc="Add page numbers to every page" onClick={() => onDocumentToolPick('page-numbers')} />
      <RibbonButton label="Header" icon="⬆️" desc="Add header text to every page" onClick={() => onDocumentToolPick('header-footer')} />
      <RibbonButton label="Footer" icon="⬇️" desc="Add footer text to every page" onClick={() => onDocumentToolPick('header-footer')} />
      <RibbonButton label="Watermark" icon="💧" desc="Add a diagonal or straight watermark to every page" onClick={() => onDocumentToolPick('watermark')} />
      <RibbonButton label="Bates No." icon="🔖" desc="Add sequential Bates numbering (e.g. DOC-0001) to every page" onClick={() => onDocumentToolPick('bates')} />
    </>
  )
}

function EditRibbon({ onFindReplaceClick, activeTool, onToolChange, hasFormFields, onFormFillClick, onAutoFillClick }) {
  return (
    <>
      <RibbonButton label="Find & Replace" icon="🔍" desc="Find and replace text across the document (Ctrl+F)" onClick={onFindReplaceClick} />
      <Divider />
      <RibbonButton label="Whiteout" icon="▢" shortcut="W" desc="Cover an area with an opaque white box (does not remove the underlying PDF text)" active={activeTool === TOOLS.WHITEOUT} onClick={() => onToolChange(TOOLS.WHITEOUT)} />
      <RibbonButton label="Redact" icon="⬛" shortcut="X" desc="Cover an area with a permanent solid black box" active={activeTool === TOOLS.REDACT} onClick={() => onToolChange(TOOLS.REDACT)} />
      <Divider />
      <RibbonButton label="Form Fill" icon="📝" desc={hasFormFields ? "Jump to this PDF's first fillable field" : 'This PDF has no fillable form fields'} disabled={!hasFormFields} onClick={onFormFillClick} />
      <RibbonButton label="Auto Fill" icon="👤" desc="Fill form fields from your saved profile" onClick={onAutoFillClick} />
    </>
  )
}

// Operates on the currently-active page (not PagePanel's checkbox
// selection) — reuses the exact same index.jsx handlers PagePanel's
// per-thumbnail hover menu already calls, just a second call site.
function PagesRibbon({ activePage, pageCount, onInsertBlank, onDuplicate, onRequestDelete, onMovePage, onSplitAfter, onExtractCurrentPage }) {
  const position0 = activePage - 1
  return (
    <>
      <RibbonButton label="Insert Page" icon="➕" desc="Insert a blank page after the current page" onClick={() => onInsertBlank(activePage)} />
      <RibbonButton label="Duplicate" icon="📋" desc="Duplicate the current page" onClick={() => onDuplicate(position0)} />
      <RibbonButton label="Delete" icon="🗑️" desc="Delete the current page" disabled={pageCount <= 1} onClick={() => onRequestDelete(position0)} />
      <Divider />
      <RibbonButton label="Move Up" icon="⬆️" desc="Move the current page up" disabled={position0 === 0} onClick={() => onMovePage(position0, position0 - 1)} />
      <RibbonButton label="Move Down" icon="⬇️" desc="Move the current page down" disabled={position0 === pageCount - 1} onClick={() => onMovePage(position0, position0 + 1)} />
      <Divider />
      <RibbonButton label="Extract" icon="📤" desc="Download the current page as its own PDF" onClick={onExtractCurrentPage} />
      <RibbonButton label="Split" icon="✂️" desc="Split the document into two files after the current page" disabled={position0 >= pageCount - 1} onClick={() => onSplitAfter(position0)} />
    </>
  )
}

// Password Protect/Permissions is a labeled, disabled placeholder, not a
// working button — pdf-lib (this project's only PDF-manipulation library)
// has no .encrypt() method, confirmed via live QA on batch-39, which is why
// that feature was built then reverted. Shown disabled with an honest
// tooltip rather than omitted, so its absence doesn't look like an
// oversight. See docs/backlog.md.
function SecurityRibbon({ activeTool, onToolChange }) {
  return (
    <>
      <RibbonButton label="Redact" icon="⬛" shortcut="X" desc="Cover an area with a permanent solid black box" active={activeTool === TOOLS.REDACT} onClick={() => onToolChange(TOOLS.REDACT)} />
      <Divider />
      <div
        title="Coming soon — pdf-lib (this project's PDF library) can't currently write password encryption; see docs/backlog.md"
        className="flex flex-col items-center justify-center gap-1 w-24 h-16 shrink-0 opacity-40 text-center px-1"
      >
        <span className="text-3xl leading-none" aria-hidden>🔒</span>
        <span className="text-[10px] leading-tight">Password Protect (soon)</span>
      </div>
    </>
  )
}

function ViewRibbon({ zoom, onZoomIn, onZoomOut, onFitWidth, onFitPage, viewMode, onViewModeChange, onRotateView, isFullscreen, onToggleFullscreen }) {
  return (
    <>
      <RibbonButton label="Zoom In" icon="➕🔍" desc="Zoom in" onClick={onZoomIn} />
      <RibbonButton label="Zoom Out" icon="➖🔍" desc="Zoom out" onClick={onZoomOut} />
      <div className="flex flex-col items-center justify-center w-16 h-16 shrink-0 text-sm text-ink-soft">{Math.round(zoom * 100)}%</div>
      <Divider />
      <RibbonButton label="Fit Width" icon="↔️" desc="Fit the page to the available width" onClick={onFitWidth} />
      <RibbonButton label="Fit Page" icon="▣" desc="Fit the whole page in view" onClick={onFitPage} />
      <Divider />
      <RibbonButton label="Single Page" icon="📄" active={viewMode === 'single'} desc="One page per row" onClick={() => onViewModeChange('single')} />
      <RibbonButton label="Two Page" icon="📑" active={viewMode === 'two-page'} desc="Two pages side by side" onClick={() => onViewModeChange('two-page')} />
      <Divider />
      <RibbonButton label="Rotate View" icon="🔄" desc="Rotate the view 90° — display only, not saved to the PDF; annotations and form fields are hidden while rotated" onClick={onRotateView} />
      <RibbonButton
        label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        icon={isFullscreen ? '✕' : '⛶'}
        active={isFullscreen}
        desc={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={onToggleFullscreen}
      />
    </>
  )
}

function AiRibbon({ aiLoading, onSummarize, onTranslateHindi, onTranslateUrdu, onExtractTables, onExtractTablesXlsx }) {
  return (
    <>
      <RibbonButton label="Summarize" icon="✨" disabled={aiLoading} desc="Summarize the document — sends extracted text (never the file) to our server" onClick={onSummarize} />
      <RibbonButton label="Translate (Hindi)" icon="🌐" disabled={aiLoading} desc="Translate the document to Hindi" onClick={onTranslateHindi} />
      <RibbonButton label="Translate (Urdu)" icon="🌐" disabled={aiLoading} desc="Translate the document to Urdu" onClick={onTranslateUrdu} />
      <Divider />
      <RibbonButton label="Tables (CSV)" icon="📊" disabled={aiLoading} desc="Extract tables to a CSV file" onClick={onExtractTables} />
      <RibbonButton label="Tables (Excel)" icon="📈" disabled={aiLoading} desc="Extract tables to an Excel file" onClick={onExtractTablesXlsx} />
    </>
  )
}

/**
 * Ribbon-style toolbar: app header (identity + universal actions reachable
 * from any tab) + tab bar + the active tab's ribbon. `activeTab` is purely
 * local UI state — it never affects which tool is actually selected
 * (`activeTool`, owned by index.jsx), so keyboard shortcuts keep working
 * unchanged regardless of which tab happens to be visible.
 */
export default function RibbonToolbar({
  activeTool, onToolChange,
  zoom, onZoomIn, onZoomOut, onFitWidth, onFitPage,
  viewMode, onViewModeChange, viewRotation, onRotateView,
  canUndo, canRedo, onUndo, onRedo, onDownload,
  isFullscreen, onToggleFullscreen, fullscreenBtnRef,
  onInsertImageClick,
  aiLoading, onSummarize, onTranslateHindi, onTranslateUrdu, onExtractTables, onExtractTablesXlsx,
  onFindReplaceClick, onExportWord, onDocumentToolPick,
  fileName,
  activePage, pageCount, onInsertBlank, onDuplicate, onRequestDelete, onMovePage, onSplitAfter, onExtractCurrentPage,
  hasFormFields, onFormFillClick, onAutoFillClick,
}) {
  const [activeTab, setActiveTab] = useState('annotate')

  return (
    <div className="sticky top-0 z-10 bg-card border border-line rounded-m">
      {/* App header — identity plus the handful of actions needed no matter
          which tab is showing (Select, Undo/Redo, Export/Download,
          Fullscreen). Fullscreen is duplicated in the View ribbon too, on
          purpose — exiting fullscreen shouldn't require switching tabs
          first. */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-line">
        <span className="text-lg" aria-hidden>✏️</span>
        <span className="text-sm font-semibold text-ink whitespace-nowrap">PDF Editor</span>
        {fileName && <span className="text-xs text-ink-soft truncate max-w-[220px]" title={fileName}>{fileName}</span>}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title="Select, move, or resize an existing annotation (V)"
            onClick={() => onToolChange(TOOLS.SELECT)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-s text-sm ${activeTool === TOOLS.SELECT ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
          >
            <span aria-hidden>↖</span> Select
          </button>
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40 text-sm">Undo</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40 text-sm">Redo</button>
          {/* Client-side only (no server call, no consent needed) — text-only
              reflow via docx, unlike the AI Tools ribbon's server-backed items. */}
          <button type="button" onClick={onExportWord} title="Export to Word (text only, no layout)" className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint text-sm whitespace-nowrap">Export Word</button>
          <button type="button" onClick={onDownload} title="Download a flattened copy with your annotations embedded" className="px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium">Download</button>
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

      {/* Tab bar — cosmetic only, doesn't touch activeTool */}
      <div className="flex items-center gap-1 px-2 pt-1.5" role="tablist" aria-label="Toolbar sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${activeTab === t.id ? 'border-cobalt text-cobalt' : 'border-transparent text-ink-soft hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab's ribbon */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-t border-line" role="tabpanel">
        {activeTab === 'annotate' && <AnnotateRibbon activeTool={activeTool} onToolChange={onToolChange} />}
        {activeTab === 'draw' && <DrawRibbon activeTool={activeTool} onToolChange={onToolChange} />}
        {activeTab === 'insert' && <InsertRibbon activeTool={activeTool} onInsertImageClick={onInsertImageClick} onDocumentToolPick={onDocumentToolPick} />}
        {activeTab === 'edit' && (
          <EditRibbon
            onFindReplaceClick={onFindReplaceClick}
            activeTool={activeTool}
            onToolChange={onToolChange}
            hasFormFields={hasFormFields}
            onFormFillClick={onFormFillClick}
            onAutoFillClick={onAutoFillClick}
          />
        )}
        {activeTab === 'pages' && (
          <PagesRibbon
            activePage={activePage}
            pageCount={pageCount}
            onInsertBlank={onInsertBlank}
            onDuplicate={onDuplicate}
            onRequestDelete={onRequestDelete}
            onMovePage={onMovePage}
            onSplitAfter={onSplitAfter}
            onExtractCurrentPage={onExtractCurrentPage}
          />
        )}
        {activeTab === 'security' && <SecurityRibbon activeTool={activeTool} onToolChange={onToolChange} />}
        {activeTab === 'view' && (
          <ViewRibbon
            zoom={zoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitWidth={onFitWidth}
            onFitPage={onFitPage}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            viewRotation={viewRotation}
            onRotateView={onRotateView}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        )}
        {activeTab === 'ai' && (
          <AiRibbon
            aiLoading={aiLoading}
            onSummarize={onSummarize}
            onTranslateHindi={onTranslateHindi}
            onTranslateUrdu={onTranslateUrdu}
            onExtractTables={onExtractTables}
            onExtractTablesXlsx={onExtractTablesXlsx}
          />
        )}
      </div>
    </div>
  )
}
