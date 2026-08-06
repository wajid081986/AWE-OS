# Batch 50 — Growth OS

Unified marketing platform that merges Blog Assistant, Content Engine, and
Auto Campaign into one flagship product at `/admin/growth-os`. Existing
pages (`/admin/blog`, `/admin/auto-campaign`, `/admin/content-engine`)
keep working unchanged — Growth OS is a new composed view on top.

Falls under CLAUDE.md §3a's Admin Panel carve-out: new agent module under
`client/src/modules/admin/` that does not modify existing agents. Only the
three named integration points get one additive line each.

## Findings that shaped this plan

- Real paths differ from the original prompt: modules live under
  `client/src/modules/admin/**`, not `pages/admin/**`.
- `content-humanizer.routes.js` / a standalone `auto-campaign.routes.js`
  don't exist — humanize endpoints live in `server/routes/admin-blog.js`,
  campaign logic in `server/routes/auto-campaign.js`.
- `ContentEngine.jsx` (`/admin/content-engine`) already has `SocialBlast`
  (6-platform generator via `POST /api/admin/social-blast-claude`) and
  `BlogWriterPanel`.
- `BlogAssistant.jsx` already has separately-importable `SeoAuditor` and
  `ContentStudio` (paste-in humanizer) components.
- `AutoCampaignPage.jsx` already is the one-click blog+tweet+pin+reddit/
  quora-draft flow (`POST /api/auto-campaign/run`, SSE).
- `BlogWriterPanel`, `SocialBlast`, `SeoAuditor`, `ContentStudio` all take
  zero props — reusable as-is, but the Blog Creator sub-tab needs its own
  small form (not `BlogWriterPanel`) so Strategy output can pre-fill it.

## Files

**New (open under §3a):**
1. `client/src/modules/admin/growth-os/GrowthOS.jsx` — shell, 3-tab
   switcher (Strategy/Create/Grow), shared state so Strategy output can
   pre-fill Create.
2. `client/src/modules/admin/growth-os/StrategyTab.jsx` — Goal Setter →
   one composed AI call for keyword research + competitor analysis +
   7-day content calendar.
3. `client/src/modules/admin/growth-os/CreateTab.jsx` — sub-nav with:
   Blog Creator (new small form → existing `/api/admin/blog/generate`),
   Humanizer (reuse `<ContentStudio />`), Social Content Generator
   (reuse `<SocialBlast />`), Image Prompt Generator (new, small),
   SEO Optimizer (reuse `<SeoAuditor />`).
4. `client/src/modules/admin/growth-os/GrowTab.jsx` — Publishing Queue +
   Platform Publisher (embeds `<AutoCampaignPage />` for API-connected
   platforms + copy-button cards for the rest), Analytics (reads
   `GET /api/admin/blog/published` + localStorage drafts — no new
   table), AI Recommendations (new endpoint).
5. `server/routes/admin-growth-os.js` — two new endpoints only:
   `POST /api/admin/growth-os/strategy`,
   `GET /api/admin/growth-os/recommendations`. Social-content and
   SEO-optimize reuse existing `/api/admin/social-blast-claude` and
   `/api/admin/blog/seo-analyze` — no duplicate routes.

**Modified (protected zone, one additive line each):**
6. `client/src/shared/components/AdminShell.jsx` — one new `NAV_ITEMS`
   entry at the top: `{ icon: '⭐', label: 'Growth OS', to: '/admin/growth-os', badge: 'NEW' }`.
7. `client/src/app/routes.jsx` — one lazy import + one
   `<Route path="/admin/growth-os" .../>` inside the existing AdminShell
   route block.
8. `server/index.js` — one `require(...)` + one
   `app.use('/api/admin/growth-os', adminLimiter, adminGrowthOsRoutes)`.

No DB migration — Publishing Queue/Analytics stay localStorage-derived +
existing tables, matching the precedent set by `SocialBlast`/
`BlogWriterPanel`'s draft history.

## Risks

- Each tab is comparable in size to `AutoCampaignPage.jsx`/
  `ContentEngine.jsx` on its own — large diff, reviewed as one batch per
  user's choice (single batch-50, not split into sub-batches).
- Strategy tab's competitor analysis has no existing engine to reuse —
  genuinely new AI prompt logic.
