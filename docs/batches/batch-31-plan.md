# Batch 31 — PDF Editor Phase 5b: Virtualized Rendering, Export Progress, Touch/Pinch-Zoom

## Context

Batches 23-28 and 30 covered Phases 0-4, 5a, and 5c. This is the last
deferred piece from the original Phase 5 audit, split out in batch-28's
planning specifically because it needed real browser/device verification
before implementing. Two of its four original items had genuine
architecture forks, resolved by the owner before writing any code (see
below); the other two have clear low-risk implementations.

## Owner decisions (asked before implementing, not guessed)

**Web Worker export → yield + progress indicator instead.** Porting
pdf-lib's actual work (`embedAnnotation`, `applyGlobalSettings`, the
whole `buildDoc` loop) into a separate worker script is the literal
original ask, but is high-risk here: it would need structured-cloning
`pdfBytes`/`annotations` across the worker boundary and duplicating the
entire pdf-lib pipeline in worker scope, with no way to verify the
exported PDF is still valid without a browser. Chose instead to solve
the underlying user problem (large exports freezing the tab) via
periodic yielding inside the existing `buildDoc` loop plus a real
per-page progress indicator — same code path, same output, just
responsive and visible, without touching the tool's single most
important code path in a way that can't be verified.

**Real dark theme → skipped for now.** `topBar`/`sidebar` are already
dark (`#1f2937`/`#111827`); the ribbon and right properties panel have
dozens of nested elements with their own explicit text/border color
classes. Darkening the panel background without touching those children
risks illegible dark-gray-on-dark-gray text (Tailwind classes set color
directly per-element, not inherited). Doing it properly means an
error-prone sweep across every `PropSection`/`ColorGrid`/`WidthPicker`/
`FontControls`/`ShapeControls` instance that can't be visually verified.
Owner chose to leave `darkCanvas` exactly as-is (canvas backdrop toggle
only) and log the full sweep to `docs/backlog.md` as needing its own
visually-verified batch.

## Scope — one file: `client/src/pages/tools/pdf/PdfEditor.jsx`, no new deps

### 1. Virtualized page rendering (continuous mode only)

Single/two-page view modes are already effectively virtualized
(`pagesToShow` only keeps 1-2 pages in the DOM). The real cost is
continuous/scroll mode, where `pagesToShow = pageOrder` (every page) and
the existing render `useEffect` calls the expensive `pg.render()` for
all of them unconditionally on load/zoom/rotation change.

- New `IntersectionObserver` watches each page's existing container div
  (`pageElRefs.current[pi]`, already populated) with a generous
  `rootMargin` (preload buffer above/below viewport).
- New `renderedPages` Set state — a page's canvas only gets
  `renderPage()` called once it's been observed near-viewport (or is the
  current/initial page, pre-seeded to avoid a blank flash on load).
- Once rendered, a page **stays** rendered — never unmounted or cleared.
  Deliberately conservative: only *when* an off-screen page first
  renders is deferred, nothing that already works is ever removed.
  Re-render on zoom/rotation change still applies normally to any page
  already in the set.

### 2. Export progress + responsiveness

- `buildDoc`'s existing per-page loop yields to the browser periodically
  (`await new Promise(r => setTimeout(r, 0))` every few pages) so the tab
  doesn't freeze on large documents.
- New `exportProgress` state (`{ current, total }`), updated each page,
  surfaced as a real "Exporting page N of M" indicator on the Download
  button (replacing the current generic spinner during
  `phase==='saving'`).

### 3. Touch/pinch-zoom on the main canvas

- New touch handlers on the canvas container (`centerRef`'s div): track
  2-finger touch distance on `touchstart`, compute a zoom scale factor on
  `touchmove`, update `zoom` state, clear on `touchend`.
- Only intercepts (`preventDefault`) when exactly 2 touches are active —
  single-finger touch-scroll is never touched, so native scrolling keeps
  working untouched.

## Disclosed limitations

- `preventDefault()` inside touch handlers has known browser/React
  passive-listener quirks that can't be verified without a real touch
  device — implemented to the standard pattern, but genuinely unverified.
- Dark theme and Web Worker export remain as originally scoped in the
  audit — not implemented here, logged to `docs/backlog.md`.

## Verification

- `npm run build` — must stay clean.
- Manual browser/device test (no browser-automation tool available to
  the assistant in this environment — needs a human pass): scroll a long
  PDF in continuous mode and confirm pages render as you approach them
  with no visible blank gaps; export a large multi-page PDF and confirm
  the tab stays responsive with a progress indicator; test pinch-zoom on
  an actual touch device if possible.
