# Batch 5.6b — Production Verification Report

Date: 2026-07-18
Verified against: `https://www.awe-os.com` (live production)
PR: #14 (`batch-5.6b-hydration-race` → `main`), merge commit `1434df2`

## Overall result: **PASS**

## 1. `main` tip matches PR #14 merge commit

```
$ git fetch origin && git log origin/main -5 --oneline
1434df2 Merge pull request #14 from wajid081986/batch-5.6b-hydration-race
dc44e63 batch-5.6b: final validation log — batch complete, ready for PR
da8de78 batch-5.6b: expand isHydrationSafe() — full site now hydrates
c991fc6 batch-5.6b: root cause fixed — wrap tool routes in matching error boundaries server-side
2065f6c batch-5.6b: direct prop/DOM comparison both inconclusive, new lead found
```

Confirmed: `origin/main` tip is the PR #14 merge commit, with the
batch's final commit (`dc44e63`) as its direct parent.

## 2. Route-by-route checks

4 routes fetched directly from production (`curl
https://www.awe-os.com/<route>`) — a tool page, a second tool page,
the homepage, and a blog post, covering the categories `isHydrationSafe()`
was expanded to in this batch.

| Route | HTTP | `<title>` | `<h1>` count | Tool-page content | `display:contents` wrapper present |
|---|---|---|---|---|---|
| `/` | 200 | AWE-OS — Free Online Tools for PDF, India Tax & Finance | 1 | n/a | n/a |
| `/tools/merge-pdf` | 200 | Merge PDF — Combine PDF Files Free Online \| AWE-OS | 1 | How-to-use section, FAQ text, limitation callout all present | **yes** |
| `/tools/split-pdf` | 200 | Split PDF — Split PDF into Multiple Files Free \| AWE-OS | 1 | (spot-checked via marker below) | **yes** |
| `/blog/how-to-merge-pdf-files-for-free` | 200 | Merge PDF Files Free Online \| AWE-OS | 1 | n/a | n/a |

All 4: complete SSG'd HTML served directly (no client JS required to
see content), exactly one `<title>` and one `<h1>` each, correct
per-page text (not falling back to a shared default).

The `display:contents` wrapper check is specific to this batch's root
cause: `ToolErrorBoundary.jsx`'s non-error render path always emits
`<div style="display:contents">`, which `entry-server.jsx` never
rendered before this batch (the actual bug — see
`docs/batches/batch-5.6b-hydration-race.md`). Its presence in the live
production HTML for both tool routes confirms the fix (`entry-server.jsx`
now wrapping tool routes in `ChunkErrorBoundary`/`ToolErrorBoundary`) is
the code actually served, not just merged.

## 3. Owner-verified Lighthouse (production)

- **Desktop**: 100 / 100 / 100 / 100 — CLS 0, FCP 0.7s
- **Mobile**: 83 / 100 / 100 / 100 — CLS 0

CLS 0 on both confirms the batch's underlying goal (real `hydrateRoot`
across the full site, no `createRoot`-discards-and-rebuilds layout
shift) is realized in production, not just in the local sweep harness.

Mobile performance (83) is the one non-100 score — tracked as a
separate, unchanged backlog item (route code-splitting / unused JS),
not a regression introduced by this batch.

## Conclusion

Batch 5.6b is confirmed correctly deployed to production: the merge
commit is on `main`, the specific fix (server-side error-boundary
parity) is present in served HTML, and owner-verified Lighthouse shows
CLS 0 on both desktop and mobile with no other regressions. Closing
batch 5.6b as **CLOSED** — see status update in
`docs/batches/batch-5.6b-hydration-race.md`.
