/**
 * AWE-OS.com — Complete Website Audit Script
 * Run: node audit-awe-os.js
 * 
 * Checks:
 *  1. Page availability & HTTP status codes
 *  2. Redirect chains
 *  3. Meta tags (title, description, robots, canonical)
 *  4. noindex detection
 *  5. Content length (thin content detection)
 *  6. Sitemap validation
 *  7. robots.txt validation
 *  8. Core page structure (H1, H2, images alt)
 *  9. Response time (performance)
 * 10. AdSense readiness checklist
 */

const https = require("https");
const http = require("http");
const { URL } = require("url");

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE = "https://www.awe-os.com";
const TIMEOUT = 12000; // ms

// Pages from your sitemap — key ones to audit
const PAGES = [
  // Core
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/disclaimer",
  "/editorial-policy",
  "/advertising-policy",
  "/blog",

  // Tool pages
  "/tools/merge-pdf",
  "/tools/compress-pdf",
  "/tools/pdf-to-word",
  "/tools/word-to-pdf",
  "/tools/gst-calculator",
  "/tools/sip-calculator",
  "/tools/tax-calculator",
  "/tools/loan-calculator",
  "/tools/qr-code-generator",
  "/tools/invoice-generator",
  "/tools/resume-builder",
  "/tools/ai-content-writer",
  "/tools/bmi-calculator",
  "/tools/age-calculator",
  "/tools/currency-converter",
  "/tools/image-compressor",
  "/tools/word-counter",
  "/tools/password-generator",
  "/tools/ppf-calculator",
  "/tools/fd-calculator",

  // Blog posts
  "/blog/how-to-create-a-budget-that-works-for-you-in-india",
  "/blog/merge-pdf-files-for-bank-documents-india",
  "/blog/gst-calculator-india-2026-complete-guide",
  "/blog/sip-calculator-mutual-fund-returns-india",
  "/blog/free-ats-resume-builder-get-past-ats-systems",
  "/blog/bmi-calculator-for-indians-icmr-vs-who",
  "/blog/new-vs-old-tax-regime-fy-2025-26",
  "/blog/10-free-pdf-tools-you-need-in-2026",

  // Special
  "/sitemap.xml",
  "/robots.txt",
];

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  red:   "\x1b[31m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  cyan:  "\x1b[36m",
  gray:  "\x1b[90m",
  white: "\x1b[97m",
};

const ok   = (s) => `${C.green}✅ ${s}${C.reset}`;
const warn = (s) => `${C.yellow}⚠️  ${s}${C.reset}`;
const fail = (s) => `${C.red}❌ ${s}${C.reset}`;
const info = (s) => `${C.cyan}ℹ️  ${s}${C.reset}`;
const bold = (s) => `${C.bold}${s}${C.reset}`;

// ─── HTTP FETCH ───────────────────────────────────────────────────────────────
function fetchPage(url, followRedirects = true, maxRedirects = 5) {
  return new Promise((resolve) => {
    const start = Date.now();
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AWE-OS-Auditor/1.0; +https://www.awe-os.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        timeout: TIMEOUT,
      },
      (res) => {
        const status = res.statusCode;
        const location = res.headers["location"];
        const contentType = res.headers["content-type"] || "";

        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(status) && location && followRedirects && maxRedirects > 0) {
          const nextUrl = location.startsWith("http")
            ? location
            : new URL(location, url).href;
          fetchPage(nextUrl, true, maxRedirects - 1).then((r) => {
            resolve({
              ...r,
              redirectedFrom: url,
              originalStatus: status,
              redirectChain: [url, ...(r.redirectChain || [])],
            });
          });
          res.destroy();
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 200000) res.destroy(); // cap at 200KB
        });
        res.on("end", () => {
          resolve({
            url,
            status,
            contentType,
            body,
            responseTime: Date.now() - start,
            headers: res.headers,
            redirectChain: [],
          });
        });
        res.on("error", () => resolve({ url, status: 0, error: "stream error", responseTime: Date.now() - start }));
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ url, status: 0, error: "timeout", responseTime: TIMEOUT });
    });
    req.on("error", (e) => resolve({ url, status: 0, error: e.message, responseTime: Date.now() - start }));
    req.end();
  });
}

// ─── HTML PARSERS ─────────────────────────────────────────────────────────────
function extractMeta(html) {
  const get = (pattern) => { const m = html.match(pattern); return m ? m[1] : null; };

  const title       = get(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const description = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})["']/i)
                   || get(/<meta[^>]+content=["']([^"']{0,300})["'][^>]+name=["']description["']/i);
  const robots      = get(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
                   || get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  const canonical   = get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const ogTitle     = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const stripTags = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

  const h1Raw       = get(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1          = h1Raw ? stripTags(h1Raw).slice(0, 150) : null;

  const h2s         = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
  const imgCount    = (html.match(/<img /gi) || []).length;
  const imgNoAlt    = (html.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length;

  // Visible text (very rough)
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = textOnly.split(/\s+/).filter((w) => w.length > 2).length;

  const hasNoindex = robots
    ? /noindex/i.test(robots)
    : /x-robots-tag[^:]*:\s*[^,\n]*noindex/i.test("");

  const hasAdsense = /adsbygoogle|googlesyndication|pagead2/i.test(html);
  const hasGA      = /gtag|google-analytics|G-[A-Z0-9]+/i.test(html);
  const hasSchema  = /application\/ld\+json/i.test(html);

  return {
    title,
    titleLen: title ? title.length : 0,
    description,
    descLen: description ? description.length : 0,
    robots,
    canonical,
    ogTitle,
    h1,
    h2s,
    imgCount,
    imgNoAlt,
    wordCount,
    hasNoindex,
    hasAdsense,
    hasGA,
    hasSchema,
  };
}

// ─── SINGLE PAGE AUDIT ────────────────────────────────────────────────────────
async function auditPage(path) {
  const url = BASE + path;
  const result = await fetchPage(url);

  const issues  = [];
  const notes   = [];

  if (result.error || result.status === 0) {
    return { path, url, status: result.status || 0, error: result.error, issues: ["FETCH_ERROR"], notes: [], meta: {} };
  }

  const { status, body, responseTime, redirectChain } = result;
  const isHtml = (result.contentType || "").includes("text/html");

  // — Status checks
  if (status >= 500) issues.push(`SERVER_ERROR_${status}`);
  else if (status === 404) issues.push("NOT_FOUND");
  else if (status >= 400) issues.push(`CLIENT_ERROR_${status}`);
  else if ([301, 302].includes(status)) notes.push(`REDIRECT_${status}`);

  // — Redirect chain
  if (redirectChain.length > 1) {
    notes.push(`REDIRECT_CHAIN (${redirectChain.length} hops)`);
    if (redirectChain.length > 2) issues.push("REDIRECT_CHAIN_TOO_LONG");
  }

  // — Response time
  if (responseTime > 3000) issues.push(`SLOW_${responseTime}ms`);
  else if (responseTime > 1500) notes.push(`RESPONSE_${responseTime}ms`);

  if (!isHtml || !body) return { path, url, status, responseTime, issues, notes, meta: {} };

  const meta = extractMeta(body);

  // — noindex
  if (meta.hasNoindex) issues.push("NOINDEX_TAG_FOUND");

  // — Title
  if (!meta.title) issues.push("MISSING_TITLE");
  else if (meta.titleLen < 30) issues.push(`TITLE_TOO_SHORT (${meta.titleLen} chars)`);
  else if (meta.titleLen > 65) notes.push(`TITLE_TOO_LONG (${meta.titleLen} chars)`);

  // — Description
  if (!meta.description) issues.push("MISSING_META_DESCRIPTION");
  else if (meta.descLen < 80) notes.push(`DESC_SHORT (${meta.descLen} chars)`);
  else if (meta.descLen > 160) notes.push(`DESC_LONG (${meta.descLen} chars)`);

  // — H1
  if (!meta.h1) issues.push("MISSING_H1");

  // — Canonical
  if (!meta.canonical) notes.push("NO_CANONICAL_TAG");

  // — Word count (thin content)
  if (meta.wordCount < 100) issues.push(`THIN_CONTENT (${meta.wordCount} words)`);
  else if (meta.wordCount < 300) notes.push(`LOW_CONTENT (${meta.wordCount} words)`);

  // — Images
  if (meta.imgNoAlt > 0) notes.push(`${meta.imgNoAlt} IMG_MISSING_ALT`);

  // — AdSense / GA
  if (!meta.hasGA) notes.push("NO_GOOGLE_ANALYTICS");

  return { path, url, status, responseTime, issues, notes, meta, redirectChain };
}

// ─── SITEMAP CHECK ────────────────────────────────────────────────────────────
async function auditSitemap() {
  console.log(`\n${bold("━━━ SITEMAP AUDIT ━━━")}`);
  const r = await fetchPage(`${BASE}/sitemap.xml`, false);

  if (r.status !== 200) {
    console.log(fail(`sitemap.xml — HTTP ${r.status}`));
    return;
  }
  console.log(ok(`sitemap.xml accessible (${r.responseTime}ms)`));

  const urls = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const dates = [...r.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1].trim());

  console.log(info(`Total URLs in sitemap: ${urls.length}`));

  // Date consistency check
  const uniqueDates = [...new Set(dates)];
  if (uniqueDates.length > 5) {
    console.log(warn(`Inconsistent lastmod dates (${uniqueDates.length} unique dates) — Google confuse hoga`));
    console.log(`   Sample dates: ${uniqueDates.slice(0, 5).join(", ")} ...`);
  } else {
    console.log(ok(`lastmod dates consistent`));
  }

  // Check for duplicate URLs
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dupes.length) console.log(warn(`Duplicate URLs in sitemap: ${dupes.join(", ")}`));
  else console.log(ok(`No duplicate URLs`));

  // Check priority/changefreq missing
  const hasPriority = r.body.includes("<priority>");
  if (!hasPriority) console.log(warn("No <priority> tags in sitemap (optional but helpful)"));

  return urls.length;
}

// ─── ROBOTS.TXT CHECK ─────────────────────────────────────────────────────────
async function auditRobots() {
  console.log(`\n${bold("━━━ ROBOTS.TXT AUDIT ━━━")}`);
  const r = await fetchPage(`${BASE}/robots.txt`, false);

  if (r.status !== 200) {
    console.log(fail(`robots.txt — HTTP ${r.status} (must be 200)`));
    return;
  }
  console.log(ok(`robots.txt accessible (${r.responseTime}ms)`));

  const body = r.body;

  if (/Disallow:\s*\/\s*$/m.test(body) && !/Allow:\s*\//.test(body)) {
    console.log(fail("robots.txt blocks ALL crawlers — critical error!"));
  } else {
    console.log(ok("robots.txt does not block all pages"));
  }

  if (/Sitemap:/i.test(body)) console.log(ok("Sitemap URL declared in robots.txt"));
  else console.log(warn("Sitemap URL missing from robots.txt"));

  if (/Crawl-delay:\s*[5-9][0-9]/i.test(body)) {
    console.log(warn("Crawl-delay is very high — slows Googlebot"));
  } else if (/Crawl-delay:/i.test(body)) {
    const delay = body.match(/Crawl-delay:\s*(\d+)/i);
    console.log(info(`Crawl-delay: ${delay?.[1]}s (recommended: remove or set to 0)`));
  }

  // Count disallowed paths
  const disallowed = (body.match(/^Disallow:.+/gm) || []);
  console.log(info(`Disallowed paths: ${disallowed.length} (${disallowed.map(d => d.replace("Disallow:", "").trim()).join(", ")})`));
}

// ─── ADSENSE READINESS ────────────────────────────────────────────────────────
function printAdSenseChecklist(results) {
  console.log(`\n${bold("━━━ ADSENSE READINESS CHECKLIST ━━━")}`);

  const allPages = results.filter((r) => r.status === 200);
  const homepage = results.find((r) => r.path === "/");
  const about    = results.find((r) => r.path === "/about");
  const contact  = results.find((r) => r.path === "/contact");
  const privacy  = results.find((r) => r.path === "/privacy-policy");
  const blogPage = results.find((r) => r.path === "/blog");

  const checks = [
    {
      label: "Homepage accessible (200)",
      pass: homepage?.status === 200,
    },
    {
      label: "About page exists",
      pass: about?.status === 200,
    },
    {
      label: "Contact page exists",
      pass: contact?.status === 200,
    },
    {
      label: "Privacy Policy exists",
      pass: privacy?.status === 200,
    },
    {
      label: "Blog section exists",
      pass: blogPage?.status === 200,
    },
    {
      label: "No pages with noindex tag",
      pass: !results.some((r) => r.meta?.hasNoindex),
      detail: results.filter((r) => r.meta?.hasNoindex).map((r) => r.path).join(", "),
    },
    {
      label: "No server errors (5xx)",
      pass: !results.some((r) => r.status >= 500),
    },
    {
      label: "No broken pages (404)",
      pass: !results.some((r) => r.status === 404),
      detail: results.filter((r) => r.status === 404).map((r) => r.path).join(", "),
    },
    {
      label: "All pages have <title>",
      pass: allPages.every((r) => r.meta?.title),
      detail: allPages.filter((r) => !r.meta?.title).map((r) => r.path).join(", "),
    },
    {
      label: "All pages have meta description",
      pass: allPages.every((r) => r.meta?.description),
      detail: allPages.filter((r) => !r.meta?.description).map((r) => r.path).join(", "),
    },
    {
      label: "All pages have H1",
      pass: allPages.every((r) => r.meta?.h1),
      detail: allPages.filter((r) => !r.meta?.h1).map((r) => r.path).join(", "),
    },
    {
      label: "Content pages have 300+ words",
      pass: allPages.filter((r) => !r.path.includes("sitemap") && !r.path.includes("robots"))
                    .every((r) => (r.meta?.wordCount || 0) >= 300),
      detail: allPages.filter((r) => (r.meta?.wordCount || 0) < 300 && (r.meta?.wordCount || 0) > 0)
                      .map((r) => `${r.path}(${r.meta?.wordCount}w)`).join(", "),
    },
    {
      label: "Response time < 3s",
      pass: allPages.every((r) => r.responseTime < 3000),
      detail: allPages.filter((r) => r.responseTime >= 3000).map((r) => `${r.path}(${r.responseTime}ms)`).join(", "),
    },
    {
      label: "Google Analytics present",
      pass: allPages.some((r) => r.meta?.hasGA),
    },
    {
      label: "Schema markup present",
      pass: allPages.some((r) => r.meta?.hasSchema),
    },
  ];

  let passed = 0;
  checks.forEach((c) => {
    if (c.pass) {
      console.log(ok(c.label));
      passed++;
    } else {
      console.log(fail(c.label));
      if (c.detail) console.log(`   ${C.gray}→ ${c.detail}${C.reset}`);
    }
  });

  const score = Math.round((passed / checks.length) * 100);
  console.log(`\n${bold("AdSense Readiness Score:")} ${score >= 80 ? C.green : score >= 60 ? C.yellow : C.red}${score}%${C.reset} (${passed}/${checks.length} checks passed)`);

  if (score < 80) {
    console.log(warn("AdSense approval ke liye score 90%+ hona chahiye"));
  }
}

// ─── SUMMARY TABLE ────────────────────────────────────────────────────────────
function printSummary(results) {
  console.log(`\n${bold("━━━ PAGE-BY-PAGE RESULTS ━━━")}`);
  console.log(
    `${"PATH".padEnd(42)} ${"STATUS".padEnd(7)} ${"TIME".padEnd(7)} ${"WORDS".padEnd(7)} ${"H1".padEnd(5)} ${"ISSUES"}`
  );
  console.log("─".repeat(110));

  results.forEach((r) => {
    if (r.path === "/sitemap.xml" || r.path === "/robots.txt") return;

    const statusColor =
      r.status === 200 ? C.green :
      r.status >= 300 && r.status < 400 ? C.yellow :
      C.red;

    const issueStr = r.issues?.length
      ? `${C.red}${r.issues.join(", ")}${C.reset}`
      : r.notes?.length
      ? `${C.yellow}${r.notes.slice(0, 2).join(", ")}${C.reset}`
      : `${C.green}OK${C.reset}`;

    const words = r.meta?.wordCount || 0;
    const wordsColor = words < 100 ? C.red : words < 300 ? C.yellow : C.green;

    console.log(
      `${C.gray}${r.path.slice(0, 41).padEnd(42)}${C.reset} ` +
      `${statusColor}${String(r.status || "ERR").padEnd(7)}${C.reset} ` +
      `${String(r.responseTime || 0).padEnd(4)}ms `.padEnd(8) +
      `${wordsColor}${String(words).padEnd(7)}${C.reset} ` +
      `${r.meta?.h1 ? C.green + "✓" : C.red + "✗"}${C.reset}     ` +
      `${issueStr}`
    );
  });
}

// ─── ISSUES SUMMARY ───────────────────────────────────────────────────────────
function printIssuesSummary(results) {
  console.log(`\n${bold("━━━ CRITICAL ISSUES (Fix These First) ━━━")}`);

  const critical = results.filter((r) => r.issues?.length > 0);
  if (!critical.length) {
    console.log(ok("No critical issues found!"));
    return;
  }

  const grouped = {};
  critical.forEach((r) => {
    r.issues.forEach((issue) => {
      if (!grouped[issue]) grouped[issue] = [];
      grouped[issue].push(r.path);
    });
  });

  Object.entries(grouped).forEach(([issue, pages]) => {
    console.log(`\n${fail(issue)}`);
    pages.forEach((p) => console.log(`   ${C.gray}→ ${p}${C.reset}`));
  });

  console.log(`\n${bold("━━━ WARNINGS (Improve These) ━━━")}`);
  const warnings = results.filter((r) => r.notes?.length > 0 && !r.issues?.length);
  const wGrouped = {};
  warnings.forEach((r) => {
    r.notes.forEach((note) => {
      if (!wGrouped[note]) wGrouped[note] = [];
      wGrouped[note].push(r.path);
    });
  });
  Object.entries(wGrouped).slice(0, 10).forEach(([note, pages]) => {
    console.log(`${warn(note)} — ${pages.length} page(s)`);
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}${"═".repeat(60)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}   AWE-OS.COM — COMPLETE WEBSITE AUDIT${C.reset}`);
  console.log(`${C.bold}${C.cyan}   ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${"═".repeat(60)}${C.reset}\n`);

  // Robots & Sitemap first
  await auditRobots();
  await auditSitemap();

  // Audit all pages
  console.log(`\n${bold("━━━ AUDITING PAGES (please wait...) ━━━")}`);
  const results = [];

  // Run in batches of 5 to avoid overwhelming the server
  const BATCH = 5;
  for (let i = 0; i < PAGES.length; i += BATCH) {
    const batch = PAGES.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map((p) => auditPage(p)));
    results.push(...batchResults);
    process.stdout.write(`  Checked ${Math.min(i + BATCH, PAGES.length)}/${PAGES.length} pages...\r`);
  }
  console.log(`  Checked ${PAGES.length}/${PAGES.length} pages.   \n`);

  printSummary(results);
  printIssuesSummary(results);
  printAdSenseChecklist(results);

  // Final stats
  const ok200  = results.filter((r) => r.status === 200).length;
  const ok404  = results.filter((r) => r.status === 404).length;
  const okErr  = results.filter((r) => r.status === 0).length;
  const avgTime = Math.round(results.filter(r => r.responseTime).reduce((a, b) => a + b.responseTime, 0) / results.length);
  const noindex = results.filter((r) => r.meta?.hasNoindex).length;
  const thin    = results.filter((r) => r.meta?.wordCount > 0 && r.meta?.wordCount < 300).length;

  console.log(`\n${bold("━━━ FINAL STATS ━━━")}`);
  console.log(`Pages checked   : ${results.length}`);
  console.log(`200 OK          : ${C.green}${ok200}${C.reset}`);
  console.log(`404 Not Found   : ${ok404 > 0 ? C.red : C.green}${ok404}${C.reset}`);
  console.log(`Errors          : ${okErr > 0 ? C.red : C.green}${okErr}${C.reset}`);
  console.log(`noindex pages   : ${noindex > 0 ? C.red : C.green}${noindex}${C.reset}`);
  console.log(`Thin content    : ${thin > 0 ? C.red : C.green}${thin}${C.reset} pages < 300 words`);
  console.log(`Avg response    : ${avgTime > 2000 ? C.red : avgTime > 1000 ? C.yellow : C.green}${avgTime}ms${C.reset}`);
  console.log(`\n${C.gray}Tip: Run this script weekly to track progress${C.reset}\n`);
}

main().catch(console.error);
