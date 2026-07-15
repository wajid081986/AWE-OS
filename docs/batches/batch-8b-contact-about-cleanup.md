# Batch 8b Plan — Contact/About Cleanup (align with Batch 8's policy pages)

Branch (to be created on approval): `batch-8b-contact-about-cleanup`, from
`origin/main` once batch 8 (`batch-8-policy-pages`, PR open, not yet merged)
lands — this batch assumes `support@awe-os.com` is already the established
convention from the 8 policy pages, and reads awkwardly without them merged
first. If the owner wants this done before batch 8 merges, branch from
`batch-8-policy-pages` instead and note the dependency in the PR.

Status: **PLAN ONLY — not approved, nothing implemented.**

## Origin

Owner-reported stale content on `/contact` and `/about`, found while
reviewing batch 8's PR. Audit (full `npm run build` + grep across all 134
prerendered `dist/` routes, see chat) confirmed and extended the report:

1. `/contact` uses `contact@awe-os.com` (mailto link + visible text) —
   owner says this address only just got a forwarder; `support@awe-os.com`
   is the standard going forward, already used on all 8 policy pages.
2. `/about`'s Mission section and a "Built for Everyone" values card still
   frame the product around "students in Mumbai, freelancers in Lagos,
   business owners in London" — a generic-global pitch that predates the
   India-first positioning the new Editorial Policy and Blueprint §22
   commit to (GST/tax-regime/PPF specificity, "built for India first").
3. **Correction to the owner's report**: the "We earn through
   non-intrusive advertising" line is not on `/about` — it's on
   `/contact` (Support FAQ) and appears twice more on `/tools/free`
   (body prose + FAQ answer), which wasn't flagged but has the same
   problem. All three instances predate the Advertising Policy
   (`/advertising-policy`, batch 8) and only mention advertising, not the
   Store — now inconsistent with the page that's supposed to be the
   authoritative statement on how AWE-OS earns money.
4. Also noticed while auditing, not requested: `/tools/free` separately
   claims monetization via "optional premium features for power users"
   / "optional premium subscriptions for business users" — a framing the
   Advertising Policy doesn't mention at all (advertising + Store only,
   nothing about subscriptions). Flagging, not scoping a fix for it here
   — see §Scope guard.

`wajid081986@gmail.com` is already fully gone (batch 8's Disclaimer
refresh removed the last occurrence) — no action needed. `Bengaluru` as
the old Terms jurisdiction clause is already gone (confirmed zero matches
on `/terms`); the 22 routes still containing "Bengaluru" are legitimate
city-page/blog SEO content, not stale — out of scope, not touched.

## Files in scope

| File | Change |
|---|---|
| `client/src/pages/ContactPage.jsx` | Replace `contact@awe-os.com` → `support@awe-os.com` (3 source occurrences: mailto fallback in the submit handler, mailto href, visible text). Remove/replace the "non-intrusive advertising" FAQ answer. |
| `client/src/pages/AboutPage.jsx` | Replace Mumbai/Lagos/London framing (Mission paragraph + "Built for Everyone" values card) with India-first framing consistent with the Editorial Policy. Owner supplies replacement prose (see §Content). |
| `client/src/pages/FreeToolsPage.jsx` | Replace both "non-intrusive advertising" mentions (body prose + FAQ answer) to align with the Advertising Policy's actual wording (advertising + Store, not subscriptions). Owner supplies replacement prose. |

3 files — well under the 25-file cap. No route/SSG/footer changes needed
(none of these 3 pages are being added, removed, or re-routed).

## Content mechanics

Per the no-AI-prose rule (CLAUDE.md §7), the actual replacement sentences
for About's mission framing and Free Tools' monetization framing are
**not drafted here** — this plan only identifies what needs replacing and
where. At implementation:
- `contact@awe-os.com` → `support@awe-os.com` is a mechanical find-replace,
  no new prose needed.
- The "non-intrusive advertising" FAQ answers on `/contact` and
  `/tools/free`: owner supplies replacement text (likely something that
  points to `/advertising-policy` rather than restating the claim inline,
  avoiding future drift when that policy changes) — insert `TODO-CONTENT`
  markers in the interim if owner text isn't ready at implementation time.
- About's Mumbai/Lagos/London framing: owner supplies the India-first
  replacement sentence(s) — same `TODO-CONTENT` fallback if needed.

## Explicitly out of scope

- `FreeToolsPage.jsx`'s "optional premium features/subscriptions" claim
  (noted finding #4 above) — a separate monetization-copy inconsistency,
  not what was reported, needs its own owner ruling on whether that's
  still accurate or should be removed. Logged to `docs/backlog.md`
  instead of folded in here.
- Any visual/design-system migration of `/about`, `/contact`, or
  `/tools/free` (all three are still pre-redesign Tailwind, per batch 8's
  own audit finding) — text-only cleanup this batch, not a restyle.
- Anything on the 22 legitimate `Bengaluru` city-page/blog routes.

## Verification

1. `npm run build` — 134 routes (unchanged count, no new/removed routes).
2. Re-run the same scan this audit used: grep all `dist/` HTML for
   `contact@awe-os.com` (expect zero matches anywhere), `support@awe-os.com`
   (expect `/contact` added to the existing 8 policy-page matches), and
   `"non-intrusive advertising"` (expect zero matches, or confirm the
   owner-approved replacement text where TODO-CONTENT markers were used).
3. Full hydration sweep (134 routes + `/login`, concurrency 1) — these 3
   pages are static-content edits with no new effects/state, expected to
   stay in `isHydrationSafe()`'s default-safe set with no code change.
4. `grep -r "TODO-CONTENT"` — zero before considered done, or explicitly
   listed as known issue if owner text isn't supplied yet.

## Scope guard

- No changes to routing, `ssgRoutes.js`, `entry-server.jsx`, or Footer.
- No new npm dependencies.
- Stage only: `ContactPage.jsx`, `AboutPage.jsx`, `FreeToolsPage.jsx`.

---

*Plan only. Waiting for approval before any file is edited.*
