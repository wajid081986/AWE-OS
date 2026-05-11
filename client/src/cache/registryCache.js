/**
 * Registry-aware cache wrappers.
 * The registry is small (~35 tools) and lookups are synchronous, so
 * this cache is primarily an extensibility layer — it prevents duplicated
 * computation if the registry grows or lookup logic becomes heavier.
 */
import { createCache } from './createCache'
import { getToolBySlug, getRelatedTools, getCategoryMeta } from '../data/toolRegistry'

const toolCache    = createCache({ ttl: 10 * 60 * 1000 }) // 10 min
const relatedCache = createCache({ ttl: 10 * 60 * 1000 })
const categoryCache = createCache({ ttl: 30 * 60 * 1000 }) // 30 min — rarely changes

export function cachedGetToolBySlug(slug) {
  const cached = toolCache.get(slug)
  if (cached !== undefined) return cached
  const result = getToolBySlug(slug) ?? null
  toolCache.set(slug, result)
  return result
}

export function cachedGetRelatedTools(tool, limit = 5) {
  const key = `${tool?.slug}-${limit}`
  const cached = relatedCache.get(key)
  if (cached !== undefined) return cached
  const result = getRelatedTools(tool, limit)
  relatedCache.set(key, result)
  return result
}

export function cachedGetCategoryMeta(slug) {
  const cached = categoryCache.get(slug)
  if (cached !== undefined) return cached
  const result = getCategoryMeta(slug) ?? null
  categoryCache.set(slug, result)
  return result
}

export function pruneRegistryCaches() {
  toolCache.prune()
  relatedCache.prune()
  categoryCache.prune()
}
