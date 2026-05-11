/**
 * Validates expected environment variables at startup.
 * Warns in dev — silent in prod (app must still function with defaults).
 */

const OPTIONAL_VARS = [
  { key: 'VITE_API_URL', description: 'Backend API base URL' },
]

export function validateEnv() {
  if (import.meta.env.PROD) return

  const missing = OPTIONAL_VARS.filter(({ key }) => !import.meta.env[key])
  if (missing.length) {
    console.group('%c[AWE-OS Env]', 'color: #60a5fa; font-weight: bold')
    missing.forEach(({ key, description }) =>
      console.info(`ℹ ${key} not set (${description}) — using fallback`)
    )
    console.groupEnd()
  }
}
