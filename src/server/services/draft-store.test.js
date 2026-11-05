import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DRAFT_TTL_MS,
  MAX_DRAFTS,
  MAX_DRAFTS_PER_USER,
  createDraftStore
} from './draft-store.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const USER = 'user-a'

describe('createDraftStore()', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('it keeps drafts for 2 hours, at most 500 of them and 5 per user', () => {
    // Arrange
    const twoHoursMs = 2 * 60 * 60 * 1000

    // Act
    const limits = [DRAFT_TTL_MS, MAX_DRAFTS, MAX_DRAFTS_PER_USER]

    // Assert
    expect(limits).toEqual([twoHoursMs, 500, 5])
  })

  test('get() returns what set() wrote', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', { answer: 1 }, USER)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toEqual({ answer: 1 })
  })

  test('get() returns undefined for a key never written', () => {
    // Arrange
    const store = createDraftStore()

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBeUndefined()
  })

  test('get() still returns a draft just before it expires', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', 1, USER)
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBe(1)
  })

  test('get() returns undefined once the draft has expired', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', 1, USER)
    vi.advanceTimersByTime(DRAFT_TTL_MS)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBeUndefined()
  })

  test('set() restarts the expiry of the draft it writes', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', 1, USER)
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1)
    store.set('a', 2, USER)
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBe(2)
  })

  test('set() removes expired drafts but keeps newer ones', () => {
    // Arrange
    const store = createDraftStore({ maxEntries: 2 })
    store.set('old', 1, USER)
    vi.advanceTimersByTime(DRAFT_TTL_MS)
    store.set('new', 2, USER)
    store.set('newer', 3, USER)

    // Act
    const values = ['old', 'new', 'newer'].map((key) => store.get(key))

    // Assert
    expect(values).toEqual([undefined, 2, 3])
  })

  test('set() evicts the oldest draft when the store is full', () => {
    // Arrange
    const store = createDraftStore({ maxEntries: 3 })
    store.set('a', 1, USER)
    store.set('b', 2, USER)
    store.set('c', 3, USER)

    // Act
    store.set('d', 4, USER)

    // Assert
    expect(['a', 'b', 'c', 'd'].map((key) => store.get(key))).toEqual([
      undefined,
      2,
      3,
      4
    ])
  })

  test('set() counts a rewritten draft as the newest', () => {
    // Arrange
    const store = createDraftStore({ maxEntries: 2 })
    for (const [key, value] of [
      ['a', 1],
      ['b', 2],
      ['a', 3]
    ]) {
      store.set(key, value, USER)
    }

    // Act
    store.set('c', 4, USER)

    // Assert
    expect(['a', 'b', 'c'].map((key) => store.get(key))).toEqual([
      3,
      undefined,
      4
    ])
  })

  test('the default store holds 500 drafts before evicting the oldest', () => {
    // Arrange
    const store = createDraftStore()
    for (let n = 0; n < MAX_DRAFTS; n++) {
      store.set(`draft-${n}`, n, `user-${n}`)
    }

    // Act
    store.set('one-more', MAX_DRAFTS, 'another-user')

    // Assert
    expect(store.get('draft-0')).toBeUndefined()
    expect(store.get('draft-1')).toBe(1)
    expect(store.get('one-more')).toBe(MAX_DRAFTS)
  })

  test("a user's sixth draft evicts their own oldest, not another user's", () => {
    // Arrange
    const store = createDraftStore()
    store.set('other-1', 'other', 'user-b')
    for (let n = 1; n <= MAX_DRAFTS_PER_USER; n++) {
      store.set(`own-${n}`, n, USER)
    }

    // Act
    store.set('own-6', 6, USER)

    // Assert
    expect(store.get('own-1')).toBeUndefined()
    expect(store.get('own-2')).toBe(2)
    expect(store.get('own-6')).toBe(6)
    expect(store.get('other-1')).toBe('other')
  })

  test("set() counts a user's rewritten draft as their newest", () => {
    // Arrange
    const store = createDraftStore({ maxEntriesPerOwner: 2 })
    store.set('a', 1, USER)
    store.set('b', 2, USER)
    store.set('a', 3, USER)

    // Act
    store.set('c', 4, USER)

    // Assert
    expect(['a', 'b', 'c'].map((key) => store.get(key))).toEqual([
      3,
      undefined,
      4
    ])
  })

  test.each([
    ['no owner', undefined],
    ['a blank owner', '']
  ])('set() throws, keeping the draft, for %s', (_description, owner) => {
    // Arrange
    const store = createDraftStore()
    store.set('a', 1, USER)

    // Act
    let error
    try {
      store.set('a', 2, owner)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error?.message).toBe('A draft needs an owner')
    expect(store.get('a')).toBe(1)
  })
})
