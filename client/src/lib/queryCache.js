/**
 * AWE-OS — Query Cache                                          Phase 5E
 *
 * Lightweight TTL cache with in-flight request deduplication.
 *
 * Design:
 *   - cachedFetch():  returns cached data immediately when fresh, else fetches.
 *                     Deduplicates concurrent requests for the same key.
 *   - getSync():      synchronous read — used to initialize useState without
 *                     triggering a skeleton flash on second visits.
 *   - isFresh():      check freshness without triggering a fetch.
 *
 * Usage:
 *   const data = await cachedFetch('my-key', () => api.get('/api/data'), 5 * 60 * 1000)
 */

const _store   = new Map()  // key → { data, ts }
const _pending = new Map()  // key → Promise (in-flight dedup)

export const DEFAULT_TTL = 5 * 60 * 1000  // 5 minutes

/** Read cached data without triggering a fetch. Returns null if absent. */
export function getSync(key) {
  return _store.get(key)?.data ?? null
}

/** True if cached data exists and is within TTL. */
export function isFresh(key, ttl = DEFAULT_TTL) {
  const entry = _store.get(key)
  return !!(entry && Date.now() - entry.ts < ttl)
}

/**
 * Fetch with cache + in-flight dedup.
 * @param {string}   key     - cache key
 * @param {Function} fetcher - async function that returns the data
 * @param {number}   ttl     - TTL in ms (default: 5 min)
 * @returns {Promise<any>}
 */
export async function cachedFetch(key, fetcher, ttl = DEFAULT_TTL) {
  // Fresh cache hit — resolve immediately
  if (isFresh(key, ttl)) return _store.get(key).data

  // In-flight dedup — return existing promise
  if (_pending.has(key)) return _pending.get(key)

  const p = Promise.resolve()
    .then(() => fetcher())
    .then(data => {
      _store.set(key, { data, ts: Date.now() })
      _pending.delete(key)
      return data
    })
    .catch(err => {
      _pending.delete(key)
      throw err
    })

  _pending.set(key, p)
  return p
}

/** Remove a specific cache entry (forces next fetch to go to network). */
export function invalidate(key) {
  _store.delete(key)
}

/** Clear entire cache. */
export function invalidateAll() {
  _store.clear()
}
