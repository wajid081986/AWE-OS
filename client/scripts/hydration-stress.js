#!/usr/bin/env node
/**
 * hydration-stress.js — Batch 5.6b bisection tool.
 *
 * Repeatedly hydrates ONE route under CPU throttling to produce a
 * reliable, non-flaky pass/fail signal for isolating the #421/#422
 * hydration race (docs/batches/batch-5.6b-hydration-race.md), instead of
 * relying on the full-site sweep's CPU-contention-sensitive numbers (5.6
 * documented 27-74/130 swings from ambient sandbox contention alone).
 *
 * Each run gets a fresh, isolated browser context (own localStorage/
 * sessionStorage) so AuthContext's token check starts anonymous every
 * time, matching a real first-time visitor — the exact condition the
 * lead suspect (AuthContext's mount-time setIsLoading(false)) needs to
 * fire.
 *
 * Prerequisite: scripts/static-preview-server.js already running and
 * reachable at BASE_URL — do NOT use `vite preview` (see
 * hydration-sweep.js's header comment for why).
 *
 * Usage:
 *   node scripts/hydration-stress.js [--route=/tools/merge-pdf] [--runs=10]
 *     [--throttle=4] [--net-latency=400] [--net-downlink=50] [--decoys=4]
 *     [--base-url=http://localhost:4173]
 *
 * --throttle: CDP Emulation.setCPUThrottlingRate multiplier. Uniform — it
 *   slows the mount effect and the chunk-resolution path by the same
 *   factor, so relative event order is preserved. Empirically (batch
 *   5.6b baseline) this does NOT reproduce the race even at 20x.
 * --net-latency / --net-downlink: CDP Network.emulateNetworkConditions
 *   (ms round-trip latency, KB/s download throughput). Also empirically
 *   did not reproduce the race (tried mild through "breaks navigation"
 *   aggressive) — see batch-5.6b-hydration-race.md's implementation log.
 * --decoys: opens N additional pages navigating to OTHER heavy tool
 *   routes in the SAME browser instance, concurrently with the target
 *   route's navigation — real host-CPU/process scheduling contention,
 *   not simulated uniform slowdown. This is what actually produced the
 *   race in batch 5.6's own determination sweeps (concurrency=5) and the
 *   batch-12 diagnostic (concurrency=1, still contending against the
 *   sweep's OTHER concurrently-running routes' downloads/parses at the
 *   OS/process level even at "concurrency=1" for the sweep's own pages).
 */

import { chromium } from 'playwright'

const arg = (name, def) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? def

const BASE_URL      = arg('base-url', process.env.HYDRATION_SWEEP_BASE_URL || 'http://localhost:4173')
const ROUTE         = arg('route', '/tools/merge-pdf')
const RUNS          = Number(arg('runs', 10))
const THROTTLE      = Number(arg('throttle', 1))
const NET_LATENCY   = Number(arg('net-latency', 0))   // ms
const NET_DOWNLINK  = Number(arg('net-downlink', 0))  // KB/s, 0 = unthrottled
const DECOYS        = Number(arg('decoys', 0))

// Other heavy /tools/:slug routes — same "large lazy chunk" profile as
// the target, cycled through if DECOYS > length.
const DECOY_ROUTES = [
  '/tools/split-pdf',
  '/tools/compress-pdf',
  '/tools/pdf-editor',
  '/tools/word-to-pdf',
  '/tools/excel-to-pdf',
  '/tools/image-compressor',
  '/tools/organize-pdf',
  '/tools/watermark-pdf',
]

// Sets the test-only override main.jsx reads (see main.jsx's comment
// above `canHydrate`) so isHydrationSafe()-excluded routes (every
// /tools/:slug page, /blog) actually attempt hydrateRoot instead of
// silently falling back to the inert createRoot path — which is what
// they do by default, and why an earlier calibration pass on this same
// harness produced 10/10 clean runs at every throttle profile: nothing
// was ever hydrating in the first place.
async function forceHydrate(context) {
  await context.addInitScript(() => { window.__AWE_FORCE_HYDRATE__ = true })
}

async function openDecoy(browser, route) {
  const context = await browser.newContext()
  await forceHydrate(context)
  const page = await context.newPage()
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 30000 })
  } catch {
    // Decoy pass/fail is irrelevant — it only exists to consume CPU
    // concurrently with the target route's navigation.
  }
  return context
}

const HYDRATION_MISMATCH_PATTERNS = [
  /hydration failed/i,
  /did not match/i,
  /server rendered html/i,
  /server-rendered html/i,
  /text content does not match/i,
  /hydrating but/i,
  /expected server html to contain/i,
  /minified react error #41[0-9]/i, // #418, #419, #421, #422, #423, #425 — hydration-mismatch family
]

// Same environment-noise exclusion as hydration-sweep.js — /tools/:slug
// pages call useTrackToolView -> GET /api/tools against the live prod API,
// which legitimately fails CORS from this sandboxed origin. Not a
// hydration bug; see hydration-sweep.js's header comment for the full
// determination this was based on.
const NOISE_HOST = 'awe-os.onrender.com'
function isKnownEnvironmentNoise(text, sawNoiseHostRequestFailure) {
  if (text.includes(NOISE_HOST) && /CORS policy/i.test(text)) return true
  if (sawNoiseHostRequestFailure && /Failed to load resource: net::ERR_FAILED/i.test(text)) return true
  return false
}

async function runOnce(browser, i) {
  const context = await browser.newContext()
  await forceHydrate(context)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  if (THROTTLE > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  }
  if (NET_LATENCY > 0 || NET_DOWNLINK > 0) {
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: NET_LATENCY,
      downloadThroughput: NET_DOWNLINK > 0 ? NET_DOWNLINK * 1024 : -1,
      uploadThroughput: NET_DOWNLINK > 0 ? NET_DOWNLINK * 1024 : -1,
    })
  }

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

  // Kick off decoys WITHOUT awaiting them, so their navigation genuinely
  // overlaps the target's — real concurrent contention, not sequential
  // load. Cleaned up after the target measurement is captured.
  const decoyPromises = Array.from({ length: DECOYS }, (_, idx) =>
    openDecoy(browser, DECOY_ROUTES[idx % DECOY_ROUTES.length])
  )

  let result
  try {
    await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(300) // let React finish committing hydration/first render

    if (pageError) {
      result = { run: i, status: 'FAIL', reason: `uncaught page error: ${pageError}` }
    } else {
      const consoleErrors = messages
        .filter(m => m.type === 'error')
        .filter(m => !isKnownEnvironmentNoise(m.text, sawNoiseHostRequestFailure))
      if (consoleErrors.length) {
        const mismatch = consoleErrors.find(m => HYDRATION_MISMATCH_PATTERNS.some(re => re.test(m.text)))
        const worst = mismatch || consoleErrors[0]
        const label = mismatch ? 'hydration mismatch' : 'console error'
        result = { run: i, status: 'FAIL', reason: `${label}: ${worst.text.slice(0, 200)}` }
      } else {
        result = { run: i, status: 'PASS', reason: '' }
      }
    }
  } catch (err) {
    result = { run: i, status: 'FAIL', reason: `navigation error: ${err.message}` }
  }

  const decoyContexts = await Promise.all(decoyPromises)
  await Promise.all(decoyContexts.map(c => c.close()))
  await context.close()
  return result
}

async function main() {
  const netDesc = (NET_LATENCY > 0 || NET_DOWNLINK > 0)
    ? `, network ${NET_LATENCY}ms latency / ${NET_DOWNLINK}KB/s`
    : ''
  const decoyDesc = DECOYS > 0 ? `, ${DECOYS} concurrent decoy page(s)` : ''
  console.log(`Hydration stress: ${RUNS} runs of ${ROUTE} @ ${THROTTLE}x CPU throttle${netDesc}${decoyDesc} against ${BASE_URL}\n`)

  const browser = await chromium.launch()
  const results = []

  // Sequential, not parallel — the signal we want comes from CDP
  // throttling, not from ambient concurrency contention (that's exactly
  // the noise source this harness exists to avoid).
  for (let i = 1; i <= RUNS; i++) {
    const result = await runOnce(browser, i)
    results.push(result)
    console.log(`[${result.status}] run ${i}${result.reason ? ' — ' + result.reason : ''}`)
  }

  await browser.close()

  const failed = results.filter(r => r.status === 'FAIL')
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Route: ${ROUTE}`)
  console.log(`Total: ${results.length}  Passed: ${results.length - failed.length}  Failed: ${failed.length}`)
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('Stress harness crashed:', err)
  process.exit(1)
})
