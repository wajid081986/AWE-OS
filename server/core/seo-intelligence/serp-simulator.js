'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Explicit per-call ceiling instead of the SDK's ~10min default.
const OPENAI_CALL_OPTS = { timeout: 60_000, maxRetries: 3 };

async function analyzeSerpFeatures(keyword, opts = {}) {
  const { country = 'India' } = opts;
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `
Analyze SERP features for keyword: "${keyword}" in ${country}.

Return JSON:
{
  "keyword": "${keyword}",
  "serpFeatures": {
    "featuredSnippet": {
      "likely": true,
      "type": "paragraph|list|table|none",
      "howToGet": "specific advice"
    },
    "peopleAlsoAsk": {
      "likely": true,
      "questions": ["question 1", "question 2", "question 3"]
    },
    "localPack": { "likely": false },
    "videoResults": { "likely": false },
    "imageResults": { "likely": false },
    "knowledgePanel": { "likely": false },
    "sitelinks": { "likely": false }
  },
  "winningContentFormat": "article|tool|calculator|video|list|comparison",
  "optimalWordCount": 1500,
  "requiredElements": ["FAQ section", "comparison table"],
  "schemaRecommended": ["FAQ", "HowTo", "Article"],
  "rankingFactors": [
    {
      "factor": "what matters most",
      "importance": "critical|high|medium",
      "howToOptimize": "specific advice"
    }
  ],
  "estimatedCTR": {
    "position1": "25-35%",
    "position3": "10-15%",
    "position10": "1-2%"
  }
}
Return ONLY JSON.`,
    }],
  }, OPENAI_CALL_OPTS);

  return parseAIJson(res.choices[0].message.content) || {};
}

module.exports = { analyzeSerpFeatures };
