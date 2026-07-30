import { useEffect, useRef, useState } from 'react'

/** Ctrl+F opens this (index.jsx). "Replace All" reuses the same
 * whiteout+text-overlay mechanism as the Text tool's click-to-edit path —
 * see docs/batches/batch-35-inline-text-plan.md and index.jsx's
 * handleReplaceAll. */
export default function FindReplaceBar({ onReplaceAll, onClose }) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const findRef = useRef(null)

  useEffect(() => {
    findRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function submit(e) {
    e.preventDefault()
    if (!find.trim()) return
    onReplaceAll(find, replace)
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label="Find and replace" className="w-full max-w-sm bg-card border border-line rounded-m shadow-card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Find &amp; Replace</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">✕</button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-soft mb-1">Find</span>
            <input
              ref={findRef}
              type="text"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              className="w-full text-sm border border-line rounded-s px-2 py-1.5"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-soft mb-1">Replace with</span>
            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              className="w-full text-sm border border-line rounded-s px-2 py-1.5"
            />
          </label>
          <button
            type="submit"
            disabled={!find.trim()}
            className="w-full px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium disabled:opacity-40"
          >
            Replace All
          </button>
        </form>
      </div>
    </div>
  )
}
