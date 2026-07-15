# Batch 8 Plan — Policy Pages Live

Branch (to be created on approval): `batch-8-policy-pages`, from `origin/main`
@ `d6749c8` (batch 5.6c merged). Independent of 5.6/5.6c's open items (hydration
race on tool/blog pages, 16-vs-49 tools gap) — this batch touches neither.

Status: **PLAN ONLY — not yet approved, nothing implemented.**

---

## 1. AUDIT — current state

### Routes and components today

| Route | Component | Styling |
|---|---|---|
| `/about` | `client/src/pages/AboutPage.jsx` | Pre-redesign (gray-900/blue-600 Tailwind) |
| `/privacy-policy` (+ legacy `/privacy` redirect shim) | `client/src/pages/PrivacyPolicy.jsx` | Pre-redesign |
| `/terms` | `client/src/pages/Terms.jsx` | Pre-redesign |
| `/disclaimer` | `client/src/pages/Disclaimer.jsx` | Pre-redesign |
| `/contact` | `client/src/pages/ContactPage.jsx` | Pre-redesign (out of this batch's scope — not a policy page) |

**Finding, not previously logged**: none of these five pages have been migrated
to the Blueprint design system introduced in Batches 1–5.6. They still use
`text-gray-900`, `bg-blue-600`, `rounded-xl`, etc. — no design tokens, no
`primitives/` components, no `Breadcrumb` (backlog.md already notes Breadcrumb
"not yet adopted anywhere"). Grepping `from '.*primitives'` across `client/src`
shows the token system is adopted only in `Header.jsx`, `Footer.jsx`,
`StatsStrip.jsx`, and the homepage's `modules/home/sections/*` — nothing else.
`CategoryPage.jsx` is in the same pre-redesign state, for reference (not part
of this batch).

Privacy/Terms/Disclaimer each independently define an identical local
`Section({title, children})` helper — three duplicate copies of the same
16-line function, none of them using the real `primitives/Section`.

### Content today

Text lives inline as JSX directly inside each page component (no MDX, no
`content/` directory — that's Next.js-flavored language from a frozen but
mismatched part of `architecture.md`, already flagged in `CLAUDE.md`'s
changelog and `backlog.md`). Privacy/Terms/Disclaimer's current copy is
**not** the owner's approved text — it's placeholder/AI-drafted-looking prose
from an earlier phase (e.g. Disclaimer's boilerplate "as is"/"as available"
language, Privacy's generic GDPR/IT-Act summary). All three get fully
replaced by the approved verbatim texts this batch receives, not edited in
place.

Contact email is inconsistent across existing pages: Privacy/Terms/Contact
use `contact@awe-os.com`; Disclaimer uses `wajid081986@gmail.com`. The batch
prompt specifies `support@awe-os.com` for policy pages going forward — see
§5 for how this resolves (short answer: irrelevant to the pasted verbatim
body text, only matters for the template's own chrome, if any).

### Footer today

`client/src/components/Footer.jsx`, "Legal & Trust" column, 3 links only:
Privacy Policy, Terms of Use, Disclaimer. Confirmed via `docs/backlog.md`
line 13: Batch 3 shipped only these 3 because the other 5 routes didn't
exist yet — explicitly "Deferred to Batch 8." This is that batch.

### Route table (architecture.md §2, frozen)

The exact 5 new paths are **already specified** in the frozen route table —
no naming decision needed:

```
/privacy, /terms, /disclaimer, /editorial-policy, /corrections-policy,
/ai-content-policy, /advertising-policy, /tool-testing-policy
```

(`/privacy` in that table is the existing legacy-redirect shim to
`/privacy-policy`, already live — not a new route.)

---

## 2. ROUTES

5 new SSG'd static routes, all under `PublicLayout`, following the
architecture.md §2 names exactly:

- `/editorial-policy`
- `/tool-testing-policy`
- `/ai-content-policy`
- `/corrections-policy`
- `/advertising-policy`

**Files that must all change together for each new static route** (confirmed
by reading how the existing 5 static pages are wired — there is no single
source of truth, 3 files must stay in sync manually):

1. `client/src/ssgRoutes.js` — add all 5 to `STATIC_PATHS`. This alone feeds
   `generate-ssg-routes.js` (which unions it with blog/city/comparison/faq
   into `ssgRoutes.generated.js`) and `main.jsx`'s `isSsgRoute()` check.
2. `client/src/app/routes.jsx` — add 5 `<Route>` entries under
   `PublicLayout` (client-side SPA routing).
3. `client/src/entry-server.jsx` — import the 5 new page components, push 5
   entries in `buildRoutes()` (pattern: `outFile:
   'editorial-policy/index.html'` etc.), **and** update the hardcoded
   `staticPaths` array at line 185 inside `assertNoRouteDrift()` — this
   array is a manual duplicate of `STATIC_PATHS` and the build throws if
   they diverge. Easy to miss; flagging explicitly so it isn't.

Route count: `buildBaseSsgPaths()` = `STATIC_PATHS`(9→14) + `CATEGORY_SLUGS`(5)
+ `TOOL_SLUGS`(48) = 62→67 base paths, plus blog/city/comparison/faq (62
today) = **129 → 134 total SSG routes**, matching the batch prompt's stated
target.

### Hydration-safety gating (batch 5.6)

`isHydrationSafe()` in `ssgRoutes.js` returns `true` for anything that isn't
`/blog*` or an individual `/tools/:slug` page — so the 5 new static pages
will be treated as hydrate-safe **by default**, with no code change needed
in that function. That default is exactly right for these pages (plain
static text, zero client state, zero effects — the same shape as the 5
existing static pages that passed batch 5.6's 3-run determination sweep
3/3 clean).

However, batch 5.6 explicitly ruled that hydration safety for a route
category must be **empirically verified**, not assumed from shape alone (2
supposedly-safe routes — `/` and `/tools/ai` — did fail intermittently in
one of three runs during that batch's own sweep). This batch will re-run
`hydration-sweep.js` against all 134 routes (not just the 5 new ones, since
`STATIC_PATHS` changing could in principle shift build output for
unrelated routes) before shipping, per §7.

---

## 3. TEMPLATE

One new component, no new primitives (all already exist and are proven —
`Section`, `Container`, `Breadcrumb`, `Callout` from `primitives/`):

**`client/src/components/policy/PolicyLayout.jsx`** — shared chrome:
- `Breadcrumb` (`Home / Legal & Trust / <Page Title>`)
- `<h1 className="ds-h1">` from the content's `title`
- "Last updated: `<date>`" line (mono, matches existing `ds-mono-eyebrow`
  pattern used elsewhere) driven by the content's `lastUpdated` field —
  never hand-typed per page, so it can't silently drift from the owner's
  actual revision date
- Body content rendered inside `Section`/`Container` at the narrow
  (`max-w-content-narrow`) width per Blueprint §6 (long-form prose)
- A closing "Questions about this policy?" line linking `mailto:` +
  `/contact`, using the address resolved per §5

This replaces the 3 duplicate local `Section()` helpers in
Privacy/Terms/Disclaimer (deleted, not kept alongside the new layout).

`AboutPage.jsx` is **not** touched by this template — see §5 for why
Editorial Policy gets its own route instead of extending About.

---

## 4. FOOTER

`client/src/components/Footer.jsx`, "Legal & Trust" column — add the 5 new
links after the existing 3, same order as architecture.md's route table:

```
Privacy Policy       /privacy-policy   (existing)
Terms of Use          /terms            (existing)
Disclaimer             /disclaimer       (existing)
Editorial Policy      /editorial-policy      (NEW)
Tool Testing Policy   /tool-testing-policy   (NEW)
AI Content Policy      /ai-content-policy      (NEW)
Corrections Policy    /corrections-policy    (NEW)
Advertising Policy    /advertising-policy    (NEW)
```

8 links, one column, matching Blueprint §18 ("Legal & Trust: all eight
policy pages"). No layout change needed — `COLS` is just a data array; the
column will grow taller, which is expected and matches the reference
footer's proportions.

---

## 5. CONTENT MECHANICS

**Recommendation**: one JS content file per page under a new
`client/src/content/policies/` directory, e.g.:

```js
// client/src/content/policies/editorialPolicy.js
export default {
  slug: 'editorial-policy',
  title: 'Editorial Policy',
  lastUpdated: '2026-07-15',       // owner supplies at paste time
  metaDescription: '…',             // ≤155ch, owner supplies or derives from text
  body: <>...</>,                    // verbatim JSX paste, untouched
}
```

consumed by one generic `PolicyPage.jsx` that takes a content object and
renders it through `PolicyLayout`. Rationale: it isolates the owner's
verbatim paste from the template markup entirely (pasting text can't
accidentally break `PolicyLayout`'s JSX), keeps all 8 pages visually
identical by construction (one template, not 8 copies of `Section()`), and
mirrors the existing content-object pattern already used for
`toolRegistry.js` — idiomatic for this codebase rather than a new pattern.

This means Privacy/Terms/Disclaimer's content also gets extracted into this
same shape (`client/src/content/policies/privacyPolicy.js` etc.) as part of
their "refresh" — their current inline-JSX pages become one-line wrappers
(`<PolicyPage content={privacyPolicyContent} />`), consistent with the other
5. I'd flag this as the one real judgment call in this plan — an alternative
is leaving Privacy/Terms/Disclaimer's existing inline-JSX structure alone
and only using the content-file pattern for the 5 new pages, which is less
consistent but touches 3 fewer files. Recommending the unified approach
since "one shared, simple template" was explicit in the batch prompt and a
mixed pattern would undercut that within one batch.

**Owner action at implementation time**: paste each policy's approved text
as the `body` JSX (or, if plain paragraphs, plain strings — `PolicyLayout`
handles both) into its content file. No prose is drafted or rewritten by
Claude Code, per CLAUDE.md §7 — missing text gets a `TODO-CONTENT` marker
in place, not filler.

**Contact email**: the batch prompt specifies `support@awe-os.com` for
policy-page contact mentions. This only affects `PolicyLayout`'s own
"Questions about this policy?" closing line (§3) — the owner's pasted body
text carries whatever address the owner wrote, unchanged. Flagging the
existing site-wide inconsistency (`contact@awe-os.com` vs
`wajid081986@gmail.com`) here rather than silently standardizing
everything to `support@awe-os.com`, since that's a site-wide contact-email
decision beyond this batch's scope — only the new template's own chrome
uses `support@awe-os.com`, per instruction.

---

## 6. SEO

Each content file supplies `title` (≤60ch) and `metaDescription` (≤155ch);
`PolicyPage.jsx` renders them via the same `Helmet` block pattern already
used in `PrivacyPolicy.jsx`/`Terms.jsx`/`Disclaimer.jsx` (canonical,
OG/Twitter tags, `og:image` reusing the existing `og-image.svg`). One `<h1>`
per page from `PolicyLayout`. No JSON-LD beyond what `Helmet` already
carries — policy pages aren't one of architecture.md §8's schema-bearing
page types.

**Sitemap**: `client/public/sitemap.xml` is a hand-maintained static file
(98 `<url>` entries today, not build-generated — confirmed, no
`sitemap.ts`/generator exists in this Vite stack despite architecture.md
describing one). Add 5 `<url>` entries in the same block as the existing
`/about`/`/privacy-policy`/`/terms`/`/disclaimer` entries, same `changefreq`
convention.

---

## 7. VERIFICATION

1. `cd client && npm run build` — confirm SSG report shows **134 routes**
   written, zero `titleTagCount !== 1` / `h1Count < 1` failures (existing
   `ssg-build.js` report gate).
2. `node scripts/static-preview-server.js` + `node scripts/hydration-sweep.js`
   against the built `dist/` — full 134-route sweep (not just the 5 new
   ones), at `HYDRATION_SWEEP_CONCURRENCY=1` per batch 5.6's methodology
   finding (higher concurrency introduces real timing flakiness in this
   sandboxed environment). Target: 134/134 pass, matching 5.6's shipped
   130/130. If any of the 5 new pages fail, they get added to
   `isHydrationSafe()`'s exclusion list (falls back to `createRoot`, same
   safety net 5.6 used for tool pages/blog) rather than blocking the batch.
3. Footer link check: click all 8 Legal & Trust links from a built preview,
   confirm no 404s, confirm the 3 existing links still resolve (regression
   check — footer file is being edited).
4. `grep -r "TODO-CONTENT"` across the 8 policy content files — must be zero
   before this batch is considered done (owner's texts fully applied), or
   explicitly listed as a known issue if any owner text is still pending at
   submission time.
5. Manual owner QA on the branch preview: visual check against Blueprint
   typography/spacing, all 8 pages readable, dates correct, footer renders
   correctly at 560px/960px breakpoints.

---

## 8. SCOPE GUARD

- Branch: `batch-8-policy-pages`, off `main`.
- No changes to Login, `/app/*`, Admin/Control Panel, Builder Agent, or
  anything under `server/`.
- No new npm dependencies.
- Stage only: `ssgRoutes.js`, `app/routes.jsx`, `entry-server.jsx`,
  `Footer.jsx`, new `PolicyLayout.jsx`/`PolicyPage.jsx`, new
  `content/policies/*.js` (8 files), refreshed `Privacy.jsx`/`Terms.jsx`/
  `Disclaimer.jsx` (reduced to thin wrappers), `sitemap.xml`. That's ~16
  files — comfortably under CLAUDE.md §7's 25-file mass-change threshold.
- `AboutPage.jsx` is explicitly **not** touched (see §5 recommendation
  below) — if the owner wants About restyled to the new design system
  too, that's separate scope, not folded in here silently.
- Out-of-scope findings noticed while auditing (e.g. `ContactPage.jsx` /
  `CategoryPage.jsx` also being pre-redesign, the site-wide contact-email
  inconsistency) go into `docs/backlog.md`, not fixed here.

---

## Open item for owner decision (not blocking the plan, but flagged per the batch prompt's own ask)

**About / Editorial Policy** — recommendation: **keep them separate.**
`AboutPage.jsx` is a marketing/mission page (team, values, stats, "why we
built this"); Editorial Policy is a trust/legal document (how content gets
written, reviewed, sourced, corrected) that belongs alongside the other 7
policy pages as a peer in the Legal & Trust footer column and the Blueprint
§10 "Policy Link Grid." Merging it into About would be the one policy page
that breaks the "one shared, simple template" the batch prompt asks for,
and Blueprint §22 already treats "the eight policy pages" as one uniform
set. Suggested minimal touch on About: add one sentence + link in its
existing Mission section ("Read our full editorial policy →
`/editorial-policy`") — small enough to fold into this batch without
restyling About itself. Flagging for explicit sign-off since the prompt
asked for a recommendation, not a unilateral decision.

---

*Plan only. Waiting for approval before any file is edited.*
