import { useState } from 'react'
import { decryptPDF } from '@pdfsmaller/pdf-decrypt'
import ToolPageShell from '../ToolPageShell'
import PDFDropZone from '../../../components/tools/PDFDropZone'
import { downloadFile } from './pdfUtils'

// Maps @pdfsmaller/pdf-decrypt's real error messages to the tool's copy —
// unlike the old pdf-lib-based implementation, these now reflect what
// actually happened (pdf-lib has no decrypt support at all: no `password`
// option, and always throws on an encrypted file regardless of password).
function friendlyUnlockError(err) {
  const msg = err?.message || ''
  if (/incorrect password/i.test(msg)) return 'Incorrect password. Please check and try again.'
  if (/not encrypted/i.test(msg)) return 'This PDF is not password-protected — there is nothing to unlock.'
  if (/unsupported encryption/i.test(msg)) return 'This PDF uses an encryption method this tool does not support yet. Try Adobe Acrobat Reader for this file.'
  return `Could not unlock this PDF.${msg ? ` (${msg})` : ''}`
}

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
      const decrypted = await decryptPDF(new Uint8Array(buf), password)
      downloadFile(decrypted, files[0].name.replace('.pdf', '_unlocked.pdf'))
      setPhase('done')
    } catch (e) {
      setError(friendlyUnlockError(e))
      setPhase('idle')
    }
  }

  // Empty user password is the technically correct way to decrypt a PDF
  // that opens without prompting but still restricts editing/copying/
  // printing (owner-only restrictions) — the PDF spec always encrypts
  // content uniformly, an empty user password is just what lets viewers
  // auto-open it.
  const tryWithoutPassword = async () => {
    if (!files[0]) return
    setError(''); setPhase('processing')
    try {
      const buf = await files[0].arrayBuffer()
      const decrypted = await decryptPDF(new Uint8Array(buf), '')
      downloadFile(decrypted, files[0].name.replace('.pdf', '_unlocked.pdf'))
      setPhase('done')
    } catch (e) {
      setError(friendlyUnlockError(e))
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
        ℹ️ This tool removes passwords you already know. It cannot crack unknown passwords. Supports AES-256 and RC4 encrypted PDFs — the two encryption types used by virtually all PDF software.
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
  "Upload your password-protected PDF by dragging it to the drop zone or clicking to browse. The tool accepts any PDF protected with a known password. It also handles PDFs that have editing or printing restrictions without a full open password — common with documents from banks, government portals, and legal platforms.",
  "Enter the current password for the document in the Password field. This must be the exact password that was set when the document was protected — the tool will not attempt to guess or crack an unknown password. Use the Show/Hide toggle to check for typos if you are entering a long or complex password.",
  "If your PDF has print or edit restrictions but opens without prompting for a password, click the 'try without password' link below the input field instead. This removes owner-level restrictions (blocks on editing, copying, and printing) from documents that you can already view freely.",
  "Click 'Unlock PDF'. The tool decrypts the document using the password you provided and creates an unlocked copy. If the password is incorrect, an error message appears immediately — check for capital letters, leading or trailing spaces, or character substitutions and try again.",
  "The unlocked PDF downloads with '_unlocked' appended to the filename. This file has no password restriction and can be opened, edited, merged, split, annotated, or processed by any PDF tool without entering any credentials. Consider re-protecting it with a new password using AWE-OS Protect PDF if needed.",
]
const FAQS = [
  { q: 'Can this tool crack or guess a forgotten password?', a: "No — this is not a password cracker and cannot recover unknown passwords. It removes password restrictions you already know, for documents you legitimately own. If you have genuinely forgotten the password for your own document, third-party tools that attempt dictionary or brute-force attacks exist separately, but success is not guaranteed for strong passwords. Attempting to bypass passwords on documents you do not own is both technically outside this tool's capability and legally problematic under computer misuse laws in most jurisdictions." },
  { q: 'Why does the tool fail on some encrypted PDFs?', a: 'This tool supports AES-256 (the modern PDF 2.0 standard, used by Adobe Acrobat DC and current PDF generators) and RC4 40-bit/128-bit encryption — together these cover the vast majority of PDFs in circulation. One legacy variant, AES-128 (PDF 1.6+), is not yet supported and will return an error even with the correct password. For that specific case, use Adobe Acrobat Reader (free) or another desktop application.' },
  { q: 'What is the difference between an open password and an owner password?', a: "PDF security uses two distinct password types. An open password (user password) is required to view the document at all — the PDF viewer shows a password prompt before displaying any content. An owner password controls permissions: it restricts editing, printing, copying, or annotation even for users who can open the file freely. Owner-restricted PDFs open without a password prompt but block certain operations. AWE-OS Unlock PDF handles both: enter the open password to fully decrypt a locked document, or use 'try without password' to remove owner restrictions from files you can already open." },
  { q: 'Is my password safe when I enter it here?', a: 'Yes. Your password is used only within your browser JavaScript runtime for the decryption operation. It is never transmitted to any server, stored in a database, logged, or cached anywhere. The entire unlock process happens in-memory on your own device — the PDF loads from your local storage, the decryption is applied using the password you typed, and the unlocked file is written directly to your downloads folder. Once the browser tab is closed, all traces of the session are completely gone from memory.' },
  { q: 'Can I re-protect the unlocked PDF with a new password afterward?', a: "Yes. Once you have the unlocked PDF, upload it to the AWE-OS Protect PDF tool and set any new password you prefer. This two-step workflow is the correct way to change a PDF password: unlock with the old password here, then protect with the new one using Protect PDF. You can also adjust the permissions profile in the re-protected version — for example, enabling printing in the new version when the original blocked it. Discard the intermediate unlocked file after you have verified and saved the re-protected version." },
  { q: 'My PDF opens without a password but I cannot copy text or print — what do I do?', a: "This is an owner-restricted PDF: no open password is required to view it, but editing, copying, and printing permissions are locked at the owner level. To remove these restrictions, upload the PDF and click the 'try without password' link below the password input field — do not enter a password. The tool decrypts the file using a blank user password, which strips owner-permission restrictions and produces an unrestricted copy. This works for both AES-256 and RC4-encrypted permission restrictions." },
]
const ABOUT = [
  'Password-protected PDFs are common in professional and legal contexts — banks send encrypted statements, lawyers distribute password-locked contracts, and HR departments share protected offer letters. When you legitimately own such a document and need to work with it freely, the AWE-OS Unlock PDF tool removes the password restriction and produces an openly accessible PDF — no password required to open it anywhere.',
  'The tool decrypts the document in your browser using the password you provide. The resulting file opens without requiring any password in Adobe Acrobat, Preview, browser PDF viewers, or any other standard application. Your original encrypted file is not modified; the unlocked version is a separate download. Once unlocked, you can edit, merge, split, or annotate the document using any PDF tool.',
  'Supported encryption includes AES-256 (the modern PDF 2.0 standard used by current Adobe Acrobat and most PDF generators) and RC4 40-bit/128-bit (common in older software and many banking and government systems) — together these cover nearly every PDF you will encounter. AES-128 (an older, less common variant) is not yet supported. If the tool returns an error on your PDF, that is the most likely cause.',
  'Your password is used only in your browser\'s memory — it is never transmitted to any server, stored in any database, or logged anywhere. The entire unlock operation happens locally on your device. This privacy matters because passwords to financial documents and legal contracts are sensitive information that should never leave your device. After unlocking, consider using the Protect PDF tool to re-secure the document with a new password if needed.',
]

export default function UnlockPDF() {
  return (
    <ToolPageShell slug="unlock-pdf" name="Unlock PDF" icon="🔓"
      description="Remove password protection from a PDF you own. Enter the password to decrypt."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Removes a password only if you know it — this tool cannot crack or bypass unknown passwords."}>
      <UnlockTool />
    </ToolPageShell>
  )
}
