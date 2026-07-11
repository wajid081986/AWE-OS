#!/usr/bin/env node
/**
 * ssg-build.js — Batch 0A SSG proof-of-concept build.
 *
 * Parallel to scripts/prerender.js — does NOT modify, call, or replace it.
 * Output goes to dist-ssg/ (a separate directory from dist/) so the
 * existing prerender.js output in dist/ is never touched.
 *
 * Pipeline:
 *   1. Bundle src/entry-server.jsx via Vite's SSR build (Node-executable ESM).
 *   2. Import the bundle, render each of the 3 SSG_ROUTES with real React
 *      output (ReactDOMServer.renderToString) + react-helmet-async head tags.
 *   3. Take the plain `vite build` output at dist/index.html as the HTML
 *      shell (must already exist — run `vite build` first) and inject the
 *      rendered head + body into a copy, written to dist-ssg/<route>/index.html.
 *
 * Usage: vite build && node scripts/ssg-build.js   (wired as "build:ssg-poc")
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { build } from 'vite'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const ROOT        = resolve(__dirname, '..')
const DIST        = resolve(ROOT, 'dist')
const SSR_OUT_DIR = resolve(ROOT, '.ssg-server')
const SSG_OUT_DIR = resolve(ROOT, 'dist-ssg')

// ── Guard: the client shell must already exist ───────────────────────────────
const shellPath = join(DIST, 'index.html')
if (!existsSync(shellPath)) {
  console.error('❌ dist/index.html not found. Run `vite build` before this script.')
  process.exit(1)
}
const shellHtml = readFileSync(shellPath, 'utf-8')

// ── 1. Bundle entry-server.jsx for Node via Vite's SSR build ────────────────
console.log('▶ Building SSR entry (src/entry-server.jsx)…')
if (existsSync(SSR_OUT_DIR)) rmSync(SSR_OUT_DIR, { recursive: true })

await build({
  root: ROOT,
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

// ── 2. Import the built bundle and render each route ────────────────────────
const entryUrl = pathToFileURL(join(SSR_OUT_DIR, 'entry-server.mjs')).href
const { SSG_ROUTES, renderRoute } = await import(entryUrl)

if (existsSync(SSG_OUT_DIR)) rmSync(SSG_OUT_DIR, { recursive: true })

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function injectHelmet(html, helmet) {
  if (!helmet) return html
  const headTags = [
    helmet.title?.toString(),
    helmet.meta?.toString(),
    helmet.link?.toString(),
    helmet.script?.toString(),
  ].filter(Boolean).join('\n    ')

  // The plain vite-build shell already ships a default <title>/<meta> block —
  // append the route-specific Helmet output right before </head> so it wins
  // (later tags with the same name are what the browser/crawler reads last,
  // but for a byte-accurate proof we prepend a marker comment for the diff).
  return html.replace('</head>', `    <!-- SSG_ROUTE_HEAD_START -->\n    ${headTags}\n    <!-- SSG_ROUTE_HEAD_END -->\n  </head>`)
}

function injectBody(html, bodyHtml) {
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${bodyHtml}</div>`
  )
}

console.log('▶ Rendering routes…')
const report = []

for (const { path, Page, outFile } of SSG_ROUTES) {
  const { html, helmet } = renderRoute(path, Page)

  let out = shellHtml
  out = injectHelmet(out, helmet)
  out = injectBody(out, html)

  const outPath = join(SSG_OUT_DIR, outFile)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, out, 'utf-8')

  report.push({
    path,
    outPath: outPath.replace(ROOT + '\\', '').replace(ROOT + '/', ''),
    bodyBytes: Buffer.byteLength(html, 'utf-8'),
    title: helmet?.title?.toString().match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? '(none)',
  })
}

console.log('\n✅ SSG proof-of-concept build complete. Output: dist-ssg/\n')
console.table(report)
