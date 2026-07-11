# AWE-OS Frontend Architecture v2.0

**Engineering implementation document · July 2026 · Companion to the UX Blueprint v1.0**

The UX Blueprint defines *what* the public site is; this document defines *how* it is built. It is written for Claude Code to implement without ambiguity. Where this document and the Blueprint conflict, the Blueprint wins on UX intent and this document wins on engineering mechanics. The internal Control Panel, Admin Panel, and Builder Agent remain out of scope and untouched.

---

## 1. Stack Decision

**Recommendation: Next.js 15 (App Router) with static generation (SSG) for all public pages, deployed behind a CDN.** If the existing site already runs on a different framework (Vite SPA, Astro, custom), the decisive requirement is this: **every public page must serve complete HTML without JavaScript execution.** The current production site renders a "This site requires JavaScript" fallback — that alone is an SEO and AdSense-review liability, because crawlers and reviewers must see full content instantly. Any framework that produces static HTML per route satisfies this document; Next.js is the reference because it gives file-based routing, per-route metadata, image optimization, and MDX support out of the box, and Claude Code has deep familiarity with it.

Rendering strategy per page type: homepage, category pages, tool pages, policies → **SSG at build time** (content changes only on deploy); blog listing and posts → SSG with **ISR (revalidate: 3600)** so publishing doesn't require full redeploys; search page → static shell + client-side index; 404 → static. No server-side rendering at request time anywhere on the public site — there is no per-user public content, so paying SSR latency would be pure cost.

The tools themselves (PDF merging, calculators) remain client-side by architectural requirement — that is the product's privacy promise. The pattern is: **static HTML shell (crawlable content) + hydrated tool island.** The prose around a tool must exist in the HTML payload; only the interactive widget hydrates.

## 2. Routing Architecture

Complete public route table. Every route listed here must exist at Phase 2 completion; no route outside this table may be added without updating this document.

| Route | Type | Rendering | Notes |
|---|---|---|---|
| `/` | Homepage | SSG | Blueprint §30 |
| `/tools` | All-tools listing | SSG | Filter tabs sync to `#hash` |
| `/tools/pdf`, `/tools/calculators`, `/tools/converters`, `/tools/productivity`, `/tools/ai` | Category pages | SSG | Blueprint §27 |
| `/tools/[slug]` | 49 tool pages | SSG from content schema | Blueprint §28 |
| `/blog` | Blog listing | SSG + ISR | |
| `/blog/[slug]` | Posts | SSG + ISR | MDX |
| `/blog/category/[cat]` | Blog category filters | SSG | Only for categories with ≥3 posts (thin-page guard) |
| `/authors/[slug]` | Author pages | SSG | Phase 2 |
| `/about`, `/contact` | Company | SSG | |
| `/privacy`, `/terms`, `/disclaimer`, `/editorial-policy`, `/corrections-policy`, `/ai-content-policy`, `/advertising-policy`, `/tool-testing-policy` | Policy pages | SSG | One shared layout, unique content |
| `/changelog` | Public updates log | SSG + ISR | Phase 2; feeds freshness signals |
| `/search` | Search results | Static shell, client index | Reads `?q=` |
| `/request-tool` | Tool request form | SSG + client form | |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | Generated | Build time | |
| `/404` | Not found | Static | Search + top tools, per Blueprint |

Redirect policy: legacy URLs from the current site get permanent (308) redirects mapped in config — never let a redesign orphan indexed URLs. `/app/*` (or the auth subdomain) is excluded from the sitemap, `robots.txt`-disallowed, and never linked from public pages except the single header Login link.

### Navigation content architecture (resolves review Issue 1)

Header menus, exhaustively: **All Tools** → `/tools` (no dropdown in Phase 1; Phase 2 adds a dropdown listing the five categories with tool counts). **Guides & Blog** → `/blog` (Phase 2 dropdown: PDF Guides, Finance Explainers, Productivity, Latest). **About** → `/about`. **Contact** → `/contact`. Primary button **Browse 49 Tools** → `/tools`. **Login** → auth entry, ghost link, rightmost, `rel="nofollow"`, excluded from mobile menu prominence (listed last). Footer navigation is the complete site map as defined in Blueprint §18 and is identical on every page — footers that vary per page break user spatial memory.

## 3. Folder Architecture

```
src/
  app/                    # Next.js App Router — routes only, no logic
    (public)/             # Route group: public site layout
      page.tsx            # Homepage
      tools/
        page.tsx
        [slug]/page.tsx
        pdf/page.tsx ...  # category routes
      blog/ ...
      about/ ... etc.
    layout.tsx            # Root layout: fonts, tokens, header, footer
    sitemap.ts
    robots.ts
  components/
    primitives/           # Button, Chip, Badge, Ledger, Callout, Breadcrumb
    cards/                # ToolCard, BlogCard, RelatedToolCard, CategoryRow
    layout/               # Header, Footer, Section, SplitLayout, StatsStrip
    tool-page/            # ToolHero, HowToSteps, FaqAccordion, AuthorBox
    search/               # SearchBar, SearchResults, EmptyResult
    islands/              # Client components only: tool widgets, filters, search
  content/
    tools/                # 49 × tool.json (schema §5)
    posts/                # MDX blog posts with frontmatter
    authors/              # author.json
    policies/             # MDX policy pages
    site.ts               # nav config, category definitions, homepage curation
  design-system/
    tokens.css            # single source: colors, type, spacing, radius, motion
    globals.css           # resets, base typography, focus styles
  lib/
    schema.ts             # JSON-LD builders per page type
    search-index.ts       # build-time index generation
    seo.ts                # metadata helpers
    related.ts            # related-tools/related-posts resolvers
  public/
    fonts/ icons/ og/
docs/
  ux-blueprint.md         # v1.0
  architecture.md         # this document
  component-library.md    # generated usage docs per component
```

Rules: `app/` contains no business logic — pages compose components and pass content. Anything importing browser APIs lives in `islands/` and carries `"use client"`. `content/` is the only place editors touch; a new tool is a JSON file, a new post is an MDX file — no component work required (resolves review Issue 15 and enforces Blueprint §36).

## 4. Design System Implementation

`tokens.css` is the single stylesheet source of truth, defining every custom property from Blueprint §3–§5 and §20. Components consume role aliases (`--color-action: var(--cobalt)`), never raw hex. Styling approach: **CSS Modules + tokens** (or Tailwind restricted to a token-mapped config if the existing codebase already uses it — do not mix both). No inline styles except dynamic values (chart widths). No component may introduce a new color, shadow, radius, or duration; if a design need arises, the token is added to `tokens.css` first and documented in `docs/component-library.md`.

**Governance rules (resolves review Issue 7):** Component names are `PascalCase` nouns (`ToolCard`), props are `camelCase`, CSS classes are `kebab-case` scoped by module. Icons: single set (Lucide), 1.5px stroke, sized 16/20/24 only, always with `aria-hidden` + adjacent text or `aria-label`. Illustration policy: none in Phase 1–2 — the browser-frame and ledger are the only graphic devices; stock illustrations of humans are permanently banned (template tell). Photography: only real screenshots of AWE-OS tools, captured at 2× on the reference viewport, and real team photos on author pages — no stock. Spacing: 8-pt scale only; any margin/padding not in the scale is a review-blocking lint error via Stylelint rule.

## 5. Content Schema & Data Layer

Every tool page renders from one validated schema (`zod` at build time — a malformed content file fails the build, not production):

```ts
Tool = {
  slug, name, category,            // identity
  oneLiner, badges[],              // hero
  description,                     // 150–250 words, unique
  howTo: {name, text}[3],          // mirrors HowTo schema
  useCases: {title, body}[≥4],
  whyLocal: string,                // unique per tool, no shared paragraphs
  limitation: string,              // mandatory — honesty callout
  tips: {text, linksTo?}[≥4],
  faqs: {q, a}[5–7],               // mirrors FAQPage schema
  related: slug[4–6],              // workflow-based, hand-curated
  updatedAt, testedBrowsers[],
  author: authorSlug,
}
```

Build-time validators enforce the Blueprint's content rules mechanically: total unique word count 700–1,200; no paragraph string shared verbatim across two tool files (duplicate-content guard); every `related` slug resolves; every tool receives ≥3 inbound references across the content graph. These checks are the difference between the content strategy being a document and being enforced.

## 6. Component Architecture

Server components by default; client components only in `islands/`. The tool page illustrates the pattern: the entire page — hero, steps, use cases, FAQ, related grid — is server-rendered static HTML; the single client island is the tool widget itself, loaded with `next/dynamic` and a dimension-reserved skeleton so hydration causes zero layout shift. Filter tabs and search are the only other islands. Props contracts are typed from the content schema; components never fetch — data flows down from the page.

State management (**deliberately minimal — resolves review's React architecture ask**): there is no global store, no Redux, no context beyond theme. State inventory: URL (`?q=`, `#category`) for shareable UI state; component state for tool widgets; `localStorage` for exactly two keys — `recentTools` (last 5 slugs, powering a "Recently used" row, privacy-consistent because it never leaves the device) and `toolDrafts` where a tool offers resume. Anything more is Phase 3 justification territory.

## 7. Search Architecture

Build step generates `search-index.json`: for each tool — name, slug, category, description tokens, and a **synonym list** maintained in the content file (`"emi" → loan-calculator`, `"income tax", "regime" → tax-calculator`, `"aadhaar", "kyc" → merge/compress`). Client: the SearchBar island lazy-loads the index (~15 KB gzipped) on focus, runs fuzzy match (lightweight, e.g. uFuzzy — no Algolia, no server, consistent with privacy posture), renders top 8 inline with keyboard navigation, and Enter routes to `/search?q=`. The `/search` page renders full results grouped Tools / Guides, and its empty state offers the Request-a-Tool link plus the five category rows (resolves review Issue 2). "Popular searches" chips on `/search` are **editorially curated** in `site.ts`, not tracked — Blueprint privacy posture forbids logging user queries. Voice search: not built; the browser's native dictation already types into the input, which is the honest answer to that wishlist item.

## 8. SEO Architecture

Metadata is generated per route from content via `lib/seo.ts` — no hand-written head tags in pages. JSON-LD builders in `lib/schema.ts` emit exactly the graphs specified in Blueprint §25, validated in CI against Google's structured-data testing endpoint. `sitemap.ts` generates from the content graph with real `lastmod` from `updatedAt` fields — fake lastmod dates are banned; they burn crawler trust. OG images: one branded template per page type generated at build (`/public/og/`), title text-overlaid. Canonicals absolute; trailing-slash policy: none, enforced by redirect. Headings are content-driven: the H1 comes from the content file, and the component library makes it structurally impossible to render two H1s.

## 9. Performance Budget (resolves review Issue 8)

Budgets are per page type, measured on a mid-range Android (Moto G-class) over throttled 4G — the audience's real device, not a MacBook:

| Metric | Homepage | Tool page | Blog post |
|---|---|---|---|
| LCP | ≤ 1.8 s | ≤ 2.0 s | ≤ 1.8 s |
| CLS | ≤ 0.05 | ≤ 0.05 | ≤ 0.05 |
| INP | ≤ 150 ms | ≤ 200 ms (tool interaction) | ≤ 150 ms |
| JS shipped (gzip) | ≤ 90 KB | ≤ 90 KB + tool island ≤ 250 KB lazy | ≤ 70 KB |
| Fonts | 3 families, subset latin, ≤ 130 KB total, `swap` | same | same |
| Images above fold | 0 (hero is CSS/SVG) | 0 | ≤ 1, AVIF/WebP |

Enforcement, not aspiration: Lighthouse CI runs on every PR with these budgets as failing thresholds; `next build` bundle analysis fails if any route's first-load JS exceeds budget. Heavy tool engines (PDF WASM ~1–3 MB) load **only on user intent** (first file selected), with a progress state — they are never in the critical path and never on non-tool pages. Cache policy: immutable hashed assets 1 year; HTML `s-maxage=3600, stale-while-revalidate`.

## 10. Error, Empty & Loading States (resolves review Issue 7)

Every island ships all four states or fails review — the matrix:

| Context | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Tool widget | Skeleton with reserved dimensions + "Loading the PDF engine (~2 MB, one time)…" | Dropzone default state | "Couldn't read this file — it may be corrupted or password-protected. Try Unlock PDF." + retry | File downloads + "Done — merged 3 files. Compress it next?" |
| Search | none (index is instant after load) | "No tool matches 'X' yet — request it and we'll consider building it." | Index fetch fail → plain link list of categories | results |
| Blog/related fetch | Static — no loading states needed (SSG) | Category with no posts → route not generated | — | — |
| Request-a-Tool form | Button spinner ≤ 1 action | — | Inline field errors, specific ("Enter an email so we can reply") | "Request received — we reply within a week." |

Error copy follows Blueprint §"writing": states what happened and what to do next, never apologizes vaguely, never blames the user. A global `error.tsx` boundary catches render failures with the 404-style recovery UI. Tool processing failures must **never** lose the user's file from the widget state — the file stays loaded for retry.

## 11. Accessibility Engineering

Blueprint §21 is the spec; engineering adds enforcement: `eslint-plugin-jsx-a11y` at error level; axe-core automated checks in CI on the five template pages; a manual keyboard-only test script in `docs/` run before each phase ships (tab order, focus trap check on mobile menu, accordion operability, tool completion keyboard-only). Focus management rules: route changes move focus to the H1; the mobile menu traps focus while open and restores it on close; the tool's success state moves focus to the download action. Reduced-motion is implemented at the token level (`--dur-*` collapse to 0ms under the media query) so no component can forget it.

## 12. Animation System Implementation

Three sanctioned moments (Blueprint §19) implement as: hero flow — CSS keyframe opacity pulse, `will-change: opacity`, paused under reduced-motion; card hover — token transition on `transform, border-color`; accordion — native `<details>` with a small grid-template-rows transition. All durations/easings come from motion tokens. A lint rule flags any `@keyframes` or `transition` declared outside `tokens.css`-sanctioned properties — this is how "no scroll-triggered everything" stays true two years from now.

## 13. Analytics — Privacy-Consistent (resolves review Issue 9 without breaking the brand)

The site's core claim is that user data doesn't leave the device; analytics must not quietly contradict it. Decision: **self-hosted, cookie-less, aggregate analytics** (Plausible CE or Umami) measuring pageviews, referrers, and four custom events — `tool_completed`, `search_used`, `related_click`, `request_tool_submitted`. No session recording, no fingerprinting, no user IDs, no consent banner needed (no cookies, no PII), and a plain-language note in the privacy policy stating exactly what is counted. Homepage "Popular tools" and search "Popular searches" are curated monthly by a human *informed by* these aggregates — automated trending modules are rejected because they'd require finer-grained tracking than the brand permits and add Phase-1 complexity for marginal value. Ad measurement post-approval comes from AdSense's own reporting; no additional trackers ride along.

## 14. Future Integration Hooks — SaaS, Builder Agent, AI Layer

Built now as seams, not features. **Routing seam:** all authenticated surfaces live under a reserved namespace (`/app/*` or `app.` subdomain) that the public build treats as external — public deploys can never break internal tools, and internal deploys never touch public SEO (resolves review Issue 11 without exposing admin). **Design seam:** `tokens.css` is published as a shared package the Control Panel and future dashboard may adopt incrementally. **Content seam:** the tool schema (§5) already carries the fields a future "Builder Agent generates a new tool page" workflow needs — the agent would emit a content file and the build does the rest, meaning the AI Factory's public output path is *already* this architecture. **AI-consumer seam:** FAQ/HowTo schema and plain-prose answers make every page quotable by answer engines. **Auth seam:** the public site holds zero auth logic; Login is a plain `<a>`. When Builder Agent gets a public landing page (Phase 3), it is a normal SSG page at `/platform/builder-agent` created from a new `platform` content type — no architectural change required. This is the honest version of "AI readiness": seams that cost nothing now and prevent rework later, rather than speculative AI chrome on a site that first needs AdSense approval.

## 15. Deliberately Rejected from the v2.0 Review (decision log)

| Review ask | Verdict | Why |
|---|---|---|
| Status page (`status.awe-os.com`) | Rejected until a public API exists | Tools run client-side on a static, CDN-served site; there is no meaningful backend to report on. A status page for static hosting is trust theater — the opposite of "verifiable trust." Revisit when Builder Agent ships a public API |
| Automated Trending/Most-Opened modules | Replaced with curated + aggregate-informed | Real-time trending requires query/click logging at a granularity the privacy positioning forbids; curation delivers 90% of the value at 0% of the contradiction |
| Trust Dashboard (uptime, bugs fixed) on homepage | Partially adopted | The `/changelog` page (Phase 2) carries updates/corrections honestly; a homepage dashboard of self-reported metrics without an auditable source would undercut the ledger's credibility. The stats strip already carries the four verifiable numbers |
| Revenue Strategy UX (premium, cross-sell, newsletter modals) | Deferred post-approval | Monetization UI before AdSense approval raises reviewer risk; newsletter comes in Phase 3 as a footer form, never a popup |
| Tool version numbers / API availability / keyboard-shortcut panels per tool | Phase 3 | Content quality is the binding constraint; metadata chrome doesn't move approval or users |
| Voice search | Not built | Native browser dictation already covers it; a custom implementation is cost without user benefit |

## 16. Implementation Checklist for Claude Code

**Phase 1 (order matters):** ① `tokens.css` + `globals.css` from Blueprint §3–§5 → ② primitives (Button, Chip, Ledger, Callout, Breadcrumb) → ③ layout components (Header with nav config from `site.ts`, Footer, Section) → ④ cards → ⑤ homepage assembling reference implementation `awe-os-homepage.html` into components → ⑥ `/tools` listing + filter island → ⑦ five category pages → ⑧ eight policy routes with MDX layout (content supplied by team) → ⑨ search index build + SearchBar island + `/search` → ⑩ 404, redirects map, sitemap/robots → ⑪ Lighthouse CI with §9 budgets → ⑫ axe CI. *Definition of done: every §2 Phase-1 route serves complete HTML with JS disabled; all CI gates green.*

**Phase 2:** tool content schema + zod validators + duplicate-prose guard → migrate `tool-page-merge-pdf.html` into the `[slug]` template → populate 49 content files (10/week, human-written prose) → blog MDX pipeline + post template + author pages → related-content resolvers → JSON-LD builders + CI schema validation → `/changelog`. *Definition of done: content validators pass on all 49 tools; schema validates; then — and only then — the AdSense review request is submitted.*

**Phase 3:** PWA manifest + offline tool shell; `recentTools` row; `/platform/*` landing pages; ad-slot activation per Blueprint §24; newsletter footer form; conversion event dashboards.

## 17. Operations Appendix (v2.1 addendum — the four items adopted from final review; everything else deferred post-launch)

**Security headers** (set at the CDN/host level, verified in CI): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; and a Content-Security-Policy allowing self, the font CDN, the analytics host, and — post-approval only — AdSense's documented domains. The CSP matters doubly here: it is a real defense for a site handling users' documents in-browser, and it is *verifiable trust* — a visitor can check the headers. Note WASM tool engines need `wasm-unsafe-eval` scoped as narrowly as the framework allows.

**Image strategy:** AVIF with WebP fallback via the framework's image component; explicit width/height always (CLS budget §9 depends on it); lazy-load below the fold, eager for the single above-fold blog image; blur-up placeholders only for photographic content (tool screenshots), plain background reserve for UI images; no image ever ships wider than 2× its rendered size.

**Error monitoring:** Sentry (or GlitchTip self-hosted, consistent with the privacy posture) capturing frontend exceptions and the tool islands' failure events — with `beforeSend` scrubbing that drops file names, file contents, and user input from every report. Errors are counted, never content-inspected. Alert threshold: any tool's failure rate >2% over 24h pages a human.

**Deployment & testing minimums:** three environments — local, preview-per-PR, production; deploys are atomic with instant rollback (static hosting makes this free); `main` is deployable at all times. Test pyramid kept deliberately small: unit tests for `lib/` (schema builders, related-content resolvers, search index), one Playwright happy-path per template (homepage renders, a tool completes keyboard-only, a policy page serves full HTML with JS disabled), plus the existing Lighthouse CI and axe gates. Visual regression, Storybook, feature flags, and A/B infrastructure are explicitly deferred until post-AdSense traffic justifies them — see §15's reasoning pattern.

*— End of Architecture v2.1. Companion: `awe-os-ux-blueprint.md`. Reference implementations: `awe-os-homepage.html`, `tool-page-merge-pdf.html`. Documentation is now frozen; changes require a dated changelog entry at the top of this file.*
