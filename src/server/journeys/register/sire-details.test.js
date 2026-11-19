import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

describe('the sire details rules', () => {
  test.each([
    ['both answers', { sireEarTagNumber: 'UK123456701300', sireName: 'Duke' }],
    [
      'the ear tag number alone',
      { sireEarTagNumber: 'UK123456701300', sireName: null }
    ],
    ['the name alone', { sireEarTagNumber: null, sireName: 'Duke' }],
    ['neither answer', { sireEarTagNumber: null, sireName: null }]
  ])('it accepts %s', (_description, answers) => {
    // Arrange
    const saved = {}

    // Act
    const result = registration.validateStep('sire-details', saved, answers)

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test('it refuses a blank answer, which a record holds as null', () => {
    // Arrange
    const answers = { sireEarTagNumber: '', sireName: 'Duke' }

    // Act
    const result = registration.validateStep('sire-details', {}, answers)

    // Assert
    expect(result.errors).toEqual([
      expect.objectContaining({ field: 'sireEarTagNumber' })
    ])
  })

  test('it is not answered until its page has been saved', () => {
    // Arrange
    const answers = {}

    // Act
    const result = registration.validateStep('sire-details', {}, answers)

    // Assert
    expect(result.errors).toEqual([
      { field: 'sireEarTagNumber', code: 'required' },
      { field: 'sireName', code: 'required' }
    ])
  })

  test.each([
    ['sireEarTagNumber', 15],
    ['sireName', 200]
  ])(
    'it takes %s of up to %i characters and refuses a longer one',
    (field, maxLength) => {
      // Arrange
      const answers = { sireEarTagNumber: null, sireName: null }

      // Act
      const atLimit = registration.validateStep(
        'sire-details',
        {},
        { ...answers, [field]: 'A'.repeat(maxLength) }
      )
      const overLimit = registration.validateStep(
        'sire-details',
        {},
        { ...answers, [field]: 'A'.repeat(maxLength + 1) }
      )

      // Assert
      expect(atLimit.errors).toEqual([])
      expect(overLimit.errors).toEqual([
        expect.objectContaining({ field, code: 'tooLong' })
      ])
    }
  )

  test('it does not count the spaces an ear tag number is typed with', () => {
    // Arrange
    const answers = { sireEarTagNumber: 'UK 12 345 6701 300', sireName: null }

    // Act
    const result = registration.validateStep('sire-details', {}, answers)

    // Assert
    expect(result.errors).toEqual([])
  })

  test('it refuses an ear tag number padded out with spaces', () => {
    // Arrange
    const answers = {
      sireEarTagNumber: `UK${' '.repeat(500)}1`,
      sireName: null
    }

    // Act
    const result = registration.validateStep('sire-details', {}, answers)

    // Assert
    expect(result.errors).toEqual([
      expect.objectContaining({ field: 'sireEarTagNumber', code: 'tooLong' })
    ])
  })
})
