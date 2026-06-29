'use strict';

const cheerio = require('cheerio');
const { normalizeUrl, isCrawlable } = require('./normalizer');

const REQUEST_TIMEOUT_MS = 10_000;
const LARGE_PAGE_BYTES   = 500_000;

async function crawlPage(url, allowedHost) {
  const startTime = Date.now();
  let   status    = 0;

  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(url, {
        signal:   controller.signal,
        redirect: 'follow',
        headers:  {
          // Use Googlebot UA so Vercel Edge Middleware returns prerendered HTML
          // (matching SEARCH_BOT_UA regex in client/middleware.js)
          'User-Agent':    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept':        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache, no-store',
          'Pragma':        'no-cache',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    status = res.status;
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return {
        url, finalUrl: res.url, status,
        crawlTime: Date.now() - startTime,
        issues: [], discoveredUrls: [],
        title: null, metaDesc: null,
      };
    }

    const html     = await res.text();
    const pageSize = Buffer.byteLength(html, 'utf8');
    const $        = cheerio.load(html);

    // Metadata
    const title      = $('title').first().text().trim()                              || null;
    const metaDesc   = $('meta[name="description"]').attr('content')?.trim()         || null;
    const canonical  = $('link[rel="canonical"]').attr('href')?.trim()               || null;
    const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase()       || '';
    const ogTitle    = $('meta[property="og:title"]').attr('content')?.trim()        || null;
    const ogDesc     = $('meta[property="og:description"]').attr('content')?.trim()  || null;
    const ogImage    = $('meta[property="og:image"]').attr('content')?.trim()        || null;

    // Headings
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get();
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get();
    const h3s = $('h3').map((_, el) => $(el).text().trim()).get();

    // JSON-LD schemas
    const schemas = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try { schemas.push(JSON.parse($(el).html())); } catch {}
    });

    // Hreflang
    const hreflang = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflang.push({ lang: $(el).attr('hreflang'), href: $(el).attr('href') });
    });

    // Extract prerendered SEO content BEFORE stripping it.
    // #root > div[aria-hidden="true"] holds prerendered React content in the SPA
    // (hidden via CSS for regular users; crawlers may see it via Edge Middleware).
    const prerenderText = $('[aria-hidden="true"]')
      .filter((_, el) => {
        const style = $(el).attr('style') || '';
        return style.includes('display:none') || style.includes('display: none');
      })
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    const prerenderWords = prerenderText ? prerenderText.split(' ').filter(Boolean).length : 0;

    // Standard word count — strip chrome elements
    $('script, style, nav, header, footer, [aria-hidden="true"]').remove();
    const bodyWords = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;

    // Meta description word count as a floor signal
    const metaDescWords = (metaDesc || '').split(/\s+/).filter(Boolean).length;

    // Use the richest source available
    const wordCount = Math.max(prerenderWords, bodyWords, metaDescWords);

    // Images
    const images = [];
    $('img').each((_, el) => {
      const alt = $(el).attr('alt') ?? null;
      images.push({ src: $(el).attr('src') || '', alt, hasAlt: alt !== null && alt !== '' });
    });

    // Links
    const internalLinks  = [];
    const externalLinks  = [];
    const discoveredUrls = [];

    $('a[href]').each((_, el) => {
      const href     = $(el).attr('href');
      const anchor   = $(el).text().trim().slice(0, 100);
      const nofollow = ($(el).attr('rel') || '').includes('nofollow');
      const resolved = normalizeUrl(href, url);
      if (!resolved) return;

      try {
        const parsed = new URL(resolved);
        if (parsed.hostname === allowedHost) {
          internalLinks.push({ url: resolved, anchor, nofollow });
          if (isCrawlable(resolved, allowedHost)) discoveredUrls.push(resolved);
        } else if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          externalLinks.push({ url: resolved, anchor, nofollow });
        }
      } catch {}
    });

    // Issue detection
    const issues     = [];
    const isNoindex  = robotsMeta.includes('noindex');

    if (!title)                           issues.push({ type: 'MISSING_TITLE',      severity: 'error' });
    else if (title.length < 10)           issues.push({ type: 'TITLE_TOO_SHORT',    severity: 'warning', detail: `${title.length} chars` });
    else if (title.length > 70)           issues.push({ type: 'TITLE_TOO_LONG',     severity: 'warning', detail: `${title.length} chars` });

    if (!metaDesc)                        issues.push({ type: 'MISSING_META_DESC',  severity: 'error' });
    else if (metaDesc.length < 50)        issues.push({ type: 'META_DESC_SHORT',    severity: 'warning', detail: `${metaDesc.length} chars` });
    else if (metaDesc.length > 160)       issues.push({ type: 'META_DESC_LONG',     severity: 'warning', detail: `${metaDesc.length} chars` });

    if (h1s.length === 0)                 issues.push({ type: 'MISSING_H1',         severity: 'error' });
    else if (h1s.length > 1)              issues.push({ type: 'MULTIPLE_H1',        severity: 'warning', detail: `${h1s.length} H1s` });

    if (!canonical)                       issues.push({ type: 'NO_CANONICAL',       severity: 'warning' });
    if (wordCount < 300)                  issues.push({ type: 'THIN_CONTENT',       severity: 'warning', detail: `${wordCount} words` });
    if (images.some(i => !i.hasAlt))      issues.push({ type: 'MISSING_ALT',        severity: 'warning', detail: `${images.filter(i => !i.hasAlt).length} images` });
    if (schemas.length === 0)             issues.push({ type: 'NO_SCHEMA',          severity: 'info' });
    if (isNoindex)                        issues.push({ type: 'NOINDEX',            severity: 'info' });
    if (pageSize > LARGE_PAGE_BYTES)      issues.push({ type: 'LARGE_PAGE',         severity: 'warning', detail: `${Math.round(pageSize / 1024)}KB` });
    if (internalLinks.length < 3)         issues.push({ type: 'FEW_INTERNAL_LINKS', severity: 'warning', detail: `${internalLinks.length} links` });

    return {
      url,
      finalUrl:      res.url || url,
      status,
      crawlTime:     Date.now() - startTime,
      pageSize,
      title, metaDesc, canonical, robotsMeta,
      h1s, h2s, h3s,
      ogTitle, ogDesc, ogImage,
      schemas, hreflang, wordCount,
      images:        images.slice(0, 50),
      internalLinks: internalLinks.slice(0, 200),
      externalLinks: externalLinks.slice(0, 50),
      issues,
      discoveredUrls: [...new Set(discoveredUrls)],
    };

  } catch (err) {
    return {
      url,
      finalUrl:      url,
      status,
      crawlTime:     Date.now() - startTime,
      error:         err.name === 'AbortError' ? 'TIMEOUT' : err.message,
      issues:        [{ type: 'CRAWL_ERROR', severity: 'error', detail: err.message }],
      discoveredUrls: [],
    };
  }
}

module.exports = { crawlPage };
