# Batch 5.5b Plan — CSP Delivery (closed, no fix needed)

Branch: `batch-5.5b-csp-delivery`, created from `batch-5.5-perf-a11y`'s tip.

## Premise

Opened to "resolve the vercel.json routes-vs-headers interaction" believed
to be preventing `Content-Security-Policy-Report-Only` (and other Batch
5.5 stage-3 headers) from being delivered on HTML document responses.

## Investigation

1. Reviewed Vercel's official `vercel.json` docs and CDN caching docs — the
   `headers` config pattern already in use (`source: "/(.*)"`) matches
   Vercel's own documented example for applying custom headers to static
   files, so no structural config bug was evident from the docs.
2. Curled **production** (`www.awe-os.com`) directly: both a cache-HIT
   response (`/`, `Age: 53337`) and a cache-MISS response
   (`/tools/merge-pdf`, `Age: 0`, freshly served from origin) showed the
   **same** header set — missing `Permissions-Policy`,
   `Cross-Origin-Opener-Policy`, and `Content-Security-Policy-Report-Only`.
   A cache-MISS response reflects the actual deployed build; since it was
   also missing the new headers, this ruled out stale-cache-hiding-a-real-
   header as the explanation — the build itself didn't have them.
3. Root cause: **PR #8 (Batch 5.5) had never actually been merged to
   `main`** — production was still running the pre-Batch-5.5 build, which
   never had the new `vercel.json` headers at all. Not a caching artifact,
   not a config bug — just an unmerged branch.

## Resolution

PR #8 merged (2026-07-14). Waited for the resulting production deploy,
then ran the full Batch 5.5 production verification on `www.awe-os.com`:

- All 8 headers present, including `Content-Security-Policy-Report-Only`
  (full policy string delivered intact) — **PASS**
- No `Inter` font link/request anywhere in the shipped HTML — **PASS**
- Design-system fonts CSS (`fonts.googleapis.com/css2?family=Bricolage...`)
  returns `200`, not `404` — **PASS**
- Homepage + 3 tool routes (`/tools/merge-pdf`, `/tools/image-compressor`,
  `/tools/gst-calculator`) all return `200` with correct `<h1>` — **PASS**
- `/tools/resume` (Resume Builder) loaded via a live browser session:
  0 CSP violation reports, 0 console errors, correct `<h1>` — **PASS**

No `vercel.json` changes were needed. Closing this batch with zero code
changes — see `docs/backlog.md`.
