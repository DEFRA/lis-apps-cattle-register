import { describe, expect, test } from 'vitest'

import { createRegistrationClient } from './registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const registration = {
  cph: '10/081/1234',
  registrationId: '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f',
  userId: 'test-user'
}
const calfDetails = {
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {number} count
 * @returns {Promise<object>} a client holding that many calves
 */
async function clientWithCalves(count) {
  const client = createRegistrationClient({ now: () => NOW })

  for (let calfNumber = 1; calfNumber <= count; calfNumber++) {
    await client.saveCalfDetails({
      ...registration,
      calfNumber,
      answers: { ...calfDetails, earTagNumber: `UK1234563${calfNumber}` }
    })
  }

  return client
}

/**
 * @param {object} client
 * @returns {Promise<string[] | undefined>} the ear tags of the calves held
 */
async function earTags(client) {
  return (await client.getRegistration(registration))?.calves.map(
    (calf) => calf.calfDetails.earTagNumber
  )
}

describe('registrationClient (stub) removeCalf()', () => {
  test('it removes the calf and moves the calves after it up one place', async () => {
    // Arrange
    const client = await clientWithCalves(3)

    // Act
    const result = await client.removeCalf({ ...registration, calfNumber: 2 })

    // Assert
    expect(result).toEqual({ errors: [] })
    expect(await earTags(client)).toEqual(['UK12345631', 'UK12345633'])
  })

  test('it keeps the registration, with no calves, once the last is removed', async () => {
    // Arrange
    const client = await clientWithCalves(1)

    // Act
    await client.removeCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(await client.getRegistration(registration)).toEqual({
      calves: [],
      canAddCalf: true
    })
    expect(await client.getCalf({ ...registration, calfNumber: 1 })).toBeNull()
  })

  test('it returns false, changing nothing, for a calf the registration does not have', async () => {
    // Arrange
    const client = await clientWithCalves(1)

    // Act
    const result = await client.removeCalf({ ...registration, calfNumber: 2 })

    // Assert
    expect(result).toBeNull()
    expect(await earTags(client)).toEqual(['UK12345631'])
  })

  test('it returns false, creating nothing, for a registration never started', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await client.removeCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(result).toBeNull()
    expect(await client.getRegistration(registration)).toBeNull()
  })

  test.each([
    ['another user', { userId: 'another-user' }],
    ['another holding', { cph: '22/002/0002' }]
  ])('it removes nothing for %s', async (_who, otherKey) => {
    // Arrange
    const client = await clientWithCalves(1)

    // Act
    const result = await client.removeCalf({
      ...registration,
      ...otherKey,
      calfNumber: 1
    })

    // Assert
    expect(result).toBeNull()
    expect(await earTags(client)).toEqual(['UK12345631'])
  })
})
