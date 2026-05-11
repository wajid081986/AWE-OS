# AWE-OS Phase 3B — SEO + Analytics Engine

## Overview

Phase 3B extracts duplicated schema logic into reusable pure utilities, adds a provider-agnostic analytics hook, and patches SEO gaps on key pages — without touching `ToolPageShell` (backward compatibility preserved for 31 tools).

**Problems solved:**

1. **Duplicated schema code** — `ToolPageShell` and `ToolLayout` each had their own `buildSchemas()` / inline schema objects producing the same four JSON-LD types. Neither was importable. Now both import from shared pure functions.
2. **Page SEO gaps** — `CategoryPage` had no OG/Twitter tags; `ToolDetailPage` had zero JSON-LD; `Home` had no Organization/WebSite schema; `PricingPage` was missing its canonical tag.
3. **Zero client-side analytics** — GA4 was loaded in `index.html` but never called with custom events. The server endpoint `POST /api/events/track` existed but nothing used it.

---

## New Files

```
client/src/
├── utils/
│   ├── schema/
│   │   ├── generateToolSchema.js        — SoftwareApplication JSON-LD
│   │   ├── generateHowToSchema.js       — HowTo JSON-LD (null if no steps)
│   │   ├── generateFAQSchema.js         — FAQPage JSON-LD (null if no faqs)
│   │   ├── generateBreadcrumbSchema.js  — BreadcrumbList JSON-LD
│   │   ├── generateWebsiteSchema.js     — WebSite + SearchAction JSON-LD
│   │   ├── generateOrganizationSchema.js — Organization JSON-LD
│   │   ├── generateCategorySchema.js    — ItemList JSON-LD
│   │   └── index.js                     — Barrel export
│   ├── canonicalUrl.js                  — SITE_URL constant + 3 URL helpers
│   └── seoValidation.js                 — Dev-time SEO config checker
└── hooks/
    ├── useToolSEO.js                    — Full SEO object from tool/slug
    └── useAnalytics.js                  — GA4 + server event tracking
```

---

## 1. Schema Generators (`utils/schema/`)

Pure functions — no React, no app imports. Tree-shaken by Vite into only the chunks that use them.

### API

```js
// SoftwareApplication schema
generateToolSchema({ name, description, url, applicationCategory, keywords })
// keywords: string[] joined to comma string, or omitted if empty

// HowTo schema — returns null if steps is empty/falsy
generateHowToSchema(toolName, steps)

// FAQPage schema — returns null if faqs is empty/falsy
generateFAQSchema(faqs)  // faqs: { q, a }[]

// BreadcrumbList schema — position derived from array index
generateBreadcrumbSchema(items)  // items: { name, url }[]

// WebSite schema with SearchAction (Google Sitelinks Search Box)
generateWebsiteSchema({ siteUrl, siteName, searchUrlTemplate })

// Organization schema
generateOrganizationSchema({ siteUrl, name, description })

// ItemList schema for category pages
generateCategorySchema({ name, description, tools, siteUrl })
// tools: { name, slug, description }[]
```

### Nullable generators

`generateHowToSchema` and `generateFAQSchema` return `null` when their data is absent. Callers can safely do:

```js
const schemas = [
  generateToolSchema(...),
  generateHowToSchema(name, steps),   // may be null
  generateFAQSchema(faqs),            // may be null
  generateBreadcrumbSchema(items),
].filter(Boolean)
```

---

## 2. Canonical URL Utility (`utils/canonicalUrl.js`)

```js
export const SITE_URL = 'https://awe-os.com'
export function getCanonicalUrl(path)      // SITE_URL + path
export function getToolCanonical(slug)     // SITE_URL + '/tools/' + slug
export function getCategoryCanonical(slug) // SITE_URL + '/tools/' + slug
```

Replaces the `const SITE_URL = 'https://awe-os.com'` copy-pasted in `ToolLayout.jsx`, `CategoryPage.jsx`, and `ToolDetailPage.jsx`. (`ToolPageShell` keeps its own local constant — not modified.)

---

## 3. SEO Validation (`utils/seoValidation.js`)

```js
validateSEOConfig(seoConfig) → string[]
```

Returns an array of warning messages (empty = valid). Checks:
- Title length: 30–60 characters
- Description length: 70–160 characters
- Canonical: present and starts with `https://`
- OG tags: `og:title`, `og:description` present
- Twitter: `twitter:card` present

**Dev-time only** — not called in any production render path.

---

## 4. `useToolSEO` Hook (`hooks/useToolSEO.js`)

```js
const seo = useToolSEO(toolOrSlug, { steps, faqs })
```

Accepts a registry tool object or a slug string (auto-resolves via `getToolBySlug`).

Returns:
```js
{
  title, description, canonical, robots,
  ogTitle, ogDescription, ogUrl, ogType,
  twitterCard, twitterTitle, twitterDescription,
  schemas: object[],   // ready to JSON.stringify in Helmet
  toolMeta, catMeta, pageUrl,
}
```

**No side effects** — pure derivation, no useState/useEffect. Named `use*` for forward-compatible extension (memoization, context consumption) without changing callers.

Breadcrumb items built internally as `[Home, Tools, Category?(if catMeta), Tool]` — callers never build these manually.

---

## 5. `useAnalytics` Hook (`hooks/useAnalytics.js`)

```js
const { trackEvent } = useAnalytics()
trackEvent(eventName, properties)
```

`trackEvent` is stable (`useCallback` with empty deps). Never throws — all errors are swallowed. Fire-and-forget.

### Event routing

| eventName | GA4 event name | Forwarded to server? |
|-----------|---------------|---------------------|
| `tool_viewed` | `tool_viewed` | ✓ |
| `tool_used` | `tool_used` | ✓ |
| `resume_generated` | `resume_generated` | ✓ |
| `payment_success` | `purchase` | ✓ |
| `user_signup` | `sign_up` | ✓ |
| `tool_shared` | `share` | ✓ |
| `feature_clicked` | `select_content` | ✓ |
| `download` | `file_download` | — |
| `upload` | `file_upload` | — |
| `search` | `search` | — |
| `cta_click` | `click` | — |
| `tool_error` | `exception` | — |

**GA4 call:** `window.gtag?.('event', ga4Name, properties)` — optional-chain is a no-op if GA4 is blocked or not yet loaded.

**Server call:** `fetch` directly (not axios — endpoint is public, no auth needed).
- URL: `${VITE_API_URL}/api/events/track` (falls back to `https://awe-os.onrender.com`)
- Payload: `{ tool_id, event_type, metadata: { ...rest } }`

### Usage example

```js
const { trackEvent } = useAnalytics()

useEffect(() => {
  trackEvent('tool_viewed', { tool_id: 'merge-pdf' })
}, [])

const onGenerate = () => {
  trackEvent('tool_used', { tool_id: 'resume-builder' })
}
```

---

## 6. Page Fixes

### `ToolLayout.jsx`

- Removed local `buildSchemas()` function and local `SITE_URL` constant.
- Now imports `{ SITE_URL, getToolCanonical }` from `../../utils/canonicalUrl`.
- Now imports all 4 schema generators from `../../utils/schema`.
- Schemas built inline with `.filter(Boolean)` for nullable generators.
- Helmet structure unchanged — no visual regressions.

### `CategoryPage.jsx`

Added 7 OG/Twitter meta tags. Replaced:
- Inline `itemListSchema` object → `generateCategorySchema(...)`
- Inline `breadcrumbSchema` object → `generateBreadcrumbSchema([...])`
- Local `SITE_URL` constant → imported from `../utils/canonicalUrl`
- Inline canonical string → `getCategoryCanonical(category)`

### `ToolDetailPage.jsx`

Added OG/Twitter meta tags + two `<script type="application/ld+json">` tags:
- `generateToolSchema` — SoftwareApplication (3-level, no category since API-driven tools have no registry category)
- `generateBreadcrumbSchema` — 3-level breadcrumb (Home / Tools / Tool Name)
- Replaced hardcoded `https://awe-os.com/tools/${tool.slug}` with `getToolCanonical(tool.slug)`

### `PricingPage.jsx`

Added one `<link rel="canonical" href="https://awe-os.com/pricing" />` inside the existing Helmet.

### `Home.jsx`

Added OG/Twitter meta tags + two JSON-LD schemas:
- `generateWebsiteSchema()` — enables Google Sitelinks Search Box
- `generateOrganizationSchema()` — Organization entity for Knowledge Panel

Schema objects are **module-level constants** (`WEBSITE_SCHEMA`, `ORG_SCHEMA`) — computed once at module load, not on every render.

---

## 7. What Was NOT Changed

- `ToolPageShell.jsx` — untouched. 31 tools continue working with its inline schema logic.
- No new npm dependencies added.
- No route changes.
- `og:image` omitted (no real image asset exists yet).
- GA4 script tag in `index.html` — not re-added or modified.
- Server `robots.txt` and `sitemap.xml` — already correct, not modified.

---

## 8. Checklist for Adding Analytics to a Tool

```
[ ] 1. Import hook:   const { trackEvent } = useAnalytics()

[ ] 2. View event:    useEffect(() => trackEvent('tool_viewed', { tool_id: slug }), [])

[ ] 3. Use event:     trackEvent('tool_used', { tool_id: slug, /* additional props */ })

[ ] 4. Error event:   catch (e) { trackEvent('tool_error', { tool_id: slug, message: e.message }) }
```

---

## 9. Verification

1. **Build:** `npm run build` in `client/` — zero errors ✓
2. **Tool page schema:** Inspect `<head>` on any ToolLayout tool — expect 4 `<script type="application/ld+json">` tags. Validate at [schema.org/validator](https://validator.schema.org).
3. **Category OG:** Visit `/tools/pdf` DevTools → Elements → `<head>` — `og:title`, `og:description`, `og:url` present.
4. **ToolDetailPage schema:** Visit any API-driven tool — 2 JSON-LD scripts (SoftwareApplication + BreadcrumbList) in `<head>`.
5. **Pricing canonical:** Visit `/pricing` — `<link rel="canonical" href="https://awe-os.com/pricing">` in `<head>`.
6. **Home schemas:** Visit `/` — 2 JSON-LD scripts (WebSite + Organization) in `<head>`.
7. **Analytics:** In browser console: `window.gtag('event', 'test')` — no error. Network tab after `trackEvent('tool_viewed', ...)` — POST to `/api/events/track`.
8. **Regression:** Visit `/tools/merge-pdf` — ToolPageShell renders correctly (schema intact, not modified).
