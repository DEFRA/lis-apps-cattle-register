import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test.each([
    [
      { field: 'addAnother', code: 'required' },
      'Select yes to add additional animals or no to continue'
    ],
    [
      { field: 'addAnother', code: 'noCalves' },
      'Add at least one animal before continuing'
    ],
    [
      { field: 'addAnother', code: 'tooMany' },
      'You can add up to 50 animals to one registration. Select no to continue'
    ],
    [
      { field: 'calves', code: 'incomplete' },
      'Complete all required animal details before continuing'
    ]
  ])('gives the prototype text for %o', (result, expected) => {
    // Arrange
    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(expected)
  })

  test.each([
    ['an unknown code', { field: 'addAnother', code: 'unknown' }],
    ['an unknown field', { field: 'sex', code: 'required' }],
    ['an inherited property name', { field: 'calves', code: 'toString' }]
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
