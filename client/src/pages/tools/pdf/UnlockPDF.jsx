import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

function UnlockTool() {
  const [files, setFiles] = useState([])
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')

  const unlock = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { password, ignoreEncryption: false })
      const unlocked = await pdf.save()
      downloadFile(unlocked, files[0].name.replace('.pdf', '_unlocked.pdf'))
      setPhase('done')
    } catch (e) {
      const msg = e?.message || ''
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypt')) {
        setError('Incorrect password. Please check and try again.')
      } else {
        setError('Could not unlock this PDF. It may use unsupported encryption (AES-256). Try Adobe Acrobat for those files.')
      }
      setPhase('idle')
    }
  }

  const tryWithoutPassword = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true })
      const bytes = await pdf.save()
      downloadFile(bytes, files[0].name.replace('.pdf', '_unlocked.pdf'))
      setPhase('done')
    } catch {
      setError('Could not process this PDF.')
      setPhase('idle')
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PDFDropZone onFiles={setFiles} files={files} onRemove={() => { setFiles([]); setError('') }}
        label="Drop your protected PDF here" hint="or click to browse" />

      {files[0] && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Enter Current Password</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">PDF Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Enter the current password"
                className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && unlock()} />
              <button onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button onClick={tryWithoutPassword}
            className="text-xs text-gray-500 hover:text-blue-600 hover:underline">
            My PDF has restrictions but no open password → try without password
          </button>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        ℹ️ This tool removes passwords you already know. It cannot crack unknown passwords. AES-256 encrypted PDFs (created by Acrobat DC+) require the original application.
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      {phase === 'done' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">🔓</p>
          <p className="text-green-800 font-semibold">PDF unlocked and downloaded!</p>
          <p className="text-xs text-green-600 mt-1">The unlocked PDF has no password restriction.</p>
          <button onClick={() => { setPhase('idle'); setFiles([]); setPassword('') }}
            className="mt-3 text-sm text-green-700 hover:underline">Unlock another PDF</button>
        </div>
      ) : (
        <button onClick={unlock} disabled={!files[0] || phase === 'processing'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
          {phase === 'processing' ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Unlocking…</> : '🔓 Unlock PDF'}
        </button>
      )}
    </div>
  )
}

const STEPS = [
  'Upload your password-protected PDF.',
  'Enter the current PDF password in the input field.',
  'Click "Unlock PDF" to remove the password protection.',
  'The unlocked PDF downloads — it can now be opened without any password.',
]
const FAQS = [
  { q: 'Can this tool crack/guess passwords?', a: 'No. This tool only removes passwords that you already know. It is designed for legitimate owners who want to remove password restrictions from their own documents.' },
  { q: 'What if my PDF has edit restrictions but no open password?', a: 'Click "try without password" — this processes owner-restricted PDFs that have no user password, removing edit/print restrictions.' },
  { q: 'Why does it fail for some PDFs?', a: 'pdf-lib supports RC4 and some AES-128 encrypted PDFs. AES-256 encrypted PDFs (common in newer versions of Acrobat) are not supported and will need to be unlocked in Acrobat itself.' },
  { q: 'Is my password safe?', a: 'Yes. Your password is used only in memory in your browser. It is never sent to any server.' },
  { q: 'Can I then re-protect the unlocked PDF?', a: 'Yes — use the Protect PDF tool after unlocking to add a new password.' },
]
const ABOUT = [
  'Unlock PDF removes password protection from PDF files you own. Enter the current password and the tool decrypts the document, producing a new PDF that can be opened without any password.',
  'This tool supports RC4-encrypted PDFs (40/128-bit), commonly created by older PDF software. All processing is browser-side — your password and file never leave your device.',
]

export default function UnlockPDF() {
  return (
    <ToolPageShell slug="unlock-pdf" name="Unlock PDF" icon="🔓"
      description="Remove password protection from a PDF you own. Enter the password to decrypt."
      steps={STEPS} faqs={FAQS} about={ABOUT}>
      <UnlockTool />
    </ToolPageShell>
  )
}
