#!/usr/bin/env node
/**
 * hydration-sweep.js — Batch 5.6 verification.
 *
 * Visits every SSG'd route (src/ssgRoutes.generated.js) plus one
 * representative non-SSG route (/login, which hits vercel.json's/vite
 * preview's catch-all rewrite fallback) against a running preview server,
 * captures real browser console output via Playwright, and fails any
 * route that logs a console error or a React hydration-mismatch warning.
 * Prints a per-route PASS/FAIL table; exits nonzero if anything fails.
 *
 * Deliberately checks ALL console.error output, not just messages that
 * look like known hydration-mismatch text — React's hydration warnings
 * are minified in production builds (`vite build` ships NODE_ENV=production
 * react-dom), so pattern-matching alone would miss real mismatches. The
 * regex list below only produces a friendlier "reason" label when it
 * happens to match; the pass/fail decision itself is "any console error
 * at all fails the route," per the batch requirement.
 *
 * Note: this only observes actual `console.*` API calls (Playwright's
 * `page.on('console')`), not network-resource-load failures — a blocked
 * third-party script (GA4, fonts) in a network-restricted environment
 * will not by itself fail a route.
 *
 * Prerequisite: scripts/static-preview-server.js is already running and
 * reachable at BASE_URL (default http://localhost:4173). Do NOT use
 * `vite preview` for this — its default sirv-based server does not
 * resolve extensionless nested paths (e.g. /about) to their
 * directory-index file (about/index.html); it silently falls through to
 * the SPA-shell index.html instead, which fed this sweep the wrong
 * page's markup for every nested SSG route until this was diagnosed. See
 * docs/batches/batch-5.6-ssg-hydration.md. Typical flow:
 *   npm run build
 *   node scripts/static-preview-server.js &
 *   npm run hydration-sweep
 *
 * Usage:
 *   node scripts/hydration-sweep.js [--base-url=http://localhost:4173]
 */

import { chromium } from 'playwright'
import { SSG_PATHS } from '../src/ssgRoutes.generated.js'

const BASE_URL = process.argv.find(a => a.startsWith('--base-url='))?.split('=')[1]
  || process.env.HYDRATION_SWEEP_BASE_URL
  || 'http://localhost:4173'

const HYDRATION_MISMATCH_PATTERNS = [
  /hydration failed/i,
  /did not match/i,
  /server rendered html/i,
  /server-rendered html/i,
  /text content does not match/i,
  /hydrating but/i,
  /expected server html to contain/i,
  /minified react error #4(18|19|2[1235])/i, // #418, #419, #421, #422, #423, #425 — hydration-mismatch family
]

// This sweep's job is hydration correctness, not "does this sandboxed test
// machine have network access to the real production API." Pages that call
// awe-os.onrender.com (live tool counts, blog post lists) legitimately fail
// CORS from an unrelated localhost origin here — confirmed via
// docs/batches/batch-5.6-ssg-hydration.md's determination runs (/blog,
// /tools) — and would not fail this way in real production. A failed XHR to
// that specific host reliably produces TWO console.error lines (the CORS
// message itself, plus Chrome's generic companion "Failed to load resource:
// net::ERR_FAILED") — both excluded, but ONLY when a requestfailed event to
// that exact host was also observed on the same page load, so a genuine
// same-shaped app bug (a real ERR_FAILED unrelated to this host) can't hide
// behind this.
const NOISE_HOST = 'awe-os.onrender.com'
function isKnownEnvironmentNoise(text, sawNoiseHostRequestFailure) {
  if (text.includes(NOISE_HOST) && /CORS policy/i.test(text)) return true
  if (sawNoiseHostRequestFailure && /Failed to load resource: net::ERR_FAILED/i.test(text)) return true
  return false
}

const ROUTES_TO_CHECK = [...SSG_PATHS, '/login']
// Default lowered from 5: parallel page hydrations compete for CPU in
// resource-constrained environments, which measurably affects hydration
// timing itself (the exact thing this sweep tests) — observed 27-74/130
// pass-rate swings across identical builds at concurrency 5. Override via
// env var for a faster (less rigorous) run.
const CONCURRENCY = Number(process.env.HYDRATION_SWEEP_CONCURRENCY) || 2

async function checkRoute(browser, path) {
  const page = await browser.newPage()
  const messages = []
  let pageError = null
  let sawNoiseHostRequestFailure = false

  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') messages.push({ type, text: msg.text() })
  })
  page.on('pageerror', (err) => { pageError = err.message })
  page.on('requestfailed', (req) => {
    if (req.url().includes(NOISE_HOST)) sawNoiseHostRequestFailure = true
  })

  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(300) // let React finish committing hydration/first render
  } catch (err) {
    await page.close()
    return { path, status: 'FAIL', reason: `navigation error: ${err.message}` }
  }

  await page.close()

  if (pageError) {
    return { path, status: 'FAIL', reason: `uncaught page error: ${pageError}` }
  }

  const consoleErrors = messages
    .filter(m => m.type === 'error')
    .filter(m => !isKnownEnvironmentNoise(m.text, sawNoiseHostRequestFailure))
  if (consoleErrors.length) {
    const mismatch = consoleErrors.find(m => HYDRATION_MISMATCH_PATTERNS.some(re => re.test(m.text)))
    const worst = mismatch || consoleErrors[0]
    const label = mismatch ? 'hydration mismatch' : 'console error'
    return { path, status: 'FAIL', reason: `${label}: ${worst.text.slice(0, 200)}` }
  }

  return { path, status: 'PASS', reason: '' }
}

async function main() {
  console.log(`Hydration sweep: ${ROUTES_TO_CHECK.length} routes against ${BASE_URL}\n`)

  const browser = await chromium.launch()
  const results = []

  let idx = 0
  async function worker() {
    while (idx < ROUTES_TO_CHECK.length) {
      const i = idx++
      const path = ROUTES_TO_CHECK[i]
      const result = await checkRoute(browser, path)
      results.push(result)
      console.log(`[${result.status}] ${path}${result.reason ? ' — ' + result.reason : ''}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  await browser.close()

  results.sort((a, b) => a.path.localeCompare(b.path))
  const failed = results.filter(r => r.status === 'FAIL')

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Total: ${results.length}  Passed: ${results.length - failed.length}  Failed: ${failed.length}`)
  console.log('='.repeat(60))

  if (failed.length) {
    console.log('\nFailed routes:')
    console.table(failed.map(r => ({ path: r.path, reason: r.reason })))
    process.exit(1)
  }

  console.log('\nAll routes hydrated cleanly.')
}

main().catch((err) => {
  console.error('Sweep crashed:', err)
  process.exit(1)
})
