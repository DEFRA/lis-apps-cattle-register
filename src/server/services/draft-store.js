/*
 * TEMPORARY in-memory store behind the stub registration client, until the
 * cattle-register backend-for-frontend (LREG-876/878...) holds draft answers
 * and this module is deleted.
 * It is per instance: each instance holds its own drafts, they are not shared
 * between instances and they are lost on restart.
 * It is bounded: an entry expires a while after it was last written, a user
 * writing more than their share evicts their own oldest entry, and the
 * oldest entries overall are evicted once the store is full. There are no
 * timers; expired entries are removed when the store is read or written.
 */

// How long a draft is kept after it was last written: 2 hours.
export const DRAFT_TTL_MS = 7_200_000

// The most drafts held at once; writing one more evicts the oldest.
export const MAX_DRAFTS = 500

// The most drafts held at once for one user; writing one more evicts that
// user's oldest, so one user cannot evict everyone else's drafts.
export const MAX_DRAFTS_PER_USER = 5

/**
 * @param {unknown} owner
 * @returns {string} the owner, when it is a non-empty string
 * @throws {TypeError} otherwise, so no draft is held without an owner
 */
function demandOwner(owner) {
  if (typeof owner !== 'string' || owner === '') {
    throw new TypeError('A draft needs an owner')
  }

  return owner
}

/**
 * @template T
 * @param {object} [options]
 * @param {() => Date} [options.now] - the current instant; injectable for tests
 * @param {number} [options.ttlMs]
 * @param {number} [options.maxEntries]
 * @param {number} [options.maxEntriesPerOwner]
 * @returns {{ get: (key: string) => T | undefined, set: (key: string, value: T, owner: string) => void }}
 *   set() takes the user the draft belongs to as its owner
 */
export function createDraftStore({
  now = () => new Date(),
  ttlMs = DRAFT_TTL_MS,
  maxEntries = MAX_DRAFTS,
  maxEntriesPerOwner = MAX_DRAFTS_PER_USER
} = {}) {
  // Insertion order is last-write order, because set() re-inserts the key,
  // so the first entry is always the oldest.
  /** @type {Map<string, { value: T, owner: string, writtenAt: number }>} */
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

  /**
   * @param {string} owner
   */
  function evictOverOwnerCap(owner) {
    const ownKeys = [...entries]
      .filter(([, entry]) => entry.owner === owner)
      .map(([key]) => key)

    for (const key of ownKeys.slice(0, -maxEntriesPerOwner)) {
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

    set(key, value, owner) {
      const writtenBy = demandOwner(owner)
      const at = now().getTime()

      entries.delete(key)
      entries.set(key, { value, owner: writtenBy, writtenAt: at })
      removeExpired(at)
      evictOverOwnerCap(writtenBy)
      evictOverCap()
    }
  }
}
