import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

const dam = (earTagNumber) => ({
  earTagNumber,
  dateOfBirth: null,
  calfDatesOfBirth: []
})

describe('the genetic and surrogate dam rules', () => {
  test("it accepts a surrogate that is one of the holding's dams, with any genetic dam", () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK123456501100',
      surrogateDamEarTagNumber: 'UK200000000007'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      dam: dam('UK200000000007')
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test('it requires the surrogate dam alone when both are left out', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: null,
      surrogateDamEarTagNumber: '  '
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {})

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'required' }
    ])
  })

  test('it accepts a surrogate with the genetic dam left out', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: null,
      surrogateDamEarTagNumber: 'UK200000000007'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      dam: dam('UK200000000007')
    })

    // Assert
    expect(result.errors).toEqual([])
  })

  test("it rejects a surrogate that is not one of the holding's dams", () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK123456501100',
      surrogateDamEarTagNumber: 'UK123456601200'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {})

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'notOnHolding' }
    ])
  })

  test.each([
    ['the same number', 'UK200000000007'],
    ['the same number spaced and in lower case', 'uk 200000 000007']
  ])('it rejects %s in both fields', (_description, surrogate) => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK200000000007',
      surrogateDamEarTagNumber: surrogate
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      dam: dam('UK200000000007')
    })

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'sameAsGeneticDam' }
    ])
  })

  test('it accepts a different valid pair', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: 'UK200000000007',
      surrogateDamEarTagNumber: 'UK200000000008'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      dam: dam('UK200000000008')
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test.each([
    [
      'under15Months',
      'was under 15 months old when the calf was born',
      { dateOfBirth: '2025-01-02', calfDatesOfBirth: [] }
    ],
    [
      'calvedIn240Days',
      'calved in the 240 days before the calf was born',
      { dateOfBirth: '2020-01-01', calfDatesOfBirth: ['2025-12-01'] }
    ],
    [
      'twoCalvesIn240Days',
      'calved twice in the 240 days before the calf was born',
      {
        dateOfBirth: '2020-01-01',
        calfDatesOfBirth: ['2025-08-05', '2025-12-01']
      }
    ]
  ])(
    'it rejects, as %s, a surrogate dam that %s',
    (code, _description, found) => {
      // Arrange
      const saved = { dateOfBirth: '1/4/2026' }
      const answers = {
        geneticDamEarTagNumber: null,
        surrogateDamEarTagNumber: 'UK200000000009'
      }
      const options = {
        dam: { earTagNumber: 'UK200000000009', ...found }
      }

      // Act
      const result = registration.validateStep(
        'surrogate-dam',
        saved,
        answers,
        options
      )

      // Assert
      expect(result.errors).toEqual([
        { field: 'surrogateDamEarTagNumber', code }
      ])
    }
  )

  test('it does not judge the genetic dam, who may be any animal anywhere', () => {
    // Arrange
    const saved = { dateOfBirth: '1/4/2026' }
    const answers = {
      geneticDamEarTagNumber: 'UK200000000009',
      surrogateDamEarTagNumber: 'UK200000000007'
    }
    const options = { dam: dam('UK200000000007') }

    // Act
    const result = registration.validateStep(
      'surrogate-dam',
      saved,
      answers,
      options
    )

    // Assert
    expect(result.errors).toEqual([])
  })

  test('it accepts a value that differs from the dam found only by spaces and case', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: null,
      surrogateDamEarTagNumber: ' uk2000 00000007 '
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {
      dam: dam('UK200000000007')
    })

    // Assert
    expect(result.errors).toEqual([])
  })

  test('it rejects a surrogate when no dam is found', () => {
    // Arrange
    const answers = {
      geneticDamEarTagNumber: null,
      surrogateDamEarTagNumber: 'UK200000000007'
    }

    // Act
    const result = registration.validateStep('surrogate-dam', {}, answers, {})

    // Assert
    expect(result.errors).toEqual([
      { field: 'surrogateDamEarTagNumber', code: 'notOnHolding' }
    ])
  })
})
