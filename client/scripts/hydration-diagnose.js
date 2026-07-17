#!/usr/bin/env node
/**
 * hydration-diagnose.js — Batch 5.6b diagnostic tool.
 *
 * React minifies error messages in production builds, so a production
 * sweep only ever reports "Minified React error #422" with a link to a
 * decoder page, never the actual message or which component/element it
 * names. This script reproduces the exact hydration attempt against a
 * live Vite DEV server instead (unminified React, full warnings +
 * component stacks), by splicing the real prerendered #root markup from
 * a `dist/` build into the dev server's otherwise-empty shell before
 * main.jsx runs — same technique used ad hoc during Batch 5.6's original
 * investigation (docs/batches/batch-5.6-ssg-hydration.md).
 *
 * Why splicing is necessary: Vite's dev server always serves an empty
 * `<div id="root"></div>` (no SSG step runs in dev), so navigating there
 * directly would just be a normal clean client render — nothing to
 * hydrate, nothing to mismatch. This intercepts the top-level HTML
 * document response for the target route and replaces the empty root
 * with the real `dist/<route>/index.html` build's #root content, so the
 * dev bundle's `hydrateRoot` call has real prerendered markup to
 * reconcile against, exactly like production.
 *
 * Also sets window.__AWE_FORCE_HYDRATE__ (see main.jsx) so
 * isHydrationSafe()-excluded routes still attempt hydrateRoot here.
 *
 * Prerequisite: `npm run build` already run (dist/<route>/index.html
 * exists for ROUTE).
 *
 * Usage:
 *   node scripts/hydration-diagnose.js [--route=/tools/merge-pdf] [--dev-port=5173]
 */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_ROOT = path.resolve(__dirname, '..')

const arg = (name, def) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? def

const ROUTE    = arg('route', '/tools/merge-pdf')
const DEV_PORT = arg('dev-port', '5173')

// ── Extract the real #root inner HTML from the dist build ──────────────────
// Depth-aware (not a naive regex) — the page has many nested <div>s.
function extractRootInnerHtml(distIndexPath) {
  const html = readFileSync(distIndexPath, 'utf-8')
  const openTag = '<div id="root"'
  const startTagIdx = html.indexOf(openTag)
  if (startTagIdx === -1) throw new Error(`No <div id="root"...> found in ${distIndexPath}`)
  const contentStart = html.indexOf('>', startTagIdx) + 1

  const tagRe = /<div\b[^>]*>|<\/div>/g
  tagRe.lastIndex = contentStart
  let depth = 1
  let m
  while ((m = tagRe.exec(html))) {
    if (m[0] === '</div>') depth--
    else depth++
    if (depth === 0) {
      return html.slice(contentStart, m.index)
    }
  }
  throw new Error('Unbalanced <div> tags — could not find matching </div> for #root')
}

async function waitForDevServer(port, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/`)
      if (res.ok || res.status === 404) return
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 300))
  }
  throw new Error(`Vite dev server did not become ready on port ${port} within ${timeoutMs}ms`)
}

async function main() {
  const distIndexPath = path.join(CLIENT_ROOT, 'dist', ROUTE.replace(/^\//, ''), 'index.html')
  if (!existsSync(distIndexPath)) {
    throw new Error(`${distIndexPath} does not exist — run "npm run build" first.`)
  }
  const rootInnerHtml = extractRootInnerHtml(distIndexPath)
  console.log(`Extracted #root markup for ${ROUTE}: ${rootInnerHtml.length} chars\n`)

  console.log(`Starting Vite dev server on port ${DEV_PORT}...`)
  const vite = spawn(
    'npx',
    ['vite', '--port', DEV_PORT, '--strictPort'],
    { cwd: CLIENT_ROOT, stdio: 'pipe', shell: true }
  )
  let viteOutput = ''
  vite.stdout.on('data', d => { viteOutput += d.toString() })
  vite.stderr.on('data', d => { viteOutput += d.toString() })

  try {
    await waitForDevServer(DEV_PORT)
    console.log('Dev server ready.\n')

    const browser = await chromium.launch()
    const context = await browser.newContext()
    await context.addInitScript(() => { window.__AWE_FORCE_HYDRATE__ = true })

    // Splice the real prerendered markup into the dev server's document
    // response for the target route, before any script runs.
    await context.route('**/*', async (route) => {
      const request = route.request()
      if (request.resourceType() === 'document') {
        const response = await route.fetch()
        let body = await response.text()
        if (body.includes('<div id="root"></div>')) {
          body = body.replace('<div id="root"></div>', `<div id="root">${rootInnerHtml}</div>`)
        } else {
          console.warn('WARNING: dev index.html did not contain the expected empty <div id="root"></div> — splice skipped, check Vite template drift.')
        }
        await route.fulfill({ response, body })
      } else {
        await route.continue()
      }
    })

    const page = await context.newPage()
    const allMessages = []
    page.on('console', (msg) => {
      allMessages.push({ type: msg.type(), text: msg.text() })
    })
    page.on('pageerror', (err) => {
      allMessages.push({ type: 'pageerror', text: err.message, stack: err.stack })
    })

    console.log(`Navigating to http://localhost:${DEV_PORT}${ROUTE} (spliced, force-hydrate on, DEV build — unminified)...\n`)
    await page.goto(`http://localhost:${DEV_PORT}${ROUTE}`, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1000) // dev builds are slower to settle than prod

    console.log(`${'='.repeat(70)}`)
    console.log(`Captured ${allMessages.length} console/page messages:`)
    console.log('='.repeat(70))
    allMessages.forEach((m, i) => {
      console.log(`\n[${i}] type=${m.type}`)
      console.log(m.text)
      if (m.stack) console.log(m.stack)
    })

    await browser.close()
  } finally {
    // vite.kill() alone doesn't reach the real vite.js process on Windows —
    // spawn(..., {shell:true}) makes `vite` a grandchild of a cmd.exe
    // wrapper, and SIGTERM only hits the immediate child. taskkill /t
    // kills the whole process tree; plain kill() covers non-Windows.
    if (process.platform === 'win32' && vite.pid) {
      spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f'], { stdio: 'ignore' })
    } else {
      vite.kill()
    }
    if (process.env.HYDRATION_DIAGNOSE_DEBUG) {
      console.log('\n--- Vite process output ---\n' + viteOutput)
    }
  }
}

main().catch((err) => {
  console.error('Diagnostic crashed:', err)
  process.exit(1)
})
