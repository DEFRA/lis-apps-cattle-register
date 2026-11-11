import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test('gives the text for damType required', () => {
    // Arrange
    const result = { field: 'damType', code: 'required' }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(
      'Select if the calf was born via a genetic or surrogate dam'
    )
  })

  test.each([
    ['an unknown code', { field: 'damType', code: 'unknown' }],
    ['an unknown field', { field: 'sex', code: 'required' }],
    ['an inherited property name', { field: 'damType', code: 'toString' }]
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
