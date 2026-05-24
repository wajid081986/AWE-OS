'use strict';

const cheerio = require('cheerio');

async function parseSitemap(sitemapUrl, maxUrls = 500) {
  const results  = [];
  const queue    = [sitemapUrl];
  const visited  = new Set();

  while (queue.length > 0 && results.length < maxUrls) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const res = await fetch(url, {
        signal:  AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'AWE-OS Crawler' },
      });
      if (!res.ok) continue;

      const text = await res.text();
      const $    = cheerio.load(text, { xmlMode: true });

      // Sitemap index → recurse into child sitemaps
      const childLocs = $('sitemapindex sitemap loc');
      if (childLocs.length > 0) {
        childLocs.each((_, el) => {
          const loc = $(el).text().trim();
          if (loc && !visited.has(loc)) queue.push(loc);
        });
        continue;
      }

      // Regular sitemap
      $('urlset url').each((_, el) => {
        if (results.length >= maxUrls) return false;
        const $el = $(el);
        const loc = $el.find('loc').first().text().trim();
        if (!loc) return;
        results.push({
          url:        loc,
          lastmod:    $el.find('lastmod').first().text().trim()    || null,
          priority:   $el.find('priority').first().text().trim()   || null,
          changefreq: $el.find('changefreq').first().text().trim() || null,
        });
      });
    } catch {
      // Unreadable sitemaps are silently skipped
    }
  }

  return results;
}

module.exports = { parseSitemap };
