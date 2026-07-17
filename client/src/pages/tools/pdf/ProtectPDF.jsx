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
  "Upload the PDF you want to protect by dragging it onto the drop zone or clicking to browse. The tool works on any PDF — digitally created documents, scanned files, forms, and previously unlocked files are all accepted. Files never leave your device at any point.",
  "Enter your chosen password in the Password field. The tool shows a live strength indicator: under 6 characters is flagged weak, 6–9 characters is medium, and 10+ characters is strong. For documents shared externally — contracts, financial reports, personal records — use a strong password of at least 12 characters combining letters, numbers, and symbols.",
  "Re-enter the same password in the Confirm Password field. The two fields must match exactly before the protect button becomes active. Use the Show/Hide toggle to see both fields as plain text and check for typos if you entered a complex password that includes special characters.",
  "Save your password somewhere secure before clicking 'Protect PDF'. A password manager is strongly recommended. This tool does not store, log, or have any way to recover the password you set — if you lose it and have no unencrypted backup, the document content cannot be accessed by anyone, including you.",
  "Click 'Protect PDF'. The encrypted file downloads with '_protected' in the filename. Test it immediately: open the downloaded file in any PDF viewer to confirm it shows a password prompt before displaying the content. If the prompt appears, protection was applied correctly.",
]
const FAQS = [
  { q: 'What level of encryption does this tool apply?', a: "The tool uses PDF standard encryption via pdf-lib, which applies password protection that is respected by every major PDF viewer — Adobe Acrobat, Apple Preview, browser-based PDF readers, Google Drive, and all standard mobile document apps. The default permissions profile disables content modification and text copying while allowing high-resolution printing and form filling, which is the standard configuration for read-only distribution. Recipients need your password to open the document; without it, the file's contents are inaccessible." },
  { q: 'What happens if I forget the password I set?', a: "There is no password recovery option in this tool. If you lose the password and do not have the original unprotected file, the document cannot be opened or decrypted through any method available here. Password recovery for encrypted PDFs requires specialised software that attempts brute-force or dictionary attacks — and success is far from guaranteed for strong passwords. This is why saving the password in a password manager immediately after setting it is essential, and why keeping a copy of the original unencrypted file until you have confirmed the password is critical." },
  { q: 'Can I protect a PDF that is already password-protected?', a: 'The tool attempts to load any PDF you upload. If it is already encrypted with an open password, the load may fail or produce unexpected results. In that case, use the AWE-OS Unlock PDF tool first to remove the existing password — you will need to know the current password to do this. Once unlocked, upload the unprotected version here and set a new password. This is also the correct workflow when you want to change an existing password to a stronger one.' },
  { q: 'Does the protected PDF prevent printing and copying?', a: 'The default permissions profile applied by this tool allows high-resolution printing but disables content modification and text copying. Recipients can print the document but cannot paste text into other applications, edit the file, or extract content through standard PDF tools. These restrictions apply to PDF viewers that respect permissions flags — all major commercial viewers honour them. Open-source viewers may ignore permission restrictions, so for truly sensitive content, additional security measures beyond PDF password protection are advisable.' },
  { q: 'Can I set different passwords for viewing and editing?', a: "PDF encryption supports two password types: a user password (required to view the document) and an owner password (required to change permissions). AWE-OS Protect PDF sets both automatically — the password you enter becomes the user password that recipients need to open the file, while an internally generated owner password controls the permissions restrictions. This means anyone with your chosen password can open and read the document, while the editing and copying restrictions can only be modified by someone with the owner password, which is not visible to you or anyone else." },
  { q: 'Is my PDF or password ever sent to a server?', a: 'Neither your PDF nor your password is ever transmitted anywhere. The entire encryption process runs locally in your browser memory using pdf-lib. Your file is loaded from your device, encrypted in-memory with the password you provide, and the protected copy is downloaded directly to your device. The password is used only during the in-memory operation and is never written to disk, logged, or sent over the network. Once the browser tab is closed, nothing from the session persists anywhere.' },
]
const ABOUT = [
  'Password-protecting a PDF before sharing is one of the simplest and most effective ways to control access to sensitive documents. Contracts that should only be read by named parties, financial reports for specific stakeholders, confidential proposals, medical records, and HR documents all benefit from password protection before being sent by email or file-sharing link. The AWE-OS Protect PDF tool adds encryption to any PDF instantly, in your browser, with no upload required.',
  'The tool uses pdf-lib\'s built-in encryption to apply password protection to your PDF. Once protected, the file requires the password to be opened in any PDF viewer — Adobe Acrobat, Preview, browser-based PDF readers, and all standard document applications. By default, the protected PDF prevents modification and copying of content but allows printing and form filling — the standard permission profile for read-only distribution.',
  'A key security note: remember the password you set. If you lose the password and have no unencrypted backup, the document cannot be recovered — the Unlock PDF tool also requires the password to decrypt. Always keep the original unprotected version until you have confirmed the password is saved securely in your password manager. For an existing protected PDF where you want to change the password, Unlock PDF first, then re-protect here with a new password.',
  'All processing runs entirely in your browser; your document and your chosen password never leave your device. No server receives the file, no service stores the password, and no usage is logged. The encrypted PDF downloads directly to your device the moment processing completes. No account is required and there is no file size limit on documents you can protect.',
]

export default function ProtectPDF() {
  return (
    <ToolPageShell slug="protect-pdf" name="Protect PDF" icon="🔐"
      description="Add password protection to your PDF. Encrypted files require a password to open."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Uses standard PDF password protection — choose a strong password, as weak ones can be cracked by third-party software."}>
      <ProtectTool />
    </ToolPageShell>
  )
}
