import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { DRAFT_TTL_MS, MAX_DRAFTS, createDraftStore } from './draft-store.js'

const NOW = new Date('2026-11-05T10:00:00Z')

describe('createDraftStore()', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('it keeps drafts for 2 hours, at most 500 of them', () => {
    // Assert
    expect(DRAFT_TTL_MS).toBe(2 * 60 * 60 * 1000)
    expect(MAX_DRAFTS).toBe(500)
  })

  test('get() returns what set() wrote', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', { answer: 1 })

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
    store.set('a', 1)
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBe(1)
  })

  test('get() returns undefined once the draft has expired', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', 1)
    vi.advanceTimersByTime(DRAFT_TTL_MS)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBeUndefined()
  })

  test('set() restarts the expiry of the draft it writes', () => {
    // Arrange
    const store = createDraftStore()
    store.set('a', 1)
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1)
    store.set('a', 2)
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1)

    // Act
    const value = store.get('a')

    // Assert
    expect(value).toBe(2)
  })

  test('set() removes expired drafts but keeps newer ones', () => {
    // Arrange
    const store = createDraftStore({ maxEntries: 2 })
    store.set('old', 1)
    vi.advanceTimersByTime(DRAFT_TTL_MS)
    store.set('new', 2)
    store.set('newer', 3)

    // Act
    const values = ['old', 'new', 'newer'].map((key) => store.get(key))

    // Assert
    expect(values).toEqual([undefined, 2, 3])
  })

  test('set() evicts the oldest draft when the store is full', () => {
    // Arrange
    const store = createDraftStore({ maxEntries: 3 })
    store.set('a', 1)
    store.set('b', 2)
    store.set('c', 3)

    // Act
    store.set('d', 4)

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
      store.set(key, value)
    }

    // Act
    store.set('c', 4)

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
      store.set(`draft-${n}`, n)
    }

    // Act
    store.set('one-more', MAX_DRAFTS)

    // Assert
    expect(store.get('draft-0')).toBeUndefined()
    expect(store.get('draft-1')).toBe(1)
    expect(store.get('one-more')).toBe(MAX_DRAFTS)
  })
})
