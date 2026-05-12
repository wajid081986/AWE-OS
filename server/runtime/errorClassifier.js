'use strict';

/**
 * AWE-OS — Error Classifier                                  Phase 4C/4D
 *
 * Classifies runtime errors into semantic categories.
 * Used by retryPolicy and monitoring to make data-driven retry decisions.
 *
 * Categories:
 *   TRANSIENT      — temporary failure; safe to retry
 *   VALIDATION     — bad input or config; retrying won't help
 *   NETWORK        — upstream connection refused / timeout
 *   TIMEOUT        — execution exceeded time limit
 *   AGENT_FAILURE  — agent code threw or returned unexpected shape
 *   INFRASTRUCTURE — DB / storage / service unavailable
 *   APPROVAL       — approval gate rejected or timed out
 *   UNKNOWN        — unclassified; conservative retry
 */

const CATEGORIES = Object.freeze({
  TRANSIENT:      'TRANSIENT',
  VALIDATION:     'VALIDATION',
  NETWORK:        'NETWORK',
  TIMEOUT:        'TIMEOUT',
  AGENT_FAILURE:  'AGENT_FAILURE',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  APPROVAL:       'APPROVAL',
  UNKNOWN:        'UNKNOWN',
});

const SEVERITIES = Object.freeze({
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
});

// Pattern → { category, retryable, severity }
// Evaluated in order; first match wins.
const RULES = [
  // Explicit codes set by the runtime
  { test: e => e.code === 'CANCELLED',                   cat: CATEGORIES.TRANSIENT,      retryable: false, sev: SEVERITIES.LOW      },
  { test: e => e.code === 'TIMEOUT',                     cat: CATEGORIES.TIMEOUT,        retryable: true,  sev: SEVERITIES.MEDIUM   },
  { test: e => e.code === 'MAX_RETRIES_EXCEEDED',        cat: CATEGORIES.AGENT_FAILURE,  retryable: false, sev: SEVERITIES.HIGH     },

  // Approval-specific
  { test: e => /approval|approve|gate/i.test(e.message), cat: CATEGORIES.APPROVAL,       retryable: false, sev: SEVERITIES.MEDIUM   },

  // Network / connectivity
  { test: e => /ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|socket hang up/i.test(e.message),
                                                          cat: CATEGORIES.NETWORK,        retryable: true,  sev: SEVERITIES.MEDIUM   },
  { test: e => /fetch failed|network error|upstream/i.test(e.message),
                                                          cat: CATEGORIES.NETWORK,        retryable: true,  sev: SEVERITIES.MEDIUM   },

  // Infrastructure (DB / storage)
  { test: e => /supabase|postgres|pg|database|db error/i.test(e.message),
                                                          cat: CATEGORIES.INFRASTRUCTURE, retryable: true,  sev: SEVERITIES.HIGH     },
  { test: e => /S3|storage|bucket|upload/i.test(e.message),
                                                          cat: CATEGORIES.INFRASTRUCTURE, retryable: true,  sev: SEVERITIES.MEDIUM   },

  // Validation / bad input
  { test: e => /invalid|missing|required|must be|not found|404/i.test(e.message),
                                                          cat: CATEGORIES.VALIDATION,     retryable: false, sev: SEVERITIES.LOW      },
  { test: e => e.code === 'PGRST116' /* Supabase not found */,
                                                          cat: CATEGORIES.VALIDATION,     retryable: false, sev: SEVERITIES.LOW      },

  // Rate limiting / throttling (transient)
  { test: e => /rate limit|429|too many requests/i.test(e.message),
                                                          cat: CATEGORIES.TRANSIENT,      retryable: true,  sev: SEVERITIES.MEDIUM   },

  // AI / agent specific
  { test: e => /openai|anthropic|claude|gpt|llm/i.test(e.message),
                                                          cat: CATEGORIES.AGENT_FAILURE,  retryable: true,  sev: SEVERITIES.MEDIUM   },
  { test: e => /timed out|timeout/i.test(e.message),    cat: CATEGORIES.TIMEOUT,        retryable: true,  sev: SEVERITIES.MEDIUM   },
];

/**
 * Classify an error.
 *
 * @param {Error|object|string} error
 * @returns {{ category: string, retryable: boolean, severity: string, matched: boolean }}
 */
function classify(error) {
  if (!error) {
    return { category: CATEGORIES.UNKNOWN, retryable: true, severity: SEVERITIES.LOW, matched: false };
  }

  const e = typeof error === 'string' ? { message: error, code: null } : error;

  for (const rule of RULES) {
    try {
      if (rule.test(e)) {
        return { category: rule.cat, retryable: rule.retryable, severity: rule.sev, matched: true };
      }
    } catch (_) {
      // rule test threw — skip it
    }
  }

  return { category: CATEGORIES.UNKNOWN, retryable: true, severity: SEVERITIES.MEDIUM, matched: false };
}

/**
 * Returns true if this error should prevent any further retries.
 */
function isNonRetryable(error) {
  return !classify(error).retryable;
}

module.exports = { CATEGORIES, SEVERITIES, classify, isNonRetryable };
