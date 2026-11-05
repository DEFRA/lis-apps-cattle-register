import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test.each([
    [
      'addAnother',
      'required',
      'Select yes to add additional animals or no to continue'
    ],
    ['addAnother', 'noCalves', 'Add at least one animal before continuing'],
    [
      'addAnother',
      'tooMany',
      'You can add up to 50 animals to one registration. Select no to continue'
    ],
    [
      'calves',
      'incomplete',
      'Complete all required animal details before continuing'
    ]
  ])('gives the text for %s %s', (field, code, expected) => {
    // Arrange
    const result = { field, code }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(expected)
  })
})
