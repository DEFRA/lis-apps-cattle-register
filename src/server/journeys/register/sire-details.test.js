import { describe, expect, test } from 'vitest'

import { registration } from './registration.js'

describe('the sire details rules', () => {
  test.each([
    ['both answers', { sireEarTagNumber: 'UK123456701300', sireName: 'Duke' }],
    [
      'the ear tag number alone',
      { sireEarTagNumber: 'UK123456701300', sireName: '' }
    ],
    ['the name alone', { sireEarTagNumber: '', sireName: 'Duke' }],
    ['neither answer', { sireEarTagNumber: '', sireName: '' }]
  ])('it accepts %s', (_description, answers) => {
    // Arrange
    const saved = {}

    // Act
    const result = registration.validateStep('sire-details', saved, answers)

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
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
