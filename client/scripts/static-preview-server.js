#!/usr/bin/env node
/**
 * static-preview-server.js — serves client/dist the way Vercel actually
 * does (see vercel.json): exact file match first, then <path>/index.html
 * for directory-style SSG routes (e.g. /about -> about/index.html), then
 * the SPA-fallback index.html for anything else (vercel.json's catch-all
 * rewrite).
 *
 * `vite preview`'s default (sirv-based) server does NOT do the middle
 * step: for any extensionless nested path without a trailing slash it
 * falls straight through to the SPA shell (index.html — the homepage's
 * SSG'd content), not the real page. Confirmed via curl: `/about` and
 * `dist/index.html` are byte-identical through vite preview, while
 * `/about/` (trailing slash) correctly matches `dist/about/index.html`.
 * That silently fed hydration-sweep.js the WRONG page's markup for every
 * nested SSG route, producing hydration-mismatch failures that were a
 * test-harness bug, not an app bug — Batch 5.5b already verified Vercel
 * itself resolves these paths correctly in production. See
 * docs/batches/batch-5.6-ssg-hydration.md.
 *
 * No new dependency: built on Node's http/fs only.
 *
 * Usage: node scripts/static-preview-server.js [--port=4173] [--dir=dist]
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const PORT = Number(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || 4173)
const DIST = resolve(process.argv.find(a => a.startsWith('--dir='))?.split('=')[1] || 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

async function fileExists(path) {
  try {
    const s = await stat(path)
    return s.isFile()
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    const candidates = [
      join(DIST, urlPath),               // exact static file (assets, etc.)
      join(DIST, urlPath, 'index.html'), // directory-index — the fix
    ]
    let filePath = null
    for (const candidate of candidates) {
      if (await fileExists(candidate)) {
        filePath = candidate
        break
      }
    }
    if (!filePath) filePath = join(DIST, 'index.html') // vercel.json's catch-all rewrite

    const body = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' })
    res.end(body)
  } catch (err) {
    res.writeHead(500)
    res.end(String(err))
  }
})

server.listen(PORT, () => {
  console.log(`Static preview (Vercel-accurate routing) serving ${DIST} on http://localhost:${PORT}`)
})
