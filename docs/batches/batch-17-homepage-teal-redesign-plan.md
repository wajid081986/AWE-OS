# Batch 17 Plan — Homepage Bold & Modern Teal Redesign

Branch: `batch-17-homepage-teal-redesign`, off `main` @ `791f491` (batch-2,
qr-code-generator title + blog meta description fixes).

Status: **Approved 2026-07-27. Implementing.**

---

## 0. Origin and scope ruling

User requested a homepage redesign in "Bold & Modern" style, White + Deep
Teal (`#0F766E`) color scheme, with a full written spec (colors, navbar,
hero, hero visual strip, stats bar, tools section, trust section, blog
section). The spec conflicts with several explicit CLAUDE.md rules as
originally written:

- §2 — `docs/reference/ux-blueprint.md` is frozen; the spec calls for UX
  changes (new sections, new component patterns) beyond what's documented
  there.
- §4 — raw hex/px values in components are a defect; the spec is written
  entirely in raw hex/px.
- §4 — one accent color (cobalt) site-wide; the spec's teal would replace
  it.
- §4 — approved-components-only; several requested elements (gradient
  stat-card strip, pill tabs, dark 3-col trust section, gradient blog
  card header) aren't in the current component set.

Per CLAUDE.md §2's instruction ("if a document seems wrong or two
documents conflict, report it and wait — do not fix documents or
improvise around them"), this was surfaced to the user before any file
was touched. User ruling, in order:

1. **Full brand pivot, not a one-off mockup** — this batch updates the
   frozen Blueprint's color section rather than silently diverging from
   it or building a disconnected prototype.
2. **Marigold and mint accents are retained as-is.** Only cobalt is
   replaced by teal. (Marigold/mint are wired into 8 shared components —
   `Badge`, `Callout`, `Chip`, `Ledger`, `BlogCard`'s band, `CategoryRow`,
   `StatsStrip`'s suffix, `ToolCard`'s tags — retiring them would be a
   much larger, unrequested change.)
3. **Trust section** (new dark 3-column section) is built by restructuring
   the existing `PrivacyPromise.jsx` — condensing its current
   owner-approved 4-step "how it works" + privacy-promise paragraphs into
   3 pillars, not inventing new claims.
4. **`BrowserFrame`** (existing Blueprint §19 file-flow illustration,
   currently beside the hero text) is **kept, not replaced**. The new
   gradient stat-strip is added as an additional full-width band below
   the whole Hero section (text + BrowserFrame), per explicit
   confirmation.

---

## 1. Token strategy

**Naming decision**: keep the existing `--cobalt`/`--cobalt-deep`/
`--cobalt-tint` custom-property and Tailwind-class names; change their
*values* to teal. `tokens.css`'s own header comment already treats these
as role names ("named by role, not appearance"), and every cobalt-
consuming component (`Header.jsx`, `Button`, `ToolCard`, `Footer.jsx`,
etc.) picks up the new teal automatically via the token, with zero
per-file renaming. A true `cobalt`→`teal` rename was considered and
rejected as unnecessary risk (~15+ more files, more surface for missed
spots) for a value-only rebrand. Flagged to the user; no objection.

### `design-system/tokens.css` — value changes

| Token | Old | New |
|---|---|---|
| `--cobalt` | `#2742D6` | `#0F766E` |
| `--cobalt-deep` | `#1B2FA0` | `#115E59` |
| `--cobalt-tint` | `#EDF0FE` | `#F0FDF9` |
| `--shadow-button` | `rgba(39, 66, 214, 0.28)` | `rgba(15, 118, 110, 0.28)` |

### `design-system/tokens.css` — new tokens (additive)

| Token | Value | Role |
|---|---|---|
| `--cobalt-border` | `#D1FAE5` | badge/pill/card borders ("Accent border") |
| `--cobalt-accent` | `#5EEAD4` | H1 underline bar, dark-section icons ("Accent mid") |
| `--cobalt-gradient-mid` | `#0D9488` | hero-strip gradient middle stop |
| `--cobalt-gradient-end` | `#14B8A6` | hero-strip gradient end stop |
| `--surface-dark` | `#0F172A` | Trust section background |
| `--text-on-dark-muted` | `#94A3B8` | Trust section body text |

Marigold/mint tokens: unchanged.

`.ds-h1`/`.ds-h2`/`.ds-h3` in `design-system/globals.css`: **unchanged**
(shared by every page's headings — homepage, all 8 policy pages, and
more). Hero H1's 42px/weight-500/tracking--1.5px/leading-1.15 spec is
applied as scoped inline Tailwind utilities in `Hero.jsx` only, matching
the file's existing pattern (`text-[length:var(--text-hero-sub)]`).

---

## 2. File-by-file changes

1. **`design-system/tokens.css`** — token value swap + new tokens (§1).
2. **`docs/reference/ux-blueprint.md`** — amend color table (§4) to record
   the new cobalt hex + new border/accent/dark tokens; add a short note
   on the new Trust section pattern and the pill-tab active state
   (existing doc text explicitly argues for the ink-fill tab state being
   replaced — must be updated, not left contradicting itself).
3. **`client/src/modules/home/sections/Hero.jsx`**
   - New pill badge above H1: shield-lock icon + "Privacy-first — zero
     uploads" (replaces current plain-text eyebrow).
   - H1: scoped inline overrides for 42px/500/-1.5px/1.15; "never upload"
     underline recolored to `--cobalt-accent` (same box-shadow/border
     technique already used for the marigold underline, color swapped).
   - CTA buttons: pick up teal automatically via `Button` primitive; add
     inline SVG wrench icon to primary CTA.
   - `BrowserFrame`: unchanged, stays beside hero text.
   - New: full-width gradient stat-strip band below the Hero `Container`
     — 3 cards (PDF Tools / India Finance / Total Free Tools) computed
     live from `TOOL_REGISTRY` (not hardcoded numbers, to avoid drift) +
     "Runs 100% in browser" badge.
4. **`client/src/modules/home/sections/PopularTools.jsx`** — tab
   container bg, active tab → white + shadow + teal text (replaces
   ink-fill active state).
5. **`client/src/components/cards/ToolCard.jsx`** — hover: border-color
   picks up teal automatically; add new top 3px bar that `scaleX(0→1)`
   animates in from the left on hover.
6. **`client/src/components/cards/StatsStrip.jsx`** — `--text-stat-value`
   and `--text-stat-label` sized closer to spec (26px / 11px).
7. **`client/src/modules/home/sections/PrivacyPromise.jsx`** —
   restructured into dark Trust section (3 pillars condensed from
   existing copy, `--surface-dark` bg, `--cobalt-accent` icons).
8. **`client/src/components/cards/BlogCard.jsx`** — top section becomes a
   taller soft gradient header block with `--cobalt-border` bottom
   border, replacing the current thin cobalt→marigold band.
9. **`Categories.jsx`, `Faq.jsx`, `ClosingGrid.jsx`** — no planned edits;
   they consume `cobalt` tokens already and pick up teal automatically.
   Verified visually at build time, not touched unless something looks
   wrong.

Total: ~9 files, under CLAUDE.md §7's 25-file mass-change threshold.

---

## 3. Verification

1. `cd client && npm run build` — SSG gate must show 0 title-tag/H1
   failures (same gate checked in batch-1/batch-2).
2. Visual check of homepage at 560px/960px/1280px breakpoints.
3. Confirm policy pages' H1 styling (`.ds-h1`) is untouched — regression
   check since `PolicyLayout.jsx` also uses that class.
4. Confirm `TOOL_REGISTRY`-derived stat-strip numbers match `Stats.jsx`'s
   existing counts (no drift between the two stat displays on the same
   page).

---

## 4. Scope guard

- Branch: `batch-17-homepage-teal-redesign`, off `main`.
- No changes to Login, `/app/*`, Admin/Control Panel, Builder Agent, or
  anything under `server/`.
- No new npm dependencies.
- No ad units/scripts (unaffected by this batch regardless).
- `docs/reference/ux-blueprint.md` amendment is limited to the color
  table + the two sections noted in §2 item 2 — not a general rewrite.

---

*Plan approved 2026-07-27. Implementing file by file per this doc.*
