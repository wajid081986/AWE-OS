# Batch 54 — Tool page SEO meta improvements (manual, one tool at a time)

## Context

Batch 53's CTR Optimizer only covers `blog_posts`. Live GSC data shows the
real CTR problem is on TOOL pages (`/tools/<slug>`), not blog pages — e.g.
`loan-calculator` has 158 impressions / 0 clicks over 28 days. Investigation
(see prior conversation, no separate doc) confirmed tool page
`seo.title`/`seo.description` is hardcoded per-tool inside
`client/src/data/toolRegistry.js` — a single shared config file used for
routing, navigation, and category display across 49+ tools, not just SEO.
This is NOT database-backed like `blog_posts`, so it does not get the
Batch 52/53 live-UPDATE treatment. Every change here is a source edit +
commit + deploy, to a high-blast-radius shared file.

## Process (per tool, no automation, no bulk edits)

For each tool in the priority list below, in order:
1. Look up real top GSC queries for that tool's page via a one-off
   read-only script against `gsc_daily_stats` (or `fetchSearchPerformance`'s
   `allPages`/`topQueries`) — not a new route, since this isn't a repeated
   UI feature.
2. Show current `seo.title`/`seo.description` from `toolRegistry.js` plus
   the real queries.
3. Propose ONE improved `{title, description}` pair with one line of
   reasoning, grounded in the real queries.
4. Wait for explicit approval of that exact text.
5. Only after approval: edit ONLY that tool's `seo.title`/`seo.description`
   string values in its object in `TOOL_REGISTRY` — nothing else in that
   object or any other tool's entry.
6. Show the full git diff for that single change.
7. One commit per tool (`batch-54: improve <slug> SEO meta`) after diff
   approval — never a combined commit.
8. Hold all commits on this branch (`batch-54-tool-seo-meta`) — no push,
   no merge to main — until every tool in the list is done and reviewed
   once more as a whole branch diff.

**Safety rule:** if any tool's edit would require touching anything beyond
that tool's `seo.title`/`seo.description` strings (unexpected object shape,
shared code needing reformatting, etc.), STOP and describe the problem
instead of proceeding.

## Priority list (from GSC Top Pages, 28-day window)

1. loan-calculator — 158 impressions, 0 clicks
2. nps-calculator — 62 impressions, 0 clicks
3. capital-gains-calculator — 72 impressions, 0 clicks
4. fd-calculator — 41 impressions, 0 clicks
5. currency-converter — 5 impressions (lower priority, include only if time)
6. gpa-calculator — 16 impressions
7. tax-calculator — 8 impressions
8. pdf-editor — 5 impressions
9. qr-code-generator — 1 impression — SKIP, too low

Starting with loan-calculator only; no other tool is touched until it's
approved and committed.
