'use strict';

/**
 * Parse an AI response string that may or may not be wrapped in markdown
 * code fences. Tries three fallback strategies before throwing.
 *
 * Strategy 1 — Direct JSON.parse on the trimmed string.
 * Strategy 2 — Strip ```json ... ``` fences, then parse.
 * Strategy 3 — Slice from the first { or [ to the last } or ].
 *
 * Throws if all three strategies fail.
 *
 * @param {string} raw - Raw text content from an AI completion
 * @returns {any}  Parsed JSON value
 * @throws {Error} 'Cannot parse AI response as JSON'
 */
module.exports = function parseAIJson(raw) {
  const cleaned = (raw || '').trim();

  try { return JSON.parse(cleaned); } catch (_) {}

  const block = cleaned.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
  if (block) { try { return JSON.parse(block[1].trim()); } catch (_) {} }

  const start = cleaned.search(/[\[{]/);
  const end   = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) {}
  }

  throw new Error('Cannot parse AI response as JSON');
};
