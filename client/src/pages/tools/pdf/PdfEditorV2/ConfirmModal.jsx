import { useEffect, useRef } from 'react'

/** Generic yes/no confirmation — same fixed-overlay idiom as AiConsentModal.jsx. */
export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    confirmRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md bg-card border border-line rounded-m shadow-card">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-ink mb-2">{title}</h2>
          <p className="text-sm text-ink-soft">{message}</p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
