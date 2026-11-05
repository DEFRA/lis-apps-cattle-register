import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test('gives the text for earTagNumber required', () => {
    // Arrange
    const result = { field: 'earTagNumber', code: 'required' }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe('Enter the animal ear tag number of the genetic dam')
  })

  test.each([
    ['an unknown code', { field: 'earTagNumber', code: 'unknown' }],
    ['an unknown field', { field: 'damType', code: 'required' }],
    ['an inherited property name', { field: 'earTagNumber', code: 'toString' }]
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
