import { describe, expect, test } from 'vitest'

import { createGetMessage, formErrors } from './form-errors.js'

const messages = {
  earTagNumber: { required: 'Enter the animal ear tag number' },
  sex: { required: 'Select if the animal is male or female' }
}

describe('form-errors', () => {
  describe('createGetMessage()', () => {
    test('gives the text for a known field and code', () => {
      // Arrange
      const getMessage = createGetMessage(messages)

      // Act
      const text = getMessage({ field: 'sex', code: 'required' })

      // Assert
      expect(text).toBe('Select if the animal is male or female')
    })

    test.each([
      ['an unknown code', { field: 'sex', code: 'unknown' }],
      ['an unknown field', { field: 'breed', code: 'required' }],
      ['an inherited property name', { field: 'sex', code: 'toString' }],
      ['an inherited field name', { field: 'constructor', code: 'name' }]
    ])('throws for %s', (_description, result) => {
      // Arrange
      const getMessage = createGetMessage(messages)
      let error

      // Act
      try {
        getMessage(result)
      } catch (e) {
        error = e
      }

      // Assert
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe(
        `No message for ${result.field} ${result.code}`
      )
    })
  })

  describe('formErrors()', () => {
    test('gives a summary item and a field error for each error, in order', () => {
      // Arrange
      const errors = [
        { field: 'earTagNumber', code: 'required' },
        { field: 'sex', code: 'required' }
      ]

      // Act
      const result = formErrors(errors, createGetMessage(messages))

      // Assert
      expect(result).toEqual({
        errorList: [
          { text: 'Enter the animal ear tag number', href: '#earTagNumber' },
          { text: 'Select if the animal is male or female', href: '#sex' }
        ],
        fieldErrors: {
          earTagNumber: { text: 'Enter the animal ear tag number' },
          sex: { text: 'Select if the animal is male or female' }
        }
      })
    })

    test('gives nothing when there are no errors', () => {
      // Arrange
      const errors = []

      // Act
      const result = formErrors(errors, createGetMessage(messages))

      // Assert
      expect(result).toEqual({ errorList: [], fieldErrors: {} })
    })
  })
})
