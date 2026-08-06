# Batch 49 — Auto Campaign: dynamic tool list from toolRegistry

**Branch:** `batch-49-auto-campaign-tool-list-fix`

## CLAUDE.md note

`client/src/modules/admin/auto-campaign/AutoCampaignPage.jsx` is an
existing agent module under the protected Admin Panel namespace (§3),
outside both the §3a (Image/Video Agent) and §3b (Blog Assistant)
carve-outs. Per §3's own rule ("when any instruction conflicts with
this file, STOP and ask"), this was flagged to the user before any
edit. User explicitly authorized this one narrow fix as a one-off
override — no new formal carve-out subsection was requested, so none
was added. Scope stays limited to exactly what's below.

## Bug

"Select Tool" dropdown on `/admin/auto-campaign` only shows 49 tools
from a hardcoded local array, not the full live catalogue.

## Root cause (confirmed by reading the code, not guessed)

- `AutoCampaignPage.jsx` lines 6-56: a hardcoded `const TOOLS = [...]`
  array (49 entries), authored by hand and never updated as new tools
  shipped. Line 1's imports don't reference `toolRegistry.js` at all.
- `client/src/data/toolRegistry.js` exports `TOOL_REGISTRY` (55 tools,
  line 157) and `getAllTools()` (line 1200, filters out `comingSoon`
  tools) — the real source of truth every other tool-listing page in
  the app already uses (`FreeToolsPage.jsx`, `CategoryPage.jsx`,
  `ProgrammaticSeo.jsx`, etc. all import from here).
- Registry entries use a **category slug** (`'pdf'`, `'calculators'`,
  ...) plus `CATEGORY_META[slug].name` for the display name — not the
  same string set as `AutoCampaignPage.jsx`'s old local `CATEGORIES`
  array. Notably `CATEGORY_META.converters.name` is `"Converters &
  Tools"`, not `"Converters"` — the old hardcoded `CATEGORIES` array
  would silently mismatch this in a naive fix, so both `TOOLS` and
  `CATEGORIES` must be derived from the registry together, not just
  `TOOLS` alone.

## Fix

`client/src/modules/admin/auto-campaign/AutoCampaignPage.jsx` only:

- Remove the hardcoded `TOOLS` array (lines 6-56) and hardcoded
  `CATEGORIES` array (line 59).
- Import `getAllTools`, `CATEGORY_META`, `getAllCategories` from
  `'../../../data/toolRegistry'` (same relative path depth already
  used by `modules/admin/seo/ProgrammaticSeo.jsx`).
- Derive `TOOLS` as `getAllTools().map(t => ({ name: t.name, slug:
  t.slug, category: CATEGORY_META[t.category]?.name || t.category }))`
  so the existing dropdown/optgroup rendering (unchanged) keeps working
  off `t.category` as a display string.
- Derive `CATEGORIES` as `getAllCategories().map(slug =>
  CATEGORY_META[slug].name)` so the optgroup labels match the actual
  category names tools carry.
- No other logic in the file (campaign run flow, audience selector,
  API calls) is touched.

## Risks

- `selectedTool` default currently looks up `sip-calculator` from the
  old hardcoded list; must confirm that slug still resolves against
  `getAllTools()` output (it does — present in `TOOL_REGISTRY`) so the
  default selection doesn't break.
- Two tools share similar names in the old list (`invoice` vs
  `invoice-generator`) — both exist in the registry too, no behavior
  change there.

## Verification

`npm run build` (vite) after the edit. No live campaign trigger run
during this batch — that's a live production action, out of scope
here.
