import { useEffect, useRef } from 'react'

/**
 * Shown once per browser tab session (useAiTools.js gates this via
 * sessionStorage) before the first AI Tools action — Summarize/Translate/
 * Extract Tables are the only features in this editor that send anything to
 * a server; every other tool is fully client-side.
 */
export default function AiConsentModal({ onAccept, onClose }) {
  const acceptRef = useRef(null)

  useEffect(() => {
    acceptRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label="AI features consent" className="w-full max-w-md bg-card border border-line rounded-m shadow-card">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-ink mb-2">Use AI features?</h2>
          <p className="text-sm text-ink-soft">
            To use AI features, your PDF text will be sent to our server for processing.
            No files are stored. Do you agree?
          </p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint"
          >
            Cancel
          </button>
          <button
            ref={acceptRef}
            type="button"
            onClick={onAccept}
            className="flex-1 px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
