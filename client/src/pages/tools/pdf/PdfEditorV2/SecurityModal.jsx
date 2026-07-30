import { useEffect, useState } from 'react'

// Same default permissions profile as ProtectPDF.jsx (standard read-only
// distribution profile: printable, not modifiable/copyable, forms fillable).
const DEFAULT_PERMISSIONS = {
  printing: 'highResolution',
  modifying: false,
  copying: false,
  annotating: false,
  fillingForms: true,
  contentAccessibility: true,
  documentAssembly: false,
}

const PERMISSION_TOGGLES = [
  { key: 'printing', label: 'Allow printing', isPrinting: true },
  { key: 'modifying', label: 'Allow editing content' },
  { key: 'copying', label: 'Allow copying text/images' },
  { key: 'annotating', label: 'Allow adding comments' },
  { key: 'fillingForms', label: 'Allow filling forms' },
  { key: 'documentAssembly', label: 'Allow page insert/delete/rotate' },
]

/** Password + permissions modal for the "Protect" toolbar button — ported
 * field-for-field from ProtectPDF.jsx's own controls (same strength meter,
 * same default permissions profile) so the settings feel identical to the
 * standalone tool. Unlike DocumentToolsModal, Apply here ends the editing
 * session with a direct encrypted download (index.jsx's
 * handleApplyProtection) rather than reloading into the live canvas. */
export default function SecurityModal({ onApply, onClose, loading }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const strength = password.length === 0 ? null
    : password.length < 6 ? { label: 'Weak', color: 'bg-red-500', w: '33%' }
    : password.length < 10 ? { label: 'Medium', color: 'bg-yellow-500', w: '66%' }
    : { label: 'Strong', color: 'bg-green-500', w: '100%' }

  const passwordMismatch = confirm.length > 0 && confirm !== password
  const applyDisabled = loading
    || (password.length > 0 && (password.length < 4 || passwordMismatch))

  function handleApply() {
    onApply({
      userPassword: password || undefined,
      ownerPassword: (password ? password + '_aweos' : 'aweos_owner'),
      permissions: { ...permissions, printing: permissions.printing ? 'highResolution' : false },
    })
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 px-4">
      <div role="dialog" aria-modal="true" aria-label="Protect PDF" className="w-full max-w-sm bg-card border border-line rounded-m shadow-card">
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <h2 className="text-sm font-semibold text-ink">Password & Permissions</h2>

          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Open password (optional)</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to only restrict permissions"
                className="w-full px-2.5 py-1.5 pr-12 border border-line rounded-s text-sm"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.w }} />
                </div>
                <p className="text-xs text-ink-soft mt-1">Strength: <span className="font-medium">{strength.label}</span></p>
              </div>
            )}
          </div>

          {password.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Confirm password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full px-2.5 py-1.5 border rounded-s text-sm ${passwordMismatch ? 'border-red-400' : 'border-line'}`}
              />
              {passwordMismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-ink-soft">Permissions (apply even without an open password)</p>
            {PERMISSION_TOGGLES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={!!permissions[key]}
                  onChange={(e) => setPermissions((p) => ({ ...p, [key]: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-cobalt"
                />
                {label}
              </label>
            ))}
          </div>

          <p className="text-[11px] text-ink-soft">
            Downloads a separate encrypted copy — the file you're currently
            editing stays open here unencrypted. There is no password
            recovery: save it somewhere safe before applying.
          </p>
        </div>
        <div className="flex gap-2 px-5 py-3 border-t border-line">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-1.5 rounded-s border border-line text-sm text-ink hover:bg-cobalt-tint">Cancel</button>
          <button type="button" onClick={handleApply} disabled={applyDisabled} className="flex-1 px-3 py-1.5 rounded-s bg-cobalt text-white text-sm font-medium disabled:opacity-40">
            {loading ? 'Encrypting…' : 'Apply & Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
