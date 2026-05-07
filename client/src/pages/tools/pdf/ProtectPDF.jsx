import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

function ProtectTool() {
  const [files, setFiles] = useState([])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const protect = async () => {
    if (!files[0]) return
    if (!password) { setError('Please enter a password.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return }
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      await pdf.encrypt({
        userPassword: password,
        ownerPassword: password + '_aweos',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        },
      })
      downloadFile(await pdf.save(), files[0].name.replace('.pdf', '_protected.pdf'))
      setPhase('done')
    } catch (e) {
      setError('Failed to protect PDF. The file may already be encrypted.')
      setPhase('idle')
    }
  }

  const strength = password.length === 0 ? null
    : password.length < 6 ? { label: 'Weak', color: 'bg-red-500', w: '33%' }
    : password.length < 10 ? { label: 'Medium', color: 'bg-yellow-500', w: '66%' }
    : { label: 'Strong', color: 'bg-green-500', w: '100%' }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PDFDropZone onFiles={setFiles} files={files} onRemove={() => setFiles([])}
        label="Drop your PDF here" hint="or click to browse" />

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Set Password</p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Enter a strong password"
                className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.w }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Strength: <span className="font-medium">{strength.label}</span></p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm Password</label>
            <input type={showPwd ? 'text' : 'password'} value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confirm && confirm !== password ? 'border-red-300' : 'border-gray-300'}`} />
            {confirm && confirm !== password && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⚠️ Remember your password — it cannot be recovered. If lost, use our Unlock PDF tool only if you still know the password.
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">🔐</p>
          <p className="text-green-800 font-semibold">PDF protected and downloaded!</p>
          <p className="text-xs text-green-600 mt-1">The PDF now requires your password to open.</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPassword(''); setConfirm('') }}
            className="mt-3 text-sm text-green-700 hover:underline">Protect another PDF</button>
        </div>
      ) : (
        <button onClick={protect} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Encrypting…</> : '🔐 Protect PDF'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload the PDF you want to password-protect.',
  'Enter a strong password and confirm it in the second field.',
  'Click "Protect PDF" to encrypt the document.',
  'The protected PDF downloads — it will require the password to open.',
]
const FAQS = [
  { q: 'What type of encryption does this use?', a: 'The tool uses PDF standard encryption via pdf-lib. The resulting PDF requires the password to be opened in any PDF viewer.' },
  { q: 'What happens if I forget the password?', a: 'If you forget your password and do not have the original unprotected PDF, recovery is not possible. Always keep a backup of the original file.' },
  { q: 'Can I protect an already-protected PDF?', a: 'The tool will attempt to load the PDF first. If it is already encrypted, you need to unlock it first using the Unlock PDF tool, then re-protect with a new password.' },
  { q: 'Are there restrictions applied?', a: 'Yes. By default, the protected PDF prevents modification and copying, but allows high-resolution printing and form filling.' },
  { q: 'Is my PDF sent to any server?', a: 'No. Encryption is done entirely in your browser using pdf-lib. Your file never leaves your device.' },
]
const ABOUT = [
  'Protect PDF adds password encryption to any PDF document. Once protected, the file requires your password to be opened in any PDF viewer including Adobe Acrobat, Preview, and browser PDF viewers.',
  'The tool uses pdf-lib\'s built-in encryption capabilities, running entirely in your browser for complete privacy. No files are uploaded to any server.',
]

export default function ProtectPDF() {
  return (
    <ToolPageShell slug="protect-pdf" name="Protect PDF" icon="🔐"
      description="Add password protection to your PDF. Encrypted files require a password to open."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <ProtectTool />
    </ToolPageShell>
  )
}
