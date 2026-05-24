'use strict';

const { CrawlQueue }   = require('./queue');
const { robotsParser } = require('./robots');
const { parseSitemap } = require('./sitemap');
const { crawlPage }    = require('./crawler');
const { CrawlGraph }   = require('./graph');
const { CrawlResults } = require('./results');
const { normalizeUrl, isCrawlable } = require('./normalizer');

class CrawlEngine {
  constructor() {
    this._activeCrawls = new Map(); // crawlId → AbortController (reserved for future cancel support)
  }

  async crawl(startUrl, opts = {}) {
    const {
      maxPages      = 100,
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
    let robots = {};
    if (respectRobots) {
      try { robots = await robotsParser.fetch(startUrl); } catch {}
    }

    // Seed from sitemap (up to 30% of page cap)
    if (followSitemap) {
      await this._seedFromSitemap(startUrl, robots, allowedHost, queue, Math.floor(maxPages * 0.3), respectRobots);
    }

    // Always include the start URL
    const normStart = normalizeUrl(startUrl, startUrl);
    if (normStart) queue.enqueue(normStart, 0);

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
        onProgress({
          url,
          visited:    queue.visitedCount,
          queued:     queue.size,
          issueCount: (pageData.issues || []).length,
        });
      }

      if (delayMs > 0 && !queue.isEmpty) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    const report = results.aggregate();

    report.graph = {
      orphanPages:        graph.getOrphans(),
      highAuthorityPages: graph.getHighAuthority(10),
      deepPages:          graph.getDeepPages(maxDepth),
    };

    report.metadata = {
      startUrl,
      allowedHost,
      crawledAt: new Date().toISOString(),
      maxPages,
      maxDepth,
    };

    return report;
  }

  async _seedFromSitemap(startUrl, robots, allowedHost, queue, cap, respectRobots) {
    try {
      const sitemapUrl  = new URL('/sitemap.xml', startUrl).toString();
      const sitemapUrls = await parseSitemap(sitemapUrl, cap * 2);
      let seeded = 0;
      for (const entry of sitemapUrls) {
        if (seeded >= cap) break;
        const norm = normalizeUrl(entry.url, startUrl);
        if (!norm) continue;
        if (!isCrawlable(norm, allowedHost)) continue;
        if (respectRobots && !robotsParser.isAllowed(norm, robots)) continue;
        if (queue.enqueue(norm, 0)) seeded++;
      }
    } catch {
      // Sitemap is optional
    }
  }
}

const crawlEngine = new CrawlEngine();
module.exports = { CrawlEngine, crawlEngine };
