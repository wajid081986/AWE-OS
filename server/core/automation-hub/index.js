'use strict';

const gscIndexer       = require('./gsc-indexer');
const sitemapGenerator = require('./sitemap-generator');
const socialScheduler  = require('./social-scheduler');
const publishQueue     = require('./publish-queue');

class AutomationHub {
  // GSC Indexing
  async indexUrl(url)          { return gscIndexer.requestIndexing(url); }
  async indexBatch(urls)       { return gscIndexer.batchRequestIndexing(urls); }
  async getUrlStatus(url)      { return gscIndexer.getUrlStatus(url); }
  async getIndexHistory(limit) { return gscIndexer.getIndexingHistory(limit); }
  async getQuotaUsed()         { return gscIndexer.getDailyQuotaUsed(); }

  // Sitemap
  async getSitemapStats()      { return sitemapGenerator.getSitemapStats(); }
  async generateSitemap()      {
    const urls = await sitemapGenerator.collectAllUrls();
    return sitemapGenerator.generateSitemapXml(urls);
  }
  async getAllUrls()            { return sitemapGenerator.collectAllUrls(); }

  // Social Scheduler
  async generatePosts(opts)           { return socialScheduler.generateScheduledPosts(opts); }
  async schedulePosts(posts, time)    { return socialScheduler.schedulePosts(posts, time); }
  async getSchedule(opts)             { return socialScheduler.getScheduledPosts(opts); }
  async updatePost(id, status)        { return socialScheduler.updatePostStatus(id, status); }

  // Publish Queue
  async addToQueue(item)       { return publishQueue.addToQueue(item); }
  async getQueue(status)       { return publishQueue.getQueue(status); }
  async processQueue(fns)      { return publishQueue.processQueue(fns); }
  async getQueueStats()        { return publishQueue.getQueueStats(); }
  async clearQueue(status)     { return publishQueue.clearQueue(status); }
}

const automationHub = new AutomationHub();
module.exports = { AutomationHub, automationHub };
