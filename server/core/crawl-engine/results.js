'use strict';

class CrawlResults {
  constructor() {
    this._pages = [];
  }

  addPage(pageData) {
    this._pages.push(pageData);
  }

  aggregate({ sitemapFound = false, robotsFound = false } = {}) {
    const pages = this._pages;
    const total = pages.length;
    if (total === 0) return this._empty();

    const statusDist   = {};
    let errorCount     = 0;
    let warningCount   = 0;
    let totalWords     = 0;
    let totalCrawlMs   = 0;
    let schemaCount    = 0;
    let canonicalCount = 0;
    let totalIntLinks  = 0;
    let httpsCount     = 0;
    const issueMap     = {};

    for (const page of pages) {
      const bucket = page.error ? 'error' : String(Math.floor((page.status || 0) / 100) * 100);
      statusDist[bucket] = (statusDist[bucket] || 0) + 1;

      if (page.schemas?.length > 0) schemaCount++;
      if (page.canonical)            canonicalCount++;
      if (page.url?.startsWith('https://')) httpsCount++;
      totalWords   += page.wordCount  || 0;
      totalCrawlMs += page.crawlTime  || 0;
      totalIntLinks += (page.internalLinks || []).length;

      for (const issue of (page.issues || [])) {
        if (issue.severity === 'error')   errorCount++;
        if (issue.severity === 'warning') warningCount++;

        if (!issueMap[issue.type]) {
          issueMap[issue.type] = { type: issue.type, severity: issue.severity, count: 0, urls: [] };
        }
        issueMap[issue.type].count++;
        if (issueMap[issue.type].urls.length < 10) issueMap[issue.type].urls.push(page.url);
      }
    }

    const avgWords    = Math.round(totalWords   / total);
    const avgCrawlMs  = Math.round(totalCrawlMs / total);
    const avgIntLinks = totalIntLinks / total;
    const allHttps    = httpsCount === total;
    const schemaPct   = schemaCount / total;

    // 1. Content Quality (30 pts max)
    const contentQuality = avgWords >= 600 ? 30 : avgWords >= 400 ? 20 : avgWords >= 200 ? 10 : 0;

    // 2. Technical SEO (25 pts max)
    const techErrors  = errorCount === 0 ? 10 : Math.max(0, 10 - Math.round(errorCount / total * 10));
    const techHttps   = allHttps    ? 5  : 0;
    const techSitemap = sitemapFound ? 5 : 0;
    const techRobots  = robotsFound  ? 5 : 0;
    const technicalSeo = techErrors + techHttps + techSitemap + techRobots;

    // 3. Page Coverage (20 pts max)
    const pageCoverage = total >= 100 ? 20 : total >= 50 ? 15 : total >= 20 ? 10 : 5;

    // 4. Internal Linking (15 pts max)
    const internalLinking = avgIntLinks >= 5 ? 15 : avgIntLinks >= 3 ? 10 : avgIntLinks >= 1 ? 5 : 0;

    // 5. Schema Markup (10 pts max)
    const schemaScore = schemaPct >= 0.8 ? 10 : schemaPct >= 0.5 ? 7 : schemaPct >= 0.2 ? 4 : 0;

    const score = contentQuality + technicalSeo + pageCoverage + internalLinking + schemaScore;

    // Grade scale per spec
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B'
                : score >= 50 ? 'C'  : score >= 40 ? 'D' : 'F';

    return {
      summary: { totalPages: total, score, grade, errorCount, warningCount, schemaCount, canonicalCount },
      health:  { score, grade },
      scoreBreakdown: {
        contentQuality:  { score: contentQuality,  max: 30, label: 'Content Quality', detail: `Avg ${avgWords} words/page (target 600+)` },
        technicalSeo:    { score: technicalSeo,    max: 25, label: 'Technical SEO',   detail: `${errorCount} errors · HTTPS: ${allHttps ? 'Yes' : 'No'}` },
        pageCoverage:    { score: pageCoverage,    max: 20, label: 'Page Coverage',   detail: `${total} pages crawled (target 100+)` },
        internalLinking: { score: internalLinking, max: 15, label: 'Internal Links',  detail: `Avg ${avgIntLinks.toFixed(1)} links/page (target 5+)` },
        schemaMarkup:    { score: schemaScore,     max: 10, label: 'Schema Markup',   detail: `${Math.round(schemaPct * 100)}% pages with schema` },
      },
      averages: { words: avgWords, crawlTime: avgCrawlMs },
      statusDistribution: statusDist,
      issues: Object.values(issueMap).sort((a, b) => b.count - a.count),
      pages: pages.map(p => {
        const hasSchema     = (p.schemas || []).length > 0;
        const intLinksCount = (p.internalLinks || []).length;
        const issueCount    = (p.issues || []).length;
        const wordCount     = p.wordCount || 0;

        // Per-page score (0-100)
        const wScore = wordCount > 600 ? 40 : wordCount > 400 ? 25 : wordCount > 200 ? 10 : 0;
        const sScore = hasSchema ? 20 : 0;
        const lScore = intLinksCount > 3 ? 20 : 0;
        const iScore = issueCount === 0 ? 20 : 0;

        return {
          url:          p.url,
          status:       p.status,
          title:        p.title,
          wordCount:    p.wordCount,
          crawlTime:    p.crawlTime,
          issues:       issueCount,
          error:        p.error || null,
          hasSchema,
          internalLinks: intLinksCount,
          pageScore:    wScore + sScore + lScore + iScore,
          adsenseSafe:  wordCount > 300,
        };
      }),
    };
  }

  _empty() {
    return {
      summary:  { totalPages: 0, score: 0, grade: 'F', errorCount: 0, warningCount: 0, schemaCount: 0, canonicalCount: 0 },
      health:   { score: 0, grade: 'F' },
      scoreBreakdown: {
        contentQuality:  { score: 0, max: 30, label: 'Content Quality', detail: 'No data' },
        technicalSeo:    { score: 0, max: 25, label: 'Technical SEO',   detail: 'No data' },
        pageCoverage:    { score: 0, max: 20, label: 'Page Coverage',   detail: 'No data' },
        internalLinking: { score: 0, max: 15, label: 'Internal Links',  detail: 'No data' },
        schemaMarkup:    { score: 0, max: 10, label: 'Schema Markup',   detail: 'No data' },
      },
      averages: { words: 0, crawlTime: 0 },
      statusDistribution: {},
      issues: [],
      pages:  [],
    };
  }
}

module.exports = { CrawlResults };
