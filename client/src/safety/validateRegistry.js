/**
 * Dev-time registry validation.
 * Runs at startup in development — logs warnings, never throws.
 * Zero-cost in production (returns immediately).
 */
import { getAllTools } from '../data/toolRegistry'

const REQUIRED = ['slug', 'name', 'category', 'icon', 'description']

export function validateRegistry() {
  if (import.meta.env.PROD) return

  let tools
  try {
    tools = getAllTools()
  } catch (e) {
    console.error('[AWE-OS] Failed to load tool registry:', e)
    return
  }

  const slugsSeen = new Set()
  const warnings = []

  for (const tool of tools) {
    for (const field of REQUIRED) {
      if (!tool[field]) {
        warnings.push(`Tool "${tool.slug || '?'}" missing required field: "${field}"`)
      }
    }
    if (tool.slug) {
      if (slugsSeen.has(tool.slug)) {
        warnings.push(`Duplicate slug detected: "${tool.slug}" — routing will be unpredictable`)
      }
      slugsSeen.add(tool.slug)
    }
  }

  if (warnings.length) {
    console.group('%c[AWE-OS Registry Validation]', 'color: #f59e0b; font-weight: bold')
    warnings.forEach(w => console.warn('⚠', w))
    console.groupEnd()
  }
}
