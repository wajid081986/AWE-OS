# AWE-OS Frontend UX Blueprint

**Version 1.0 · July 2026 · Public website architecture (does not touch the internal Control Panel, Admin Panel, or Builder Agent behind Login)**

This document is the single source of truth for redesigning the public AWE-OS website. Every recommendation includes its reasoning. It is written to be handed to Claude Code for implementation, phase by phase. Two reference implementations already exist and conform to this blueprint: `awe-os-homepage.html` and `tool-page-merge-pdf.html`.

---

## 1. Design Philosophy

AWE-OS's public site has one job: convert an anonymous visitor into someone who trusts the platform enough to hand it their bank statement. Everything follows from that. The philosophy is **"verifiable trust"** — we never *claim* trustworthiness with adjectives; we *demonstrate* it with checkable facts. "Your files never leave your device — open the Network tab and watch" is our voice. "World-class secure platform" is not.

Three principles govern every screen. First, **the tool is the hero**: on any tool page, the working tool appears above the fold, before any prose, because a utility site that buries its utility under marketing reads as an ad farm — the exact perception that caused the AdSense rejection. Second, **honesty as differentiation**: we state limitations plainly (large files are slow on old phones). No competitor does this, and it is the cheapest authority signal available. Third, **quiet density**: an authority site is information-rich but never cluttered; we achieve richness through structured, scannable prose rather than decoration.

Why this philosophy: AWE-OS cannot out-spend Adobe or out-brand Notion. It can out-*honest* everyone, because honesty costs engineering discipline, not money — and it directly targets the E-E-A-T criteria Google's reviewers evaluate.

## 2. Visual Identity

The identity is built around a single metaphor: **the ledger**. A ledger is precise, auditable, and honest — exactly the brand promise. It appears as a visual signature across the site: dashed-border boxes with monospace rows recording verifiable facts ("Files stored on our servers: 0 — ever"). This is the one element a visitor remembers and no clone site can credibly copy, because it only works if the claims are true.

Supporting the ledger: a deep ink-navy base (serious, financial), cobalt blue for action (energy without the startup-gradient cliché), and a single marigold accent (an Indian note — marigold, not saffron-as-flag, keeping it cultural rather than political). Logo remains the existing "A" mark in a cobalt gradient rounded square; do not redesign the logo in this phase — logo churn destroys the small brand equity that exists.

Why: the ledger motif converts the platform's genuine technical property (client-side processing) into a visual language. Identity derived from a real product truth ages well; identity derived from trends needs redesigning every two years.

## 3. Typography

Three faces, three jobs, loaded from Google Fonts with `font-display: swap`:

| Role | Face | Usage | Why |
|---|---|---|---|
| Display | **Bricolage Grotesque** (600–800) | H1, H2, section titles, logo | Characterful without being decorative; its slightly compressed, confident letterforms read "engineered product," and it is rare enough to avoid the Inter-everywhere sameness of generic SaaS |
| Body | **Instrument Sans** (400–600) | Paragraphs, UI labels, H3 | High legibility at 16.5px, neutral enough to carry long guides, pairs with Bricolage without competing |
| Data | **JetBrains Mono** (400–700) | Ledger rows, stats, eyebrows, badges, dates, breadcrumbs | Monospace signals "measured fact, not marketing copy" — it is the typographic voice of the ledger metaphor |

Type scale (rem, 1.2 minor-third base with clamp() for fluidity): body 1.03; small .88; caption .74; H3 1.1; H2 clamp(1.6–2.3); H1 clamp(2.1–3.3). Line-height 1.65 for body prose (long guides demand it), 1.12 for display. Letter-spacing −0.015em on display sizes, +0.14em on uppercase mono eyebrows.

Rule: Bricolage never appears below 1.1rem, and mono never carries full sentences. Why: restraint is what separates a type *system* from fonts sprinkled on a page.

## 4. Color System

| Token | Hex | Role |
|---|---|---|
| `--ink` | #131A2E | Primary text, dark surfaces (footer, stats strip) |
| `--ink-soft` | #3B4463 | Secondary text |
| `--paper` | #F6F7FB | Page background (cool, faintly blue — deliberately not the warm-cream AI default) |
| `--card` | #FFFFFF | Elevated surfaces |
| `--cobalt` | #2742D6 | Primary action, links |
| `--cobalt-deep` | #1B2FA0 | Hover/pressed |
| `--cobalt-tint` | #EDF0FE | Icon backgrounds, selected states |
| `--marigold` | #E8850C | Accent: highlights, eyebrows' tick, category counts. Never a button |
| `--mint` | #0E9F6E | Success and privacy-verified states only |
| `--line` | #E4E7F0 | Borders, dividers |

Usage ratio roughly 70% paper/card, 20% ink, 8% cobalt, 2% marigold+mint. Contrast: all text pairs meet WCAG AA (ink on paper = 13.9:1; ink-soft on paper = 7.4:1; white on cobalt = 6.9:1). Marigold is decorative-only precisely because #E8850C on white fails AA for text.

Why one accent family plus one highlight: multi-hue palettes on utility sites read as "template." Discipline here is the premium signal.

## 5. Design Tokens

All tokens live as CSS custom properties on `:root`, named by role, never by appearance (`--cobalt` is acceptable as a palette name, but components consume `--color-action`, aliased to it). Full token categories: color (above), radius (`--radius-s: 10px`, `--radius-m: 14px`, `--radius-l: 18px`), shadow (`--shadow-card`, `--shadow-float` — both soft, low-opacity ink; never pure black), borders (1.5px solid `--line` as the standard; 2px dashed cobalt for dropzones; 1.5px dashed for ledgers), z-index scale (header 50, modal 100, toast 150), and motion tokens (§20).

Why tokens before components: the rejection-era site shows drift (inconsistent paddings, ad-hoc grays). A token layer makes Claude Code implementations self-consistent and lets a future dark mode or dashboard theme be a token swap, not a rewrite.

## 6. Layout System

Single content column, max-width **1120px**, 24px side padding, centered. Sections alternate paper and card/ink backgrounds to create rhythm without decoration: paper → ink strip → paper → white trust band → paper → ink footer. Long-form article content (tool guides, blog posts) narrows to **760px** because 1120px prose lines exceed 90 characters and measurably hurt reading.

Two-column "split" layouts (hero, trust sections) use asymmetric ratios (1.05fr/.95fr) rather than 50/50 — the slight imbalance keeps the eye moving and avoids the static template look. Why 1120px: wide enough for a 4-up tool grid at comfortable card sizes, narrow enough that nav and footer never feel stretched on 1440px monitors.

## 7. Responsive Strategy

Mobile-first CSS with two breakpoints only: **560px** (single-column everything) and **960px** (full desktop layout). Between them, the tablet band inherits desktop patterns with 2-column grids. Why only two: every additional breakpoint doubles QA surface for a small team; the component designs (fluid type via clamp(), auto-wrapping chip rows, grid-template collapse) are inherently elastic, so most adaptation is free.

Non-negotiables at every width: the tool dropzone is fully usable, the search bar is reachable, tap targets ≥44px, and the sticky header never exceeds 64px height (mobile screen real estate is the scarcest resource on a utility site).

## 8. Grid System

CSS Grid, not a 12-column framework. Named patterns: `tool-grid` (4 → 2 → 1 columns), `blog-grid` (3 → 1), `cat-list` (single column of full-width rows — categories are read sequentially, so a grid would fight the content), `related` (3 → 1), `foot-grid` (2fr 1fr 1fr 1fr → 2×2). Gap tokens: 16px within grids, 40–56px between split columns.

Why no 12-column abstraction: Bootstrap-style grids are exactly the "template feeling" the brief prohibits, and CSS Grid's intrinsic sizing produces better results with less code.

## 9. Spacing Scale

8-point base: 4, 8, 12, 16, 24, 32, 48, 72. Section vertical padding: 72px desktop, 52px mobile. Card internal padding: 20–28px by card size. Heading margins: 40px above H2, 14px below. The scale is small deliberately — eight values force consistency; twenty invite drift.

One special rule: adjacent sections that share a background color get their boundary from content spacing alone (no hairline), while sections that change background need no extra spacing — the color shift *is* the divider. Why: double-signaling boundaries (line + gap + color) is where pages start feeling fussy.

## 10. Component Library

Phase 1 ships exactly these components, each with one canonical implementation: Header/Nav, Footer, Button (primary/ghost), Tool Card, Category Row, Blog Card, Related-Tool Card, Search Bar, Filter Tabs, Chip/Badge, Ledger, Browser Frame (hero signature), Step List, FAQ Accordion (native `<details>`), Callout (honesty/warning), Author Box, Breadcrumb, Policy Link Grid, Stats Strip. Nothing else until Phase 2.

Why a closed set: authority comes from repetition. A visitor who has seen one tool page can predict every other tool page; that predictability *is* the premium feel of Linear and Stripe, and it is achieved by refusing to invent new components per page.

## 11. Cards

All cards share: white surface, 1.5px `--line` border, `--radius-m`, and a hover state of translateY(−3px) + border-color→cobalt + soft shadow. **Tool Card**: icon in a 40px cobalt-tint rounded square, name (Instrument Sans 700), two-line description at .84rem, and one mono tag (`NO UPLOAD` in mint / `INDIA-READY` / `AI-ASSISTED` in their tint colors). The tag row is mandatory — it repeats the differentiation on every single card. **Blog Card**: a 7px gradient band (cobalt→marigold) on top, mono meta row with *updated date* (freshness signal per §24), title, excerpt, and an author row with avatar. **Related-Tool Card**: compact, title + one line, used only inside articles.

Why border-based elevation instead of heavy shadows: shadow-heavy cards are the generic-SaaS tell; borders read as drafting-table precision, which matches the ledger identity.

## 12. Buttons

Two variants only. **Primary**: cobalt fill, white text, 10px radius, soft cobalt shadow, hover darkens to cobalt-deep and lifts 1px. **Ghost**: transparent, 1.5px line border, ink text, hover darkens border. No tertiary, no marigold buttons, no outlined-primary hybrids. Sizes: default (11px/22px padding) and compact for nav (9px/18px). Labels are verbs that name the outcome: "Merge PDFs," "Browse all 49 tools," "Read our full story" — never "Submit," "Learn more," or "Get started" (get started with *what*?).

Why two variants: CTA hierarchy (§17) only works if primary is visually scarce. Every added button style dilutes the meaning of cobalt.

## 13. Search

Search is the second-most-important element on the site after the tools themselves, because with 49 tools the navigation problem is real. Placement: hero (homepage), header icon expanding inline (all other pages), and a dedicated `/search` page for query URLs. Behavior: instant client-side fuzzy filtering over a static JSON index of tool names, descriptions, and synonyms ("emi" → Loan Calculator; "aadhaar pdf" → Merge/Compress) — no server round-trip, consistent with the privacy story. Empty state is a direction, not a shrug: "No tool matches 'X' yet — request it and we'll consider building it," linking to Request a Tool.

Why client-side: it is faster, it works offline like the tools do, and the synonym index is where India-specific vocabulary ("challan," "lakh," "regime") becomes findable — an SEO-adjacent moat competitors won't bother with.

## 14. Filters

Filter tabs (Popular / PDF / Calculators / Converters / Productivity / AI) appear on the homepage tool section and the `/tools` listing. Visual: pill buttons, active = ink fill with white text. Behavior: single-select, updates the grid instantly, syncs to the URL hash (`/tools#calculators`) so filtered states are shareable and crawlable. No multi-facet filtering in Phase 1 — 49 items don't need it, and faceted URLs create crawl-budget waste and thin-page risk (§24).

Why ink-fill active state rather than cobalt: the filter is a *state*, not an *action*; reserving cobalt for actions keeps the interaction grammar consistent.

## 15. Navigation

Header: 64px, sticky, blurred paper background, 1px bottom line. Left: logo. Right: All Tools, Guides & Blog, About, Contact, then a compact primary button ("Browse 49 Tools"), then — rightmost, smallest — **Login as a ghost-text link**, visually de-emphasized. Login routes to the internal Control Panel (Admin, Builder Agent, Dashboard) and is *never* referenced in public page copy, heroes, or CTAs, per the platform constraint. Mobile: logo + hamburger opening a full-screen sheet listing the same items, Login last.

A slim breadcrumb (mono, .82rem) appears on every page below the fold line except the homepage. Why breadcrumbs everywhere: they are simultaneously a user-orientation device, an internal-linking device, and a `BreadcrumbList` schema carrier — three wins for one component.

Why Login stays visible but small: hiding it breaks the workflow of the internal team; promoting it confuses the 99% of visitors for whom it is irrelevant and would make AdSense reviewers question what the site gates behind auth.

## 16. Hero

Homepage hero is a thesis, not a slideshow: left column carries the claim ("Online tools that **never upload** your files" — the differentiator is the headline, with marigold underline on the two words that matter), a one-line subhead naming the audience and scope, the search bar, and four verifiable chips. Right column is the signature Browser Frame: a stylized browser window animating file → in-browser processing → download, above a Ledger with three checkable facts. No hero image, no illustration of abstract people, no gradient blobs.

Tool-page heroes are smaller: H1 (keyword-bearing), one-sentence value line, badge row, updated-date line, then immediately the working tool. Why: on a tool page, every pixel between the visitor and the tool is friction, and friction on a utility site reads as bait.

## 17. CTA Hierarchy

One primary CTA per viewport, strictly. Homepage order of prominence: (1) Search, (2) Browse all tools, (3) per-card tool links, (4) Read guides, (5) About. Login sits outside the hierarchy entirely (§15). Tool pages: (1) the tool's own action button, (2) related tools, (3) blog links. Blog posts: (1) the relevant tool ("Try the calculator used in this guide"), (2) related articles.

Why this ordering: it mirrors the actual user journey (§31) — people arrive with a task, complete it, then *maybe* explore. A hierarchy that pushes exploration before task completion optimizes for bounce.

## 18. Footer

Ink background, four columns: brand + one-paragraph mission (restating privacy positioning for the reader who scrolled everything), Tools (category links + Request a Tool), Resources (blog, guides categories, About, Contact), Legal & Trust (all eight policy pages). Bottom bar: copyright plus the site-wide signature line in mono — *"Files uploaded to our servers since launch: 0."*

Why the footer carries all policy links: AdSense reviewers and users both check footers for legitimacy signals; a complete legal footer is one of the strongest cheap trust cues on the web, and it distributes internal links to trust pages from every single page.

## 19. Animations

Budget: three moments, nothing else. (1) Hero browser-frame flow: a subtle 3-step pulse cycling file→gear→download, 6s loop, opacity-only. (2) Card hover lift (150ms transform + border color). (3) FAQ accordion open (native, no JS). Explicitly banned: scroll-jacking, parallax, typing effects, counter roll-ups on fake stats, page-transition overlays, and staggered fade-in-on-scroll for every section — the last one being the current #1 "AI-generated site" tell.

Why so austere: motion spends trust. A finance calculator that bounces feels like a toy; stillness reads as instrument-grade.

## 20. Motion Principles

Tokens: `--ease: cubic-bezier(.2,.7,.3,1)`; durations 150ms (micro), 300ms (structural), 600ms (ambient, hero only). Only `transform` and `opacity` are animated (compositor-friendly; no layout thrash on low-end Android devices, which are a large share of the Indian audience). Every animation is wrapped in `@media (prefers-reduced-motion: reduce)` disabling it entirely. Motion always communicates state change (hover, open, success), never decorates idle screens — except the single ambient hero loop, which is the one sanctioned atmosphere moment.

## 21. Accessibility

WCAG 2.2 AA is the floor, enforced not aspired: visible 3px cobalt focus rings on every interactive element (`:focus-visible`), full keyboard operability including the accordion and tabs, semantic landmarks (`header/nav/main/article/footer`), one `<h1>` per page with logical heading descent, `aria-label`s on icon-only controls, form inputs with real labels, and the native `<details>` element for FAQs (free keyboard + screen-reader behavior). Color is never the sole state indicator (active tabs change fill *and* weight). Tap targets ≥44px. Alt text policy: descriptive for informational images, empty for decorative.

Why the floor matters commercially, not just ethically: accessibility failures correlate with the "low quality" heuristics in Google's page-experience evaluation, and India's user base includes a high share of low-vision users on small screens.

## 22. E-E-A-T Strategy

Experience: guides include worked examples with real numbers ("₹50,000/month SIP at 12% over 15 years"), screenshots of the actual tools, and honest limitations — evidence the authors have used what they describe. Expertise: each blog post and tool page carries an author box; Phase 2 adds `/authors/<name>` pages with role, background, and a list of everything they've written or tested. Even a two-person team should be named as two humans with faces — "Team AWE-OS" is a Phase-1 placeholder only, because anonymous content is precisely what the "low value" classifier targets. Authoritativeness: the eight policy pages (editorial, corrections, AI content, tool testing, advertising, privacy, terms, disclaimer), each 300–500 words of specific, honest text — not boilerplate. Trust: dated "last updated" lines on every tool and post, a public corrections log on corrected pages, and the verifiable-claims voice throughout.

Why policies must be specific: reviewers have seen ten thousand template privacy policies. "We review tax slabs at every Union Budget" is credible; "we strive for accuracy" is noise.

## 23. Trust Signals

Ranked by credibility-per-effort: (1) the Ledger with verifiable zeros — unique, checkable; (2) "last updated" dates everywhere — freshness is trust; (3) honest-limitation callouts on tool pages; (4) the tool-testing statement ("manually re-tested on 4 browsers after every update"); (5) named authors with photos (Phase 2); (6) the complete policy footer; (7) a public changelog page (Phase 2) listing tool updates by date. Explicitly excluded until real: testimonials, user counts, star ratings, "trusted by" logos. Fabricated social proof paired with Review schema risks a manual action — a categorically worse outcome than a slower approval.

Why exclusion is a strategy: a site with *no* fake signals and several *verifiable* ones is rarer, and reads more premium, than a site with the standard wall of dubious badges.

## 24. AdSense-Safe Layout

Rules that the layout must enforce structurally: no ad units or placeholders anywhere until the account is approved (empty "ADVERTISEMENT" boxes were flagged in the rejection-era design and are removed permanently from templates). Post-approval placements are pre-designed as reserved slots with fixed CSS dimensions to prevent layout shift (CLS): one below the tool on tool pages, one mid-article after the second H2, one above the footer — never inside the tool interaction area, never between the H1 and the tool, never more than three per page, and never styled to resemble tool cards (accidental-click patterns are a policy violation). Content-to-ad ratio stays strongly content-dominant on every viewport, including mobile where the temptation is worst.

Why pre-designed slots: retrofitting ads after approval is how approved sites get *re*-flagged; designing the reserved space now means approval day is a config change, not a redesign.

## 25. SEO-Friendly Layout

Every page type has a defined head contract: unique title (≤60 chars, primary keyword leading), meta description (≤155 chars, written as a click reason, not a keyword list), canonical URL, and OpenGraph/Twitter cards. One H1 per page containing the target query naturally ("Merge PDF files — free, in your browser, with no upload"). Semantic HTML5 throughout so the content parses without CSS. JSON-LD per page type: Organization + WebSite + SearchAction (homepage), SoftwareApplication + HowTo + FAQPage + BreadcrumbList (tool pages), Article + Person + BreadcrumbList (blog), Person (author pages). Images get width/height attributes and lazy-loading below the fold; fonts preconnect; the tool JS loads deferred so LCP is the H1, not a spinner.

Why schema completeness: rich results (FAQ dropdowns, HowTo steps) raise CTR from the SERP, and structured data is a machine-readable statement of exactly the legitimacy AdSense evaluates.

## 26. Internal Linking Strategy

The site is a mesh, not a tree. Every tool page links: sideways to 4–6 related tools (workflow-based, not category-based — Merge links to Compress because people compress *after* merging), upward to its category, and outward to at least one relevant guide. Every guide links to the tool it discusses ("try the calculator") and 2–3 sibling guides. The homepage links to every category, the top 8 tools, and the 3 latest posts. Category descriptions embed links in prose, not just grids, because in-prose links carry more topical signal. Anchor text is descriptive, never "click here."

Target: every page reachable within 3 clicks from home, no orphan pages, and each of the 49 tool pages receiving ≥3 internal links. Why: internal linking is how a 49-tool site tells Google it is one coherent resource rather than 49 disconnected doorway pages — directly countering the "collection of pages" perception behind the rejection.

## 27. Category Page UX

Five category pages (`/tools/pdf`, `/tools/calculators`, …) each structured as: H1 + a 150–250-word category introduction written for a human ("Everything here runs locally — even the PDF editor"), the filterable tool grid, a "which tool do I need?" decision guide (short prose mapping tasks to tools: "Portal rejected your file for size → Compress PDF"), 2–3 related guides, and category-specific FAQ. Category pages carry `CollectionPage` + `ItemList` schema.

Why the decision guide: it converts the category page from a menu into a resource — the single cheapest way to make listing pages non-thin, and it captures "which pdf tool should I use" style queries no tool page can.

## 28. Tool Page UX

The canonical template (reference: `tool-page-merge-pdf.html`), in strict order: breadcrumb → H1 + value line + badges + updated date → **the working tool** → 3-step How-to → "When you'd actually use this" (4+ concrete scenarios, India-specific where true) → "Why local processing matters" → honest-limitation callout → practical tips (each linking a related tool) → FAQ (5–7 questions, mirrored in FAQPage schema) → related-tools grid → author/testing box. Content budget per page: **700–1,200 unique words**. Explicitly *not* 2,500–4,000: top-ranking competitors run 300–600 words because the tool is the value; padding to 4,000 words creates the low-value pattern we are escaping. Every page's prose must be written fresh — shared paragraphs across the 49 pages would trip duplicate-content heuristics site-wide.

Why tool-first order: task completion before persuasion (§17), and because time-to-tool is the retention metric that makes people bookmark the site — the returning-visitor signal AdSense weighs.

## 29. Blog UX

Listing (`/blog`): featured latest post, then a chronological card grid, filterable by the same category pills, each card showing updated date and author. Post template: breadcrumb → H1 → author + published + updated line → a 760px reading column at 1.03rem/1.7 → a sticky "try the tool" card in the right margin on desktop (inline after the intro on mobile) → in-article tables and worked examples as first-class styled components → author box → related posts → related tools. Reading experience details: max 90-char measure, generous 40px H2 spacing, no interstitials, estimated reading time in the meta row.

Content strategy attached to the UX: posts are organized in clusters (PDF workflows; Indian tax; investing math), each cluster interlinked and anchored to its tools. Launch target is 8–10 genuinely researched posts, growing steadily — not 100 rushed posts, which would re-trigger the low-value flag at blog scale.

## 30. Homepage Information Architecture

Final order, each block with its job: (1) Hero — claim + search + proof frame; (2) Stats strip — four verifiable numbers on ink; (3) Popular tools — 8 cards + filter tabs, the task-completion shortcut; (4) Categories — five prose-rich rows, the site's table of contents; (5) Why AWE-OS / How tools work — the differentiation argument in full prose plus the 4-step model; (6) Privacy promise callout; (7) Latest guides — 3 posts proving the site is alive and editorial; (8) FAQ — 8 questions absorbing objections; (9) About + policy grid — the trust closer; (10) Footer. Roughly 1,400 words of genuine prose across blocks — enough substance to be a resource, short of the keyword-wall anti-pattern.

Why this order: it interleaves *do* (tools) and *believe* (trust) blocks. All-tools-first is the directory look we're leaving; all-story-first buries utility. Alternation serves both visitor types — the task-doer and the evaluator (who may be an AdSense reviewer).

## 31. User Journey

Primary persona: arrives from search with a task ("compress pdf under 2mb"), lands directly on a tool page, completes the task in under a minute. The journey design ensures that at completion the page offers the *next logical task* (related tools by workflow) and one *understanding* link (the relevant guide). Secondary persona: the evaluator (comparing sites, or reviewing for AdSense) who lands on the homepage; their journey runs hero-claim → proof → categories → policies. Tertiary: the returning user, served by memorable URLs (`/tools/merge-pdf`), a fast search, and PWA installability in Phase 3.

Why design for the searcher first: 80%+ of a utility site's organic entrances are deep links into tool pages, not the homepage — so the tool page template (§28) is where journey quality is actually won.

## 32. Conversion Flow

"Conversion" for AWE-OS today = task completed → second page visited → bookmarked/returned. The flow instruments three hops: tool completed → related tool (workflow linking), tool → guide (understanding), guide → tool (application). Each hop has exactly one designed prompt, placed at the natural end of the previous task, never as an interruption. Future SaaS conversion (Builder Agent, Phase 3) gets dedicated landing pages reached from a single restrained "Platform" nav item — public tool pages are never turned into funnels for it, because contaminating free utilities with upsells would undo the trust architecture.

Metrics to watch: pages/session (target >1.6), tool-completion rate, return-visitor share, search-usage rate. Why these: they are the behavioral signals of a "helpful resource," which is both the AdSense criterion and the business goal.

## 33. Mobile UX

Mobile is primary (Indian traffic skews heavily mobile). Specifics: hero stacks claim-first with the browser frame *below* the search (task before proof on small screens); tool grids go single-column with full-width tappable cards; the dropzone becomes a large "Select PDF files" button (drag-and-drop is meaningless on touch); filter tabs scroll horizontally with visible overflow affordance; FAQ and footer compress but never hide policy links; the sticky header holds only logo + hamburger + compact CTA. Performance budget: <2.5s LCP on a mid-range Android over 4G, which drives the deferred-JS and system-fallback-font decisions.

## 34. Tablet UX

Tablet (561–960px) is treated as narrow desktop, not big mobile: 2-column tool grids, side-by-side hero where width allows, desktop nav if it fits at 768px+ else hamburger. No tablet-only components. Why: tablet is <8% of traffic for this audience; bespoke tablet design is effort spent where users aren't.

## 35. Desktop UX

Desktop earns the full experience: 4-up grids, the split hero with the animated browser frame, the sticky in-margin "try the tool" card on blog posts, hover states, and visible keyboard affordances. Density stays disciplined — desktop's extra width goes to whitespace and line-length control, never to extra columns of content, because the 1120px container (§6) is the readability ceiling, not a minimum to fill.

## 36. Future Scalability

The architecture assumes growth from 49 to 200+ tools: tool pages are data-driven from a single content schema (name, category, description, badges, how-to steps, use cases, tips, FAQs, related-tool IDs, updated date), so new tools are content entries rendered through the one template, not new page designs. Categories can grow to 8–10 before the IA needs a second navigation level. The search index, related-tools engine, and sitemap generate from the same schema. Why schema-driven: it makes consistency automatic, lets Claude Code implement "add a tool" as a data change, and keeps the 49-page content-uniqueness requirement auditable.

## 37. SaaS Readiness

When Builder Agent / AI Factory become public products, they arrive as a new top-level section (`/platform/*`) with its own landing pages sharing the token system but permitted a richer visual register (product screenshots, pricing tables). The public-utility site and the SaaS marketing layer stay visually related but structurally separate, and the free tools remain free and unpolluted. Login remains the single door to authenticated surfaces. Why separation: the tools site's SEO equity and AdSense standing are assets; entangling them with a paid product's funnel risks both.

## 38. AI Readiness

Two-sided readiness. For AI *features*: the AI Tools category grows behind the published AI content policy — every AI tool discloses exactly what data leaves the device (the one honest exception to the local-processing story) and that inputs are never used for training. For AI *consumers* (search engines' AI overviews, assistants): the schema completeness, FAQ structuring, and plain-prose answers make AWE-OS content maximally quotable and attributable by answer engines — which is where a growing share of "how to merge pdf" traffic will originate by 2027.

## 39. Dashboard Integration Strategy

The internal Control Panel (Admin, Builder Agent, Internal Dashboard) is out of scope for this redesign and must remain untouched. Integration points are limited to: the Login link styling (§15), a shared token file so internal surfaces *may* adopt the design system later at their own pace, and route separation (`/app/*` or subdomain) so public-site deploys never risk internal downtime. Public pages never leak internal terminology (no "Builder Agent" mentions until it has a public landing page in Phase 3). Why strict separation: it protects the internal team's workflow, keeps the public site's crawl surface clean, and avoids AdSense reviewers encountering auth walls or half-public admin routes.

## 40. Design Decision Log (consolidated WHYs)

| Decision | Alternative rejected | Reason |
|---|---|---|
| Ledger as signature motif | Generic hero illustration | Derived from a true, verifiable product property; un-copyable by clones |
| Bricolage Grotesque + Instrument Sans + JetBrains Mono | Inter everywhere | Distinctive without decorative; mono gives "measured fact" voice |
| Cool blue-paper palette, marigold accent | Warm cream + terracotta | Avoids the current AI-default look; suits financial seriousness; marigold is the culturally-grounded accent |
| Tool above the fold on tool pages | Marketing intro first | Time-to-task is the retention metric; burying the tool reads as ad bait |
| 700–1,200 words per tool page | 2,500–4,000 words | Competitor evidence shows utility+focused content ranks; padding recreates the low-value pattern |
| 8–10 launch blog posts | 100+ posts fast | Volume of mediocre content is what "low value content" flags; quality compounds, spam caps |
| No testimonials/ratings until real | Fabricated social proof | Fake Review schema risks manual penalty — worse than slow approval |
| No ad placeholders pre-approval; fixed slots post-approval | Ads retrofitted ad hoc | Placeholders contributed to rejection; fixed slots prevent CLS and policy violations |
| Two button variants, one accent | Rich button taxonomy | CTA hierarchy requires scarcity of the action color |
| Two breakpoints | 4–5 breakpoints | QA surface for a small team; fluid components make extra breakpoints redundant |
| Native `<details>` FAQ | Custom JS accordion | Free accessibility, zero JS, schema-mirrorable |
| Client-side search | Server search | Faster, offline-capable, consistent with privacy story |
| Login small, rightmost, never in copy | Login as CTA / removed | It gates internal systems; promoting it confuses users and reviewers, removing it breaks the team |
| Schema-driven tool pages | Hand-built pages | Consistency at 49→200 tools; uniqueness auditable |
| Motion budget of 3 moments | Scroll-triggered everything | Stillness reads instrument-grade; scroll effects are the current AI-site tell |

---

## Implementation Phasing (for Claude Code)

**Phase 1 — Authority Foundation:** token file + base styles; Header/Footer/Breadcrumb; homepage per §30; the 5 category pages; the 8 policy pages (content required from team); component library §10; client-side search + `/tools` listing with filters; 404 ("This page doesn't exist — but one of these 49 tools probably does what you need" + search); remove all ad placeholders. *Exit criteria: every public page uses the new system; zero broken policy links; Lighthouse ≥90 on performance/accessibility/SEO.*

**Phase 2 — SEO + E-E-A-T:** roll the tool template across all 49 pages with fresh content (batch of 10/week); blog listing + post template; author pages with real names; related-tools/related-articles from the content schema; full JSON-LD coverage; XML sitemap; public changelog. *Exit criteria: no tool page under 700 unique words; all schema validating; every page ≥3 internal inlinks.*

**Phase 3 — Premium Product Experience:** `/platform` landing pages (Builder Agent, AI Factory); PWA (installable, offline tool shell); personalized "recently used tools" (localStorage, privacy-consistent); search synonym expansion; ad-slot activation post-approval; conversion instrumentation per §32.

**Sequencing rule:** do not begin Phase 3 before the AdSense re-review is submitted at the end of Phase 2 — Phases 1–2 contain everything the review evaluates; Phase 3 is business growth, not approval work.

*— End of blueprint. Reference implementations: `awe-os-homepage.html` (§30), `tool-page-merge-pdf.html` (§28).*
