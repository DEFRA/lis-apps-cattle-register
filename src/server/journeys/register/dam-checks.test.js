import { describe, expect, test } from 'vitest'

import { damProblem } from './dam-checks.js'

describe('damProblem()', () => {
  test.each([
    ['15 months old to the day', '2025-01-01', undefined],
    ['a day short of 15 months old', '2025-01-02', 'under15Months'],
    ['20 years old to the day', '2006-04-01', undefined],
    ['a day over 20 years old', '2006-03-31', 'over20Years'],
    ['of no known date of birth', null, undefined]
  ])('a dam %s when the calf was born gives %s', (_description, born, code) => {
    // Arrange
    const dam = {
      earTagNumber: 'UK200000000007',
      dateOfBirth: born,
      calfDatesOfBirth: []
    }

    // Act
    const result = damProblem(dam, '1/4/2026')

    // Assert
    expect(result).toBe(code)
  })

  test.each([
    ['240 days before', ['2025-08-04'], 'calvedIn240Days'],
    ['241 days before', ['2025-08-03'], undefined],
    ['the day before', ['2026-03-31'], 'calvedIn240Days'],
    ['the same day, as a twin is', ['2026-04-01'], undefined],
    ['after', ['2026-04-02'], undefined],
    [
      'twice in the 240 days before',
      ['2025-08-04', '2026-03-31'],
      'twoCalvesIn240Days'
    ],
    [
      'once in the 240 days before and once earlier',
      ['2025-08-03', '2026-03-31'],
      'calvedIn240Days'
    ],
    ['on a date that is not one', ['not-a-date'], undefined]
  ])('a dam that calved %s gives %s', (_description, calves, code) => {
    // Arrange
    const dam = {
      earTagNumber: 'UK200000000007',
      dateOfBirth: '2020-01-01',
      calfDatesOfBirth: calves
    }

    // Act
    const result = damProblem(dam, '1/4/2026')

    // Assert
    expect(result).toBe(code)
  })

  test('her age is told before her calves', () => {
    // Arrange
    const dam = {
      earTagNumber: 'UK200000000007',
      dateOfBirth: '2025-06-01',
      calfDatesOfBirth: ['2026-03-01', '2026-03-02']
    }

    // Act
    const result = damProblem(dam, '1/4/2026')

    // Assert
    expect(result).toBe('under15Months')
  })

  test.each([[undefined], ['31/2/2026']])(
    'nothing rules a dam out while the calf has no date of birth (%s)',
    (calfDateOfBirth) => {
      // Arrange
      const dam = {
        earTagNumber: 'UK200000000007',
        dateOfBirth: '2025-06-01',
        calfDatesOfBirth: ['2026-03-01']
      }

      // Act
      const result = damProblem(dam, calfDateOfBirth)

      // Assert
      expect(result).toBeUndefined()
    }
  )
})
