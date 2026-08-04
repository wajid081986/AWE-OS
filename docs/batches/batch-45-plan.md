# Batch 45 — CSP update to unblock AdSense script/frame loading

**Branch:** `batch-45-csp-adsense`

## Scope

Production's `Content-Security-Policy` header (`vercel.json`, single
`headers` block for `/(.*)`) has no allowance for any Google
ad-serving domain. With `VITE_ADSENSE_PUBLISHER_ID` now set (real
production env var) and `ADS_ACTIVE` compiling to `true`, the
`adsbygoogle.js` loader script (`client/src/main.jsx`) correctly gets
injected into `document.head` at runtime — verified live via a
headless Playwright run against `https://www.awe-os.com/` — but the
resulting network request fails with `csp` as the failure reason, not
a 404/DNS/ID error. The browser is silently blocking the request
before it reaches Google's servers.

## Root cause

`vercel.json`'s CSP `script-src` only allows `'self' 'unsafe-inline'
https://cloud.umami.is https://checkout.razorpay.com`. No Google
domain is present in `script-src`, `connect-src`, or `frame-src`.
AdSense needs all three: the loader script, viewability/click
tracking requests, and SafeFrame iframes that actually render ad
creatives.

## Change (1 file)

`vercel.json` — the single CSP header string (currently on line 94) —
add Google's documented AdSense domain set to three directives only:

- `script-src`: add `https://pagead2.googlesyndication.com
  https://*.googlesyndication.com https://www.google.com
  https://www.gstatic.com https://*.adtrafficquality.google`
- `connect-src`: add `https://pagead2.googlesyndication.com
  https://*.googlesyndication.com https://www.google.com
  https://*.adtrafficquality.google`
- `frame-src`: add `https://googleads.g.doubleclick.net
  https://tpc.googlesyndication.com https://www.google.com
  https://*.adtrafficquality.google`

`img-src` (already `'self' data: https:`) and `style-src` (ad iframes
are sandboxed with their own style context) are unchanged.

All other directives, all redirects, and all other headers in
`vercel.json` are untouched.

## Verification after deploy

Re-run the same headless Playwright check used to diagnose this
(navigate to `https://www.awe-os.com/`, listen for `requestfailed` on
`googlesyndication|adsbygoogle` URLs) — the request should no longer
report `csp` as the failure reason. Confirm via response status
instead of just "no failure event."

## Known open item (not in this batch's scope)

`ca-pub-9932827285389290` — the publisher ID currently set in
`VITE_ADSENSE_PUBLISHER_ID` — matches the placeholder value Batch 1C
(2026-07-12) deleted from `client/index.html` as unverified test data
(`docs/batches/batch-1c-plan.md:14`). Whether this is the real AdSense
account ID has not been confirmed by the user. Logged here, not fixed
here — this batch only unblocks the transport layer (CSP); it does not
touch the env var value.

## Risk

Widens the CSP allowlist to trust several Google ad-serving domains —
standard and expected for any site running AdSense, not unusual for
this change. No new npm dependency, no new route, no change to any
other security header.
