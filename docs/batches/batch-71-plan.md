# Batch 71 — Store Visual Polish (category-grid landing view)

Purely visual pass on top of batch-70's structure
(`client/src/modules/store/pages/StoreListingPage.jsx`, public `/store`).
No new state, no new API calls, no route changes, no product-card
(`ProductCard`) changes. Scope is the **category-grid landing view**
only (`view === 'categories'`) — the category-detail view (Browse
New/Bestsellers tabs, product grid, pagination) keeps its current
batch-70 styling untouched.

## Research findings that shape this plan

- `design-system/tokens.css` and the light-theme primitives
  (`Button`/`Chip`/`Container` in `client/src/components/primitives`,
  `ToolCard`/`StatsStrip`/`CategoryRow` in `client/src/components/cards`)
  are Blueprint-governed, light-theme (`--paper`/`--card`/`--ink`), and
  have never been used by any Store page — confirmed again this batch.
  Importing them here would mix two unrelated styling systems on one
  page; batch-70 already made this call for the accent color, this plan
  extends the same call to the rest of the polish.
- `CalculatorsListPage.jsx` — the one other **public, dark-theme**
  page in the app — uses the plain "border-color-change-only" hover
  (`hover:border-indigo-500`, no lift/shadow) on its cards. That's the
  dark-theme app's current baseline hover treatment.
- `ToolCard.jsx` (light theme) is the one place in the codebase with a
  genuine "professional" hover treatment: lift + shadow-glow + border
  recolor, done via
  `hover:-translate-y-[3px] hover:shadow-card-hover hover:border-cobalt`,
  plus `motion-reduce:transition-none motion-reduce:hover:translate-y-0`
  for reduced-motion (CLAUDE.md §5 — accessibility gates, not optional).
  **This plan reuses that interaction pattern** (lift, glow, border
  recolor, motion-reduce guard) — same mechanism, reimplemented as plain
  Tailwind utility values instead of CSS custom properties, matching how
  batch-70 already reimplemented the teal accent.
- `StoreListingPage.jsx` already has its own internal pill-badge pattern
  (`ProductCard`'s category tag: `bg-indigo-900 text-indigo-300 px-2
  py-0.5 rounded-full`). The new category-card count badge reuses this
  exact mechanism, recolored to teal — the strongest "don't invent, reuse
  what's already here" match, since it's in the same file.
- `Hero.jsx`'s search box uses the phrasing convention
  `Try "merge pdf", "GST", "SIP", "resume"…` for its example-query
  placeholder. Reused verbatim as a *pattern* (not the literal copy) for
  the Store hero search placeholder.

## 1. Hero section (new)

Replaces the current plain `<h1>Digital Tools Store</h1>` + subtitle +
small search input block in the `view === 'categories'` branch.

```
┌───────────────────────────────────────────────────────────┐
│                                                             │
│              [ ✓ Verified sellers · Instant download ]      │  <- small teal pill badge
│                                                             │
│               Digital products, ready to use.               │  <- headline, centered
│      Templates, UI kits, and tools from verified sellers —   │
│         download instantly, no subscriptions.                │  <- subheadline, centered
│                                                             │
│     ┌─────────────────────────────────────────────────┐    │
│     │ 🔎  Try "UI kit", "Notion template", "bundle"…   │    │  <- large centered search
│     └─────────────────────────────────────────────────┘    │
│                                                             │
│                 128 products · 6 categories                  │  <- optional trust line, see §4
└───────────────────────────────────────────────────────────┘
```

- Whole block centered (`text-center`), `max-w-2xl mx-auto`, more
  vertical breathing room (`py-12` vs today's `pt-8 pb-6`) — this is the
  main "hero" difference from a plain page header.
- **Badge**: small pill above the headline, same shape convention as
  `Hero.jsx`'s privacy badge (`inline-flex items-center gap-2 text-xs
  font-semibold ... rounded-full py-1.5 px-3.5`), recolored dark/teal:
  `bg-teal-500/10 text-teal-400 border border-teal-500/30`. Copy:
  "Verified sellers · Instant download" — states two things already true
  of the store today (`store_sellers` approval gate, instant download
  tokens), not a fabricated claim.
- **Headline**: `text-4xl sm:text-5xl font-bold text-white` (up from
  today's `text-3xl`). Proposed copy, in AWE-OS's established voice
  (short, plain, benefit-first — matching `Hero.jsx`'s "Online tools
  that never upload your files."):
  **"Digital products, ready to use."**
  This is draft UI copy for your approval/edit, not final content per
  CLAUDE.md §7 — flagging it as such rather than treating it as settled.
- **Subheadline**: `text-gray-400 text-base sm:text-lg max-w-lg
  mx-auto`. Proposed copy:
  **"Templates, UI kits, and tools from verified sellers — download
  instantly, no subscriptions."**
  (Accurate: `purchases` is a one-time ledger, no subscription billing
  exists anywhere in the store's schema — not overclaiming.)
- **Search bar**: enlarged and centered, `max-w-xl mx-auto`, bigger
  padding (`py-4 px-5` vs today's `py-2.5 px-4`), `text-base`, `rounded-xl`
  (matches the existing card radius already used throughout this file).
  Leading magnifying-glass icon reused from `Hero.jsx`'s `HeroSearch`
  (same inline SVG, recolored `text-gray-500`, `focus-within:text-teal-400`
  on the wrapping container). Placeholder, following `Hero.jsx`'s "Try
  ..." convention with real product-type words already used elsewhere
  in this codebase (batch-70's `ICON_RULES` keywords):
  **`Try "UI kit", "Notion template", "bundle"…`**
  Same `onChange`/`handleLandingSearch` behavior as today — no logic
  change, purely a size/placement/copy change.

## 2. Category cards — polish

Current: `bg-gray-800 border border-gray-700 rounded-xl p-6 flex
flex-col items-center gap-2 text-center hover:border-teal-500
transition-colors`, bare 3xl emoji, plain count text.

New:
- **Icon-in-box** instead of a bare floating emoji — matches the
  tinted-icon-box convention used throughout `Hero.jsx`/`ToolCard.jsx`
  (`bg-cobalt-tint text-cobalt` boxes), reimplemented for dark/teal since
  there's no dark-mode token for it: a `w-14 h-14 rounded-xl
  bg-teal-500/10 text-teal-400 grid place-items-center text-2xl` box
  around the existing `categoryIcon()` emoji. No new icon library —
  same emoji lookup from batch-70, just given a designed container.
- **Hover**: lift + glow + border recolor, reusing `ToolCard.jsx`'s
  pattern with plain Tailwind values instead of tokens:
  `hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/10
  hover:border-teal-500 transition-all duration-200
  motion-reduce:transition-none motion-reduce:hover:translate-y-0`.
- **Count badge**: replaces today's plain `text-gray-500 text-xs` line
  with a pill badge, reusing this file's own `ProductCard` category-tag
  mechanism, recolored: `text-xs font-medium bg-teal-900/40
  text-teal-300 px-2.5 py-0.5 rounded-full`. Copy unchanged ("N items").
- Not included (flagging rather than silently adding): a `ToolCard`-style
  animated top accent bar on hover. It's a nice extra flourish but adds a
  second animated layer per card for one page; the lift+glow+badge
  changes above already deliver the "polished card" ask on their own.
  Can be added later if you want it after seeing the rest live.
- Grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  gap-5`) is unchanged — already responsive and consistently sized.

## 3. "Browse by Category" heading + "View all products" link

Unchanged in structure; only the card component above it changes.
Considered making the section heading bigger/bolder to match the new
hero's scale, but decided against it — it already reads as a clear
section label at its current size (`text-lg font-semibold`), and
inflating it would compete with the hero for attention rather than
support it.

## 4. Trust/credibility row — decision needed before implementing

Numbers honestly available **today, with zero backend changes**, since
they're derivable from data this page already fetches
(`GET /api/store/categories` → `{category, count}[]`):

- **Total products** = `categories.reduce((sum, c) => sum + c.count, 0)`
- **Total categories** = `categories.length`

Not available without a new backend endpoint (flagging, not adding):
distinct seller count, review/rating aggregates — `/api/store/categories`
doesn't return either, and no other loaded data on this page has them.

I have no live-DB visibility into how large the current catalog actually
is (no live Supabase calls this batch), so I can't confirm whether "128
products · 6 categories" reads as credible or "3 products · 1 category"
reads as thin. Two options:

- **Option A (recommended): self-suppressing row.** Render a single
  understated line — `{total} products · {categoryCount} categories`,
  small gray text with the two numbers in teal, directly under the
  search bar (per the hero mockup above) — but only when the real total
  clears a floor (proposed: **≥ 6 products**). Below that floor, render
  nothing. This never fabricates a number and never displays an
  embarrassingly small one; it just silently isn't there yet on a young
  catalog. The threshold (6) is a guess — tell me if you'd rather tune
  it or know the current live count first.
- **Option B: omit entirely this batch.** Add it later once the catalog
  has visibly grown, no self-suppression logic needed now.

Please confirm A vs. B (and the threshold, if A) when approving.

## Files to modify

- `client/src/modules/store/pages/StoreListingPage.jsx` only — the
  `view === 'categories'` header/hero block and the `CategoryCard`
  sub-component. No changes to `ProductCard`, the products/detail view,
  or any state/effect/API-call logic (all four already load exactly what
  this batch needs).

## Explicitly not touched

- `ProductCard` component and the entire category-detail view — out of
  this batch's stated scope (landing view only).
- No backend/route/schema changes.
- No new npm dependencies (icon stays the existing emoji lookup; search
  icon reuses the existing inline SVG pattern already in the codebase).
- No fabricated numbers — see §4.

## Testing (no live Supabase calls — build/syntax verification only)

- `npx vite build` (client) to confirm no bundler/syntax errors.
- Manual re-read of the new hero/card JSX against this plan's mockup.
- Confirm `motion-reduce` variants are present on every new hover
  animation (lift), matching `ToolCard.jsx`'s existing accessibility
  handling.
