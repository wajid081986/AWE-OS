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
 * Send a single user prompt to OpenAI and return the raw text response.
 *
 * @param {string} prompt         - The user message to send
 * @param {object} [options]
 * @param {string} [options.model='gpt-4o-mini'] - Model ID
 * @param {number} [options.max_tokens=4096]
 * @param {number} [options.temperature=0.4]  - Lower = more deterministic JSON output
 * @returns {Promise<string>} Raw text content of the first completion choice
 */
async function callOpenAI(prompt, options = {}) {
  const client     = getClient();
  const model      = options.model       || 'gpt-4o-mini';
  const maxTokens  = options.max_tokens  || 3000;
  const temperature = options.temperature ?? 0.4;

  const response = await client.chat.completions.create({
    model,
    messages:    [{ role: 'user', content: prompt }],
    max_tokens:  maxTokens,
    temperature,
    // response_format forces valid JSON — works on gpt-4o, gpt-4o-mini, gpt-4-turbo
    response_format: { type: 'json_object' },
  });

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
  // Strip optional ```json ... ``` wrapping
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const parseErr = new Error(`Failed to parse AI response as JSON: ${err.message}`);
    parseErr.code  = 'PARSE_ERROR';
    parseErr.status = 500;
    parseErr.raw   = raw.slice(0, 300); // first 300 chars for debugging
    throw parseErr;
  }
}

module.exports = { callOpenAI, parseJSONResponse };
