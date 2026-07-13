# Batch 4 — Cards & Strips

**Branch:** `batch-4-cards`
**Scope:** `ToolCard`, `CategoryRow`, `BlogCard`, `RelatedToolCard`, `StatsStrip` per Blueprint §11 (roster: §10) and both reference HTML files. No pages, no adoption.

---

## 1. Folder: `cards/`, not `primitives/`

Approved: `client/src/components/cards/` — matches architecture.md §3's
`components/cards/` structure, and keeps composite/molecule-level
components separate from Batch 2's atomic `primitives/` roster.

Structure: `client/src/components/cards/{ToolCard,CategoryRow,BlogCard,
RelatedToolCard,StatsStrip}.jsx` + `index.js` barrel, same pattern as
`primitives/index.js`.

**Confirmed untouched, zero adoption:**
- `client/src/components/ToolCard.jsx` (existing, imported by `ToolsPage.jsx`
  and `ToolDetailPage.jsx`) — different component, different folder, same
  name collision as the `ui/`-vs-`primitives/` Button/Badge/Container
  situation from Batch 2. Noted in `component-library.md` explicitly.
- No existing page imports anything from the new `cards/` folder — this
  batch is visually inert on all 129 live routes, same guarantee as
  Batch 2.

## 2. Component specs (from reference CSS + Blueprint §11)

### ToolCard
`.tool-card` (`awe-os-homepage.html`): white surface, `--line` border,
`--radius-m`, 20px padding. 40px `cobalt-tint` rounded-square icon slot
(`--radius-s`), title (Instrument Sans 700, 1rem), two-line description
(.84rem, `ink-soft`), and the **mandatory** mono tag row.

Props: `icon` (node), `name` (string), `description` (string), `to`
(route, via `react-router-dom` `Link` — matches the codebase's routing,
same reasoning as Batch 2's `Breadcrumb`), `tag` (`{ label: string,
variant: 'no-upload' | 'india-ready' | 'ai-assisted' }`, required by
Blueprint intent, documented as "must always be supplied").

Hover: translateY(-3px) + border→cobalt + shadow (new
`--shadow-card-hover` token), `motion-reduce:transition-none` per
Blueprint §20 — scoped to the component, no global `globals.css` rule
(same call Batch 2 made for the focus ring; logged as one more line on
that existing backlog item).

**Tag color assignment — approved interpretation:** `no-upload`→mint,
`india-ready`→marigold, `ai-assisted`→cobalt, resolving Blueprint's
ambiguous "in *their* tint colors" line (the reference HTML only ever
renders one color — mint — across all six example tags, so this is an
interpretation, not a literal reference value).

**Contrast fix (AA floor wins, per the footer-fix precedent):**
reference's literal `.tool-tag{color:var(--mint)}` on `mint-tint`
measures ≈3.05:1 — fails AA. Same problem on a raw-marigold india-ready
variant (≈2.4:1). Fixed using Batch 2's existing `-text-strong` tokens:
`no-upload` = `mint-text-strong` on `mint-tint` (≈8.0:1), `india-ready` =
`marigold-text-strong` on `marigold-tint` (≈7.5:1), `ai-assisted` =
`cobalt` on `cobalt-tint` (≈6.5:1, raw cobalt already passes — matches
the reference's own link-color pattern, no change needed). No new tokens
required — both `-text-strong` tokens already exist from Batch 2.

### CategoryRow
`.cat` (`awe-os-homepage.html`): full-width prose row, **not hoverable**
— reference defines no `.cat:hover` (static content block, not a
single-anchor card like the other four; approved as a reference-specified
exception to the shared card-hover grammar). Grid: `170px 1fr auto`
desktop, collapses to single column at `md:` (Tailwind default 768px,
consistent with the same breakpoint simplification already made for
Header's nav collapse in Batch 3, rather than reference's literal 960px).

Props: `name` (string), `count` (number — rendered as `{count} TOOLS`,
mono, marigold-toned), `description` (**ReactNode**, not a raw string —
the reference's `.cat-desc` embeds inline `<a>` links inside prose;
accepting children/ReactNode lets a consuming page compose links safely,
avoiding `dangerouslySetInnerHTML`), `to` (view-all link route),
`linkLabel` (string, e.g. "View PDF tools →").

**Contrast fix, same category as ToolCard's tag:** `.cat-count{color:
var(--marigold)}` on white/`--card` measures ≈2.7:1 — fails AA. Using
`--marigold-text-strong` instead (≈7.5:1 on white).

### BlogCard
`.post` (`awe-os-homepage.html`): 7px gradient band (cobalt→marigold,
top), mono meta row (category · "Updated \<Mon Year\>"), title
(Instrument Sans 700, 1.05rem), excerpt (.88rem), author row with a
circular initials avatar (cobalt-tint bg/cobalt text — already passes AA,
no fix needed) + name + read time, top-bordered.

Props: `to`, `category` (string, meta first item), `updatedDate` (string,
pre-formatted — e.g. "Updated Jul 2026"; formatting is the consuming
page's job, matching how `Ledger` (Batch 2) takes pre-formatted `value`
strings rather than raw dates), `title`, `excerpt`, `authorInitials`,
`authorName`, `readTime` (string, e.g. "9 min read").

**Hover — approved ruling: Blueprint wins over reference-literal, same
precedent as the footer contrast fix.** The reference's `.post:hover`
sets translateY(-3px) + shadow but omits border-color→cobalt, unlike
`.tool-card:hover` which sets all three. Blueprint §11 states the hover
grammar is shared across "all cards" — adding border-color→cobalt to
BlogCard's hover so every card (ToolCard, BlogCard) uses one consistent
hover grammar; the omission in the reference's `.post:hover` is treated
as the same category of reference-literal-vs-Blueprint-intent gap as the
footer text color, resolved the same direction. Documented as a
deviation-from-reference in `component-library.md`, not silently applied.

### RelatedToolCard
`.rel-card` (`tool-page-merge-pdf.html`): compact, title (.95rem) + one
description line (.82rem), 18px padding, used inside articles/tool pages
in a 3-up grid (grid itself is the consuming page's concern).

Props: `to`, `title`, `description`.

**Hover — approved as a reference-specified exception:** `.rel-card:hover`
gets its own explicit lighter values — border→cobalt + translateY(**-2px**,
not -3px) + **no shadow**. Blueprint's own prose already anticipates this
("compact... used only inside articles" — a deliberately lighter card),
so this is the reference's literal values, not an interpretation call.

### StatsStrip
`.strip`/`.stat` (`awe-os-homepage.html`): ink background, 4-up grid
(`md:` collapses to 2-up, same breakpoint simplification as CategoryRow),
each stat a large mono numeral (white, optional marigold `<em>` suffix
like the "+" in "49+") over a small dimmed label.

Props: `stats` (`{ value: string, suffix?: string, label: string }[]`).

No hover (static, non-interactive strip — matches reference, no
`.strip:hover`/`.stat:hover` rule exists).

## 3. New tokens (additive, sourced from reference CSS — Batch 2/3 method)

| Token | Value | Source |
|---|---|---|
| `--shadow-card-hover` | `0 1px 2px rgba(19,26,46,.05), 0 8px 24px rgba(19,26,46,.06)` | reference `:root --shadow` (used by `.tool-card:hover`/`.post:hover`; distinct from Batch 1's `--shadow-card`/`--shadow-float`) |
| `--text-md` | `.95rem` | recurs across `.cat-desc`, `.cat-link`, `.rel-card h3` — new shared token filling the gap between `--text-small` (.88rem) and `--text-body` (1.03rem); not retrofitted onto Header's existing raw `.95rem` (Batch 3, out of scope — noted in backlog as optional future cleanup) |
| `--text-toolcard-desc` | `.84rem` | `.tool-card p` |
| `--text-toolcard-tag` | `.63rem` | `.tool-tag` |
| `--tracking-toolcard-tag` | `.08em` | `.tool-tag` |
| `--toolcard-icon-size` | `40px` | `.tool-icon` |
| `--text-toolcard-icon` | `1.1rem` | `.tool-icon` |
| `--text-catrow-name` | `1.1rem` | `.cat-name` |
| `--text-catrow-count` | `.72rem` | `.cat-count` |
| `--catrow-padding-y` | `26px` | `.cat` |
| `--catrow-padding-x` | `28px` | `.cat` |
| `--catrow-gap` | `26px` | `.cat` |
| `--text-blogcard-meta` | `.68rem` | `.post-meta` |
| `--tracking-blogcard-meta` | `.06em` | `.post-meta` |
| `--text-blogcard-title` | `1.05rem` | `.post h3` |
| `--text-blogcard-excerpt` | `.88rem` | `.post p` |
| `--text-blogcard-author` | `.8rem` | `.post-author span` |
| `--blogcard-band-height` | `7px` | `.post-band` |
| `--blogcard-avatar-size` | `28px` | `.avatar` |
| `--blogcard-padding` | `22px` | `.post-body` |
| `--text-relcard-desc` | `.82rem` | `.rel-card p` |
| `--relcard-padding` | `18px` | `.rel-card` |
| `--statsstrip-padding-y` | `34px` | `.strip` |
| `--text-stat-value` | `1.7rem` | `.stat .mono` |
| `--text-stat-label` | `.83rem` | `.stat span` |
| `--statsstrip-text-dim` | `rgba(255,255,255,.65)` | `.stat span` — checked: ≈7.9:1 on `--ink`, passes AA, no fix needed unlike the footer's `.45` |

23 additions, additive-only, same pattern as Batches 1–3.
`tailwind.config.js` gets a `boxShadow` entry for `--shadow-card-hover`
(reused color/shadow tokens get registered per convention); everything
else stays inline `[length:var(--x)]` arbitrary, consistent with Batch 3.

## 4. Motion & accessibility

- Hover transitions use `--duration-micro` (150ms, matches reference's
  literal `.15s`) and `--ease`.
- Every hover transform wrapped in Tailwind's `motion-reduce:` variant
  (built into Tailwind core, no config/token needed) per Blueprint §20 —
  scoped per-component, not a global `globals.css` rule. One more line on
  the existing backlog item about site-wide motion/focus rules not being
  adopted yet.
- Tag row and stat numerals use `aria-hidden` only where genuinely
  decorative (the marigold `<em>+</em>` suffix); tag labels stay in the
  accessible text (they carry real meaning, not decoration).

## 5. Verification

- Grep check: confirm zero files outside `cards/`, `component-library.md`,
  `tokens.css`, `tailwind.config.js` are touched, and zero existing files
  import from `cards/`.
- `npm run build` before/after: HTML output byte-identical across all 129
  routes (nothing imports the new files).
- Same Tailwind-JIT CSS-bytes caveat as Batch 2: compiled CSS bytes will
  change (new tokens land in `tokens.css`, and Tailwind's JIT scanner
  reads file text regardless of the import graph) — zero visual effect,
  stating it upfront.
- **Rendered visual check:** temporarily wire one instance of each card
  into a scratch spot on a real page, build, serve locally, and capture
  an actual rendered screenshot via Lighthouse's `final-screenshot` audit
  artifact (base64 PNG embedded in its JSON report) — no new npm
  dependency needed, reuses the same `npx lighthouse` flow already
  proven in Batch 3. Revert the temporary wiring before committing.

## 6. `docs/component-library.md` additions

One section per component, same rigor as Batch 2: purpose, file path,
full props table, usage snippet, Blueprint/reference citation, and an
explicit "deviates from reference because..." line wherever §2 notes an
interpretation or AA-driven fix.

## Files to create/modify

- `client/src/components/cards/{ToolCard,CategoryRow,BlogCard,
  RelatedToolCard,StatsStrip,index.js}.jsx` — new.
- `design-system/tokens.css` — 23 additions per §3.
- `client/tailwind.config.js` — `boxShadow.card-hover` entry.
- `docs/component-library.md` — 5 new sections.
- `docs/backlog.md` — one line noting Header's raw `.95rem` could adopt
  `--text-md` later (optional); one line extending the existing
  motion/focus-ring backlog item to mention card hover states too.
- `docs/batches/batch-4-plan.md` — this plan, saved on approval.

No adoption anywhere — 9 files total, well under the mass-change
threshold.

## Not in scope

- No pages (homepage/category/blog/tool-page templates — Batch 5+).
- No grid wrapper components (ToolGrid-equivalent, CategoryList,
  BlogGrid) — each card is a standalone unit; grid layout is a page-level
  concern for whichever batch builds each page.
- No adoption of the existing `ToolCard.jsx` naming collision — logged,
  not resolved, same as the `ui/`-vs-`primitives/` situation.
- No changes to `ToolsPage.jsx`, `ToolDetailPage.jsx`, `BlogPage.jsx`, or
  `Home.jsx`'s current inline card markup.
