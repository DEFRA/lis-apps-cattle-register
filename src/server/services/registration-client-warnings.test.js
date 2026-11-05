import { describe, expect, test } from 'vitest'

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

describe('registrationClient (stub) calf details warnings', () => {
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

  test('saveCalfDetails() saves nothing while a warning is not confirmed', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    const answers = { ...validAnswers, dateOfBirth: '8/10/2026' }
    await client.saveCalfDetails({ ...registration, answers })

    // Act
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(calf).toBeNull()
  })

  test('saveCalfDetails() saves answers whose warnings are all confirmed', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    const answers = { ...validAnswers, dateOfBirth: '8/10/2026' }

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers,
      acknowledgedWarnings: ['overDeadline']
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
    expect(await client.getCalfDetails(registration)).toEqual({ answers })
  })

  test('saveCalfDetails() still reports a warning when another one is confirmed', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, dateOfBirth: '8/10/2026' },
      acknowledgedWarnings: ['somethingElse']
    })

    // Assert
    expect(result.warnings).toEqual([
      { field: 'dateOfBirth', code: 'overDeadline' }
    ])
    expect(await client.getCalfDetails(registration)).toEqual({ answers: {} })
  })

  test('saveCalfDetails() keeps the saved answers when a change is not confirmed', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await client.saveCalfDetails({ ...registration, answers: validAnswers })
    await client.saveCalfDetails({
      ...registration,
      answers: { ...validAnswers, dateOfBirth: '8/10/2026' }
    })

    // Act
    const result = await client.getCalfDetails(registration)

    // Assert
    expect(result).toEqual({ answers: validAnswers })
  })
})
