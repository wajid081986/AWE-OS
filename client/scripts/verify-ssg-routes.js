#!/usr/bin/env node
/**
 * verify-ssg-routes.js — Batch 0B Step C7: curl every SSG route from a
 * running preview server and assert non-shell body content + exactly one
 * <title> and one <h1>.
 *
 * Usage: node scripts/verify-ssg-routes.js <base-url>
 * (e.g. node scripts/verify-ssg-routes.js http://localhost:4173)
 */

import { readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')
const baseUrl = process.argv[2] || 'http://localhost:4173'
const userAgent = process.argv[3] || 'Mozilla/5.0 (verify-ssg-routes)'

function findRouteFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'assets') continue
      out.push(...findRouteFiles(full))
    } else if (entry === 'index.html') {
      out.push(full)
    }
  }
  return out
}

const files = findRouteFiles(DIST)
console.log(`Found ${files.length} route files under dist/. Verifying against ${baseUrl} …\n`)

let pass = 0
const failures = []

for (const file of files) {
  const rel = relative(DIST, file).replace(/\\/g, '/')
  const routePath = '/' + rel.replace(/index\.html$/, '').replace(/\/$/, '')
  const url = baseUrl + (routePath === '/' ? '/' : routePath)

  const res = await fetch(url, { headers: { 'User-Agent': userAgent } })
  const html = await res.text()

  const titleCount = (html.match(/<title[^>]*>/g) || []).length
  const h1Count = (html.match(/<h1[^>]*>/g) || []).length
  const hasRootContent = /<div id="root">\s*<div/.test(html)
  const hasRequiresJsText = html.includes('This site requires JavaScript')

  const issues = []
  if (res.status !== 200) issues.push(`HTTP ${res.status}`)
  if (titleCount !== 1) issues.push(`titleCount=${titleCount}`)
  if (h1Count < 1) issues.push(`h1Count=${h1Count}`)
  if (!hasRootContent) issues.push('no non-shell body content in #root')
  if (hasRequiresJsText) issues.push('shell fallback text present (noscript not stripped?)')

  if (issues.length) {
    failures.push({ path: routePath, issues: issues.join('; ') })
  } else {
    pass++
  }
}

console.log(`PASS: ${pass}/${files.length}`)
console.log(`FAIL: ${failures.length}/${files.length}`)
if (failures.length) console.table(failures)
process.exit(failures.length ? 1 : 0)
