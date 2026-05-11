/**
 * Centralized error reporting.
 * In development: logs structured output to console.
 * In production: silent (ready for Sentry or custom endpoint).
 *
 * To add Sentry: replace the TODO lines with:
 *   window.Sentry?.captureException(error, { extra: context })
 */

export function reportError(error, context = {}) {
  if (import.meta.env.DEV) {
    console.error('[AWE-OS Error]', { error, ...context })
  }
  // TODO: window.Sentry?.captureException(error, { extra: context })
}

export function reportWarning(message, context = {}) {
  if (import.meta.env.DEV) {
    console.warn('[AWE-OS Warning]', message, context)
  }
  // TODO: window.Sentry?.captureMessage(message, 'warning')
}

export function reportInfo(message, data = {}) {
  if (import.meta.env.DEV) {
    console.info('[AWE-OS]', message, data)
  }
}
