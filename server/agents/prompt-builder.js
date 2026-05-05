'use strict';

const crypto = require('crypto');

/**
 * AWE-OS Prompt Builder
 *
 * Role-based prompting, structured output enforcement,
 * few-shot examples, safety guardrails, adaptive strategy injection.
 *
 * Usage:
 *   const { buildPrompt, buildAdaptivePrompt } = require('./prompt-builder');
 *   const { prompt, hash, meta } = buildPrompt({ role, task, input, outputFormat, examples, strategy });
 */

// ── Constants ─────────────────────────────────────────────────

const DEFAULT_ROLE     = 'expert AI assistant';
const DEFAULT_STRATEGY = 'default';

const OUTPUT_FORMATS = new Set(['json', 'bullet', 'detailed', 'text']);

// ── Helpers ───────────────────────────────────────────────────

/**
 * SHA-256 fingerprint of a prompt string.
 * Useful for caching, deduplication, and learning-engine tracking.
 *
 * @param {string} prompt
 * @returns {string} 64-char hex digest
 */
function generatePromptHash(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

/**
 * Safely coerce input to a plain object.
 * Returns {} for null / non-object / array inputs.
 *
 * @param {*} input
 * @returns {Record<string, unknown>}
 */
function validateInput(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return {};
  return input;
}

/**
 * Safely coerce examples to an array of { input, output } objects.
 * Filters out malformed entries so a single bad example never breaks the build.
 *
 * @param {unknown} examples
 * @returns {{ input: unknown, output: string }[]}
 */
function validateExamples(examples) {
  if (!Array.isArray(examples)) return [];
  return examples.filter(
    (ex) => ex !== null && typeof ex === 'object' && 'input' in ex && 'output' in ex
  );
}

// ── Section builders ──────────────────────────────────────────

/**
 * @param {string|undefined} role
 * @returns {string}
 */
function buildRole(role) {
  const safeRole = typeof role === 'string' && role.trim() ? role.trim() : DEFAULT_ROLE;
  return `You are a ${safeRole}.`;
}

/**
 * @param {string|undefined} task
 * @returns {string}
 */
function buildTask(task) {
  const safeTask =
    typeof task === 'string' && task.trim()
      ? task.trim()
      : 'Perform the requested operation efficiently and accurately.';
  return `Your task:\n${safeTask}`;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
function buildInputContext(input) {
  if (Object.keys(input).length === 0) return '';
  return `Input context:\n${JSON.stringify(input, null, 2)}`;
}

/**
 * @param {'json'|'bullet'|'detailed'|'text'} format
 * @returns {string}
 */
function buildOutputFormat(format) {
  const safeFormat = OUTPUT_FORMATS.has(format) ? format : 'text';

  const formats = {
    json: `Output format:
- Return STRICT valid JSON only.
- No preamble, no explanation, no markdown fences.
- All keys must be strings. All values must be valid JSON types.`,

    bullet: `Output format:
- Use concise bullet points.
- One idea per bullet.
- No filler words or repetition.`,

    detailed: `Output format:
- Use clear headings and numbered subsections.
- Explain each point thoroughly with examples where applicable.
- Close with a short summary paragraph.`,

    text: `Output format:
- Clear, structured, professional prose.
- Paragraphs separated by blank lines.
- No unnecessary bullet points.`,
  };

  return formats[safeFormat];
}

/**
 * @returns {string}
 */
function buildConstraints() {
  return `Requirements:
- No generic or vague responses — every statement must be specific and actionable.
- Real-world applicable — output must work outside this conversation.
- No repetition of earlier points.
- High clarity and precision throughout.
- Professional tone without unnecessary filler.`;
}

/**
 * @returns {string}
 */
function buildGuardrails() {
  return `Rules:
- Do NOT hallucinate facts, names, or figures.
- If data is insufficient, respond with "Insufficient data to answer accurately."
- Stick strictly to the provided input — do not invent context.
- Maintain internal consistency throughout the response.`;
}

/**
 * Few-shot examples block.
 *
 * @param {{ input: unknown, output: string }[]} examples
 * @returns {string}
 */
function buildExamples(examples) {
  const safe = validateExamples(examples);
  if (safe.length === 0) return '';

  const formatted = safe
    .map(
      (ex, i) =>
        `Example ${i + 1}:\nInput: ${JSON.stringify(ex.input)}\nOutput: ${ex.output}`
    )
    .join('\n\n');

  return `Examples:\n${formatted}`;
}

/**
 * @param {string|undefined} strategy
 * @returns {string}
 */
function buildStrategy(strategy) {
  const safeStrategy =
    typeof strategy === 'string' && strategy.trim() ? strategy.trim() : DEFAULT_STRATEGY;
  return `Strategy: ${safeStrategy}`;
}

// ── Fallback prompt ───────────────────────────────────────────

const FALLBACK_PROMPT = `You are an expert AI assistant.

Your task:
Perform the requested task safely and accurately.

Requirements:
- Be specific and actionable.
- Do not hallucinate.

Note: Fallback prompt — an error occurred during prompt construction.`.trim();

// ── Main builder ──────────────────────────────────────────────

/**
 * Build a structured, production-ready prompt.
 *
 * @param {object}   options
 * @param {string}   [options.role]          - The AI persona/role to adopt
 * @param {string}   [options.task]          - The task description
 * @param {object}   [options.input]         - Input context injected as JSON
 * @param {string}   [options.outputFormat]  - 'json' | 'bullet' | 'detailed' | 'text'
 * @param {Array}    [options.examples]      - Few-shot examples: [{ input, output }]
 * @param {string}   [options.strategy]      - Strategy hint from learning engine
 *
 * @returns {{ prompt: string, hash: string, meta: object }}
 */
function buildPrompt({
  role,
  task,
  input,
  outputFormat = 'text',
  examples = [],
  strategy = DEFAULT_STRATEGY,
} = {}) {
  try {
    const safeInput    = validateInput(input);
    const safeExamples = validateExamples(examples);

    const sections = [
      buildRole(role),
      buildTask(task),
      buildInputContext(safeInput),
      buildConstraints(),
      buildGuardrails(),
      buildOutputFormat(outputFormat),
      buildExamples(safeExamples),
      buildStrategy(strategy),
    ].filter(Boolean);

    const prompt = sections.join('\n\n').trim();

    return {
      prompt,
      hash: generatePromptHash(prompt),
      meta: {
        role:         role      || DEFAULT_ROLE,
        strategy:     strategy  || DEFAULT_STRATEGY,
        outputFormat: OUTPUT_FORMATS.has(outputFormat) ? outputFormat : 'text',
        input_size:   JSON.stringify(safeInput).length,
        has_examples: safeExamples.length > 0,
        example_count: safeExamples.length,
      },
    };
  } catch (err) {
    console.error('[PROMPT BUILDER] buildPrompt failed — using fallback:', err.message);
    return {
      prompt: FALLBACK_PROMPT,
      hash:   null,
      error:  err.message,
      meta:   { role: DEFAULT_ROLE, strategy: DEFAULT_STRATEGY },
    };
  }
}

// ── Adaptive builder (learning-engine integration) ────────────

/**
 * Build a prompt using a tool's stored configuration and runtime context.
 * Reads best_strategy from the tool's learning-engine state.
 *
 * @param {object} tool    - Tool record from Supabase (must have ai_prompt, role, best_strategy)
 * @param {object} context - Runtime context to inject as input
 * @returns {{ prompt: string, hash: string, meta: object }}
 */
function buildAdaptivePrompt(tool, context = {}) {
  if (!tool || typeof tool !== 'object') {
    console.warn('[PROMPT BUILDER] buildAdaptivePrompt called with invalid tool — using defaults');
    return buildPrompt({ input: context });
  }

  const role     = typeof tool.role === 'string' && tool.role.trim() ? tool.role.trim() : 'domain expert';
  const strategy =
    tool.best_strategy?.strategy && typeof tool.best_strategy.strategy === 'string'
      ? tool.best_strategy.strategy
      : DEFAULT_STRATEGY;

  return buildPrompt({
    role,
    task:         tool.ai_prompt,
    input:        context,
    outputFormat: 'detailed',
    strategy,
  });
}

// ── Exports ───────────────────────────────────────────────────

module.exports = {
  buildPrompt,
  buildAdaptivePrompt,
  // Exported for unit tests
  _internals: {
    buildRole,
    buildTask,
    buildInputContext,
    buildOutputFormat,
    buildConstraints,
    buildGuardrails,
    buildExamples,
    buildStrategy,
    validateInput,
    validateExamples,
    generatePromptHash,
  },
};
