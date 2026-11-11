import { format } from 'date-fns'
import { describe, expect, test } from 'vitest'

import { DATE_FORMAT, toUkDate } from './calendar-date.js'

describe('toUkDate()', () => {
  test.each([
    ['in winter, when the UK is on UTC', '2026-01-15T12:00:00Z', '15/1/2026'],
    ['late in a summer evening UTC', '2026-06-30T23:30:00Z', '1/7/2026'],
    ['early in a summer morning UTC', '2026-07-01T00:30:00Z', '1/7/2026'],
    ['just before midnight UTC in winter', '2026-12-31T23:59:59Z', '31/12/2026']
  ])("it gives the UK's date %s", (_description, instant, expected) => {
    // Arrange
    const date = new Date(instant)

    // Act
    const result = format(toUkDate(date), DATE_FORMAT)

    // Assert
    expect(result).toBe(expected)
  })
})
