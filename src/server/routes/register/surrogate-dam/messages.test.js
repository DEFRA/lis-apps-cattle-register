import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test('gives the prototype text for geneticDamEarTagNumber required', () => {
    // Arrange
    const result = { field: 'geneticDamEarTagNumber', code: 'required' }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe('Enter the ear tag number of the genetic dam')
  })

  test.each(['required', 'notOnHolding'])(
    'gives the prototype text for surrogateDamEarTagNumber %s',
    (code) => {
      // Arrange
      const result = { field: 'surrogateDamEarTagNumber', code }

      // Act
      const text = getMessage(result)

      // Assert
      expect(text).toBe('Enter the ear tag number of the surrogate dam')
    }
  )

  test.each([
    ['an unknown code', { field: 'surrogateDamEarTagNumber', code: 'unknown' }],
    [
      'a code of the other field',
      { field: 'geneticDamEarTagNumber', code: 'notOnHolding' }
    ],
    ['an unknown field', { field: 'damType', code: 'required' }],
    [
      'an inherited property name',
      { field: 'geneticDamEarTagNumber', code: 'toString' }
    ]
  ])('throws for %s', (_description, result) => {
    // Arrange
    let error

    // Act
    try {
      getMessage(result)
    } catch (e) {
      error = e
    }

    // Assert
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe(`No message for ${result.field} ${result.code}`)
  })
})
