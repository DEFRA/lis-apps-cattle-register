import { describe, expect, test } from 'vitest'

import {
  daysBetween,
  formatCalendarDate,
  toUkCalendarDate
} from './calendar-date.js'

describe('calendar-date', () => {
  test('toUkCalendarDate() gives the UK date when UTC is still the previous day in summer time', () => {
    // Arrange
    const instant = new Date('2026-06-30T23:30:00Z')

    // Act
    const result = toUkCalendarDate(instant)

    // Assert
    expect(result).toEqual({ day: 1, month: 7, year: 2026 })
  })

  test('toUkCalendarDate() gives the same date as UTC in winter', () => {
    // Arrange
    const instant = new Date('2026-12-31T23:30:00Z')

    // Act
    const result = toUkCalendarDate(instant)

    // Assert
    expect(result).toEqual({ day: 31, month: 12, year: 2026 })
  })

  test('formatCalendarDate() writes D/M/YYYY without leading zeros', () => {
    // Arrange
    const date = { day: 5, month: 3, year: 2026 }

    // Act
    const result = formatCalendarDate(date)

    // Assert
    expect(result).toBe('5/3/2026')
  })

  test('daysBetween() counts whole days across a month end', () => {
    // Arrange
    const from = { day: 30, month: 10, year: 2026 }
    const to = { day: 2, month: 11, year: 2026 }

    // Act
    const result = daysBetween(from, to)

    // Assert
    expect(result).toBe(3)
  })

  test('daysBetween() is negative when the second date is earlier', () => {
    // Arrange
    const from = { day: 6, month: 11, year: 2026 }
    const to = { day: 5, month: 11, year: 2026 }

    // Act
    const result = daysBetween(from, to)

    // Assert
    expect(result).toBe(-1)
  })
})
