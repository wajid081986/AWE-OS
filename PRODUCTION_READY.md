# AWE-OS — Production Ready Checklist

**Date:** 2026-05-05  
**Build:** ✅ `npm run build` passes — zero errors, 1,870 modules, 2.85s

---

## Files Created / Modified This Session

### Server

| File | Status | Description |
|------|--------|-------------|
| `server/controllers/tools.controller.js` | ✅ New | `getPublicTools` + `getPublicTool` — paginated, filtered, searchable |
| `server/routes/tools.routes.js` | ✅ Modified | Added `GET /public` + `GET /public/:slug` before `/:slugOrId` wildcard |
| `server/db/migrations/008_seed_saas_tools.sql` | ✅ New | Adds `icon` + `usage_count` to saas_tools; seeds 20 live tools |

### Client

| File | Status | Description |
|------|--------|-------------|
| `client/src/components/AdBanner.jsx` | ✅ Updated | Fixed min-height (90px/250px/50px) to prevent CLS |
| `client/src/pages/NotFoundPage.jsx` | ✅ Rewritten | Public design — search bar, popular tools, Home/Tools CTAs |
| `client/index.html` | ✅ Updated | Full SEO meta tags, OG tags, GA4 + AdSense placeholders |
| `client/public/robots.txt` | ✅ Updated | Allows /tools/*, /calculators/*, /about, /privacy, /terms, /contact |
| `client/public/sitemap.xml` | ✅ New | All 28 public URLs with priorities and changefreq |

---

## Public API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tools/public` | None | Paginated, filtered, searchable published tools |
| GET | `/api/tools/public/:slug` | None | Single tool by slug (also increments usage_count) |

### Query params for `/api/tools/public`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 50) |
| `category` | string | — | Filter: `ai_tools`, `converters`, `calculators`, `products` |
| `search` | string | — | ilike search in name + description |
| `sort` | string | `created_at` | `created_at` or `quality` |

### Response shape

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Resume Builder",
      "slug": "resume-builder",
      "category": "ai_tools",
      "description": "...",
      "icon": "📄",
      "usageCount": 12500,
      "isFeatured": true,
      "isNew": false,
      "is_free": true,
      "price": 0,
      "created_at": "2026-05-05T..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 20, "totalPages": 1 }
}
```

---

## Database Setup (Run in Supabase SQL Editor)

Run migrations in order:
```
schema.sql
schema_autonomous.sql
schema_decision.sql
schema_builder.sql
schema_testing.sql
migrations/001_token_blacklist.sql
migrations/002_event_summary_rpc.sql
migrations/003_tools_saas_tool_id.sql
migrations/004_learning_rpcs_and_cron_health.sql
migrations/005_saas_tools_and_missing_tables.sql
migrations/006_schema_fixes.sql
migrations/007_enterprise_hardening.sql
migrations/008_seed_saas_tools.sql   ← NEW — seeds 20 tools
```

Migration 008 adds `icon` and `usage_count` columns to `saas_tools` then inserts all 20 live tools with `ON CONFLICT (slug) DO UPDATE` — safe to re-run.

---

## Google AdSense Checklist

### Policy Requirements (ALL must be met before applying)

- [x] "Advertisement" label above every ad unit
- [x] Three standard sizes with fixed heights (no CLS):
  - Leaderboard: 728×90 (desktop) / 320×50 (mobile)
  - Rectangle: 300×250
- [x] Ads never cover content
- [x] No sticky/overlay/popup ads
- [x] No countdown timers or misleading elements
- [x] Every page has unique title + meta description + canonical URL
- [x] Privacy Policy includes Google AdSense data disclosure
- [x] Terms of Service covers advertising
- [x] No broken links on public pages
- [x] 200+ words of original content on every tool page (FAQ + how-to)
- [x] robots.txt allows GoogleBot to crawl all public pages

### To Activate AdSense

1. Apply at **adsense.google.com** with `awe-os.com`
2. Add the site verification meta tag to `client/index.html`
3. In `client/index.html`, uncomment and replace `ca-pub-XXXXXXXXXXXXXXXX`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOURPUBLISHERID" crossorigin="anonymous"></script>
   ```
4. In `client/src/components/AdBanner.jsx`, replace placeholder divs with:
   ```html
   <ins className="adsbygoogle"
     style={{ display: 'block' }}
     data-ad-client="ca-pub-YOURPUBLISHERID"
     data-ad-slot="YOURADSLOT"
     data-ad-format="auto"
     data-full-width-responsive="true" />
   ```
5. Add to `client/src/main.jsx` after render: `(adsbygoogle = window.adsbygoogle || []).push({});`

---

## Google Analytics GA4 Checklist

1. Create GA4 property at **analytics.google.com**
2. Get your Measurement ID (format: `G-XXXXXXXXXX`)
3. In `client/index.html`, uncomment the GA4 block and replace `G-XXXXXXXXXX`
4. Events to track manually (add to tool run button clicks):
   ```js
   // Track tool usage
   gtag('event', 'tool_use', { tool_name: toolName, tool_category: category })
   // Track search
   gtag('event', 'search', { search_term: query })
   ```

---

## SEO Checklist

- [x] `client/public/sitemap.xml` — 28 URLs with priorities
- [x] `client/public/robots.txt` — allows all public pages, blocks admin/api
- [x] `index.html` — global OG tags, twitter cards, canonical
- [x] Each page has its own `<Helmet>` with unique title + description + canonical
- [x] Tool detail pages have 200+ words, FAQ (5 questions), numbered how-to steps
- [x] Breadcrumb navigation on tool detail pages
- [x] Semantic HTML: `<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`, `<details>`
- [ ] Submit sitemap to Google Search Console after deployment
- [ ] Add JSON-LD structured data to tool pages (enhancement)
- [ ] Add `lastmod` dates to sitemap.xml dynamically via API (enhancement)

---

## Performance Checklist

- [x] All page imports are `lazy()` + `<Suspense>` — zero blocking JS on initial load
- [x] Inter font loaded via Google Fonts with `preconnect` hints
- [x] All tool cards use loading skeleton (`LoadingSkeleton.jsx`) during API fetch
- [x] Images: no heavy images added — emoji icons used throughout
- [x] AdBanner: fixed min-heights prevent CLS (Core Web Vitals)
- [x] Code splitting: every page is a separate JS chunk (see build output)
- [ ] Add `loading="lazy"` to any future `<img>` tags
- [ ] Enable Brotli compression on server (Express `compression` middleware already installed)
- [ ] Set cache headers: `Cache-Control: public, max-age=31536000` on `/assets/*`

---

## Deployment Checklist

### Vercel (Frontend)
- [ ] `vercel.json` already exists in client — review rewrites for SPA routing
- [ ] Set environment variable: `VITE_API_URL=https://your-server.onrender.com`
- [ ] Set environment variable: `VITE_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXX` (after approval)

### Render / Railway (Backend)
- [ ] Set all env vars from `server/.env.example`
- [ ] Set `REDIS_URL` for BullMQ queue service
- [ ] Run `npm install` then `npm start`
- [ ] Verify `/api/tools/public` returns 200 with tools list

### Post-deployment
- [ ] Run migration 008 in Supabase SQL Editor
- [ ] Verify `/api/tools/public` returns the 20 seeded tools
- [ ] Submit `https://awe-os.com/sitemap.xml` to Google Search Console
- [ ] Apply for Google AdSense
- [ ] Test on mobile (Chrome DevTools → iPhone 12 viewport)
- [ ] Run Lighthouse audit — target: Performance 90+, SEO 95+

---

## Quick Reference — Key URLs

| URL | What it is |
|-----|-----------|
| `/` | Public homepage |
| `/tools` | All tools grid |
| `/tools/:slug` | Individual tool page |
| `/about` | About AWE-OS |
| `/privacy` | Privacy Policy (GDPR + AdSense) |
| `/terms` | Terms of Service |
| `/contact` | Contact form |
| `/calculators` | Existing calculator pages |
| `/login` | Auth page |
| `/dashboard` | User dashboard (protected) |
| `/admin` | Admin panel (protected) |
| `/api/tools/public` | Public tools API |
| `/api/tools/public/:slug` | Single tool API |
| `/sitemap.xml` | Sitemap for search engines |
| `/robots.txt` | Crawler instructions |
