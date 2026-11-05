/*
 * TEMPORARY in-memory store behind the stub registration client, until the
 * cattle-register backend-for-frontend (LREG-876/878...) holds draft answers
 * and this module is deleted.
 * It is per instance: each instance holds its own drafts, they are not shared
 * between instances and they are lost on restart.
 * It is bounded: an entry expires a while after it was last written, and the
 * oldest entries are evicted once the store is full. There are no timers;
 * expired entries are removed when the store is read or written.
 */

// How long a draft is kept after it was last written: 2 hours.
export const DRAFT_TTL_MS = 7_200_000

// The most drafts held at once; writing one more evicts the oldest.
export const MAX_DRAFTS = 500

/**
 * @template T
 * @param {object} [options]
 * @param {() => Date} [options.now] - the current instant; injectable for tests
 * @param {number} [options.ttlMs]
 * @param {number} [options.maxEntries]
 * @returns {{ get: (key: string) => T | undefined, set: (key: string, value: T) => void }}
 */
export function createDraftStore({
  now = () => new Date(),
  ttlMs = DRAFT_TTL_MS,
  maxEntries = MAX_DRAFTS
} = {}) {
  // Insertion order is last-write order, because set() re-inserts the key,
  // so the first entry is always the oldest.
  /** @type {Map<string, { value: T, writtenAt: number }>} */
  const entries = new Map()

  /**
   * @param {{ writtenAt: number }} entry
   * @param {number} at
   * @returns {boolean}
   */
  function isExpired(entry, at) {
    return at - entry.writtenAt >= ttlMs
  }

  /**
   * @param {number} at
   */
  function removeExpired(at) {
    for (const [key, entry] of entries) {
      if (!isExpired(entry, at)) {
        return
      }
      entries.delete(key)
    }
  }

  function evictOverCap() {
    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value)
    }
  }

  return {
    get(key) {
      removeExpired(now().getTime())

      return entries.get(key)?.value
    },

    set(key, value) {
      const at = now().getTime()

      entries.delete(key)
      entries.set(key, { value, writtenAt: at })
      removeExpired(at)
      evictOverCap()
    }
  }
}
