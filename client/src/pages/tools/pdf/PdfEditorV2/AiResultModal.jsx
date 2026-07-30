import { useEffect } from 'react'

/** Read-only display for Summarize/Translate results. Extract Tables skips
 * this — it downloads a CSV directly instead of showing text. */
export default function AiResultModal({ title, content, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg bg-card border border-line rounded-m shadow-card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">✕</button>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-ink whitespace-pre-wrap">{content}</p>
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-line">
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(content)}
            className="px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}
