#!/usr/bin/env node
/**
 * ssg-build.js — Batch 0B SSG build (all public routes).
 *
 * Parallel to scripts/prerender.js — does NOT modify, call, or replace it.
 * That script remains runnable as `npm run build:prerender-legacy`.
 *
 * Pipeline:
 *   1. Bundle src/entry-server.jsx via Vite's SSR build (Node-executable ESM).
 *   2. Import the bundle, render every route in buildRoutes() with real React
 *      output (ReactDOMServer.renderToString) + react-helmet-async head tags.
 *   3. Take the plain `vite build` output at dist/index.html as the HTML
 *      shell (must already exist — run `vite build` first). For each route,
 *      REPLACE (not append) the shell's default per-route SEO tags with the
 *      real Helmet output, drop the shell's <noscript> fallback (redundant
 *      now that #root carries real static content), and drop the FOUC-hiding
 *      CSS rules for #root (real content should be visible immediately —
 *      those rules existed to hide prerender.js's string-templated content
 *      before hydration; there's nothing to hide here).
 *
 * Output directory defaults to dist/ (the served artifact). Override with
 * SSG_OUT_DIR=<path> for a dry run into a scratch directory before trusting
 * it as the real build output.
 *
 * Usage: vite build && node scripts/ssg-build.js   (wired as "build")
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { build } from 'vite'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const ROOT        = resolve(__dirname, '..')
const DIST        = resolve(ROOT, 'dist')
const SSR_OUT_DIR = resolve(ROOT, '.ssg-server')
const OUT_DIR     = resolve(ROOT, process.env.SSG_OUT_DIR || 'dist')

// ── Guard: the client shell must already exist ───────────────────────────────
const shellPath = join(DIST, 'index.html')
if (!existsSync(shellPath)) {
  console.error('❌ dist/index.html not found. Run `vite build` before this script.')
  process.exit(1)
}
const shellHtmlSource = readFileSync(shellPath, 'utf-8')

// ── 1. Bundle entry-server.jsx for Node via Vite's SSR build ────────────────
console.log('▶ Building SSR entry (src/entry-server.jsx)…')
if (existsSync(SSR_OUT_DIR)) rmSync(SSR_OUT_DIR, { recursive: true })

await build({
  root: ROOT,
  // pdfjs-dist's standard build touches `new DOMMatrix()` at module scope,
  // which only exists in browsers. Its own package ships a `legacy/` build
  // specifically for Node — redirect to it for the SSR bundle only; the
  // real browser bundle (plain `vite build`, used by main.jsx) is untouched.
  resolve: {
    alias: [
      { find: /^pdfjs-dist$/, replacement: resolve(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs') },
    ],
  },
  build: {
    ssr: 'src/entry-server.jsx',
    outDir: '.ssg-server',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'entry-server.mjs' },
    },
  },
  logLevel: 'warn',
})

// ── 2. Import the built bundle ───────────────────────────────────────────────
const entryUrl = pathToFileURL(join(SSR_OUT_DIR, 'entry-server.mjs')).href
const { buildRoutes, renderRoute } = await import(entryUrl)
const routes = buildRoutes()
console.log(`▶ Rendering ${routes.length} routes…`)

// ── Head/body transform helpers ──────────────────────────────────────────────

// Default per-route SEO tags shipped in the plain vite-build shell — these
// get REPLACED by real Helmet output per route (not appended alongside).
// Only strip a tag kind when Helmet actually supplies a replacement for it —
// two routes (CompareToolPage, FaqCategoryPage) only set JSON-LD via Helmet
// and have no <title>/description of their own (pre-existing content gap,
// backlogged separately); blindly stripping would leave those pages with an
// empty <title>, which is worse than the site-wide default they'd otherwise
// inherit.
function stripDefaultSeoTags(html, helmet) {
  const helmetHasTitle = /<title[^>]*>\s*[^\s<]/.test(helmet?.title?.toString() || '')
  const helmetHasMeta  = (helmet?.meta?.toString() || '').length > 0

  if (helmetHasTitle) {
    html = html.replace(/\s*<title>[^<]*<\/title>/i, '')
  }
  if (helmetHasMeta) {
    html = html.replace(
      /\s*<meta\s+(?:name|property)="(?:description|keywords|robots|author|og:[a-z:]+|twitter:[a-z:]+|google-site-verification)"[^>]*\/?>/gi,
      ''
    )
  }
  return html
}

// The FOUC-hiding rules exist to hide prerender.js's string-templated
// #root content until React mounts. Real SSG content has nothing to hide.
function stripFoucHidingRules(html) {
  html = html.replace(/\s*#root\s*>\s*div\[aria-hidden="true"\]\s*\{\s*display:\s*none\s*!important;\s*\}/i, '')
  html = html.replace(/\s*#root:not\(\.mounted\)\s*\{\s*visibility:\s*hidden;\s*\}/i, '')
  return html
}

// Redundant once #root carries real content — was the no-JS fallback body.
function stripNoscript(html) {
  return html.replace(/\s*<noscript>[\s\S]*?<\/noscript>/i, '')
}

function injectHelmet(html, helmet, noindex) {
  if (!helmet) return html
  // react-helmet-async always renders a <title> element even when no
  // <Helmet><title> was set anywhere in the tree — drop it when empty so it
  // doesn't sit alongside the shell's (kept-as-fallback) default title.
  const titleStr = helmet.title?.toString() || ''
  const hasRealTitle = /<title[^>]*>\s*[^\s<]/.test(titleStr)

  const headTags = [
    hasRealTitle ? titleStr : null,
    helmet.meta?.toString(),
    helmet.link?.toString(),
    helmet.script?.toString(),
  ].filter(Boolean).join('\n    ')

  const robotsOverride = noindex ? '\n    <meta name="robots" content="noindex, follow">' : ''

  return html.replace('</head>', `    ${headTags}${robotsOverride}\n  </head>`)
}

function injectBody(html, bodyHtml) {
  return html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)
}

// ── 3. Render + assemble each route ──────────────────────────────────────────
let shellHtml = stripFoucHidingRules(shellHtmlSource)
shellHtml = stripNoscript(shellHtml)

if (existsSync(OUT_DIR) && OUT_DIR !== DIST) rmSync(OUT_DIR, { recursive: true })

const report = []
const noHelmetTitle = []
for (const route of routes) {
  const { html, helmet } = renderRoute(route)

  const shellBase = stripDefaultSeoTags(shellHtml, helmet)
  let out = injectHelmet(shellBase, helmet, route.noindex)
  out = injectBody(out, html)

  if (!/<title[^>]*>\s*[^\s<]/.test(helmet?.title?.toString() || '')) {
    noHelmetTitle.push(route.path)
  }

  const outPath = join(OUT_DIR, route.outFile)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, out, 'utf-8')

  report.push({
    path: route.path,
    bodyBytes: Buffer.byteLength(html, 'utf-8'),
    titleTagCount: (out.match(/<title[^>]*>/g) || []).length,
    h1Count: (out.match(/<h1[^>]*>/g) || []).length,
    noindex: !!route.noindex,
  })
}

console.log(`\n✅ SSG build complete. ${routes.length} routes written to ${OUT_DIR.replace(ROOT + '\\', '').replace(ROOT + '/', '') || '.'}/\n`)

const badTitle = report.filter(r => r.titleTagCount !== 1)
const badH1    = report.filter(r => r.h1Count < 1)
console.log(`Routes with title-tag count !== 1: ${badTitle.length}`)
console.log(`Routes with zero <h1>: ${badH1.length}`)
console.log(`Routes with no page-specific <title> (fell back to site default — pre-existing content gap): ${noHelmetTitle.length}`)
if (badTitle.length) console.table(badTitle.slice(0, 10))
if (badH1.length) console.table(badH1.slice(0, 10))
if (noHelmetTitle.length) console.log(noHelmetTitle.join(', '))
