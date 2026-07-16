# Batch 12 — Tool Content Gaps (approved plan, verbatim)

> Note on provenance: this plan was drafted and approved in a prior chat
> session that was cleared (`/clear`) before it could be saved to the repo —
> violating this file's own §6.2 rule ("save it verbatim ... as the first
> commit on the batch's branch"). The owner re-supplied the approved plan
> text verbatim in the next session so it could be saved properly. Text
> below is unedited from what the owner pasted, except this note and the
> "Post-save correction" section at the end.

---

## APPROVED BATCH 12 PLAN
(verbatim from previous session's audit + owner rulings — save to
docs/batches/batch-12-tool-prose.md)

### Critical audit finding (verified directly against files, previous session)

The original "migrate 3,500 lines of unwired prose" premise was WRONG.
All 48 live tool pages ALREADY render full content:

- Steps/FAQs/About: 48/48 — local const STEPS/FAQS/ABOUT per tool-page
  file, passed into ToolPageShell
- Tips + Common Mistakes: 48/48 — toolGuideContent.js (129KB), imported
  by ToolPageShell.jsx:31, auto-renders for all slugs
- SEO schema (SoftwareApplication, Article, HowTo, BreadcrumbList,
  FAQPage): 48/48, already in ToolPageShell.jsx
- toolPageContent.js (213KB, TOOL_ABOUT, 38 keys) is ~97% ORPHANED —
  only WordCounter.jsx still reads it; every other tool has its own
  local ABOUT. Bundle dead weight.

### Real gaps (this batch's scope)

1. Honest-limitation callout: 0/48 — no field exists. The one real
   per-tool content gap.
2. Author/testing box: 0/48 — one shared generic component (Team
   AWE-OS + tested-browsers statement + links to /tool-testing-policy
   and /contact). No per-tool prose.
3. Visible "Last updated" line: 0/48 displayed — data already exists
   as CATEGORY_DATES in ToolPageShell.jsx:189-197, just never rendered.

### Owner rulings (approved)

1. Tips inline-linking: BACKLOG (one dated line in docs/backlog.md),
   not this batch.
2. toolPageContent.js orphan cleanup: BACKLOG (12C), not this batch.
3. The ~48 honest-limitation lines: drafted by owner's advising AI,
   owner-approved, supplied verbatim — Claude Code must NOT draft any
   limitation text (CLAUDE.md no-AI-prose rule).
4. Stage 12A scope: ToolPageShell.jsx additions only — (a) render
   existing catDates.modified as visible updated-date line, (b) new
   optional `limitation` prop rendered as callout ONLY when supplied
   (no section/no placeholder text when absent), (c) shared
   author/testing box component. Pilot comparison: merge-pdf vs
   docs/reference/tool-page-merge-pdf.html.
5. Stage 12B: mechanical addition of owner-supplied limitation lines
   across ~48 tool files (keeps each stage under the 25-file cap).

### Performance guard

Additions are small strings — no data-layer split needed. Do not touch
toolGuideContent.js structure or toolPageContent.js.

### Verification

npm run build (134 routes), scripted grep of dist/tools/*/index.html
confirming updated-date line (and limitation callout where supplied)
in SSG HTML, hydration sweep unchanged (39 hydrated / createRoot
fallback split untouched), owner QA merge-pdf vs reference HTML.

### Scope guard

Branch batch-12-tool-prose off origin/main (NOT off
batch-8b-contact-about-cleanup — that's merged as PR #12). No server/
changes, no new deps, no isHydrationSafe/ssgRoutes changes.

ALSO REQUIRED as part of this: output here a list of all 48 tool slugs
with a one-line description of each (from the tool registry) — the
owner's advising AI needs it to draft the 48 limitation lines.

Regarding the stray changes you found: known pre-existing, NOT yours
and NOT this batch's — leave CLAUDE.md and both .env.example files
untouched and unstaged (same instruction as batches 5.6/8/8b). Owner
will fix CLAUDE.md's stray "1" manually someday.

*(Superseded — see "Post-save correction" below: owner's follow-up
message changed this to DISCARD before branching.)*

Proceed: save plan doc, branch off origin/main, implement 12A,
verify, push, no merge.

---

## Post-save correction (this session, before implementation)

Two claims in the pasted audit above were re-verified against the current
repo and found inaccurate; corrected here rather than silently edited
into the "verbatim" text above:

1. **"only WordCounter.jsx still reads it [toolPageContent.js]" — wrong.**
   `grep` for `TOOL_ABOUT`/`toolPageContent` found **5** importers:
   `WordCounter.jsx`, `pdf/PdfEditor.jsx`, `SIPCalculator.jsx`,
   `BMICalculator.jsx`, `pdf/MergePDF.jsx`. Does not change this batch's
   scope (12A doesn't touch `toolPageContent.js`), but the 12C backlog
   item's estimate of "orphaned" should say 5 live importers, not 1.
2. **Stray CLAUDE.md / .env.example changes — the plan said "leave
   untouched"; the owner's follow-up message in this session overrode
   that to DISCARD before branching.** Done: `git restore CLAUDE.md
   client/.env.example server/.env.example` on `batch-8b-contact-about-cleanup`
   before switching to `main`.

Also discovered during 12A implementation, not anticipated by the plan:
`ai-content-writer` and `resume-builder` (2 of the 48) do **not** use
`ToolPageShell` — they use `ToolLayout` from `components/tool-engine/`
(Pro-gated AI tools, different UX pattern). 12A's ToolPageShell-only
scope correctly does not reach them; logged to `docs/backlog.md` as a
gap for 12B/12C to account for (46/48 get the new template elements
from this batch, not 48/48).

## 12A implementation summary

Changed: `client/src/pages/tools/ToolPageShell.jsx` only (1 file).

- Added `Callout` import (`components/primitives/Callout`, existing
  primitive, `variant="warning"` matches the reference HTML's
  `.callout` styling exactly via existing design tokens).
- New `limitation` prop → renders `<Callout>` with an inline
  `<strong>Honest limitation:</strong>` lead-in only when the prop is
  truthy; renders nothing when absent (no placeholder).
- Visible "Last updated" line added next to the existing free/no-signup
  badge, sourced from the existing `catDates.modified` value (no new
  data), formatted with explicit `'en-US'` locale + `'UTC'` timezone to
  avoid a server/client locale mismatch (this codebase's hydration is
  fragile — see batch-5.6/5.6b — so determinism here matters).
- New shared `AuthorBox` component (module-local to `ToolPageShell.jsx`,
  same pattern as the existing `ShareButtons`/`EmbedCode` helpers):
  "Built & maintained by Team AWE-OS" + testing statement, links to
  `/tool-testing-policy` and `/contact`. Renders unconditionally, no
  per-tool prop, on every page that uses `ToolPageShell`.
- All new markup uses `design-system/tokens.css` Tailwind classes
  (`text-ink-soft`, `font-mono`, `text-marigold`, `bg-card`,
  `border-line`, `bg-cobalt-tint text-cobalt`, `rounded-m`) per
  CLAUDE.md §4 — no raw hex/px values introduced.

## Verification results

- `npm run build`: 134/134 routes built. 0 routes with title-tag count
  != 1, 0 routes with zero `<h1>` (pre-existing gaps unrelated to this
  batch: 26 routes without a page-specific `<title>`, all previously
  known city/compare/faq pages).
- Grepped `dist/tools/*/index.html` for all 48 tool slugs: 46/48 have
  exactly 1 "Last updated:" line and 1 author-box string in the SSG
  HTML. The 2 exceptions (`ai-content-writer`, `resume-builder`) don't
  use `ToolPageShell` — see correction note above.
- `merge-pdf` pilot: updated-date line renders ("Last updated: **March
  2026** · Tested on Chrome, Firefox, Edge, Safari"), author box
  renders, limitation callout correctly renders 0 matches (prop not
  supplied, as required — no AI-drafted limitation text).
- `npm run hydration-sweep`: 135/135 routes PASS, 0 failures. (Batch
  5.6b's known intermittent race on tool/city pages did not reproduce
  this run — consistent with it being a timing-sensitive race, not
  fixed or worsened by this batch.)

## Human verification checklist

- [ ] Visually compare `/tools/merge-pdf` (branch preview) against
      `docs/reference/tool-page-merge-pdf.html` for the updated-date
      line, callout absence, and author box placement/spacing.
- [ ] Confirm the "Last updated" date shown (derived from
      `CATEGORY_DATES`, category-level not per-tool) is acceptable, or
      flag if per-tool dates are wanted later.
- [ ] Confirm author-box avatar sizing (48px, nearest Tailwind step —
      reference literal is 52px) is visually acceptable.

## Known issues / backlog additions (this session)

- `docs/backlog.md`: Tips inline-linking (workflow-linking rule,
  Blueprint §26) — not implemented this batch.
- `docs/backlog.md`: toolPageContent.js orphan cleanup (12C) — 5 live
  importers remain (not 1), needs its own migration batch.
- `docs/backlog.md`: `ai-content-writer` / `resume-builder` don't use
  `ToolPageShell` — 12B's limitation-line rollout and any future
  ToolPageShell-driven template work needs a separate plan for these 2.
