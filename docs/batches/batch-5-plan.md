# Batch 5 Plan — Homepage Replacement

Branch: `batch-5-homepage`. Source: Blueprint §30 (`docs/reference/ux-blueprint.md`),
reference `docs/reference/awe-os-homepage.html`. Replaces `client/src/pages/Home.jsx`'s
content — the first destructive batch (CLAUDE.md §7 rollback applies if unfixable
regressions surface).

Approved 2026-07-14 with one ruling and two additions (see end of this document).

## 1. SEO Continuity Inventory

**Current live homepage head** (`client/src/pages/Home.jsx`):

| Element | Current value |
|---|---|
| `<title>` | `AWE-OS — Mostly Free Online Tools. No Signup for Most.` |
| meta description | `{N}+ online tools — PDF, calculators, converters, and AI tools. Most need no account and work directly in your browser.` |
| canonical | `SITE_URL` (`/`) |
| OG/Twitter | mirror title/description |
| H1 | `{N}+ Tools. No Signup for Most. Just Works.` |
| JSON-LD | `WebSite` (+ `SearchAction` → `/tools?q={term}`), `Organization` |

**Conflict found**: the reference HTML's `<title>` is 91 characters and its meta
description is 182 characters — both exceed Blueprint §25's own budget (title ≤60,
description ≤155). Resolved by ruling below rather than silently picking one.

**New values (ruling-approved)**:

| Element | New value | Length |
|---|---|---|
| `<title>` | `AWE-OS — Free Online Tools for PDF, India Tax & Finance` | 55 chars |
| meta description | `49+ free browser tools — PDF, Indian tax & finance calculators, converters. Files never uploaded, most need no signup. Everything runs on your device.` | 150 chars |
| H1 | `Online tools that **never upload** your files.` (Blueprint §16 exact copy, marigold underline on "never upload") | — |

Continuity: title keeps "Free", "Online Tools", "PDF", "India Tax & Finance" from the
production title's targeted queries; H1 carries the differentiator per the reference;
"No Signup" survives in the meta description.

JSON-LD: keep `WebSite`+`SearchAction` and `Organization` as-is, add a `FAQPage` schema
for the new FAQ block using the existing `generateFAQSchema()` util
(`client/src/utils/schema/generateFAQSchema.js`).

## 2. Section Architecture (Addition 1)

Each homepage block is a standalone component under
`client/src/modules/home/sections/`:

- `Hero.jsx` — claim, search, chips, Browser Frame
- `Stats.jsx` — stats strip (wraps `cards/StatsStrip`)
- `PopularTools.jsx` — tabs + tool grid (wraps `cards/ToolCard`)
- `Categories.jsx` — 5 category rows (wraps `cards/CategoryRow`)
- `PrivacyPromise.jsx` — why-different prose + how-it-works steps + promise callout
- `Guides.jsx` — latest 3 blog posts (wraps `cards/BlogCard`)
- `Faq.jsx` — 8-question accordion + `FAQPage` schema
- `ClosingGrid.jsx` — about prose + policy grid

`client/src/pages/Home.jsx` only composes these sections plus the page-level
`<Helmet>` head. No monolithic file. Sections are future reuse candidates for
Batches 6-9.

## 3. Block-by-Block Source Map (Blueprint §30's 10 blocks)

| # | Block | Component | Source | Adaptations |
|---|---|---|---|---|
| 1 | Hero | `Hero.jsx` | Reference copy verbatim (eyebrow, H1 per §1, subhead, chips) + Browser Frame | Search wired to `useToolSearch` (§4). Drops old hero's "Visit Store" button — Store already lives in Header nav (Batch 3), no orphan. |
| 2 | Stats strip | `Stats.jsx` | `cards/StatsStrip` (Batch 4) | All 4 numbers computed from `TOOL_REGISTRY`/`CATEGORY_META` at render time (§7) — not copied from reference literals. |
| 3 | Popular tools + tabs | `PopularTools.jsx` | `cards/ToolCard` (Batch 4) | 8-card "Popular" set + 5 category tabs, derived from `isFeatured` (§7). Tag variant derived from `category` (pdf/converters/productivity → `no-upload`; calculators → `india-ready`; ai → `ai-assisted`) — normalizes the reference's one-off "FY 2026-27" tag on the tax calculator to `india-ready` since that isn't one of ToolCard's 3 documented variants and would go stale every fiscal year. |
| 4 | Categories | `Categories.jsx` | `cards/CategoryRow` (Batch 4) | Reference's 5 `.cat-desc` paragraphs copied near-verbatim (linked tools verified to exist: merge-pdf, pdf-editor, sip-calculator, ppf-calculator, fd-calculator, resume-builder). AI category's `/ai-content-policy` link dropped, sentence reworded to plain text. Counts computed from `TOOL_REGISTRY` (§7). |
| 5 | Why AWE-OS / How it works | `PrivacyPromise.jsx` | Reference prose verbatim (4 paragraphs + 4 steps) | Steps are page-local markup (no existing primitive covers numbered steps, not proposing a new shared one for a single use — §6). |
| 6 | Privacy promise | `PrivacyPromise.jsx` | Reference `.promise` copy | Reuses `primitives/Callout` (`variant="success"`, already built for this). |
| 7 | Latest guides | `Guides.jsx` | 3 real posts from `client/src/data/blogPosts.js` via `cards/BlogCard` | Not the reference's 3 fictional posts. Selection: `filter(!noindex)`, sort by `date` desc (stable tie-break = array order), take top 3 — implemented as live code (`getLatestPosts()` in `Guides.jsx`), not a hand-picked list. Verified build output resolves to: `how-to-create-a-budget-that-works-for-you-in-india` (2026-06-13), `merge-pdf-files-for-bank-documents-india` (2026-06-02), `qr-code-generator-10-practical-uses` (2026-06-01) — corrects an arithmetic slip in this plan's original draft, which mis-listed `emi-calculator-home-car-personal-loan` as the 3rd post after wrongly assuming both 2026-06-13-dated posts were `noindex` (only one is). Only static `BLOG_POSTS` is eligible — `BlogPage.jsx`'s DB-fetched posts come from a client-side `useEffect`, not SSG-safe. `updatedDate` formatted "Updated {Mon YYYY}"; `authorInitials` derived from `post.author`. |
| 8 | FAQ | `Faq.jsx` | Reference's 8 questions, native `<details>`/`<summary>` (Blueprint §19: JS-free) | 3 of 8 answers reference dead routes (`/corrections-policy`, `/request-tool`, `/ai-content-policy`) — drop just the `<a>`, keep the sentence as plain text. `/privacy` link kept (real redirect-shim route). |
| 9 | About + policy grid | `ClosingGrid.jsx` | Reference prose verbatim | Policy grid trimmed from 8 links to the 5 that exist (`/about`, `/privacy-policy`, `/contact`, `/terms`, `/disclaimer`). Backlog line 13 already tracks the missing policy routes for Batch 8. |
| 10 | Footer | — | Untouched — shipped in Batch 3, not part of `Home.jsx` | — |

## 4. Search Bar Wiring

Reuse the existing `useToolSearch` hook and its live-dropdown behavior (today's
`HomeSearch`) — not reinventing it. Additions to match the reference's `<form>`+submit
behavior:
- Wrap the input in `<form role="search">` with a visible "Search" button.
- On submit (or Enter with no suggestion highlighted, `activeIdx === -1`), navigate to
  `/tools?q=<query>` — `ToolsPage.jsx:78-99` already reads `q` via `useSearchParams` and
  seeds its debounced search state, confirmed no changes needed there.
- Enter *with* a suggestion highlighted keeps today's direct-navigation behavior.

## 5. Browser-Frame Animation

Page-local component inside `Hero.jsx` (not a new shared primitive — §6), SSR-safe:
pure CSS, no `window`/`document` reads outside effects. Three flow nodes (file → gear →
download) pulse via one `@keyframes` opacity cycle, 6s loop, staggered per-node delay —
opacity-only per Blueprint §19/§20, using existing `--duration-ambient`/`--ease` tokens.
Wrapped in `@media (prefers-reduced-motion: reduce) { animation: none }`. The `Ledger`
below it reuses `primitives/Ledger` verbatim with the same 3 rows (tools available,
signup required, files stored — all derived, §7).

## 6. Primitives/Cards Adoption

Consumed: `Chip`, `Ledger`, `Callout`, `Container`, `Section`, `Button` (primitives,
Batch 2); `ToolCard`, `CategoryRow`, `BlogCard`, `StatsStrip` (cards, Batch 4).
`Breadcrumb` stays unused (Blueprint §15: homepage is the one page without one). Old
`ui/` and top-level `components/ToolCard.jsx` remain untouched.

Not proposing new shared primitives for the Browser Frame, numbered Steps, or FAQ
accordion — each appears exactly once (homepage-only per Blueprint §30). Backlog note:
the FAQ accordion markup is a candidate for extraction if/when a second page needs one.

## 7. Dynamic Truth — Derivations

All computed from `TOOL_REGISTRY`/`CATEGORY_META`/`BLOG_POSTS` at render time:
- Total tools, per-category counts, category count — same `ALL_TOOLS` filter
  (`!comingSoon && slug !== 'test-ai-tool'`) already used today (currently 49 total:
  21/13/10/3/2).
- "Popular" 8-card set: round-robin one `isFeatured` tool per category (pdf →
  calculators → converters → productivity → ai, registry order within category) until
  8 filled. Resolves today to: `merge-pdf`, `fd-calculator`, `qr-code-generator`,
  `invoice`, `resume-builder`, `compress-pdf`, `ppf-calculator`, `currency-converter`.
- Per-category tabs: that category's `isFeatured` tools first, then filled to a full
  grid from the rest of the category in registry order.
- Ledger's "Tools available" row: same `ALL_TOOLS.length`.
- Blog "latest 3": see §3 block 7.

## 8. What Gets Removed — Orphan Check

Removed: gradient-blue hero, stats bar, category-chip scroll-anchors, 5 inline
category tool-grids, `AdContainer` top-banner + inline slot, bottom "Request a Tool"
CTA.

Orphan risk assessed: every individual tool page linked from the old homepage's
category grids is still linked from `/tools` and the 5 `/tools/:category` pages —
not orphaned. `/store` (old hero button) is already in Header nav — not orphaned.
`/contact` (old bottom CTA) is still in Header nav and footer — not orphaned.
`AdContainer` is inert everywhere ADS_ACTIVE is false; tool pages keep their own
slots — no regression.

## 9. Design DNA Rule (Addition 2)

This homepage sets the visual standard for every remaining page. Any new
spacing/color/radius/hover value introduced by this batch is added as a token in
`design-system/tokens.css` following the existing naming grammar — no one-off magic
values in components. Genuinely homepage-only elements (Browser Frame, Hero layout,
Steps, FAQ accordion) are fine as page-local sections; their underlying visual values
still come from tokens, same discipline as Batch 2/4.

## 10. Staged Implementation — 3 commits, 1 branch, 1 merge

All on `batch-5-homepage`, pushed after each stage for preview review; no partial
stage merges to `main`.

- **Commit 0** (this plan): `docs/batches/batch-5-plan.md`.
- **5A** — Hero + search + stats + browser-frame animation. New tokens for
  searchbar/browser-chrome/flow-icons added to `design-system/tokens.css`.
- **5B** — Popular tools (tabs + grid) + categories + why-different/how-it-works/
  privacy. New tokens for tabs/tool-grid states, steps, split-grid.
- **5C** — Blog + FAQ + about/policy grid + SEO head verification (§1). New tokens
  for FAQ/`details` styling, policy-list grid.

PR opened only after 5C, reviewed as a whole, merged once.

## 11. Verification

- Structural: single `<h1>`, all internal links resolve, SSG output for `/` complete
  with JS disabled (`client/scripts/ssg-build.js`).
- Lighthouse on `/`: a11y + performance, confirming the ambient animation doesn't
  regress LCP.
- Visual QA: preview URL vs. `docs/reference/awe-os-homepage.html` side-by-side.
- `TODO-CONTENT` search stays at zero.

---

## Approval Record (2026-07-14)

Approved with:
- **Ruling — title/H1 split**: `<title>` uses the ≤60-char variant carrying "Free
  Online Tools" + "PDF" + India tax/finance terms, preserving core terms from the
  current production title; H1 carries the differentiator per the reference. Final
  strings incorporated into §1 above.
- **Addition 1 — section architecture**: each block is a standalone component under
  `client/src/modules/home/sections/`; `Home.jsx` only composes. Incorporated into §2.
- **Addition 2 — Design DNA rule**: incorporated into §9.

Everything else (round-robin Popular derivation, dropping `AdContainer`, dropping
dead links, dynamic counts, orphan mitigations, 5A/5B/5C staged commits, single merge)
stands as originally proposed.
