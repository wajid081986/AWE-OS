import { useEffect, useRef, useState } from 'react'
import { PROFILE_FIELDS } from './constants'

const LABELS = {
  name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  city: 'City',
  state: 'State',
  pin: 'PIN / ZIP',
  dob: 'Date of birth',
}

/**
 * Small modal for editing the localStorage-only autofill profile
 * (useAutoFillProfile.js) and running it against the current PDF's
 * detected fields. Saved data never leaves the browser.
 */
export default function ProfileModal({ profile, onSave, onSaveAndAutofill, onClose }) {
  const [draft, setDraft] = useState(profile)
  const firstInputRef = useRef(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label="Autofill profile" className="w-full max-w-md bg-card border border-line rounded-m shadow-card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Autofill profile</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-ink-soft">
            Saved only in this browser — never uploaded anywhere. Used to best-effort match and fill this PDF's form fields.
          </p>
          {PROFILE_FIELDS.map((key, i) => (
            <label key={key} className="block">
              <span className="block text-xs font-medium text-ink-soft mb-1">{LABELS[key]}</span>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                type="text"
                value={draft[key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="w-full text-sm border border-line rounded-s px-2 py-1.5"
              />
            </label>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-3 border-t border-line">
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint"
          >
            Save profile
          </button>
          <button
            type="button"
            onClick={() => onSaveAndAutofill(draft)}
            className="flex-1 px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium"
          >
            Save &amp; autofill this PDF
          </button>
        </div>
      </div>
    </div>
  )
}
