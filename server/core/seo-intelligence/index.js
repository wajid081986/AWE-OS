'use strict';

const { researchKeywords, checkKeywordDifficulty } =
  require('./keyword-engine');
const { analyzeCompetitorGap, identifyCompetitors } =
  require('./competitor-engine');
const { findContentOpportunities, generateContentBrief } =
  require('./content-engine');
const { analyzeInternalLinks, fixOrphanPages } =
  require('./link-intelligence');
const { analyzeSerpFeatures } =
  require('./serp-simulator');

class SeoIntelligenceEngine {
  async keywordResearch(keyword, opts)         { return researchKeywords(keyword, opts); }
  async keywordDifficulty(keyword)             { return checkKeywordDifficulty(keyword); }
  async competitorGap(ourUrl, compUrls, topic) { return analyzeCompetitorGap(ourUrl, compUrls, topic); }
  async findCompetitors(keyword, domain)       { return identifyCompetitors(keyword, domain); }
  async contentOpportunities(opts)             { return findContentOpportunities(opts); }
  async contentBrief(opportunity)              { return generateContentBrief(opportunity); }
  async internalLinks(pages, targetUrl)        { return analyzeInternalLinks(pages, targetUrl); }
  async fixOrphans(orphans, pages)             { return fixOrphanPages(orphans, pages); }
  async serpAnalysis(keyword, opts)            { return analyzeSerpFeatures(keyword, opts); }
}

const seoIntelligence = new SeoIntelligenceEngine();
module.exports = { SeoIntelligenceEngine, seoIntelligence };
