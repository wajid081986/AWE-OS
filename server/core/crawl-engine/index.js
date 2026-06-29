'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const { CrawlQueue }   = require('./queue');
const { robotsParser } = require('./robots');
const { parseSitemap } = require('./sitemap');
const { crawlPage }    = require('./crawler');
const { CrawlGraph }   = require('./graph');
const { CrawlResults } = require('./results');
const { normalizeUrl, isCrawlable } = require('./normalizer');

class CrawlEngine {
  constructor() {
    this._activeCrawls = new Map();
  }

  async crawl(startUrl, opts = {}) {
    const {
      maxPages      = 200,
      maxDepth      = 3,
      delayMs       = 300,
      followSitemap = true,
      respectRobots = true,
      onProgress    = null,
    } = opts;

    let parsedStart;
    try { parsedStart = new URL(startUrl); }
    catch { throw new Error(`Invalid URL: ${startUrl}`); }

    const allowedHost = parsedStart.hostname;
    const queue       = new CrawlQueue(maxPages);
    const graph       = new CrawlGraph();
    const results     = new CrawlResults();

    // Fetch robots.txt
    let robots      = {};
    let robotsFound = false;
    if (respectRobots) {
      try {
        robots      = await robotsParser.fetch(startUrl);
        robotsFound = true;
      } catch {}
    }

    // Seed ALL URLs from sitemap first (not just 30%)
    let sitemapFound    = false;
    let sitemapUrlCount = 0;
    if (followSitemap) {
      const seed       = await this._seedFromSitemap(startUrl, robots, allowedHost, queue, maxPages, respectRobots);
      sitemapFound    = seed.found;
      sitemapUrlCount = seed.count;
    }

    // Seed from local data files — ensures ALL known pages are crawled
    // even if not in sitemap or not linked from other pages
    await this._seedFromDataFiles(startUrl, allowedHost, queue, maxPages);

    // Always include the start URL
    const normStart = normalizeUrl(startUrl, startUrl);
    if (normStart) queue.enqueue(normStart, 0);

    const crawlStartTime = Date.now();

    // BFS loop
    while (!queue.isEmpty && !queue.isFull) {
      const item = queue.dequeue();
      if (!item) break;
      const { url, depth } = item;

      queue.markVisited(url);

      if (depth > maxDepth) continue;
      if (respectRobots && !robotsParser.isAllowed(url, robots)) continue;

      graph.addNode(url, depth);

      const pageData = await crawlPage(url, allowedHost);
      results.addPage(pageData);

      const elapsedSec = (Date.now() - crawlStartTime) / 1000;
      const speed      = elapsedSec > 0 ? Math.round((queue.visitedCount / elapsedSec) * 10) / 10 : 0;

      for (const link of (pageData.internalLinks || [])) {
        if (graph._nodes.has(link.url)) {
          graph.addEdge(url, link.url, link.anchor, link.nofollow);
        }
      }

      for (const discovered of (pageData.discoveredUrls || [])) {
        const norm = normalizeUrl(discovered, url);
        if (!norm || !isCrawlable(norm, allowedHost)) continue;
        if (queue.enqueue(norm, depth + 1)) {
          graph.addNode(norm, depth + 1);
        }
      }

      if (typeof onProgress === 'function') {
        const issueTypes  = (pageData.issues || []).map(i => i.type);
        const hasProblems = (pageData.issues || []).some(i => i.severity === 'error' || i.severity === 'warning');
        onProgress({
          current:     queue.visitedCount,
          total:       Math.max(queue.visitedCount + queue.size, sitemapUrlCount || maxPages),
          url,
          speed,
          isThin:      issueTypes.includes('THIN_CONTENT'),
          hasFewLinks: issueTypes.includes('FEW_INTERNAL_LINKS'),
          isGood:      !hasProblems && !pageData.error,
          issueCount:  (pageData.issues || []).length,
        });
      }

      if (delayMs > 0 && !queue.isEmpty) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    const report = results.aggregate({ sitemapFound, robotsFound });

    report.graph = {
      orphanPages:        graph.getOrphans(),
      highAuthorityPages: graph.getHighAuthority(10),
      deepPages:          graph.getDeepPages(maxDepth),
    };

    report.metadata = {
      startUrl,
      allowedHost,
      crawledAt:      new Date().toISOString(),
      maxPages,
      maxDepth,
      sitemapFound,
      sitemapUrlCount,
      robotsFound,
    };

    return report;
  }

  // Seed queue from local client data files — guarantees all known routes are crawled
  async _seedFromDataFiles(startUrl, allowedHost, queue, maxPages) {
    function evalFile(filePath) {
      try {
        const src = fs.readFileSync(filePath, 'utf8');
        const cjs = src
          .replace(/export\s+default\s+/g, 'var __default__ = ')
          .replace(/export\s+(const|let|var)\s+/g, 'var ')
          .replace(/\bexport\s+function\b/g, 'function')
          .replace(/\bexport\s+class\b/g, 'class');
        const ctx = {};
        vm.runInNewContext(cjs, ctx, { timeout: 5000 });
        return ctx;
      } catch { return {}; }
    }

    const dataDir = path.resolve(__dirname, '../../../client/src/data');
    const base    = startUrl.replace(/\/+$/, '');
    const urlSet  = new Set();

    // Static pages
    for (const p of ['/', '/about', '/tools', '/blog', '/contact', '/privacy-policy', '/terms']) {
      urlSet.add(base + p);
    }

    // Tool pages
    try {
      const ctx = evalFile(path.join(dataDir, 'toolRegistry.js'));
      for (const t of (ctx.TOOL_REGISTRY || [])) {
        if (!t.comingSoon && t.slug) urlSet.add(`${base}/tools/${t.slug}`);
      }
    } catch {}

    // Blog posts (skip noindex)
    try {
      const ctx = evalFile(path.join(dataDir, 'blogPosts.js'));
      for (const p of (ctx.BLOG_POSTS || [])) {
        if (!p.noindex && p.slug) urlSet.add(`${base}/blog/${p.slug}`);
      }
    } catch {}

    // City pages — slug format is e.g. "bmi-calculator/mumbai"
    try {
      const ctx = evalFile(path.join(dataDir, 'cityPages.js'));
      for (const c of (ctx.CITY_PAGES || [])) {
        if (c.slug) urlSet.add(`${base}/${c.slug}`);
      }
    } catch {}

    // Comparison pages — /compare/:slug
    try {
      const ctx = evalFile(path.join(dataDir, 'comparisonPages.js'));
      for (const c of (ctx.COMPARISON_PAGES || [])) {
        if (c.slug) urlSet.add(`${base}/compare/${c.slug}`);
      }
    } catch {}

    // FAQ pages — /faq/:slug
    try {
      const ctx = evalFile(path.join(dataDir, 'faqPages.js'));
      for (const f of (ctx.FAQ_PAGES || [])) {
        if (f.slug) urlSet.add(`${base}/faq/${f.slug}`);
      }
    } catch {}

    let seeded = 0;
    for (const url of urlSet) {
      if (queue.visitedCount + queue.size >= maxPages) break;
      if (isCrawlable(url, allowedHost) && queue.enqueue(url, 1)) seeded++;
    }
    return seeded;
  }

  // Seed queue with ALL sitemap URLs (up to maxPages, not 30%)
  async _seedFromSitemap(startUrl, robots, allowedHost, queue, maxPages, respectRobots) {
    try {
      const sitemapUrl  = new URL('/sitemap.xml', startUrl).toString();
      const sitemapUrls = await parseSitemap(sitemapUrl, maxPages * 3); // fetch 3× more to have headroom
      let seeded = 0;
      for (const entry of sitemapUrls) {
        if (seeded >= maxPages) break;
        const norm = normalizeUrl(entry.url, startUrl);
        if (!norm) continue;
        if (!isCrawlable(norm, allowedHost)) continue;
        if (respectRobots && !robotsParser.isAllowed(norm, robots)) continue;
        if (queue.enqueue(norm, 0)) seeded++;
      }
      return { found: true, count: seeded };
    } catch {
      return { found: false, count: 0 };
    }
  }
}

const crawlEngine = new CrawlEngine();
module.exports = { CrawlEngine, crawlEngine };
