'use strict';
const { getOpenAI } = require('../ai-engine');
const parseAIJson   = require('../../services/parseAIJson');

async function optimizeForSnippet(content, keyword, opts = {}) {
  const {
    snippetType   = 'auto',
    targetCountry = 'India'
  } = opts;

  const openai = getOpenAI();

  const detectPrompt = `
For keyword "${keyword}" in ${targetCountry},
what type of featured snippet is most likely?

Return JSON:
{
  "bestSnippetType": "paragraph|list|table|steps",
  "reason": "why this type",
  "googlePreference": "what Google shows for this query type",
  "optimalLength": {
    "paragraph": "40-60 words",
    "list": "5-8 items",
    "table": "3-5 rows",
    "steps": "4-6 steps"
  }
}
Return ONLY JSON.`.trim();

  const detectRes = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  400,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user',   content: detectPrompt }
    ]
  });

  const detection = parseAIJson(
    detectRes.choices[0].message.content
  ) || { bestSnippetType: 'paragraph' };

  const finalType = snippetType === 'auto'
    ? detection.bestSnippetType
    : snippetType;

  const snippetPrompt = `
Create a featured snippet optimized block for:
Keyword: "${keyword}"
Snippet Type: ${finalType}
Country: ${targetCountry}

Based on this existing content:
"""
${content.slice(0, 2000)}
"""

Create the PERFECT featured snippet block that Google would show.

Rules by type:
- paragraph: 40-60 words, starts with direct answer, includes keyword
- list: 5-8 bullet points, each 6-10 words, parallel structure
- table: 3-5 rows, clear headers, comparative data
- steps: 4-6 numbered steps, each starts with action verb

Also provide:
1. The H2 heading to put ABOVE the snippet block
2. The snippet content itself (formatted for ${finalType})
3. The follow-up sentence after the snippet block

Return JSON:
{
  "snippetType": "${finalType}",
  "h2Heading": "Heading to place above snippet",
  "snippetContent": {
    "type": "${finalType}",
    "content": "paragraph text OR array of items OR table data"
  },
  "followUpSentence": "sentence after snippet block",
  "implementationInstructions": "exactly where/how to add to article",
  "estimatedSnippetProbability": "high|medium|low",
  "additionalOptimizations": [
    "other things to add to the page to help win snippet"
  ]
}
Return ONLY JSON.`.trim();

  const snippetRes = await openai.chat.completions.create({
    model:       'gpt-4o',
    max_tokens:  1500,
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a featured snippet expert. Return only valid JSON.' },
      { role: 'user',   content: snippetPrompt }
    ]
  });

  const snippet = parseAIJson(
    snippetRes.choices[0].message.content
  ) || {};

  const paaPrompt = `
Generate 6 "People Also Ask" questions and answers for:
Keyword: "${keyword}"
Country: ${targetCountry}

Return JSON:
{
  "questions": [
    {
      "question": "exact PAA question",
      "answer": "concise 2-3 sentence answer (40-60 words)",
      "answerType": "paragraph|steps|list"
    }
  ]
}
Return ONLY JSON.`.trim();

  const paaRes = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  1000,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user',   content: paaPrompt }
    ]
  });

  const paa = parseAIJson(
    paaRes.choices[0].message.content
  ) || { questions: [] };

  return {
    keyword,
    targetCountry,
    detectedSnippetType: detection.bestSnippetType,
    usedSnippetType:     finalType,
    snippet,
    paa,
    implementationGuide: {
      step1: 'Add the H2 heading near the top of your article',
      step2: 'Place the snippet block immediately after the H2',
      step3: 'Add PAA section as FAQ at the bottom of the article',
      step4: 'Add FAQ schema JSON-LD using all PAA questions',
      step5: 'Make sure target keyword is in H1, meta title, and first paragraph'
    },
    optimizedAt: new Date().toISOString()
  };
}

module.exports = { optimizeForSnippet };
