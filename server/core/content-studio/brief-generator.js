'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

async function generateBrief(opts = {}) {
  const {
    topic,
    targetKeyword,
    secondaryKeywords = [],
    contentType       = 'blog',
    targetAudience    = 'Indian professionals and students',
    wordCount         = 1500,
    competitors       = []
  } = opts;

  const openai = getOpenAI();

  const briefPrompt = `
Create a comprehensive SEO content brief for:

TOPIC: ${topic}
PRIMARY KEYWORD: ${targetKeyword}
SECONDARY KEYWORDS: ${secondaryKeywords.join(', ')}
CONTENT TYPE: ${contentType}
TARGET AUDIENCE: ${targetAudience}
TARGET WORD COUNT: ${wordCount}
${competitors.length ? `COMPETITORS TO BEAT: ${competitors.join(', ')}` : ''}

Generate a complete brief that a writer can use to create
top-ranking content. Include everything needed.

Return JSON:
{
  "brief": {
    "title": "Exact article title (compelling + keyword-rich)",
    "metaTitle": "SEO title max 60 chars with keyword",
    "metaDescription": "Compelling meta desc max 155 chars with CTA",
    "h1": "H1 tag (can differ slightly from title)",
    "url": "suggested-url-slug",

    "targetKeyword": "${targetKeyword}",
    "secondaryKeywords": [],
    "lsiKeywords": ["related terms to naturally include"],
    "keywordDensity": "1-2% for primary keyword",

    "searchIntent": "informational|commercial|transactional|navigational",
    "targetAudience": "${targetAudience}",
    "contentGoal": "what this content should achieve",

    "outline": [
      {
        "type": "h2|h3",
        "heading": "Section heading",
        "wordCount": 200,
        "keyPoints": ["key point 1", "key point 2"],
        "includeElements": ["table|list|image|callout|example"],
        "keywords": ["keywords to use in this section"]
      }
    ],

    "introGuide": {
      "hook": "how to open the article",
      "includeStats": true,
      "wordCount": 150,
      "mustInclude": ["what must be in intro"]
    },

    "conclusionGuide": {
      "summary": "how to conclude",
      "cta": "call to action to add",
      "wordCount": 100
    },

    "faqs": [
      {
        "question": "FAQ question",
        "answer": "Brief answer guide (expand in writing)",
        "targetsPAA": true
      }
    ],

    "contentRequirements": {
      "minimumWordCount": ${wordCount},
      "readingLevel": "8th grade / simple English",
      "tone": "helpful, conversational, expert",
      "perspective": "second person (you/your)",
      "mustAvoid": ["passive voice excess", "jargon without explanation"],
      "mustInclude": ["Indian examples", "specific numbers", "actionable tips"]
    },

    "seoRequirements": {
      "keywordInFirstParagraph": true,
      "keywordInLastParagraph": true,
      "keywordInAtLeastOneH2": true,
      "internalLinksCount": "3-5",
      "externalLinksCount": "1-2",
      "imagesCount": "2-3",
      "schemaType": "Article|FAQ|HowTo"
    },

    "competitorGaps": [
      "topics/angles competitors miss that we should cover"
    ],

    "uniqueAngle": "what makes this article different from all others",

    "estimatedTime": "X hours to write",
    "difficulty": "easy|medium|hard"
  }
}
Return ONLY JSON.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o',
    max_tokens:  3000,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are an expert SEO content strategist specializing in Indian market content. Return only valid JSON.`
      },
      { role: 'user', content: briefPrompt }
    ]
  });

  const result = parseAIJson(res.choices[0].message.content) || {};

  return {
    ...result,
    generatedAt: new Date().toISOString()
  };
}

module.exports = { generateBrief };
