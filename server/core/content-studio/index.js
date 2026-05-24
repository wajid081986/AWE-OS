'use strict';

const { humanizeContent }                                    = require('./humanizer');
const { optimizeForSnippet }                                 = require('./snippet-optimizer');
const { generateBrief }                                      = require('./brief-generator');
const { translateContent, generateHindiContent,
        generateBilingualContent }                           = require('./multilingual');
const { scoreContent }                                       = require('./content-scorer');

class ContentStudio {
  async humanize(content, opts)            { return humanizeContent(content, opts); }
  async snippetOptimize(content, kw, opts) { return optimizeForSnippet(content, kw, opts); }
  async brief(opts)                        { return generateBrief(opts); }
  async translate(content, opts)           { return translateContent(content, opts); }
  async hindiContent(topic, opts)          { return generateHindiContent(topic, opts); }
  async bilingual(topic, opts)             { return generateBilingualContent(topic, opts); }
  async score(content, opts)               { return scoreContent(content, opts); }
}

const contentStudio = new ContentStudio();
module.exports = { ContentStudio, contentStudio };
