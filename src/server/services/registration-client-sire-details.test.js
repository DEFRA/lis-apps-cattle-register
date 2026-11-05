import { describe, expect, test } from 'vitest'

import { DRAFT_TTL_MS } from './draft-store.js'
import { createRegistrationClient } from './registration-client.js'

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
const sireDetails = {
  sireEarTagNumber: 'UK123456701300',
  sireName: 'Big Bob'
}

/**
 * @param {() => Date} [now]
 * @returns {Promise<object>} a client holding calf 1 born via a genetic dam
 */
async function clientWithGeneticDam(now = () => NOW) {
  const client = createRegistrationClient({ now })
  await client.saveCalfDetails({ ...registration, answers: calfDetails })
  await client.saveDamDetails({
    ...registration,
    calfNumber: 1,
    answers: { damType: 'genetic' }
  })
  await client.saveGeneticDam({
    ...registration,
    calfNumber: 1,
    answers: { earTagNumber: 'UK123456501100' }
  })
  return client
}

/**
 * @param {object} client
 * @param {object} answers
 * @returns {Promise<object | null>} the result of saving calf 1's sire details
 */
function saveSire(client, answers) {
  return client.saveSireDetails({ ...registration, calfNumber: 1, answers })
}

describe('registrationClient (stub) sire details', () => {
  test('saveSireDetails() saves the sire ear tag number and name', async () => {
    // Arrange
    const client = await clientWithGeneticDam()

    // Act
    const result = await saveSire(client, sireDetails)

    // Assert
    expect(result).toEqual({ errors: [] })
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf).toEqual({
      calfDetails,
      damDetails: { damType: 'genetic' },
      geneticDam: { earTagNumber: 'UK123456501100' },
      surrogateDam: {},
      sireDetails
    })
  })

  test.each([
    ['missing', {}],
    ['blank', { sireEarTagNumber: '', sireName: '' }],
    ['whitespace only', { sireEarTagNumber: '   ', sireName: ' ' }]
  ])(
    'saveSireDetails() accepts %s answers as not known',
    async (_description, answers) => {
      // Arrange
      const client = await clientWithGeneticDam()

      // Act
      const result = await saveSire(client, answers)

      // Assert
      expect(result).toEqual({ errors: [] })
      const calf = await client.getCalf({ ...registration, calfNumber: 1 })
      expect(calf.sireDetails).toEqual({ sireEarTagNumber: '', sireName: '' })
    }
  )

  test('saveSireDetails() trims the answers', async () => {
    // Arrange
    const client = await clientWithGeneticDam()

    // Act
    await saveSire(client, {
      sireEarTagNumber: ' UK123456701300 ',
      sireName: '  Big Bob '
    })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.sireDetails).toEqual(sireDetails)
  })

  test('saveSireDetails() does not keep an answer that has been cleared', async () => {
    // Arrange
    const client = await clientWithGeneticDam()
    await saveSire(client, sireDetails)

    // Act
    await saveSire(client, { sireEarTagNumber: '', sireName: 'Big Bob' })

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.sireDetails).toEqual({
      sireEarTagNumber: '',
      sireName: 'Big Bob'
    })
  })

  test('saveSireDetails() returns null and saves nothing for a calf the registration does not have', async () => {
    // Arrange
    const client = createRegistrationClient({ now: () => NOW })

    // Act
    const result = await saveSire(client, sireDetails)

    // Assert
    expect(result).toBeNull()
    expect(await client.getCalf({ ...registration, calfNumber: 1 })).toBeNull()
  })

  test('saveSireDetails() returns null for a calf whose registration has expired', async () => {
    // Arrange
    let at = NOW
    const client = await clientWithGeneticDam(() => at)
    at = new Date(NOW.getTime() + DRAFT_TTL_MS)

    // Act
    const result = await saveSire(client, sireDetails)

    // Assert
    expect(result).toBeNull()
  })

  test.each([
    ['calf details is changed', 'saveCalfDetails'],
    ['the dam type changes', 'saveDamDetails']
  ])('the sire details are kept when %s', async (_description, method) => {
    // Arrange
    const client = await clientWithGeneticDam()
    await saveSire(client, sireDetails)
    const changes = {
      saveCalfDetails: {
        ...registration,
        answers: { ...calfDetails, sex: 'male' }
      },
      saveDamDetails: {
        ...registration,
        calfNumber: 1,
        answers: { damType: 'surrogate' }
      }
    }

    // Act
    await client[method](changes[method])

    // Assert
    const calf = await client.getCalf({ ...registration, calfNumber: 1 })
    expect(calf.sireDetails).toEqual(sireDetails)
  })

  test('getCalf() returns a copy of the sire details that cannot change the saved answers', async () => {
    // Arrange
    const client = await clientWithGeneticDam()
    await saveSire(client, sireDetails)
    const first = await client.getCalf({ ...registration, calfNumber: 1 })
    first.sireDetails.sireName = 'Changed'

    // Act
    const second = await client.getCalf({ ...registration, calfNumber: 1 })

    // Assert
    expect(second.sireDetails).toEqual(sireDetails)
  })
})
