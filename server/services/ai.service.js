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
 * @param {number} [options.max_tokens=6000]
 * @param {number} [options.temperature=0.4]  - Lower = more deterministic JSON output
 * @param {number} [options.timeout=120000]  - Abort timeout in milliseconds
 * @returns {Promise<string>} Raw text content of the first completion choice
 */
async function callOpenAI(prompt, options = {}) {
  const client     = getClient();
  const model      = options.model       || 'gpt-4o-mini';
  const maxTokens  = options.max_tokens  || 8000;
  const temperature = options.temperature ?? 0.4;

  const timeoutMs  = options.timeout || 120_000;
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await client.chat.completions.create(
      { model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, temperature },
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
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // ← YAHAN LOG ADD KIYA
    console.error('[AI SERVICE] JSON parse failed!');
    console.error('[AI SERVICE] Raw response length:', raw.length);
    console.error('[AI SERVICE] Last 500 chars:', raw.slice(-500));
    
    const errMsg   = err instanceof Error ? err.message : String(err);
    const parseErr = new Error(`Failed to parse AI response as JSON: ${errMsg}`);
    parseErr.code  = 'PARSE_ERROR';
    parseErr.status = 500;
    parseErr.raw   = raw.slice(0, 300);
    throw parseErr;
  }
}

module.exports = { callOpenAI, parseJSONResponse };
