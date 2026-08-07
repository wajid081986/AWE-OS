import { useEffect, useRef, useState } from 'react'

/** Password-protect modal — same fixed-overlay dialog shell as ConfirmModal/
 * DocumentToolsModal. Mirrors the standalone ProtectPDF.jsx tool's password
 * UI (strength hint, confirm field, show/hide) so a returning user sees the
 * same controls in the same shape, but encrypts the *flattened* edited
 * document (index.jsx's buildFlattenedPdfLibDoc) rather than the raw upload. */
export default function ProtectModal({ onApply, onClose, loading }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const closeRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const mismatch = confirm.length > 0 && confirm !== password
  const applyDisabled = loading || !password || password.length < 4 || mismatch

  const strength = password.length === 0 ? null
    : password.length < 6 ? { label: 'Weak', color: 'bg-red-500', w: '33%' }
    : password.length < 10 ? { label: 'Medium', color: 'bg-yellow-500', w: '66%' }
    : { label: 'Strong', color: 'bg-green-500', w: '100%' }

  function handleApply() {
    if (applyDisabled) return
    onApply(password)
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label="Password Protect" className="w-full max-w-sm bg-card border border-line rounded-m shadow-card">
        <div className="px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Password Protect</h2>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full px-2.5 py-1.5 pr-12 border border-line rounded-s text-sm bg-card"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.w }} />
                </div>
                <p className="text-xs text-ink-soft mt-1">Strength: <span className="font-medium">{strength.label}</span></p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Confirm Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className={`w-full px-2.5 py-1.5 border rounded-s text-sm bg-card ${mismatch ? 'border-red-400' : 'border-line'}`}
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          </div>

          <p className="text-[11px] text-ink-soft">
            Encrypts the flattened document (your annotations and edits included) with AES-256. Remember this password — it cannot be recovered.
          </p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-line">
          <button ref={closeRef} type="button" onClick={onClose} className="flex-1 px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint">Cancel</button>
          <button type="button" onClick={handleApply} disabled={applyDisabled} className="flex-1 px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium disabled:opacity-40">
            {loading ? 'Protecting…' : 'Protect & Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
