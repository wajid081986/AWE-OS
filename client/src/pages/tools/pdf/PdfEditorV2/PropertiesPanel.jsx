import { PALETTE, FONT_SIZES, FONT_FAMILIES, STROKE_WIDTHS, STAMP_PRESETS, TOOLS } from './constants'

function Row({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      {children}
    </div>
  )
}

function ColorGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className="w-6 h-6 rounded-full"
          style={{ background: c, border: value === c ? '2px solid #3b82f6' : '1px solid #e5e7eb' }}
        />
      ))}
    </div>
  )
}

function OpacityRow({ value, onChange }) {
  return (
    <Row label={`Opacity: ${Math.round((value ?? 1) * 100)}%`}>
      <input
        type="range"
        min={10}
        max={100}
        value={Math.round((value ?? 1) * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-cobalt"
      />
    </Row>
  )
}

function StrokeWidthRow({ value, onChange }) {
  return (
    <Row label="Stroke width">
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full text-sm border border-line rounded-s px-2 py-1">
        {STROKE_WIDTHS.map((w) => <option key={w} value={w}>{w}px</option>)}
      </select>
    </Row>
  )
}

/** Right sidebar: properties for the currently-selected annotation. */
export default function PropertiesPanel({ annotation, onChange, onDelete, isCropping, onToggleCrop }) {
  if (!annotation) {
    return (
      <aside className="w-56 shrink-0 bg-card border border-line rounded-m p-4 text-sm text-ink-soft">
        Select an annotation to edit its properties.
      </aside>
    )
  }

  const { type } = annotation
  const set = (changes) => onChange(annotation.id, changes)

  return (
    <aside className="w-56 shrink-0 bg-card border border-line rounded-m p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink capitalize">{type}</p>
        <button type="button" onClick={() => onDelete(annotation.id)} className="text-xs text-red-600 hover:underline">Delete</button>
      </div>

      {type === TOOLS.TEXT && (
        <>
          <Row label="Font">
            <select value={annotation.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })} className="w-full text-sm border border-line rounded-s px-2 py-1">
              {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Size">
            <select value={annotation.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} className="w-full text-sm border border-line rounded-s px-2 py-1">
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
            </select>
          </Row>
          <Row label="Style">
            <div className="flex gap-2">
              <button type="button" onClick={() => set({ bold: !annotation.bold })} className={`px-2.5 py-1 rounded-s text-sm font-bold border border-line ${annotation.bold ? 'bg-cobalt text-white' : ''}`}>B</button>
              <button type="button" onClick={() => set({ italic: !annotation.italic })} className={`px-2.5 py-1 rounded-s text-sm italic border border-line ${annotation.italic ? 'bg-cobalt text-white' : ''}`}>I</button>
            </div>
          </Row>
          <Row label="Color"><ColorGrid value={annotation.color} onChange={(c) => set({ color: c })} /></Row>
        </>
      )}

      {type === TOOLS.HIGHLIGHT && (
        <>
          <Row label="Color"><ColorGrid value={annotation.color} onChange={(c) => set({ color: c })} /></Row>
          <OpacityRow value={annotation.opacity} onChange={(o) => set({ opacity: o })} />
        </>
      )}

      {(type === TOOLS.UNDERLINE || type === TOOLS.STRIKETHROUGH || type === TOOLS.DRAW || type === TOOLS.SIGNATURE || type === TOOLS.ARROW) && (
        <>
          <Row label="Color"><ColorGrid value={annotation.color} onChange={(c) => set({ color: c })} /></Row>
          <StrokeWidthRow value={annotation.strokeWidth} onChange={(w) => set({ strokeWidth: w })} />
        </>
      )}

      {(type === TOOLS.RECTANGLE || type === TOOLS.ELLIPSE) && (
        <>
          <Row label="Stroke color"><ColorGrid value={annotation.stroke} onChange={(c) => set({ stroke: c })} /></Row>
          <StrokeWidthRow value={annotation.strokeWidth} onChange={(w) => set({ strokeWidth: w })} />
          <Row label="Fill">
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="checkbox"
                checked={annotation.fill !== 'transparent'}
                onChange={(e) => set({ fill: e.target.checked ? (annotation.stroke || '#111827') : 'transparent' })}
                className="w-3.5 h-3.5 accent-cobalt"
              />
              <span className="text-xs text-ink-soft">Fill color</span>
            </div>
            {annotation.fill !== 'transparent' && <ColorGrid value={annotation.fill} onChange={(c) => set({ fill: c })} />}
          </Row>
          <OpacityRow value={annotation.opacity} onChange={(o) => set({ opacity: o })} />
        </>
      )}

      {type === TOOLS.WHITEOUT && (
        <Row label="Color"><ColorGrid value={annotation.fill} onChange={(c) => set({ fill: c })} /></Row>
      )}

      {type === TOOLS.REDACT && (
        <p className="text-xs text-ink-soft">
          Solid black cover, baked into the download. Like Whiteout, this is
          a visual cover — pdf-lib can't strip the underlying PDF text from
          the file, so a recipient extracting raw text from the PDF could
          still recover what's underneath.
        </p>
      )}

      {type === TOOLS.IMAGE && (
        <>
          <OpacityRow value={annotation.opacity} onChange={(o) => set({ opacity: o })} />
          <button
            type="button"
            onClick={onToggleCrop}
            className={`w-full px-2.5 py-1.5 rounded-s text-sm border border-line ${isCropping ? 'bg-cobalt text-white' : 'text-ink hover:bg-cobalt-tint'}`}
          >
            {isCropping ? 'Cancel crop' : 'Crop image'}
          </button>
        </>
      )}

      {type === TOOLS.STAMP && (
        <>
          <Row label="Text">
            <select value={annotation.text} onChange={(e) => set({ text: e.target.value })} className="w-full text-sm border border-line rounded-s px-2 py-1">
              {STAMP_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
          <Row label="Color"><ColorGrid value={annotation.color} onChange={(c) => set({ color: c })} /></Row>
        </>
      )}

      {type === TOOLS.NOTE && (
        <>
          <Row label="Note text">
            <textarea
              value={annotation.text}
              onChange={(e) => set({ text: e.target.value })}
              className="w-full text-sm border border-line rounded-s px-2 py-1 h-20 resize-none"
            />
          </Row>
          <Row label="Color"><ColorGrid value={annotation.color} onChange={(c) => set({ color: c })} /></Row>
        </>
      )}
    </aside>
  )
}
