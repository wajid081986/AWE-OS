/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         AWE-OS AUDIT ENGINE v2.0                                ║
 * ║         Complete SEO + AdSense + EEAT + Security + Performance  ║
 * ║         Run: node audit-awe-os-v2.js                            ║
 * ║         Run with HTML report: node audit-awe-os-v2.js --html    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * MODULES:
 *  1.  HTTP Status & Redirects
 *  2.  Meta Tags (Title, Description, Robots, Canonical)
 *  3.  Open Graph & Twitter Cards
 *  4.  Structured Data / Schema.org
 *  5.  Content Quality (Word count, Headings, AI detection)
 *  6.  Internal Linking & Orphan Detection
 *  7.  External Link Verification
 *  8.  Image Optimization
 *  9.  Security Headers
 * 10.  JavaScript SEO (SSR/SSG detection)
 * 11.  Accessibility (ARIA, Labels, Heading hierarchy)
 * 12.  Duplicate Content Detection
 * 13.  EEAT Signals
 * 14.  AdSense Readiness (Enhanced)
 * 15.  Sitemap & robots.txt Validation
 * 16.  Performance (TTFB, Response time)
 * 17.  HTML Report Generator
 */

const https   = require("https");
const http    = require("http");
const fs      = require("fs");
const path    = require("path");
const { URL } = require("url");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE    = "https://www.awe-os.com";
const TIMEOUT = 15000;
const GENERATE_HTML = process.argv.includes("--html");
const BATCH   = 4;

const PAGES = [
  "/", "/about", "/contact", "/privacy-policy", "/terms",
  "/disclaimer", "/editorial-policy", "/advertising-policy",
  "/blog", "/tools",
  "/tools/merge-pdf", "/tools/compress-pdf", "/tools/pdf-to-word",
  "/tools/word-to-pdf", "/tools/gst-calculator", "/tools/sip-calculator",
  "/tools/tax-calculator", "/tools/loan-calculator", "/tools/qr-code-generator",
  "/tools/invoice-generator", "/tools/resume-builder", "/tools/ai-content-writer",
  "/tools/bmi-calculator", "/tools/age-calculator", "/tools/currency-converter",
  "/tools/image-compressor", "/tools/word-counter", "/tools/password-generator",
  "/tools/ppf-calculator", "/tools/fd-calculator",
  "/blog/how-to-create-a-budget-that-works-for-you-in-india",
  "/blog/merge-pdf-files-for-bank-documents-india",
  "/blog/gst-calculator-india-2026-complete-guide",
  "/blog/sip-calculator-mutual-fund-returns-india",
  "/blog/free-ats-resume-builder-get-past-ats-systems",
  "/blog/bmi-calculator-for-indians-icmr-vs-who",
  "/blog/new-vs-old-tax-regime-fy-2025-26",
  "/blog/10-free-pdf-tools-you-need-in-2026",
  "/sitemap.xml", "/robots.txt",
];

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  reset:"\x1b[0m", bold:"\x1b[1m", red:"\x1b[31m", green:"\x1b[32m",
  yellow:"\x1b[33m", cyan:"\x1b[36m", gray:"\x1b[90m", magenta:"\x1b[35m",
  blue:"\x1b[34m", white:"\x1b[97m",
};
const ok   = (s) => `${C.green}✅ ${s}${C.reset}`;
const warn = (s) => `${C.yellow}⚠️  ${s}${C.reset}`;
const fail = (s) => `${C.red}❌ ${s}${C.reset}`;
const info = (s) => `${C.cyan}ℹ️  ${s}${C.reset}`;
const bold = (s) => `${C.bold}${s}${C.reset}`;
const head = (s) => `\n${C.bold}${C.cyan}━━━ ${s} ━━━${C.reset}`;

// ─── HTTP FETCH WITH HEADERS ──────────────────────────────────────────────────
function fetchPage(url, followRedirects = true, maxRedirects = 5) {
  return new Promise((resolve) => {
    const start  = Date.now();
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ url, status: 0, error: "invalid url", responseTime: 0 }); }
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AWE-OS-AuditEngine/2.0)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      timeout: TIMEOUT,
    }, (res) => {
      const status   = res.statusCode;
      const location = res.headers["location"];
      const secHeaders = {
        hsts:          res.headers["strict-transport-security"] || null,
        csp:           res.headers["content-security-policy"] || null,
        xFrame:        res.headers["x-frame-options"] || null,
        xContentType:  res.headers["x-content-type-options"] || null,
        referrer:      res.headers["referrer-policy"] || null,
        permissions:   res.headers["permissions-policy"] || null,
      };

      if ([301,302,303,307,308].includes(status) && location && followRedirects && maxRedirects > 0) {
        const nextUrl = location.startsWith("http") ? location : new URL(location, url).href;
        fetchPage(nextUrl, true, maxRedirects - 1).then((r) => resolve({
          ...r, redirectedFrom: url, originalStatus: status,
          redirectChain: [url, ...(r.redirectChain || [])],
          secHeaders: r.secHeaders || secHeaders,
        }));
        res.destroy(); return;
      }

      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; if (body.length > 300000) res.destroy(); });
      res.on("end", () => resolve({ url, status, contentType: res.headers["content-type"] || "",
        body, responseTime: Date.now() - start, headers: res.headers, secHeaders, redirectChain: [] }));
      res.on("error", () => resolve({ url, status: 0, error: "stream error", responseTime: Date.now() - start }));
    });

    req.on("timeout", () => { req.destroy(); resolve({ url, status: 0, error: "timeout", responseTime: TIMEOUT }); });
    req.on("error", (e) => resolve({ url, status: 0, error: e.message, responseTime: Date.now() - start }));
    req.end();
  });
}

// Quick HEAD check for external links
function checkUrl(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ url, status: 0 }); }
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request({ hostname: parsed.hostname, path: parsed.pathname + parsed.search,
      method: "HEAD", headers: { "User-Agent": "AWE-OS-LinkChecker/2.0" }, timeout: 8000 },
      (res) => { res.destroy(); resolve({ url, status: res.statusCode, responseTime: Date.now() - start }); });
    req.on("timeout", () => { req.destroy(); resolve({ url, status: 0, error: "timeout" }); });
    req.on("error", () => resolve({ url, status: 0, error: "error" }));
    req.end();
  });
}

// ─── MODULE 1: HTML META EXTRACTOR ───────────────────────────────────────────
function extractMeta(html, url) {
  const get = (p) => { const m = html.match(p); return m ? m[1]?.trim() : null; };
  const getAll = (p) => [...html.matchAll(p)].map(m => m[1]?.trim()).filter(Boolean);

  // Basic meta
  const title       = get(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const description = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,320})["']/i)
                   || get(/<meta[^>]+content=["']([^"']{0,320})["'][^>]+name=["']description["']/i);
  const robots      = get(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
                   || get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  const canonical   = get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);

  // OG tags
  const ogTitle    = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc     = get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogImage    = get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const ogType     = get(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i);
  const ogUrl      = get(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);

  // Twitter cards
  const twCard     = get(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i);
  const twTitle    = get(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  const twImage    = get(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  // Headings
  const h1Match = html.match(/<h1[^>]*>([\s\S]{1,300}?)<\/h1>/i);
  const h1      = h1Match ? h1Match[1].replace(/<[^>]+>/g,"").trim().slice(0,150) : null;
  const h2s     = [...html.matchAll(/<h2[^>]*>([\s\S]{1,200}?)<\/h2>/gi)]
                    .map(m => m[1].replace(/<[^>]+>/g,"").trim()).filter(Boolean);
  const h3s     = [...html.matchAll(/<h3[^>]*>([\s\S]{1,200}?)<\/h3>/gi)]
                    .map(m => m[1].replace(/<[^>]+>/g,"").trim()).filter(Boolean);

  // Images
  const imgTags     = [...html.matchAll(/<img([^>]+)>/gi)].map(m => m[1]);
  const imgCount    = imgTags.length;
  const imgNoAlt    = imgTags.filter(a => !/\balt=/i.test(a)).length;
  const imgNoWH     = imgTags.filter(a => !/\bwidth=/i.test(a) || !/\bheight=/i.test(a)).length;
  const imgNoLazy   = imgTags.filter(a => !/loading=["']lazy["']/i.test(a)).length;
  const imgWebP     = imgTags.filter(a => /\.webp/i.test(a)).length;

  // Content text
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi,"")
    .replace(/<style[\s\S]*?<\/style>/gi,"")
    .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const wordCount   = textOnly.split(/\s+/).filter(w => w.length > 2).length;

  // Sentence/AI-risk stats use prose only — nav menus, breadcrumbs, and table
  // cells have no terminal punctuation, so left in they merge into single fake
  // "sentences" that skew avgSentLen/lexDiversity and false-trigger AI_CONTENT_RISK.
  const proseOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi,"")
    .replace(/<style[\s\S]*?<\/style>/gi,"")
    .replace(/<nav[\s\S]*?<\/nav>/gi,"")
    .replace(/<header[\s\S]*?<\/header>/gi,"")
    .replace(/<footer[\s\S]*?<\/footer>/gi,"")
    .replace(/<table[\s\S]*?<\/table>/gi,"")
    .replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const proseWordCount = proseOnly.split(/\s+/).filter(w => w.length > 2).length;
  const sentences   = proseOnly.split(/[.!?]+/).filter(s => s.trim().length > 10);

  // AI content signals (heuristic)
  const avgSentLen  = sentences.length ? sentences.reduce((a,s) => a + s.split(/\s+/).length, 0) / sentences.length : 0;
  const uniqueWords = new Set(proseOnly.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const lexDiversity = proseWordCount > 0 ? (uniqueWords.size / proseWordCount) : 0;
  const aiRisk = avgSentLen > 18 && lexDiversity < 0.4 ? "HIGH" : avgSentLen > 15 && lexDiversity < 0.5 ? "MEDIUM" : "LOW";

  // Internal & external links
  const allLinks     = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => m[1]);
  const internalLinks = allLinks.filter(l => l.startsWith("/") || l.includes(BASE));
  const externalLinks = allLinks.filter(l => l.startsWith("http") && !l.includes("awe-os.com"));

  // Schema
  const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => { try { return JSON.parse(m[1]); } catch { return null; }}).filter(Boolean);
  const schemaTypes = schemas.map(s => s["@type"] || (Array.isArray(s["@graph"]) ? s["@graph"].map(g => g["@type"]).join(",") : "Unknown")).flat();

  // EEAT signals
  const hasAuthor     = /author|byline|written by/i.test(html);
  const hasAuthorBio  = /author-bio|author_bio|about-author/i.test(html);
  const hasDate       = /<time|datePublished|dateModified|published|updated/i.test(html);
  const hasSources    = /\[?\d+\]|<cite|<blockquote|source:|reference/i.test(html);
  const hasEditPolicy = /editorial.policy|fact.check|review.process/i.test(html);

  // Accessibility
  const buttons       = [...html.matchAll(/<button([^>]*)>/gi)].map(m => m[1]);
  const buttonsNoLabel = buttons.filter(b => !/aria-label|aria-labelledby/i.test(b) && !/<\/button>/i.test(b)).length;
  const inputs        = [...html.matchAll(/<input([^>]*)>/gi)].map(m => m[1]);
  const inputsNoLabel = inputs.filter(i => !/aria-label|id=/i.test(i) && !/type=["']hidden["']/i.test(i)).length;
  const hasSkipLink   = /skip.to.main|skip-to-content|skip-nav/i.test(html);
  const hasLangAttr   = /<html[^>]+lang=/i.test(html);

  // JS SEO
  const hasSSR        = /<h1|<p |<article|<main/i.test(html);
  const isEmptyShell  = /<div id=["']root["']\s*><\/div>/i.test(html);
  const hasPrerender  = /prerender|__PRERENDER|window\.__PRELOADED/i.test(html);
  const hasHydration  = /hydrateRoot|ReactDOM\.hydrate|nuxt-hydration/i.test(html);

  // AdSense specific
  const hasCookieNotice = /cookie|gdpr|consent/i.test(html);
  const hasAffilDisclosure = /affiliate|sponsored|disclosure|compensation/i.test(html);
  const hasGA       = /gtag|google-analytics|G-[A-Z0-9]+/i.test(html);
  const hasAdsense  = /adsbygoogle|googlesyndication|pagead2/i.test(html);
  const footerLinks = [...html.matchAll(/<footer[\s\S]*?<\/footer>/gi)].map(m => m[0]);
  const hasFooterNav = footerLinks.length > 0 && /href=/i.test(footerLinks[0] || "");

  // Duplicate detection data
  const normalizedTitle = title?.toLowerCase().trim() || "";
  const normalizedDesc  = description?.toLowerCase().trim() || "";

  return {
    title, titleLen: title?.length || 0,
    description, descLen: description?.length || 0,
    robots, canonical,
    ogTitle, ogDesc, ogImage, ogType, ogUrl,
    twCard, twTitle, twImage,
    h1, h2s, h3s,
    imgCount, imgNoAlt, imgNoWH, imgNoLazy, imgWebP,
    wordCount, sentences: sentences.length, avgSentLen, lexDiversity, aiRisk,
    internalLinks, externalLinks,
    schemas, schemaTypes,
    hasNoindex: /noindex/i.test(robots || ""),
    hasGA, hasAdsense,
    hasAuthor, hasAuthorBio, hasDate, hasSources, hasEditPolicy,
    buttonsNoLabel, inputsNoLabel, hasSkipLink, hasLangAttr,
    hasSSR, isEmptyShell, hasPrerender, hasHydration,
    hasCookieNotice, hasAffilDisclosure, hasFooterNav,
    normalizedTitle, normalizedDesc,
  };
}

// ─── MODULE 2: SINGLE PAGE AUDIT ─────────────────────────────────────────────
async function auditPage(pagePath) {
  const url    = BASE + pagePath;
  const result = await fetchPage(url);
  const issues = [];
  const notes  = [];
  const scores = { seo: 0, content: 0, technical: 0, accessibility: 0, eeat: 0 };

  if (result.error || result.status === 0) {
    return { path: pagePath, url, status: 0, error: result.error, issues: ["FETCH_ERROR"], notes: [], meta: {}, scores };
  }

  const { status, body, responseTime, redirectChain, secHeaders } = result;
  const isHtml = (result.contentType || "").includes("text/html");
  const isSpecial = pagePath === "/sitemap.xml" || pagePath === "/robots.txt";

  // Status
  if (status >= 500) issues.push(`SERVER_ERROR_${status}`);
  else if (status === 404) issues.push("NOT_FOUND");
  else if (status >= 400) issues.push(`CLIENT_ERROR_${status}`);
  else if (status === 200) scores.technical += 20;

  // Redirects
  if (redirectChain.length > 2) issues.push(`REDIRECT_CHAIN_${redirectChain.length}_HOPS`);
  else if (redirectChain.length > 1) notes.push(`REDIRECT_CHAIN (${redirectChain.length} hops)`);

  // Performance
  if (responseTime > 3000)      issues.push(`SLOW_TTFB_${responseTime}ms`);
  else if (responseTime > 1500) notes.push(`TTFB_${responseTime}ms`);
  else                           scores.technical += 10;

  // Security headers
  const secScore = [secHeaders?.hsts, secHeaders?.csp, secHeaders?.xFrame,
    secHeaders?.xContentType, secHeaders?.referrer].filter(Boolean).length;
  if (secScore < 3) notes.push(`SEC_HEADERS_${secScore}/5`);
  scores.technical += secScore * 4;

  if (isSpecial || !isHtml || !body) {
    return { path: pagePath, url, status, responseTime, issues, notes, meta: {}, secHeaders, scores, redirectChain };
  }

  const meta = extractMeta(body, url);

  // ── SEO ──
  if (!meta.title)             { issues.push("MISSING_TITLE"); }
  else if (meta.titleLen < 30) { issues.push(`TITLE_TOO_SHORT (${meta.titleLen})`); }
  else if (meta.titleLen > 65) { notes.push(`TITLE_TOO_LONG (${meta.titleLen})`); }
  else                          { scores.seo += 15; }

  if (!meta.description)           { issues.push("MISSING_META_DESC"); }
  else if (meta.descLen < 80)      { notes.push(`DESC_SHORT (${meta.descLen})`); }
  else if (meta.descLen > 160)     { notes.push(`DESC_LONG (${meta.descLen})`); }
  else                              { scores.seo += 10; }

  if (!meta.canonical)  { notes.push("NO_CANONICAL"); }
  else                  { scores.seo += 5; }

  if (meta.hasNoindex) { issues.push("NOINDEX_TAG"); }
  else                 { scores.seo += 5; }

  if (!meta.h1)        { issues.push("MISSING_H1"); }
  else                 { scores.seo += 10; }

  if (meta.h2s.length === 0) { notes.push("NO_H2_TAGS"); }
  else                        { scores.seo += 5; }

  // ── Open Graph ──
  if (!meta.ogTitle)  { notes.push("MISSING_OG_TITLE"); }
  else                { scores.seo += 3; }
  if (!meta.ogDesc)   { notes.push("MISSING_OG_DESC"); }
  else                { scores.seo += 2; }
  if (!meta.ogImage)  { notes.push("MISSING_OG_IMAGE"); }
  else                { scores.seo += 3; }
  if (!meta.twCard)   { notes.push("MISSING_TWITTER_CARD"); }
  else                { scores.seo += 2; }

  // ── Schema ──
  if (meta.schemaTypes.length === 0) { notes.push("NO_SCHEMA_MARKUP"); }
  else {
    scores.seo += 5;
    const wantedSchemas = ["WebSite","Organization","BreadcrumbList","FAQPage","Article","WebPage","SoftwareApplication"];
    const missing = wantedSchemas.filter(s => !meta.schemaTypes.some(t => t.includes(s)));
    if (missing.length > 4) notes.push(`SCHEMA_GAPS: ${missing.slice(0,3).join(",")}`);
  }

  // ── Content ──
  if (meta.wordCount < 100)      { issues.push(`THIN_CONTENT (${meta.wordCount}w)`); }
  else if (meta.wordCount < 300) { notes.push(`LOW_CONTENT (${meta.wordCount}w)`); scores.content += 5; }
  else if (meta.wordCount < 600) { scores.content += 10; }
  else                            { scores.content += 20; }

  if (meta.aiRisk === "HIGH")    { notes.push("AI_CONTENT_RISK_HIGH"); }
  else if (meta.aiRisk === "MEDIUM") { notes.push("AI_CONTENT_RISK_MED"); }
  else                            { scores.content += 5; }

  // ── Images ──
  if (meta.imgNoAlt > 0)   { notes.push(`${meta.imgNoAlt}_IMGS_NO_ALT`); }
  else if (meta.imgCount > 0) { scores.seo += 3; }
  if (meta.imgNoLazy > 3)  { notes.push(`${meta.imgNoLazy}_IMGS_NO_LAZY`); }
  if (meta.imgWebP > 0)    { scores.technical += 3; }

  // ── JS SEO ──
  if (meta.isEmptyShell) { issues.push("EMPTY_DIV_ROOT_SSR_FAIL"); }
  else if (meta.hasSSR)  { scores.technical += 10; }

  // ── Accessibility ──
  if (!meta.hasLangAttr)         { issues.push("MISSING_HTML_LANG"); }
  else                            { scores.accessibility += 15; }
  if (meta.buttonsNoLabel > 2)   { notes.push(`${meta.buttonsNoLabel}_BUTTONS_NO_ARIA`); }
  else                            { scores.accessibility += 10; }
  if (!meta.hasSkipLink)         { notes.push("NO_SKIP_NAV_LINK"); }
  else                            { scores.accessibility += 5; }

  // ── EEAT ──
  if (meta.hasAuthor)    { scores.eeat += 20; }
  else                   { notes.push("NO_AUTHOR_DETECTED"); }
  if (meta.hasDate)      { scores.eeat += 15; }
  else                   { notes.push("NO_DATE_DETECTED"); }
  if (meta.hasSources)   { scores.eeat += 10; }
  if (meta.hasAuthorBio) { scores.eeat += 15; }

  // ── AdSense specific ──
  if (!meta.hasCookieNotice) { notes.push("NO_COOKIE_NOTICE"); }
  if (!meta.hasFooterNav)    { notes.push("NO_FOOTER_NAV"); }

  return { path: pagePath, url, status, responseTime, issues, notes, meta, secHeaders, scores, redirectChain };
}

// ─── MODULE 3: DUPLICATE DETECTION ───────────────────────────────────────────
function detectDuplicates(results) {
  const titles = {};
  const descs  = {};
  const dups   = { titles: [], descs: [] };

  results.forEach(r => {
    if (!r.meta?.normalizedTitle) return;
    const t = r.meta.normalizedTitle;
    const d = r.meta.normalizedDesc;
    if (t) { if (!titles[t]) titles[t] = []; titles[t].push(r.path); }
    if (d) { if (!descs[d])  descs[d]  = []; descs[d].push(r.path); }
  });

  Object.entries(titles).forEach(([t, pages]) => {
    if (pages.length > 1) dups.titles.push({ value: t.slice(0,60), pages });
  });
  Object.entries(descs).forEach(([d, pages]) => {
    if (pages.length > 1) dups.descs.push({ value: d.slice(0,80), pages });
  });
  return dups;
}

// ─── MODULE 4: EXTERNAL LINK CHECKER ─────────────────────────────────────────
async function checkExternalLinks(results) {
  const allExt = new Set();
  results.forEach(r => (r.meta?.externalLinks || []).forEach(l => {
    try { const u = new URL(l); if (u.hostname !== "awe-os.com") allExt.add(l); } catch {}
  }));

  const toCheck = [...allExt].slice(0, 20); // limit to 20 to avoid slowdown
  const linkResults = [];
  for (const link of toCheck) {
    const r = await checkUrl(link);
    linkResults.push(r);
    await new Promise(res => setTimeout(res, 200));
  }
  return linkResults.filter(r => r.status === 0 || r.status === 404 || r.status >= 500);
}

// ─── MODULE 5: SECURITY AUDIT ────────────────────────────────────────────────
function auditSecurity(results) {
  const homepage = results.find(r => r.path === "/");
  if (!homepage?.secHeaders) return null;
  const h = homepage.secHeaders;
  return {
    hsts:         { present: !!h.hsts,        value: h.hsts },
    csp:          { present: !!h.csp,          value: h.csp ? h.csp.slice(0,80)+"..." : null },
    xFrame:       { present: !!h.xFrame,       value: h.xFrame },
    xContentType: { present: !!h.xContentType, value: h.xContentType },
    referrer:     { present: !!h.referrer,     value: h.referrer },
    permissions:  { present: !!h.permissions,  value: h.permissions },
  };
}

// ─── MODULE 6: SITEMAP AUDIT ─────────────────────────────────────────────────
async function auditSitemap() {
  console.log(head("SITEMAP AUDIT"));
  const r = await fetchPage(`${BASE}/sitemap.xml`, false);
  if (r.status !== 200) { console.log(fail(`sitemap.xml HTTP ${r.status}`)); return {}; }
  console.log(ok(`sitemap.xml accessible (${r.responseTime}ms)`));

  const urls   = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const dates  = [...r.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1].trim());
  const unique = new Set(dates);

  console.log(info(`URLs: ${urls.length} | lastmod dates: ${unique.size} unique`));

  if (r.body.includes("<priority>"))     console.log(info("priority tags present (ignored by Google)"));
  if (r.body.includes("<changefreq>"))   console.log(info("changefreq tags present"));

  const dupeUrls = urls.filter((u,i) => urls.indexOf(u) !== i);
  if (dupeUrls.length) console.log(warn(`${dupeUrls.length} duplicate URLs in sitemap`));
  else console.log(ok("No duplicate URLs"));

  // Check sitemap is linked from robots.txt
  const rt = await fetchPage(`${BASE}/robots.txt`, false);
  if (rt.body && rt.body.includes("sitemap.xml")) console.log(ok("Sitemap declared in robots.txt"));
  else console.log(warn("Sitemap NOT declared in robots.txt"));

  return { urls, dates, uniqueDates: unique.size };
}

// ─── MODULE 7: ROBOTS.TXT AUDIT ──────────────────────────────────────────────
async function auditRobots() {
  console.log(head("ROBOTS.TXT AUDIT"));
  const r = await fetchPage(`${BASE}/robots.txt`, false);
  if (r.status !== 200) { console.log(fail(`robots.txt HTTP ${r.status}`)); return; }
  console.log(ok(`robots.txt accessible (${r.responseTime}ms)`));

  const body = r.body;
  if (/Disallow:\s*\/\s*$/m.test(body) && !/Allow:\s*\//.test(body))
    console.log(fail("CRITICAL: robots.txt blocks ALL crawlers"));
  else console.log(ok("robots.txt does not block all pages"));

  if (/Crawl-delay:/i.test(body)) {
    const d = body.match(/Crawl-delay:\s*(\d+)/i);
    if (d && parseInt(d[1]) > 5) console.log(warn(`Crawl-delay: ${d[1]}s — too high`));
    else console.log(info(`Crawl-delay: ${d?.[1]}s`));
  }

  const disallowed = (body.match(/^Disallow:.+/gm) || []);
  console.log(info(`Disallowed: ${disallowed.length} paths`));
}

// ─── SCORE CALCULATOR ─────────────────────────────────────────────────────────
function calcOverallScore(results) {
  const pages = results.filter(r => r.status === 200 && r.meta?.wordCount > 0);
  if (!pages.length) return {};

  const avg = (key) => Math.round(pages.reduce((a,r) => a + (r.scores?.[key] || 0), 0) / pages.length);
  const seo          = Math.min(100, avg("seo"));
  const content      = Math.min(100, avg("content"));
  const technical    = Math.min(100, avg("technical"));
  const accessibility = Math.min(100, avg("accessibility"));
  const eeat         = Math.min(100, avg("eeat"));
  const overall      = Math.round((seo + content + technical + accessibility + eeat) / 5);
  return { seo, content, technical, accessibility, eeat, overall };
}

// ─── ADSENSE ENHANCED CHECKLIST ───────────────────────────────────────────────
function printAdSenseChecklist(results) {
  console.log(head("ADSENSE READINESS CHECKLIST (Enhanced)"));

  const all     = results.filter(r => r.status === 200);
  const find    = (p) => results.find(r => r.path === p);
  const home    = find("/");
  const about   = find("/about");
  const contact = find("/contact");
  const privacy = find("/privacy-policy");
  const terms   = find("/terms");
  const blog    = find("/blog");

  const checks = [
    { label: "Homepage 200 OK",                   pass: home?.status === 200 },
    { label: "About page exists & accessible",    pass: about?.status === 200 },
    { label: "Contact page exists & accessible",  pass: contact?.status === 200 },
    { label: "Privacy Policy complete (200+words)",pass: privacy?.status === 200 && (privacy?.meta?.wordCount || 0) > 200 },
    { label: "Terms of Use exists",               pass: terms?.status === 200 },
    { label: "Blog section exists",               pass: blog?.status === 200 },
    { label: "Cookie/consent notice present",     pass: all.some(r => r.meta?.hasCookieNotice),
      detail: "Add cookie consent banner for GDPR/AdSense compliance" },
    { label: "No pages with noindex",             pass: !all.some(r => r.meta?.hasNoindex),
      detail: all.filter(r => r.meta?.hasNoindex).map(r => r.path).join(", ") },
    { label: "No 404/5xx errors",                 pass: !results.some(r => r.status === 404 || r.status >= 500),
      detail: results.filter(r => r.status === 404).map(r => r.path).join(", ") },
    { label: "All pages have <title>",            pass: all.every(r => r.meta?.title || !r.meta?.wordCount),
      detail: all.filter(r => !r.meta?.title && r.meta?.wordCount > 0).map(r => r.path).join(", ") },
    { label: "All pages have meta description",   pass: all.every(r => r.meta?.description || !r.meta?.wordCount),
      detail: all.filter(r => !r.meta?.description && r.meta?.wordCount > 0).map(r => r.path).join(", ") },
    { label: "All pages have H1",                 pass: all.every(r => r.meta?.h1 || !r.meta?.wordCount),
      detail: all.filter(r => !r.meta?.h1 && r.meta?.wordCount > 0).map(r => r.path).join(", ") },
    { label: "Content pages have 300+ words",     pass: all.filter(r => r.meta?.wordCount > 0).every(r => r.meta.wordCount >= 300),
      detail: all.filter(r => r.meta?.wordCount > 0 && r.meta.wordCount < 300).map(r => `${r.path}(${r.meta.wordCount}w)`).join(", ") },
    { label: "Open Graph tags present",           pass: all.some(r => r.meta?.ogTitle) },
    { label: "Twitter Card tags present",         pass: all.some(r => r.meta?.twCard) },
    { label: "Schema markup present",             pass: all.some(r => r.meta?.schemaTypes?.length > 0) },
    { label: "Google Analytics present",          pass: all.some(r => r.meta?.hasGA) },
    { label: "Footer navigation present",         pass: all.some(r => r.meta?.hasFooterNav) },
    { label: "Site response < 3s avg",            pass: all.every(r => r.responseTime < 3000) },
    { label: "HTML lang attribute present",       pass: all.some(r => r.meta?.hasLangAttr) },
    { label: "No AI content risk HIGH pages",     pass: !all.some(r => r.meta?.aiRisk === "HIGH"),
      detail: all.filter(r => r.meta?.aiRisk === "HIGH").map(r => r.path).join(", ") },
  ];

  let passed = 0;
  checks.forEach(c => {
    if (c.pass) { console.log(ok(c.label)); passed++; }
    else { console.log(fail(c.label)); if (c.detail) console.log(`   ${C.gray}→ ${c.detail}${C.reset}`); }
  });

  const score = Math.round((passed / checks.length) * 100);
  const color = score >= 85 ? C.green : score >= 65 ? C.yellow : C.red;
  console.log(`\n${bold("AdSense Score:")} ${color}${score}%${C.reset} (${passed}/${checks.length})`);
  if (score >= 85) console.log(ok("Ready to apply for AdSense!"));
  else if (score >= 65) console.log(warn("Almost ready — fix critical issues above first"));
  else console.log(fail("Not ready — multiple issues to fix"));

  return { score, passed, total: checks.length };
}

// ─── EEAT REPORT ──────────────────────────────────────────────────────────────
function printEEATReport(results) {
  console.log(head("E-E-A-T AUDIT"));

  const blogPages = results.filter(r => r.path.startsWith("/blog/") && r.status === 200 && r.meta?.wordCount > 0);
  const toolPages = results.filter(r => r.path.startsWith("/tools/") && r.status === 200 && r.meta?.wordCount > 0);
  const allContent = [...blogPages, ...toolPages];

  const withAuthor  = allContent.filter(r => r.meta?.hasAuthor).length;
  const withDate    = allContent.filter(r => r.meta?.hasDate).length;
  const withSources = allContent.filter(r => r.meta?.hasSources).length;

  console.log(info(`Author detected: ${withAuthor}/${allContent.length} pages`));
  console.log(info(`Date detected:   ${withDate}/${allContent.length} pages`));
  console.log(info(`Sources/refs:    ${withSources}/${allContent.length} pages`));

  const about = results.find(r => r.path === "/about");
  if (about?.status === 200) console.log(ok("About page present"));
  else console.log(fail("About page missing"));

  const editPolicy = results.find(r => r.path === "/editorial-policy");
  if (editPolicy?.status === 200) console.log(ok("Editorial Policy present"));
  else console.log(warn("Editorial Policy missing"));

  if (withAuthor < allContent.length * 0.5) console.log(warn("Less than 50% content pages have author info — add author bylines"));
  if (withDate < allContent.length * 0.7)   console.log(warn("Many pages missing publish/update dates"));
}

// ─── SECURITY REPORT ──────────────────────────────────────────────────────────
function printSecurityReport(sec) {
  console.log(head("SECURITY HEADERS AUDIT"));
  if (!sec) { console.log(warn("Could not fetch security headers")); return; }

  const checks = [
    { name: "HSTS (Strict-Transport-Security)", key: "hsts" },
    { name: "CSP (Content-Security-Policy)",    key: "csp" },
    { name: "X-Frame-Options",                   key: "xFrame" },
    { name: "X-Content-Type-Options",            key: "xContentType" },
    { name: "Referrer-Policy",                   key: "referrer" },
    { name: "Permissions-Policy",                key: "permissions" },
  ];

  let passed = 0;
  checks.forEach(c => {
    if (sec[c.key]?.present) { console.log(ok(c.name)); passed++; }
    else console.log(fail(c.name));
  });
  console.log(info(`Security score: ${passed}/${checks.length}`));
  if (passed < 4) console.log(warn("Add missing security headers in Vercel/hosting config"));
}

// ─── DUPLICATE REPORT ─────────────────────────────────────────────────────────
function printDuplicateReport(dups) {
  console.log(head("DUPLICATE CONTENT DETECTION"));
  if (!dups.titles.length && !dups.descs.length) { console.log(ok("No duplicate titles or descriptions")); return; }

  if (dups.titles.length) {
    console.log(fail(`${dups.titles.length} duplicate title(s):`));
    dups.titles.forEach(d => console.log(`   ${C.gray}"${d.value}" → ${d.pages.join(", ")}${C.reset}`));
  }
  if (dups.descs.length) {
    console.log(fail(`${dups.descs.length} duplicate description(s):`));
    dups.descs.forEach(d => console.log(`   ${C.gray}"${d.value.slice(0,60)}..." → ${d.pages.join(", ")}${C.reset}`));
  }
}

// ─── PAGE SUMMARY TABLE ───────────────────────────────────────────────────────
function printPageTable(results) {
  console.log(head("PAGE-BY-PAGE RESULTS"));
  const header = `${"PATH".padEnd(38)} ${"ST".padEnd(4)} ${"MS".padEnd(6)} ${"WDS".padEnd(5)} ${"H1".padEnd(3)} ${"OG".padEnd(3)} ${"SCH".padEnd(4)} ${"AI".padEnd(4)} ISSUES`;
  console.log(C.gray + header + C.reset);
  console.log("─".repeat(115));

  results.forEach(r => {
    if (r.path === "/sitemap.xml" || r.path === "/robots.txt") return;
    const sc = r.status === 200 ? C.green : r.status >= 300 && r.status < 400 ? C.yellow : C.red;
    const wc = (r.meta?.wordCount || 0);
    const wcc = wc < 100 ? C.red : wc < 300 ? C.yellow : C.green;
    const ai = r.meta?.aiRisk === "HIGH" ? C.red+"HIGH" : r.meta?.aiRisk === "MEDIUM" ? C.yellow+"MED " : C.green+"LOW ";
    const issStr = r.issues?.length
      ? C.red + r.issues.slice(0,2).join(",").slice(0,30)
      : r.notes?.length
      ? C.yellow + r.notes.slice(0,1).join(",").slice(0,30)
      : C.green + "OK";

    console.log(
      C.gray + r.path.slice(0,37).padEnd(38) + C.reset +
      " " + sc + String(r.status||"ERR").padEnd(4) + C.reset +
      " " + String(r.responseTime||0).padEnd(5)+"m" +
      " " + wcc + String(wc).padEnd(5) + C.reset +
      " " + (r.meta?.h1 ? C.green+"✓" : C.red+"✗") + C.reset + "  " +
      " " + (r.meta?.ogTitle ? C.green+"✓" : C.red+"✗") + C.reset + "  " +
      " " + (r.meta?.schemaTypes?.length > 0 ? C.green+"✓" : C.red+"✗") + C.reset + "   " +
      " " + ai + C.reset + "  " +
      issStr + C.reset
    );
  });
}

// ─── HTML REPORT GENERATOR ────────────────────────────────────────────────────
function generateHTMLReport(results, scores, adSenseScore, dups, sec, brokenLinks) {
  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const scoreColor = (s) => s >= 80 ? "#10B981" : s >= 60 ? "#F59E0B" : "#EF4444";
  const pages200 = results.filter(r => r.status === 200).length;
  const pages404 = results.filter(r => r.status === 404).length;
  const avgTime  = Math.round(results.filter(r => r.responseTime).reduce((a,r) => a+r.responseTime, 0) / results.filter(r=>r.responseTime).length);
  const critPages = results.filter(r => r.issues?.length > 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AWE-OS Audit Report v2.0 — ${date}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
.wrap{max-width:1200px;margin:0 auto;padding:24px}
h1{font-size:28px;font-weight:700;color:#fff;margin-bottom:4px}
h2{font-size:18px;font-weight:600;color:#94a3b8;margin:32px 0 16px;border-bottom:1px solid #1e293b;padding-bottom:8px}
h3{font-size:14px;font-weight:600;color:#cbd5e1;margin-bottom:8px}
.meta{font-size:13px;color:#64748b;margin-bottom:32px}
.scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:32px}
.score-card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center}
.score-val{font-size:32px;font-weight:700;margin-bottom:4px}
.score-label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
.stat{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center}
.stat-val{font-size:22px;font-weight:700;color:#38bdf8}
.stat-label{font-size:11px;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
th{background:#1e293b;color:#94a3b8;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #334155}
td{padding:7px 10px;border-bottom:1px solid #1e293b;vertical-align:top}
tr:hover td{background:#1e293b40}
.ok{color:#10B981} .warn{color:#F59E0B} .fail{color:#EF4444}
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600}
.badge-ok{background:#065F4620;color:#10B981;border:1px solid #10B98130}
.badge-warn{background:#78350F20;color:#F59E0B;border:1px solid #F59E0B30}
.badge-fail{background:#7F1D1D20;color:#EF4444;border:1px solid #EF444430}
.section{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:20px}
.check-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid #0f172a}
.check-row:last-child{border-bottom:none}
.check-icon{font-size:14px;flex-shrink:0;margin-top:1px}
.check-text{font-size:13px;color:#cbd5e1}
.check-detail{font-size:11px;color:#64748b;margin-top:2px}
.footer{text-align:center;padding:24px;font-size:12px;color:#475569}
</style>
</head>
<body>
<div class="wrap">
  <h1>🔍 AWE-OS Audit Engine v2.0</h1>
  <div class="meta">Generated: ${date} · Site: ${BASE} · Pages audited: ${results.length}</div>

  <div class="scores">
    <div class="score-card"><div class="score-val" style="color:${scoreColor(scores.seo||0)}">${scores.seo||0}</div><div class="score-label">SEO</div></div>
    <div class="score-card"><div class="score-val" style="color:${scoreColor(scores.content||0)}">${scores.content||0}</div><div class="score-label">Content</div></div>
    <div class="score-card"><div class="score-val" style="color:${scoreColor(scores.technical||0)}">${scores.technical||0}</div><div class="score-label">Technical</div></div>
    <div class="score-card"><div class="score-val" style="color:${scoreColor(scores.accessibility||0)}">${scores.accessibility||0}</div><div class="score-label">Accessibility</div></div>
    <div class="score-card"><div class="score-val" style="color:${scoreColor(scores.eeat||0)}">${scores.eeat||0}</div><div class="score-label">E-E-A-T</div></div>
    <div class="score-card"><div class="score-val" style="color:${scoreColor(adSenseScore?.score||0)}">${adSenseScore?.score||0}%</div><div class="score-label">AdSense</div></div>
    <div class="score-card"><div class="score-val" style="color:${scoreColor(scores.overall||0)}">${scores.overall||0}</div><div class="score-label">Overall</div></div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${pages200}</div><div class="stat-label">Pages 200 OK</div></div>
    <div class="stat"><div class="stat-val" style="color:${pages404>0?"#EF4444":"#10B981"}">${pages404}</div><div class="stat-label">404 Errors</div></div>
    <div class="stat"><div class="stat-val">${avgTime}ms</div><div class="stat-label">Avg Response</div></div>
    <div class="stat"><div class="stat-val" style="color:${critPages.length>0?"#EF4444":"#10B981"}">${critPages.length}</div><div class="stat-label">Critical Issues</div></div>
  </div>

  <h2>📋 Page-by-Page Results</h2>
  <table>
    <tr><th>Page</th><th>Status</th><th>Time</th><th>Words</th><th>H1</th><th>OG</th><th>Schema</th><th>AI Risk</th><th>Issues</th></tr>
    ${results.filter(r => r.path !== "/sitemap.xml" && r.path !== "/robots.txt").map(r => `
    <tr>
      <td style="font-family:monospace;font-size:11px;color:#7dd3fc">${r.path}</td>
      <td><span class="badge ${r.status===200?"badge-ok":r.status>=300&&r.status<400?"badge-warn":"badge-fail"}">${r.status||"ERR"}</span></td>
      <td style="color:${(r.responseTime||0)>2000?"#EF4444":(r.responseTime||0)>1000?"#F59E0B":"#10B981"}">${r.responseTime||0}ms</td>
      <td style="color:${(r.meta?.wordCount||0)<100?"#EF4444":(r.meta?.wordCount||0)<300?"#F59E0B":"#10B981"}">${r.meta?.wordCount||0}</td>
      <td>${r.meta?.h1?"<span class='ok'>✓</span>":"<span class='fail'>✗</span>"}</td>
      <td>${r.meta?.ogTitle?"<span class='ok'>✓</span>":"<span class='fail'>✗</span>"}</td>
      <td>${(r.meta?.schemaTypes||[]).length>0?"<span class='ok'>✓</span>":"<span class='fail'>✗</span>"}</td>
      <td><span class="badge ${r.meta?.aiRisk==="HIGH"?"badge-fail":r.meta?.aiRisk==="MEDIUM"?"badge-warn":"badge-ok"}">${r.meta?.aiRisk||"N/A"}</span></td>
      <td style="font-size:11px;color:#F59E0B">${[...(r.issues||[]),...(r.notes||[])].slice(0,2).join("<br>")}</td>
    </tr>`).join("")}
  </table>

  <h2>🔒 Security Headers</h2>
  <div class="section">
    ${sec ? Object.entries(sec).map(([k,v]) => `
    <div class="check-row">
      <span class="check-icon">${v.present?"✅":"❌"}</span>
      <div><div class="check-text">${k.toUpperCase()}</div>${v.value?`<div class="check-detail">${v.value}</div>`:""}</div>
    </div>`).join("") : "<p style='color:#64748b'>Security headers not available</p>"}
  </div>

  ${dups.titles.length||dups.descs.length ? `
  <h2>🔁 Duplicate Content</h2>
  <div class="section">
    ${dups.titles.map(d=>`<div class="check-row"><span class="check-icon">❌</span><div><div class="check-text">Duplicate title: "${d.value}"</div><div class="check-detail">${d.pages.join(", ")}</div></div></div>`).join("")}
    ${dups.descs.map(d=>`<div class="check-row"><span class="check-icon">❌</span><div><div class="check-text">Duplicate desc: "${d.value.slice(0,60)}..."</div><div class="check-detail">${d.pages.join(", ")}</div></div></div>`).join("")}
  </div>` : ""}

  ${brokenLinks.length ? `
  <h2>🔗 Broken External Links</h2>
  <div class="section">
    ${brokenLinks.map(l=>`<div class="check-row"><span class="check-icon">❌</span><div class="check-text">${l.url} <span style="color:#EF4444">(${l.status||"error"})</span></div></div>`).join("")}
  </div>` : `<h2>🔗 External Links</h2><div class="section"><div class="check-row"><span class="check-icon">✅</span><div class="check-text">No broken external links detected</div></div></div>`}

  <div class="footer">AWE-OS Audit Engine v2.0 · Run again: <code>node audit-awe-os-v2.js --html</code></div>
</div>
</body>
</html>`;

  const outPath = path.join(process.cwd(), "audit-report.html");
  fs.writeFileSync(outPath, html);
  console.log(`\n${C.green}✅ HTML report saved: ${outPath}${C.reset}`);
  return outPath;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}${"═".repeat(65)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}   AWE-OS AUDIT ENGINE v2.0${C.reset}`);
  console.log(`${C.bold}${C.cyan}   ${new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}${C.reset}`);
  console.log(`${C.bold}${C.cyan}   Modules: SEO · Content · Security · EEAT · AdSense · A11y${C.reset}`);
  console.log(`${C.bold}${C.cyan}${"═".repeat(65)}${C.reset}`);

  await auditRobots();
  await auditSitemap();

  console.log(head("AUDITING PAGES"));
  const results = [];
  for (let i = 0; i < PAGES.length; i += BATCH) {
    const batch = PAGES.slice(i, i + BATCH);
    const br    = await Promise.all(batch.map(p => auditPage(p)));
    results.push(...br);
    process.stdout.write(`  ${Math.min(i+BATCH,PAGES.length)}/${PAGES.length} pages checked...\r`);
  }
  console.log(`  ${PAGES.length}/${PAGES.length} pages checked.   \n`);

  printPageTable(results);

  // Duplicate detection
  const dups = detectDuplicates(results);
  printDuplicateReport(dups);

  // Security
  const sec = auditSecurity(results);
  printSecurityReport(sec);

  // EEAT
  printEEATReport(results);

  // External links (limited check)
  console.log(head("EXTERNAL LINK CHECK"));
  console.log(info("Checking up to 20 external links..."));
  const brokenLinks = await checkExternalLinks(results);
  if (brokenLinks.length) {
    brokenLinks.forEach(l => console.log(fail(`${l.url} → ${l.status || "error"}`)));
  } else {
    console.log(ok("No broken external links found"));
  }

  // AdSense
  const adSenseScore = printAdSenseChecklist(results);

  // Scores
  const scores = calcOverallScore(results);
  console.log(head("SCORE SUMMARY"));
  const scoreBar = (s) => {
    const filled = Math.round(s / 5);
    const bar = "█".repeat(filled) + "░".repeat(20 - filled);
    const color = s >= 80 ? C.green : s >= 60 ? C.yellow : C.red;
    return `${color}${bar}${C.reset} ${color}${s}/100${C.reset}`;
  };
  console.log(`SEO           ${scoreBar(scores.seo || 0)}`);
  console.log(`Content       ${scoreBar(scores.content || 0)}`);
  console.log(`Technical     ${scoreBar(scores.technical || 0)}`);
  console.log(`Accessibility ${scoreBar(scores.accessibility || 0)}`);
  console.log(`E-E-A-T       ${scoreBar(scores.eeat || 0)}`);
  console.log(`─`.repeat(50));
  console.log(`${bold("OVERALL")}       ${scoreBar(scores.overall || 0)}`);

  // Final stats
  const ok200   = results.filter(r => r.status === 200).length;
  const err404  = results.filter(r => r.status === 404).length;
  const avgTime = Math.round(results.filter(r => r.responseTime).reduce((a,r) => a+r.responseTime, 0) / results.filter(r => r.responseTime).length);
  const noIdx   = results.filter(r => r.meta?.hasNoindex).length;
  const thin    = results.filter(r => r.meta?.wordCount > 0 && r.meta.wordCount < 300).length;
  const aiHigh  = results.filter(r => r.meta?.aiRisk === "HIGH").length;
  const critCnt = results.filter(r => r.issues?.length > 0).length;

  console.log(head("FINAL STATS"));
  console.log(`Pages checked    : ${results.length}`);
  console.log(`200 OK           : ${C.green}${ok200}${C.reset}`);
  console.log(`404 errors       : ${err404 > 0 ? C.red : C.green}${err404}${C.reset}`);
  console.log(`noindex pages    : ${noIdx > 0 ? C.red : C.green}${noIdx}${C.reset}`);
  console.log(`Thin content     : ${thin > 0 ? C.yellow : C.green}${thin}${C.reset} pages < 300 words`);
  console.log(`AI content risk  : ${aiHigh > 0 ? C.red : C.green}${aiHigh}${C.reset} HIGH-risk pages`);
  console.log(`Broken ext links : ${brokenLinks.length > 0 ? C.red : C.green}${brokenLinks.length}${C.reset}`);
  console.log(`Critical issues  : ${critCnt > 0 ? C.red : C.green}${critCnt}${C.reset} pages`);
  console.log(`Avg response     : ${avgTime > 2000 ? C.red : avgTime > 1000 ? C.yellow : C.green}${avgTime}ms${C.reset}`);
  console.log(`Dup titles       : ${dups.titles.length > 0 ? C.red : C.green}${dups.titles.length}${C.reset}`);
  console.log(`Dup descriptions : ${dups.descs.length > 0 ? C.red : C.green}${dups.descs.length}${C.reset}`);

  if (GENERATE_HTML) {
    generateHTMLReport(results, scores, adSenseScore, dups, sec, brokenLinks);
  } else {
    console.log(`\n${C.gray}Tip: Run with --html flag to generate audit-report.html${C.reset}`);
  }
  console.log(`${C.gray}Tip: Run weekly to track progress${C.reset}\n`);
}

main().catch(console.error);
