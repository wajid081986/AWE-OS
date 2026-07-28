/**
 * pdfEditorSession.js — cross-tab handoff storage for the PDF Editor's
 * upload → new-tab flow (PdfEditor.jsx → PdfEditorStandalone.jsx).
 *
 * Uses IndexedDB rather than localStorage: it stores the raw file bytes
 * directly (no base64 encoding, no ~33% size bloat) and its quota is far
 * larger than localStorage's ~5-10MB per-origin cap, which a base64'd file
 * anywhere near the tool's stated max upload size would otherwise exceed —
 * silently failing with no PDF ever reaching the new tab. Same one-shot,
 * delete-after-read handshake as before; still same-origin, so still shared
 * across tabs the same way localStorage was.
 */

const DB_NAME = 'awe-pdf-editor'
const STORE_NAME = 'sessions'
const DB_VERSION = 1
const MAX_SESSION_AGE_MS = 10 * 60 * 1000 // 10 minutes

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Store { name, bytes: Uint8Array, createdAt } under `key`. */
export async function savePdfSession(key, value) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Read and delete (one-shot) the session stored under `key`, or null. */
export async function loadPdfSession(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(key)
    getReq.onsuccess = () => {
      if (getReq.result !== undefined) store.delete(key)
    }
    tx.oncomplete = () => resolve(getReq.result ?? null)
    tx.onerror = () => reject(tx.error)
  })
}

/** Best-effort cleanup of stale sessions (e.g. an abandoned upload's tab never opened). */
export async function evictOldPdfSessions(maxAgeMs = MAX_SESSION_AGE_MS) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const cursorReq = store.openCursor()
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result
      if (!cursor) return
      if (Date.now() - (cursor.value?.createdAt || 0) > maxAgeMs) cursor.delete()
      cursor.continue()
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
