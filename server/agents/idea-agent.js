const { callOpenAI, parseJSONResponse } = require('../services/ai.service');

// Hard cap enforced at call-site AND here as a safety rail
const MAX_IDEAS = 5;

function buildPrompt(category, count, target_audience) {
  return `You are a micro-SaaS idea generator for solopreneur builders.

Generate exactly ${count} distinct, monetisable micro-SaaS tool ideas for the category "${category}" targeting "${target_audience}".

Return ONLY a valid JSON object with this exact structure — no explanation, no markdown:
{
  "ideas": [
    {
      "name": "Short product name (2-4 words)",
      "description": "One sentence describing what the tool does",
      "problem_solved": "Specific pain point this addresses",
      "monetization": "freemium | paid | subscription",
      "target_audience": "Specific user type",
      "complexity": "low | medium | high",
      "viability_score": 75
    }
  ]
}

Rules:
- viability_score is an integer 0-100 based on: market size, ease of build, revenue potential
- monetization MUST be exactly one of: freemium, paid, subscription
- complexity MUST be exactly one of: low, medium, high
- Return exactly ${count} ideas — no more, no fewer
- Each idea must be unique with a distinct problem`;
}

function validateIdea(idea, index) {
  const required = ['name', 'description', 'problem_solved', 'monetization', 'target_audience', 'complexity', 'viability_score'];
  for (const field of required) {
    if (idea[field] === undefined || idea[field] === null || idea[field] === '') {
      console.warn(`[IDEA AGENT] Idea[${index}] missing field: ${field} — skipping`);
      return false;
    }
  }
  if (!['freemium', 'paid', 'subscription'].includes(idea.monetization)) {
    idea.monetization = 'paid';
  }
  if (!['low', 'medium', 'high'].includes(idea.complexity)) {
    idea.complexity = 'medium';
  }
  const score = parseInt(idea.viability_score, 10);
  idea.viability_score = isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
  return true;
}

/**
 * Generate micro-SaaS ideas using AI.
 *
 * @param {string} category         - e.g. 'micro_saas'
 * @param {number} count            - max 5 per call
 * @param {string} target_audience  - e.g. 'solopreneurs'
 * @returns {Promise<Array>} Array of validated idea objects
 */
async function generateIdeas(
  category      = 'micro_saas',
  count         = 5,
  target_audience = 'solopreneurs'
) {
  const safeCount = Math.min(Math.max(1, count), MAX_IDEAS);

  console.log(`[IDEA AGENT] Generating ${safeCount} ideas | category=${category} | audience=${target_audience}`);

  const prompt = buildPrompt(category, safeCount, target_audience);
  const raw    = await callOpenAI(prompt, { temperature: 0.8, max_tokens: 2000 });
  const parsed = parseJSONResponse(raw);

  if (!Array.isArray(parsed.ideas)) {
    const err = new Error('AI response did not contain an ideas array');
    err.code   = 'PARSE_ERROR';
    err.status = 500;
    throw err;
  }

  const valid = parsed.ideas
    .filter((idea, i) => validateIdea(idea, i))
    .slice(0, safeCount);

  console.log(`[IDEA AGENT] Validated ${valid.length}/${parsed.ideas.length} ideas`);
  return valid;
}

module.exports = { generateIdeas };
