# Batch 22 — Edit Text & Edit Image: cover-and-replace

## Goal

`PdfEditor.jsx`'s "Edit PDF" ribbon tab has had two permanently-disabled
"Coming Soon" buttons since they were added: `_edit-text` ("Direct PDF text
editing coming soon. Use Text Box tool instead.") and `_edit-img` ("Image
replacement coming soon."). This batch replaces both with a real workflow
built from primitives that already exist in this file.

## Why "cover-and-replace"

True in-place PDF text/image editing (reflowing existing glyphs, replacing
an embedded image inside the original content stream) isn't feasible with
this stack: pdf.js (used here) only renders PDFs, it doesn't expose an
editable content-stream API, and pdf-lib (used for export) only appends new
drawing operations — it can't rewrite what's already on the page. Every
"edit" tool in this file that touches existing content (Whiteout, Redact)
already works by painting a new shape on top, not by modifying the
underlying page. Edit Text / Edit Image use the same technique: cover the
old content with an opaque rectangle (identical to the existing Whiteout
tool), then place new content (a text box or an image) directly on top of
that same rectangle.

## Scope — one file only: `client/src/pages/tools/pdf/PdfEditor.jsx`

1. **Ribbon tools (`RIBBON_TABS`, `edit` tab, lines ~128-129)** — replace the
   two disabled entries with real stateful tools:
   ```js
   { id:'edit-text',  icon:'📝', label:'Edit Text',  key:'', cls:'text-lg' },
   { id:'edit-image', icon:'🖼', label:'Edit Image', key:'', cls:'text-lg' },
   ```
   (drops `disabled`, `disabledTip`, `act` — same shape as neighboring
   stateful tools like `whiteout`/`redact`).

2. **`CURSORS`** — add `'edit-text':'crosshair'`, `'edit-image':'crosshair'`.

3. **`onPageUp`** (the drag-release handler that already builds `base =
   {id:uid(),page:pi,x:xf,y:yf,w:wf,h:hf}` for whiteout/redact/rect/etc.) —
   two new branches:
   - `activeTool==='edit-text'`: `addAnn(pi,{...base,type:'whiteout',opacity:1})`
     then `addAnn(pi,{id:uid(),page:pi,type:'text',x:xf,y:yf,w:wf,h:hf,
     text:'',fontSize,fontFamily,fontColor,bold,italic,underlineText,textAlign})`
     — the text annotation is added second, so it renders/exports on top of
     the whiteout (annotation arrays are drawn in insertion order both on
     canvas and in `embedAnnotation()`'s export loop).
   - `activeTool==='edit-image'`: `addAnn(pi,{...base,type:'whiteout',opacity:1})`,
     then `pendingImg.current={pi,xf:s.xf,yf:s.yf,wf,hf}; imageInputRef.current?.click()`.

4. **`onImageSelect`** — currently reads `{pi,xf,yf}` from `pendingImg.current`
   and inserts the image at a fixed `w:0.22,h:0.18`. Extend to read optional
   `wf`/`hf` and use them when present (`w:wf??0.22,h:hf??0.18`), so the
   existing plain "Image" tool (click-based, no wf/hf) and the new
   "Edit Image" tool (drag-based, has wf/hf) share one code path.

5. **`onPageDown`** — no change needed. The existing early-return
   `if (activeTool==='image') {...; return}` only matches the plain Image
   tool's id, so `'edit-image'` naturally falls through to the generic
   drag-start code a few lines below (the same path Whiteout/Rect use).

6. **Props panel** — add a hint block for `activeTool==='edit-text' ||
   activeTool==='edit-image'` (same spot/style as the existing
   Whiteout/Redact hint), explaining the drag-to-cover-then-type/upload
   flow. When `edit-text` is active, also surface the same font
   size/family/color controls the plain Text tool shows (reusing the same
   toolbar state), since the replacement text box picks those up.

`embedAnnotation()` (the pdf-lib export function) needs **no changes** —
`whiteout`, `text`, and `image` annotation types already export correctly
regardless of which tool created them.

`DisabledToolButton.jsx` is left as-is (not deleted) — nothing else in the
codebase uses it right now, but it's generic "coming soon" infrastructure
that may be reused by a future tool; removing it is out of this batch's
scope.

## Known limitations (disclosed, not fixed here)

- Not genuine text/image extraction-and-edit — visually equivalent to using
  Whiteout + Text Box / Image manually today, just bundled into one
  drag gesture. No background-color sampling, so covering non-white or
  patterned regions will look pasted-on.
- The whiteout and the text/image placed on top are two separate `addAnn`
  calls (two history entries) — one Undo removes only the top layer, not
  both atomically. Matches how every other multi-step flow in this file
  already behaves; no atomic multi-add pattern exists here today.
- Edit Image: if the user cancels the native file picker after dragging,
  the whiteout cover remains with no replacement image. It's a normal
  annotation — selectable and deletable like any other — so recoverable,
  just not auto-cleaned-up.

## Verification

- `npm run build` — must stay clean.
- Manual browser test on `/tools/pdf-editor` (dev server): load a sample
  PDF, use Edit Text to drag over existing text and type a replacement,
  use Edit Image to drag over an existing image and swap it, download and
  confirm the output PDF shows the cover + new content. Re-check existing
  Whiteout/Redact/Text/Image tools for regressions (shared code paths).
