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
})
