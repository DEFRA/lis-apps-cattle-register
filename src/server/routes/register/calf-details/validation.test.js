import { describe, expect, test } from 'vitest'

import { trimAnswers, validateCalfDetails } from './validation.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const validAnswers = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

describe('validateCalfDetails()', () => {
  test('it returns no errors or warnings for valid answers', () => {
    // Arrange
    const answers = validAnswers

    // Act
    const result = validateCalfDetails(answers, NOW)

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test('it reports every blank field as required, in page order', () => {
    // Arrange
    const answers = {}

    // Act
    const result = validateCalfDetails(answers, NOW)

    // Assert
    expect(result).toEqual({
      errors: [
        { field: 'earTagNumber', code: 'required' },
        { field: 'dateOfBirth', code: 'required' },
        { field: 'sex', code: 'required' },
        { field: 'breed', code: 'required' }
      ],
      warnings: []
    })
  })

  test('it treats whitespace-only answers as blank', () => {
    // Arrange
    const answers = { ...validAnswers, earTagNumber: '  ', breed: ' ' }

    // Act
    const result = validateCalfDetails(answers, NOW)

    // Assert
    expect(result.errors).toEqual([
      { field: 'earTagNumber', code: 'required' },
      { field: 'breed', code: 'required' }
    ])
  })

  test.each([
    ['not three parts', 'yesterday', 'required'],
    ['four parts', '1/11/2026/1', 'required'],
    ['missing its month', '1//2026', 'required'],
    ['three letters parts', 'a/b/c', 'invalid'],
    ['spaced around the slashes', '1 / 11 / 2026', 'invalid'],
    ['longer than 10 characters', '01/011/2026', 'invalid'],
    ['a 2 digit year', '1/11/26', 'invalid'],
    ['a 3 digit day', '001/1/2026', 'invalid'],
    ['dashes instead of slashes', '1-11-2026', 'required'],
    ['an impossible day', '31/2/2026', 'invalid'],
    ['month 13', '1/13/2026', 'invalid'],
    ['tomorrow', '6/11/2026', 'future']
  ])(
    'it rejects a date of birth that is %s',
    (_description, dateOfBirth, code) => {
      // Arrange
      const answers = { ...validAnswers, dateOfBirth }

      // Act
      const result = validateCalfDetails(answers, NOW)

      // Assert
      expect(result).toEqual({
        errors: [{ field: 'dateOfBirth', code }],
        warnings: []
      })
    }
  )

  test.each([
    ['today', '5/11/2026'],
    ['today with leading zeros', '05/11/2026'],
    ['exactly 27 days ago', '9/10/2026']
  ])(
    'it accepts a date of birth of %s without a warning',
    (_description, dateOfBirth) => {
      // Arrange
      const answers = { ...validAnswers, dateOfBirth }

      // Act
      const result = validateCalfDetails(answers, NOW)

      // Assert
      expect(result).toEqual({ errors: [], warnings: [] })
    }
  )

  test('it warns, without an error, when the date of birth is 28 days ago', () => {
    // Arrange
    const answers = { ...validAnswers, dateOfBirth: '8/10/2026' }

    // Act
    const result = validateCalfDetails(answers, NOW)

    // Assert
    expect(result).toEqual({
      errors: [],
      warnings: [{ field: 'dateOfBirth', code: 'overDeadline' }]
    })
  })

  test('it rejects a sex other than male or female', () => {
    // Arrange
    const answers = { ...validAnswers, sex: 'other' }

    // Act
    const result = validateCalfDetails(answers, NOW)

    // Assert
    expect(result.errors).toEqual([{ field: 'sex', code: 'required' }])
  })

  test.each([
    ['a breed code alone', 'AA'],
    ['a name that is not listed', 'Unicorn (UN)'],
    ['a listed name with the wrong code', 'Aberdeen Angus (AB)']
  ])('it rejects %s as an unknown breed', (_d, breed) => {
    // Arrange
    const answers = { ...validAnswers, breed }

    // Act
    const result = validateCalfDetails(answers, NOW)

    // Assert
    expect(result.errors).toEqual([{ field: 'breed', code: 'unknown' }])
  })
})

describe('trimAnswers()', () => {
  test('it removes the spaces around every answer', () => {
    // Arrange
    const answers = {
      earTagNumber: ' UK123456301550 ',
      dateOfBirth: '1/11/2026 ',
      sex: 'female',
      breed: '  Aberdeen Angus (AA)'
    }

    // Act
    const result = trimAnswers(answers)

    // Assert
    expect(result).toEqual({
      earTagNumber: 'UK123456301550',
      dateOfBirth: '1/11/2026',
      sex: 'female',
      breed: 'Aberdeen Angus (AA)'
    })
  })

  test('it leaves a blank answer blank', () => {
    // Arrange
    const answers = { earTagNumber: '   ', breed: '' }

    // Act
    const result = trimAnswers(answers)

    // Assert
    expect(result).toEqual({ earTagNumber: '', breed: '' })
  })
})
