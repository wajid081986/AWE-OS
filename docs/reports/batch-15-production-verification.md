# Batch 15 — Production Verification

Date: 2026-07-19
PR: #18 (`batch-15-city-noindex` → `main`), merged, branch deleted.

## 1. `main` tip confirmation

```
origin/main: 0db2e2a  Merge pull request #18 from wajid081986/batch-15-city-noindex
             b516ad9  batch-15: add city-pages audit report (evidence for noindex ruling)
             6f61ed6  batch-15: backlog entries for city-pages re-differentiation + dead meta fields
             398a328  batch-15: pass CITY_PAGES noindex flag through to route build
             9b8f5fb  batch-15: mark all 24 city pages noindex in cityPages.js
             bf26e36  batch-15: approved plan — city pages noindex (all 24, bucket a empty)
```
Confirmed via GitHub API (`pulls?state=all`): PR #18, merged. ✅

## 2. City page noindex — PRESENT BUT CONFLICTING (see Known Issue below)

`curl https://www.awe-os.com/bmi-calculator/hyderabad`:

```html
<meta name="robots" content="index, follow" />
<meta name="robots" content="noindex, follow">
```

The requested `noindex,follow` tag **is** present, satisfying the literal
verification ask — but it ships alongside a **contradictory** `index,
follow` tag from the site shell that was never stripped. This is not a
CDN staleness artifact: response headers show `Age: 35`, `Cache-Control:
public, max-age=0, must-revalidate`, i.e. a fresh, revalidated response,
not 6-day-old batch-14 content. Reproduced identically on **all 24**
city routes (spot-checked every one — see §7).

## 3. Tool page / homepage — clean, no leakage

`curl /tools/merge-pdf` and `curl /` (homepage): **zero** `<meta
name="robots">` tags on either. Absence of a robots meta tag means
"index, follow" by default — correct, no leakage from this batch.
(These two pages' `ToolPageShell`/`Home` components use their own
`<Helmet>` meta without a robots tag, so the shell's default robots/description/etc.
block gets stripped entirely with nothing put back — expected,
harmless, unrelated to the conflict in §2.)

## 4. Sitemap

`curl /sitemap.xml`:
- **98** `<url>` entries — exact match to plan.
- **0** occurrences of `bmi-calculator/`, `sip-calculator/`, or
  `gst-calculator/` — confirmed clean.

## 5. Known issue — found during this verification, not pre-existing

**All 24 city pages ship two contradictory `<meta name="robots">` tags
simultaneously: `index, follow` and `noindex, follow`.** Root cause,
traced in `client/scripts/ssg-build.js`:

- `stripDefaultSeoTags()` (lines 91-105) only removes the shell's baked-in
  default robots/description/etc. meta block when
  `helmet.meta.toString().length > 0` — i.e. only when the page's own
  `<Helmet>` supplied *some* meta tag of its own.
- `CityToolPage.jsx` has **zero** `<Helmet>` usage anywhere (confirmed
  during the original audit, §5 of `city-pages-audit-2026-07.md`) — so
  `helmetHasMeta` is always `false` for every city route, and the
  shell's default `index, follow` tag is never stripped.
- `injectHelmet()` then unconditionally appends its own
  `<meta name="robots" content="noindex, follow">` whenever
  `route.noindex` is true (line ~135), regardless of whether the
  default tag was stripped.
- Net effect for city pages specifically: **both** tags ship. (Contrast
  with blog posts, which already had this same append-only
  `robotsOverride` mechanism from before this batch: their
  `BlogPostPage.jsx` *does* set its own `<Helmet><meta name="robots">`
  when `noindex`, so `helmetHasMeta` is `true` there, the default gets
  stripped, and the result is two **identical** `noindex, follow` tags —
  a harmless duplicate, not a conflict. City pages are the first route
  type noindexed that has *no* Helmet meta at all, which is what
  exposes the gap.)

**Why this matters:** shipping directly conflicting `index`/`noindex`
signals on the same page is undefined-outcome territory — it relies on
an unspecified tie-break rather than a clean, unambiguous directive,
which undermines the actual goal of this batch (getting these 24 pages
out of the index). This was not caught during Batch 15's own
verification because that check only grepped for *presence* of
`noindex, follow` (found — correctly) and never checked for an
accompanying conflicting tag or a total robots-meta-tag count per page.

**Not fixed in this report** — a code fix belongs in its own scoped
batch (touches `ssg-build.js`'s shared head-injection logic, which
affects every route type, not just city pages). Flagging here for an
owner ruling on priority/scope, not fixing inline.

## 6. Verdict

Sitemap (✅), tool/homepage leakage (✅), and `main` tip (✅) all verify
clean exactly as planned. The noindex directive is technically present
on all 24 target routes but **degraded by a conflicting tag** — a real
defect, logged above, recommend a fast-follow batch before relying on
this for AdSense/Search Console purposes.

## 7. Full per-route robots-tag dump (all 24, production)

Every route below returned identically:
`<meta name="robots" content="index, follow" />` **+**
`<meta name="robots" content="noindex, follow">`

```
bmi-calculator/{ahmedabad,bengaluru,chennai,delhi,hyderabad,kolkata,mumbai,pune}
sip-calculator/{ahmedabad,bengaluru,chennai,delhi,hyderabad,kolkata,mumbai,pune}
gst-calculator/{ahmedabad,bengaluru,chennai,delhi,hyderabad,kolkata,mumbai,pune}
```
