# Batch 21 — Fix PDF Editor upload bugs (reported broken on production)

## Report
User reported `/tools/pdf-editor` not opening/rendering PDFs on production
after drag-drop or file selection.

## Diagnosis (no code changed at this stage)

Traced the upload flow: `PdfEditor.jsx`'s main page doesn't render the PDF
itself — `handleFile()` stores the file and opens a **new tab** at
`/tools/pdf-editor/editor?session=<key>` (`PdfEditorStandalone.jsx`), which
reads the session and renders there.

Verified live against `www.awe-os.com/tools/pdf-editor` with a real headless
browser (not unit tests):

1. **File-picker upload: works.** No console errors, correct render, confirmed
   pdfjs-dist (`^5.6.205`) and its worker (`pdf.worker.min.mjs`) load fine in
   production; CSP (`vercel.json`, enforcing) and COOP
   (`same-origin-allow-popups`) don't block this flow.
2. **Drag-and-drop: confirmed silent bug**, reproduced live on production.
   `onDrop`'s inline check `f?.type==='application/pdf'` requires an *exact*
   MIME-type match with no fallback and no error path. Dispatched real drop
   events with `file.type` set to `''` and `'application/octet-stream'`
   (both realistic values browsers report for files from cloud-sync folders,
   email clients, etc., regardless of actual file content) — both silently
   did nothing: no tab opened, no error shown, no console error.
3. **Latent, not yet reproduced live**: `MAX_PDF_SIZE_MB = 25`, but the old
   code base64-encoded the file (~33% size increase) into `localStorage`,
   whose per-origin quota is typically ~5-10MB in most browsers — a
   legitimately-sized PDF well under the stated 25MB limit could exceed the
   quota and hit the generic "Failed to process PDF" error.
4. Verified the popup-blocked fallback UI (banner + manual link) does render
   correctly when `window.open()` returns `null`, so that failure mode is
   not silent.

User approved fixing both (1) the drag-drop MIME check and (2) the
localStorage-quota mismatch.

## Fix

1. **`client/src/pages/tools/pdf/pdfUtils.js`** — added `isPdfFile(file)`:
   accepts `file.type === 'application/pdf'` OR a `.pdf` filename extension
   as a fallback, since MIME type is OS/source-reported metadata, not a
   read of file content.
2. **`client/src/pages/tools/pdf/PdfEditor.jsx`**:
   - `handleFile`'s validation now uses `isPdfFile()` instead of the strict
     equality check.
   - `onDrop` no longer duplicates its own inline type check — it now always
     calls `handleFile(f)` if a file is present, so there is one source of
     truth for validation (and one place a rejected file shows an error).
   - Replaced the base64-into-localStorage handoff with a new
     `pdfEditorSession.js` (IndexedDB) — stores the raw `Uint8Array` directly
     (no encoding overhead), with a much larger quota than localStorage.
     Kept the same one-shot, delete-after-read handshake and 10-minute
     staleness check as before; added a best-effort `evictOldPdfSessions()`
     call before each save (proactive cleanup, replacing the old reactive
     `QuotaExceededError` eviction-and-retry, which is no longer needed but
     whose intent — don't let abandoned sessions accumulate — is preserved).
3. **`client/src/pages/tools/pdf/PdfEditorStandalone.jsx`** — reads via the
   new `loadPdfSession()` (IndexedDB) instead of `localStorage.getItem` /
   base64 decode; same polling/timeout/staleness logic, updated to the new
   data shape (`{ name, bytes, createdAt }`, bytes already a `Uint8Array`).
4. **New file: `client/src/pages/tools/pdf/pdfEditorSession.js`** — the
   IndexedDB helper (`savePdfSession`, `loadPdfSession`,
   `evictOldPdfSessions`).

## Verification
- `npm run build` — clean, no errors.
- Re-ran the same drop-event reproduction against a local dev server:
  `file.type=''` and `'application/octet-stream'` now both correctly open
  the new tab and render the PDF (screenshot confirmed). A genuinely
  non-PDF file (`.txt`) is still correctly rejected with the visible
  "Please upload a valid PDF file" error — the fix didn't loosen validation
  incorrectly.
- Did not reproduce the localStorage-quota failure live (would need a
  multi-MB file and a real browser's actual quota), but the fix removes the
  base64 encoding step entirely and moves to IndexedDB, which structurally
  eliminates the specific quota ceiling that made it possible.

## Known residual risk (not in scope for this fix, disclosed to user)
`window.open()` is still called after an `await` (now the IndexedDB write
instead of base64 encoding) inside the click/drop handler — some browsers'
stricter popup-blocker heuristics can still block a `window.open()` call
that happens asynchronously after the originating user gesture. The
popup-blocked fallback UI (banner + manual "Open PDF Editor" link) already
handles the case where `window.open()` returns `null` synchronously, which
covers most real blockers — not changed in this batch.
