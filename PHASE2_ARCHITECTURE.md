# AWE-OS Phase 2 Architecture

## Overview

Phase 2 replaced 40+ hardcoded React Router routes with a dynamic, registry-driven tool system. The result: adding a new tool requires touching exactly two files. AI-generated tools require zero frontend changes.

---

## 1. Routing Architecture

### Before

Every tool had its own `<Route>` and `lazy(() => import(...))` in `routes.jsx` — 40+ entries that had to be manually maintained.

### After

```
/tools              → ToolsPage (directory + search)
/tools/pdf          → CategoryPage (category="pdf")
/tools/calculators  → CategoryPage (category="calculators")
/tools/converters   → CategoryPage (category="converters")
/tools/ai           → CategoryPage (category="ai")
/tools/:slug        → DynamicToolPage (resolves from registry, falls back to API)
```

Four explicit category routes are declared **before** the `/:slug` catch-all so React Router v7 matches them first.

---

## 2. Tool Registry (`client/src/data/toolRegistry.js`)

Single source of truth for all tool metadata.

### Key exports

| Export | Purpose |
|--------|---------|
| `TOOL_REGISTRY` | Array of all tool objects |
| `CATEGORY_META` | Object keyed by category slug — name, icon, SEO copy, intro content |
| `SLUG_ALIASES` | Legacy URL redirects (`image-to-pdf` → `jpg-to-pdf`) |
| `getToolBySlug(slug)` | Lookup by slug, resolves aliases |
| `getToolsByCategory(cat)` | All tools in a category |
| `getCategoryMeta(cat)` | Category metadata object |
| `getCatalogueSections(cat)` | Grouped by subcategory for rendering |
| `getRelatedTools(tool, limit)` | Related tools by tags/category |
| `toolToCardShape(tool)` | Normalized card props |

### Tool object shape

```js
{
  slug:        'merge-pdf',          // URL segment, must be unique
  name:        'Merge PDF',          // Display name
  category:    'pdf',                // Must match a CATEGORY_META key
  subcategory: 'Organize',          // Groups tools in CategoryPage
  icon:        '📄',
  description: 'Combine multiple PDF files...',
  isFeatured:  true,
  isNew:       false,
  isPremium:   false,
  comingSoon:  false,
  tags:        ['pdf', 'merge', 'combine'],
  relatedSlugs: ['split-pdf', 'organize-pdf'],
  seo: {
    title:       'Merge PDF Files Online Free | AWE-OS',
    description: 'Combine multiple PDF files into one...',
  },
}
```

---

## 3. DynamicToolPage (`client/src/pages/tools/DynamicToolPage.jsx`)

Resolution chain for every `/tools/:slug` request:

```
1. Extract slug from URL params
2. Look up slug in TOOL_COMPONENTS (static map of lazy imports)
3. If found → render that component
4. If not found → render ToolDetailPage (fetches from /api/tools/:slug)
```

The `ALIAS_COMPONENT_MAP` merges legacy aliases so old URLs still work without redirects.

### Adding a new static tool

1. Add an entry to `TOOL_REGISTRY` in `toolRegistry.js`
2. Add a lazy import to `TOOL_COMPONENTS` in `DynamicToolPage.jsx`:
   ```js
   'my-new-tool': lazy(() => import('./category/MyNewTool')),
   ```

That's it. No route changes. No sitemap changes (server auto-discovers from DB or static list).

### AI-generated tools (zero frontend changes)

Tools created by the AI Factory pipeline are saved to the `saas_tools` table with a `slug`. When a user visits `/tools/ai-generated-slug`, `DynamicToolPage` finds no static component and falls through to `ToolDetailPage`, which fetches the tool spec from the API and renders it dynamically.

---

## 4. CategoryPage (`client/src/pages/CategoryPage.jsx`)

Receives a `category` prop from the route. Reads all data from the registry — no API calls.

### Rendered sections

1. **Breadcrumb** — `Home / Tools / {Category Name}`
2. **Hero** — category title, description, trust badges
3. **Tool grid** — grouped by subcategory via `getCatalogueSections()`
4. **"Why use {category}" section** — from `CATEGORY_META[category].intro`
5. **Explore more categories** — links to the other 3 category pages
6. **CTA strip** — sign-up prompt

### Schema.org

`ItemList` schema listing all tools in the category, plus `BreadcrumbList`.

---

## 5. ToolPageShell (`client/src/pages/tools/ToolPageShell.jsx`)

Wrapper used by all 31 individual tool components. Accepts a `slug` prop and auto-resolves metadata — existing tool files require no changes.

### Props

```jsx
<ToolPageShell
  slug="merge-pdf"          // required — drives registry lookup
  steps={['Step 1...', 'Step 2...']}   // optional — HowTo schema
  faqs={[{ q: '...', a: '...' }]}      // optional — FAQPage schema
>
  {/* tool UI */}
</ToolPageShell>
```

### Auto-resolved from registry

- `toolMeta` — full tool object (name, description, tags, etc.)
- `catMeta` — parent category metadata
- Related tools (sidebar)
- OpenGraph + Twitter Card meta tags
- 4-level breadcrumb: `Home / Tools / {Category} / {Tool}`

### Schema.org injected automatically

- `SoftwareApplication` — free web tool
- `HowTo` — when `steps` prop provided
- `FAQPage` — when `faqs` prop provided
- `BreadcrumbList` — always

---

## 6. Bundle Splitting (`client/vite.config.js`)

Heavy PDF/document libraries are split into dedicated chunks, loaded only when their tools are first visited:

| Chunk | Library | Size (gzip) |
|-------|---------|-------------|
| `vendor-react` | react-dom, react-router | ~59 kB |
| `vendor-charts` | recharts | ~40 kB |
| `vendor-pdfjs` | pdfjs-dist | ~135 kB |
| `vendor-pdf-lib` | pdf-lib | ~207 kB |
| `vendor-jspdf` | jspdf | ~129 kB |
| `vendor-xlsx` | xlsx | ~142 kB |

A user visiting `/tools/bmi-calculator` downloads none of the PDF chunks.

---

## 7. SEO Architecture

### Canonical URLs

```
/tools/pdf           → Category landing (pdf tools)
/tools/merge-pdf     → Individual tool page
/tools/image-to-pdf  → Alias — same component as /tools/jpg-to-pdf
```

Aliases serve the same React component without HTTP redirects, keeping latency zero. Canonical `<link>` tags point to the primary slug.

### Meta tags per tool

Resolved from `seo.title` and `seo.description` in the registry. Falls back to `name` and `description` if not set.

### Sitemap (`/sitemap.xml`)

Generated server-side from three sources (all merged, no duplicates):
1. `STATIC_PAGES` — 7 hardcoded pages (home, tools, pricing, etc.)
2. `STATIC_TOOL_SLUGS` — 32 known tool slugs + 4 category slugs
3. DB query — `saas_tools` where `status = 'live'` (AI-generated tools)
4. DB query — `calculators` where `is_published = true`

DB queries fail silently if tables don't exist yet.

---

## 8. Security Changes (Phase 2)

| Area | Change |
|------|--------|
| `Key.txt` | Removed from git tracking (`git rm --cached`), added to `.gitignore` |
| File uploads | MIME type allowlist on multer (`products.routes.js`) |
| Request size | `express.json` and `express.urlencoded` capped at `100kb` |
| Multer errors | Global error middleware returns `400` with descriptive message |
| Body too large | Global error middleware returns `413` |

---

## 9. How to Add a New Tool (Checklist)

```
[ ] 1. Create component at client/src/pages/tools/{category}/{ToolName}.jsx
        — wrap content in <ToolPageShell slug="my-tool-slug" steps={[...]} faqs={[...]} />

[ ] 2. Add entry to TOOL_REGISTRY in client/src/data/toolRegistry.js

[ ] 3. Add lazy import to TOOL_COMPONENTS in client/src/pages/tools/DynamicToolPage.jsx
        'my-tool-slug': lazy(() => import('./{category}/{ToolName}')),

[ ] 4. Add slug to STATIC_TOOL_SLUGS in server/index.js (sitemap)

[ ] 5. Done — route, category page, SEO meta, and schema are automatic
```

---

## 10. Future AI Tool Integration

When the AI Factory creates a new tool:

1. Tool spec + rendered HTML/JSX is saved to `saas_tools` with a unique `slug`
2. Status is set to `'live'` when approved
3. `/tools/{slug}` is immediately live — `DynamicToolPage` falls through to `ToolDetailPage` which fetches from the API
4. Sitemap auto-includes the new slug on next generation
5. No deployment required

To "graduate" an AI tool to a static component (for performance), follow the 5-step checklist above.

---

## 11. File Map

```
client/src/
├── app/
│   └── routes.jsx                    ← 5 tool routes (was 40+)
├── data/
│   ├── toolRegistry.js               ← master registry (NEW)
│   └── toolCatalogue.js              ← legacy catalogue (updated links)
└── pages/
    ├── CategoryPage.jsx              ← SEO category landing (NEW)
    └── tools/
        ├── DynamicToolPage.jsx       ← slug resolver + fallback (NEW)
        ├── ToolPageShell.jsx         ← schema + SEO wrapper (UPGRADED)
        ├── pdf/                      ← 18 PDF tool components
        ├── calculators/              ← 5 calculator components
        ├── converters/               ← 7 converter components
        └── ai/                       ← 2 AI tool components

server/
├── index.js                          ← sitemap, body limits, error handlers
└── routes/
    └── products.routes.js            ← MIME validation on uploads
```
