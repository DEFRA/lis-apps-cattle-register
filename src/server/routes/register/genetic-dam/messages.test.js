import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test.each([
    ['required', 'Enter the ear tag number of the genetic dam'],
    ['notOnHolding', 'Enter the ear tag number of a dam on this holding'],
    ['tooLong', 'Genetic dam ear tag number must be 15 characters or fewer']
  ])('gives the text for geneticDamEarTagNumber %s', (code, expected) => {
    // Arrange
    const result = { field: 'geneticDamEarTagNumber', code }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(expected)
  })

  test.each([
    ['an unknown code', { field: 'geneticDamEarTagNumber', code: 'unknown' }],
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
