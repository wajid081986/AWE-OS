'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

// Explicit per-call ceiling instead of the SDK's ~10min default.
const OPENAI_CALL_OPTS = { timeout: 60_000, maxRetries: 3 };

async function scoreContent(content, opts = {}) {
  const {
    targetKeyword  = '',
    contentType    = 'blog',
    targetAudience = 'Indian users'
  } = opts;

  const openai = getOpenAI();

  const wordCount      = content.split(/\s+/).filter(Boolean).length;
  const sentences      = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const avgSentenceLen = sentences.length
    ? Math.round(wordCount / sentences.length)
    : 0;
  const paragraphs   = content.split(/\n\n+/).filter(p => p.trim().length > 50);
  const hasH2s       = (content.match(/^##\s/gm) || []).length;
  const hasLists     = (content.match(/^[-*]\s/gm) || []).length;
  const keywordCount = targetKeyword
    ? (content.toLowerCase().match(
        new RegExp(targetKeyword.toLowerCase(), 'g')
      ) || []).length
    : 0;
  const keywordDensity = targetKeyword && wordCount
    ? ((keywordCount / wordCount) * 100).toFixed(2)
    : 0;

  const scorePrompt = `
Score this content across these dimensions (0-100 each):

CONTENT:
"""
${content.slice(0, 2500)}
"""

TARGET KEYWORD: "${targetKeyword}"
CONTENT TYPE: ${contentType}
AUDIENCE: ${targetAudience}
WORD COUNT: ${wordCount}

Score each dimension:

1. SEO Score (0-100):
   - Keyword usage (natural, not stuffed)
   - Heading structure (H2/H3 hierarchy)
   - Meta-worthy intro
   - Internal link opportunities

2. Readability Score (0-100):
   - Sentence length variety
   - Simple vs complex words ratio
   - Paragraph length
   - Use of lists/tables for clarity

3. Engagement Score (0-100):
   - Hook strength (first 100 words)
   - Storytelling/examples
   - Actionable advice
   - Reader benefit clarity

4. E-E-A-T Score (0-100):
   - Expertise signals
   - Specific data/statistics
   - Author knowledge evident
   - Trustworthy tone

5. India Relevance Score (0-100):
   - Indian examples/context
   - Local relevance
   - Appropriate for Indian audience
   - Cultural sensitivity

Return JSON:
{
  "scores": {
    "seo":            { "score": 0-100, "grade": "A-F", "issues": [], "improvements": [] },
    "readability":    { "score": 0-100, "grade": "A-F", "issues": [], "improvements": [] },
    "engagement":     { "score": 0-100, "grade": "A-F", "issues": [], "improvements": [] },
    "eeat":           { "score": 0-100, "grade": "A-F", "issues": [], "improvements": [] },
    "indiaRelevance": { "score": 0-100, "grade": "A-F", "issues": [], "improvements": [] }
  },
  "overall": {
    "score": 0-100,
    "grade": "A-F",
    "verdict": "one sentence summary",
    "topStrengths": ["strength 1", "strength 2"],
    "topIssues": ["issue 1", "issue 2"],
    "priorityFixes": [
      {
        "fix": "specific thing to change",
        "impact": "high|medium|low",
        "effort": "low|medium|high"
      }
    ]
  },
  "readyToPublish": true,
  "publishBlockers": ["any must-fix before publishing"]
}
Return ONLY JSON.`.trim();

  const res = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  2000,
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a content quality expert. Return only valid JSON.' },
      { role: 'user',   content: scorePrompt }
    ]
  }, OPENAI_CALL_OPTS);

  const aiScores = parseAIJson(
    res.choices[0].message.content
  ) || { scores: {}, overall: { score: 50 } };

  return {
    ...aiScores,
    structural: {
      wordCount,
      sentenceCount:     sentences.length,
      avgSentenceLength: avgSentenceLen,
      paragraphCount:    paragraphs.length,
      h2Count:           hasH2s,
      listItems:         hasLists,
      keywordCount,
      keywordDensity:    `${keywordDensity}%`,
      keywordTarget:     '1.0-2.0%',
      keywordOptimal:    parseFloat(keywordDensity) >= 1 &&
                         parseFloat(keywordDensity) <= 2
    },
    scoredAt: new Date().toISOString()
  };
}

module.exports = { scoreContent };
