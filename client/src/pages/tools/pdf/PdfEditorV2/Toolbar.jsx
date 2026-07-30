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
  { id: TOOLS.WHITEOUT, label: 'Whiteout', icon: '▢', key: 'W' },
  { id: TOOLS.STAMP, label: 'Stamp', icon: '⏹', key: 'S' },
  { id: TOOLS.SIGNATURE, label: 'Signature', icon: '✒', key: '' },
]

/** Sticky top toolbar: tool selection, zoom, undo/redo, download, fullscreen. */
export default function Toolbar({
  activeTool, onToolChange, zoom, onZoomIn, onZoomOut, canUndo, canRedo, onUndo, onRedo, onDownload,
  isFullscreen, onToggleFullscreen, fullscreenBtnRef,
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
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={onZoomOut} className="px-2 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Zoom out">−</button>
        <span className="text-xs text-ink-soft w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={onZoomIn} className="px-2 py-1.5 rounded-s hover:bg-cobalt-tint" aria-label="Zoom in">+</button>
        <button type="button" onClick={onUndo} disabled={!canUndo} className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40">Undo</button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className="px-2.5 py-1.5 rounded-s hover:bg-cobalt-tint disabled:opacity-40">Redo</button>
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
