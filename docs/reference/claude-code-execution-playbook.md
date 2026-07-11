# AWE-OS · Claude Code Execution Playbook

**Version 1.0 · July 2026 · Controlled Batch Execution — 16 batches**

Ye file aapka copy-paste playbook hai. Har prompt English mein hai (Claude Code ke liye), notes Hinglish mein. Sequence strictly follow karo — koi batch skip nahi, koi merge nahi.

**Pehle setup:** repo root mein ye files daalo:
```
docs/ux-blueprint.md                  (UX Blueprint v1.0)
docs/architecture.md                  (Frontend Architecture v2.1)
docs/reference/awe-os-homepage.html
docs/reference/tool-page-merge-pdf.html
CLAUDE.md                             (Step 0 se copy karo — sabse important file)
```

---

## STEP 0 — `CLAUDE.md` (ye file repo root mein banao, ye hi aapka CCDP hai)

Claude Code har session mein `CLAUDE.md` automatically padhta hai — isliye protocol yahan rakhna alag document se better hai. Ye content as-is `CLAUDE.md` mein paste karo:

```markdown
# AWE-OS Development Protocol

## Source of truth (frozen — never modify these)
- docs/ux-blueprint.md (UX Blueprint v1.0)
- docs/architecture.md (Frontend Architecture v2.1)
- docs/reference/*.html (visual fidelity references)

## Absolute rules
1. Implementation only. Never change architecture, redesign UX, invent
   components, alter navigation structure, or add routes outside the
   route table in architecture.md §2.
2. LOGIN IS UNTOUCHABLE. The Login link opens the internal Control
   Panel / Builder Agent / Admin. Never modify auth logic, its route,
   or its placement (header rightmost, ghost style, per Blueprint §15).
   Never reference internal tools in public page copy.
3. Never edit anything under the internal/app namespace (/app/* or the
   auth subdomain code) — it is out of scope for this entire project.
4. All colors, spacing, radii, shadows, and durations come from
   design-system/tokens.css. Introducing a raw hex/px value outside
   tokens is a defect.
5. No new npm dependencies without stating the reason and cost in the
   plan and getting approval first.

## Working method (every batch)
1. Read the batch prompt scope. Read relevant docs sections first.
2. Produce a short implementation plan (files to create/modify, risks).
   WAIT for approval before editing any file.
3. Implement ONLY the batch scope. If you notice an out-of-scope
   problem, log it in docs/backlog.md — do not fix it now.
4. One commit per logical unit, message format:
   "batch-N: <what>". Never commit broken builds.
5. After implementing, run: build, lint, and any CI gates that exist
   so far. Fix failures before reporting.
6. End every batch with: implementation summary, changed files list,
   verification checklist (how a human confirms it works),
   known issues, and STOP. Do not start the next batch.

## Rollback
If a batch causes regressions that can't be fixed within the batch
scope, revert the batch's commits entirely and report why. Never
leave the main branch broken.

## Language
Code, comments, and commits in English. Explanations to the user may
be in Hinglish if the user writes in Hinglish.
```

---

## STEP 1 — Repository Audit (koi code change nahi)

```text
Analyze this repository completely. Do NOT edit any file.

Report:
1. Framework, build tool, and rendering mode — critically: do public
   pages serve complete HTML with JavaScript disabled? Prove it by
   inspecting the build output, not by assumption.
2. Routing structure vs the route table in docs/architecture.md §2.
3. Existing components, CSS strategy, and any existing token system.
4. State management and data flow.
5. Current SEO state: metadata, schema, sitemap, canonicals.
6. How the 49 tools are currently implemented (per-tool pages? one
   engine? where does tool logic live?).
7. Where Login/auth code lives, so we know exactly what NOT to touch.
8. Technical debt that will block the architecture, ranked.

Output: CURRENT STATE REPORT only. End with your migrate-vs-prerender
recommendation per architecture.md §1, with effort estimates for both.
```

**Gate:** ye report padho. Migrate vs prerender ka decision *aap* loge, Claude Code nahi. Uske baad hi aage badho.

## STEP 2 — Gap Analysis (koi code change nahi)

```text
Using the CURRENT STATE REPORT, produce a gap analysis against
docs/architecture.md and docs/ux-blueprint.md.

For each gap: what's missing/wrong, which batch (1–16 below) will fix
it, risk if deferred, and dependencies. Flag anything in the current
codebase that conflicts with the frozen route table or the Login rule.

Do not modify code. Output: GAP ANALYSIS table only.
```

---

## STEP 3 — The 16 Batches

Har batch ka prompt as-is paste karo. **Har batch ke baad Step 4 ka review prompt chalana mandatory hai.** Ek batch = ek session ideally, taaki context clean rahe.

### Batch 1 — Design Tokens & Global CSS
```text
Implement Batch 1 only: design system foundation.

Create design-system/tokens.css and globals.css implementing Blueprint
§3 (typography), §4 (color), §5 (tokens), §9 (spacing scale), §20
(motion tokens), and the reduced-motion collapse from architecture §11.
Wire the three fonts (Bricolage Grotesque, Instrument Sans, JetBrains
Mono) with font-display: swap, subset latin, per the §9 font budget.

Do not modify any page, component, or route. Stop after Batch 1.
```

### Batch 2 — Primitives
```text
Implement Batch 2 only: primitive components.

Create in components/primitives/: Button (primary + ghost only),
Chip, Badge, Ledger, Callout, Breadcrumb, Section, Container — per
Blueprint §10–§12 and the reference HTML files. Every visual value
consumes tokens. Each component gets a usage entry in
docs/component-library.md.

No pages, no layout components, no cards. Stop after Batch 2.
```

### Batch 3 — Header, Footer, Navigation
```text
Implement Batch 3 only: Header, Footer, mobile menu.

Per Blueprint §15 and §18, and nav config from content/site.ts.
Login: keep the existing link/route exactly as-is, restyled only as
the rightmost ghost link — do not touch auth logic or its destination.
Mobile menu: full-screen sheet, focus-trapped, Login listed last.
Sticky header 64px with blur, per reference HTML.

No homepage, no cards. Stop after Batch 3.
```

### Batch 4 — Cards & Strips
```text
Implement Batch 4 only: ToolCard, CategoryRow, BlogCard,
RelatedToolCard, StatsStrip — per Blueprint §11 and both reference
HTML files, including the mandatory mono tag row on ToolCard and the
updated-date meta row on BlogCard.

No pages yet. Stop after Batch 4.
```

### Batch 5 — Homepage
```text
Implement Batch 5 only: the homepage, assembling existing components
in the exact block order of Blueprint §30, matching
docs/reference/awe-os-homepage.html for visual fidelity. All copy
comes from the reference file. No ad placeholders anywhere.
Homepage must serve complete HTML with JS disabled (verify in build
output). Stop after Batch 5.
```

### Batch 6 — /tools Listing + Filters
```text
Implement Batch 6 only: the /tools listing page with the filter-tab
island (single-select, URL-hash synced, per Blueprint §14). Tool data
comes from content/tools/*.json stubs — create minimal stub files for
all 49 tools (slug, name, category, oneLiner, badges only) so the grid
is complete. Stop after Batch 6.
```

### Batch 7 — Category Pages
```text
Implement Batch 7 only: the five category routes per Blueprint §27 —
intro prose block, filtered grid, "which tool do I need?" decision
guide section, related-guides slot (empty until blog exists), FAQ
block. Use placeholder marker text ONLY for the intro prose and
decision guides (the team writes these), clearly marked TODO-CONTENT.
Stop after Batch 7.
```

### Batch 8 — Policy Pages
```text
Implement Batch 8 only: the eight policy routes (architecture §2)
with one shared MDX layout. Create content/policies/*.mdx files with
headings and TODO-CONTENT markers — do NOT generate policy text; the
team supplies it. Footer links must all resolve. Stop after Batch 8.
```

### Batch 9 — Search + 404
```text
Implement Batch 9 only: build-time search index generation
(lib/search-index.ts) including the synonym field from tool content
files; SearchBar island (lazy index load on focus, fuzzy match, top-8
inline results, keyboard navigation); /search page with grouped
results, curated popular-searches chips from site.ts, and the
Blueprint empty state; the 404 page per architecture §2.
Stop after Batch 9.
```

### Batch 10 — Redirects, Sitemap, Security Headers
```text
Implement Batch 10 only: legacy-URL redirect map (308s — ask me for
the current live URL list first), sitemap.ts with real lastmod from
content updatedAt, robots.txt excluding the internal namespace, and
the security headers from architecture §17 at the hosting config
level. Stop after Batch 10.
```

### Batch 11 — CI Gates
```text
Implement Batch 11 only: Lighthouse CI with the §9 budgets as failing
thresholds on homepage + one tool page + one policy page; axe-core
checks on the template pages; eslint-plugin-jsx-a11y at error level;
a stylelint rule rejecting non-token spacing/colors; bundle-size check
per route. Wire all into the PR pipeline. Stop after Batch 11.
```

**🚩 Milestone: Phase 1 complete.** Yahan rukk kar poora Phase 1 review karo (Step 5 ka final-verification prompt Phase-1 scope par chalao) aur staging par khud click-through karo.

### Batch 12 — Tool Content Schema + Template
```text
Implement Batch 12 only: the full zod content schema from
architecture §5 with build-time validators (word count 700–1200,
duplicate-paragraph guard across tool files, related-slug resolution,
≥3 inbound links per tool); the /tools/[slug] template implementing
Blueprint §28, matching docs/reference/tool-page-merge-pdf.html; the
tool-widget island pattern (dynamic import, dimension-reserved
skeleton, load-on-intent for heavy engines). Migrate merge-pdf as the
first complete content file using the reference HTML's copy.
Stop after Batch 12.
```

### Batch 13 — Tool Content Population (repeat karo — ye content work hai)
```text
Populate tool content files for these 10 tools: [LIST 10 SLUGS].
For each, I will paste the human-written prose. Your job: structure it
into the schema, wire related-tool links per the workflow-linking rule
(Blueprint §26), and make validators pass. Do not generate the prose
yourself — if a section is missing, list it and stop.
```
*Note: ye batch 5 baar chalega (10 tools per round). Prose aap likhoge/doge — AI-dumped prose "low value" flag wapas le aayega.*

### Batch 14 — Blog Pipeline + Author Pages
```text
Implement Batch 14 only: MDX blog pipeline with ISR, /blog listing,
post template per Blueprint §29 (760px column, sticky try-the-tool
card on desktop, author box), /authors/[slug] pages, blog-category
routes only where ≥3 posts exist, related-posts resolver.
Create the pipeline with 2 sample posts using TODO-CONTENT markers.
Stop after Batch 14.
```

### Batch 15 — Structured Data + Changelog
```text
Implement Batch 15 only: lib/schema.ts JSON-LD builders for every
page type per Blueprint §25, injected via the metadata layer; CI
validation of emitted schema; OG-image generation per page type; the
/changelog page fed from a content file. Stop after Batch 15.
```

### Batch 16 — Final Verification + AdSense Pre-flight
```text
Do NOT modify code. Verify the entire implementation against
docs/ux-blueprint.md and docs/architecture.md, section by section.

Then run the AdSense pre-flight checklist and report PASS/FAIL each:
1. Every public route serves complete HTML with JS disabled.
2. Zero ad units or placeholders anywhere.
3. All 8 policy pages have real content (no TODO-CONTENT remaining
   anywhere on the site — search for the marker).
4. Every tool page passes content validators; no page under 700
   unique words.
5. All schema validates; sitemap lastmod values are real.
6. Lighthouse budgets green on all template pages.
7. No broken internal links; every page ≤3 clicks from home;
   every tool ≥3 inbound links.
8. Login unchanged and functional (manual check by me).
9. Security headers present in production response.
10. robots.txt excludes internal namespace; no internal terminology
    in public copy.

Output: COMPLIANCE REPORT with a deploy/no-deploy recommendation.
```

---

## STEP 4 — Reusable Per-Batch Review Prompt (har batch ke baad)

```text
Review your Batch N implementation. Do not change code.

Check: architecture compliance (docs/architecture.md), design fidelity
vs reference HTML, token usage (zero raw values), responsive at 375px
and 1280px, keyboard operability, HTML-without-JS completeness for any
new route, duplicate code, and regressions in previously built batches
(run the build + CI gates).

Output: PASS or FAIL per check, issues list, and which issues belong
in this batch (fix next) vs docs/backlog.md (defer).
```

Agar FAIL aaye: usi batch mein fix karwao, agla batch shuru mat karo. Agar fix batch scope se bahar jaaye: rollback per CLAUDE.md.

## STEP 5 — Deployment Order

1. Batch 16 COMPLIANCE REPORT green
2. Aap khud staging par: har template page mobile par, Login click (internal panel khulta hai?), 3 tools end-to-end
3. Production deploy (atomic, rollback ready)
4. Google Search Console: sitemap submit + homepage/top-10 tools ke liye indexing request
5. **2–3 hafte wait** — indexing + thoda organic signal
6. AdSense "Request review" — tab jab TODO-CONTENT zero ho aur blog par 8–10 real posts live hon

---

## Ground Rules (aapke liye, Claude Code ke liye nahi)

- **Ek batch, ek session.** Lambi sessions mein context dilute hota hai.
- **Plan approve karo, phir code.** CLAUDE.md ye enforce karta hai, lekin aap bhi plan padha karo — 30 second ka kaam hai, ghante bachaata hai.
- **Batch 13 aapka bottleneck hai, Claude Code ka nahi.** 49 tools ka prose human-written chahiye. Ye playbook code 3-4 hafte mein deliver kar dega; content aapki speed par depend karega.
- **Backlog discipline:** out-of-scope ideas docs/backlog.md mein jaate hain, batch mein nahi. Scope creep hi wo cheez hai jo "500 files modify + bugs" wali situation banati hai.
