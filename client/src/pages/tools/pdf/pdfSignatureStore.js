/**
 * pdfSignatureStore.js — localStorage persistence for reusable signatures
 * drawn/typed/uploaded in the PDF Editor's SignatureModal. Signature images
 * are small (a few KB as base64 PNG), so localStorage is fine here — unlike
 * the full PDF bytes handled by pdfEditorSession.js, which needs IndexedDB.
 * Same try/catch-wrapped, capped-array pattern as client/src/hooks/useIdeaTracker.js.
 */

const STORAGE_KEY = 'awe_pdf_signatures_v1'
const MAX_SIGNATURES = 10

export function loadSignatures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persist(sigs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sigs)) } catch {}
}

export function saveSignature(dataUrl) {
  const entry = { id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, dataUrl, createdAt: Date.now() }
  const next = [entry, ...loadSignatures()].slice(0, MAX_SIGNATURES)
  persist(next)
  return next
}

export function deleteSignature(id) {
  const next = loadSignatures().filter(s => s.id !== id)
  persist(next)
  return next
}
