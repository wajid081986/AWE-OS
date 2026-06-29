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

// Compute word count from content-block arrays (city/compare/faq data structure)
function countBlockWords(content, faqs) {
  const blockText = (content || []).map(block => {
    if (['p', 'h1', 'h2', 'h3', 'callout'].includes(block.type)) return block.text || '';
    if (block.type === 'ul')    return (block.items  || []).join(' ');
    if (block.type === 'table') return [
      (block.headers || []).join(' '),
      ...(block.rows || []).map(r => r.join(' ')),
    ].join(' ');
    return '';
  }).join(' ');

  const faqText = (faqs || [])
    .map(f => `${f.q || ''} ${f.a || ''}`)
    .join(' ');

  return [blockText, faqText]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .length;
}

class CrawlEngine {
  constructor() {
    this._activeCrawls = new Map();
    this._dataCache    = null;
  }

  // Load + cache city/compare/faq/blog data once per process
  _loadDataCache() {
    if (this._dataCache) return this._dataCache;

    const dataDir = path.resolve(__dirname, '../../../client/src/data');

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

    const cityCtx    = evalFile(path.join(dataDir, 'cityPages.js'));
    const compCtx    = evalFile(path.join(dataDir, 'comparisonPages.js'));
    const faqCtx     = evalFile(path.join(dataDir, 'faqPages.js'));
    const blogCtx    = evalFile(path.join(dataDir, 'blogPosts.js'));

    this._dataCache = {
      cityPages:   cityCtx.CITY_PAGES        || [],
      comparisons: compCtx.COMPARISON_PAGES  || [],
      faqPages:    faqCtx.FAQ_PAGES          || [],
      blogPosts:   blogCtx.BLOG_POSTS        || [],
    };
    return this._dataCache;
  }

  // Return data-based word count for pages that aren't prerendered by the Edge Middleware
  // (city, compare, faq pages, and blog posts whose full content isn't in the middleware)
  _dataWordCount(url, base) {
    const pathname = url.replace(base, '').replace(/\/$/, '') || '/';
    const data     = this._loadDataCache();

    // Blog post: /blog/:slug
    const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const post = data.blogPosts.find(p => p.slug === blogMatch[1]);
      if (post) return countBlockWords(post.content, post.faqs || []);
    }

    // City page: /:toolSlug/:city (e.g. /bmi-calculator/mumbai)
    const cityMatch = pathname.match(/^\/([^/]+)\/([^/]+)$/);
    if (cityMatch) {
      const reserved = new Set(['tools', 'blog', 'compare', 'faq', 'about', 'contact',
                                 'pricing', 'privacy-policy', 'privacy', 'terms', 'disclaimer']);
      if (!reserved.has(cityMatch[1])) {
        const citySlug = `${cityMatch[1]}/${cityMatch[2]}`;
        const cityPage = data.cityPages.find(c => c.slug === citySlug);
        if (cityPage) return countBlockWords(cityPage.content, cityPage.faqs || []);
      }
    }

    // Comparison page: /compare/:slug
    const compareMatch = pathname.match(/^\/compare\/([^/]+)$/);
    if (compareMatch) {
      const comp = data.comparisons.find(c => c.slug === compareMatch[1]);
      if (comp) return countBlockWords(comp.content, comp.faqs || []);
    }

    // FAQ page: /faq/:slug
    const faqMatch = pathname.match(/^\/faq\/([^/]+)$/);
    if (faqMatch) {
      const faq = data.faqPages.find(f => f.slug === faqMatch[1]);
      if (faq) return countBlockWords(null, faq.faqs || []);
    }

    return 0;
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

      // Override word count from local data for pages the Edge Middleware doesn't prerender.
      // The Googlebot UA gets prerendered HTML for /tools/* and /blog/* from middleware.js,
      // but city pages (/:tool/:city), /compare/*, and /faq/* aren't in the middleware matcher,
      // so they return the SPA shell. Use the richer local data count when available.
      if (!pageData.error) {
        const base = startUrl.replace(/\/+$/, '');
        const dataWords = this._dataWordCount(url, base);
        if (dataWords > (pageData.wordCount || 0)) {
          pageData.wordCount = dataWords;
          // Recompute THIN_CONTENT issue with corrected word count
          pageData.issues = (pageData.issues || []).filter(i => i.type !== 'THIN_CONTENT');
          if (dataWords < 300) {
            pageData.issues.push({ type: 'THIN_CONTENT', severity: 'warning', detail: `${dataWords} words` });
          }
        }
      }

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

    // Static + category pages
    for (const p of [
      '/', '/about', '/tools', '/blog', '/contact', '/privacy-policy', '/terms', '/disclaimer',
      '/tools/pdf', '/tools/calculators', '/tools/converters', '/tools/ai',
    ]) {
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
