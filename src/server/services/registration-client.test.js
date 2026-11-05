import { describe, expect, test } from 'vitest'

import { createRegistrationClient } from './registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const registration = {
  cph: '10/081/1234',
  registrationId: '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f'
}
const validAnswers = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

describe('registrationClient (stub)', () => {
  test('getCalfDetails() returns no saved answers', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.getCalfDetails(registration)

    // Assert
    expect(result).toEqual({ answers: {} })
  })

  test('saveCalfDetails() returns no errors or warnings for valid answers', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: validAnswers
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test('saveCalfDetails() reports every blank field as required, in page order', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: {}
    })

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

  test('saveCalfDetails() treats whitespace-only answers as blank', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, earTagNumber: '  ', breed: ' ' }
    })

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
    'saveCalfDetails() rejects a date of birth that is %s',
    async (_description, dateOfBirth, code) => {
      // Arrange
      const client = createRegistrationClient({ now: () => NOW })

      // Act
      const result = await client.saveCalfDetails({
        ...registration,
        answers: { ...validAnswers, dateOfBirth }
      })

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
    'saveCalfDetails() accepts a date of birth of %s without a warning',
    async (_description, dateOfBirth) => {
      // Arrange
      const client = createRegistrationClient({ now: () => NOW })

      // Act
      const result = await client.saveCalfDetails({
        ...registration,
        answers: { ...validAnswers, dateOfBirth }
      })

      // Assert
      expect(result).toEqual({ errors: [], warnings: [] })
    }
  )

  test('saveCalfDetails() warns, without an error, when the date of birth is 28 days ago', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, dateOfBirth: '8/10/2026' }
    })

    // Assert
    expect(result).toEqual({
      errors: [],
      warnings: [{ field: 'dateOfBirth', code: 'overDeadline' }]
    })
  })

  test('saveCalfDetails() rejects a sex other than male or female', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, sex: 'other' }
    })

    // Assert
    expect(result.errors).toEqual([{ field: 'sex', code: 'required' }])
  })

  test.each([
    ['a breed code alone', 'AA'],
    ['a name that is not listed', 'Unicorn (UN)'],
    ['a listed name with the wrong code', 'Aberdeen Angus (AB)']
  ])('saveCalfDetails() rejects %s as an unknown breed', async (_d, breed) => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, breed }
    })

    // Assert
    expect(result.errors).toEqual([{ field: 'breed', code: 'unknown' }])
  })

  test('the default client reads the current time when saving', async () => {
    // Arrange
    const client = createRegistrationClient()

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, dateOfBirth: '1/1/2999' }
    })

    // Assert
    expect(result.errors).toEqual([{ field: 'dateOfBirth', code: 'future' }])
  })
})
