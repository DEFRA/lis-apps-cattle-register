import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test.each([
    [
      'geneticDamEarTagNumber',
      'Enter the animal ear tag number of the genetic dam'
    ],
    [
      'surrogateDamEarTagNumber',
      'Enter the animal ear tag number of the surrogate dam'
    ]
  ])('gives the text for %s required', (field, expected) => {
    // Arrange
    const result = { field, code: 'required' }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(expected)
  })

  test.each([
    ['an unknown code', { field: 'surrogateDamEarTagNumber', code: 'unknown' }],
    ['an unknown field', { field: 'earTagNumber', code: 'required' }]
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
