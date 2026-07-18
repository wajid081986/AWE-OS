# City Pages Audit — AdSense Doorway-Page Risk Review

Date: 2026-07-18
Scope: the 24 city-tool routes rendered by `CityToolPage.jsx` from
`client/src/data/cityPages.js`. **Analysis only — no edits, no
recommendations, no fixes.** This is evidence for the owner's
differentiate/noindex/remove ruling.

Method: programmatic pass over `CITY_PAGES` (word counts, per-block
cross-city normalization/similarity, filler-phrase and cited-source
detection) + code trace of `CityToolPage.jsx`, `entry-server.jsx`,
`ssg-build.js` + one real `npm run build` (SSG, `dist/` is gitignored,
no tracked files touched) to get the authoritative `<title>` gap list
straight from the build's own instrumentation rather than inferring it.

---

## 1. Inventory

24 routes = 3 tools × 8 cities. Same 8 cities for every tool:
**Ahmedabad, Bengaluru, Chennai, Delhi, Hyderabad, Kolkata, Mumbai, Pune.**

| Tool | Route pattern | URLs |
|---|---|---|
| BMI Calculator | `/bmi-calculator/{city}` | `/bmi-calculator/ahmedabad`, `/bmi-calculator/bengaluru`, `/bmi-calculator/chennai`, `/bmi-calculator/delhi`, `/bmi-calculator/hyderabad`, `/bmi-calculator/kolkata`, `/bmi-calculator/mumbai`, `/bmi-calculator/pune` |
| SIP Calculator | `/sip-calculator/{city}` | `/sip-calculator/ahmedabad`, `/sip-calculator/bengaluru`, `/sip-calculator/chennai`, `/sip-calculator/delhi`, `/sip-calculator/hyderabad`, `/sip-calculator/kolkata`, `/sip-calculator/mumbai`, `/sip-calculator/pune` |
| GST Calculator | `/gst-calculator/{city}` | `/gst-calculator/ahmedabad`, `/gst-calculator/bengaluru`, `/gst-calculator/chennai`, `/gst-calculator/delhi`, `/gst-calculator/hyderabad`, `/gst-calculator/kolkata`, `/gst-calculator/mumbai`, `/gst-calculator/pune` |

All 24 are built by `entry-server.jsx`'s `for (const page of CITY_PAGES)`
loop (one shared route pattern, `/:toolSlug/:city`) and render through
the single `CityToolPage.jsx` component — there is no per-city or
per-tool component variation, only data variation.

**Structural finding not asked for by name but load-bearing for every
section below:** `CityToolPage.jsx` does not render the calculator
itself anywhere. It renders prose blocks + FAQ + an "other cities" link
list + a CTA button linking to `/tools/{toolSlug}` (the real, generic
tool page). A user who searches "BMI calculator Mumbai" and lands on
`/bmi-calculator/mumbai` gets an article with no working calculator on
it — they must click through again to actually use the tool. See §6.

---

## 2. Per-page content profile

Word counts computed directly from `content[]`/`faqs[]` (prose = h1/h2/p/ul/callout
text, excluding table cells; table = table cell text; faq = question+answer text).
Note: `cityPages.js` carries a stored `wordCount` field per page, but it doesn't
match this recount (e.g. `bmi-calculator/ahmedabad` stores `1419`, actual content
sums to `1535`) — the stored field (which feeds the admin `ProgrammaticSeo`
dashboard's Good/Medium/Poor buckets) is stale relative to current content and
shouldn't be trusted as-is.

| Slug | Prose words | Table words | FAQ words | Total | Content blocks | FAQs |
|---|---:|---:|---:|---:|---:|---:|
| bmi-calculator/ahmedabad | 840 | 98 | 597 | 1535 | 19 | 6 |
| bmi-calculator/kolkata | 959 | 108 | 711 | 1778 | 19 | 6 |
| bmi-calculator/pune | 846 | 90 | 599 | 1535 | 19 | 6 |
| bmi-calculator/chennai | 762 | 84 | 611 | 1457 | 19 | 6 |
| bmi-calculator/hyderabad | 781 | 90 | 620 | 1491 | 19 | 6 |
| bmi-calculator/bengaluru | 825 | 96 | 664 | 1585 | 19 | 6 |
| bmi-calculator/delhi | 889 | 105 | 721 | 1715 | 19 | 6 |
| bmi-calculator/mumbai | 882 | 96 | 584 | 1562 | 19 | 6 |
| sip-calculator/ahmedabad | 841 | 57 | 639 | 1537 | 15 | 6 |
| sip-calculator/kolkata | 756 | 58 | 576 | 1390 | 15 | 6 |
| sip-calculator/pune | 868 | 84 | 675 | 1627 | 15 | 6 |
| sip-calculator/chennai | 874 | 67 | 723 | 1664 | 15 | 6 |
| sip-calculator/hyderabad | 798 | 77 | 673 | 1548 | 15 | 6 |
| sip-calculator/bengaluru | 808 | 59 | 630 | 1497 | 15 | 6 |
| sip-calculator/delhi | 841 | 80 | 722 | 1643 | 15 | 6 |
| sip-calculator/mumbai | 873 | 116 | 551 | 1540 | **18** | 6 |
| gst-calculator/ahmedabad | 968 | 115 | 675 | 1758 | 18 | 6 |
| gst-calculator/kolkata | 776 | 112 | 556 | 1444 | 18 | 6 |
| gst-calculator/pune | 903 | 140 | 670 | 1713 | 18 | 6 |
| gst-calculator/chennai | 783 | 122 | 568 | 1473 | 18 | 6 |
| gst-calculator/hyderabad | 691 | 103 | 630 | 1424 | 18 | 6 |
| gst-calculator/bengaluru | 869 | 122 | 678 | 1669 | 18 | 6 |
| gst-calculator/delhi | 676 | 126 | 579 | 1381 | 18 | 6 |
| gst-calculator/mumbai | 856 | 117 | 708 | 1681 | 18 | 6 |

**City-specific vs. template split** (block-level, verified by cross-city
diffing in §3 — the ratio is structural per tool family, not per page,
since every page in a family shares the same block skeleton):

- **BMI (8 pages):** genuinely city-varying blocks = intro paragraph
  (NFHS stats), the stats table, the worked-example paragraph (real
  names/weights/heights, different per city), and one FAQ answer
  ("is obesity rising in {city}?"). That's roughly **45-50% of prose
  words**. The remaining ~50-55% — all 7 `h2` section headers, the
  "Key Features" intro paragraph, "How to Use," "Who Needs," "Why
  Perfect" sections, the closing `ul`, and 5 of 6 FAQ questions — are
  template with only the city name (and one local-area name-drop)
  substituted.
- **GST (8 pages):** the rate table (5 rows of real industry/GST%
  data, different industries chosen per city) is the one substantially
  unique block, plus one worked-example paragraph. That's **~20-25% of
  total words**. The opening paragraph, "Key Features" table, "How to
  Use," "Who Needs," "Why Perfect," and closing sections are template
  (see §3 for the identical-skeleton quote).
- **SIP (8 pages):** effectively **0% of the financial content is
  city-varying** — SIP compounding math and the AMFI industry figures
  are identical nationwide by definition. The only city-varying text is
  local neighborhood/persona name-dropping layered over an identical
  set of claims (free/instant/no-signup/80C tax saving — see the
  literal duplicate row in §3). Estimated template share: **~70-75% of
  prose words**, rising to non-differentiable for the numeric content.

---

## 3. Cross-city similarity

Programmatic per-block diff (city name normalized out, then string-compared)
across all 8 pages per tool confirms a fixed skeleton in every family:
every `h2` heading, the CTA callout, and 4-5 of the 6 FAQ questions are
**identical in structure across all 8 cities** (only the city name and
one local-area token differ). Example counts from the BMI family:

```
block  5 [h2] "BMI Calculator for {City} — Key Features"   → 1/8 distinct
block  8 [h2] "How to Use BMI Calculator in {City}"          → 1/8 distinct
block 10 [h2] "{City} Examples with Real Numbers"            → 1/8 distinct
block 12 [h2] "Who Needs BMI Calculator in {City}"           → 1/8 distinct
block 14 [h2] "Why AWE-OS BMI Calculator is Perfect for {City} Users" → 1/8 distinct
block 16 [h2] "Conclusion"                                   → 1/8 distinct
block 18 [callout] CTA text                                  → 1/8 distinct
```
("1/8 distinct" = literally identical wording across all 8 cities once
the city name is swapped back out.)

**Literal duplicate example (SIP "80C Tax Saving" feature table row,
identical across all 8 cities, only the "example" column changes):**

> Ahmedabad: `["80C Tax Saving", "Shows Section 80C benefit", "ELSS SIP qualifies for ₹1.5L annual tax deduction"]`
> Kolkata: `["80C Tax Saving", "Shows Section 80C benefit", "ELSS SIP qualifies for ₹1.5L annual tax deduction"]`
> Delhi: `["80C Tax Saving", "Shows Section 80C benefit", "ELSS SIP qualifies for ₹1.5L annual tax deduction"]`

**Paraphrased-but-templated example (GST intro paragraph — same 6-beat
structure: city nickname → industry mix → "GST compliance is crucial"
→ introduce the AWE-OS calculator → name-drop 1-2 local business areas
→ "focus on growth without being bogged down"):**

> Ahmedabad: *"Ahmedabad, known as the Manchester of India, is a bustling
> hub of economic activity... The AWE-OS gst-calculator is an
> indispensable tool... allowing businesses to maintain their
> competitive edge."*
>
> Kolkata: *"Kolkata, known as the cultural capital of India, is a
> bustling metropolis... This is where the AWE-OS GST Calculator comes
> to the rescue... maintaining financial health and streamlining
> operations."*
>
> Bengaluru: *"Bengaluru, often dubbed as the Silicon Valley of India, is
> a dynamic city... The gst-calculator by AWE-OS is an essential
> tool... allowing businesses to focus on innovation and growth."*

All 8 GST intros follow this identical template (nickname + industry
adjective + compliance-is-crucial + tool-as-solution + local-area
name-drop + growth-without-being-bogged-down close); only the specific
nickname, industries, and 1-2 proper nouns change.

**FAQ skeleton (identical question categories, same order, all 8
cities, BMI family shown):** every city's 6 FAQs map to the same slots
— (1) helps local businesses, (2) helps a named local profession/sector,
(3) helps a named local trader/community group, (4) suitable for
students, (5) supports corporate wellness / healthcare providers, (6)
"is obesity a growing concern in {city}?". SIP and GST FAQs follow the
same fixed-slot pattern with their own tool-relevant categories.

---

## 4. Data quality

| Tool | Cited source(s) | Real & checkable? | Flags |
|---|---|---|---|
| BMI | NFHS-5 (2019-21), Ministry of Health and Family Welfare | Yes, NFHS-5 is real and its topline overweight/obesity/underweight figures are checkable — **but the data is STATE-level (Gujarat, West Bengal, etc.), not city-level**, presented as if it characterizes the named city specifically. No city-level NFHS breakout exists to attribute to "Ahmedabad" vs "Gujarat" generally. | `bmi-calculator/delhi`'s stats table hardcodes a specific figure — **"41.6%"** for women overweight/obese — where every sibling page uses a vague qualitative phrase ("Above national average", "Rising in urban areas"). This one hard number is unsourced within the page and inconsistent in format with its 7 siblings; treat as unverified/possibly invented until checked against actual NFHS-5 Delhi/NCT figures. |
| SIP | AMFI (Association of Mutual Funds in India), December 2025 | The AMFI monthly aggregate table (Total AUM ₹82 lakh crore, SIP inflows ₹31,002 crore, 9.79 crore accounts) is a **national** figure — appropriately labeled as India-wide, not claimed as city data — **but it only appears on 1 of the 8 SIP pages** (`sip-calculator/mumbai`); the other 7 have no equivalent sourced data block at all. One row ("Average SIP Ticket Size ~₹3,170/month") is explicitly self-labeled in the data as "not an official AMFI headline stat" — i.e. a derived/computed figure, correctly caveated in this one instance. | 6 of 8 SIP pages cite no source at all for any figure (`citedSourceHits` count of 0-1 in a programmatic keyword scan for NFHS/RBI/AMFI/SEBI/Ministry/Census/GST Council/CBDT). |
| GST | None explicit ("GST Council rate schedule" mentioned generically in 1-2 table cells, no notification number/date) | The rate percentages themselves are plausible and mostly match known GST slabs (5%/12%/18%/28%+cess, EV concessional 5%, cut/polished diamonds 1.5%) — but presented with zero explicit citation (no CBIC notification #, no date), unlike the BMI/SIP tables. | GST rates are **national law**, identical regardless of which city a business is in — the "differentiation" here is which industries were selected for the table (textiles for Ahmedabad, IT/aerospace for Bengaluru, finance/film for Mumbai), not the tax data itself. This selection is a legitimate reflection of each city's real economic character, but the underlying GST%/city pairing has no genuine city-specific meaning. |

**Generic filler-phrase scan** (`bustling metropolis`, `vibrant city`,
`thriving economy`, `dynamic city`, `fast-paced`, etc.) found at least
one hit on 20 of 24 pages, with GST intros the densest (every GST page
opens with a nickname + "bustling/thriving/dynamic" adjective — see §3
quote block). `bmi-calculator/hyderabad` and `gst-calculator/ahmedabad`
had zero filler-phrase hits in this scan.

**Data-field integrity gap (found during this audit, not asked for by
name but relevant to §7):** `gst-calculator/kolkata`, `gst-calculator/hyderabad`,
and `gst-calculator/delhi` are missing the `cityName` and `toolSlug`
fields that the other 21 pages carry (both come back `undefined`).
`CityToolPage.jsx` has a fallback (derives the label from the slug
instead), so nothing currently breaks visibly, but it's evidence these
3 pages were produced by a different generation pass than the other 21.

**Arithmetic spot-check (positive finding):** the BMI "real numbers"
worked examples check out — e.g. Ahmedabad's "75 kg / 165 cm → BMI 27.5"
(75 / 1.65² = 27.55 ✓), "60 kg / 155 cm → BMI 25" (60 / 1.55² = 24.97 ✓
rounds to 25), "50 kg / 160 cm → BMI 19.5" (50 / 1.6² = 19.53 ✓). The
calculator-adjacent numbers are not hallucinated.

---

## 5. Titles gap

Confirmed by running the actual SSG build (`npm run build` in
`client/`, output only to gitignored `dist/`) rather than inferring it —
`ssg-build.js` logs every route whose Helmet output has no real
`<title>` tag:

```
Routes with no page-specific <title> (fell back to site default — pre-existing content gap): 26
/bmi-calculator/ahmedabad, /bmi-calculator/kolkata, /bmi-calculator/pune, /bmi-calculator/chennai,
/bmi-calculator/hyderabad, /bmi-calculator/bengaluru, /bmi-calculator/delhi, /bmi-calculator/mumbai,
/sip-calculator/ahmedabad, /sip-calculator/kolkata, /sip-calculator/pune, /sip-calculator/chennai,
/sip-calculator/hyderabad, /sip-calculator/bengaluru, /sip-calculator/delhi, /sip-calculator/mumbai,
/gst-calculator/ahmedabad, /gst-calculator/kolkata, /gst-calculator/pune, /gst-calculator/chennai,
/gst-calculator/hyderabad, /gst-calculator/bengaluru, /gst-calculator/delhi, /gst-calculator/mumbai,
/compare/merge-pdf-vs-compress-pdf, /faq/pdf-tools
```

**All 24 of the 24 city pages are in this list** — none has a
page-specific `<title>`. The other 2 of the 26 (`/compare/merge-pdf-vs-compress-pdf`,
`/faq/pdf-tools`) are unrelated non-city routes.

Root cause traced: `CityToolPage.jsx` contains **zero** `<Helmet>` usage
anywhere in the component — it renders `<main>`/`<article>` content
directly with no head management at all. Meanwhile `cityPages.js`
carries a `metaTitle` and `metaDescription` field on every one of the
24 pages (e.g. `"Free BMI Calculator Ahmedabad 2026 | AWE-OS"`) — **this
data exists but is never read or rendered anywhere in the codebase**
(confirmed: no reference to `page.metaTitle` or `page.metaDescription`
in `CityToolPage.jsx`). Every city page silently falls back to the
site-wide default `<title>`/meta description defined in the shell HTML.

---

## 6. Search-reality check

**Plausible real queries?** Mixed by tool:
- GST/SIP calculator + city has plausible commercial search intent
  (business/finance tools are often searched with a location qualifier
  by SME owners, e.g. "GST calculator Mumbai").
- BMI calculator + city is a much weaker real-query pattern — BMI is a
  personal-health lookup with no inherent geographic search modifier;
  nobody's BMI math changes because they're in Chennai vs Pune.

**Does the calculator behave differently per city?** No — confirmed by
reading `BMICalculator.jsx`, `SIPCalculator.jsx`, `GSTCalculator.jsx`:
none accept or reference a `city` prop/param, and none of the three
tool computations have any legitimate city-dependent input (BMI formula
is universal; SIP compounding math is universal; GST rates are set by
national law, not municipal law). **There is no scenario in which any
of these 3 calculators should ever produce a different result by city.**

**Bigger structural finding:** the calculator isn't even embedded on the
city page. `CityToolPage.jsx` renders only prose + FAQ + an "other
cities" link block + a CTA `<Link>` to `/tools/{toolSlug}` — the actual
interactive tool lives exclusively at the generic tool page. Every one
of the 24 city pages is, functionally, a content wrapper whose sole
purpose is to rank for a city-qualified query and then hand the visitor
off to the identical generic tool everyone else uses. This is close to
the textbook definition of a doorway page.

---

## 7. Buckets

| Bucket | Pages | Basis |
|---|---|---|
| **(a) Genuinely differentiated** | **0 / 24** | No page combines both real city-specific data *and* substantial unique prose *and* city-specific tool behavior. Nothing qualifies. |
| **(b) Partially differentiated** | **16 / 24** — all 8 BMI + all 8 GST | BMI: real cited NFHS-5 data + a genuinely varying stats table + a per-city worked example + 1 unique FAQ answer, layered over a template shell for the rest (headers, CTA, 5/6 FAQs, several body paragraphs) — see §2/§3. GST: a genuinely varying rate table (different real industries per city) + a per-city worked example, layered over a fully templated intro/features/how-to/who-needs/why/conclusion skeleton (§3 quote block) with no explicit data citations (§4). |
| **(c) Pure template-swap** | **8 / 24** — all 8 SIP | No city-specific financial data exists to differentiate on (SIP math and the one cited AMFI table are nationally uniform, and that table appears on only 1 of the 8 pages anyway). Differentiation is limited to swapping local neighborhood names and professional personas into an otherwise identical set of claims — including a literally identical feature-table row (§3) — with the underlying substance unchanged city to city. |

**Outliers worth the owner's attention within these buckets:**
- `bmi-calculator/delhi` — the one page with a suspicious unsourced hard
  number (41.6%) inconsistent with its 7 siblings (§4).
- `sip-calculator/mumbai` — the only SIP page with the AMFI national
  table and 3 extra content blocks (18 vs. 15) versus its 7 siblings —
  structurally uneven within its own bucket.
- `gst-calculator/kolkata`, `gst-calculator/hyderabad`, `gst-calculator/delhi`
  — missing `cityName`/`toolSlug` data fields present on the other 21
  pages (§4).
- All 24 — zero page-specific `<title>` (§5), and none render the
  actual calculator (§6).
