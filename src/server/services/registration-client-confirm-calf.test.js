import { describe, expect, test } from 'vitest'

import { createRegistrationClient } from './registration-client.js'

const NOW = new Date('2026-11-05T10:00:00Z')
const registration = {
  cph: '10/081/1234',
  registrationId: '6f1c3c1e-6a0b-4b8e-9d3f-2a1b0c9d8e7f',
  userId: 'test-user'
}
const calfOne = { ...registration, calfNumber: 1 }
const calfDetails = {
  earTagNumber: 'UK123456301550',
  dateOfBirth: '1/11/2026',
  sex: 'female',
  breed: 'Aberdeen Angus (AA)'
}

/**
 * @param {object} [options]
 * @param {'genetic'|'surrogate'|null} [options.damType] - null leaves dam details unanswered
 * @param {boolean} [options.damSaved] - false leaves the dam page unanswered
 * @param {boolean} [options.sireSaved] - false leaves sire details unanswered
 * @returns {Promise<object>} a client holding calf 1 with those pages saved
 */
async function clientWithCalf({
  damType = 'genetic',
  damSaved = true,
  sireSaved = true
} = {}) {
  const client = createRegistrationClient({ now: () => NOW })
  await client.saveCalfDetails({ ...registration, answers: calfDetails })

  if (damType) {
    await client.saveDamDetails({ ...calfOne, answers: { damType } })
  }

  if (damType === 'genetic' && damSaved) {
    await client.saveGeneticDam({
      ...calfOne,
      answers: { earTagNumber: 'UK123456501100' }
    })
  }

  if (damType === 'surrogate' && damSaved) {
    await client.saveSurrogateDam({
      ...calfOne,
      answers: {
        geneticDamEarTagNumber: 'UK123456501100',
        surrogateDamEarTagNumber: 'UK123456601200'
      }
    })
  }

  if (sireSaved) {
    await client.saveSireDetails({ ...calfOne, answers: {} })
  }

  return client
}

describe('registrationClient (stub) confirm calf', () => {
  test('getCalf() shows a calf as not checked until it is confirmed', async () => {
    // Arrange
    const client = await clientWithCalf()

    // Act
    const calf = await client.getCalf(calfOne)

    // Assert
    expect(calf.checked).toBe(false)
  })

  test.each(['genetic', 'surrogate'])(
    'confirmCalf() marks a complete calf born via a %s dam as checked',
    async (damType) => {
      // Arrange
      const client = await clientWithCalf({ damType })

      // Act
      const result = await client.confirmCalf(calfOne)

      // Assert
      expect(result).toEqual({ errors: [] })
      const calf = await client.getCalf(calfOne)
      expect(calf.checked).toBe(true)
      expect(calf.calfDetails).toEqual(calfDetails)
    }
  )

  test.each([
    [
      'saving calf details',
      (client) =>
        client.saveCalfDetails({ ...registration, answers: calfDetails })
    ],
    [
      'saving dam details',
      (client) =>
        client.saveDamDetails({ ...calfOne, answers: { damType: 'genetic' } })
    ],
    [
      'saving genetic dam details',
      (client) =>
        client.saveGeneticDam({
          ...calfOne,
          answers: { earTagNumber: 'UK123456501101' }
        })
    ],
    [
      'saving sire details',
      (client) =>
        client.saveSireDetails({ ...calfOne, answers: { sireName: 'Big Bob' } })
    ]
  ])('%s again clears the checked mark', async (_description, save) => {
    // Arrange
    const client = await clientWithCalf()
    await client.confirmCalf(calfOne)

    // Act
    await save(client)

    // Assert
    const calf = await client.getCalf(calfOne)
    expect(calf.checked).toBe(false)
  })

  test('confirmCalf() returns null for a calf the registration does not have', async () => {
    // Arrange
    const client = await clientWithCalf()

    // Act
    const result = await client.confirmCalf({ ...registration, calfNumber: 2 })

    // Assert
    expect(result).toBeNull()
  })

  test.each([
    ['dam details is not answered', { damType: null }],
    ['the genetic dam is not saved', { damType: 'genetic', damSaved: false }],
    [
      'the surrogate dam is not saved',
      { damType: 'surrogate', damSaved: false }
    ],
    ['sire details is not saved', { sireSaved: false }]
  ])(
    'confirmCalf() throws, marking nothing, when %s',
    async (_description, options) => {
      // Arrange
      const client = await clientWithCalf(options)

      // Act
      const confirming = client.confirmCalf(calfOne)

      // Assert
      await expect(confirming).rejects.toThrow('Calf 1 has pages not saved')
      const calf = await client.getCalf(calfOne)
      expect(calf.checked).toBe(false)
    }
  )
})
