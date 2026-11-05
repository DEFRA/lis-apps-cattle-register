import { describe, expect, test } from 'vitest'

import { createRegistrationClient } from './registration-client.js'
import { MAX_CALVES } from './registration-calves.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const registration = {
  cph: '10/081/1234',
  registrationId: '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f',
  userId: 'test-user'
}
const calfDetails = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {object} client
 * @param {number} count
 */
async function saveCalves(client, count) {
  for (let calfNumber = 1; calfNumber <= count; calfNumber++) {
    await client.saveCalfDetails({
      ...registration,
      calfNumber,
      answers: { ...calfDetails, earTagNumber: `UK1234563${calfNumber}` }
    })
  }
}

describe('registrationClient (stub) with more than one calf', () => {
  test('getRegistration() returns no calves for a registration never started', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.getRegistration(registration)

    // Assert
    expect(result).toEqual({ calves: [], canAddCalf: true })
  })

  test('getRegistration() returns copies of the calves, in order', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await saveCalves(client, 2)

    // Act
    const result = await client.getRegistration(registration)
    result.calves[0].calfDetails.earTagNumber = 'changed'

    // Assert
    expect(result.calves.map((calf) => calf.calfDetails.earTagNumber)).toEqual([
      'changed',
      'UK12345632'
    ])
    expect(result.calves[1].checked).toBe(false)
    const again = await client.getRegistration(registration)
    expect(again.calves[0].calfDetails.earTagNumber).toBe('UK12345631')
  })

  test('getCalfDetails() returns empty answers for the next calf', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await saveCalves(client, 1)

    // Act
    const result = await client.getCalfDetails({
      ...registration,
      calfNumber: 2
    })

    // Assert
    expect(result).toEqual({ answers: {} })
  })

  test.each([
    ['after the next one', 3],
    ['0', 0],
    ['not a whole number', 1.5]
  ])(
    'getCalfDetails() returns null for a calf number %s',
    async (_description, calfNumber) => {
      // Arrange
      const client = createRegistrationClient({ now: () => NOW })
      await saveCalves(client, 1)

      // Act
      const result = await client.getCalfDetails({
        ...registration,
        calfNumber
      })

      // Assert
      expect(result).toBeNull()
    }
  )

  test('saveCalfDetails() saves a later calf without changing the others', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await saveCalves(client, 1)
    const answers = { ...calfDetails, earTagNumber: 'UK123456309999' }

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      calfNumber: 2,
      answers
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
    const { calves } = await client.getRegistration(registration)
    expect(calves.map((calf) => calf.calfDetails)).toEqual([
      { ...calfDetails, earTagNumber: 'UK12345631' },
      answers
    ])
  })

  test('saveCalfDetails() returns null, saving nothing, for a calf after the next one', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      calfNumber: 2,
      answers: calfDetails
    })

    // Assert
    expect(result).toBeNull()
    expect((await client.getRegistration(registration)).calves).toEqual([])
  })

  test('saveCalfDetails() refuses an ear tag another calf has, ignoring spaces and case', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await saveCalves(client, 1)

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      calfNumber: 2,
      answers: { ...calfDetails, earTagNumber: ' uk 1234 5631 ' }
    })

    // Assert
    expect(result).toEqual({
      errors: [{ field: 'earTagNumber', code: 'duplicate' }],
      warnings: []
    })
    expect((await client.getRegistration(registration)).calves).toHaveLength(1)
  })

  test('saveCalfDetails() lets a calf keep its own ear tag', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await saveCalves(client, 2)

    // Act
    const result = await client.saveCalfDetails({
      ...registration,
      calfNumber: 2,
      answers: { ...calfDetails, earTagNumber: 'UK12345632', sex: 'male' }
    })

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test(`a registration has room for ${MAX_CALVES} calves and no more`, async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })
    await saveCalves(client, MAX_CALVES)

    // Act
    const registrationResult = await client.getRegistration(registration)
    const nextCalfDetails = await client.getCalfDetails({
      ...registration,
      calfNumber: MAX_CALVES + 1
    })
    const saveResult = await client.saveCalfDetails({
      ...registration,
      calfNumber: MAX_CALVES + 1,
      answers: { ...calfDetails, earTagNumber: 'UK123456309999' }
    })

    // Assert
    expect(MAX_CALVES).toBe(50)
    expect(registrationResult.calves).toHaveLength(MAX_CALVES)
    expect(registrationResult.canAddCalf).toBe(false)
    expect(nextCalfDetails).toBeNull()
    expect(saveResult).toBeNull()
  })
})
