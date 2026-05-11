/**
 * Generic TTL in-memory cache factory.
 * Returns a cache instance with get/set/has/delete/prune.
 * Prune removes expired entries to prevent unbounded memory growth.
 */
export function createCache({ ttl = 5 * 60 * 1000 } = {}) {
  const store = new Map()

  return {
    get(key) {
      const entry = store.get(key)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) {
        store.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key, value, customTtl) {
      store.set(key, {
        value,
        expiresAt: Date.now() + (customTtl ?? ttl),
      })
    },

    has(key) {
      return this.get(key) !== undefined
    },

    delete(key) {
      store.delete(key)
    },

    clear() {
      store.clear()
    },

    size() {
      return store.size
    },

    // Call periodically (e.g. on route change) to evict stale entries
    prune() {
      const now = Date.now()
      for (const [key, entry] of store) {
        if (now > entry.expiresAt) store.delete(key)
      }
    },
  }
}
