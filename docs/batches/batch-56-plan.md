# Batch 56 — Remove dead client/middleware.js

## Context

`docs/backlog.md` item (2026-08-04) flagged `client/middleware.js` (1069
lines, bot-aware UA-sniffing prerenderer) as dead code: it lives inside
`client/`, not next to the repo-root `vercel.json`, so Vercel Edge
Middleware never discovers or loads it.

## Investigation (this batch, before touching anything)

Re-verified the backlog's claim from scratch rather than trusting it as-is,
since the file's own git history showed active, deliberate SEO-optimization
commits ("optimize title and meta description for bmi, fd, sip calculators
to improve CTR", etc.) that looked contradictory at first glance:

- Those commits are dated 2026-07-01 through 2026-07-28 — all *before* the
  2026-08-04 dead-code finding. No commits to the file since. Consistent
  with "actively maintained under a mistaken belief it was live, then
  abandoned once discovered dead" — not contradictory.
- Confirmed only one `vercel.json` in the repo, at the root
  (`buildCommand: "cd client && npm run build"`, `outputDirectory:
  "client/dist"` — paths relative to repo root, consistent with Vercel's
  project Root Directory being the repo root, not `client/`).
- Confirmed no file in `client/` or `server/` imports/requires
  `middleware.js`.
- **Definitive live test**: `curl` the production site
  (`https://www.awe-os.com/tools/loan-calculator`) with a real Googlebot
  User-Agent — the response is the standard SSG shell (React-Helmet output,
  `ssg-build.js`/Batch-5.5 code comments), not `middleware.js`'s hand-rolled
  `headBlock()` template. Even spoofing the exact UA this file's own
  `SEARCH_BOT_UA` regex matches, it never fires.
- The SSG pipeline (`ssg-build.js` + React-Helmet) already serves full,
  real HTML content to every visitor (bots and regular users alike) for
  every page type this file covered — a strict superset of what
  `middleware.js` attempted, so there's no functional gap to preserve by
  moving it to the repo root instead of deleting it.

## Plan

- Delete `client/middleware.js` outright (not moved — no reason to revive
  a redundant, narrower bot-only rendering path when SSG already covers
  everything it did, for everyone, not just bots).
- Update `docs/backlog.md`'s corresponding item to resolved, same
  convention as prior resolved entries.
- Build check, single commit (`batch-56: remove dead client/middleware.js`).
