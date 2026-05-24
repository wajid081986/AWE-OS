'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

async function researchKeywords(seedKeyword, opts = {}) {
  const {
    country     = 'India',
    language    = 'English',
    toolSlug    = null,
    maxKeywords = 50,
  } = opts;

  const openai = getOpenAI();

  const keywordPrompt = `
You are an expert SEO keyword researcher for Indian market.

Seed keyword: "${seedKeyword}"
Country: ${country}
Language: ${language}
${toolSlug ? `Tool/Product: ${toolSlug}` : ''}

Generate ${maxKeywords} keyword variations. Include:
- Short tail (1-2 words)
- Long tail (3-5 words)
- Question keywords (what, how, why, which)
- Comparison keywords (vs, alternative, best)
- Local Indian variants
- Year-based variants (2025, 2026)

For each keyword return JSON array:
[{
  "keyword": "exact keyword phrase",
  "searchIntent": "informational|navigational|commercial|transactional",
  "difficulty": "low|medium|high",
  "estimatedVolume": "low(<1k)|medium(1k-10k)|high(10k-100k)|very_high(100k+)",
  "cpc": "low|medium|high",
  "indiaRelevant": true,
  "priority": 1
}]

Return ONLY the JSON array. No explanation.
`.trim();

  const kwRes = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 3000,
    messages: [
      { role: 'system', content: 'You are an SEO keyword research expert. Return only valid JSON.' },
      { role: 'user',   content: keywordPrompt },
    ],
  });

  const keywords = parseAIJson(kwRes.choices[0].message.content) || [];

  const clusterPrompt = `
Cluster these ${keywords.length} keywords into topic groups for content planning.

Keywords: ${JSON.stringify(keywords.map(k => k.keyword))}

Return JSON:
{
  "clusters": [
    {
      "clusterName": "Topic Group Name",
      "pillarKeyword": "main keyword for this cluster",
      "intent": "informational|commercial|transactional",
      "keywords": ["keyword1", "keyword2"],
      "contentSuggestion": "Suggested article/page title",
      "priority": "high|medium|low"
    }
  ]
}

Return ONLY JSON. No explanation.
`.trim();

  const clusterRes = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: 'You are an SEO content strategist. Return only valid JSON.' },
      { role: 'user',   content: clusterPrompt },
    ],
  });

  const clusters = parseAIJson(clusterRes.choices[0].message.content) || { clusters: [] };

  const keywordMap = {};
  keywords.forEach(k => { keywordMap[k.keyword] = k; });

  clusters.clusters = (clusters.clusters || []).map(cluster => ({
    ...cluster,
    keywordData:   cluster.keywords.map(kw => keywordMap[kw] || { keyword: kw }),
    totalKeywords: cluster.keywords.length,
  }));

  return {
    seedKeyword,
    country,
    totalKeywords:    keywords.length,
    totalClusters:    clusters.clusters.length,
    keywords:         keywords.sort((a, b) => b.priority - a.priority),
    clusters:         clusters.clusters,
    topOpportunities: keywords
      .filter(k => k.difficulty === 'low' && k.estimatedVolume !== 'low(<1k)')
      .slice(0, 10),
    analyzedAt: new Date().toISOString(),
  };
}

async function checkKeywordDifficulty(keyword) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `
Analyze SEO difficulty for keyword: "${keyword}" in India.

Return JSON:
{
  "keyword": "${keyword}",
  "difficulty": "low|medium|high|very_high",
  "difficultyScore": 45,
  "searchIntent": "informational|navigational|commercial|transactional",
  "estimatedVolume": "low|medium|high|very_high",
  "topCompetitors": ["site1.com", "site2.com", "site3.com"],
  "rankingOpportunity": "high|medium|low",
  "recommendation": "one sentence advice",
  "contentType": "article|tool|calculator|comparison|faq"
}
Return ONLY JSON.`,
    }],
  });

  return parseAIJson(res.choices[0].message.content) || {};
}

module.exports = { researchKeywords, checkKeywordDifficulty };
