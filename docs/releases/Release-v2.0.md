# AWE-OS v2.0 Release Notes

**Date:** 2026-07-14

## Summary

v2.0 completes the public-website redesign's foundational sequence: a
static-site-generation pipeline serving every public route as complete,
JS-free HTML; a token-driven design system (colors, spacing, radii,
shadows, motion) with a matching primitive/card component library; and
a full homepage replacement built on top of both, implementing
Blueprint §30's 10-block information architecture.

## Headline changes

### Homepage replaced (Blueprint §30)

`client/src/pages/Home.jsx` now composes 8 standalone sections
(`client/src/modules/home/sections/`) implementing all 10 of Blueprint
§30's homepage blocks: Hero + search + Browser Frame, Stats strip,
Popular Tools + category tabs, Categories, Why-different/How-it-works +
Privacy Promise, Latest Guides, FAQ, About + policy grid, and the
existing Footer. All counts and derived content (tool totals,
per-category counts, the "Popular" tool set, the 3 latest guides) are
computed live from `toolRegistry.js`/`blogPosts.js` at render time —
nothing is hardcoded. See `docs/batches/batch-5-plan.md` for the full
plan and `docs/reports/batch-5-production-verification.md` for the
post-merge production verification (PASS on all 10 checks).

### SSG pipeline live (since Batch 0B)

Every public route is prerendered to complete, static HTML via
`client/src/entry-server.jsx` / `client/scripts/ssg-build.js` and served
as the production build artifact — satisfying CLAUDE.md §4's
"JavaScript disabled" requirement site-wide, not just as a proof of
concept. Currently prerenders 129 routes on every build.

### Design system live (tokens, primitives, cards)

`design-system/tokens.css` and `design-system/globals.css` hold the
project's full token vocabulary (color, spacing, radius, shadow,
motion, typography), consumed by:
- **Primitives** (`client/src/components/primitives/`): Button, Chip,
  Badge, Ledger, Callout, Breadcrumb, Section, Container.
- **Cards** (`client/src/components/cards/`): ToolCard, CategoryRow,
  BlogCard, RelatedToolCard, StatsStrip.

Both libraries are now adopted by the homepage (Batch 5); adoption
across the rest of the site (tool pages, category pages, blog) remains
tracked in `docs/backlog.md`.

## Batch history (Batch 0A → Batch 5)

| Batch | What | Merged | PR | Commit |
|---|---|---|---|---|
| 0A | SSG proof-of-concept for 3 public routes | 2026-07-11 | — (direct commit) | `f111200` |
| 0B | Extend SSG to all public routes; make it the served build artifact | 2026-07-11 | — (direct commit) | `5803c93`, `6a20cc3` |
| 1 | Design tokens + typography foundation | 2026-07-12 | #1 | `e7e921d` |
| 1B | Hide ad placeholders | 2026-07-12 | #2 | `933f86e` |
| 1C | AdSense loader env-var flip | 2026-07-12 | #3 | `d39aa06` |
| 2 | Primitive components (Button, Chip, Badge, Ledger, Callout, Breadcrumb, Section, Container) | 2026-07-13 | #4 | `a2485a2` |
| 3 | Header + Footer | 2026-07-13 | #5 | `6eb203b` |
| 4 | Cards & strips (ToolCard, CategoryRow, BlogCard, RelatedToolCard, StatsStrip) | 2026-07-13 | #6 | `79c447b` |
| 5 | Homepage replacement (Blueprint §30) | 2026-07-14 | #7 | `d7a439a` |

## Verification status

- **Production deployment:** `dpl_HhtAs1W5FLuKeGnvzr56wqTaCMyE`, status Ready, `www.awe-os.com`.
- **Structural/SEO checks:** PASS — see `docs/reports/batch-5-production-verification.md`.
- **Lighthouse (a11y + performance) on `/`:** _TODO — pending run, to be filled in._
- **Google Search Console status (indexing / re-crawl of `/`):** _TODO — pending run, to be filled in._

## Known gaps carried forward

Tracked in `docs/backlog.md` — notably: 5 missing policy routes
(`/editorial-policy`, `/corrections-policy`, `/ai-content-policy`,
`/advertising-policy`, `/tool-testing-policy`) plus `/request-tool` and
`/blog/category/*`, deferred to Batch 8; `ui/`-vs-`primitives/` and
top-level-`ToolCard`-vs-`cards/ToolCard` adoption cleanup; global
`:focus-visible`/`motion-reduce` rules still component-scoped rather
than site-wide.
