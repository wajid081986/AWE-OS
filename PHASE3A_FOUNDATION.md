# AWE-OS Phase 3A — Tool Engine Foundation

## Overview

Phase 3A establishes the reusable component infrastructure that every tool page in the platform is built on. The goals were:

1. Extract repeated UI patterns into a shared design system (`components/ui/`)
2. Build a tool-domain component layer (`components/tool-engine/`)
3. Provide a single orchestrator (`ToolLayout`) that gives any new tool full SEO, layout, sidebar, and schema support automatically
4. Prove the system works by migrating two existing tools

---

## New Directory Structure

```
client/src/components/
├── ui/                          ← Design primitives (10 components)
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Input.jsx
│   ├── Textarea.jsx
│   ├── Select.jsx
│   ├── LoadingSpinner.jsx
│   ├── EmptyState.jsx
│   ├── SectionTitle.jsx
│   ├── Badge.jsx
│   ├── Container.jsx
│   └── index.js                 ← Barrel export
│
└── tool-engine/                 ← Tool domain components (14 components)
    ├── ToolLayout.jsx           ← Universal tool page shell (NEW STANDARD)
    ├── ToolContainer.jsx
    ├── ToolHero.jsx
    ├── ToolHeader.jsx
    ├── ToolContent.jsx
    ├── ToolSection.jsx
    ├── ToolSidebar.jsx
    ├── ToolGrid.jsx
    ├── ToolCTA.jsx
    ├── ToolBadge.jsx
    ├── ToolFooter.jsx
    ├── ToolEmptyState.jsx
    ├── ToolLoadingState.jsx
    ├── AdContainer.jsx
    └── index.js                 ← Barrel export
```

---

## 1. UI System (`components/ui/`)

### Purpose

Eliminates repeated inline Tailwind class strings that appeared across every tool component. One change to `Button.jsx` now applies platform-wide instead of requiring 30+ find-and-replace operations.

### Components

| Component | Variants / Props | Solves |
|-----------|-----------------|--------|
| `Button` | primary/secondary/ghost/danger/outline; sm/md/lg; loading, fullWidth | Replaces ~40 instances of identical button className strings |
| `Card` | default/elevated/flat/outlined; padding sm/md/lg | Replaces `bg-white border border-gray-200 rounded-xl` repeated everywhere |
| `Input` | label, error, helper, required | Accessible form input with consistent error display |
| `Textarea` | same as Input + rows | Same pattern for multiline fields |
| `Select` | options: string[] or {value,label}[]; label, error | Replaces repeated `<select className="...">` patterns |
| `LoadingSpinner` | xs/sm/md/lg; blue/white/gray/indigo; label, center | Single spinner implementation for all tool states |
| `EmptyState` | icon, title, description, action; dashed/plain variant | Generic "nothing here yet" placeholder |
| `SectionTitle` | as h2/h3; sm/md/lg; divider | Consistent section headings |
| `Badge` | free/new/premium/ai/comingSoon/success/warning | Status chips across category and tool pages |
| `Container` | sm/md/lg/xl/full | Width-constrained centering wrapper |

### Scalability

These components contain no tool-specific logic. They are usable in admin panels, dashboards, and any future SaaS feature. The `variant` pattern means adding a new style (e.g., a "destructive" card) requires editing one file.

### Dark mode readiness

All components use Tailwind semantic class groups (`text-gray-900`, `border-gray-200`, etc.) that map cleanly to `dark:` equivalents. Adding dark mode in a future phase requires adding `dark:` prefixes to the variant maps — no structural changes.

---

## 2. Tool Engine (`components/tool-engine/`)

### Purpose

Provides the visual and structural vocabulary specific to tool pages. The tool engine components know about tool metadata, categories, related tools, and ad placements. They do NOT contain business logic.

### Component hierarchy

```
ToolLayout
├── Helmet (SEO + Schema.org)
├── ToolContainer (max-w-7xl wrapper)
│   ├── ToolHero (breadcrumb nav)
│   └── [two-column layout]
│       ├── ToolContent (main column: flex-1)
│       │   ├── ToolHeader (icon + name + description + ToolBadge)
│       │   ├── AdContainer slot="top-banner"
│       │   ├── <section> "Use {name}"
│       │   │   └── {children} ← tool UI from the page component
│       │   └── ToolFooter (steps + about + FAQs)
│       └── ToolSidebar (lg:w-72 sticky)
│           ├── AdContainer slot="sidebar"
│           ├── ShareButtons
│           ├── ToolGrid (related tools, compact)
│           └── ToolCTA
```

### Key design decisions

**ToolLayout replaces ToolPageShell for new tools.** The 31 existing tools using `ToolPageShell` are untouched — backward compatibility is preserved. `ToolLayout` provides a cleaner API:

```jsx
// Old (ToolPageShell) — individual string props
<ToolPageShell slug="ai-content-writer" name="AI Content Writer" icon="✍️" description="...">

// New (ToolLayout) — registry object, all metadata auto-resolved
<ToolLayout tool={toolMeta} steps={STEPS} faqs={FAQS}>
```

**`AdContainer` provides semantic slot names.** Instead of callers choosing ad sizes, they declare intent:

```jsx
<AdContainer slot="top-banner" />   // → leaderboard (728×90)
<AdContainer slot="sidebar" />      // → rectangle (300×250)
<AdContainer slot="inline" />       // → leaderboard
<AdContainer slot="mobile-banner"/> // → mobile (320×50)
```

When real AdSense tags replace the placeholder `AdBanner`, only `AdContainer.jsx` needs updating — no tool components change.

**`ToolSidebar` has an `children` escape hatch.** Future features (premium upsell widgets, tool-specific tips, dynamic related content) can be injected without modifying the sidebar component:

```jsx
<ToolLayout tool={toolMeta} sidebarExtra={<PremiumUpsell />}>
```

---

## 3. ToolLayout — The Standard

### How to use it (new tools)

```jsx
import ToolLayout from '../../../components/tool-engine/ToolLayout'
import { getToolBySlug } from '../../../data/toolRegistry'

const STEPS = ['Step 1...', 'Step 2...']
const FAQS  = [{ q: 'Question?', a: 'Answer.' }]

export default function MyNewTool() {
  const toolMeta = getToolBySlug('my-tool-slug')
  return (
    <ToolLayout tool={toolMeta} steps={STEPS} faqs={FAQS}>
      <MyToolUI />
    </ToolLayout>
  )
}
```

What you get automatically:
- `<title>` and `<meta description>` from registry `seo.*` fields
- Canonical URL, OpenGraph, Twitter Card tags
- Schema.org `SoftwareApplication` + `HowTo` (if steps) + `FAQPage` (if faqs) + `BreadcrumbList`
- Responsive breadcrumb: Home / Tools / {Category} / {Tool}
- Tool icon, name, description header
- AdSense placeholder above the tool interface
- Sticky sidebar with rectangle ad, share buttons, related tools, sign-up CTA
- Scroll-to-top on slug change

### ProGate placement

For premium/paywalled tools, `ProGate` wraps only the tool UI — not `ToolLayout`. This ensures non-Pro users still see the page with SEO content, breadcrumbs, and related tool discovery:

```jsx
<ToolLayout tool={toolMeta}>
  <ProGate toolName="..." ...>
    <PremiumToolUI />  {/* only this is gated */}
  </ProGate>
</ToolLayout>
```

---

## 4. Migrated Tools

### ContentWriter (`/tools/ai-content-writer`)

**Before:** Had its own Helmet, own container, own header with emoji + title + badges, own loading spinner, own empty state. ProGate wrapped the entire page including Helmet.

**After:** ToolLayout handles all layout infrastructure. ContentWriter contains only: state management, API call, controls grid, output grid. Uses `Button`, `Select`, `Input`, `Textarea` from ui/. Uses `ToolEmptyState` and `ToolLoadingState` from tool-engine.

**SEO improvement:** Non-Pro users previously saw a bare ProGate upsell. Now they see the full page (heading, description, breadcrumb, related tools, sign-up CTA) — much better for indexing and conversion.

### ResumeBuilder (`/tools/resume-builder`)

Same structural migration. The internal `Field` wrapper component now uses `Input`/`Textarea` from `ui/` internally while keeping the same external API — proving that the ui/ system is composable into higher-order components without breaking callers.

---

## 5. Checklist for Adding a New Tool

```
[ ] 1. Create component:  client/src/pages/tools/{category}/{ToolName}.jsx
        — wrap with <ToolLayout tool={toolMeta} steps={STEPS} faqs={FAQS}>

[ ] 2. Add registry entry: client/src/data/toolRegistry.js
        — slug, name, category, icon, description, seo.title, seo.description

[ ] 3. Add lazy import:   client/src/pages/tools/DynamicToolPage.jsx
        'my-tool-slug': lazy(() => import('./{category}/{ToolName}')),

[ ] 4. Add to sitemap:    server/index.js → STATIC_TOOL_SLUGS array

[ ] 5. Done — route, SEO, schema, breadcrumb, sidebar, related tools: automatic
```

---

## 6. Performance Considerations

- All tool-engine components are small (< 2 kB each gzipped)
- ToolLayout is tree-shaken into each tool's lazy chunk — it adds ~3 kB to that chunk, only loaded when the tool is visited
- `getRelatedTools` is synchronous registry lookups — zero API calls in the layout layer
- No new npm dependencies were introduced
- Spinner uses CSS animation only — no JS-based animation libraries

---

## 7. Technical Debt Reduced

| Before | After |
|--------|-------|
| `ContentWriter` had its own Helmet, container, and header | Fully standardized via ToolLayout |
| `ResumeBuilder` had its own Helmet, container, and header | Fully standardized via ToolLayout |
| Button className duplicated 40+ times across tools | Single `Button` component |
| Input/select/textarea className duplicated in every form | `Input`, `Select`, `Textarea` primitives |
| Loading spinner duplicated inline in 10+ tools | `LoadingSpinner` + `ToolLoadingState` |
| Empty states hand-coded per tool | `ToolEmptyState` |
| Ad sizes chosen by callers | Named slots via `AdContainer` |
| ProGate wrapped entire page in AI tools | ProGate wraps only tool UI |

---

## 8. Remaining Risks

1. **31 tools on ToolPageShell** — they work correctly but use an older API. Can be migrated to ToolLayout incrementally over Phase 3B/3C with no urgency.

2. **ContentWriter and ResumeBuilder chunks** — both now bundle the tool-engine components. If more AI tools are added, consider extracting tool-engine into its own shared chunk via `vite.config.js` `manualChunks`.

3. **`ToolLayout` scroll-to-top** — fires on `resolvedSlug` change. For multi-step tools that navigate internally (like ResumeBuilder), this is correct behavior since the tool renders inside one route.

---

## 9. Future Recommendations (Phase 3B+)

- Add path alias (`@` → `src/`) to `vite.config.js` — reduces `../../../` import chains
- Build `useToolState` hook — shared state pattern (loading/error/result) used by every AI tool
- Add `ToolLayout` support for `customSidebarTop` — for tool-specific sidebar content above ads
- Extract tool-engine into its own Vite chunk once 10+ tools use it
- Add Storybook stories for ui/ components to prevent visual regressions as team grows
