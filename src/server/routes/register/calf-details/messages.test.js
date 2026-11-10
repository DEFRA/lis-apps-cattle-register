import { describe, expect, test } from 'vitest'

import { getMessage } from './messages.js'

describe('getMessage()', () => {
  test.each([
    [
      'earTagNumber',
      'required',
      'Enter the last 6 digits of the animal ear tag number you are registering'
    ],
    ['dateOfBirth', 'required', 'Enter the date the animal was born'],
    [
      'dateOfBirth',
      'invalid',
      'Date of birth must be a real date, for example 01/05/2026'
    ],
    ['dateOfBirth', 'future', 'Date of birth must be today or in the past'],
    [
      'dateOfBirth',
      'overDeadline',
      'Date of birth is over the 27-day deadline to report a calf birth.'
    ],
    ['sex', 'required', 'Select if the animal is male or female'],
    [
      'breed',
      'required',
      'Enter the animal breed or breed code into the text box and select the correct one from the suggested options'
    ],
    [
      'breed',
      'unknown',
      'Enter the animal breed or breed code into the text box and select the correct one from the suggested options'
    ]
  ])('gives the text for %s %s', (field, code, expected) => {
    // Arrange
    const result = { field, code }

    // Act
    const text = getMessage(result)

    // Assert
    expect(text).toBe(expected)
  })

  test.each([
    ['an unknown code', { field: 'sex', code: 'future' }],
    ['an unknown field', { field: 'dam', code: 'required' }],
    ['an inherited property name', { field: 'breed', code: 'toString' }]
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
