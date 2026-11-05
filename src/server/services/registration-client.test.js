import { describe, expect, test } from 'vitest'

import { DRAFT_TTL_MS } from './draft-store.js'
import { createRegistrationClient } from './registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const registration = {
  cph: '10/081/1234',
  registrationId: '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f',
  userId: 'test-user'
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

  test('getCalfDetails() returns the answers saved by saveCalfDetails()', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })

    // Act
    const result = await client.getCalfDetails(registration)

    // Assert
    expect(result).toEqual({ answers: validAnswers })
  })

  test('saveCalfDetails() saves the answers trimmed', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    const padded = Object.fromEntries(
      Object.entries(validAnswers).map(([field, answer]) => [
        field,
        ` ${answer}  `
      ])
    )

    // Act
    await client.saveCalfDetails({
      ...registration,
      answers: { ...padded, sex: 'female' }
    })

    // Assert
    expect(await client.getCalfDetails(registration)).toEqual({
      answers: validAnswers
    })
  })

  test('saveCalfDetails() saves nothing when there are errors', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, sex: '' }
    })

    // Act
    const calfDetails = await client.getCalfDetails(registration)
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(calfDetails).toEqual({ answers: {} })
    expect(calf).toBeNull()
  })

  test.each([
    ['another user', { userId: 'other-user' }],
    ['another holding', { cph: '22/002/0002' }],
    ['another registration', { registrationId: 'a-different-registration' }]
  ])(
    'getCalfDetails() does not return the answers to %s',
    async (_description, otherKey) => {
      // Arrange
      const client = createRegistrationClient({ now: () => NOW })
      await client.saveCalfDetails({ ...registration, answers: validAnswers })

      // Act
      const result = await client.getCalfDetails({
        ...registration,
        ...otherKey
      })

      // Assert
      expect(result).toEqual({ answers: {} })
    }
  )

  test('saveCalfDetails() replaces the first calf details and keeps its dam details', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    const changed = { ...validAnswers, sex: 'male' }
    await client.saveCalfDetails({ ...registration, answers: validAnswers })
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'genetic' }
    })
    await client.saveCalfDetails({ ...registration, answers: changed })

    // Act
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(calf).toEqual({
      calfDetails: changed,
      damDetails: { damType: 'genetic' }
    })
  })

  test('getCalf() returns the first calf with no dam details yet', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })

    // Act
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(calf).toEqual({ calfDetails: validAnswers, damDetails: {} })
  })

  test('getCalf() returns null for a calf the registration does not have', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })

    // Act
    const calf = await client.getCalf({ ...registration, calfNumber: 2 })

    // Assert
    expect(calf).toBeNull()
  })

  test('getCalf() returns a copy that cannot change the saved answers', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })
    const first = await client.getCalf({ ...registration, calfNumber: 1 })
    first.calfDetails.sex = 'male'
    first.damDetails.damType = 'surrogate'

    // Act
    const second = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(second).toEqual({ calfDetails: validAnswers, damDetails: {} })
  })

  test.each(['genetic', 'surrogate'])(
    'saveDamDetails() saves a %s dam',
    async (damType) => {
      // Arrange
      const client = createRegistrationClient({ now: () => NOW })
      await client.saveCalfDetails({ ...registration, answers: validAnswers })

      // Act
      const result = await client.saveDamDetails({
        ...registration,
        calfNumber: 1,
        answers: { damType }
      })

      // Assert
      expect(result).toEqual({ errors: [] })
      const calf = await client.getCalf({ ...registration, calfNumber: 1 })
      expect(calf.damDetails).toEqual({ damType })
    }
  )

  test.each([
    ['blank', ''],
    ['not an option', 'adoptive'],
    ['missing', undefined]
  ])(
    'saveDamDetails() reports a %s dam type as required and saves nothing',
    async (_description, damType) => {
      // Arrange
      const client = createRegistrationClient({ now: () => NOW })
      await client.saveCalfDetails({ ...registration, answers: validAnswers })

      // Act
      const result = await client.saveDamDetails({
        ...registration,
        calfNumber: 1,
        answers: { damType }
      })

      // Assert
      expect(result).toEqual({
        errors: [{ field: 'damType', code: 'required' }]
      })
      const calf = await client.getCalf({ ...registration, calfNumber: 1 })
      expect(calf.damDetails).toEqual({})
    }
  )

  test('saveDamDetails() returns null for a calf the registration does not have', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'genetic' }
    })

    // Assert
    expect(result).toBeNull()
  })

  test('saveDamDetails() returns null once the registration has expired', async () => {
    // Arrange
    let at = NOW
    const client = createRegistrationClient({ now: () => at })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })
    at = new Date(NOW.getTime() + DRAFT_TTL_MS)

    // Act
    const result = await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'genetic' }
    })

    // Assert
    expect(result).toBeNull()
  })

  test('saveDamDetails() restarts the expiry of the registration', async () => {
    // Arrange
    let at = NOW
    const client = createRegistrationClient({ now: () => at })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })
    at = new Date(NOW.getTime() + DRAFT_TTL_MS - 1)
    await client.saveDamDetails({
      ...registration,
      calfNumber: 1,
      answers: { damType: 'genetic' }
    })
    at = new Date(NOW.getTime() + DRAFT_TTL_MS + 1)

    // Act
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(calf).toEqual({
      calfDetails: validAnswers,
      damDetails: { damType: 'genetic' }
    })
  })
})
