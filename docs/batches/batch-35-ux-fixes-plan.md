# Batch 35 (continued) — PDF Editor V2 UX fixes

Follows the manual click-through testing session on `batch-35-pdf-editor-v2`
(`docs/batches/batch-35-plan.md`). User feedback after testing v2 in a
real browser: UX is hard to use, toolbar/tools hard to find, PDF cut
off on the right, no onboarding, wants a full-screen editor experience
instead of the current embedded-in-page layout.

## Root causes (verified against the code, not assumed from the feedback alone)

1. **Tools "not visible"** — `Toolbar.jsx`'s tool labels are `sr-only`
   (screen-reader-only). Visually there are only 13 tiny unicode glyphs
   with no text, several genuinely ambiguous (`▢` whiteout, `⏹` stamp).
2. **PDF cut off on the right** — `ToolPageShell` wraps every tool in a
   `max-w-7xl` column with a persistent `lg:w-72` (288px) sidebar
   (share/embed/related-tools). After `PagePanel` (128px) and
   `PropertiesPanel` (224px) take their share, the actual PDF viewer
   gets roughly 450-550px. A standard page renders at 918px at 100%
   zoom (`RENDER_SCALE` 1.5 × 612pt) — routinely ~2x wider than
   available space. The earlier `items-start` fix (previous QA pass)
   only kept the left edge in view; it never fixed the underlying fit
   problem.
3. **"Toolbar not visible above PDF"** — combination of #1 (doesn't
   read as a toolbar) and `ToolPageShell`'s hero/breadcrumb content
   pushing it down the page.
4. **No onboarding** — confirmed, no preview or hint exists anywhere in
   the current build.
5. **Full-screen mode request** — checked `docs/reference/architecture.md`
   and the blueprint: a full-screen takeover pattern exists exactly once
   already, `Header.jsx`'s mobile nav sheet (`fixed inset-0`,
   `z-[var(--z-modal)]`, `role="dialog" aria-modal="true"`,
   focus-trapped, Escape/close). Blueprint §10's component list is a
   closed set for Phase 1 and doesn't include a tool full-screen
   takeover — logged as a deviation in `docs/backlog.md` per CLAUDE.md
   §4, owner sign-off given directly 2026-07-30. Reuses the exact
   existing idiom rather than inventing new stacking/backdrop
   conventions (in particular, not the raw `z-index: 9999` originally
   proposed — `--z-modal: 100` already exists for this).

## Decisions made with the owner

- No literal "Eraser" tool this batch (partial-stroke erasing is a
  materially bigger feature than anything built so far) — instead,
  make Select+Delete more discoverable. Logged in `docs/backlog.md`.
- Escape stays bound to its current job (deselect selection / reset
  active tool to Select) — it does **not** also exit full-screen, so a
  mid-edit Escape can't unexpectedly kick the user out of the whole
  view. Exiting full-screen is via an explicit ✕ close button only.
- Closing full-screen is "un-maximize," not "discard" — the loaded
  file and all annotations stay intact; only the view mode changes.

## Build order (phases, build/verify after each)

1. **Full-screen overlay** — `isFullscreen` state in `index.jsx`,
   auto-`true` once a file loads; ✕ close button; `fixed inset-0
   z-[var(--z-modal)] bg-paper`, `role="dialog" aria-modal="true"`,
   focus trap + body-scroll-lock (matching `Header.jsx`'s existing
   mobile-menu implementation).
2. **Toolbar** — visible icon + label + shortcut in `Toolbar.jsx`
   (e.g. "✎ Draw (D)"), replacing the `sr-only` labels. Fixes the
   "shortcuts visible" ask for free.
3. **Onboarding** — pre-upload instructional copy under the upload
   button; post-upload one-time dismissible hint ("Click a tool above
   to start editing"), gone after first annotation or manual dismiss.
4. **Fit-to-width zoom** — compute an initial zoom once per file load
   (available container width ÷ page's native render width) instead of
   a flat 100% default; manual zoom still works normally afterward.

## Verification

Each phase: `npm run build`. After phase 4: a full Playwright
click-through pass (upload, all tools with visible labels, full-screen
enter/exit, onboarding hint dismiss, fit-to-width at various container
sizes, download) — same discipline as the previous QA pass, since build
success alone already proved insufficient to catch real bugs twice this
batch.
