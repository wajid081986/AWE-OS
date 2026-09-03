# Batch-102 plan: GSC phantom-URL + /privacy redirect cleanup

Scope: exactly the 2 items requested. Nothing else from the earlier GSC
audit (everything else was confirmed stale-GSC-data / already fixed, or
is being left as expected noindex-lag).

## 1. `middleware.js` — add 4 confirmed-dead phantom URLs

Add to both `DEAD_PATHS` (Set) and `config.matcher` (array), following
the exact existing pattern (exact-path match, edge runtime, real 404
response):

- `/tools/job-interview-simulator`
- `/tools/ai-cover-letter-generator`
- `/tools/awe-os-pdf-editor`
- `/tools/interest-rate-tracker`

Also update the file's top docstring: current comment says "These 10
paths are confirmed dead" — will become 14 (13 `/tools/*` + the 1
`/bmi-calculator/bhopa` typo), and add one dated paragraph (matching the
existing per-batch paragraph style, e.g. the "batch-91" one already
there) explaining these 4 were found via the 2026-09-03 GSC audit,
confirmed zero live references anywhere in `client/src` or `server/` via
grep, and that `awe-os-pdf-editor` is an orphan left over from batch-55's
blog-link remap (the link text was fixed to point to the real
`/tools/pdf-editor`, but the old URL itself was never redirected/404'd).

No change to matcher logic itself — same exact-path, no-pattern-widening
approach the file's comment already mandates.

## 2. `vercel.json` — real 301 for `/privacy`

Add one entry to the `redirects` array:

```json
{ "source": "/privacy", "destination": "https://www.awe-os.com/privacy-policy", "permanent": true }
```

Placed next to the existing `/pricing` redirect (same category: simple
top-level page consolidation). Matches the file's current convention of
full absolute `https://www.awe-os.com/...` destinations.

Note on `routes.jsx`: this makes the client-side
`<Route path="/privacy" element={<PrivacyPolicy />}>` shim unreachable
(the edge-level 301 fires before the SPA ever loads) — same situation as
the existing `/pricing` `<Navigate>` route, which the codebase already
leaves in place as harmless dead code rather than removing. Following
that same precedent: `routes.jsx` is left untouched in this batch.

## Out of scope (logged already / no action)

- `/store`, `/calculators`, and the 10 previously-fixed phantom URLs —
  stale GSC data, no code change needed, should self-resolve on next
  Google recrawl.
- The 24 noindex'd city pages in "crawled — not indexed" — expected
  lag, not a defect.

## Workflow

1. Branch off `main`, commit this plan verbatim to
   `docs/batches/batch-102-plan.md` first.
2. Implement the 2 file changes as separate commits
   (`batch-102: <what>`).
3. Run build; spot-check the 4 URLs and `/privacy` behavior can only be
   truly verified post-deploy (Vercel Edge Middleware and redirects
   don't run in local `vite build`/preview the same way) — noted as a
   post-deploy verification step in the summary rather than claimed as
   pre-deploy-confirmed.
4. End with changed-files list + verification checklist, then stop (no
   auto-deploy, no push unless asked).
