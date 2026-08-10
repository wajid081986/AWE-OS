# Batch 70 — Marketplace Category-Card Browsing (Public /store)

## Scope decision (resolved with user before writing this plan)

Three "store" surfaces exist in the codebase; only one is the target:

- `client/src/modules/store/pages/StoreListingPage.jsx` — **the target.**
  Public, no login, mounted at `/store` under `PublicLayout` (see
  `client/src/app/routes.jsx` lines 213–215). Reads the `digital_products`
  table via `GET /api/store/products` / `GET /api/store/categories`
  (`server/routes/store.public.routes.js`). This is the buyer-facing
  CodeCanyon-equivalent marketplace.
- `client/src/modules/store/pages/StorePage.jsx` (`/dashboard/store`) and
  `client/src/modules/products/pages/ProductsStorePage.jsx`
  (`/dashboard/products`) — behind Login, read the `tools` table.
  **Not touched.**
- `client/src/modules/store/pages/MarketplacePage.jsx` (`/dashboard/marketplace`)
  — a tabbed wrapper around the two dashboard pages above. **Not touched.**

Confirmed with user: `digital_products.category` (free text, seller/admin-
entered, default `'General'`) is **not** connected to `tools.product_type`
(notion-template, ui-kit, browser-extension, api-kit, agent-pack, bot-kit,
automation-template, mobile-template, static-bundle — added in migration
040, used only by the AI Factory pipeline). No code path copies a `tools`
row into `digital_products`; that linkage is a separate future feature
(Marketplace Listing Automation, `docs/sdd/AWE-OS_AI-Factory_Growth-Features_SDD.md`
Feature 1) and is explicitly **not** part of this batch. This batch
reorganizes whatever categories already exist in `digital_products` today
— it does not introduce `product_type`-named categories (Notion Templates,
UI Kits, etc.) since that data doesn't reach this page.

## Category data — how the redesign gets real values without a live query

`digital_products.category` has no canonical list anywhere in the code
(`ProductManager.jsx`'s admin form is a free-text `<input>`, default
`'General'`). Per this batch's rule (no live Supabase calls), the actual
current category strings are unknown to me. Rather than guess or hardcode
a list, the redesign stays **fully data-driven**: the existing
`GET /api/store/categories` endpoint already returns
`{ category, count }[]` computed from live rows — the category-card grid
renders directly off that response, same as today's dropdown does. This
means:

- No backend change needed (confirms this can be genuinely frontend-only).
- Whatever categories are live today (`'General'` and/or others) render
  correctly as cards with accurate counts, no invented names.
- New categories a seller/admin adds later automatically appear as new
  cards — no code change required.

## Design-system note (flagged, not silently resolved)

CLAUDE.md §4 requires colors from `design-system/tokens.css`, and the user
asked for category cards to match "AWE-OS's existing dark theme + teal
accent." Two facts in tension:

1. `design-system/tokens.css` (light theme, `--paper`/`--card`/`--ink`,
   `--cobalt` teal accent) is used by the **public marketing site**
   (Home, Header, Footer, `/tools`, blog) per the UX Blueprint.
2. The Store page family (`StoreListingPage.jsx` included) has **never**
   used that token system — it's raw Tailwind dark-mode utilities
   (`bg-gray-900`/`bg-gray-800`/`border-gray-700`) with an **indigo-600**
   accent, styled as an "app surface," not a Blueprint-governed page.

Retrofitting `tokens.css` custom properties into a component tree that's
never consumed them would be a much larger visual-system change than this
batch's scope. This plan keeps the **existing mechanism** (raw Tailwind
utility classes, dark gray surface) and only **recolors the accent** from
indigo to teal (Tailwind's `teal-600`/`teal-500`/`teal-900`, which visually
match `--cobalt`'s `#0F766E` family) on the new/changed elements. Existing
elements not touched by this batch (e.g. `ProductCard`'s indigo category
pill, indigo price text) are left as-is — recoloring the entire page's
existing indigo usage is out of scope creep, not requested.

## Layout

Single file, two view-states inside `StoreListingPage.jsx` (`view: 'categories' | 'products'`, plus existing `category`/`q`/`sort`/`page` state, all preserved). No route change — still `/store`.

### 1. Header (unchanged)
"Digital Tools Store" title + subtitle, same as today.

### 2. Category grid view — the new default landing state

```
┌─────────────────────────────────────────────────────────┐
│  Digital Tools Store                                     │
│  Templates, resources & tools from verified sellers      │
│                                                           │
│  [ 🔎  Search all products...                    ]       │  <- always-visible search
│                                                           │
│  Browse by Category                                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐│
│  │  📦        │ │  🧩        │ │  📄        │ │  🧰        ││
│  │  General   │ │  UI Kits   │ │  Templates │ │  Bundles  ││
│  │  12 items  │ │  5 items   │ │  8 items   │ │  3 items  ││
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘│
│                                                           │
│                          [ View all products → ]         │
└─────────────────────────────────────────────────────────┘
```

- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`,
  matching the product grid's existing responsive pattern.
- Each **CategoryCard**: `bg-gray-800 border border-gray-700 rounded-xl`
  (same as `ProductCard`), `hover:border-teal-500` (recolored),
  centered icon (emoji, see below), category name (title-cased from the
  raw string), `"{count} items"` in muted gray. Whole card is a
  `<button>` (not a link — no new route) that sets
  `view='products'; category=<that category>; page=1`.
- Icon: a small keyword→emoji lookup (`templateIcon(categoryName)`),
  case-insensitive substring match against common words (`template`→📄,
  `kit`→🧩, `bundle`/`pack`→🧰, `extension`/`plugin`→🧷, `agent`/`bot`→🤖,
  `api`→🔌, `mobile`/`app`→📱), falling back to 📦 for anything
  unmatched (e.g. `'General'`). Pure presentation, no new dependency —
  matches the emoji-icon convention already used across this file family
  (`📦`, `🛠️`, `🧮`, `★`).
- `"View all products →"` link/button below the grid: sets
  `view='products'; category=''` — reproduces today's "All Categories"
  behavior for anyone who wants the flat, unfiltered list.
- Empty-state fallback: if `/api/store/categories` returns zero
  categories (e.g. fresh/empty catalog), skip straight to the flat
  products view instead of showing an empty card grid — reuses the
  existing "No products found" empty state already in the file.

### 3. Product/category detail view — after a card is clicked (or "View all")

```
┌─────────────────────────────────────────────────────────┐
│  ← All Categories                                        │
│                                                            │
│  UI Kits · 5 products                                     │
│  [ 🔎 Search UI Kits...              ]  [ Sort: ▾ ]        │
│                                                            │
│  ( Browse New )  ( Browse Bestsellers )                    │  <- pill tabs
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ product  │ │ product  │ │ product  │   ...existing      │
│  │  card    │ │  card    │ │  card    │   ProductCard grid │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                            │
│              [ Previous ]  Page 1 of 2  [ Next ]           │
└─────────────────────────────────────────────────────────┘
```

- `← All Categories` button: `view='categories'` (category/search/sort
  reset to defaults, matching a natural "back" action).
- Heading shows the active category name + live count (or "All Products"
  when reached via "View all").
- Search input (same as today) stays available, scoped by the current
  `category` param exactly as the API already supports.
- **"Browse New" / "Browse Bestsellers" pill tabs** — new prominent
  control, directly satisfying the requested CodeCanyon-style UX. They
  set `sort='newest'` / `sort='popular'` respectively (both already
  valid entries in the existing `SORTS` map — no API change) and
  visually highlight (`bg-teal-600 text-white` active /
  `bg-gray-800 text-gray-400` inactive) whichever is active.
- The other 3 existing sort options (Top Rated, Price ↑, Price ↓) move
  into a compact secondary `Sort: ▾` `<select>` next to the tabs —
  functionality preserved, just visually secondary to the two headline
  tabs per the CodeCanyon-style brief. Selecting one of these three
  deactivates both pill tabs' highlighted state (since `sort` no longer
  matches `newest`/`popular`); no other behavior change.
- Below: the existing `ProductCard` grid + Previous/Next pagination,
  completely unchanged.

## Files to modify

- `client/src/modules/store/pages/StoreListingPage.jsx` only. New
  `view` state; a `CategoryCard` sub-component and a `templateIcon()`
  helper added inline in the same file (matches the file's existing
  pattern of inlining `Spinner`/`ProductCard`/`Toast`-style helpers
  rather than splitting into new component files for one page).

## Explicitly not touched

- `server/routes/store.public.routes.js` and all other backend routes —
  the existing `/products` and `/categories` endpoints already return
  everything this redesign needs.
- No migration, no `product_type` column on `digital_products`.
- `StorePage.jsx`, `MarketplacePage.jsx`, `ProductsStorePage.jsx`
  (dashboard, behind Login) — untouched.
- Admin AI Factory page, seller/checkout/payment flows, product
  generation logic — untouched, per explicit out-of-scope list.
- `ProductCard`'s existing indigo accents (category pill, price color) —
  left as-is; only new/changed elements get the teal recolor.

## Testing (no live Supabase calls — build/syntax verification only)

- `npm run build` (client) to confirm no bundler/type errors.
- Manual re-read of both view-states' JSX against this plan's ASCII
  layouts to confirm structure.
- Confirm `SORTS` map keys used by the new pill tabs (`newest`,
  `popular`) match `server/routes/store.public.routes.js`'s `SORTS`
  object exactly (`newest`, `popular`, `price_asc`, `price_desc`,
  `rating`) — no drift between frontend sort values and backend-accepted
  values.

## Known follow-up (not this batch)

- Wiring AI-Factory `tools.product_type` output into `digital_products`
  so product-type-named categories (Notion Templates, UI Kits, etc.)
  actually populate this page — tracked separately as Growth Features
  SDD Feature 1 (Marketplace Listing Automation).
