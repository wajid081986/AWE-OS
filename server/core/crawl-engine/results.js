'use strict';

class CrawlResults {
  constructor() {
    this._pages = [];
  }

  addPage(pageData) {
    this._pages.push(pageData);
  }

  aggregate() {
    const pages = this._pages;
    const total = pages.length;
    if (total === 0) return this._empty();

    const statusDist  = {};
    let errorCount    = 0;
    let warningCount  = 0;
    let totalWords    = 0;
    let totalCrawlMs  = 0;
    let schemaCount   = 0;
    let canonicalCount = 0;
    const issueMap    = {};

    for (const page of pages) {
      const bucket = page.error ? 'error' : String(Math.floor((page.status || 0) / 100) * 100);
      statusDist[bucket] = (statusDist[bucket] || 0) + 1;

      if (page.schemas?.length > 0) schemaCount++;
      if (page.canonical)            canonicalCount++;
      totalWords   += page.wordCount  || 0;
      totalCrawlMs += page.crawlTime  || 0;

      for (const issue of (page.issues || [])) {
        if (issue.severity === 'error')   errorCount++;
        if (issue.severity === 'warning') warningCount++;

        if (!issueMap[issue.type]) {
          issueMap[issue.type] = { type: issue.type, severity: issue.severity, count: 0, urls: [] };
        }
        issueMap[issue.type].count++;
        if (issueMap[issue.type].urls.length < 5) issueMap[issue.type].urls.push(page.url);
      }
    }

    // Score: 40% no-errors + 30% no-warnings + 15% schema + 15% canonical
    const score = Math.round(
      Math.max(0, 1 - errorCount    / total) * 40 +
      Math.max(0, 1 - warningCount  / total) * 30 +
      (schemaCount    / total) * 15 +
      (canonicalCount / total) * 15
    );

    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return {
      summary: { totalPages: total, score, grade, errorCount, warningCount, schemaCount, canonicalCount },
      health:  { score, grade },
      averages: {
        words:     Math.round(totalWords   / total),
        crawlTime: Math.round(totalCrawlMs / total),
      },
      statusDistribution: statusDist,
      issues: Object.values(issueMap).sort((a, b) => b.count - a.count),
      pages:  pages.map(p => ({
        url:       p.url,
        status:    p.status,
        title:     p.title,
        wordCount: p.wordCount,
        crawlTime: p.crawlTime,
        issues:    (p.issues || []).length,
        error:     p.error || null,
      })),
    };
  }

  _empty() {
    return {
      summary:  { totalPages: 0, score: 0, grade: 'F', errorCount: 0, warningCount: 0, schemaCount: 0, canonicalCount: 0 },
      health:   { score: 0, grade: 'F' },
      averages: { words: 0, crawlTime: 0 },
      statusDistribution: {},
      issues: [],
      pages:  [],
    };
  }
}

module.exports = { CrawlResults };
