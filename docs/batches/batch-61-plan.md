# Batch 61 — UTM Tracking for Auto Campaign Outbound Links

## Scope

Growth OS Phase 4 SDD, UTM-only half (GA4-independent). Append UTM tracking
parameters to outbound links that Platform Publisher (GrowTab.jsx →
AutoCampaignPage.jsx) generates via the Auto Campaign one-click flow, so
traffic can later be attributed back to channel + post once GA4 or manual
referral inspection is available. Does NOT include any attribution
reporting UI (deferred, depends on GA4 which is out of scope).

## Investigation summary

- All outbound URL construction for Auto Campaign lives in one file:
  `server/routes/auto-campaign.js`.
  - `toolUrl` built at line 61.
  - `blogUrl` built at line 165 (only set if the blog-publish step
    succeeds).
  - Twitter step (line 178): `const linkToUse = blogUrl || toolUrl`,
    passed to `postTweet(tweetText, linkToUse)`.
  - Pinterest step (line 197): `link: blogUrl || toolUrl`, passed to
    `createPin({ link, ... })`.
- Exactly 2 construction points, both in this one file — a single shared
  helper is a clean fit, no scattering.
- URL formats: Twitter appends the URL as plain text to the tweet body
  (`twitter.service.js` `buildTweetText`, which truncates to fit 280
  chars including the URL — still correct with longer UTM'd URLs, since
  truncation happens after the URL is appended). Pinterest passes the URL
  as the pin's `link` field (not shown in visible text).
- Reddit/Quora currently have **no URL at all** — only `{title, body}` /
  `{question, answer}` text for manual copy-paste, tool mentioned by name
  only. Confirmed with user: out of scope for this batch, left untouched.

## Changes

### New file: `server/services/utm.js`

Small standalone helper (matches existing single-purpose files like
`parseAIJson.js`):

```js
function buildTrackedUrl(baseUrl, { source, medium, campaign }) {
  const url = new URL(baseUrl)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)
  return url.toString()
}
module.exports = { buildTrackedUrl }
```

### Modify: `server/routes/auto-campaign.js`

Additive only — no other behavior changed.

- Lift `cleanSlug` (currently computed inside the Step 4 try block) to an
  outer-scoped `campaignSlug` variable so Steps 5 and 6 can read it.
- Twitter step: wrap `blogUrl || toolUrl` with
  `buildTrackedUrl(..., { source: 'twitter', medium: 'social', campaign: campaignSlug || toolSlug })`.
- Pinterest step: wrap `blogUrl || toolUrl` with
  `buildTrackedUrl(..., { source: 'pinterest', medium: 'social', campaign: campaignSlug || toolSlug })`.

### Param values

- `utm_source`: `twitter` / `pinterest`
- `utm_medium`: `social` (both)
- `utm_campaign`: blog's clean slug if blog publish succeeded, else
  `toolSlug` — mirrors the existing `blogUrl || toolUrl` fallback exactly.

## Out of scope (confirmed with user)

- Reddit/Quora — no link exists in current drafts, nothing to tag.
- Any attribution reporting UI — depends on GA4, deferred.
- No new DB table, no new AI calls, no UI changes.

## Verification

- `npm run build` (or equivalent) passes.
- Manual read-through: tweet text truncation still correct with longer
  URL; Pinterest pin payload still valid.
