const OpenAI = require('openai');

// Initialised lazily so the server can boot even without OPENAI_API_KEY
// (key absence is caught at call-time with a clear error).
let _client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY environment variable is not set');
    err.code  = 'AI_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

/**
 * Send a prompt to OpenAI and return the raw text response.
 *
 * @param {string} prompt               - The user message to send
 * @param {object} [options]
 * @param {string} [options.model]      - Model ID (default: gpt-4o-mini)
 * @param {number} [options.max_tokens] - Token limit (default: 8000)
 * @param {number} [options.temperature]- 0 = deterministic, 1 = creative (default: 0.4)
 * @param {number} [options.timeout]    - Abort timeout ms (default: 120000)
 * @param {string} [options.systemPrompt] - Optional system-role message prepended before user prompt
 * @returns {Promise<string>} Raw text content of the first completion choice
 */
async function callOpenAI(prompt, options = {}) {
  const client      = getClient();
  const model       = options.model       || 'gpt-4o-mini';
  const maxTokens   = options.max_tokens  || 8000;
  const temperature = options.temperature ?? 0.4;

  const timeoutMs  = options.timeout || 120_000;
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  const messages = options.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  let response;
  try {
    response = await client.chat.completions.create(
      { model, messages, max_tokens: maxTokens, temperature },
      { signal: controller.signal }
    );
  } catch (err) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      const timeoutErr = new Error(`OpenAI request timed out after ${timeoutMs / 1000}s`);
      timeoutErr.code   = 'AI_TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error('OpenAI returned an empty response');
    err.code  = 'AI_UNAVAILABLE';
    err.status = 503;
    throw err;
  }

  return content;
}

/**
 * Parse a JSON string that may be wrapped in markdown code fences.
 * Retries are handled by the caller — this function throws on failure.
 *
 * @param {string} raw - Raw string from OpenAI
 * @returns {object} Parsed JSON
 */
function parseJSONResponse(raw) {
  // 1. Try to extract JSON from within a markdown code fence (```json ... ```)
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate  = fenceMatch ? fenceMatch[1].trim() : raw.trim();

  // 2. Attempt direct parse of the cleaned candidate
  try {
    return JSON.parse(candidate);
  } catch (_) {}

  // 3. Last-resort: find the first { or [ and parse from there
  const firstBrace = candidate.search(/[{[]/);
  if (firstBrace !== -1) {
    try {
      return JSON.parse(candidate.slice(firstBrace));
    } catch (_) {}
  }

  // 4. All attempts failed — surface a clear error
  const parseErr    = new Error(`Failed to parse AI response as JSON`);
  parseErr.code     = 'PARSE_ERROR';
  parseErr.status   = 500;
  parseErr.raw      = raw.slice(0, 300);

  console.error('[AI SERVICE] JSON parse failed — raw length:', raw.length);
  console.error('[AI SERVICE] Last 300 chars:', raw.slice(-300));

  throw parseErr;
}

module.exports = { callOpenAI, parseJSONResponse };
