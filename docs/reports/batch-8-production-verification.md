# Batch 8 — Production Verification Report

Date: 2026-07-15
Verified against: `https://www.awe-os.com` (live production)
PR: #11 (`batch-8-policy-pages` → `main`), merge commit `bf09026`

## Overall result: **PASS**

## 1. `main` tip matches PR #11 merge commit

```
$ git fetch origin && git log origin/main -1 --oneline
bf09026 Merge pull request #11 from wajid081986/batch-8-policy-pages
```

Confirmed: `origin/main` tip is the PR #11 merge commit. No commits landed
on `main` between the merge and this verification.

## 2. Route-by-route checks

All 8 policy routes fetched directly from production (`curl
https://www.awe-os.com/<route>`).

| Route | HTTP | `<title>` count | `<h1>` count | Title | H1 text | Last updated |
|---|---|---|---|---|---|---|
| `/editorial-policy` | 200 | 1 | 1 | Editorial Policy — AWE-OS | Editorial Policy | July 15, 2026 |
| `/tool-testing-policy` | 200 | 1 | 1 | Tool Testing Policy — AWE-OS | Tool Testing Policy | July 15, 2026 |
| `/ai-content-policy` | 200 | 1 | 1 | AI Content Policy — AWE-OS | AI Content Policy | July 15, 2026 |
| `/corrections-policy` | 200 | 1 | 1 | Corrections Policy — AWE-OS | Corrections Policy | July 15, 2026 |
| `/advertising-policy` | 200 | 1 | 1 | Advertising Policy — AWE-OS | Advertising Policy | July 15, 2026 |
| `/privacy-policy` | 200 | 1 | 1 | Privacy Policy — AWE-OS | Privacy Policy | July 15, 2026 |
| `/terms` | 200 | 1 | 1 | Terms of Use — AWE-OS | Terms of Use | July 15, 2026 |
| `/disclaimer` | 200 | 1 | 1 | Disclaimer — AWE-OS | Disclaimer | July 15, 2026 |

All 8: complete SSG'd HTML served directly (no client JS required to see
content), exactly one `<title>` and one `<h1>` each, correct text.

Disclaimer's follow-up "Health figures" section (added after the initial
merge per the second implementation commit) is confirmed live: both the
heading and its opening sentence ("Results from our BMI and age
calculators...") are present in the served HTML.

## 3. Stale placeholder text — confirmed gone

| Check | Expected | Result |
|---|---|---|
| `contact@awe-os.com` on any of the 8 pages | 0 | **0 on all 8** |
| `wajid081986@gmail.com` on any of the 8 pages | 0 | **0 on all 8** |
| "Bengaluru" jurisdiction clause on `/terms` (old "courts in Bengaluru, Karnataka" line) | 0 | **0** |
| GDPR / "General Data Protection Regulation" boilerplate on `/privacy-policy` (old policy's generic GDPR/IT-Act summary) | 0 | **0** |
| `support@awe-os.com` present on all 8 pages | present everywhere | **present on all 8** (2 or 4 occurrences per page depending on whether the page's own body text also mentions it, in addition to the shared template's closing line — consistent with the content design, not an anomaly) |

## 4. Footer regression check

All 8 Legal & Trust links (`/privacy-policy`, `/terms`, `/disclaimer`,
`/editorial-policy`, `/tool-testing-policy`, `/ai-content-policy`,
`/corrections-policy`, `/advertising-policy`) confirmed present in the
rendered footer HTML on production.

## Known open items (unchanged, tracked separately, not part of this verification)

- `docs/batches/batch-8b-contact-about-cleanup.md` — proposed, not yet
  approved/implemented (stale `contact@awe-os.com` / "non-intrusive
  advertising" text on `/contact` and `/tools/free`, which batch 8 never
  touched).

## Conclusion

Batch 8 is confirmed correctly deployed to production with no regressions
and no leftover stale content within its own scope (the 8 policy pages).
Closing batch 8 as done — see status update in
`docs/batches/batch-8-policy-pages.md`.
